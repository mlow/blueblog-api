import gql from "../../vendor/graphql-tag.js";

import { getTypeByUUID, Author, Post, PostEdit } from "../model/index.ts";

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
    node: async (obj: any, { id }: any) => {
      switch (await getTypeByUUID(id)) {
        case Author.name:
          return Author.byID(id);
        case Post.name:
          return Post.byId(id);
        case PostEdit.name:
          return PostEdit.byId(id);
        default:
          return null;
      }
    },
  },
};
