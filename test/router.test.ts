import { describe, expect, it } from "vitest";
import { Controller } from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Router } from "../src/router";

describe("Router", () => {
  it("контролер без @Get/@Post не валить старт", () => {
    @Controller("empty")
    class EmptyController {}

    expect(() => new Router([EmptyController])).not.toThrow();
    expect(new Router([EmptyController]).match("GET", "/empty")).toBeNull();
  });

  it("статичний сегмент виграє в /:id навіть якщо оголошений пізніше", () => {
    @Controller("shadow")
    class ShadowController {
      @Get("/:id")
      byId() {
        return { kind: "param" };
      }

      @Get("/me")
      me() {
        return { kind: "static" };
      }
    }

    const router = new Router([ShadowController]);

    expect(router.match("GET", "/shadow/me")).toMatchObject({
      handlerName: "me",
      params: {},
    });
    expect(router.match("GET", "/shadow/42")).toMatchObject({
      handlerName: "byId",
      params: { id: "42" },
    });
  });
});
