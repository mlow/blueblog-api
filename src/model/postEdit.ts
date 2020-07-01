import { Context, Type, sql, execute, genUUID } from "./index.ts";

export interface PostEditChange {
  text: string;
  added?: boolean;
  removed?: boolean;
}

interface PostEditCreateInput {
  post_id: string;
  date: Date;
  changes: PostEditChange[];
}

const POST_EDITS_BY_POST_ID = (post_id: string) =>
  sql`
SELECT id, post_id, date, changes
FROM post_edits WHERE post_id = ${post_id}
ORDER BY date DESC;`;

const POST_EDIT_BY_ID = (id: string) =>
  sql`SELECT id, post_id, date, changes FROM post_edits WHERE id = ${id};`;

const CREATE_POST_EDIT = (
  uuid: string,
  { post_id, date, changes }: PostEditCreateInput
) =>
  sql`
INSERT INTO post_edits (id, post_id, date, changes)
VALUES (${uuid}, ${post_id}, ${date}, ${JSON.stringify(changes)})
RETURNING id, post_id, date, changes;`;

export interface PostEdit {
  id: string;
  post_id: string;
  date: Date;
  changes: PostEditChange[];
}

type MaybePostEdit = PostEdit | undefined;

function fromRawData({ changes, ...rest }: any): PostEdit {
  return {
    ...rest,
    changes: JSON.parse(changes),
  };
}

export interface PostEditModel {
  allByPost: (post_id: string) => Promise<PostEdit[]>;
  byID: (id: string) => Promise<MaybePostEdit>;
  create: (input: PostEditCreateInput) => Promise<PostEdit>;
}

export const genPostEditModel = (ctx: Context): PostEditModel => ({
  async allByPost(post_id: string): Promise<PostEdit[]> {
    const result = await execute(POST_EDITS_BY_POST_ID(post_id));
    return result.map((row) => fromRawData(row));
  },

  async byID(id: string): Promise<MaybePostEdit> {
    const result = await execute(POST_EDIT_BY_ID(id));
    if (result.length) {
      return fromRawData(result[0]);
    }
  },

  async create(input: PostEditCreateInput): Promise<PostEdit> {
    const uuid = await genUUID(Type.PostEdit);
    const result = await execute(CREATE_POST_EDIT(uuid, input));
    return fromRawData(result[0]);
  },
});
