import { useEffect } from 'react';

import { setPeriodLine } from '../surfaces/surface-inputs';

/**
 * The period's line on the Lock Screen and the Dynamic Island. The Live Activity itself (the task,
 * the time left, his pacing, and on the desk his face at the pressure and the fuse) follows the
 * board store from `features/surfaces`; the session screen only hands it what he is saying.
 */
export function useLivePeriod(
  period: { readonly id: string; readonly taskId: string; readonly endsAt: number } | null,
  _title: string,
  line: string,
): void {
  const live = period !== null;
  useEffect(() => {
    setPeriodLine(live ? line : '');
  }, [live, line]);
  useEffect(() => () => setPeriodLine(''), []);
}
