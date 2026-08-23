export type Next = () => Promise<unknown>;
export type Step<C> = (ctx: C, next: Next) => Promise<unknown>;

export function compose<C>(steps: readonly Step<C>[]) {
  return (ctx: C, terminal: (ctx: C) => Promise<unknown>): Promise<unknown> => {
    let last = -1;
    const dispatch = async (i: number): Promise<unknown> => {
      if (i <= last) throw new Error("next() called multiple times");
      last = i;
      if (i === steps.length) return terminal(ctx);
      return steps[i](ctx, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
}
