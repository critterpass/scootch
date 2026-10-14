/** The switch's words. Developer screens and controls are written in English only. */
export const PRETEND_OFFLINE = {
  label: 'Pretend offline',
  hint: 'Developer tools: the app behaves as if the phone had no connection',
} as const;

let on = false;
const listeners = new Set<(on: boolean) => void>();

/**
 * Developer tools only. While on, the app behaves as it does with no network: the connection
 * reader says offline and every API call fails as a network error. It can only be turned on from
 * the developer row of Settings, which the store app does not show, and is forgotten when the app
 * closes. Device flows use it because a simulator cannot be taken offline.
 */
export const pretendOffline = {
  isOn: (): boolean => on,
  set: (next: boolean): void => {
    if (next === on) return;
    on = next;
    for (const listener of [...listeners]) listener(on);
  },
  /** Told each time the switch changes; returns the way to stop listening. */
  subscribe: (listener: (on: boolean) => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
