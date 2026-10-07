import { memo, useEffect, useMemo, useState } from 'react';

import { boilFrame, buildMonster, type DrawCommand } from '@scootch/art';

import { FULL_HZ } from '../../../art/motion-plan';
import { CommandLayer } from '../../../art/skia-commands';
import { useMotionTicksWhile } from '../../../art/use-motion-ticks';

type Spec = Parameters<typeof buildMonster>[0];

/**
 * A monster's drawing, alive: it bobs, blinks and boils as the `Monster` component's does, for a
 * place that draws it inside a canvas of its own (a card, a tile). Held still, it is the rest
 * drawing. A small one is given a slower rate.
 */
function useLiveMonster(spec: Spec, alive: boolean, hz: number = FULL_HZ): readonly DrawCommand[] {
  const rest = useMemo(() => buildMonster(spec), [spec]);
  const [moved, setMoved] = useState<{ of: typeof rest; commands: DrawCommand[] } | null>(null);
  // Inside a canvas there is no navigation context to ask: `alive` already says whether the
  // screen is in view.
  useMotionTicksWhile(
    alive,
    true,
    (seconds) =>
      setMoved({
        of: rest,
        commands: buildMonster(spec, 1, { mood: 'idle', t: seconds, boil: boilFrame(seconds) }),
      }),
    hz,
  );
  useEffect(() => {
    if (!alive) setMoved(null);
  }, [alive]);
  return moved?.of === rest && alive ? moved.commands : rest;
}

export interface LiveMonsterLayerProps {
  readonly spec: Spec;
  /**
   * False holds it still in its rest drawing. The caller folds in whether its screen is focused:
   * this layer lives inside a canvas and cannot ask.
   */
  readonly alive: boolean;
  /** How often it is redrawn. A small one, as in a grid, is given a slower rate. */
  readonly hz?: number;
}

/**
 * The living monster as a layer for someone else's canvas, in the monster's own 200 by 200
 * space. It is its own component so that its redraws stay its own: the card or tile around it is
 * not rendered again each time it moves.
 */
export const LiveMonsterLayer = memo(function LiveMonsterLayer(props: LiveMonsterLayerProps) {
  return <CommandLayer commands={useLiveMonster(props.spec, props.alive, props.hz)} />;
});
