import { hash, verify } from "../mods";
import { DataLoader, Context, Type, qb, genUUID } from "./index";
import { mapObjectsByProp } from "../utils";

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

const cols = ["id", "name", "username", "password_hash"];
const authors = () => qb<Author>("authors").select<Author[]>(cols);
const author = () => qb<Author>("authors").first<Author>(cols);

export const genAuthorModel = ({ auth }: Context): AuthorModel => {
  const authorByIDLoader = new DataLoader<string, Author>(async (keys) => {
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

    byID(id: string): Promise<Author> {
      return authorByIDLoader.load(id);
    },

    byName(name: string): Promise<Author> {
      return authorByNameLoader.load(name);
    },

    byUsername(username: string): Promise<Author> {
      return author().where(qb.raw('LOWER("username") = ?', username));
    },

    async create({ name, username, password }: any): Promise<Author> {
      let author = await this.byUsername(username);
      if (author) {
        throw new Error("That username is already taken.");
      }

      [author] = await qb<Author>("authors").insert(
        {
          id: await genUUID(Type.Author),
          name,
          username,
          password_hash: await hash(password),
        },
        "*"
      );
      return author;
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

      [author] = await qb<Author>("authors")
        .where("id", author.id)
        .update(author, "*");

      return author;
    },
  };
};
