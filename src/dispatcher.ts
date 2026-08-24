import { Container } from "./container";
import { Injectable } from "./decorators/injectable";
import { BadRequestError } from "./pipes/validation.pipe";
import { Router } from "./router";
import { PARAMS } from "./tokens";
import { Ctor, PipeCtor } from "./types";

const URL_BASE = process.env.URL_BASE ?? `http://localhost`;

@Injectable()
export class Dispatcher {
  constructor(
    private router: Router,
    private container: Container,
  ) {}

  getArgs(
    controller: Ctor,
    handlerName: string,
    params: Record<string, string>,
    url: string,
    body: unknown,
  ) {
    const urlObj = new URL(url, URL_BASE);
    const meta = (Reflect.getOwnMetadata(
      PARAMS,
      controller.prototype,
      handlerName,
    ) ?? {}) as Record<
      number,
      { type: "param" | "query" | "body"; name?: string; pipes?: PipeCtor[] }
    >;
    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      controller.prototype,
      handlerName,
    );
    const maxIndex = Math.max(-1, ...Object.keys(meta).map(Number));
    return Array.from({ length: maxIndex + 1 }, async (_, i) => {
      const spec = meta[i];
      let value: unknown;
      if (!spec) return undefined;
      else if (spec.type === "param") value = params[spec.name!];
      else if (spec.type === "query")
        value = urlObj.searchParams.get(spec.name!) ?? undefined;
      else if (spec.type === "body") value = body;
      for (const Pipe of spec.pipes ?? []) {
        const pipe = this.container.resolve(Pipe);
        value = await pipe.transform(value, {
          type: spec.type,
          metatype: paramTypes?.[i],
          data: spec.name,
        });
      }
      return value;
    });
  }
  async handle(method: "GET" | "POST", url: string, body?: unknown) {
    const match = this.router.match(method, url);
    if (!match)
      return {
        status: 404,
        type: "text/plain; charset=utf-8",
        body: "Not Found",
      };

    const { controller, handlerName, params } = match;
    const invoke = async () => {
      const instance = this.container.resolve(controller);

      const args = await Promise.all(
        this.getArgs(controller, handlerName, params, url, body),
      );
      return (instance as any)[handlerName](...args);
    };

    try {
      const result = await invoke();
      return {
        status: method === "POST" ? 201 : 200,
        type: "application/json; charset=utf-8",
        body: JSON.stringify(result ?? {}),
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        return {
          status: 400,
          type: "application/json; charset=utf-8",
          body: JSON.stringify(error.errors),
        };
      }
      return {
        status: 500,
        type: "text/plain; charset=utf-8",
        body: "Internal Server Error",
      };
    }
  }
}
