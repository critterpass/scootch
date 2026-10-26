import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { buildPhu, phuPose } from '@phusclass/art/class';

import { FigureCanvas } from '../../classroom/figure-canvas';
import { HAND_FAMILY, useHandFont } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The Splash board's timeline, in milliseconds. */
const AT = {
  write: 260,
  writeMs: 760,
  line: 980,
  lineMs: 420,
  rise: 1160,
  riseMs: 620,
  drums: [1820, 2080, 2340],
  drumMs: 620,
  fly: 2980,
  flyMs: 760,
  fadeMs: 900,
  end: 3900,
} as const;
/** Under Reduce Motion the card is simply there, then fades. */
const STILL_FADE_AT = 1600;
const STILL_FADE_MS = 300;
/** On a later launch the card is already written and flies at once. */
const QUICK_FLY_AT = 420;

const SPLASH_PAGE = '#F7F1E8';
const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 210;
const TITLE_WIDTH = 236;
const LINE_WIDTH = 188;
/** How far the card flies up, to where the chalkboard hangs in the room. */
const FLY_UP = -233;

const bezier = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);
const INTERFACE = bezier(0.32, 0.72, 0, 1);
const CHARACTER = bezier(0.34, 1.56, 0.64, 1);
const CAMERA = bezier(0.7, 0, 0.2, 1);
const WRITE = bezier(0.45, 0.05, 0.4, 1);

function Drum({ at, style, size, play }: DrumProps) {
  const shown = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    shown.set(
      withDelay(
        at,
        withSequence(
          withTiming(1, { duration: AT.drumMs * 0.35, easing: CHARACTER }),
          withTiming(1, { duration: AT.drumMs * 0.25 }),
          withTiming(2, { duration: AT.drumMs * 0.4 }),
        ),
      ),
    );
  }, [at, play, shown]);
  const animated = useAnimatedStyle(() => {
    const v = shown.get();
    return {
      opacity: v <= 1 ? v : 2 - v,
      transform: [
        { translateY: v > 1 ? -14 * (v - 1) : 0 },
        { scale: v <= 1 ? 0.4 + 0.75 * v : 1 },
        { rotate: style.rotate },
      ],
    };
  });
  return (
    <Animated.Text
      style={[styles.drum, { fontSize: size, left: style.left, top: style.top }, animated]}
    >
      Tùng!
    </Animated.Text>
  );
}

interface DrumProps {
  readonly at: number;
  readonly size: number;
  readonly play: boolean;
  readonly style: { readonly left: number; readonly top: number; readonly rotate: string };
}

function useBoardShake(play: boolean): SharedValue<number> {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    const once = () =>
      withSequence(
        withTiming(-4, { duration: 52 }),
        withTiming(3, { duration: 65 }),
        withTiming(-2, { duration: 65 }),
        withTiming(0, { duration: 78 }),
      );
    shake.set(
      withDelay(
        AT.drums[0],
        withSequence(
          once(),
          withDelay(AT.drums[1] - AT.drums[0] - 260, once()),
          withDelay(AT.drums[2] - AT.drums[1] - 260, once()),
        ),
      ),
    );
  }, [play, shake]);
  return shake;
}

export interface SplashProps {
  /** The full card on a first launch; a short flight on every launch after. */
  readonly quick: boolean;
  /** Called once the card has gone and the screen under it is in front. */
  readonly onDone?: () => void;
  /** For a capture: the card held, fully written, with nothing moving. */
  readonly held?: boolean;
}

/**
 * The animated splash, from the Splash board: "Phu's Class" written in chalk, the line under it,
 * Thầy Phú rising behind the board, three drum beats that shake it, then the card flies up to
 * where the chalkboard hangs in the room as the first scene shows through. Under Reduce Motion the
 * card is simply there, then fades. It takes no touch and VoiceOver hears one line.
 */
