import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { compose, Step } from "../src/compose";

type Ctx = { log: string[] };

describe("compose", () => {
  it("виконує кроки довкола терміналу в порядку цибулі", async () => {
    const a: Step<Ctx> = async (ctx, next) => {
      ctx.log.push("a:before");
      const result = await next();
      ctx.log.push("a:after");
      return result;
    };
    const b: Step<Ctx> = async (ctx, next) => {
      ctx.log.push("b:before");
      const result = await next();
      ctx.log.push("b:after");
      return result;
    };
    const ctx: Ctx = { log: [] };

    const result = await compose([a, b])(ctx, async (c) => {
      c.log.push("terminal");
      return 42;
    });

    expect(result).toBe(42);
    expect(ctx.log).toEqual([
      "a:before",
      "b:before",
      "terminal",
      "b:after",
      "a:after",
    ]);
  });

  it("порожній список кроків викликає термінал рівно раз із ctx", async () => {
    const ctx: Ctx = { log: [] };
    let calls = 0;
    const result = await compose<Ctx>([])(ctx, async (c) => {
      calls++;
      expect(c).toBe(ctx);
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("крок без next() коротко замикає — термінал не викликано", async () => {
    let terminalCalls = 0;
    const result = await compose<Ctx>([async () => "short"])(
      { log: [] },
      async () => {
        terminalCalls++;
        return "terminal";
      },
    );
    expect(result).toBe("short");
    expect(terminalCalls).toBe(0);
  });

  it("next() двічі в одному кроці відхиляється", async () => {
    const twice: Step<Ctx> = async (_ctx, next) => {
      await next();
      return next();
    };
    await expect(
      compose([twice])({ log: [] }, async () => "terminal"),
    ).rejects.toThrow(/multiple times/);
  });
});

describe("Dispatcher: обробник як термінальний крок композиції", () => {
  it("крок бачить ctx з handlerName і пропускає виклик далі через next()", async () => {
    const { dispatcher } = createApp();
    const seen: string[] = [];
    dispatcher.use(async (ctx, next) => {
      seen.push(ctx.handlerName);
      return next();
    });

    const out = await dispatcher.handle("GET", "/users/42");

    expect(out.status).toBe(200);
    expect(out.body).toMatch(/42/);
    expect(seen).toEqual(["userById"]);
  });

  it("крок, що не викликає next(), підміняє результат обробника", async () => {
    const { dispatcher } = createApp();
    dispatcher.use(async () => ({ short: true }));

    const out = await dispatcher.handle("GET", "/users/42");

    expect(out.status).toBe(200);
    expect(JSON.parse(out.body)).toEqual({ short: true });
  });
});
