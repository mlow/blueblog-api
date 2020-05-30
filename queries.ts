import { sql } from "./utils.ts";

export const create_uuid = (type: Function) =>
  sql`
INSERT INTO uuids (type_id)
(SELECT id FROM types WHERE type = ${type.name})
RETURNING uuid;`;

export const type_by_uuid = (uuid: string) =>
  sql`
SELECT t.type FROM uuids
JOIN types t ON type_id = t.id
WHERE uuid = ${uuid};`;

export const author_by_id = (author_id: string) =>
  sql`SELECT id, name FROM authors WHERE id = ${author_id};`;

export const author_by_name = (name: string) =>
  sql`SELECT id, name FROM authors WHERE name = ${name};`;

export const post_by_id = (post_id: string) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_time
FROM posts
WHERE id = ${post_id};`;

export const posts_by_author = (author_id: string) =>
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

export const create_author = (uuid: string, name: string) =>
  sql`
INSERT INTO authors (id, name)
VALUES (${uuid}, ${name})
RETURNING id, name;`;

export interface PostCreateQueryParams {
  author_id: number;
  title: string;
  content: string;
  is_published?: boolean;
  publish_date?: Date;
}

export const create_post = (uuid: string, params: PostCreateQueryParams) =>
  sql`
INSERT INTO posts (id, author_id, title, content, is_published, publish_time)
VALUES (
  ${uuid},
  ${params.author_id},
  ${params.title},
  ${params.content},
  ${params.is_published || false},
  ${params.publish_date || new Date()}
) RETURNING id, author_id, title, content, is_published, publish_time;`;
