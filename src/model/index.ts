import { Context, DataLoader } from "../mods.ts";
import { sql, execute } from "../utils.ts";
export { Context, DataLoader, sql, execute };

import { genAuthorModel, AuthorModel } from "./author.ts";
import { genPostModel, PostModel } from "./post.ts";
import { genPostEditModel, PostEditModel } from "./postEdit.ts";

export { Author } from "./author.ts";
export { Post } from "./post.ts";
export { PostEdit, PostEditChange } from "./postEdit.ts";

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

const CREATE_UUID = (type: Type) =>
  sql`
INSERT INTO uuids (type_id)
(SELECT id FROM types WHERE type = ${type})
RETURNING uuid;`;

const TYPE_BY_UUID = (uuid: string) =>
  sql`
SELECT t.type FROM uuids
JOIN types t ON type_id = t.id
WHERE uuid = ${uuid};`;

export async function getTypeByUUID(uuid: string) {
  const result = await execute(TYPE_BY_UUID(uuid));
  return result[0]?.type;
}

export async function genUUID(type: Type) {
  const result = await execute(CREATE_UUID(type));
  return result[0]?.uuid;
}
