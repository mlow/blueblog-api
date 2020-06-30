import {
  Application,
} from "https://deno.land/x/oak/mod.ts";
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv/mod.ts";
import { Payload } from "https://deno.land/x/djwt/create.ts";

import { applyGraphQL } from "./graphql.ts";
import { applyAuth } from "./auth.ts";
import { typeDefs, resolvers } from "./graphql/index.ts";

declare module "https://deno.land/x/oak/mod.ts" {
  export interface Context {
    // any per-request state
    rstate: any;
    db: Client;
    auth?: Payload;
  }
}

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
  ctx.rstate = {};
  ctx.db = client;
  await next();
});

applyAuth(app);

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
});

console.log(`Server listening at http://localhost:${config["LISTEN_PORT"]}`);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await client.end();
