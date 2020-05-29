import { Application } from "https://deno.land/x/oak/mod.ts";
import { applyGraphQL } from "https://deno.land/x/oak_graphql/mod.ts";
import {
  GraphQLScalarType,
  parse,
} from "https://deno.land/x/oak_graphql/deps.ts";

import { Client } from "https://deno.land/x/postgres/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv/mod.ts";

import {
  author_by_id,
  author_by_name,
  post_by_id,
  posts_by_author,
  authors,
  posts,
  create_author,
  create_post,
} from "./queries.ts";

import { Author, Post } from "./types.ts";

const resolvers = {
  Query: {
    author: async (obj: any, args: any, ctx: Context, info: any) => {
      if (!(args.id || args.name)) {
        throw new Error("Either `id` or `name` must be supplied.");
      }
      if (args.id && args.name) {
        throw new Error("Only one of `id` or `name` can be supplied.");
      }
      const result = await ctx.db.query(
        args.name ? author_by_name(args.name) : author_by_id(args.id),
      );
      return result.rows.length ? Author.fromData(result.rows[0]) : null;
    },
    authors: (obj: any, args: any, ctx: Context, info: any) => {
      return ctx.db.query(authors).then((result) =>
        result.rows.map((row) => Author.fromData(row))
      );
    },
    post: (obj: any, args: any, ctx: Context, info: any) => {
      return ctx.db.query(post_by_id(args.id)).then((result) =>
        result.rows.length ? Post.fromData(result.rows[0]) : null
      );
    },
    posts: (obj: any, args: any, ctx: Context, info: any) => {
      return ctx.db.query(posts).then((result) =>
        result.rows.map((row) => Post.fromData(row))
      );
    },
  },
  Mutation: {
    createAuthor: async (obj: any, args: any, ctx: Context, info: any) => {
      const userCheckResult = await ctx.db.query(author_by_name(args.name));
      if (userCheckResult.rows.length > 0) {
        throw new Error(`An author by the name ${args.name} already exists.`);
      }

      const insertResult = await ctx.db.query(create_author(args.name));
      return Author.fromData(insertResult.rows[0]);
    },
    createPost: async (obj: any, { input }: any, ctx: Context, info: any) => {
      const userCheckResult = await ctx.db.query(author_by_id(input.author_id));
      if (!userCheckResult.rows.length) {
        throw new Error(`No author with ID: ${input.author_id}`);
      }

      const insertResult = await ctx.db.query(create_post(input));
      return Post.fromData(insertResult.rows[0]);
    },
  },
  Author: {
    posts: async (author: Author, args: any, ctx: Context) => {
      const postsResult = await ctx.db.query(posts_by_author(author.id));
      return postsResult.rows.map((row) => Post.fromData(row));
    },
  },
  Post: {
    author: async (post: Post, args: any, ctx: Context) => {
      const authorResult = await ctx.db.query(author_by_id(post.author_id));
      return Author.fromData(authorResult.rows[0]);
    },
  },
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    serialize(value: Date) {
      return value.toISOString();
    },
    parseValue(value: any) {
      let result = new Date(value);
      if (result.toString() === "Invalid Date") {
        throw new Error(`Invalid time format: ${value}`);
      }
      return result;
    },
  }),
};

const config = dotenv({ safe: true });

const client = new Client({
  hostname: config["DB_HOST"],
  database: config["DB_NAME"],
  user: config["DB_USER"],
  password: config["DB_PASSWORD"],
  port: parseInt(config["DB_PORT"]),
});

console.log("Connecting to DB...");
try {
  await client.connect();
} catch (error) {
  console.log(`Failed to connect to database: ${error.message}`);
  Deno.exit(1);
}

const app = new Application();

app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

const schemaFile = new URL("schema.graphql", import.meta.url).pathname;
const typeDefs = parse(
  new TextDecoder("utf-8").decode(await Deno.readFile(schemaFile)),
  {},
);

interface Context {
  request: any;
  response: any;
  db: Client;
}

const GraphQLService = applyGraphQL({
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: ({ request, response }) => {
    return {
      "request": request,
      "response": response,
      "db": client,
    } as Context;
  },
});

app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

console.log(`Server listening at http://localhost:${config["LISTEN_PORT"]}`);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await client.end();
