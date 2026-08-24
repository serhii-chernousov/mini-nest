import { Injectable } from "../decorators/injectable";
import { Interceptor, RequestContext } from "../types";

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(ctx: RequestContext, next: () => Promise<unknown>) {
    const start = performance.now();
    const result = await next();
    const ms = (performance.now() - start).toFixed(1);
    const path = new URL(ctx.url, "http://localhost").pathname;
    console.log(`${ctx.method} ${path} — ${ms} ms`);
    return result;
  }
}
