import { Context, DataLoader } from "../mods";
export { Context, DataLoader };

import { knex } from "../main";
export { knex };

import { PagerArgs } from "../graphql/pagination";
export { PagerArgs };

import { genAuthorModel, AuthorModel } from "./author";
import { genPostModel, PostModel } from "./post";
import { genPostEditModel, PostEditModel } from "./postEdit";

export { Author } from "./author";
export { Post } from "./post";
export { PostEdit, PostEditChange } from "./postEdit";

export const enum Type {
  Author = "Author",
  Post = "Post",
  PostEdit = "PostEdit",
  PostEditChange = "PostEditChange",
}

export interface Models {
  Author: AuthorModel;
  Post: PostModel;
  PostEdit: PostEditModel;
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
  get Post() {
    return this._getModel(Type.Post, genPostModel);
  }
  get PostEdit() {
    return this._getModel(Type.PostEdit, genPostEditModel);
  }
}

export const genModel = (ctx: Context): Models => new LazyModels(ctx);

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

export async function genConnection<T>(
  args: PagerArgs,
  table: string,
  cursor: string,
  sort: "asc" | "desc" = "asc",
  cursorSerialize: (arg: any) => string = (arg) => arg,
  cursorDeserialize: (arg: string) => any = (arg) => arg
): Promise<Connection<T>> {
  const ascending = sort === "asc";
  const afterComp = ascending ? ">" : "<";
  const beforeCmop = ascending ? "<" : ">";
  const forwardSort = ascending ? "asc" : "desc";
  const backwardSort = ascending ? "desc" : "asc";

  const query = knex(table);
  if (args.after) {
    query.where(cursor, afterComp, cursorDeserialize(args.after));
  }
  if (args.before) {
    query.where(cursor, beforeCmop, cursorDeserialize(args.before));
  }
  if (args.limit) {
    query.limit(args.limit + 1);
  }
  query.orderBy(cursor, args.forward ? forwardSort : backwardSort);

  const result = await query;
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
      const result = await knex(table).count("* as cnt");
      return result[0].cnt as number;
    },
    edges: (): { node: T; cursor: string }[] =>
      result.map((node) => ({ node, cursor: cursorSerialize(node[cursor]) })),
    pageInfo: {
      startCursor: length == 0 ? null : cursorSerialize(result[0][cursor]),
      endCursor:
        length == 0 ? null : cursorSerialize(result[result.length - 1][cursor]),
      hasNextPage: args.forward && args.limit ? length > args.limit : false,
      hasPreviousPage:
        args.backward && args.limit ? length > args.limit : false,
    },
  };
}

export async function getTypeByUUID(uuid: string) {
  const result = await knex("uuids")
    .first("t.type")
    .join("types as t", "t.id", "uuids.type_id")
    .where("uuid", uuid);
  return result?.type;
}

export async function genUUID(type: Type): Promise<string> {
  const typeSubquery = knex("types").select("id").where("type", type);
  const result = await knex("uuids").insert({ type_id: typeSubquery }, "uuid");
  const [uuid] = result;
  return uuid;
}
