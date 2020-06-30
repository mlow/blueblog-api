import gql from "../../vendor/graphql-tag.js";

import { Context } from "./index.ts";
import {
  type_by_uuid,
  author_by_id,
  post_by_id,
  post_edit_by_id,
} from "../queries.ts";
import { Author, Post, PostEdit } from "../types.ts";
import { execute } from "../utils.ts";

export const typeDefs = gql`
  """
  The node interface for conformal to Global Object Identification.
  """
  interface Node {
    "An object's globally unique ID."
    id: ID!
  }

  type Query {
    node(id: ID!): Node
  }
`;

export const resolvers = {
  Node: {
    __resolveType: (obj: any) => obj.constructor.name || null,
  },
  Query: {
    node: async (obj: any, { id }: any, ctx: Context, info: any) => {
      const result = await execute(ctx.db, type_by_uuid(id));
      if (!result.rows.length) return null;

      switch (result.rows[0][0]) {
        case Author.name:
          const authorResult = await execute(ctx.db, author_by_id(id));
          return Author.fromData(authorResult.rows[0]);
        case Post.name:
          const postResult = await execute(ctx.db, post_by_id(id));
          return Post.fromData(postResult.rows[0]);
        case PostEdit.name:
          const postEditResult = await execute(ctx.db, post_edit_by_id(id));
          return PostEdit.fromData(postEditResult.rows[0]);
        default:
          return null;
      }
    },
  },
};
