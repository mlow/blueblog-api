import { hash, verify } from "../mods.ts";
import { DataLoader, Context, Type, sql, execute, genUUID } from "./index.ts";
import { mapObjectsByProp } from "../utils.ts";

const AUTHORS = sql`SELECT id, name, username, password_hash FROM authors;`;

const AUTHORS_BY_IDS = (ids: readonly string[]) =>
  sql`SELECT id, name, username, password_hash FROM authors WHERE id IN (${ids});`;

const AUTHORS_BY_NAMES = (names: readonly string[]) =>
  sql`SELECT id, name, username, password_hash FROM authors WHERE name IN (${names});`;

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

export const genAuthorModel = ({ auth }: Context): AuthorModel => {
  const authorByIDLoader = new DataLoader<string, Author>(async (keys) => {
    const mapping = mapObjectsByProp(
      (await execute(AUTHORS_BY_IDS(keys))) as Author[],
      "id"
    );
    return keys.map((id) => mapping[id]);
  }, {});

  const authorByNameLoader = new DataLoader<string, Author>(async (keys) => {
    const mapping = mapObjectsByProp(
      (await execute(AUTHORS_BY_NAMES(keys))) as Author[],
      "name"
    );
    return keys.map((id) => mapping[id]);
  }, {});

  function primeLoaders(authors: Author[]) {
    authors.forEach((author) => {
      authorByIDLoader.prime(author.id, author);
    });
    return authors;
  }

  return {
    async all(): Promise<Author[]> {
      return primeLoaders((await execute(AUTHORS)) as Author[]);
    },

    byID(id: string): Promise<Author> {
      return authorByIDLoader.load(id);
    },

    byName(name: string): Promise<Author> {
      return authorByNameLoader.load(name);
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
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      const author = await this.byID(auth.id);
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
