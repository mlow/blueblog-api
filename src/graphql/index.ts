import { mergeTypeDefs, mergeResolvers } from "../mods";

import {
  typeDefs as scalarTypes,
  resolvers as scalarResolvers,
} from "./scalars";

import { typeDefs as nodeTypes, resolvers as nodeResolvers } from "./node";

import {
  typeDefs as authTypes,
  resolvers as authResolvers,
} from "./authenticate";

import {
  typeDefs as authorTypes,
  resolvers as authorResolvers,
} from "./author";

import { typeDefs as postTypes, resolvers as postResolvers } from "./post";

import {
  typeDefs as postEditTypes,
  resolvers as postEditResolvers,
} from "./postEdit";

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
