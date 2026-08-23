import { compose, Step } from "./compose";
import { Container } from "./container";
import { Injectable } from "./decorators/injectable";
import { BadRequestError } from "./pipes/validation.pipe";
import { Router } from "./router";
import { PARAMS } from "./tokens";
import { Ctor, PipeCtor } from "./types";

const URL_BASE = process.env.URL_BASE ?? `http://localhost`;

export interface ExecutionContext {
  method: "GET" | "POST";
  url: string;
  body: unknown;
  params: Record<string, string>;
  controller: Ctor;
  handlerName: string;
}

@Injectable()
export class Dispatcher {
  private readonly steps: Step<ExecutionContext>[] = [];
  private readonly run = compose(this.steps);

  constructor(
    private router: Router,
    private container: Container,
  ) {}

  use(step: Step<ExecutionContext>): this {
    this.steps.push(step);
    return this;
  }

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

  private async invokeHandler(ctx: ExecutionContext): Promise<unknown> {
    const instance = this.container.resolve(ctx.controller) as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const args = await Promise.all(
      this.getArgs(
        ctx.controller,
        ctx.handlerName,
        ctx.params,
        ctx.url,
        ctx.body,
      ),
    );
    return instance[ctx.handlerName](...args);
  }

  async handle(method: "GET" | "POST", url: string, body?: unknown) {
    const match = this.router.match(method, url);
    if (!match)
      return {
        status: 404,
        type: "text/plain; charset=utf-8",
        body: "Not Found",
      };

    const ctx: ExecutionContext = { method, url, body, ...match };

    try {
      const result = await this.run(ctx, (c) => this.invokeHandler(c));
      return {
        status: method === "POST" ? 201 : 200,
        type: "application/json; charset=utf-8",
        body: JSON.stringify(result),
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
