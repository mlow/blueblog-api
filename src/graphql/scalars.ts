import { gql, GraphQLScalarType } from "../mods";
import { hash2id, id2hash } from "../utils";
import { Kind, GraphQLError } from "graphql";

export const typeDefs = gql`
  """
  A date and time in UTC ISO8601 format. Ex: 2020-05-28T23:12:35.459Z
  """
  scalar DateTime
`;

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    serialize(value: Date) {
      return value.toISOString();
    },
    parseValue(value: any) {
      let result = new Date(value);
      if (result.toString() === "Invalid Date") {
        throw new Error(`Invalid time format: ${value}`);
      }
      return result;
    },
  }),
  ID: new GraphQLScalarType({
    name: "ID",
    serialize: (value: number) => id2hash(value),
    parseValue: (value: any) => hash2id(value),
    parseLiteral(valueNode) {
      if (valueNode.kind !== Kind.STRING && valueNode.kind !== Kind.INT) {
        throw new GraphQLError(
          "ID cannot represent a non-string and non-integer value"
        );
      }
      return hash2id(valueNode.value);
    },
  }),
};
