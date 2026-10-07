import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import type { SessionInks } from '../ui/session-inks';

import { inOut, keyed, lerp, STAGE } from './math';
import type { Rig } from './rig';
import { put, type Sprite } from './sprite';

/** Where the binder sits, and the middle of it: what flies to it lands there. */
export const BINDER = { right: 22, width: 50, height: 62, top: 120 } as const;
export const BINDER_AT = [
  STAGE.width - BINDER.right - BINDER.width / 2,
  BINDER.top + BINDER.height / 2,
] as const;

/** The binder in the corner, with the count of what is in it once that is known. */
export function Binder({
  sprite,
  count,
  inks,
}: {
  readonly sprite: Sprite;
  readonly count: number | null;
  readonly inks: SessionInks;
}) {
  return (
    <Animated.View pointerEvents="none" style={[styles.at, styles.binder, sprite.style]}>
      <View style={[styles.binderBack, styles.fill]} />
      <View style={[styles.binderCover, styles.fill, { backgroundColor: inks.ink }]}>
        <View style={styles.binderPage} />
      </View>
      {count === null ? null : (
        <View style={[styles.count, { backgroundColor: inks.tomato, borderColor: inks.page }]}>
          <Animated.Text
            allowFontScaling={false}
            style={[styles.countText, { color: inks.onTomato }]}
          >
            {count}
          </Animated.Text>
        </View>
      )}
    </Animated.View>
  );
}

/** The binder's small jump as something lands in it. */
export function bumpBinder(rig: Rig, binder: Sprite): void {
  rig.tw(520, (k) =>
    put(binder, {
      s: keyed(k, [
        [0, 1.3],
        [0.5, 0.94],
        [1, 1],
      ]),
      r: keyed(k, [
        [0, -6],
        [0.5, 0],
        [1, 0],
      ]),
    }),
  );
}

/**
 * Flies something into the binder along an arc, shrinking as it goes. `place` is given the centre
 * it should be drawn at, how far through the flight it is, and its scale.
 */
export function flyToBinder(
  rig: Rig,
  from: readonly [number, number],
  place: (cx: number, cy: number, k: number, scale: number) => void,
  done: () => void,
  ms = 720,
  arc = 110,
  endScale = 0.1,
): void {
  rig.tw(
    ms,
    (k) => {
      const e = inOut(k);
      place(
        lerp(from[0], BINDER_AT[0], e),
        lerp(from[1], BINDER_AT[1], e) - Math.sin(k * Math.PI) * arc,
        k,
        lerp(1, endScale, e),
      );
    },
    null,
    done,
  );
}

const styles = StyleSheet.create({
  at: { position: 'absolute' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  binder: {
    right: BINDER.right,
    top: BINDER.top,
    width: BINDER.width,
    height: BINDER.height,
    zIndex: 5,
  },
  binderBack: { borderRadius: 8, backgroundColor: '#3A3430', transform: [{ rotate: '9deg' }] },
  binderCover: { borderRadius: 8, padding: 4 },
  binderPage: { flex: 1, borderRadius: 5, backgroundColor: '#F3E6D3' },
  count: {
    position: 'absolute',
    right: -10,
    bottom: -8,
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: fonts.body,
    fontWeight: '700',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
