import gql from "../../vendor/graphql-tag.js";

import { Context } from "./index.ts";
import {
  post_by_id,
} from "../queries.ts";
import { execute } from "../utils.ts";
import { Post, PostEdit } from "../types.ts";

export const typeDefs = gql`
  """
  A change made to a post.
  """
  type PostEditChange {
    "A segment of text."
    text: String!

    "Whether the text was added."
    added: Boolean

    "Whether the text was removed."
    removed: Boolean
  }

  """
  An edit made to a post.
  """
  type PostEdit implements Node {
    id: ID!

    "The post this edit was made to."
    post: Post!

    "The date/time of this edit."
    date: DateTime!

    "The changes made to the post."
    changes: [PostEditChange!]!
  }
`;

export const resolvers = {
  PostEdit: {
    post: async (post_edit: PostEdit, args: any, ctx: Context) => {
      const postResult = await execute(ctx.db, post_by_id(post_edit.post_id));
      return Post.fromData(postResult.rows[0]);
    },
  },
};
