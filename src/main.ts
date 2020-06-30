import { Application } from "https://deno.land/x/oak/mod.ts";
import { Pool } from "https://deno.land/x/postgres/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv/mod.ts";

import { applyGraphQL } from "./graphql.ts";
import { applyAuth } from "./auth.ts";
import { typeDefs, resolvers } from "./graphql/index.ts";

import { Author } from "./model/author.ts";

declare module "https://deno.land/x/oak/mod.ts" {
  export interface Context {
    // any per-request state
    rstate: any;
    author?: Author;
  }
}

export const config = dotenv({ safe: true });

export const pool = new Pool(
  {
    hostname: config["DB_HOST"],
    database: config["DB_NAME"],
    user: config["DB_USER"],
    password: config["DB_PASSWORD"],
    port: parseInt(config["DB_PORT"]),
  },
  10, // size
  true // lazy
);

console.log("Connecting to DB...");
try {
  const client = await pool.connect();
  await client.release();
} catch (error) {
  console.log(`Failed to connect to database: ${error.message}`);
  Deno.exit(1);
}

const app = new Application();

app.use(async (ctx, next) => {
  ctx.rstate = {};
  await next();
});

applyAuth(app);

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(
    `${ctx.request.method} ${ctx.request.url} - ${Date.now() - start}ms`
  );
});

applyGraphQL({
  app,
  typeDefs: typeDefs,
  resolvers: resolvers,
});

console.log(`Server listening at http://localhost:${config["LISTEN_PORT"]}`);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await pool.end();
