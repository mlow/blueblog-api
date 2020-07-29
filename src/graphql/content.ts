import { gql } from "../mods";
import { getTypeByUUID } from "../model/index";
import markdownIt from "markdown-it";

const enum ContentFormat {
  HTML = "HTML",
  MARKDOWN = "MARKDOWN",
}

export const typeDefs = gql`
  enum ContentFormat {
    HTML
    MARKDOWN
  }

  interface Content {
    title: String!
    content(format: ContentFormat): String!
  }
`;

const md = new markdownIt({
  linkify: true,
  typographer: true,
})
  .use(require("markdown-it-abbr"))
  .use(require("markdown-it-deflist"))
  .use(require("markdown-it-emoji"))
  .use(require("markdown-it-footnote"))
  .use(require("markdown-it-ins"))
  .use(require("markdown-it-mark"))
  .use(require("markdown-it-sub"))
  .use(require("markdown-it-sup"))
  .use(require("markdown-it-task-lists"));

export function resolveContent(format: string, markdown: string) {
  switch (format) {
    case ContentFormat.HTML:
      return md.render(markdown);
    case ContentFormat.MARKDOWN:
      return markdown;
    default:
      throw new Error(`Format "${format}" not unimplemented.`);
  }
}

export const resolver = {
  Content: {
    __resolveType: ({ id }: any) => {
      return getTypeByUUID(id);
    },
  },
};
