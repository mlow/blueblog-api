import { gql } from "../mods";
import { PagerInput, validatePagerInput } from "./pagination";
import { Context } from "../model/index";
import { validateEncryptedInput } from "./encrypted";

export const typeDefs = gql`
  """
  A journal entry.
  """
  type JournalEntry implements Node & Encrypted {
    id: ID!

    "Params used for encrypting this journal entry."
    encryption_params: EncryptionParams!

    "base64 encoded encrypted contents of this journal entry."
    ciphertext: String!

    "The date of this journal entry."
    date: DateTime!

    "Whether this is a draft of a journal entry."
    draft: Boolean!
  }

  type JournalEntryEdge {
    node: JournalEntry!
    cursor: String!
  }

  type JournalEntryConnection {
    beforeEdges: [JournalEntryEdge!]!
    afterEdges: [JournalEntryEdge!]!
    pageInfo: PageInfo!
  }

  input CreateJournalEntryInput {
    encryption_params: JSONObject!
    ciphertext: String!
    date: DateTime
    draft: Boolean = false
  }

  input UpdateJournalEntryInput {
    encryption_params: JSONObject
    ciphertext: String
    date: DateTime
    draft: Boolean
  }

  type Query {
    journal_entries(
      pager: Pager
      draft: Boolean = false
    ): JournalEntryConnection!
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
  Query: {
    journal_entries: (
      obj: any,
      { pager, draft }: { pager: PagerInput; draft: boolean },
      { model }: Context
    ) => {
      return model.JournalEntry.connection(validatePagerInput(pager), draft);
    },
  },
  Mutation: {
    create_journal_entry: (obj: any, { input }: any, { model }: Context) => {
      validateEncryptedInput(input);
      return model.JournalEntry.create(input);
    },
    update_journal_entry: (obj: any, args: any, { model }: Context) => {
      validateEncryptedInput(args.input);
      return model.JournalEntry.update(args.id, args.input);
    },
    delete_journal_entry: (obj: any, { id }: any, { model }: Context) => {
      return model.JournalEntry.delete(id);
    },
  },
};
