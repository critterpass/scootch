/** How often a moving character is looked at again. Its loops are drawn as a few frames a second. */
export const TICK_HZ = 12;

export interface MotionRunner {
  /** Starts or stops the ticks. Stopped, nothing is scheduled and the time stands still. */
  setRunning(running: boolean): void;
  /** Stops for good. */
  dispose(): void;
}

/**
 * Calls `onTick` with the seconds of motion so far, a few times a second while running. The time
 * only counts while it runs, so a character picks up where it stopped. One timer at most.
 */
export function createMotionRunner(onTick: (seconds: number) => void, hz = TICK_HZ): MotionRunner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let played = 0;
  let since = 0;
  let disposed = false;

  const stop = (): void => {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
    played += (Date.now() - since) / 1000;
  };

  return {
    setRunning(running) {
      if (disposed || running === (timer !== null)) return;
      if (!running) {
        stop();
        return;
      }
      since = Date.now();
      timer = setInterval(() => onTick(played + (Date.now() - since) / 1000), 1000 / hz);
    },
    dispose() {
      stop();
      disposed = true;
    },
  };
}

/** Where a character learns whether it can be seen. Each `on…` returns its own unsubscribe. */
export interface VisibilitySource {
  /** True while the app is in the foreground. */
  readonly appActive: () => boolean;
  readonly onAppActiveChange: (listener: (active: boolean) => void) => () => void;
}

/**
 * Runs `runner` only while the screen is focused, the app is in the foreground and something
 * moves. Returns the handle the screen reports its focus to, and the way to let go of it all.
 */
export function runWhileVisible(
  runner: MotionRunner,
  source: VisibilitySource,
): { setFocused(focused: boolean): void; setMoving(moving: boolean): void; dispose(): void } {
  let focused = false;
  let moving = false;
  let active = source.appActive();
  const apply = (): void => runner.setRunning(focused && moving && active);
  const unsubscribe = source.onAppActiveChange((next) => {
    active = next;
    apply();
  });
  return {
    setFocused(next) {
      focused = next;
      apply();
    },
    setMoving(next) {
      moving = next;
      apply();
    },
    dispose() {
      unsubscribe();
      runner.dispose();
    },
  };
}

/**
 * Runs `jobs` a few at a time, leaving the thread free in between, then hands over every result.
 * Returns a cancel that leaves nothing scheduled and never calls `onDone`.
 */
export function runInSlices<T>(
  jobs: readonly (() => T)[],
  perSlice: number,
  onDone: (results: T[]) => void,
): () => void {
  const results: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const slice = (): void => {
    const end = Math.min(jobs.length, results.length + perSlice);
    for (const job of jobs.slice(results.length, end)) results.push(job());
    if (results.length < jobs.length) timer = setTimeout(slice, 0);
    else {
      timer = null;
      onDone(results);
    }
  };
  timer = setTimeout(slice, 0);
  return () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
