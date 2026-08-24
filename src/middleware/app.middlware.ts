import { Injectable } from "../decorators/injectable";
import { getRequestId } from "../context/request-context";
import { Middleware, RequestContext } from "../types";

@Injectable()
export class AppMiddleware implements Middleware {
  use(ctx: RequestContext) {
    console.log(`${ctx.method} ${ctx.url} requestId=${getRequestId()}`);
  }
}
