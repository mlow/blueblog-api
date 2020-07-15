import { DataLoader, Context, Type, knex, generateID } from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";
import { Transaction } from "knex";

export interface EditChange {
  text: string;
  added?: boolean;
  removed?: boolean;
}

interface EditCreateInput {
  content_id: number;
  date: Date;
  changes: EditChange[];
}

export interface Edit {
  id: number;
  content_id: number;
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
  allByContent: (content_id: number) => Promise<Edit[]>;
  byID: (id: number) => Promise<MaybeEdit>;
  create: (input: EditCreateInput, trx: Transaction) => Promise<Edit>;
}

const cols = ["id", "content_id", "date", "changes"];
const edits = () =>
  knex<Edit>("edit").select<Edit[]>(cols).orderBy("date", "desc");

export const genEditModel = (ctx: Context): EditModel => {
  const editByIDLoader = new DataLoader<number, Edit>(async (keys) => {
    const mapping = mapObjectsByProp(
      await edits().whereIn("id", keys),
      "id",
      (edit) => fromRawData(edit)
    );
    return keys.map((key) => mapping[key]);
  });

  const editsByContentLoader = new DataLoader<number, Edit[]>(async (keys) => {
    const mapping = aggObjectsByProp<Edit, number>(
      await edits().whereIn("content_id", keys),
      "content_id",
      (edit) => {
        edit = fromRawData(edit);
        editByIDLoader.prime(edit.id, edit);
        return edit;
      }
    );
    return keys.map((key) => mapping.get(key) ?? []);
  });

  return {
    allByContent(content_id: number): Promise<Edit[]> {
      return editsByContentLoader.load(content_id);
    },

    byID(id: number): Promise<MaybeEdit> {
      return editByIDLoader.load(id);
    },

    async create(input: EditCreateInput, trx: Transaction): Promise<Edit> {
      const [result] = await knex("edit")
        .transacting(trx)
        .insert(
          {
            ...input,
            id: await generateID(Type.Edit, trx),
            changes: JSON.stringify(input.changes),
          },
          "*"
        );
      return fromRawData(result);
    },
  };
};
