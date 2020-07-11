import { Transaction } from "knex";
import { EditModel } from "./edit";
import { diffWords } from "../mods";

export function insertContentEdit(
  trx: Transaction,
  model: EditModel,
  content_id: string,
  old_content: string,
  new_content: string
) {
  if (old_content === new_content) {
    return;
  }
  const changes = diffWords(old_content, new_content, undefined).map(
    ({ value, count, ...rest }: any) => ({
      text: value,
      ...rest,
    })
  );
  return model.create(
    {
      content_id: content_id,
      date: new Date(),
      changes,
    },
    trx
  );
}
