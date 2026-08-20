export function randomBetween(min: number, max: number, rng = Math.random): number {
  if (max <= min) return min;
  return min + rng() * (max - min);
}

export function delayMs(range: { min: number; max: number }, rng = Math.random): number {
  return randomBetween(range.min, range.max, rng);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: any = null;
  return function debounced(this: any, ...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(
      () => {
        timer = null;
        fn.apply(this, args);
      },
      Math.max(0, delayMs)
    );
  };
}

export interface SleepOptions {
  signal?: AbortSignal;
  rng?: () => number;
  jitter?: boolean;
}

export function sleep(
  ms: number,
  { signal, rng = Math.random, jitter = false }: SleepOptions = {}
): Promise<boolean> {
  return new Promise(resolve => {
    if (signal?.aborted) return resolve(false);
    const duration = jitter
      ? Math.max(0, Math.floor(ms * (0.9 + rng() * 0.2)))
      : Math.max(0, Math.floor(ms));

    let timer: any = null;
    const cleanup = () => {
      if (typeof signal?.removeEventListener === 'function') {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(true);
    }, duration);

    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    }
  });
}
