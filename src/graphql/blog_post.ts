import { gql } from "../mods";
import { validatePagerInput } from "./pagination";
import { Context } from "../model/index";
import { getCursor, BlogPost } from "../model/blog_post";
import { sluggify } from "../utils";
import { resolveContent } from "./content";

export const typeDefs = gql`
  """
  A blog post.
  """
  type BlogPost implements Node & Content {
    id: ID!

    "The ID of the author of this blog post."
    author_id: ID!

    "The author of the blog post."
    author: Author!

    "The title of the blog post."
    title: String!

    "The content of the blog post."
    content(format: ContentFormat = MARKDOWN): String!

    "The date the blog post was (or will be) published."
    publish_date: DateTime!

    "A URL safe slug of the title."
    slug: String!

    "The cursor of this post, used for pagination."
    cursor: String!
  }

  type BlogPostEdge {
    node: BlogPost!
    cursor: String!
  }

  type BlogPostConnection {
    total: Int!
    beforeEdges: [BlogPostEdge!]!
    afterEdges: [BlogPostEdge!]!
    pageInfo: PageInfo!
  }

  input CreateBlogPostInput {
    title: String!
    content: String!
    publish_date: DateTime
  }

  input UpdateBlogPostInput {
    title: String
    content: String
    publish_date: DateTime
  }

  type Query {
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
    slug: (post: BlogPost) => sluggify(post.title),
    cursor: (post: BlogPost) => getCursor(post),
    content: (post: BlogPost, { format }: any) =>
      resolveContent(format, post.content),
  },
  Query: {
    blog_posts: (obj: any, { pager }: any, { model }: Context) => {
      return model.BlogPost.connection(validatePagerInput(pager));
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
