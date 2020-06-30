import gql from "../../vendor/graphql-tag.js";
import { verify } from "https://deno.land/x/argon2/lib/mod.ts";

import { Context } from "./index.ts";
import {
  author_by_username,
} from "../queries.ts";
import { execute, set_jwt_cookies } from "../utils.ts";

export const typeDefs = gql`
  type Mutation {
    authenticate(username: String!, password: String!): String!
  }
`;

export const resolvers = {
  Mutation: {
    authenticate: async (
      obj: any,
      { username, password }: any,
      ctx: Context,
    ) => {
      const authenticateResult = await execute(
        ctx.db,
        author_by_username(username),
      );
      if (!authenticateResult.rows.length) {
        throw new Error("User not found.");
      }
      const author = authenticateResult.rowsOfObjects()[0];

      if (!(await verify(author.password_hash, password))) {
        throw new Error("Password incorrect.");
      }

      return set_jwt_cookies(author, ctx.cookies);
    },
  },
};
