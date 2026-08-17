import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Container } from "../src/container";
import { Inject } from "../src/decorators/inject";
import { Injectable } from "../src/decorators/injectable";

@Injectable()
class Logger {}

@Injectable()
class UserRepo {
  constructor(public logger: Logger) {}
}

describe("decorator metadata", () => {
  it("метадані на місці — інакше все інше безглузде", () => {
    expect(Reflect.getMetadata("design:paramtypes", UserRepo)).toEqual([
      Logger,
    ]);
  });
});

describe("Container", () => {
  it("transient дає різні обʼєкти, вкладений singleton — той самий", () => {
    @Injectable()
    class Config {}

    @Injectable()
    class Shared {
      constructor(public cfg: Config) {}
    }

    @Injectable({ scope: "transient" })
    class Service {
      constructor(public shared: Shared) {}
    }

    const container = new Container();
    const a = container.resolve(Service);
    const b = container.resolve(Service);

    expect(a).not.toBe(b);
    expect(a.shared).toBe(b.shared);
    expect(container.get(Config)).toBe(container.get(Config));
  });

  it("діамант A→B→D, A→C→D резолвиться і не вважається циклом", () => {
    @Injectable()
    class D {}

    @Injectable()
    class B {
      constructor(public d: D) {}
    }

    @Injectable()
    class C {
      constructor(public d: D) {}
    }

    @Injectable()
    class A {
      constructor(
        public b: B,
        public c: C,
      ) {}
    }

    const a = new Container().resolve(A);
    expect(a.b.d).toBe(a.c.d);
  });

  it("незареєстрований токен просить bind()", () => {
    const MISSING = Symbol("MISSING");

    @Injectable()
    class NeedsToken {
      constructor(@Inject(MISSING) public value: unknown) {}
    }

    expect(() => new Container().resolve(NeedsToken)).toThrow(
      /токен Symbol\(MISSING\) не зареєстрований — додай container\.bind\(\.\.\.\)/,
    );
  });

  it("примітив без @Inject просить токен, а не @Injectable() на Number", () => {
    @Injectable()
    class WithPort {
      constructor(public port: number) {}
    }

    expect(() => new Container().resolve(WithPort)).toThrow(
      /параметр #0 класу WithPort має тип Number — потрібен @Inject\(token\)/,
    );
  });

  it("інтерфейс без @Inject (Object у paramtypes) просить @Inject", () => {
    interface LoggerConfig {
      level: string;
    }

    @Injectable()
    class NeedsConfig {
      constructor(public config: LoggerConfig) {}
    }

    expect(() => new Container().resolve(NeedsConfig)).toThrow(
      /параметр #0 класу NeedsConfig має тип Object — потрібен @Inject\(token\)/,
    );
  });

  it("цикл залежностей серед transient", () => {
    @Injectable({ scope: "transient" })
    class Tx {
      constructor(public ty: unknown) {}
    }

    @Injectable({ scope: "transient" })
    class Ty {
      constructor(public tx: Tx) {}
    }

    Reflect.defineMetadata("design:paramtypes", [Ty], Tx);

    expect(() => new Container().resolve(Tx)).toThrow(
      /цикл залежностей: Tx -> Ty -> Tx/,
    );
  });

  it("два @Inject у одному конструкторі не затирають один одного", () => {
    const FIRST = Symbol("first");
    const SECOND = Symbol("second");

    @Injectable()
    class TwoTokens {
      constructor(
        @Inject(FIRST) public first: string,
        @Inject(SECOND) public second: string,
      ) {}
    }

    const container = new Container();
    container.bind(FIRST, "перший");
    container.bind(SECOND, "другий");
    const two = container.resolve(TwoTokens);

    expect(two.first).toBe("перший");
    expect(two.second).toBe("другий");
  });

  it("клас без @Injectable() відхиляється", () => {
    class Rogue {
      constructor(public logger: Logger) {}
    }

    expect(() => new Container().resolve(Rogue)).toThrow(
      /Rogue не позначений @Injectable\(\)/,
    );
  });

  it("нащадок без власного @Injectable() не бере метадані батька", () => {
    @Injectable()
    class Config {}

    @Injectable()
    class Parent {
      constructor(public cfg: Config) {}
    }

    class Child extends Parent {}

    expect(Reflect.getOwnMetadata("design:paramtypes", Child)).toBeUndefined();
    expect(() => new Container().resolve(Child)).toThrow(
      /Child не позначений @Injectable\(\)/,
    );
  });
});
