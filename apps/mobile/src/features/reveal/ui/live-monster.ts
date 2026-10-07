import { useEffect, useMemo, useState } from 'react';

import { boilFrame, buildMonster, type DrawCommand } from '@scootch/art';

import { FULL_HZ } from '../../../art/motion-plan';
import { useMotionTicks } from '../../../art/use-motion-ticks';

type Spec = Parameters<typeof buildMonster>[0];

/**
 * A monster's drawing, alive: it bobs, blinks and boils as the `Monster` component's does, for a
 * place that draws it inside a canvas of its own (a card). Held still, it is the rest drawing.
 */
export function useLiveMonster(spec: Spec, alive: boolean): readonly DrawCommand[] {
  const rest = useMemo(() => buildMonster(spec), [spec]);
  const [moved, setMoved] = useState<{ of: typeof rest; commands: DrawCommand[] } | null>(null);
  useMotionTicks(
    alive,
    (seconds) =>
      setMoved({
        of: rest,
        commands: buildMonster(spec, 1, { mood: 'idle', t: seconds, boil: boilFrame(seconds) }),
      }),
    FULL_HZ,
  );
  useEffect(() => {
    if (!alive) setMoved(null);
  }, [alive]);
  return moved?.of === rest && alive ? moved.commands : rest;
}
