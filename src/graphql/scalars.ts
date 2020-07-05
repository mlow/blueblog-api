import { gql, GraphQLScalarType } from "../mods.ts";

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
};
