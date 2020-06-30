import gql from "../../vendor/graphql-tag.js";
import { diffWords } from "../../vendor/diff.js";

import { Context } from "./index.ts";
import {
  // Author
  author_by_id,
  // Post
  posts,
  post_by_id,
  create_post,
  update_post,
  delete_post,
  // PostEdit
  post_edits,
  create_post_edit,
} from "../queries.ts";
import { Author, Post, PostEdit } from "../model/index.ts";
import { execute, get_new_uuid } from "../utils.ts";

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
    author_id: ID!
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
    author: async (post: Post, args: any, ctx: Context) => {
      const authorResult = await execute(author_by_id(post.author_id));
      return Author.fromData(authorResult.rows[0]);
    },
    edits: async (post: Post, args: any, ctx: Context) => {
      const editsResult = await execute(post_edits(post.id));
      return editsResult.rows.map((row) => PostEdit.fromData(row));
    },
  },
  Query: {
    posts: (obj: any, args: any, ctx: Context, info: any) => {
      return execute(posts).then((result) =>
        result.rows.map((row) => Post.fromData(row))
      );
    },
  },
  Mutation: {
    createPost: async (obj: any, { input }: any, ctx: Context) => {
      if (!ctx.auth) {
        throw new Error("Must be authenticated.");
      }
      const userCheckResult = await execute(author_by_id(input.author_id));
      if (!userCheckResult.rows.length) {
        throw new Error(`No author with ID: ${input.author_id}`);
      }

      if (input.author_id != ctx.auth.sub) {
        throw new Error("Cannot create a post as another author.");
      }

      const uuid = await get_new_uuid(Post);
      const insertResult = await execute(create_post(uuid, input));
      return Post.fromData(insertResult.rows[0]);
    },
    updatePost: async (
      obj: any,
      { id, input: { title, content, is_published, publish_date } }: any,
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Must be authenticated.");
      }

      const postResult = await execute(post_by_id(id));
      if (!postResult.rows.length) {
        throw new Error("No post by that ID found.");
      }
      const post = Post.fromData(postResult.rows[0]);

      if (post.author_id != ctx.auth.sub) {
        throw new Error("Cannot edit someone else's post.");
      }

      if (
        (!title || title == post.title) &&
        (!content || content == post.content) &&
        (!is_published || is_published == post.is_published) &&
        (!publish_date ||
          publish_date == post.publish_date ||
          publish_date.getTime() == post.publish_date.getTime())
      ) {
        throw new Error("No changes to be made.");
      }

      if (content && content !== post.content) {
        const changes = diffWords(post.content, content, undefined).map(
          // map out the `count` variable
          ({ value, count, ...rest }: any) => ({ text: value, ...rest })
        );

        post.content = content;

        await execute(
          create_post_edit(await get_new_uuid(PostEdit), {
            post_id: id,
            date: new Date(),
            changes,
          })
        );
      }

      post.title = title || post.title;
      post.is_published = is_published || post.is_published;
      post.publish_date = publish_date || post.publish_date;

      await execute(
        update_post(id, {
          title: post.title,
          content: post.content,
          is_published: post.is_published,
          publish_date: post.publish_date,
        })
      );

      return post;
    },
    deletePost: async (obj: any, { id }: any, ctx: Context) => {
      if (!ctx.auth) {
        throw new Error("Must be authenticated.");
      }

      const postResult = await execute(post_by_id(id));
      if (!postResult.rows.length) {
        return null;
      }
      const post = Post.fromData(postResult.rows[0]);

      if (post.author_id != ctx.auth.sub) {
        throw new Error("Cannot delete someone else's post.");
      }

      await execute(delete_post(id));
      return id;
    },
  },
};
