import { gql } from "../mods";
import { Edit, Context } from "../model/index";

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
`;

export const resolvers = {
  Edit: {
    content: (edit: Edit, args: any, { model }: Context) => {
      return model.BlogPost.byID(edit.content_id);
    },
  },
};
