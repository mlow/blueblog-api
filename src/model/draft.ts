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
  connection: (args: PagerInput) => any;
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
    connection(args: PagerInput) {
      return genConnection(
        args,
        drafts(),
        "date",
        "desc",
        DateCursorSerializer
      );
    },

    byID(id: number): Promise<Draft> {
      return byIDLoader.load(id);
    },

    create(input: DraftCreateUpdateInput): Promise<Draft> {
      return knex.transaction(async (trx) => {
        const id = await generateID(Type.Draft, trx);
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
            date: new Date(),
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

      return knex.transaction(async (trx) => {
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
          const date = new Date();
          await trx("draft").where("id", draft.id).update({
            date,
          });
          draft.date = date;
        }
        return draft;
      });
    },

    async delete(draft_id: number): Promise<number> {
      const draft = await this.byID(draft_id);
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
