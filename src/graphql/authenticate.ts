import gql from "../../vendor/graphql-tag.js";
import { Context } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/argon2/lib/mod.ts";

import { set_jwt_cookies } from "../utils.ts";
import { Author } from "../model/author.ts";

export const typeDefs = gql`
  type Mutation {
    """
    Attempt to authenticate. If successful, returns a JWT. Otherwise, an error
    is returned.
    """
    authenticate(username: String!, password: String!): String!
  }
`;

export const resolvers = {
  Mutation: {
    authenticate: async (
      obj: any,
      { username, password }: any,
      ctx: Context
    ) => {
      const author = await Author.byUsername(username);
      if (!author) {
        throw new Error("User not found.");
      }
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Password incorrect.");
      }
      return set_jwt_cookies(author, ctx.cookies);
    },
  },
};
