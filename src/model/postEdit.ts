export interface PostEditChange {
  text: string;
  added?: boolean;
  removed?: boolean;
}

export class PostEdit {
  constructor(
    public id: string,
    public post_id: string,
    public date: Date,
    public changes: PostEditChange[],
  ) {}

  static fromData(row: any[]): PostEdit {
    return new PostEdit(row[0], row[1], row[2], JSON.parse(row[3]));
  }
}
