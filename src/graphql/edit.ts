import { gql } from "../mods";
import { Edit, BlogPost, Type, Context, getTypeByUUID } from "../model/index";

export const typeDefs = gql`
  """
  A single change made to some Content.
  """
  type EditChange {
    "The segment of text that was changed."
    text: String!

    "Whether the text was added."
    added: Boolean

    "Whether the text was removed."
    removed: Boolean
  }

  """
  An edit containing the changes made to a Content to bring it from one
  state to another.
  """
  type Edit implements Node {
    id: ID!

    "The content this edit was made to."
    content: Content!

    "The date and time of this edit."
    date: DateTime!

    "The changes made to the content."
    changes: [EditChange!]!
  }

  extend type BlogPost {
    "All edits that have been made this blog post."
    edits: [Edit!]!
  }
`;

export const resolvers = {
  BlogPost: {
    edits: (post: BlogPost, args: any, { model }: Context) => {
      return model.Edit.allByContent(post.id);
    },
  },
  Edit: {
    content: async (edit: Edit, args: any, { model }: Context) => {
      const type = await getTypeByUUID(edit.content_id);
      switch (type) {
        case Type.BlogPost:
          return model.BlogPost.byID(edit.content_id);
      }
      throw new Error("Unknown content type.");
    },
  },
};
