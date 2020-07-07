import { gql } from "../mods";
import { PagerInput, buildPagerArgs } from "./pagination";
import { Context, Post } from "../model/index";

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

  type PostEdge {
    node: Post!
    cursor: String!
  }

  type PostConnection {
    total: Int!
    edges: [PostEdge]
    pageInfo: PageInfo!
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
    posts(pager: Pager): PostConnection!
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
    posts: (obj: any, { pager }: { pager: PagerInput }, { model }: Context) => {
      return model.Post.connection(buildPagerArgs(pager));
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
