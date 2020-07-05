import { diffWords } from "../mods";
import { DataLoader, Context, Type, qb, genUUID } from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";

interface PostCreateUpdateInput {
  title?: string;
  content?: string;
  is_published?: boolean;
  publish_date?: Date;
}

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
      await qb<Post>("posts").whereIn("id", keys).orderBy("publish_date"),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  const postsByAuthorLoader = new DataLoader<string, Post[]>(async (keys) => {
    const mapping = aggObjectsByProp(
      await qb<Post>("posts")
        .whereIn("author_id", keys)
        .orderBy("publish_date", "desc"),
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
      return primeLoaders(
        await qb<Post>("posts").orderBy("publish_date", "desc")
      );
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
      const [post] = await qb<Post>("posts").insert(
        {
          id: await genUUID(Type.Post),
          author_id: auth.id,
          ...input,
        },
        "*"
      );
      return post;
    },

    async update(post_id: string, input: PostCreateUpdateInput): Promise<Post> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      let post = await this.byID(post_id);
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

      [post] = await qb<Post>("posts").where("id", post.id).update(post, "*");
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

      await qb<Post>("posts").where("id", post.id).delete();

      return post.id;
    },
  };
};
