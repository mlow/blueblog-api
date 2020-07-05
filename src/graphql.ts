import {
  Application,
  Router,
  RouterContext,
  graphql,
  makeExecutableSchema,
} from "./mods";

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

    if (!request.is("application/json") || !request.body) {
      response.status = 415;
      response.body = {
        error: { message: "Request body must be in json format." },
      };
      return;
    }

    const contextResult = context ? await context(ctx) : ctx;
    const { query, variables, operationName } = request.body;

    try {
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
        operationName
      );

      response.body = result;
    } catch (error) {
      response.status = 500;
      response.body = {
        error: error.message,
      };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
};
