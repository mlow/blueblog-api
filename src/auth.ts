import { Application } from "https://deno.land/x/oak/mod.ts";
import { validateJwt } from "https://deno.land/x/djwt/validate.ts";
import { config } from "./main.ts";

export function applyAuth(app: Application) {
  app.use(async (ctx, next) => {
    const { request, cookies } = ctx;

    const auth = request.headers.get("Authorization");
    if (auth) {
      const auth_parts = auth.split(" ");
      if (auth_parts.length !== 2 || auth_parts[0] !== "Bearer") {
        throw new Error("Malformed authorization header.");
      }
      const token_parts = auth_parts[1].split(".");

      let full_jwt: string;
      if (token_parts.length == 2) {
        const signature = cookies.get("jwt.signature");
        if (!signature) {
          throw new Error("Malformed JWT.");
        }
        full_jwt = `${auth_parts[1]}.${signature}`;
      } else if (token_parts.length == 3) {
        full_jwt = auth_parts[1];
      } else {
        throw new Error("Malformed JWT.");
      }

      const validatedJwt = await validateJwt(full_jwt, config["SECRET"]);
      if (validatedJwt.isValid && validatedJwt?.payload?.sub) {
        ctx.author = await ctx.model.Author.byID(validatedJwt.payload.sub);
      } else {
        throw new Error("Invalid JWT.");
      }
    }

    await next();
  });
}
