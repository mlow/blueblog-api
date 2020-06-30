import gql from "../../vendor/graphql-tag.js";

import { Context } from "./index.ts";
import { Post } from "../model/index.ts";

export const typeDefs = gql`
  """
  A blog post.
  """
  type Post implements Node {
    id: ID!

    "The author of the post."
    author: Author!

    "The title of the post."
    title: String!

    "The content of the post."
    content: String!

    "Whether this post is currently published."
    is_published: Boolean!

    "The date the post was (or will be) published."
    publish_date: DateTime!

    "All edits that have been made this post from most recent to oldest."
    edits: [PostEdit!]!
  }

  input CreatePostInput {
    title: String!
    content: String!
    is_published: Boolean
    publish_date: DateTime
  }

  input UpdatePostInput {
    title: String
    content: String
    is_published: Boolean
    publish_date: DateTime
  }

  type Query {
    post(id: ID!): Post
    posts: [Post!]!
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): ID!
  }
`;

export const resolvers = {
  Post: {
    author: (post: Post) => {
      return post.getAuthor();
    },
    edits: async (post: Post) => {
      return post.getEdits();
    },
  },
  Query: {
    post: (obj: any, args: any) => {
      return Post.byId(args.id);
    },
    posts: () => {
      return Post.all();
    },
  },
  Mutation: {
    createPost: async (obj: any, { input }: any, ctx: Context) => {
      if (!ctx.author) {
        throw new Error("Must be authenticated.");
      }
      return await Post.create(ctx.author, input);
    },
    updatePost: async (obj: any, { id, input }: any, ctx: Context) => {
      if (!ctx.author) {
        throw new Error("Must be authenticated.");
      }
      const post = await Post.byId(id);
      if (!post) {
        throw new Error("No post with that ID found.");
      }
      if (ctx.author.id != post.author_id) {
        throw new Error("You cannot edit another author's post.");
      }

      post.update(input);
      return post;
    },
    deletePost: async (obj: any, { id }: any, ctx: Context) => {
      if (!ctx.author) {
        throw new Error("Must be authenticated.");
      }
      const post = await Post.byId(id);
      if (!post) {
        throw new Error("No post with that ID found.");
      }
      if (ctx.author.id != post.author_id) {
        throw new Error("You cannot delete another author's post.");
      }

      await post.delete();
      return id;
    },
  },
};
