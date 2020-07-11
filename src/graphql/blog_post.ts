import { gql } from "../mods";
import { buildPagerArgs } from "./pagination";
import { Context, BlogPost } from "../model/index";

export const typeDefs = gql`
  """
  A blog post.
  """
  type BlogPost implements Node & Content {
    id: ID!

    "The author of the blog post."
    author: Author!

    "The title of the blog post."
    title: String!

    "The content of the blog post."
    content: String!

    "Whether this blog post is currently published."
    is_published: Boolean!

    "The date the blog post was (or will be) published."
    publish_date: DateTime!

    "All edits that have been made this post from most recent to oldest."
    edits: [Edit!]!
  }

  type BlogPostEdge {
    node: BlogPost!
    cursor: String!
  }

  type BlogPostConnection {
    total: Int!
    edges: [BlogPostEdge]
    pageInfo: PageInfo!
  }

  input CreateBlogPostInput {
    title: String!
    content: String!
    is_published: Boolean
    publish_date: DateTime
  }

  input UpdateBlogPostInput {
    title: String
    content: String
    is_published: Boolean
    publish_date: DateTime
  }

  type Query {
    blog_post(id: ID!): BlogPost
    blog_posts(pager: Pager): BlogPostConnection!
  }

  type Mutation {
    create_blog_post(input: CreateBlogPostInput!): BlogPost!
    update_blog_post(id: ID!, input: UpdateBlogPostInput!): BlogPost!
    delete_blog_post(id: ID!): ID!
  }
`;

export const resolvers = {
  BlogPost: {
    author: (post: BlogPost, args: any, { model }: Context) => {
      return model.Author.byID(post.author_id);
    },
    edits: (post: BlogPost, args: any, { model }: Context) => {
      return model.Edit.allByContent(post.id);
    },
  },
  Query: {
    blog_post: (obj: any, { id }: any, { model }: Context) => {
      return model.BlogPost.byID(id);
    },
    blog_posts: (obj: any, { pager }: any, { model }: Context) => {
      return model.BlogPost.connection(buildPagerArgs(pager));
    },
  },
  Mutation: {
    create_blog_post: (obj: any, { input }: any, { model }: Context) => {
      return model.BlogPost.create(input);
    },
    update_blog_post: (obj: any, { id, input }: any, { model }: Context) => {
      return model.BlogPost.update(id, input);
    },
    delete_blog_post: (obj: any, { id }: any, { model }: Context) => {
      return model.BlogPost.delete(id);
    },
  },
};
