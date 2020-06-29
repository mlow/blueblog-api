import {
  Application,
} from "https://deno.land/x/oak/mod.ts";
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv/mod.ts";
import { Payload } from "https://deno.land/x/djwt/create.ts";
import { validateJwt } from "https://deno.land/x/djwt/validate.ts";

import { Context } from "./types.ts";
import {
  applyGraphQL,
} from "./graphql.ts";

import { typeDefs, resolvers } from "./graphql/index.ts";

export const config = dotenv({ safe: true });

const client = new Client({
  hostname: config["DB_HOST"],
  database: config["DB_NAME"],
  user: config["DB_USER"],
  password: config["DB_PASSWORD"],
  port: parseInt(config["DB_PORT"]),
});

console.log("Connecting to DB...");
try {
  await client.connect();
} catch (error) {
  console.log(`Failed to connect to database: ${error.message}`);
  Deno.exit(1);
}

const app = new Application();

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(
    `${ctx.request.method} ${ctx.request.url} - ${Date.now() - start}ms`,
  );
});

applyGraphQL({
  app,
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: async ({ request, response, cookies }) => {
    let jwt: Payload | undefined;
    const auth = request.headers.get("Authorization");
    if (auth) {
      const auth_parts = auth.split(" ");
      if (auth_parts.length !== 2 || auth_parts[0] !== "Bearer") {
        throw new Error("Malformed authorization header.");
      }
      const token_parts = auth_parts[1].split(".");
      try {
        let full_jwt: string;
        if (token_parts.length == 2) {
          const signature = cookies.get("jwt.signature");
          if (!signature) {
            throw new Error("Malformed JWT.");
          }
          full_jwt = `${auth_parts[1]}.${signature}`;
        } else if (token_parts.length == 3) {
          full_jwt = auth_parts[1];
        } else {
          throw new Error("Malformed JWT.");
        }

        const validatedJwt = await validateJwt(full_jwt, config["SECRET"]);
        if (validatedJwt.isValid) {
          jwt = validatedJwt.payload;
        }
      } catch (error) {
        throw error;
      }
    }

    return {
      request,
      response,
      cookies,
      db: client,
      jwt,
    } as Context;
  },
});

console.log(`Server listening at http://localhost:${config["LISTEN_PORT"]}`);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await client.end();
