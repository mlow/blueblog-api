import {
  DataLoader,
  Context,
  Type,
  knex,
  generateID,
  genConnection,
  DateCursorSerializer,
} from "./index";
import { PagerInput } from "../graphql/pagination";
import { mapObjectsByProp } from "../utils";

interface JournalEntryCreateInput {
  encryption_params: any;
  ciphertext: string;
  date?: Date;
  draft?: boolean;
}

interface JournalEntryUpdateInput {
  encryption_params?: any;
  ciphertext?: string;
  date?: Date;
  draft?: boolean;
}

export interface JournalEntry {
  id: number;
  author_id: number;
  encryption_params: any;
  ciphertext: string;
  date: Date;
  draft: boolean;
}

export interface JournalEntryModel {
  connection: (args: PagerInput, draft: boolean) => any;
  byID: (id: number) => Promise<JournalEntry>;
  create: (input: JournalEntryCreateInput) => Promise<JournalEntry>;
  update: (id: number, input: JournalEntryUpdateInput) => Promise<JournalEntry>;
  delete: (id: number) => Promise<number>;
}

const cols = [
  "journal_entry.id",
  "journal_entry.author_id",
  "encrypted.encryption_params",
  "encrypted.ciphertext",
  "journal_entry.date",
  "journal_entry.draft",
];

export const genJournalEntryModel = ({
  auth,
  model,
}: Context): JournalEntryModel => {
  if (!auth.loggedIn) {
    // any attempt to access the journal entry model without authentication
    // will result in error
    throw new Error("Must be authenticated.");
  }

  const journal_entries = () =>
    knex<JournalEntry>("journal_entry")
      .innerJoin("encrypted", "journal_entry.id", "encrypted.id")
      .select<JournalEntry[]>(cols)
      .where("journal_entry.author_id", "=", auth.id);
  const byIDLoader = new DataLoader<number, JournalEntry>(async (keys) => {
    const mapping = mapObjectsByProp(
      await journal_entries().whereIn("journal_entry.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  return {
    connection(args: PagerInput, draft: boolean) {
      return genConnection(
        args,
        journal_entries().where("journal_entry.draft", "=", draft),
        "date",
        "desc",
        DateCursorSerializer
      );
    },

    byID(id: number): Promise<JournalEntry> {
      return byIDLoader.load(id);
    },

    async create(input: JournalEntryCreateInput): Promise<JournalEntry> {
      return await knex.transaction(async (trx) => {
        const id = await generateID(Type.JournalEntry, trx);
        const [encrypted] = await trx("encrypted").insert(
          {
            id: id,
            encryption_params: input.encryption_params,
            ciphertext: input.ciphertext,
          },
          ["encryption_params", "ciphertext"]
        );
        const [entry] = await trx("journal_entry").insert(
          {
            id: id,
            author_id: auth.id,
            date: input.date ?? new Date(),
            draft: !!input.draft,
          },
          ["author_id", "date", "draft"]
        );

        return {
          id: id,
          author_id: entry.author_id,
          encryption_params: encrypted.encryption_params,
          ciphertext: encrypted.ciphertext,
          date: entry.date,
          draft: entry.draft,
        };
      });
    },

    async update(
      entry_id: number,
      input: JournalEntryUpdateInput
    ): Promise<JournalEntry> {
      const entry = await this.byID(entry_id);
      if (!entry) {
        throw new Error("No journal entry with that ID found.");
      }
      if (auth.id != entry.author_id) {
        throw new Error("You cannot edit another author's journal.");
      }

      return await knex.transaction(async (trx) => {
        if (input.ciphertext && input.encryption_params) {
          const [encrypted] = await trx("encrypted")
            .where("id", entry.id)
            .update(
              {
                encryption_params: input.encryption_params,
                ciphertext: input.ciphertext,
              },
              ["encryption_params", "ciphertext"]
            );
          entry.encryption_params = encrypted.encryption_params;
          entry.ciphertext = encrypted.ciphertext;
        }
        if (input.date || typeof input.draft !== "undefined") {
          const [result] = await trx("journal_entry")
            .where("id", entry.id)
            .update(
              {
                date: input.date,
                draft: input.draft,
              },
              ["date", "draft"]
            );
          entry.date = new Date(result.date);
          entry.draft = result.draft;
        }
        return entry;
      });
    },

    async delete(entry_id: number): Promise<number> {
      const entry = await this.byID(entry_id);
      if (!entry) {
        throw new Error("No entry with that ID found.");
      }
      if (auth.id != entry.author_id) {
        throw new Error("You cannot delete another author's journal entry.");
      }

      // cascading delete
      await knex("ids").where("id", entry.id).delete();

      return entry.id;
    },
  };
};
