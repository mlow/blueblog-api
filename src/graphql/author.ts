import { gql } from "../mods";
import { Context, Author } from "../model/index";

import { set_jwt_cookies } from "../utils";

export const typeDefs = gql`
  """
  An author which writes posts.
  """
  type Author implements Node {
    id: ID!

    "The author's name."
    name: String!
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

  type Mutation {
    create_author(input: CreateAuthorInput!): Author!
    update_author(input: UpdateAuthorInput!): Author!
  }
`;

export const resolvers = {
  Mutation: {
    create_author: (obj: any, { input }: any, { model }: Context) => {
      return model.Author.create(input);
    },
    update_author: async (obj: any, { input }: any, ctx: Context) => {
      const author = await ctx.model.Author.update(input);
      set_jwt_cookies(author, ctx);
      return author;
    },
  },
};
