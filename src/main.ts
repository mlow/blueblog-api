import { Application, bodyParser, Knex } from "./mods";

import { applyGraphQL } from "./graphql";
import { applyAuth } from "./auth";
import { typeDefs, resolvers } from "./graphql/index";

import { genModel, Models } from "./model/index";
import { delay } from "./utils";
import stoppable from "stoppable";

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

const DB_CONNECT_ATTEMPTS = parseInt(process.env.DB_CONNECT_ATTEMPTS!) || 6;
const DB_CONNECT_RETRY_DELAY =
  parseInt(process.env.DB_CONNECT_RETRY_DELAY!) || 5;

function waitConnection() {
  return new Promise(async (resolve, reject) => {
    let attempt = 0;
    let retry;
    do {
      retry = ++attempt < DB_CONNECT_ATTEMPTS || DB_CONNECT_ATTEMPTS <= 0;
      try {
        await knex.raw("SELECT 1;");
        resolve();
        break;
      } catch (error) {
        console.error(
          `Connection attempt ${attempt} out of ${DB_CONNECT_ATTEMPTS} failed: ${error.message}`
        );
        if (retry) {
          console.error(`Trying again in ${DB_CONNECT_RETRY_DELAY} seconds...`);
          await delay(DB_CONNECT_ATTEMPTS * 1000);
        } else {
          reject(error);
        }
      }
    } while (retry);
  });
}

async function main() {
  try {
    await waitConnection();
  } catch (error) {
    console.error(`Could not connect: ${error.message}`);
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

  const server = stoppable(
    app.listen({ port: parseInt(process.env.LISTEN_PORT!) || 4000 }, () => {
      console.log(
        `Server listening at http://localhost:${process.env.LISTEN_PORT}\n---`
      );
    })
  );

  ["SIGINT", "SIGTERM"].forEach((sig) => {
    process.on(sig, async () => {
      console.log("\nCaught", sig);
      console.log("Shutting down...");
      server.stop((error, gracefully) => {
        if (error) {
          console.error(error);
          process.exit(2);
        } else if (!gracefully) {
          console.warn("Server was not shut down gracefully.");
          process.exit(1);
        } else {
          process.exit(0);
        }
      });
    });
  });
}

main();
