import { diffWords } from "../../vendor/diff.js";

import { sql, execute, genUUID } from "./index.ts";
import { Author } from "./author.ts";
import { PostEdit } from "./postEdit.ts";

const POSTS = sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
ORDER BY publish_date DESC;`;

const POST_BY_ID = (id: string) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE id = ${id}
LIMIT 1;`;

const POSTS_BY_AUTHOR = (author_id: string) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE author_id = ${author_id}
ORDER BY publish_date DESC;`;

export interface PostCreateUpdateParams {
  title: string;
  content: string;
  is_published?: boolean;
  publish_date?: Date;
}

export const CREATE_POST = (
  uuid: string,
  author_id: string,
  params: PostCreateUpdateParams
) =>
  sql`
INSERT INTO posts (id, author_id, title, content, is_published, publish_date)
VALUES (
  ${uuid},
  ${author_id},
  ${params.title},
  ${params.content},
  ${params.is_published ?? false},
  ${params.publish_date ?? new Date()}
) RETURNING id, author_id, title, content, is_published, publish_date;`;

export const UPDATE_POST = (post: Post) =>
  sql`
UPDATE posts
  SET title = ${post.title},
      content = ${post.content},
      is_published = ${post.is_published},
      publish_date = ${post.publish_date}
  WHERE id = ${post.id};`;

export const DELETE_POST = (uuid: string) =>
  sql`DELETE FROM posts WHERE id = ${uuid};`;

export class Post {
  constructor(
    public id: string,
    public author_id: string,
    public title: string,
    public content: string,
    public is_published: boolean,
    public publish_date: Date
  ) {}

  getAuthor(): Promise<Author> {
    return Author.byID(this.author_id);
  }

  getEdits(): Promise<PostEdit[]> {
    return PostEdit.allByPost(this.id);
  }

  async update({
    title,
    content,
    is_published,
    publish_date,
  }: any): Promise<this> {
    if (content && content !== this.content) {
      const changes = diffWords(
        this.content,
        content,
        undefined
      ).map(({ value, count, ...rest }: any) => ({ text: value, ...rest }));
      this.content = content;
      await PostEdit.create({
        post_id: this.id,
        date: new Date(),
        changes,
      });
    }

    this.title = title ?? this.title;
    this.is_published = is_published ?? this.is_published;
    this.publish_date = publish_date ?? this.publish_date;

    await execute(UPDATE_POST(this));

    return this;
  }

  delete() {
    return execute(DELETE_POST(this.id));
  }

  static fromRawData({
    id,
    author_id,
    title,
    content,
    is_published,
    publish_date,
  }: any): Post {
    return new Post(id, author_id, title, content, is_published, publish_date);
  }

  static async create(author: Author, input: any): Promise<Post> {
    const uuid = await genUUID(Post);
    const result = await execute(CREATE_POST(uuid, author.id, input));
    return Post.fromRawData(result[0]);
  }

  static async all(): Promise<Post[]> {
    const result = await execute(POSTS);
    return result.map((row) => Post.fromRawData(row));
  }

  static async byId(id: string): Promise<Post> {
    const result = await execute(POST_BY_ID(id));
    return Post.fromRawData(result[0]);
  }

  static async allByAuthor(author_id: string): Promise<Post[]> {
    const result = await execute(POSTS_BY_AUTHOR(author_id));
    return result.map((row) => Post.fromRawData(row));
  }
}
