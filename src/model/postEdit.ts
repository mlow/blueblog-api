import { DataLoader, Context, Type, sql, execute, genUUID } from "./index.ts";
import { mapObjectsByProp, aggObjectsByProp } from "../utils.ts";

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

const POST_EDITS_BY_POST_IDS = (post_ids: readonly string[]) =>
  sql`
SELECT id, post_id, date, changes
FROM post_edits WHERE post_id IN (${post_ids})
ORDER BY date DESC;`;

const POST_EDITS_BY_IDS = (ids: readonly string[]) =>
  sql`SELECT id, post_id, date, changes FROM post_edits WHERE id IN (${ids});`;

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

export const genPostEditModel = (ctx: Context): PostEditModel => {
  const postEditByIDLoader = new DataLoader<string, PostEdit>(async (keys) => {
    const mapping = mapObjectsByProp(
      (await execute(POST_EDITS_BY_IDS(keys))) as any[],
      "id",
      (edit) => fromRawData(edit)
    );
    return keys.map((key) => mapping[key]);
  });

  const postEditsByPostLoader = new DataLoader<string, PostEdit[]>(
    async (keys) => {
      const mapping = aggObjectsByProp(
        (await execute(POST_EDITS_BY_POST_IDS(keys))) as any[],
        "post_id",
        (edit) => {
          edit = fromRawData(edit);
          postEditByIDLoader.prime(edit.id, edit);
          return edit;
        }
      );
      return keys.map((key) => mapping[key] ?? []);
    }
  );

  return {
    allByPost(post_id: string): Promise<PostEdit[]> {
      return postEditsByPostLoader.load(post_id);
    },

    byID(id: string): Promise<MaybePostEdit> {
      return postEditByIDLoader.load(id);
    },

    async create(input: PostEditCreateInput): Promise<PostEdit> {
      const uuid = await genUUID(Type.PostEdit);
      const result = await execute(CREATE_POST_EDIT(uuid, input));
      return fromRawData(result[0]);
    },
  };
};
