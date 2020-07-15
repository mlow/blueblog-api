import { Context, DataLoader, QueryBuilder } from "../mods";
export { Context, DataLoader };

import { knex } from "../main";
export { knex };
import { Transaction } from "knex";

import { PagerInput } from "../graphql/pagination";
export { PagerInput };

import { AuthorModel, genAuthorModel } from "./author";
import { BlogPostModel, genPostModel } from "./blog_post";
import { JournalEntryModel, genJournalEntryModel } from "./journal_entry";
import { EditModel, genEditModel } from "./edit";
import { DraftModel, getDraftModel } from "./draft";

export { Author } from "./author";
export { BlogPost } from "./blog_post";
export { Edit, EditChange } from "./edit";

export const enum Type {
  Author = "Author",
  Edit = "Edit",
  Draft = "Draft",
  BlogPost = "BlogPost",
  JournalEntry = "JournalEntry",
}

export interface Models {
  Author: AuthorModel;
  Edit: EditModel;
  Draft: DraftModel;
  BlogPost: BlogPostModel;
  JournalEntry: JournalEntryModel;
}

class LazyModels implements Models {
  #models: any;
  constructor(public ctx: Context) {
    this.#models = {};
  }

  private _getModel(type: Type, modelFn: Function) {
    if (!(type in this.#models)) {
      this.#models[type] = modelFn(this.ctx);
    }
    return this.#models[type];
  }

  get Author() {
    return this._getModel(Type.Author, genAuthorModel);
  }
  get Edit() {
    return this._getModel(Type.Edit, genEditModel);
  }
  get Draft() {
    return this._getModel(Type.Draft, getDraftModel);
  }
  get BlogPost() {
    return this._getModel(Type.BlogPost, genPostModel);
  }
  get JournalEntry() {
    return this._getModel(Type.JournalEntry, genJournalEntryModel);
  }
}

export const genModel = (ctx: Context): Models => new LazyModels(ctx);

interface CursorSerializer {
  serialize: (arg: any) => string;
  deserialize: (arg: string) => any;
}

const passThroughSerializer: CursorSerializer = {
  serialize: (arg: any) => arg,
  deserialize: (arg: string) => arg,
};

type ValOrFunc<T> = T | (() => Promise<T> | T);
interface Connection<T> {
  beforeEdges: ValOrFunc<{ node: T; cursor: string }[]>;
  afterEdges: ValOrFunc<{ node: T; cursor: string }[]>;
  pageInfo: ValOrFunc<{
    startCursor: ValOrFunc<string | null>;
    endCursor: ValOrFunc<string | null>;
    hasNextPage: ValOrFunc<boolean>;
    hasPreviousPage: ValOrFunc<boolean>;
  }>;
}

export const DateCursorSerializer: CursorSerializer = {
  serialize: (arg: Date) => Buffer.from(arg.getTime() + "").toString("base64"),
  deserialize: (arg: string) =>
    new Date(parseInt(Buffer.from(arg, "base64").toString("ascii"))),
};

export async function genConnection(
  input: PagerInput,
  query: QueryBuilder,
  cursorColumn: string,
  sort: "asc" | "desc" = "asc",
  { serialize, deserialize }: CursorSerializer = passThroughSerializer
): Promise<Connection<any>> {
  const ascending = sort === "asc";
  const afterComp = ascending ? ">" : "<";
  const beforeComp = ascending ? "<" : ">";
  const forwardSort = ascending ? "asc" : "desc";
  const backwardSort = ascending ? "desc" : "asc";

  const edges: { before?: []; after?: [] } = {};
  let startCursor: string | null = null;
  let endCursor: string | null = null;
  let hasPreviousPage = false;
  let hasNextPage = false;

  if (input.first || input.after || (!input.last && !input.before)) {
    const tmp = query.clone();
    if (input.after) {
      tmp.where(cursorColumn, afterComp, deserialize(input.after));
    }
    if (input.first) {
      tmp.limit(input.first + 1);
    }
    const result = await tmp.orderBy(cursorColumn, forwardSort);
    hasNextPage = input.first ? result.length > input.first : false;
    if (hasNextPage) {
      result.length = input.first;
    }
    if (result.length) {
      startCursor = serialize(result[0][cursorColumn]);
      endCursor = serialize(result[result.length - 1][cursorColumn]);
    }
    edges.after = result;
  }
  if (input.last || input.before) {
    const tmp = query.clone();
    if (input.before) {
      tmp.where(cursorColumn, beforeComp, deserialize(input.before));
    }
    if (input.last) {
      tmp.limit(input.last + 1);
    }
    const result = await tmp.orderBy(cursorColumn, backwardSort);
    hasPreviousPage = input.last ? result.length > input.last : false;
    if (hasPreviousPage) {
      result.length = input.last;
    }
    if (result.length) {
      result.reverse();
      startCursor = serialize(result[0][cursorColumn]);
      // If the end cursor was already set in the after/last stage, don't
      // change it
      endCursor = endCursor
        ? endCursor
        : serialize(result[result.length - 1][cursorColumn]);
    }
    edges.before = result;
  }

  return {
    beforeEdges: (): { node: any; cursor: string }[] =>
      edges.before
        ? edges.before.map((node: any) => ({
            node,
            cursor: serialize(node[cursorColumn]),
          }))
        : [],
    afterEdges: (): { node: any; cursor: string }[] =>
      edges.after
        ? edges.after.map((node: any) => ({
            node,
            cursor: serialize(node[cursorColumn]),
          }))
        : [],
    pageInfo: {
      startCursor,
      endCursor,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

const typeByID = new Map<number, string>();
export async function getTypeByUUID(id: number) {
  let type = typeByID.get(id);
  if (!type) {
    const result = await knex("ids").first("type").where("id", id);
    typeByID.set(id, result?.type);
    type = result?.type;
  }
  return type;
}

export async function generateID(
  type: Type,
  trx?: Transaction
): Promise<number> {
  const query = knex("ids").insert({ type }, "id");
  if (trx) {
    query.transacting(trx);
  }
  const [id] = await query;
  return id;
}
