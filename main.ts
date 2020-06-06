import {
  Application,
  Request,
  Response,
  Cookies,
} from "https://deno.land/x/oak/mod.ts";
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv/mod.ts";
import { hash, verify } from "https://deno.land/x/argon2/lib/mod.ts";
import { makeJwt, Payload } from "https://deno.land/x/djwt/create.ts";
import { validateJwt } from "https://deno.land/x/djwt/validate.ts";

import {
  applyGraphQL,
  GraphQLScalarType,
} from "./graphql.ts";

import {
  authenticate,
  create_uuid,
  type_by_uuid,
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

async function get_new_uuid(db: Client, type: Function) {
  const result = await db.query(create_uuid(type));
  if (!result.rows) {
    throw new Error(`Could not create a new UUID for the type: ${type.name}`);
  }
  return result.rows[0][0];
}

const resolvers = {
  Node: {
    __resolveType: (obj: any) => obj.constructor.name || null,
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
  Query: {
    node: async (obj: any, { id }: any, ctx: Context, info: any) => {
      const result = await ctx.db.query(type_by_uuid(id));
      if (!result.rows.length) return null;

      switch (result.rows[0][0]) {
        case Author.name:
          const authorResult = await ctx.db.query(author_by_id(id));
          return Author.fromData(authorResult.rows[0]);
        case Post.name:
          const postResult = await ctx.db.query(post_by_id(id));
          return Post.fromData(postResult.rows[0]);
        default:
          return null;
      }
    },
    author: async (obj: any, args: any, ctx: Context, info: any) => {
      const result = await ctx.db.query(author_by_name(args.name));
      return result.rows.length ? Author.fromData(result.rows[0]) : null;
    },
    authors: (obj: any, args: any, ctx: Context, info: any) => {
      return ctx.db.query(authors).then((result) =>
        result.rows.map((row) => Author.fromData(row))
      );
    },
    posts: (obj: any, args: any, ctx: Context, info: any) => {
      return ctx.db.query(posts).then((result) =>
        result.rows.map((row) => Post.fromData(row))
      );
    },
  },
  Mutation: {
    createAuthor: async (obj: any, { name, password }: any, ctx: Context) => {
      if (!password.length) {
        throw new Error("Password should not be blank.");
      }
      const userCheckResult = await ctx.db.query(author_by_name(name));
      if (userCheckResult.rows.length > 0) {
        throw new Error(`An author by the name ${name} already exists.`);
      }
      const uuid = await get_new_uuid(ctx.db, Author);
      const password_hash = await hash(password, {
        salt: crypto.getRandomValues(new Uint8Array(16)),
      });
      const insertResult = await ctx.db.query(
        create_author(uuid, name, password_hash),
      );
      return Author.fromData(insertResult.rows[0]);
    },
    createPost: async (obj: any, { input }: any, ctx: Context) => {
      const userCheckResult = await ctx.db.query(author_by_id(input.author_id));
      if (!userCheckResult.rows.length) {
        throw new Error(`No author with ID: ${input.author_id}`);
      }
      const uuidResult = await ctx.db.query(create_uuid(Post));
      const uuid = uuidResult.rows[0][0];

      const insertResult = await ctx.db.query(create_post(uuid, input));
      return Post.fromData(insertResult.rows[0]);
    },
    authenticate: async (obj: any, { author, password }: any, ctx: any) => {
      if (!password.length) {
        throw new Error("Password should not be blank.");
      }
      const authenticateResult = await ctx.db.query(authenticate(author));
      if (!authenticateResult.rows.length) {
        throw new Error("Author not found.");
      }
      const password_hash = authenticateResult.rows[0][0];
      if (!await verify(password_hash, password)) {
        throw new Error("Password incorrect.");
      }

      const now: number = new Date().getTime();
      const exp: number = 24 * 60 * 60;
      const jwt = makeJwt({
        key: config["SECRET"],
        header: {
          alg: "HS256",
        },
        payload: {
          sub: author,
          iat: now,
          exp: now + (exp * 1000),
        },
      });

      const jwt_parts = jwt.split(".");
      const header_payload = jwt_parts.slice(0, 2).join(".");
      const signature = jwt_parts[2];
      ctx.cookies.set("jwt.header.payload", header_payload, {
        maxAge: exp,
        httpOnly: false,
      });
      ctx.cookies.set("jwt.signature", signature, {
        maxAge: exp,
        httpOnly: true,
        sameSite: "strict",
      });

      return jwt;
    },
  },
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
  const start = Date.now();
  await next();
  console.log(
    `${ctx.request.method} ${ctx.request.url} - ${Date.now() - start}ms`,
  );
});

const schemaFile = new URL("schema.graphql", import.meta.url).pathname;
const typeDefs = new TextDecoder("utf-8").decode(
  await Deno.readFile(schemaFile),
);

interface Context {
  request: Request;
  response: Response;
  cookies: Cookies;
  db: Client;
  jwt?: Payload;
}

applyGraphQL({
  app,
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: async ({ request, response, cookies }) => {
    let jwt: Payload | undefined;
    const auth = request.headers.get("Authorization");
    if (auth) {
      const auth_parts = auth.split(" ");
      if (auth_parts.length !== 2 || auth_parts[0] !== "Bearer") {
        throw new Error("Malformed authorization header.");
      }
      const token_parts = auth_parts[1].split(".");
      try {
        let full_jwt: string;
        if (token_parts.length == 2) {
          const signature = cookies.get("jwt.signature");
          if (!signature) {
            throw new Error("Malformed JWT.");
          }
          full_jwt = `${auth_parts[1]}.${signature}`;
        } else if (token_parts.length == 3) {
          full_jwt = auth_parts[1];
        } else {
          throw new Error("Malformed JWT.");
        }

        const validatedJwt = await validateJwt(full_jwt, config["SECRET"]);
        if (validatedJwt) {
          jwt = validatedJwt.payload;
        }
      } catch (error) {
        throw error;
      }
    }

    return {
      request,
      response,
      cookies,
      db: client,
      jwt,
    } as Context;
  },
});

console.log(`Server listening at http://localhost:${config["LISTEN_PORT"]}`);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await client.end();
