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
