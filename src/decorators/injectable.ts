import { INJECTABLE } from "../tokens";
import { InjectableScope } from "../types";

export const Injectable =
  ({ scope = "singleton" }: { scope?: InjectableScope } = {}): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(INJECTABLE, { scope }, target);
  };
