import { useCallback, useEffect, useState } from 'react';

import { usePlusRuntime } from '../../state/plus-context';

/** The weeks whose record was kept, as stored. Anything unreadable is no weeks. */
export function keptWeeksFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((week) => typeof week === 'string') : [];
}

/** Adds a week to the kept ones. A kept week is never taken off the shelf again. */
export function withKept(weeks: readonly string[], week: string): string[] {
  return weeks.includes(week) ? [...weeks] : [...weeks, week].sort();
}

/** The record shelf's weeks. Keeping needs Plus; what was kept stays whatever happens to Plus. */
export function useKeptWeeks(): {
  readonly weeks: readonly string[];
  readonly keep: (week: string) => void;
} {
  const { memory } = usePlusRuntime();
  const [weeks, setWeeks] = useState<readonly string[]>([]);
  useEffect(() => {
    let current = true;
    void memory
      .read('keptWeeks')
      .then((stored) => {
        if (current) setWeeks(keptWeeksFrom(stored));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [memory]);
  const keep = useCallback(
    (week: string) => {
      setWeeks((before) => {
        const next = withKept(before, week);
        void memory.write('keptWeeks', next).catch(() => undefined);
        return next;
      });
    },
    [memory],
  );
  return { weeks, keep };
}
