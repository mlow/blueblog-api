import {
  Router,
  RouterContext,
  Application,
} from "https://deno.land/x/oak/mod.ts";

import { graphql } from "../vendor/graphql.js";
import {
  makeExecutableSchema,
} from "../vendor/graphql-tools/schema.js";

export interface ResolversProps {
  Query?: any;
  Mutation?: any;
  [dynamicProperty: string]: any;
}

export interface ApplyGraphQLOptions {
  app: Application;
  path?: string;
  typeDefs: any;
  resolvers: ResolversProps;
  context?: (ctx: RouterContext) => any;
}

export const applyGraphQL = ({
  app,
  path = "/graphql",
  typeDefs,
  resolvers,
  context,
}: ApplyGraphQLOptions) => {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    logger: {
      log: (err: any) => console.log(err),
    },
    directiveResolvers: undefined,
    schemaDirectives: undefined,
    pruningOptions: undefined,
  });

  const router = new Router();

  router.post(path, async (ctx) => {
    const { response, request } = ctx;
    const contextResult = context ? await context(ctx) : ctx;
    if (request.hasBody) {
      try {
        const body = await request.body();

        if (body.type !== "json") {
          response.status = 415;
          response.body = {
            error: { message: "Request body must be in json format." },
          };
          return;
        }

        const { query, variables, operationName } = body.value;
        if (!query) {
          response.status = 422;
          response.body = {
            error: { message: "Body missing 'query' parameter." },
          };
          return;
        }

        const result: any = await graphql(
          schema,
          query,
          resolvers,
          contextResult,
          variables,
          operationName,
        );

        response.body = result;
      } catch (error) {
        response.status = 500;
        response.body = {
          error: error.message,
        };
      }
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
};
