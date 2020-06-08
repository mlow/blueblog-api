export class Author {
  constructor(
    public id: string,
    public name: string,
  ) {}

  static fromData(row: any[]): Author {
    return new Author(row[0], row[1]);
  }
}

export class Post {
  constructor(
    public id: string,
    public author_id: string,
    public title: string,
    public content: string,
    public is_published: boolean,
    public publish_date: Date,
  ) {}

  static fromData(row: any[]): Post {
    return new Post(row[0], row[1], row[2], row[3], row[4], row[5]);
  }
}

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
