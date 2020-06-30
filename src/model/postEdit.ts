import { sql, execute, genUUID } from "./index.ts";
import { Post } from "./post.ts";

export interface PostEditChange {
  text: string;
  added?: boolean;
  removed?: boolean;
}

const POST_EDITS_BY_POST_ID = (post_id: string) =>
  sql`
SELECT id, post_id, date, changes
FROM post_edits WHERE post_id = ${post_id}
ORDER BY date DESC`;

const POST_EDIT_BY_ID = (id: string) =>
  sql`SELECT id, post_id, date, changes FROM post_edits WHERE id = ${id};`;

interface PostEditCreateParams {
  post_id: string;
  date: Date;
  changes: PostEditChange[];
}

const CREATE_POST_EDIT = (
  uuid: string,
  { post_id, date, changes }: PostEditCreateParams
) =>
  sql`
INSERT INTO post_edits (id, post_id, date, changes)
VALUES (${uuid}, ${post_id}, ${date}, ${JSON.stringify(changes)})
RETURNING id, post_id, date, changes;`;

export class PostEdit {
  constructor(
    public id: string,
    public post_id: string,
    public date: Date,
    public changes: PostEditChange[]
  ) {}

  getPost(): Promise<Post> {
    return Post.byId(this.post_id);
  }

  static fromRawData({ id, post_id, date, changes }: any): PostEdit {
    return new PostEdit(id, post_id, date, JSON.parse(changes));
  }

  static async create(input: PostEditCreateParams): Promise<PostEdit> {
    const uuid = await genUUID(PostEdit);
    const result = await execute(CREATE_POST_EDIT(uuid, input));
    return PostEdit.fromRawData(result[0]);
  }

  static async byId(id: string): Promise<PostEdit> {
    const result = await execute(POST_EDIT_BY_ID(id));
    return PostEdit.fromRawData(result[0]);
  }

  static async allByPost(post_id: string): Promise<PostEdit[]> {
    const result = await execute(POST_EDITS_BY_POST_ID(post_id));
    return result.map((row) => PostEdit.fromRawData(row));
  }
}
