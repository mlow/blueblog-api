import { Cookies } from "https://deno.land/x/oak/mod.ts";
import { Client } from "https://deno.land/x/postgres/mod.ts";
import {
  QueryConfig,
  QueryResult,
} from "https://deno.land/x/postgres/query.ts";
import { makeJwt } from "https://deno.land/x/djwt/create.ts";
import { create_uuid } from "./queries.ts";

import { config } from "./main.ts";

export function sql(
  strings: TemplateStringsArray,
  ...values: any[]
): QueryConfig {
  if (strings.length == 1) return { text: strings[0] };

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
  return { text: query.join("").trim(), args: args };
}

export async function execute(
  client: Client,
  query: QueryConfig | string,
): Promise<QueryResult> {
  console.log((typeof query == "string" ? query : query.text) + "\n---");
  return client.query(query);
}

export function set_jwt_cookies(author: any, cookies: Cookies) {
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

export async function get_new_uuid(db: Client, type: Function) {
  const result = await db.query(create_uuid(type));
  if (!result.rows) {
    throw new Error(`Could not create a new UUID for the type: ${type.name}`);
  }
  return result.rows[0][0];
}