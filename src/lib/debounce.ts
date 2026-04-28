export type Cancelable<TargetFn extends (...args: any[]) => void> = TargetFn & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<TargetFn extends (...args: any[]) => void>(
  target: TargetFn,
  waitMs: number,
): Cancelable<TargetFn> {
  let timerHandle: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<TargetFn> | null = null;

  const wrapped = ((...args: Parameters<TargetFn>) => {
    pendingArgs = args;
    if (timerHandle !== null) clearTimeout(timerHandle);
    timerHandle = setTimeout(() => {
      timerHandle = null;
      const argsToInvoke = pendingArgs;
      pendingArgs = null;
      if (argsToInvoke) target(...argsToInvoke);
    }, waitMs);
  }) as Cancelable<TargetFn>;

  wrapped.cancel = () => {
    if (timerHandle !== null) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
    pendingArgs = null;
  };

  wrapped.flush = () => {
    if (timerHandle !== null && pendingArgs) {
      clearTimeout(timerHandle);
      timerHandle = null;
      const argsToInvoke = pendingArgs;
      pendingArgs = null;
      target(...argsToInvoke);
    }
  };

  return wrapped;
}
