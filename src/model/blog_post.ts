import { diffWords } from "../mods";
import {
  DataLoader,
  Context,
  Type,
  knex,
  genUUID,
  genConnection,
} from "./index";
import { PagerArgs } from "../graphql/pagination";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";

interface BlogPostCreateUpdateInput {
  title?: string;
  content?: string;
  is_published?: boolean;
  publish_date?: Date;
}

export interface BlogPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_published: boolean;
  publish_date: Date;
}

export interface BlogPostModel {
  all: () => Promise<BlogPost[]>;
  connection: (args: PagerArgs) => any;
  allByAuthor: (author_id: string) => Promise<BlogPost[]>;
  byID: (id: string) => Promise<BlogPost>;
  create: (input: BlogPostCreateUpdateInput) => Promise<BlogPost>;
  update: (
    post_id: string,
    input: BlogPostCreateUpdateInput
  ) => Promise<BlogPost>;
  delete: (post_id: string) => Promise<string>;
}

const cols = [
  "content.id",
  "content.author_id",
  "content.title",
  "content.content",
  "blog_posts.is_published",
  "blog_posts.publish_date",
];

const blog_posts = () =>
  knex<BlogPost>("blog_posts")
    .innerJoin("content", "blog_posts.id", "content.id")
    .select<BlogPost[]>(cols);

export const genPostModel = ({ auth, model }: Context): BlogPostModel => {
  const byIDLoader = new DataLoader<string, BlogPost>(async (keys) => {
    const mapping = mapObjectsByProp(
      await blog_posts().whereIn("blog_posts.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  const byAuthorLoader = new DataLoader<string, BlogPost[]>(async (keys) => {
    const mapping = aggObjectsByProp(
      await blog_posts().whereIn("author_id", keys),
      "author_id",
      (post) => {
        byIDLoader.prime(post.id, post);
        return post;
      }
    );
    return keys.map((key) => mapping[key] ?? []);
  });

  function primeLoaders(posts: BlogPost[]) {
    const mapping = aggObjectsByProp(posts, "author_id", (post) => {
      byIDLoader.prime(post.id, post);
      return post;
    });
    Object.entries(mapping).forEach(([author_id, posts]) => {
      byAuthorLoader.prime(author_id, posts);
    });
    return posts;
  }

  return {
    async all(): Promise<BlogPost[]> {
      return primeLoaders(await blog_posts());
    },

    connection(args: PagerArgs) {
      return genConnection(args, blog_posts(), "publish_date", "desc", {
        serialize: (arg: Date) =>
          Buffer.from(arg.getTime() + "").toString("base64"),
        deserialize: (arg: string) =>
          new Date(parseInt(Buffer.from(arg, "base64").toString("ascii"))),
      });
    },

    allByAuthor(author_id: string): Promise<BlogPost[]> {
      return byAuthorLoader.load(author_id);
    },

    byID(id: string): Promise<BlogPost> {
      return byIDLoader.load(id);
    },

    async create(input: BlogPostCreateUpdateInput): Promise<BlogPost> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      return await knex.transaction(async (trx) => {
        const uuid = await genUUID(Type.BlogPost, trx);
        const [content] = await trx("content").insert(
          {
            id: uuid,
            author_id: auth.id,
            title: input.title,
            content: input.content,
          },
          ["author_id", "title", "content"]
        );
        const [post] = await trx("blog_posts").insert(
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
      post_id: string,
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
          const changes = diffWords(
            post.content,
            input.content!,
            undefined
          ).map(({ value, count, ...rest }: any) => ({
            text: value,
            ...rest,
          }));
          await model.Edit.create(
            {
              content_id: post.id,
              date: new Date(),
              changes,
            },
            trx
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
        await trx("blog_posts").where("id", post.id).update(
          {
            is_published: post.is_published,
            publish_date: post.publish_date,
          },
          "*"
        );
        return post;
      });
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

      // cascading delete
      await knex("uuids").where("id", post.id).delete();

      return post.id;
    },
  };
};
