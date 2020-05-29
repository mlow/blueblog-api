import { sql } from "./utils.ts";

export const author_by_id = (id: number) =>
  sql`SELECT id, name FROM authors WHERE id = ${id};`;

export const author_by_name = (name: string) =>
  sql`SELECT id, name FROM authors WHERE name = ${name};`;

export const post_by_id = (post_id: number) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_time
FROM posts
WHERE id = ${post_id};`;

export const posts_by_author = (author_id: number) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_time
FROM posts
WHERE author_id = ${author_id};`;

export const authors = sql`
SELECT id, name
FROM authors;`;

export const posts = sql`
SELECT id, author_id, title, content, is_published, publish_time
FROM posts;`;

export const create_author = (name: string) =>
  sql`INSERT INTO authors (name) VALUES (${name}) RETURNING id, name;`;

export interface PostCreateQueryParams {
  author_id: number;
  title: string;
  content: string;
  is_published?: boolean;
  publish_date?: Date;
}

export const create_post = (params: PostCreateQueryParams) =>
  sql`
INSERT INTO posts (author_id, title, content, is_published, publish_time)
VALUES (
  ${params.author_id},
  ${params.title},
  ${params.content},
  ${params.is_published || false},
  ${params.publish_date || new Date()}
) RETURNING id, author_id, title, content, is_published, publish_time;`;
