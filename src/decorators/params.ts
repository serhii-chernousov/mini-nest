import { PARAMS } from "../tokens";
import { PipeCtor } from "../types";

type ParamType = "body" | "query" | "param";

const ParamDecorator =
  (type: ParamType, name?: string, pipes?: PipeCtor[]) =>
  (target: any, propertyKey: string | symbol, index: number) => {
    const params = Reflect.getOwnMetadata(PARAMS, target, propertyKey) ?? {};
    params[index] = { type, name, pipes };
    Reflect.defineMetadata(PARAMS, params, target, propertyKey);
  };

export const Body = (...pipes: PipeCtor[]) =>
  ParamDecorator("body", undefined, pipes);
export const Query = (name: string, ...pipes: PipeCtor[]) =>
  ParamDecorator("query", name, pipes);
export const Param = (name: string, ...pipes: PipeCtor[]) =>
  ParamDecorator("param", name, pipes);
