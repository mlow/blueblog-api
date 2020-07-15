import { hash, verify } from "../mods";
import { DataLoader, Context, Type, knex, generateID } from "./index";
import { mapObjectsByProp } from "../utils";

export interface Author {
  id: number;
  name: string;
  username: string;
  password_hash: string;
}

export interface AuthorModel {
  all: () => Promise<Author[]>;
  byID: (id: number) => Promise<Author>;
  byName: (name: string) => Promise<Author>;
  byUsername: (username: string) => Promise<Author>;
  create: ({ name, username, password }: any) => Promise<Author>;
  update: ({ name, username, password, new_password }: any) => Promise<Author>;
}

const cols = ["id", "name", "username", "password_hash"];
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

    async create({ name, username, password }: any): Promise<Author> {
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
          },
          "*"
        );
        return author;
      });
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
      let author = await this.byID(auth.id);
      if (!(await verify(author.password_hash, password))) {
        throw new Error("Current password is incorrect.");
      }

      if (new_password) {
        author.password_hash = await hash(new_password);
      }
      author.name = name ?? author.name;
      author.username = username ?? author.username;

      [author] = await knex<Author>("author")
        .where("id", author.id)
        .update(author, "*");

      return author;
    },
  };
};
