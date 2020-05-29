import { QueryConfig } from "https://deno.land/x/postgres/query.ts";

export function sql(
  strings: TemplateStringsArray,
  ...values: any[]
): QueryConfig {
  if (strings.length == 1) return { text: strings[0] };

  let query: string[] = [];
  let args: Array<unknown> = [];
  let argIndex = 1;
  for (let i = 0, len = strings.length; i < len; i++) {
    query.push(strings[i]);
    if (i < len - 1) {
      let val = values[i];
      if (val instanceof Array) {
        // When val is an array, add placeholders for each value to the
        // query with comma separation.
        query.push(val.map(() => "$" + argIndex++).join(","));
        args.push(...val);
      } else {
        query.push("$" + argIndex++);
        args.push(val);
      }
    }
  }
  return { text: query.join("").trim(), args: args };
}
