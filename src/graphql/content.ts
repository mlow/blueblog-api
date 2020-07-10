import { gql } from "../mods";
import { getTypeByUUID } from "../model/index";

export const typeDefs = gql`
  interface Content {
    title: String!
    content: String!
  }
`;

export const resolver = {
  Content: {
    __resolveType: ({ id }: any) => {
      return getTypeByUUID(id);
    },
  },
};
