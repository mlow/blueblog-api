import { diffWords } from "../mods";
import { DataLoader, Context, Type, sql, execute, genUUID } from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";

interface PostCreateUpdateInput {
  title?: string;
  content?: string;
  is_published?: boolean;
  publish_date?: Date;
}

const POSTS = sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
ORDER BY publish_date DESC;`;

const POSTS_BY_IDS = (ids: readonly string[]) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE id IN (${ids});`;

const POSTS_BY_AUTHORS = (author_ids: readonly string[]) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE author_id IN(${author_ids})
ORDER BY publish_date DESC;`;

export const CREATE_POST = (
  uuid: string,
  author_id: string,
  input: PostCreateUpdateInput
) =>
  sql`
INSERT INTO posts (id, author_id, title, content, is_published, publish_date)
VALUES (
  ${uuid},
  ${author_id},
  ${input.title},
  ${input.content},
  ${input.is_published ?? false},
  ${input.publish_date ?? new Date()}
) RETURNING id, author_id, title, content, is_published, publish_date;`;

export const UPDATE_POST = (post: Post) =>
  sql`
UPDATE posts
  SET title = ${post.title},
      content = ${post.content},
      is_published = ${post.is_published},
      publish_date = ${post.publish_date}
  WHERE id = ${post.id};`;

export const DELETE_POST = (uuid: string) =>
  sql`DELETE FROM posts WHERE id = ${uuid};`;

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_published: boolean;
  publish_date: Date;
}

export interface PostModel {
  all: () => Promise<Post[]>;
  allByAuthor: (author_id: string) => Promise<Post[]>;
  byID: (id: string) => Promise<Post>;
  create: (input: PostCreateUpdateInput) => Promise<Post>;
  update: (post_id: string, input: PostCreateUpdateInput) => Promise<Post>;
  delete: (post_id: string) => Promise<string>;
}

export const genPostModel = ({ auth, model }: Context): PostModel => {
  const postByIDLoader = new DataLoader<string, Post>(async (keys) => {
    const mapping = mapObjectsByProp(
      (await execute(POSTS_BY_IDS(keys))) as Post[],
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  const postsByAuthorLoader = new DataLoader<string, Post[]>(async (keys) => {
    const mapping = aggObjectsByProp(
      (await execute(POSTS_BY_AUTHORS(keys))) as Post[],
      "author_id",
      (post) => {
        postByIDLoader.prime(post.id, post);
        return post;
      }
    );
    return keys.map((key) => mapping[key] ?? []);
  });

  function primeLoaders(posts: Post[]) {
    const mapping = aggObjectsByProp(posts, "author_id", (post) => {
      postByIDLoader.prime(post.id, post);
      return post;
    });
    Object.entries(mapping).forEach(([author_id, posts]) => {
      postsByAuthorLoader.prime(author_id, posts);
    });
    return posts;
  }

  return {
    async all(): Promise<Post[]> {
      return primeLoaders((await execute(POSTS)) as Post[]);
    },

    allByAuthor(author_id: string): Promise<Post[]> {
      return postsByAuthorLoader.load(author_id);
    },

    byID(id: string): Promise<Post> {
      return postByIDLoader.load(id);
    },

    async create(input: PostCreateUpdateInput): Promise<Post> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      const uuid = await genUUID(Type.Post);
      const result = await execute(CREATE_POST(uuid, auth.id, input));
      return result[0] as Post;
    },

    async update(post_id: string, input: PostCreateUpdateInput): Promise<Post> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      const post = await this.byID(post_id);
      if (!post) {
        throw new Error("No post with that ID found.");
      }
      if (auth.id != post.author_id) {
        throw new Error("You cannot edit another author's post.");
      }

      if (input.content && input.content !== post.content) {
        const changes = diffWords(post.content, input.content, undefined).map(
          ({ value, count, ...rest }: any) => ({
            text: value,
            ...rest,
          })
        );
        post.content = input.content;
        await model.PostEdit.create({
          post_id: post.id,
          date: new Date(),
          changes,
        });
      }

      post.title = input.title ?? post.title;
      post.is_published = input.is_published ?? post.is_published;
      post.publish_date = input.publish_date ?? post.publish_date;

      await execute(UPDATE_POST(post));

      return post;
    },

    async delete(post_id: string): Promise<string> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      const post = await this.byID(post_id);
      if (!post) {
        throw new Error("No post with that ID found.");
      }
      if (auth.id != post.author_id) {
        throw new Error("You cannot delete another author's post.");
      }

      await execute(DELETE_POST(post.id));
      return post.id;
    },
  };
};
