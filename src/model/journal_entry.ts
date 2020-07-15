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
import { insertContentEdit } from "./util";

interface JournalEntryCreateUpdateInput {
  title?: string;
  content?: string;
  date?: Date;
}

export interface JournalEntry {
  id: number;
  author_id: number;
  title: string;
  content: string;
  date: Date;
}

export interface JournalEntryModel {
  connection: (args: PagerInput) => any;
  byID: (id: number) => Promise<JournalEntry>;
  create: (input: JournalEntryCreateUpdateInput) => Promise<JournalEntry>;
  update: (
    post_id: number,
    input: JournalEntryCreateUpdateInput
  ) => Promise<JournalEntry>;
  delete: (post_id: number) => Promise<number>;
}

const cols = [
  "content.id",
  "content.author_id",
  "content.title",
  "content.content",
  "journal_entry.date",
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
      .innerJoin("content", "journal_entry.id", "content.id")
      .select<JournalEntry[]>(cols)
      .where("content.author_id", "=", auth.id);
  const byIDLoader = new DataLoader<number, JournalEntry>(async (keys) => {
    const mapping = mapObjectsByProp(
      await journal_entries().whereIn("journal_entry.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  return {
    connection(args: PagerInput) {
      return genConnection(
        args,
        journal_entries(),
        "date",
        "desc",
        DateCursorSerializer
      );
    },

    byID(id: number): Promise<JournalEntry> {
      return byIDLoader.load(id);
    },

    async create(input: JournalEntryCreateUpdateInput): Promise<JournalEntry> {
      return await knex.transaction(async (trx) => {
        const id = await generateID(Type.JournalEntry, trx);
        const [content] = await trx("content").insert(
          {
            id: id,
            author_id: auth.id,
            title: input.title,
            content: input.content,
          },
          ["author_id", "title", "content"]
        );
        const [entry] = await trx("journal_entry").insert(
          {
            id: id,
            date: input.date ?? new Date(),
          },
          ["date"]
        );

        return {
          id: id,
          author_id: content.author_id,
          title: content.title,
          content: content.content,
          date: entry.date,
        };
      });
    },

    async update(
      entry_id: number,
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
          await trx("journal_entry").where("id", entry.id).update({
            date: entry.date,
          });
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
        throw new Error("You cannot delete another author's post.");
      }

      // cascading delete
      await knex("ids").where("id", entry.id).delete();

      return entry.id;
    },
  };
};
