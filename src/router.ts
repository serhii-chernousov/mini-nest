import { Inject } from "./decorators/inject";
import { Injectable } from "./decorators/injectable";
import { CONTROLLER, CONTROLLERS, ROUTES } from "./tokens";
import { Ctor } from "./types";

interface CompiledRoute {
  httpMethod: "GET" | "POST";
  regex: RegExp;
  paramNames: string[];
  controller: Ctor;
  handlerName: string;
}

function joinPath(prefix: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
  if (normalizedPath === "/") return normalizedPrefix;
  if (normalizedPrefix === "/") return normalizedPath;
  return `${normalizedPrefix}${normalizedPath}`;
}

function compilePath(path: string) {
  const paramNames: string[] = [];
  const pattern = path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

@Injectable()
export class Router {
  private routes: CompiledRoute[] = [];

  constructor(@Inject(CONTROLLERS) private controllers: Ctor[]) {
    for (const controller of this.controllers) {
      this.registerRoutes(controller);
    }
  }

  private registerRoutes(controller: Ctor) {
    const prefix = Reflect.getMetadata(CONTROLLER, controller);
    const routes = Reflect.getOwnMetadata(ROUTES, controller.prototype);
    for (const route of routes) {
      const path = joinPath(prefix, route.path);
      const { regex, paramNames } = compilePath(path);
      this.routes.push({
        httpMethod: route.httpMethod,
        regex,
        paramNames,
        controller,
        handlerName: route.handlerName,
      });
    }
  }

  match(method: "GET" | "POST", url: string) {
    const pathname = new URL(url, process.env.URL_BASE ?? `http://localhost`)
      .pathname;

    for (const route of this.routes) {
      if (route.httpMethod !== method) continue;
      const match = pathname.match(route.regex);
      if (!match) continue;

      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        params[route.paramNames[i]] = match[i + 1];
      }
      return {
        controller: route.controller,
        handlerName: route.handlerName,
        params,
      };
    }
    return null;
  }
}
