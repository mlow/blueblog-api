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
        case Type.BlogPost:
          obj = await model.BlogPost.byID(id);
          break;
        case Type.JournalEntry:
          obj = await model.JournalEntry.byID(id);
          break;
        case Type.Edit:
          obj = await model.Edit.byID(id);
          break;
        default:
          return null;
      }
      obj.__typename = type;
      return obj;
    },
  },
};
