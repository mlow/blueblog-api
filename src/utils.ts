import { Context, PoolClient, QueryConfig, sign as makeJwt } from "./mods";

import { pool } from "./main";
import { config } from "./main";
import { Author } from "./model/author";

export function sql(
  strings: TemplateStringsArray,
  ...values: any[]
): QueryConfig {
  if (strings.length == 1)
    return { text: strings[0].trim().replace(/\n/g, " ") };

  const query: string[] = [];
  const args: Array<unknown> = [];
  let argIndex = 1;
  for (let i = 0, len = strings.length; i < len; i++) {
    query.push(strings[i]);
    if (i < len - 1) {
      let val = values[i];
      if (val instanceof Array) {
        // When val is an array, add placeholders for each value to the
        // query with comma separation.
        query.push(val.map(() => "$" + argIndex++).join(","));
        args.push(...val);
      } else {
        query.push("$" + argIndex++);
        args.push(val);
      }
    }
  }
  return { text: query.join("").trim().replace(/\n/g, " "), values: args };
}

export async function execute(
  query: QueryConfig | string,
  client?: PoolClient
): Promise<any[]> {
  const start = Date.now();
  try {
    if (client) {
      return (await client.query(query)).rows;
    } else {
      return (await pool.query(query)).rows;
    }
  } finally {
    console.log(
      "\x1b[31mquery\x1b[0m %s \x1b[31m+%dms\x1b[0m",
      typeof query == "string" ? query : query.text,
      Date.now() - start
    );
  }
}

export function set_jwt_cookies(author: Author, ctx: Context) {
  const exp: number = 24 * 60 * 60 * 1000; // 1 day
  const jwt = makeJwt(
    {
      sub: author.id,
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
      },
    },
    config["SECRET"],
    {
      expiresIn: exp / 1000,
    }
  );

  const jwt_parts = jwt.split(".");
  const header_payload = jwt_parts.slice(0, 2).join(".");
  const signature = jwt_parts[2];
  ctx.cookies.set("jwt.header.payload", header_payload, {
    maxAge: exp,
    httpOnly: false,
    sameSite: "strict",
  });
  ctx.cookies.set("jwt.signature", signature, {
    maxAge: exp,
    httpOnly: true,
    sameSite: "strict",
  });

  return jwt;
}

export function mapObjectsByProp<T>(
  objs: T[],
  key: string,
  fn?: (arg: T) => T
): { [key: string]: T } {
  const map: { [key: string]: T } = {};
  objs.forEach((obj: any) => {
    obj = typeof fn !== "undefined" ? fn(obj) : obj;
    map[obj[key]] = obj;
  });
  return map;
}

export function aggObjectsByProp<T>(
  objs: T[],
  key: string,
  fn?: (arg: T) => T
): { [key: string]: T[] } {
  const map: { [key: string]: T[] } = {};
  objs.forEach((obj: any) => {
    obj = typeof fn !== "undefined" ? fn(obj) : obj;
    const arr: T[] = map[obj[key]] ?? (map[obj[key]] = []);
    arr.push(obj);
  });
  return map;
}
