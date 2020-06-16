import { sql } from "./utils.ts";
import { PostEditChange } from "./types.ts";

export const authenticate = (username: string) =>
  sql`
SELECT id, password_hash
FROM authors
WHERE username = LOWER(${username});`;

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

//
// Authors
//

export const authors = sql`
SELECT id, name
FROM authors;`;

export const author_by_id = (author_id: string) =>
  sql`
SELECT id, name, username, password_hash
FROM authors
WHERE id = ${author_id};`;

export const author_by_name = (name: string) =>
  sql`SELECT id, name FROM authors WHERE name = ${name};`;

export interface AuthorCreateQueryParams {
  name: string;
  username: string;
  password_hash: string;
}

export const create_author = (
  uuid: string,
  { name, username, password_hash }: AuthorCreateQueryParams,
) =>
  sql`
INSERT INTO authors (id, name, username, password_hash)
VALUES (${uuid}, ${name}, LOWER(${username}), ${password_hash})
RETURNING id, name;`;

export const update_author = (uuid: string, params: AuthorCreateQueryParams) =>
  sql`
UPDATE authors
  SET name = ${params.name},
      username = ${params.username},
      password_hash = ${params.password_hash}
  WHERE id = ${uuid}
  RETURNING id, name;`;

//
// Posts
//

export const posts = sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
ORDER BY publish_date DESC;`;

export const post_by_id = (post_id: string) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE id = ${post_id};`;

export const posts_by_author = (author_id: string) =>
  sql`
SELECT id, author_id, title, content, is_published, publish_date
FROM posts
WHERE author_id = ${author_id}
ORDER BY publish_date DESC;`;

export interface PostCreateQueryParams {
  author_id: number;
  title: string;
  content: string;
  is_published?: boolean;
  publish_date?: Date;
}

export interface PostUpdateQueryParams {
  title: string;
  content: string;
  is_published: boolean;
  publish_date: Date;
}

export const create_post = (uuid: string, params: PostCreateQueryParams) =>
  sql`
INSERT INTO posts (id, author_id, title, content, is_published, publish_date)
VALUES (
  ${uuid},
  ${params.author_id},
  ${params.title},
  ${params.content},
  ${params.is_published || false},
  ${params.publish_date || new Date()}
) RETURNING id, author_id, title, content, is_published, publish_date;`;

export const update_post = (uuid: string, params: PostUpdateQueryParams) =>
  sql`
UPDATE posts
  SET title = ${params.title},
      content = ${params.content},
      is_published = ${params.is_published},
      publish_date = ${params.publish_date}
  WHERE id = ${uuid};`;

export const delete_post = (uuid: string) =>
  sql`DELETE FROM posts WHERE id = ${uuid};`;

//
// PostEdits
//

export const post_edits = (post_id: string) =>
  sql`
SELECT id, post_id, date, changes
FROM post_edits WHERE post_id = ${post_id}
ORDER BY date DESC`;

export const post_edit_by_id = (id: string) =>
  sql`SELECT id, post_id, date, changes FROM post_edits WHERE id = ${id};`;

export interface PostEditCreateQueryParams {
  post_id: number;
  date: Date;
  changes: PostEditChange[];
}

export const create_post_edit = (
  uuid: string,
  { post_id, date, changes }: PostEditCreateQueryParams,
) =>
  sql`
INSERT INTO post_edits (id, post_id, date, changes)
VALUES (${uuid}, ${post_id}, ${date}, ${JSON.stringify(changes)})
RETURNING id, post_id, date, changes;`;
