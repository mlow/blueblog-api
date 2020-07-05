import { Application, Pool, dotenv } from "./mods.ts";

import { applyGraphQL } from "./graphql.ts";
import { applyAuth } from "./auth.ts";
import { typeDefs, resolvers } from "./graphql/index.ts";

import { genModel, Models } from "./model/index.ts";

declare module "./mods.ts" {
  interface Context {
    // any per-request state
    rstate: any;
    model: Models;
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

applyAuth(app);

app.use(async (ctx, next) => {
  ctx.rstate = {};
  ctx.model = genModel(ctx);
  await next();
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(
    `\x1b[32m%s\x1b[0m %s \x1b[32m%dms\x1b[0m\n---`,
    ctx.request.method,
    ctx.request.url,
    Date.now() - start
  );
});

applyGraphQL({
  app,
  typeDefs: typeDefs,
  resolvers: resolvers,
});

console.log(
  `Server listening at http://localhost:${config["LISTEN_PORT"]}\n---`
);
await app.listen({ port: parseInt(config["LISTEN_PORT"]) });

await pool.end();
