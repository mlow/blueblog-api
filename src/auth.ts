import { Application, Context, validateJwt } from "./mods.ts";
import { config } from "./main.ts";

type Authentication = { loggedIn: true; id: string } | { loggedIn: false };

declare module "./mods.ts" {
  interface Context {
    auth: Authentication;
  }
}

async function getAuthentication({
  request,
  cookies,
}: Context): Promise<Authentication> {
  const auth = request.headers.get("Authorization");
  if (!auth) {
    return { loggedIn: false };
  }

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
  if (!validatedJwt.isValid || !validatedJwt.payload?.sub) {
    throw new Error("Invalid JWT");
  }

  return {
    loggedIn: true,
    id: validatedJwt.payload.sub,
  };
}

export function applyAuth(app: Application) {
  app.use(async (ctx, next) => {
    ctx.auth = await getAuthentication(ctx);
    await next();
  });
}
