import { gql } from "../mods";
import { Type, Context, getTypeByUUID } from "../model/index";

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
  Query: {
    node: async (_: any, { id }: any, { model }: Context) => {
      const type = await getTypeByUUID(id);
      let obj: any;
      switch (type) {
        case Type.Author:
          obj = await model.Author.byID(id);
          break;
        case Type.Post:
          obj = await model.Post.byID(id);
          break;
        case Type.PostEdit:
          obj = await model.PostEdit.byID(id);
          break;
        default:
          return null;
      }
      obj.__typename = type;
      return obj;
    },
  },
};
