import {
  DataLoader,
  Context,
  Type,
  knex,
  generateID,
  genConnection,
} from "./index";
import { PagerArgs } from "../graphql/pagination";
import { mapObjectsByProp } from "../utils";

interface DraftCreateUpdateInput {
  title?: string;
  content?: string;
  date?: Date;
}

export interface Draft {
  id: number;
  author_id: number;
  title: string;
  content: string;
  date: Date;
}

export interface DraftModel {
  connection: (args: PagerArgs) => any;
  byID: (id: number) => Promise<Draft>;
  create: (input: DraftCreateUpdateInput) => Promise<Draft>;
  update: (post_id: number, input: DraftCreateUpdateInput) => Promise<Draft>;
  delete: (post_id: number) => Promise<number>;
}

const cols = [
  "content.id",
  "content.author_id",
  "content.title",
  "content.content",
  "draft.date",
];

export const getDraftModel = ({ auth, model }: Context): DraftModel => {
  if (!auth.loggedIn) {
    throw new Error("Must be authenticated.");
  }

  const drafts = () =>
    knex<Draft>("draft")
      .innerJoin("content", "draft.id", "content.id")
      .select<Draft[]>(cols)
      .where("content.author_id", "=", auth.id);
  const byIDLoader = new DataLoader<number, Draft>(async (keys) => {
    const mapping = mapObjectsByProp(
      await drafts().whereIn("draft.id", keys),
      "id"
    );
    return keys.map((key) => mapping[key]);
  });

  return {
    connection(args: PagerArgs) {
      return genConnection(args, drafts(), "date", "desc", {
        serialize: (arg: Date) =>
          Buffer.from(arg.getTime() + "").toString("base64"),
        deserialize: (arg: string) =>
          new Date(parseInt(Buffer.from(arg, "base64").toString("ascii"))),
      });
    },

    byID(id: number): Promise<Draft> {
      return byIDLoader.load(id);
    },

    async create(input: DraftCreateUpdateInput): Promise<Draft> {
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
        const [draft] = await trx("draft").insert(
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
          date: draft.date,
        };
      });
    },

    async update(
      entry_id: number,
      input: DraftCreateUpdateInput
    ): Promise<Draft> {
      const draft = await this.byID(entry_id);
      if (!draft) {
        throw new Error("No draft with that ID found.");
      }
      if (auth.id != draft.author_id) {
        throw new Error("You cannot edit another author's draft.");
      }

      return await knex.transaction(async (trx) => {
        if (
          (input.content && input.content !== draft.content) ||
          (input.title && input.title !== draft.title)
        ) {
          const [content] = await trx("content")
            .where("id", draft.id)
            .update(
              {
                title: input.title ?? draft.title,
                content: input.content ?? draft.content,
              },
              ["title", "content"]
            );
          draft.title = content.title;
          draft.content = content.content;
        }
        if (input.date && input.date.getTime() !== draft.date.getTime()) {
          draft.date = input.date;
          await trx("draft").where("id", draft.id).update({
            date: draft.date,
          });
        }
        return draft;
      });
    },

    async delete(entry_id: number): Promise<number> {
      const draft = await this.byID(entry_id);
      if (!draft) {
        throw new Error("No entry with that ID found.");
      }
      if (auth.id != draft.author_id) {
        throw new Error("You cannot delete another author's post.");
      }

      // cascading delete
      await knex("ids").where("id", draft.id).delete();

      return draft.id;
    },
  };
};
