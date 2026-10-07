/** How often a moving character is looked at again unless it asks for another rate. */
export const TICK_HZ = 24;

export interface MotionRunner {
  /** Starts or stops the ticks. Stopped, nothing is scheduled and the time stands still. */
  setRunning(running: boolean): void;
  /** Changes how often it ticks, without losing its place in time. */
  setRate(hz: number): void;
  /** Stops for good. */
  dispose(): void;
}

/**
 * Calls `onTick` with the seconds of motion so far, `hz` times a second while running. The time
 * only counts while it runs, so a character picks up where it stopped. One timer at most.
 */
export function createMotionRunner(onTick: (seconds: number) => void, hz = TICK_HZ): MotionRunner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let played = 0;
  let since = 0;
  let rate = hz;
  let disposed = false;

  const stop = (): void => {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
    played += (Date.now() - since) / 1000;
  };
  const start = (): void => {
    since = Date.now();
    timer = setInterval(() => onTick(played + (Date.now() - since) / 1000), 1000 / rate);
  };

  return {
    setRunning(running) {
      if (disposed || running === (timer !== null)) return;
      if (running) start();
      else stop();
    },
    setRate(next) {
      if (disposed || next === rate || !(next > 0)) return;
      rate = next;
      if (timer === null) return;
      stop();
      start();
    },
    dispose() {
      stop();
      disposed = true;
    },
  };
}

/** Where a character learns whether it can be seen. Each `on…` returns its own unsubscribe. */
export interface VisibilitySource {
  /** True while the app is on the screen, a system alert or sheet over it included. */
  readonly appActive: () => boolean;
  readonly onAppActiveChange: (listener: (active: boolean) => void) => () => void;
}

/**
 * The app counts as on the screen in every state but the background. Under a system alert, a
 * permission prompt or an Apple sheet iOS reports `inactive` while the app is still in view, and
 * the first read at launch can be that or nothing at all; a character must not freeze for those.
 */
export function shownInAppState(state: string | null | undefined): boolean {
  return state !== 'background';
}

/**
 * Runs `runner` only while the screen is focused, the app is on the screen and something moves.
 * Returns the handle the screen reports its focus to, and the way to let go of it all.
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
