import { gql } from "../mods.ts";

export const typeDefs = gql`
  """
  A post comment.
  """
  type Comment implements Node {
    id: ID!

    "The comment."
    comment: String!

    "The name of the author of the comment, may be anonymous."
    author: String

    "The date the comment was left on."
    published: DateTime!

    "Whether the comment is hidden."
    hidden: Boolean!
  }
`;

export const resolvers = {};
