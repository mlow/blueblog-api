import { hash, verify } from "https://deno.land/x/argon2/lib/mod.ts";
import { Context, Type, sql, execute, genUUID } from "./index.ts";

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

export interface Author {
  id: string;
  name: string;
  username: string;
  password_hash: string;
}

export interface AuthorModel {
  all: () => Promise<Author[]>;
  byID: (id: string) => Promise<Author>;
  byName: (name: string) => Promise<Author>;
  byUsername: (username: string) => Promise<Author>;
  create: ({ name, username, password }: any) => Promise<Author>;
  update: ({ name, username, password, new_password }: any) => Promise<Author>;
}

export const genAuthorModel = ({ author }: Context): AuthorModel => {
  return {
    async all(): Promise<Author[]> {
      return (await execute(AUTHORS)) as Author[];
    },

    async byID(id: string): Promise<Author> {
      const result = await execute(AUTHOR_BY_ID(id));
      return result[0] as Author;
    },

    async byName(name: string): Promise<Author> {
      const result = await execute(AUTHOR_BY_NAME(name));
      return result[0] as Author;
    },

    async byUsername(username: string): Promise<Author> {
      const result = await execute(AUTHOR_BY_USERNAME(username));
      return result[0] as Author;
    },

    async create({ name, username, password }: any): Promise<Author> {
      const author = this.byUsername(username);
      if (author) {
        throw new Error("That username is already taken.");
      }

      const password_hash = await hash(password, {
        salt: crypto.getRandomValues(new Uint8Array(16)),
      });

      const uuid = await genUUID(Type.Author);
      const result = await execute(
        CREATE_AUTHOR(uuid, {
          name,
          username,
          password_hash,
        })
      );

      return result[0] as Author;
    },

    async update({
      name,
      username,
      password,
      new_password,
    }: any): Promise<Author> {
      if (!author) {
        throw new Error("Must be authenticated.");
      }
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Current password is incorrect.");
      }
      if (new_password) {
        author.password_hash = await hash(new_password, {
          salt: crypto.getRandomValues(new Uint8Array(16)),
        });
      }
      author.name = name ?? author.name;
      author.username = username ?? author.username;
      await execute(UPDATE_AUTHOR(author));
      return author;
    },
  };
};
