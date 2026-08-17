import { INJECTABLE, INJECTED_TOKENS } from "./tokens";
import { Ctor, Token } from "./types";

const NEEDS_INJECT = new Set<unknown>([
  Object,
  Number,
  String,
  Boolean,
  Symbol,
]);

export class Container {
  private singletons = new Map<Ctor, unknown>();
  private values = new Map<Token, unknown>();

  bind<T>(token: Token, value: T): void {
    this.values.set(token, value);
  }

  get(token: Token, path: string[] = []): unknown {
    if (this.values.has(token)) return this.values.get(token);
    if (typeof token === "function") return this.resolve(token as Ctor, path);
    throw new Error(
      `токен ${String(token)} не зареєстрований — додай container.bind(...)`,
    );
  }

  resolve<T>(target: Ctor<T>, path: string[] = []): T {
    const injectable = Reflect.getOwnMetadata(INJECTABLE, target);
    if (!injectable) {
      throw new Error(`${target.name} не позначений @Injectable()`);
    }

    const isSingleton = injectable.scope === "singleton";
    if (isSingleton && this.singletons.has(target)) {
      return this.singletons.get(target) as T;
    }

    if (path.includes(target.name)) {
      throw new Error(
        `цикл залежностей: ${[...path, target.name].join(" -> ")}`,
      );
    }

    const deps = (Reflect.getOwnMetadata("design:paramtypes", target) ??
      []) as Token[];
    const injectedTokens =
      Reflect.getOwnMetadata(INJECTED_TOKENS, target) ?? [];

    const args = deps.map((type, index) => {
      const injected = injectedTokens[index];
      if (injected === undefined && NEEDS_INJECT.has(type)) {
        const typeName = typeof type === "function" ? type.name : String(type);
        throw new Error(
          `параметр #${index} класу ${target.name} має тип ${typeName} — потрібен @Inject(token)`,
        );
      }
      return this.get(injected ?? type, [...path, target.name]);
    });

    const instance = new target(...args);
    if (isSingleton) this.singletons.set(target, instance);
    return instance;
  }
}
