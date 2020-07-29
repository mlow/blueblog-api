import { mergeTypeDefs, mergeResolvers } from "../mods";

const modules = [
  require("./scalars"),
  require("./node"),
  require("./pagination"),
  require("./authenticate"),
  require("./author"),
  require("./content"),
  require("./edit"),
  require("./draft"),
  require("./blog_post"),
  require("./journal_entry"),
];

export const typeDefs = mergeTypeDefs(modules.map((mod) => mod.typeDefs));
export const resolvers = mergeResolvers(modules.map((mod) => mod.resolvers));
