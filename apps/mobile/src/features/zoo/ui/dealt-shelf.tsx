import { useEffect, useRef, useState, type ReactNode } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { mix, ramp } from '../../keep/keep-motion';
import type { ShelfSort } from '../binder';
import type { CaughtMonster } from '../zoo-cards';

/** The pockets go quickly and come back at their ease, row after row. */
const DEAL = {
  awayMs: 140,
  backMs: 620,
  rowLate: 0.09,
  rows: 5,
  rise: 16,
  fromScale: 0.94,
} as const;
const ALWAYS = ReduceMotion.Never;

export interface DealtShelf {
  /** The cards as they are drawn: in the order asked for, once the old order has gone. */
  readonly cards: readonly CaughtMonster[];
  /** The order those cards are in, which their pockets write a number for. */
  readonly sort: ShelfSort;
  /** 0 with the pockets gone, 1 with them back in their places. */
  readonly deal: SharedValue<number>;
}

/**
 * The shelf changing order. The pockets as they were sink away together, the cards are put in
 * the order that was asked for, and they come back row after row from the top, so a new order is
 * seen to be dealt and not swapped under the eye. Cards caught or looked at meanwhile, in the same
 * order, simply show. Where nothing may move the new order is there at once.
 */
export function useDealtShelf(
  cards: readonly CaughtMonster[],
  sort: ShelfSort,
  still: boolean,
): DealtShelf {
  const [drawn, setDrawn] = useState(sort);
  const deal = useSharedValue(1);
  // The cards as they were last drawn in the order that is still on the shelf.
  const before = useRef(cards);
  if (drawn === sort) before.current = cards;
  const asked = useRef(sort);
  asked.current = sort;

  useEffect(() => {
    if (drawn === sort) return;
    if (still) {
      setDrawn(sort);
      return;
    }
    const arrive = () => {
      setDrawn(asked.current);
      deal.value = withTiming(1, {
        duration: DEAL.backMs,
        easing: SPRING_CURVE,
        reduceMotion: ALWAYS,
      });
    };
    deal.value = withTiming(
      0,
      { duration: DEAL.awayMs, easing: Easing.in(Easing.quad), reduceMotion: ALWAYS },
      (done) => {
        if (done) scheduleOnRN(arrive);
      },
    );
  }, [sort, drawn, still, deal]);

  return { cards: drawn === sort ? cards : before.current, sort: drawn, deal };
}

/** One pocket of a shelf that is being dealt: it comes back with its row, a little after the last. */
export function Dealt({
  deal,
  row,
  children,
}: {
  readonly deal: SharedValue<number>;
  readonly row: number;
  readonly children: ReactNode;
}) {
  const late = Math.min(DEAL.rows, Math.max(0, row)) * DEAL.rowLate;
  const dealt = useAnimatedStyle(() => {
    const k = ramp(deal.value, late, late + 1 - DEAL.rows * DEAL.rowLate);
    return {
      opacity: k,
      transform: [{ translateY: mix(DEAL.rise, 0, k) }, { scale: mix(DEAL.fromScale, 1, k) }],
    };
  }, [late]);
  return <Animated.View style={dealt}>{children}</Animated.View>;
}
