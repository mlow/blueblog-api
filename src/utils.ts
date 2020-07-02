import { Cookies } from "https://deno.land/x/oak/mod.ts";
import { PoolClient } from "https://deno.land/x/postgres/client.ts";
import { QueryConfig } from "https://deno.land/x/postgres/query.ts";
import { makeJwt } from "https://deno.land/x/djwt/create.ts";

import { pool } from "./main.ts";
import { config } from "./main.ts";
import { Author } from "./model/author.ts";

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
  return { text: query.join("").trim().replace(/\n/g, " "), args: args };
}

export async function execute(
  query: QueryConfig | string,
  client?: PoolClient
): Promise<{ [key: string]: any }[]> {
  const start = Date.now();
  try {
    if (client) {
      return (await client.query(query)).rowsOfObjects();
    } else {
      return (await pool.query(query)).rowsOfObjects();
    }
  } finally {
    console.log(
      "\x1b[31mquery\x1b[0m %s \x1b[31m+%dms\x1b[0m",
      typeof query == "string" ? query : query.text,
      Date.now() - start
    );
  }
}

export function set_jwt_cookies(author: Author, cookies: Cookies) {
  const now: number = new Date().getTime();
  const exp: number = 24 * 60 * 60 * 1000;
  const jwt = makeJwt({
    key: config["SECRET"],
    header: {
      alg: "HS256",
    },
    payload: {
      sub: author.id,
      iat: now,
      exp: now + exp,
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
      },
    },
  });

  const jwt_parts = jwt.split(".");
  const header_payload = jwt_parts.slice(0, 2).join(".");
  const signature = jwt_parts[2];
  cookies.set("jwt.header.payload", header_payload, {
    maxAge: exp,
    httpOnly: false,
    sameSite: "strict",
  });
  cookies.set("jwt.signature", signature, {
    maxAge: exp,
    httpOnly: true,
    sameSite: "strict",
  });

  return jwt;
}
