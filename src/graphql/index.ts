import { mergeTypeDefs, mergeResolvers } from "../mods";

import { typeDefs as paginationTypes } from "./pagination";
import {
  typeDefs as contentTypes,
  resolver as contentResolver,
} from "./content";

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

import { typeDefs as editTypes, resolvers as editResolvers } from "./edit";
import { typeDefs as draftTypes, resolvers as draftResolvers } from "./draft";

import {
  typeDefs as blogPostTypes,
  resolvers as blogPostResolvers,
} from "./blog_post";

import {
  typeDefs as journalEntryTypes,
  resolvers as journalEntryResolvers,
} from "./journal_entry";

export const typeDefs = mergeTypeDefs([
  paginationTypes,
  scalarTypes,
  nodeTypes,
  authTypes,
  contentTypes,

  authorTypes,
  editTypes,
  draftTypes,
  blogPostTypes,
  journalEntryTypes,
]);

export const resolvers = mergeResolvers([
  scalarResolvers,
  nodeResolvers,
  authResolvers,
  contentResolver,

  authorResolvers,
  editResolvers,
  draftResolvers,
  blogPostResolvers,
  journalEntryResolvers,
]);
