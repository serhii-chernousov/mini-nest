import { INJECTED_TOKENS } from "../tokens";
import { Token } from "../types";

export const Inject =
  (token: Token): ParameterDecorator =>
  (target, _key, index) => {
    const tokens = Reflect.getOwnMetadata(INJECTED_TOKENS, target) ?? [];
    tokens[index] = token;
    Reflect.defineMetadata(INJECTED_TOKENS, tokens, target);
  };
