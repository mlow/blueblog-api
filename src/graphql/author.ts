import gql from "../../vendor/graphql-tag.js";

import { Context, Author } from "../model/index.ts";

import { set_jwt_cookies } from "../utils.ts";

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
    updateAuthor(input: UpdateAuthorInput!): Author!
  }
`;

export const resolvers = {
  Author: {
    posts: (author: Author, args: any, { model }: Context) => {
      return model.Post.allByAuthor(author.id);
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
    createAuthor: (obj: any, { input }: any, { model }: Context) => {
      return model.Author.create(input);
    },
    updateAuthor: async (obj: any, { input }: any, ctx: Context) => {
      const author = await ctx.model.Author.update(input);
      set_jwt_cookies(author, ctx.cookies);
      return author;
    },
  },
};
