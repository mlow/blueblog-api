import { Application, bodyParser, Knex } from "./mods";

import { applyGraphQL } from "./graphql";
import { applyAuth } from "./auth";
import { typeDefs, resolvers } from "./graphql/index";

import { genModel, Models } from "./model/index";

declare module "koa" {
  interface BaseContext {
    // any per-request state
    model: Models;
  }
}

const queries: { [key: string]: number } = {};
export const knex = Knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT!) || 5432,
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
    context: (ctx) => {
      ctx.model = genModel(ctx);
      return ctx;
    },
  });

  app.listen({ port: parseInt(process.env.LISTEN_PORT!) || 4000 }, () => {
    console.log(
      `Server listening at http://localhost:${process.env.LISTEN_PORT}\n---`
    );
  });
}

main();
