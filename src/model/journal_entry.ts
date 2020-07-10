import {
  DataLoader,
  Context,
  Type,
  knex,
  genUUID,
  genConnection,
} from "./index";
import { PagerArgs } from "../graphql/pagination";
import { mapObjectsByProp } from "../utils";
import { insertContentEdit } from "./util";

interface JournalEntryCreateUpdateInput {
  title?: string;
  content?: string;
  date?: Date;
}

export interface JournalEntry {
  id: string;
  author_id: string;
  title: string;
  content: string;
  date: Date;
}

export interface JournalEntryModel {
  connection: (args: PagerArgs) => any;
  byID: (id: string) => Promise<JournalEntry>;
  create: (input: JournalEntryCreateUpdateInput) => Promise<JournalEntry>;
  update: (
    post_id: string,
    input: JournalEntryCreateUpdateInput
  ) => Promise<JournalEntry>;
  delete: (post_id: string) => Promise<string>;
}

const cols = [
  "content.id",
  "content.author_id",
  "content.title",
  "content.content",
  "journal_entries.date",
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
    knex<JournalEntry>("journal_entries")
      .innerJoin("content", "journal_entries.id", "content.id")
      .select<JournalEntry[]>(cols)
      .where("content.author_id", "=", auth.id);
  const byIDLoader = new DataLoader<string, JournalEntry>(async (keys) => {
    const mapping = mapObjectsByProp(
      await journal_entries().whereIn("journal_entries.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  return {
    connection(args: PagerArgs) {
      return genConnection(args, journal_entries(), "date", "desc", {
        serialize: (arg: Date) =>
          Buffer.from(arg.getTime() + "").toString("base64"),
        deserialize: (arg: string) =>
          new Date(parseInt(Buffer.from(arg, "base64").toString("ascii"))),
      });
    },

    byID(id: string): Promise<JournalEntry> {
      return byIDLoader.load(id);
    },

    async create(input: JournalEntryCreateUpdateInput): Promise<JournalEntry> {
      return await knex.transaction(async (trx) => {
        const uuid = await genUUID(Type.JournalEntry, trx);
        const [content] = await trx("content").insert(
          {
            id: uuid,
            author_id: auth.id,
            title: input.title,
            content: input.content,
          },
          ["author_id", "title", "content"]
        );
        const [entry] = await trx("journal_entries").insert(
          {
            id: uuid,
            date: input.date ?? new Date(),
          },
          ["date"]
        );

        return {
          id: uuid,
          author_id: content.author_id,
          title: content.title,
          content: content.content,
          date: entry.date,
        };
      });
    },

    async update(
      entry_id: string,
      input: JournalEntryCreateUpdateInput
    ): Promise<JournalEntry> {
      const entry = await this.byID(entry_id);
      if (!entry) {
        throw new Error("No journal entry with that ID found.");
      }
      if (auth.id != entry.author_id) {
        throw new Error("You cannot edit another author's journal.");
      }

      return await knex.transaction(async (trx) => {
        const contentChanged = input.content && input.content !== entry.content;
        if (contentChanged) {
          await insertContentEdit(
            trx,
            model.Edit,
            entry.id,
            entry.content,
            input.content!
          );
        }

        if (contentChanged || (input.title && input.title !== entry.title)) {
          const [content] = await trx("content")
            .where("id", entry.id)
            .update(
              {
                title: input.title ?? entry.title,
                content: input.content ?? entry.content,
              },
              ["title", "content"]
            );
          entry.title = content.title;
          entry.content = content.content;
        }
        if (input.date && input.date.getTime() !== entry.date.getTime()) {
          entry.date = input.date;
          await trx("journal_entries").where("id", entry.id).update({
            date: entry.date,
          });
        }
        return entry;
      });
    },

    async delete(entry_id: string): Promise<string> {
      const entry = await this.byID(entry_id);
      if (!entry) {
        throw new Error("No entry with that ID found.");
      }
      if (auth.id != entry.author_id) {
        throw new Error("You cannot delete another author's post.");
      }

      // cascading delete
      await knex("uuids").where("uuid", entry.id).delete();

      return entry.id;
    },
  };
};
