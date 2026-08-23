export type Ctor<T = unknown> = new (...args: any[]) => T;
export type Token = symbol | Ctor | string;
export type InjectableScope = "singleton" | "transient";
export type PipeCtor = new (...args: unknown[]) => {
  transform: (
    value: unknown,
    metadata: ArgumentMetadata,
  ) => unknown | Promise<unknown>;
};

export interface ArgumentMetadata {
  type: "body" | "query" | "param";
  metatype?: Function;
  data?: string;
}
