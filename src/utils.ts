import { Context, sign as makeJwt } from "./mods";
import { Author } from "./model/author";

export function set_jwt_cookies(author: Author, ctx: Context) {
  const exp: number = 24 * 60 * 60 * 1000; // 1 day
  const jwt = makeJwt(
    {
      sub: author.id,
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
      },
    },
    process.env.SECRET!,
    {
      expiresIn: exp / 1000,
    }
  );

  const jwt_parts = jwt.split(".");
  const header_payload = jwt_parts.slice(0, 2).join(".");
  const signature = jwt_parts[2];
  ctx.cookies.set("jwt.header.payload", header_payload, {
    maxAge: exp,
    httpOnly: false,
    sameSite: "strict",
  });
  ctx.cookies.set("jwt.signature", signature, {
    maxAge: exp,
    httpOnly: true,
    sameSite: "strict",
  });

  return jwt;
}

export function mapObjectsByProp<T>(
  objs: T[],
  key: string,
  fn?: (arg: T) => T
): { [key: string]: T } {
  const map: { [key: string]: T } = {};
  objs.forEach((obj: any) => {
    obj = typeof fn !== "undefined" ? fn(obj) : obj;
    map[obj[key]] = obj;
  });
  return map;
}

export function aggObjectsByProp<T>(
  objs: T[],
  key: string,
  fn?: (arg: T) => T
): { [key: string]: T[] } {
  const map: { [key: string]: T[] } = {};
  objs.forEach((obj: any) => {
    obj = typeof fn !== "undefined" ? fn(obj) : obj;
    const arr: T[] = map[obj[key]] ?? (map[obj[key]] = []);
    arr.push(obj);
  });
  return map;
}
