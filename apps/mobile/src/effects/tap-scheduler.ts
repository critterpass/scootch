import type { HapticTap } from '@scootch/sound';

import type { HapticsPlayer, Timers } from './adapters';

/**
 * Plays a pattern's taps at their own times, and can take back the ones not yet played. A pattern
 * is played under a name; stopping that name cancels every tap of it still waiting, so a hold that
 * is let go falls silent in the hand at once instead of tapping on to its end.
 */
export function createTapScheduler(timers: Timers, fire: (tap: HapticTap) => void): HapticsPlayer {
  const waiting = new Map<string, Set<() => void>>();

  function stop(name: string) {
    for (const cancel of waiting.get(name) ?? []) cancel();
    waiting.delete(name);
  }

  return {
    play(taps, name = '') {
      // The same pattern played again starts over: its old taps do not run on beside the new.
      stop(name);
      const cancels = new Set<() => void>();
      waiting.set(name, cancels);
      for (const tap of taps) {
        const cancel = timers.set(tap.atMs, () => {
          cancels.delete(cancel);
          fire(tap);
        });
        cancels.add(cancel);
      }
    },
    stop,
  };
}
