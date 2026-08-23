import { CONTROLLER } from "../tokens";

export const Controller =
  (prefix = "/"): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(CONTROLLER, prefix, target);
  };
