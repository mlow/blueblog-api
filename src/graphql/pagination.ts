import { gql } from "../mods";

export type PagerInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};

type DirectionArgs = { forward: boolean; backward: boolean };
type LimitArgs = { limit?: number; after?: string; before?: string };
export type PagerArgs = LimitArgs & DirectionArgs;

export function buildPagerArgs({
  first,
  after,
  last,
  before,
}: PagerInput = {}): PagerArgs {
  if (!(after || first || before || last)) {
    return { forward: true, backward: false };
  }
  if (first && last) {
    throw new Error("Cannot supply both first and last pager arguments.");
  }
  if ((first && first < 0) || (last && last < 0)) {
    throw new Error("Neither first or last argument can be negative.");
  }
  const limit = first ?? last ?? undefined;
  const forward = !last;
  const backward = !forward;
  return {
    limit,
    after,
    before,
    forward,
    backward,
  };
}

export const typeDefs = gql`
  type PageInfo {
    startCursor: String
    endCursor: String
    page: Int!
    totalPages: Int!
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
