import { Context, DataLoader } from "../mods";
export { Context, DataLoader };

import { knex as qb } from "../main";
export { qb };

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

export async function getTypeByUUID(uuid: string) {
  const result = await qb("uuids")
    .first("t.type")
    .join("types as t", "t.id", "uuids.type_id")
    .where("uuid", uuid);
  return result.type;
}

export async function genUUID(type: Type): Promise<string> {
  const typeSubquery = qb("types").select("id").where("type", type);
  const result = await qb("uuids").insert({ type_id: typeSubquery }, "uuid");
  const [uuid] = result;
  return uuid;
}
