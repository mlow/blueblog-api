import { Context, DataLoader, QueryBuilder } from "../mods";
export { Context, DataLoader };

import { knex } from "../main";
export { knex };
import { Transaction } from "knex";

import { PagerArgs } from "../graphql/pagination";
export { PagerArgs };

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
  total: ValOrFunc<number>;
  edges: ValOrFunc<{ node: T; cursor: string }[]>;
  pageInfo: ValOrFunc<{
    startCursor: ValOrFunc<string | null>;
    endCursor: ValOrFunc<string | null>;
    hasNextPage: ValOrFunc<boolean>;
    hasPreviousPage: ValOrFunc<boolean>;
  }>;
}

export async function genConnection(
  args: PagerArgs,
  query: QueryBuilder,
  cursorColumn: string,
  sort: "asc" | "desc" = "asc",
  { serialize, deserialize }: CursorSerializer = passThroughSerializer
): Promise<Connection<any>> {
  const ascending = sort === "asc";
  const afterComp = ascending ? ">" : "<";
  const beforeCmop = ascending ? "<" : ">";
  const forwardSort = ascending ? "asc" : "desc";
  const backwardSort = ascending ? "desc" : "asc";

  const builder = query.clone();
  if (args.after) {
    builder.where(cursorColumn, afterComp, deserialize(args.after));
  }
  if (args.before) {
    builder.where(cursorColumn, beforeCmop, deserialize(args.before));
  }
  if (args.limit) {
    builder.limit(args.limit + 1);
  }
  builder.orderBy(cursorColumn, args.forward ? forwardSort : backwardSort);

  const result = await builder;
  const length = result.length;
  if (args.limit && length > args.limit) {
    result.length = args.limit;
  }

  if (args.backward) {
    // since results were sorted backwards in query, make them forward again
    result.reverse();
  }

  return {
    total: async () => {
      if (!(args.before || args.after || args.limit)) {
        return length;
      }
      // if any filtering was done in the query, we have to execute it again
      // in order to get the count if there was no filtering, making this
      // a rather expensive field.
      const [result] = await knex.from(query.as("_")).count({ cnt: "*" });
      return result.cnt;
    },
    edges: (): { node: any; cursor: string }[] =>
      result.map((node: any) => ({
        node,
        cursor: serialize(node[cursorColumn]),
      })),
    pageInfo: {
      startCursor: length == 0 ? null : serialize(result[0][cursorColumn]),
      endCursor:
        length == 0 ? null : serialize(result[result.length - 1][cursorColumn]),
      hasNextPage: args.forward && args.limit ? length > args.limit : false,
      hasPreviousPage:
        args.backward && args.limit ? length > args.limit : false,
    },
  };
}

const typeByUUID = new Map<String, String>();
export async function getTypeByUUID(uuid: string) {
  let type = typeByUUID.get(uuid);
  if (!type) {
    const result = await knex("uuid").first("type").where("uuid", uuid);
    typeByUUID.set(uuid, result?.type);
  }
  return type;
}

export async function genUUID(type: Type, trx?: Transaction): Promise<string> {
  const query = knex("uuid").insert({ type }, "uuid");
  if (trx) {
    query.transacting(trx);
  }
  const [uuid] = await query;
  return uuid;
}
