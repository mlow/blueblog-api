import { Application, Context, validateJwt } from "./mods";
import { config } from "./main";

type Authentication = { loggedIn: true; id: string } | { loggedIn: false };

declare module "koa" {
  interface ExtendableContext {
    auth: Authentication;
  }
}

async function getAuthentication({
  request,
  cookies,
}: Context): Promise<Authentication> {
  const auth = request.headers.authorization;
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

  let validatedJwt;
  try {
    validatedJwt = validateJwt(full_jwt, config["SECRET"]) as any;
  } catch {
    throw new Error("Invalid JWT.");
  }

  return {
    loggedIn: true,
    id: validatedJwt.sub,
  };
}

export function applyAuth(app: Application) {
  app.use(async (ctx, next) => {
    ctx.auth = await getAuthentication(ctx);
    await next();
  });
}
