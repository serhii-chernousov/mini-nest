export type Ctor<T = unknown> = new (...args: any[]) => T;
export type Token = symbol | Ctor | string;
export type InjectableScope = "singleton" | "transient";
