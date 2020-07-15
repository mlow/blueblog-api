import { gql } from "../mods";

export type PagerInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};

export function validatePagerInput({
  first,
  after,
  last,
  before,
}: PagerInput = {}): PagerInput {
  if (first && last && ((before && !after) || (!before && after))) {
    throw new Error(
      "Cannot specify both `first` and `last` with only one of `after` or `before`."
    );
  }
  if ((first && first < 0) || (last && last < 0)) {
    throw new Error("Neither `first` or `last` can be negative.");
  }
  return {
    first,
    after,
    last,
    before,
  };
}

export const typeDefs = gql`
  type PageInfo {
    startCursor: String
    endCursor: String
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
  }

  input Pager {
    first: Int
    after: String
    last: Int
    before: String
  }
`;
