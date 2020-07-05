import { gql } from "../mods.ts";
import { Context, Post } from "../model/index.ts";

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
    author: (post: Post, args: any, { model }: Context) => {
      return model.Author.byID(post.author_id);
    },
    edits: (post: Post, args: any, { model }: Context) => {
      return model.PostEdit.allByPost(post.id);
    },
  },
  Query: {
    post: (obj: any, { id }: any, { model }: Context) => {
      return model.Post.byID(id);
    },
    posts: (obj: any, args: any, { model }: Context) => {
      return model.Post.all();
    },
  },
  Mutation: {
    createPost: (obj: any, { input }: any, { model }: Context) => {
      return model.Post.create(input);
    },
    updatePost: (obj: any, { id, input }: any, { model }: Context) => {
      return model.Post.update(id, input);
    },
    deletePost: (obj: any, { id }: any, { model }: Context) => {
      return model.Post.delete(id);
    },
  },
};
