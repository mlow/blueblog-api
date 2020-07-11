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

    "All blog posts written by this author."
    posts: [BlogPost!]!
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
    create_author(input: CreateAuthorInput!): Author!
    update_author(input: UpdateAuthorInput!): Author!
  }
`;

export const resolvers = {
  Author: {
    posts: (author: Author, args: any, { model }: Context) => {
      return model.BlogPost.allByAuthor(author.id);
    },
  },
  Query: {
    author: (obj: any, { name }: any, { model }: Context) => {
      return model.Author.byName(name);
    },
    authors: (obj: any, args: any, { model }: Context) => {
      return model.Author.all();
    },
  },
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
