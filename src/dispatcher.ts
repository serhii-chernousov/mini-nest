import { Container } from "./container";
import { Inject } from "./decorators/inject";
import { Injectable } from "./decorators/injectable";
import { ExceptionFilter } from "./filters/exception.filter";
import { Router } from "./router";
import { GUARDS, INTERCEPTORS, MIDDLEWARES, PARAMS } from "./tokens";
import {
  Ctor,
  ForbiddenError,
  GuardCtor,
  InterceptorCtor,
  MiddlewareCtor,
  NotFoundError,
  PipeCtor,
  RequestContext,
} from "./types";

const URL_BASE = process.env.URL_BASE ?? `http://localhost`;

@Injectable()
export class Dispatcher {
  constructor(
    private router: Router,
    private container: Container,
    private exceptionFilter: ExceptionFilter,
    @Inject(MIDDLEWARES) private middlewares: MiddlewareCtor[],
    @Inject(INTERCEPTORS) private interceptors: InterceptorCtor[],
  ) {}

  collectGuards(controller: Ctor, handlerName: string): GuardCtor[] {
    const classGuards = Reflect.getOwnMetadata(GUARDS, controller) ?? [];
    const methodGuards =
      Reflect.getOwnMetadata(GUARDS, controller.prototype, handlerName) ?? [];
    return [...classGuards, ...methodGuards];
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
  async handle(ctx: RequestContext) {
    try {
      for (const Middleware of this.middlewares) {
        const middleware = this.container.resolve(Middleware);
        await middleware.use(ctx);
      }
      const match = this.router.match(ctx.method as "GET" | "POST", ctx.url);
      if (!match) {
        throw new NotFoundError(`Cannot ${ctx.method} ${ctx.url}`);
      }

      const { controller, handlerName, params } = match;

      const context = { ...ctx, params };

      const guards = this.collectGuards(controller, handlerName);
      for (const Guard of guards) {
        const guard = this.container.resolve(Guard);
        const canActivate = await guard.canActivate(context);
        if (!canActivate) throw new ForbiddenError();
      }

      const invoke = async () => {
        const instance = this.container.resolve(controller);

        const args = await Promise.all(
          this.getArgs(
            controller,
            handlerName,
            context.params,
            context.url,
            context.body,
          ),
        );
        return (instance as any)[handlerName](...args);
      };

      const run = this.interceptors.reduceRight(
        (next, Interceptor) => () =>
          this.container.resolve(Interceptor).intercept(context, next),
        invoke,
      );

      const result = await run();
      return {
        status: context.method === "POST" ? 201 : 200,
        type: "application/json; charset=utf-8",
        body: JSON.stringify(result ?? {}),
      };
    } catch (error) {
      return this.exceptionFilter.catch(error);
    }
  }
}
