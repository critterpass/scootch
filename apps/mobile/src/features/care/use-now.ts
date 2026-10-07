import { useEffect, useState } from 'react';

import type { Clock } from '../../effects/adapters';

const HALF_A_MINUTE = 30_000;

/**
 * The time by a clock, read again every half minute, so a helpline that closes while its screen
 * is open is shown as closed without the screen being left.
 */
export function useNow(clock: Clock): number {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(clock.now()), HALF_A_MINUTE);
    return () => clearInterval(timer);
  }, [clock]);
  return now;
}
