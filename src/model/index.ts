import { sql, execute } from "../utils.ts";
export { sql, execute };

export { Author } from "./author.ts";
export { Post } from "./post.ts";
export { PostEdit, PostEditChange } from "./postEdit.ts";

export const CREATE_UUID = (type: Function) =>
  sql`
INSERT INTO uuids (type_id)
(SELECT id FROM types WHERE type = ${type.name})
RETURNING uuid;`;

export const TYPE_BY_UUID = (uuid: string) =>
  sql`
SELECT t.type FROM uuids
JOIN types t ON type_id = t.id
WHERE uuid = ${uuid};`;

export async function getTypeByUUID(uuid: string) {
  const result = await execute(TYPE_BY_UUID(uuid));
  return result[0]?.type;
}

export async function genUUID(type: Function) {
  const result = await execute(CREATE_UUID(type));
  return result[0]?.uuid;
}
