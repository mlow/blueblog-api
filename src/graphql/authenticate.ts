import { gql, verify } from "../mods";

import { set_jwt_cookies } from "../utils";
import { Context } from "../model/index";

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
      const author = await ctx.model.Author.byUsername(username);
      if (!author) {
        throw new Error("User not found.");
      }
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Password incorrect.");
      }
      return set_jwt_cookies(author, ctx);
    },
  },
};
