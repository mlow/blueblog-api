import { gql, GraphQLScalarType } from "../mods";
import { hash2id, id2hash } from "../utils";
import { Kind, GraphQLError } from "graphql";
import { GraphQLJSONObject as JSONObject } from "graphql-type-json";

export const typeDefs = gql`
  """
  A date and time in UTC ISO8601 format. Ex: 2020-05-28T23:12:35.459Z
  """
  scalar DateTime

  scalar JSONObject
`;

function resolveDateTime(value: string) {
  const date = new Date(value);
  if (date.toString() === "Invalid Date") {
    throw new Error(`Invalid DateTime format: ${value}`);
  }
  return date;
}

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    serialize(value: Date) {
      return value.toISOString();
    },
    parseValue: (value: any) => resolveDateTime(value),
    parseLiteral(valueNode) {
      if (valueNode.kind !== Kind.STRING) {
        throw new GraphQLError(
          "DateTime cannot be represented by a non-string value"
        );
      }
      return resolveDateTime(valueNode.value);
    },
  }),
  JSONObject,
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
