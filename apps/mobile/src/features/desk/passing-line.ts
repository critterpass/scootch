import { useEffect, useState, useSyncExternalStore } from 'react';

import type { PhuMood } from '@phusclass/art/class';

/**
 * A line he says in passing, over whatever the desk or the period would have him say: his answer
 * to what was just handed in, a short tap, a slip handed in, a raised hand. It outlives a change
 * of screen, so "Next." said at the finish is still on the desk when it comes back.
 */
export interface PassingLine {
  readonly text: string;
  readonly mood: PhuMood | null;
  readonly until: number;
}

let current: PassingLine | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** He says `text` for `ms`, in `mood` when one is given. */
export function sayInPassing(text: string, ms = 2600, mood: PhuMood | null = null): void {
  current = { text, mood, until: Date.now() + ms };
  emit();
  setTimeout(() => {
    if (current !== null && Date.now() >= current.until) {
      current = null;
      emit();
    }
  }, ms + 20);
}

/** Forgets the line at once (a new screen state takes over). */
export function clearPassing(): void {
  if (current === null) return;
  current = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The line said in passing, while it lasts. */
export function usePassingLine(): PassingLine | null {
  const line = useSyncExternalStore(subscribe, () => current);
  const [, setNow] = useState(0);
  useEffect(() => {
    if (line === null) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, line.until - Date.now()));
    return () => clearTimeout(timer);
  }, [line]);
  return line !== null && Date.now() < line.until ? line : null;
}
