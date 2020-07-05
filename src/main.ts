import { dotenv, Application, bodyParser, Knex } from "./mods";

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

const queries: { [key: string]: number } = {};
export const knex = Knex({
  client: "pg",
  connection: {
    host: config["DB_HOST"],
    database: config["DB_NAME"],
    user: config["DB_USER"],
    password: config["DB_PASSWORD"],
    port: parseInt(config["DB_PORT"]),
  },
})
  .on("query", ({ __knexQueryUid }) => {
    queries[__knexQueryUid] = Date.now();
  })
  .on("query-response", (_, { __knexQueryUid, sql }, __, ___) => {
    const start = queries[__knexQueryUid];
    console.log(
      "\x1b[31mquery\x1b[0m %s \x1b[31m+%dms\x1b[0m",
      sql,
      Date.now() - start
    );
    delete queries[__knexQueryUid];
  });

async function main() {
  console.log("Connecting to DB...");
  try {
    await knex.raw("SELECT 1;");
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
