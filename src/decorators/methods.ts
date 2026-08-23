import { ROUTES } from "../tokens";

const Method =
  (httpMethod: "GET" | "POST", path: string = "/"): MethodDecorator =>
  (target, key, descriptor) => {
    const routes = Reflect.getOwnMetadata(ROUTES, target) ?? [];
    routes.push({ httpMethod, path, handlerName: key });
    Reflect.defineMetadata(ROUTES, routes, target);
  };

export const Get = (path: string = "/"): MethodDecorator => Method("GET", path);

export const Post = (path: string = "/"): MethodDecorator =>
  Method("POST", path);