export function Splash({ quick, onDone, held = false }: SplashProps) {
  const t = useT();
  const { reducedMotion } = useScreenStyle();
  const hand = useHandFont();
  const clock = useSharedValue(0);
  const figure = useMemo(() => buildPhu(phuPose('calm')), []);
  const moving = !reducedMotion && !held;
  const full = moving && !quick;

  const written = useSharedValue(full ? 0 : 1);
  const line = useSharedValue(full ? 0 : 1);
  const rise = useSharedValue(full ? 0 : 1);
  const fly = useSharedValue(0);
  const page = useSharedValue(1);
  const shake = useBoardShake(full);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (held) return undefined;
    if (!moving) {
      page.set(withDelay(STILL_FADE_AT, withTiming(0, { duration: STILL_FADE_MS })));
      const timer = setTimeout(() => onDone?.(), STILL_FADE_AT + STILL_FADE_MS);
      return () => clearTimeout(timer);
    }
    const flyAt = quick ? QUICK_FLY_AT : AT.fly;
    if (!quick) {
      written.set(withDelay(AT.write, withTiming(1, { duration: AT.writeMs, easing: WRITE })));
      line.set(withDelay(AT.line, withTiming(1, { duration: AT.lineMs, easing: INTERFACE })));
      rise.set(withDelay(AT.rise, withTiming(1, { duration: AT.riseMs, easing: CHARACTER })));
    }
    fly.set(withDelay(flyAt, withTiming(1, { duration: AT.flyMs, easing: CAMERA })));
    page.set(withDelay(flyAt, withTiming(0, { duration: AT.fadeMs, easing: CAMERA })));
    const timer = setTimeout(() => onDone?.(), flyAt + AT.fadeMs + 40);
    return () => clearTimeout(timer);
  }, [held, moving, quick, onDone, written, line, rise, fly, page]);

  const pageStyle = useAnimatedStyle(() => ({ opacity: page.get() }));
  const stageStyle = useAnimatedStyle(() => {
    const f = fly.get();
    return {
      opacity: f < 0.4 ? 1 : 1 - (f - 0.4) / 0.6,
      transform: [{ translateY: FLY_UP * f }, { scale: 1 + 0.15 * f }],
    };
  });
  const boardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const titleStyle = useAnimatedStyle(() => ({ width: TITLE_WIDTH * written.get() }));
  const lineStyle = useAnimatedStyle(() => ({ width: LINE_WIDTH * line.get() }));
  const phuStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 96 * (1 - rise.get()) }] }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const left = (width - BOARD_WIDTH) / 2;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden={!held}
      importantForAccessibility={held ? 'yes' : 'no-hide-descendants'}
      accessible={held}
      accessibilityLabel={t('splash.label')}
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, styles.page, pageStyle]}
      testID="splash"
    >
      <Animated.View style={[styles.stage, stageStyle]}>
        <View style={[styles.anchor, { left }]}>
          <Animated.View style={[styles.phu, phuStyle]}>
            <FigureCanvas figure={figure} width={160} clock={clock} running={STILL} hand={hand} />
          </Animated.View>
          <Animated.View style={[styles.board, boardStyle]}>
            <View style={styles.green}>
              <View style={styles.stripe} />
              <View style={styles.titleRow}>
                <Animated.View style={[styles.titleClip, titleStyle]}>
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={styles.title}
                  >
                    {t('brand.name')}
                  </Text>
                </Animated.View>
              </View>
              <View style={styles.lineRow}>
                <Animated.View style={[styles.underline, lineStyle]} />
              </View>
            </View>
            <View style={styles.ledge} />
            <View style={styles.chalk} />
          </Animated.View>
          {full ? (
            <>
              <Drum
                at={AT.drums[0]}
                size={34}
                play
                style={{ left: -18, top: 156, rotate: '-10deg' }}
              />
              <Drum
                at={AT.drums[1]}
                size={34}
                play
                style={{ left: 214, top: 120, rotate: '8deg' }}
              />
              <Drum
                at={AT.drums[2]}
                size={42}
                play
                style={{ left: 102, top: 232, rotate: '-3deg' }}
              />
            </>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const STILL: ReadonlySet<string> = new Set();

const styles = StyleSheet.create({
  page: { backgroundColor: SPLASH_PAGE, zIndex: 10 },
  stage: { flex: 1 },
  anchor: { position: 'absolute', top: '25%', width: BOARD_WIDTH, height: BOARD_HEIGHT },
  phu: { position: 'absolute', left: (BOARD_WIDTH - 160) / 2, top: -84 },
  board: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    borderRadius: 28,
    padding: 10,
    backgroundColor: '#8A5A36',
    boxShadow: '0 18px 40px rgba(60,40,20,0.22)',
  },
  green: {
    flex: 1,
    borderRadius: 19,
    backgroundColor: '#2F6B56',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripe: {
    position: 'absolute',
    left: -30,
    top: 0,
    bottom: 0,
    width: 110,
    backgroundColor: '#357560',
    transform: [{ skewX: '-16deg' }],
  },
  titleRow: { width: TITLE_WIDTH, height: 58 },
  titleClip: { height: 58, overflow: 'hidden' },
  lineRow: { width: LINE_WIDTH, marginTop: 8 },
  title: {
    width: TITLE_WIDTH,
    fontFamily: HAND_FAMILY,
    fontSize: 46,
    lineHeight: 58,
    color: '#F4FAF6',
    textAlign: 'center',
  },
  underline: { height: 3.5, borderRadius: 2, backgroundColor: '#F7D774' },
  ledge: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: -10,
    height: 10,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#6E4528',
  },
  chalk: {
    position: 'absolute',
    left: 92,
    bottom: -6,
    width: 26,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  drum: {
    position: 'absolute',
    fontFamily: HAND_FAMILY,
    color: '#D42A24',
    textShadowColor: '#FFFFFF',
    textShadowRadius: 2,
    textShadowOffset: { width: 2, height: 2 },
  },
});
