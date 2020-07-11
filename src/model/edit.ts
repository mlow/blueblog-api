import { DataLoader, Context, Type, knex, genUUID } from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";
import { Transaction } from "knex";

export interface EditChange {
  text: string;
  added?: boolean;
  removed?: boolean;
}

interface EditCreateInput {
  content_id: string;
  date: Date;
  changes: EditChange[];
}

export interface Edit {
  id: string;
  content_id: string;
  date: Date;
  changes: EditChange[];
}

type MaybeEdit = Edit | undefined;

function fromRawData({ changes, ...rest }: any): Edit {
  return {
    ...rest,
    changes: JSON.parse(changes),
  };
}

export interface EditModel {
  allByContent: (content_id: string) => Promise<Edit[]>;
  byID: (id: string) => Promise<MaybeEdit>;
  create: (input: EditCreateInput, trx: Transaction) => Promise<Edit>;
}

const cols = ["id", "content_id", "date", "changes"];
const edits = () =>
  knex<Edit>("edit").select<Edit[]>(cols).orderBy("date", "desc");

export const genEditModel = (ctx: Context): EditModel => {
  const editByIDLoader = new DataLoader<string, Edit>(async (keys) => {
    const mapping = mapObjectsByProp(
      await edits().whereIn("id", keys),
      "id",
      (edit) => fromRawData(edit)
    );
    return keys.map((key) => mapping[key]);
  });

  const editsByContentLoader = new DataLoader<string, Edit[]>(async (keys) => {
    const mapping = aggObjectsByProp(
      await edits().whereIn("content_id", keys),
      "content_id",
      (edit) => {
        edit = fromRawData(edit);
        editByIDLoader.prime(edit.id, edit);
        return edit;
      }
    );
    return keys.map((key) => mapping[key] ?? []);
  });

  return {
    allByContent(content_id: string): Promise<Edit[]> {
      return editsByContentLoader.load(content_id);
    },

    byID(id: string): Promise<MaybeEdit> {
      return editByIDLoader.load(id);
    },

    async create(input: EditCreateInput, trx: Transaction): Promise<Edit> {
      const [result] = await knex("edit")
        .transacting(trx)
        .insert(
          {
            ...input,
            id: await genUUID(Type.Edit, trx),
            changes: JSON.stringify(input.changes),
          },
          "*"
        );
      return fromRawData(result);
    },
  };
};
