import { hash, verify } from "../mods";
import { DataLoader, Context, Type, knex, generateID } from "./index";
import { mapObjectsByProp } from "../utils";

export interface Author {
  id: number;
  name: string;
  username: string;
  password_hash: string;
  key_salt: string;
  wrapped_key: string;
}

export interface AuthorModel {
  all: () => Promise<Author[]>;
  byID: (id: number) => Promise<Author>;
  byName: (name: string) => Promise<Author>;
  byUsername: (username: string) => Promise<Author>;
  create: ({
    name,
    username,
    password,
    key_salt,
    wrapped_key,
  }: any) => Promise<Author>;
  update: ({
    name,
    username,
    password,
    new_password,
    key_salt,
    wrapped_key,
  }: any) => Promise<Author>;
}

const cols = [
  "id",
  "name",
  "username",
  "password_hash",
  "key_salt",
  "wrapped_key",
];
const authors = () => knex<Author>("author").select<Author[]>(cols);
const author = () => knex<Author>("author").first<Author>(cols);

export const genAuthorModel = ({ auth }: Context): AuthorModel => {
  const authorByIDLoader = new DataLoader<number, Author>(async (keys) => {
    const mapping = mapObjectsByProp(await authors().whereIn("id", keys), "id");
    return keys.map((id) => mapping[id]);
  }, {});

  const authorByNameLoader = new DataLoader<string, Author>(async (keys) => {
    const mapping = mapObjectsByProp(
      await authors().whereIn("name", keys),
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
      return primeLoaders(await authors());
    },

    byID(id: number): Promise<Author> {
      return authorByIDLoader.load(id);
    },

    byName(name: string): Promise<Author> {
      return authorByNameLoader.load(name);
    },

    byUsername(username: string): Promise<Author> {
      return author().where(knex.raw('LOWER("username") = ?', username));
    },

    async create({
      name,
      username,
      password,
      key_salt,
      wrapped_key,
    }: any): Promise<Author> {
      let author = await this.byUsername(username);
      if (author) {
        throw new Error("That username is already taken.");
      }

      return knex.transaction(async (tnx) => {
        [author] = await tnx<Author>("author").insert(
          {
            id: await generateID(Type.Author, tnx),
            name,
            username,
            password_hash: await hash(password),
            key_salt,
            wrapped_key,
          },
          cols
        );
        return author;
      });
    },

    async update({
      name,
      username,
      password,
      new_password,
      key_salt,
      wrapped_key,
    }: any): Promise<Author> {
      if (!auth.loggedIn) {
        throw new Error("Must be authenticated.");
      }
      let author = await this.byID(auth.id);
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Current password is incorrect.");
      }

      if (new_password) {
        if (!key_salt || !wrapped_key) {
          throw new Error(
            "If password is being changed, we expect a new key_salt and wrapped_key."
          );
        }
        author.password_hash = await hash(new_password);
        author.key_salt = key_salt;
        author.wrapped_key = wrapped_key;
      }
      author.name = name ?? author.name;
      author.username = username ?? author.username;

      [author] = await knex<Author>("author")
        .where("id", author.id)
        .update(author, cols);

      return author;
    },
  };
};
