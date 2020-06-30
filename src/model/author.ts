import { hash, verify } from "https://deno.land/x/argon2/lib/mod.ts";

import { sql, execute, genUUID } from "./index.ts";
import { Post } from "./post.ts";

const AUTHORS = sql`SELECT id, name, username, password_hash FROM authors;`;

const AUTHOR_BY_ID = (id: string) =>
  sql`SELECT id, name, username, password_hash FROM authors WHERE id = ${id} LIMIT 1;`;

const AUTHOR_BY_NAME = (name: string) =>
  sql`SELECT id, name, username, password_hash FROM authors WHERE name = ${name} LIMIT 1;`;

const AUTHOR_BY_USERNAME = (username: string) =>
  sql`SELECT id, name, username, password_hash FROM authors WHERE username = LOWER(${username}) LIMIT 1;`;

export interface AuthorCreateParams {
  name: string;
  username: string;
  password_hash: string;
}

const CREATE_AUTHOR = (
  uuid: string,
  { name, username, password_hash }: AuthorCreateParams
) =>
  sql`
INSERT INTO authors (id, name, username, password_hash)
VALUES (${uuid}, ${name}, LOWER(${username}), ${password_hash})
RETURNING id, name;`;

const UPDATE_AUTHOR = (author: Author) =>
  sql`
UPDATE authors
SET name = ${author.name},
    username = ${author.username},
    password_hash = ${author.password_hash}
WHERE id = ${author.id};`;

export class Author {
  constructor(
    public id: string,
    public name: string,
    public username: string,
    public password_hash: string
  ) {}

  getPosts(): Promise<Post[]> {
    return Post.allByAuthor(this.id);
  }

  async update({ name, username, password, new_password }: any): Promise<this> {
    if (!(await verify(this.password_hash, password))) {
      throw new Error("Current password is incorrect.");
    }

    if (new_password) {
      this.password_hash = await hash(new_password, {
        salt: crypto.getRandomValues(new Uint8Array(16)),
      });
    }

    this.name = name ?? this.name;
    this.username = username ?? this.username;

    await execute(UPDATE_AUTHOR(this));

    return this;
  }

  static fromRawData({ id, name, username, password_hash }: any): Author {
    return new Author(id, name, username, password_hash);
  }

  static async create({ name, username, password }: any): Promise<Author> {
    const author = Author.byUsername(username);
    if (author) {
      throw new Error("That username is taken.");
    }
    const uuid = await genUUID(Author);
    const password_hash = await hash(password, {
      salt: crypto.getRandomValues(new Uint8Array(16)),
    });

    const result = await execute(
      CREATE_AUTHOR(uuid, {
        name,
        username,
        password_hash,
      })
    );

    return Author.fromRawData(result[0]);
  }

  static async all(): Promise<Author[]> {
    const result = await execute(AUTHORS);
    return result.map((row) => Author.fromRawData(row));
  }

  static async byID(id: string): Promise<Author | undefined> {
    const result = await execute(AUTHOR_BY_ID(id));
    if (result.length) {
      return Author.fromRawData(result[0]);
    }
  }

  static async byName(name: string): Promise<Author | undefined> {
    const result = await execute(AUTHOR_BY_NAME(name));
    if (result.length) {
      return Author.fromRawData(result[0]);
    }
  }

  static async byUsername(username: string): Promise<Author | undefined> {
    const result = await execute(AUTHOR_BY_USERNAME(username));
    if (result.length) {
      return Author.fromRawData(result[0]);
    }
  }
}
