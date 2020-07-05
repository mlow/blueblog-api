import { dotenv, Application, bodyParser, Pool } from "./mods";

import { applyGraphQL } from "./graphql";
import { applyAuth } from "./auth";
import { typeDefs, resolvers } from "./graphql/index";

import { genModel, Models } from "./model/index";

declare module "koa" {
  interface DefaultContext {
    // any per-request state
    model: Models;
  }
}

export const config = dotenv().parsed ?? {};

export const pool = new Pool({
  host: config["DB_HOST"],
  database: config["DB_NAME"],
  user: config["DB_USER"],
  password: config["DB_PASSWORD"],
  port: parseInt(config["DB_PORT"]),
  max: 10,
});

async function main() {
  console.log("Connecting to DB...");
  try {
    const client = await pool.connect();
    await client.release();
  } catch (error) {
    console.log(`Failed to connect to database: ${error.message}`);
    process.exit(1);
  }

  const app = new Application();
  app.use(
    bodyParser({
      enableTypes: ["json"],
    })
  );

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

  app.listen({ port: parseInt(config["LISTEN_PORT"]) });
}

main();
