import { beforeEach, describe, expect, it } from "vitest";
import { Container } from "../src/container";
import { Controller } from "../src/decorators/controller";
import { UseGuards } from "../src/decorators/guards";
import { Injectable } from "../src/decorators/injectable";
import { Get } from "../src/decorators/methods";
import { Query } from "../src/decorators/params";
import { Dispatcher } from "../src/dispatcher";
import { CONTROLLERS, INTERCEPTORS, MIDDLEWARES } from "../src/tokens";
import {
  ArgumentMetadata,
  Guard,
  Interceptor,
  Middleware,
  RequestContext,
} from "../src/types";

const steps: string[] = [];

@Injectable()
class TraceMiddleware implements Middleware {
  use() {
    steps.push("middleware");
  }
}

@Injectable()
class TraceGuard implements Guard {
  canActivate() {
    steps.push("guard");
    return true;
  }
}

@Injectable()
class DenyGuard implements Guard {
  canActivate() {
    steps.push("guard");
    return false;
  }
}

@Injectable()
class TraceInterceptor implements Interceptor {
  async intercept(_ctx: RequestContext, next: () => Promise<unknown>) {
    steps.push("interceptor:before");
    const result = await next();
    steps.push("interceptor:after");
    return result;
  }
}

@Injectable()
class TracePipe {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    steps.push("pipe");
    return value;
  }
}

@Injectable()
@Controller("probe")
class ProbeController {
  @Get()
  @UseGuards(TraceGuard)
  handle(@Query("q", TracePipe) q: string) {
    steps.push("handler");
    return { q };
  }

  @Get("deny")
  @UseGuards(DenyGuard)
  denied(@Query("q", TracePipe) q: string) {
    steps.push("handler");
    return { q };
  }
}

function createDispatcher() {
  const container = new Container();
  container.bind(Container, container);
  container.bind(CONTROLLERS, [ProbeController]);
  container.bind(MIDDLEWARES, [TraceMiddleware]);
  container.bind(INTERCEPTORS, [TraceInterceptor]);
  return container.resolve(Dispatcher);
}

describe("порядок життєвого циклу", () => {
  let dispatcher: Dispatcher;

  beforeEach(() => {
    steps.length = 0;
    dispatcher = createDispatcher();
  });

  it("викликає етапи у точному порядку", async () => {
    const out = await dispatcher.handle({
      method: "GET",
      url: "/probe?q=1",
      headers: {},
      params: {},
    });

    expect(out.status).toBe(200);
    expect(steps).toEqual([
      "middleware",
      "guard",
      "interceptor:before",
      "pipe",
      "handler",
      "interceptor:after",
    ]);
  });

  it("guard блокує handler, pipe і interceptor:after", async () => {
    const out = await dispatcher.handle({
      method: "GET",
      url: "/probe/deny?q=1",
      headers: {},
      params: {},
    });

    expect(out.status).toBe(403);
    expect(steps).toEqual(["middleware", "guard"]);
    expect(steps).not.toContain("handler");
  });
});
