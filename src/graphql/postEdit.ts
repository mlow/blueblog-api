import { gql } from "../mods";
import { PostEdit, Context } from "../model/index";

export const typeDefs = gql`
  """
  A change made to a post.
  """
  type PostEditChange {
    "A segment of text."
    text: String!

    "Whether the text was added."
    added: Boolean

    "Whether the text was removed."
    removed: Boolean
  }

  """
  An edit made to a post.
  """
  type PostEdit implements Node {
    id: ID!

    "The post this edit was made to."
    post: Post!

    "The date/time of this edit."
    date: DateTime!

    "The changes made to the post."
    changes: [PostEditChange!]!
  }
`;

export const resolvers = {
  PostEdit: {
    post: (edit: PostEdit, args: any, { model }: Context) => {
      return model.Post.byID(edit.post_id);
    },
  },
};
