import gql from "../../vendor/graphql-tag.js";

import { Context } from "./index.ts";
import { Author } from "../model/index.ts";

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
    posts: (author: Author) => {
      return author.getPosts();
    },
  },
  Query: {
    author: (obj: any, args: any) => {
      return Author.byName(args.name);
    },
    authors: () => {
      return Author.all();
    },
  },
  Mutation: {
    createAuthor: (obj: any, { input }: any) => {
      if (!input.password.length) {
        throw new Error("Password should not be blank.");
      }
      if (!input.username.length) {
        throw new Error("Username should not be blank.");
      }
      return Author.create(input);
    },
    updateAuthor: async (obj: any, { input }: any, ctx: Context) => {
      if (!ctx.author) {
        throw new Error("Must be authenticated.");
      }

      await ctx.author.update(input);

      set_jwt_cookies(ctx.author, ctx.cookies);
      return ctx.author;
    },
  },
};
