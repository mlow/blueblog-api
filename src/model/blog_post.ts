import {
  DataLoader,
  Context,
  Type,
  PagerInput,
  knex,
  genConnection,
  generateID,
  DateCursorSerializer,
} from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";
import { insertContentEdit } from "./util";

interface BlogPostCreateUpdateInput {
  title?: string;
  content?: string;
  is_published?: boolean;
  publish_date?: Date;
}

export interface BlogPost {
  id: number;
  author_id: number;
  title: string;
  content: string;
  is_published: boolean;
  publish_date: Date;
}

export interface BlogPostModel {
  all: () => Promise<BlogPost[]>;
  connection: (args: PagerInput) => any;
  allByAuthor: (author_id: number) => Promise<BlogPost[]>;
  byID: (id: number) => Promise<BlogPost>;
  create: (input: BlogPostCreateUpdateInput) => Promise<BlogPost>;
  update: (
    post_id: number,
    input: BlogPostCreateUpdateInput
  ) => Promise<BlogPost>;
  delete: (post_id: number) => Promise<number>;
}

const cols = [
  "content.id",
  "content.author_id",
  "content.title",
  "content.content",
  "blog_post.is_published",
  "blog_post.publish_date",
];

const blog_posts = () =>
  knex<BlogPost>("blog_post")
    .innerJoin("content", "blog_post.id", "content.id")
    .select<BlogPost[]>(cols);

export const getCursor = (post: BlogPost) =>
  DateCursorSerializer.serialize(post.publish_date);

export const genPostModel = ({ auth, model }: Context): BlogPostModel => {
  const byIDLoader = new DataLoader<number, BlogPost>(async (keys) => {
    const mapping = mapObjectsByProp(
      await blog_posts().whereIn("blog_post.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  const byAuthorLoader = new DataLoader<number, BlogPost[]>(async (keys) => {
    const mapping = aggObjectsByProp<BlogPost, number>(
      await blog_posts().whereIn("author_id", keys),
      "author_id",
      (post) => {
        byIDLoader.prime(post.id, post);
        return post;
      }
    );
    return keys.map((key) => mapping.get(key) ?? []);
  });

  function primeLoaders(posts: BlogPost[]) {
    const mapping = aggObjectsByProp<BlogPost, number>(
      posts,
      "author_id",
      (post) => {
        byIDLoader.prime(post.id, post);
        return post;
      }
    );
    mapping.forEach((posts, author_id) => {
      byAuthorLoader.prime(author_id, posts);
    });
    return posts;
  }

  return {
    async all(): Promise<BlogPost[]> {
      return primeLoaders(await blog_posts());
    },

    connection(args: PagerInput) {
      return genConnection(
        args,
        blog_posts(),
        "publish_date",
        "desc",
        DateCursorSerializer
      );
    },

    allByAuthor(author_id: number): Promise<BlogPost[]> {
      return byAuthorLoader.load(author_id);
    },

    byID(id: number): Promise<BlogPost> {
      return byIDLoader.load(id);
    },

    async create(input: BlogPostCreateUpdateInput): Promise<BlogPost> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      return await knex.transaction(async (trx) => {
        const uuid = await generateID(Type.BlogPost, trx);
        const [content] = await trx("content").insert(
          {
            id: uuid,
            author_id: auth.id,
            title: input.title,
            content: input.content,
          },
          ["author_id", "title", "content"]
        );
        const [post] = await trx("blog_post").insert(
          {
            id: uuid,
            is_published: input.is_published ?? false,
            publish_date: input.publish_date ?? new Date(),
          },
          ["is_published", "publish_date"]
        );

        return {
          id: uuid,
          author_id: content.author_id,
          title: content.title,
          content: content.content,
          is_published: post.is_published,
          publish_date: post.publish_date,
        };
      });
    },

    async update(
      post_id: number,
      input: BlogPostCreateUpdateInput
    ): Promise<BlogPost> {
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

      return await knex.transaction(async (trx) => {
        const contentChanged = input.content && input.content !== post.content;
        if (contentChanged) {
          await insertContentEdit(
            trx,
            model.Edit,
            post.id,
            post.content,
            input.content!
          );
        }

        if (contentChanged || (input.title && input.title !== post.title)) {
          const [content] = await trx("content")
            .where("id", post.id)
            .update(
              {
                title: input.title ?? post.title,
                content: input.content ?? post.content,
              },
              ["title", "content"]
            );
          post.title = content.title;
          post.content = content.content;
        }

        post.is_published = input.is_published ?? post.is_published;
        post.publish_date = input.publish_date ?? post.publish_date;
        await trx("blog_post").where("id", post.id).update(
          {
            is_published: post.is_published,
            publish_date: post.publish_date,
          },
          "*"
        );
        return post;
      });
    },

    async delete(post_id: number): Promise<number> {
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

      // cascading delete
      await knex("uuid").where("id", post.id).delete();

      return post.id;
    },
  };
};
