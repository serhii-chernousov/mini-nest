export type Ctor<T = unknown> = new (...args: any[]) => T;
export type Token = symbol | Ctor | string;
export type InjectableScope = "singleton" | "transient";
export type PipeCtor = new (...args: unknown[]) => {
  transform: (
    value: unknown,
    metadata: ArgumentMetadata,
  ) => unknown | Promise<unknown>;
};

export interface ArgumentMetadata {
  type: "body" | "query" | "param";
  metatype?: Function;
  data?: string;
}

export interface RequestContext {
  method?: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  params: Record<string, string>;
}

export interface Guard {
  canActivate: (ctx: RequestContext) => boolean | Promise<boolean>;
}

export interface Middleware {
  use: (ctx: RequestContext) => void | Promise<void>;
}

export interface Interceptor {
  intercept: (
    ctx: RequestContext,
    next: () => Promise<unknown>,
  ) => Promise<unknown>;
}

export type GuardCtor = new (...args: unknown[]) => Guard;

export type MiddlewareCtor = new (...args: unknown[]) => Middleware;

export type InterceptorCtor = new (...args: unknown[]) => Interceptor;

export class HttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message = "Error",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends HttpException {
  constructor(message = "Not Found") {
    super(404, { statusCode: 404, message }, message);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message = "Forbidden") {
    super(403, { statusCode: 403, message }, message);
  }
}

export class BadRequestError extends HttpException {
  constructor(
    public readonly errors: { field: string; constraints: string[] }[],
  ) {
    super(400, errors, "Bad Request");
  }
}

export class PayloadTooLargeError extends HttpException {
  constructor() {
    super(
      413,
      { statusCode: 413, message: "Payload Too Large" },
      "Payload Too Large",
    );
  }
}
