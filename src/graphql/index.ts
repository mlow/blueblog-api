import { Client } from "https://deno.land/x/postgres/mod.ts";
import { Payload } from "https://deno.land/x/djwt/create.ts";
import { Request, Response, Cookies } from "https://deno.land/x/oak/mod.ts";

import {
  mergeTypeDefs,
  mergeResolvers,
} from "../../vendor/graphql-tools/merge.js";

import {
  typeDefs as scalarTypes,
  resolvers as scalarResolvers,
} from "./scalars.ts";

import {
  typeDefs as nodeTypes,
  resolvers as nodeResolvers,
} from "./node.ts";

import {
  typeDefs as authTypes,
  resolvers as authResolvers,
} from "./authenticate.ts";

import {
  typeDefs as authorTypes,
  resolvers as authorResolvers,
} from "./author.ts";

import {
  typeDefs as postTypes,
  resolvers as postResolvers,
} from "./post.ts";

import {
  typeDefs as postEditTypes,
  resolvers as postEditResolvers,
} from "./postEdit.ts";

export interface Context {
  request: Request;
  response: Response;
  cookies: Cookies;
  db: Client;
  jwt?: Payload;
}

export const typeDefs = mergeTypeDefs([
  scalarTypes,
  nodeTypes,
  authTypes,

  authorTypes,
  postTypes,
  postEditTypes,
]);

export const resolvers = mergeResolvers([
  scalarResolvers,
  nodeResolvers,
  authResolvers,

  authorResolvers,
  postResolvers,
  postEditResolvers,
]);
