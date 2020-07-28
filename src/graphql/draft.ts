import { gql } from "../mods";
import { validatePagerInput } from "./pagination";
import { Context } from "../model/index";
import { Draft } from "../model/draft";
import { resolveContent } from "./content";

export const typeDefs = gql`
  """
  A draft.
  """
  type Draft implements Node & Content {
    id: ID!

    "The title of the draft."
    title: String!

    "The content of the draft."
    content(format: ContentFormat = MARKDOWN): String!

    "The date of the last time this draft was edited."
    date: DateTime!
  }

  type DraftEdge {
    node: Draft!
    cursor: String!
  }

  type DraftConnection {
    total: Int!
    beforeEdges: [DraftEdge!]!
    afterEdges: [DraftEdge!]!
    pageInfo: PageInfo!
  }

  input CreateDraftInput {
    title: String!
    content: String!
  }

  input UpdateDraftInput {
    title: String
    content: String
  }

  type Query {
    draft(id: ID!): Draft
    drafts(pager: Pager): DraftConnection!
  }

  type Mutation {
    create_draft(input: CreateDraftInput!): Draft!
    update_draft(id: ID!, input: UpdateDraftInput!): Draft!
    delete_draft(id: ID!): ID!
  }
`;

export const resolvers = {
  Draft: {
    content: (draft: Draft, { format }: any) =>
      resolveContent(format, draft.content),
  },
  Query: {
    draft: (obj: any, { id }: any, { model }: Context) => {
      return model.Draft.byID(id);
    },
    drafts: (obj: any, { pager }: any, { model }: Context) => {
      return model.Draft.connection(validatePagerInput(pager));
    },
  },
  Mutation: {
    create_draft: (obj: any, { input }: any, { model }: Context) => {
      return model.Draft.create(input);
    },
    update_draft: (obj: any, { id, input }: any, { model }: Context) => {
      return model.Draft.update(id, input);
    },
    delete_draft: (obj: any, { id }: any, { model }: Context) => {
      return model.Draft.delete(id);
    },
  },
};
