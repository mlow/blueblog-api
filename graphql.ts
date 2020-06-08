import {
  Router,
  RouterContext,
  Application,
} from "https://deno.land/x/oak/mod.ts";

import { graphql } from "https://cdn.pika.dev/graphql@^15.0.0";
import {
  makeExecutableSchema,
} from "https://cdn.pika.dev/@graphql-tools/schema@^6.0.6";

import { renderPlaygroundPage } from "./playground/render-playground-page.ts";

export {
  GraphQLScalarType,
} from "https://cdn.pika.dev/graphql@^15.0.0";

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
  playground?: boolean;
}

export const applyGraphQL = ({
  app,
  path = "/graphql",
  typeDefs,
  resolvers,
  context,
  playground = true,
}: ApplyGraphQLOptions) => {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    logger: {
      log: (err) => console.log(err),
    },
    directiveResolvers: undefined,
    schemaDirectives: undefined,
  });

  const router = new Router();

  router.post(path, async (ctx) => {
    const { response, request } = ctx;
    const contextResult = context ? await context(ctx) : undefined;
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
          undefined,
          undefined,
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

  if (playground) {
    router.get(path, async ({ request, response }) => {
      if (request.accepts("text/html")) {
        const playground = renderPlaygroundPage({
          endpoint: request.url.origin + path,
        });
        response.status = 200;
        response.body = playground;
      }
    });
  }

  app.use(router.routes());
  app.use(router.allowedMethods());
};
