import { Inject } from "./decorators/inject";
import { Injectable } from "./decorators/injectable";
import { CONTROLLER, CONTROLLERS, ROUTES } from "./tokens";
import { Ctor } from "./types";

type Segment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string };

interface CompiledRoute {
  httpMethod: "GET" | "POST";
  segments: Segment[];
  specificity: string;
  controller: Ctor;
  handlerName: string;
}

const splitPath = (path: string) => path.split("/").filter(Boolean);

function compileSegments(prefix: string, path: string): Segment[] {
  return [...splitPath(prefix), ...splitPath(path)].map((segment) =>
    segment.startsWith(":")
      ? { kind: "param", name: segment.slice(1) }
      : { kind: "static", value: segment },
  );
}

const byStaticFirst = (a: CompiledRoute, b: CompiledRoute) =>
  a.specificity < b.specificity ? -1 : a.specificity > b.specificity ? 1 : 0;

@Injectable()
export class Router {
  private routes: CompiledRoute[] = [];

  constructor(@Inject(CONTROLLERS) private controllers: Ctor[]) {
    for (const controller of this.controllers) {
      this.registerRoutes(controller);
    }
    this.routes.sort(byStaticFirst);
  }

  private registerRoutes(controller: Ctor) {
    const prefix = Reflect.getMetadata(CONTROLLER, controller);
    if (prefix === undefined) {
      throw new Error(`${controller.name} не позначений @Controller()`);
    }
    const routes = Reflect.getOwnMetadata(ROUTES, controller.prototype) ?? [];
    for (const route of routes) {
      const segments = compileSegments(prefix, route.path);
      this.routes.push({
        httpMethod: route.httpMethod,
        segments,
        specificity: segments
          .map((s) => (s.kind === "static" ? "0" : "1"))
          .join(""),
        controller,
        handlerName: route.handlerName,
      });
    }
  }

  match(method: "GET" | "POST", url: string) {
    const pathname = new URL(
      url.replace(/^\/{2,}/, "/"),
      process.env.URL_BASE ?? `http://localhost`,
    ).pathname;
    const parts = splitPath(pathname);

    for (const route of this.routes) {
      if (route.httpMethod !== method) continue;
      if (route.segments.length !== parts.length) continue;

      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i++) {
        const segment = route.segments[i];
        if (segment.kind === "static") {
          if (segment.value !== parts[i]) {
            matched = false;
            break;
          }
        } else {
          params[segment.name] = parts[i];
        }
      }
      if (!matched) continue;

      return {
        controller: route.controller,
        handlerName: route.handlerName,
        params,
      };
    }
    return null;
  }
}
