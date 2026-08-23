import { describe, expect, it } from "vitest";
import { Controller } from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Router } from "../src/router";

describe("Router: нормалізація таблиці", () => {
  it("контролер без @Get/@Post не валить старт і нічого не матчить", () => {
    @Controller("empty")
    class EmptyController {}

    const router = new Router([EmptyController]);
    expect(router.match("GET", "/empty")).toBeNull();
  });

  it("клас без @Controller дає зрозумілу помилку на старті", () => {
    class Bare {
      @Get()
      x() {}
    }

    expect(() => new Router([Bare])).toThrow(/@Controller/);
  });

  it("ігнорує зайві та кінцеві слеші у префіксі, шляху й запиті", () => {
    @Controller("users/")
    class UsersController {
      @Get()
      list() {}
      @Get("/:id")
      byId() {}
    }

    const router = new Router([UsersController]);
    for (const url of ["/users/42", "/users/42/", "/users//42"]) {
      expect(router.match("GET", url)).toMatchObject({
        handlerName: "byId",
        params: { id: "42" },
      });
    }
    for (const url of ["/users", "/users/"]) {
      expect(router.match("GET", url)).toMatchObject({ handlerName: "list" });
    }
  });

  it("подвійний слеш на початку не перетворює перший сегмент на host", () => {
    @Controller("users")
    class UsersController {
      @Get(":id")
      byId() {}
    }

    const router = new Router([UsersController]);
    expect(router.match("GET", "//users/42")).toMatchObject({
      handlerName: "byId",
      params: { id: "42" },
    });
  });
});

describe("Router: пріоритети", () => {
  it("статичний сегмент бʼє :param незалежно від порядку оголошення", () => {
    @Controller("shadow")
    class ShadowController {
      @Get(":id")
      byId() {}
      @Get("me")
      me() {}
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

  it("пріоритет працює між контролерами, не лише всередині одного", () => {
    @Controller("/")
    class RootController {
      @Get(":a/:b")
      ab() {}
    }
    @Controller("shadow")
    class ShadowController {
      @Get("me")
      me() {}
    }

    const router = new Router([RootController, ShadowController]);
    expect(router.match("GET", "/shadow/me")).toMatchObject({
      handlerName: "me",
    });
    expect(router.match("GET", "/x/y")).toMatchObject({
      handlerName: "ab",
      params: { a: "x", b: "y" },
    });
  });

  it("за однакової специфічності виграє порядок оголошення", () => {
    @Controller("x")
    class XController {
      @Get(":id")
      first() {}
      @Get(":other")
      second() {}
    }

    const router = new Router([XController]);
    expect(router.match("GET", "/x/1")).toMatchObject({
      handlerName: "first",
      params: { id: "1" },
    });
  });
});
