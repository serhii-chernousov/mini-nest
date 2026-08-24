import { GUARDS } from "../tokens";
import { GuardCtor } from "../types";

export const UseGuards =
  (...guards: GuardCtor[]): ClassDecorator & MethodDecorator =>
  (target: object, propertyKey?: string | symbol) => {
    if (propertyKey === undefined) {
      const existingGuards = Reflect.getOwnMetadata(GUARDS, target) ?? [];
      Reflect.defineMetadata(GUARDS, [...existingGuards, ...guards], target);
      return;
    }
    const existingGuards =
      Reflect.getOwnMetadata(GUARDS, target, propertyKey) ?? [];
    Reflect.defineMetadata(
      GUARDS,
      [...existingGuards, ...guards],
      target,
      propertyKey,
    );
  };
