import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CARD_MATERIALS, rgba, roundRect, type DrawCommand } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';

import { useT } from '../../../i18n/i18n-provider';
import { useAppearance } from '../../../screens/registry/support/forced-variant';
import { BOUNCE_CURVE } from '../../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { FINISHES } from '../catalogue';
import type { Look } from '../look';

import { STAGE, StagePill } from './stage-parts';
import { STUDIO_CARD, StudioCard } from './studio-card';

/** The lit paper of the stage, from the light at its top to its far corners. */
const LIGHT = {
  light: ['#FFFDF9', '#EFE9DF', '#E2D9CB'],
  dark: ['#3B352F', '#2A2622', '#1F1C19'],
} as const;
const HINT = { light: 'rgba(28,26,23,0.5)', dark: 'rgba(243,238,230,0.5)' } as const;
/**
 * Room the card leaves on the stage: its labels above, with a little air under them, and the
 * same again below for its hint or the one chip that takes the hint's place.
 */
const AROUND_CARD = 104;

interface Pop {
  readonly ms: number;
  readonly at: readonly number[];
  readonly wide: readonly number[];
  readonly tall: readonly number[];
  readonly turn: readonly number[];
}

/**
 * How the card lands when it changes, as the board scripts each material: jelly wobbles, chrome
 * snaps in, velvet settles without a bounce, and paper, foil, glass and riso arrive a little
 * turned. A new ink is a plain pop.
 */
const POPS = {
  jelly: {
    ms: 760,
    at: [0, 0.2, 0.42, 0.64, 1],
    wide: [1, 1.12, 0.92, 1.04, 1],
    tall: [1, 0.86, 1.1, 0.97, 1],
    turn: [0, 0, 0, 0, 0],
  },
  flock: { ms: 560, at: [0, 1], wide: [0.97, 1], tall: [0.97, 1], turn: [0, 0] },
  chrome: {
    ms: 560,
    at: [0, 0.4, 1],
    wide: [0.94, 1.03, 1],
    tall: [0.94, 1.03, 1],
    turn: [0, 0, 0],
  },
  card: { ms: 560, at: [0, 0.45, 1], wide: [0.9, 1.05, 1], tall: [0.9, 1.05, 1], turn: [-2, 1, 0] },
  ink: { ms: 520, at: [0, 0.45, 1], wide: [0.92, 1.05, 1], tall: [0.92, 1.05, 1], turn: [0, 0, 0] },
} as const satisfies Record<string, Pop>;

function popOf(finish: CardFinish): Pop {
  return finish === 'jelly' || finish === 'flock' || finish === 'chrome' ? POPS[finish] : POPS.card;
}

export interface FinishStageProps {
  /** What the card wears on the stage: the finish in focus, in the ink and trail tried on. */
  readonly look: Look;
  readonly number: number | null;
  /** True when the finish in focus is the one worn; otherwise it is only tried on. */
  readonly wearing: boolean;
  readonly size: { readonly width: number; readonly height: number };
  /** Something to press at the foot of the stage, in the hint's place. Unset, the hint is there. */
  readonly foot?: ReactNode;
}

/**
 * The finish, on the thing it is: one card on a lit stage, leaning with the phone and under a
 * finger so foil, chrome and velvet catch the light as they will in the hand. Its corner says
 * whether it is worn or only tried on, and which finish it is.
 */
export function FinishStage({ look, number, wearing, size, foot }: FinishStageProps) {
  const t = useT();
  const { reducedMotion } = useScreenStyle();
  const appearance = useAppearance();
  const material = CARD_MATERIALS[look.finish];

  const light = useMemo((): DrawCommand[] => {
    const [lit, mid, far] = LIGHT[appearance];
    return [
      {
        op: 'paint',
        path: roundRect({ x: 0, y: 0, w: size.width, h: size.height }, STAGE.radius),
        paint: {
          kind: 'radial',
          centre: [size.width / 2, size.height * 0.18],
          radius: size.height * 0.95,
          stops: [
            [0, lit, 1],
            [0.62, mid, 1],
            [1, far, 1],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
    ];
  }, [appearance, size.width, size.height]);

  // The card lands again whenever its finish or its ink changes, never when it first appears.
  const landing = useSharedValue(1);
  const keys = useSharedValue<Pop>(POPS.card);
  const finishNow = look.finish;
  const inkNow = look.ink;
  const before = useRef({ finish: finishNow, ink: inkNow });
  useEffect(() => {
    const was = before.current;
    if (was.finish === finishNow && was.ink === inkNow) return;
    before.current = { finish: finishNow, ink: inkNow };
    if (reducedMotion) return;
    const pop = was.finish === finishNow ? POPS.ink : popOf(finishNow);
    keys.value = pop;
    landing.value = 0;
    landing.value = withTiming(1, { duration: pop.ms, easing: BOUNCE_CURVE });
  }, [finishNow, inkNow, reducedMotion, keys, landing]);

  const fit = Math.min(1, (size.height - AROUND_CARD) / STUDIO_CARD.height);
  const landed = useAnimatedStyle(() => {
    const pop = keys.value;
    const at = [...pop.at];
    return {
      transform: [
        { scaleX: fit * interpolate(landing.value, at, [...pop.wide], 'clamp') },
        { scaleY: fit * interpolate(landing.value, at, [...pop.tall], 'clamp') },
        { rotate: `${interpolate(landing.value, at, [...pop.turn], 'clamp')}deg` },
      ],
    };
  });

  const order = FINISHES.findIndex((finish) => finish.id === look.finish) + 1;
  return (
    <View testID="studio-preview" style={[styles.stage, size]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CommandCanvas commands={light} space={size} width={size.width} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { boxShadow: `0 0 90px 70px ${rgba(material.glow[0], material.glow[1])}` },
        ]}
      />
      <View pointerEvents="none" style={styles.floor} />
      <Animated.View style={landed}>
        <StudioCard look={look} number={number} handled />
      </Animated.View>
      <StagePill
        side="leading"
        tone={wearing ? 'paper' : 'accent'}
        label={wearing ? t('studio.wearingNow') : t('studio.tryingOn')}
        testID="studio-state"
      />
      <StagePill
        side="trailing"
        tone="paper"
        label={t('studio.stage.finish.number', { number: String(order).padStart(2, '0') })}
        testID="studio-finish-number"
      />
      {foot ? (
        <View style={styles.foot}>{foot}</View>
      ) : reducedMotion ? null : (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.hint, { color: HINT[appearance] }]}
        >
          {t('studio.stage.tilt').toLocaleUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: STAGE.radius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '46%',
    width: 120,
    height: 120,
    marginTop: -60,
    borderRadius: 60,
  },
  floor: {
    position: 'absolute',
    bottom: 48,
    width: 170,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(28,26,23,0.28)',
    boxShadow: '0 0 18px 10px rgba(28,26,23,0.2)',
  },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center' },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    textAlign: 'center',
    fontFamily: STAMPED,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 1.4,
  },
});
