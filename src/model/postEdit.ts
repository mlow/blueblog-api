import { DataLoader, Context, Type, qb, genUUID } from "./index";
import { mapObjectsByProp, aggObjectsByProp } from "../utils";

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
      await qb<PostEdit>("post_edits")
        .whereIn("id", keys)
        .orderBy("date", "desc"),
      "id",
      (edit) => fromRawData(edit)
    );
    return keys.map((key) => mapping[key]);
  });

  const postEditsByPostLoader = new DataLoader<string, PostEdit[]>(
    async (keys) => {
      const mapping = aggObjectsByProp(
        await qb<PostEdit>("post_edits")
          .whereIn("post_id", keys)
          .orderBy("date", "desc"),
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
      const [result] = await qb("post_edits").insert(
        {
          ...input,
          id: await genUUID(Type.PostEdit),
          changes: JSON.stringify(input.changes),
        },
        "*"
      );
      console.log(result);
      return fromRawData(result);
    },
  };
};
