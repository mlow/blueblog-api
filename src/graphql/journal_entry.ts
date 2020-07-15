import { gql } from "../mods";
import { PagerInput, validatePagerInput } from "./pagination";
import { Context } from "../model/index";
import { JournalEntry } from "../model/journal_entry";

export const typeDefs = gql`
  """
  A journal entry.
  """
  type JournalEntry implements Node & Content {
    id: ID!

    "The title of this journal entry."
    title: String!

    "The content of this journal entry."
    content: String!

    "The date of this journal entry."
    date: DateTime!

    "All edits that have been made this journal entry."
    edits: [Edit!]!
  }

  type JournalEntryEdge {
    node: JournalEntry!
    cursor: String!
  }

  type JournalEntryConnection {
    total: Int!
    beforeEdges: [JournalEntryEdge!]!
    afterEdges: [JournalEntryEdge!]!
    pageInfo: PageInfo!
  }

  input CreateJournalEntryInput {
    title: String!
    content: String!
    date: Boolean
  }

  input UpdateJournalEntryInput {
    title: String
    content: String
    date: DateTime
  }

  type Query {
    journal_entry(id: ID!): JournalEntry
    journal_entries(pager: Pager): JournalEntryConnection!
  }

  type Mutation {
    create_journal_entry(input: CreateJournalEntryInput!): JournalEntry!
    update_journal_entry(
      id: ID!
      input: UpdateJournalEntryInput!
    ): JournalEntry!
    delete_journal_entry(id: ID!): ID!
  }
`;

export const resolvers = {
  JournalEntry: {
    edits: (entry: JournalEntry, args: any, { model }: Context) => {
      return model.Edit.allByContent(entry.id);
    },
  },
  Query: {
    journal_entry: (obj: any, { id }: any, { model }: Context) => {
      return model.JournalEntry.byID(id);
    },
    journal_entries: (
      obj: any,
      { pager }: { pager: PagerInput },
      { model }: Context
    ) => {
      return model.JournalEntry.connection(validatePagerInput(pager));
    },
  },
  Mutation: {
    create_journal_entry: (obj: any, { input }: any, { model }: Context) => {
      return model.JournalEntry.create(input);
    },
    update_journal_entry: (
      obj: any,
      { id, input }: any,
      { model }: Context
    ) => {
      return model.JournalEntry.update(id, input);
    },
    delete_journal_entry: (obj: any, { id }: any, { model }: Context) => {
      return model.JournalEntry.delete(id);
    },
  },
};
