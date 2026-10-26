/** Screens the first-day redirect leaves alone: the first day itself, and developer screens. */
const NOT_REDIRECTED: ReadonlySet<string> = new Set(['first-day', '(dev)']);

/**
 * Where launch sends a person: to the first day until it is done, from anywhere but the first day
 * itself and the developer screens; `null` to stay. Nothing moves before the answer is read.
 */
export function firstDayRedirect(input: {
  readonly loaded: boolean;
  readonly done: boolean;
  /** The first segment of the route on show, if any. */
  readonly top: string | undefined;
  readonly navigationReady: boolean;
}): '/first-day' | null {
  if (!input.loaded || input.done || !input.navigationReady) return null;
  if (input.top !== undefined && NOT_REDIRECTED.has(input.top)) return null;
  return '/first-day';
}
