import gql from "../../vendor/graphql-tag.js";
import { hash, verify } from "https://deno.land/x/argon2/lib/mod.ts";

import { Context } from "./index.ts";
import { execute, set_jwt_cookies } from "../utils.ts";
import {
  authors,
  author_by_id,
  author_by_name,
  author_by_username,
  create_author,
  update_author,
  posts_by_author,
} from "../queries.ts";
import { Author, Post } from "../types.ts";
import { get_new_uuid } from "../utils.ts";

export const typeDefs = gql`
  """
  An author which writes posts.
  """
  type Author implements Node {
    id: ID!

    "The author's name."
    name: String!

    "All posts written by this author."
    posts: [Post!]!
  }

  input CreateAuthorInput {
    name: String!
    username: String!
    password: String!
  }

  input UpdateAuthorInput {
    password: String!
    name: String
    username: String
    new_password: String
  }

  type Query {
    author(name: String!): Author!
    authors: [Author!]!
  }

  type Mutation {
    createAuthor(input: CreateAuthorInput!): Author!
    updateAuthor(id: ID!, input: UpdateAuthorInput!): Author!
  }
`;

export const resolvers = {
  Author: {
    posts: async (author: Author, args: any, ctx: Context) => {
      const postsResult = await execute(ctx.db, posts_by_author(author.id));
      return postsResult.rows.map((row) => Post.fromData(row));
    },
  },
  Query: {
    author: async (obj: any, args: any, ctx: Context, info: any) => {
      const result = await execute(ctx.db, author_by_name(args.name));
      return result.rows.length ? Author.fromData(result.rows[0]) : null;
    },
    authors: (obj: any, args: any, ctx: Context, info: any) => {
      return execute(ctx.db, authors).then((result) =>
        result.rows.map((row) => Author.fromData(row))
      );
    },
  },
  Mutation: {
    createAuthor: async (obj: any, { input }: any, ctx: Context) => {
      if (!input.password.length) {
        throw new Error("Password should not be blank.");
      }
      if (!input.username.length) {
        throw new Error("Username should not be blank.");
      }
      const userCheckResult = await execute(
        ctx.db,
        author_by_username(input.username),
      );
      if (userCheckResult.rows.length > 0) {
        throw new Error("That username is taken.");
      }
      const uuid = await get_new_uuid(ctx.db, Author);
      const password_hash = await hash(input.password, {
        salt: crypto.getRandomValues(new Uint8Array(16)),
      });
      const insertResult = await execute(
        ctx.db,
        create_author(uuid, { ...input, password_hash }),
      );
      return Author.fromData(insertResult.rows[0]);
    },
    updateAuthor: async (
      obj: any,
      { id, input: { name, username, password, new_password } }: any,
      ctx: Context,
    ) => {
      if (!ctx.auth) {
        throw new Error("Must be authenticated.");
      }

      if (id != ctx.auth.sub) {
        throw new Error("Cannot update another user's profile.");
      }

      const author = (
        await execute(ctx.db, author_by_id(id))
      ).rowsOfObjects()[0];
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Current password is incorrect.");
      }

      let new_password_hash: string | undefined;
      if (new_password) {
        new_password_hash = await hash(new_password, {
          salt: crypto.getRandomValues(new Uint8Array(16)),
        });
      }

      const updateResult = await execute(
        ctx.db,
        update_author(id, {
          name: name || author.name,
          username: username || author.username,
          password_hash: new_password_hash || author.password_hash,
        }),
      );

      set_jwt_cookies(updateResult.rowsOfObjects()[0], ctx.cookies);

      return Author.fromData(updateResult.rows[0]);
    },
  },
};
