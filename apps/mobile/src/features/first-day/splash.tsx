import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { buildPhu, phuPose } from '@phusclass/art/class';

import { FigureCanvas } from '../../classroom/figure-canvas';
import { HAND_FAMILY, useHandFont } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { AT, Drum, shakeStyle, SPLASH_CURVES, startLanding, useBoardShake } from './splash-motion';

/** Under Reduce Motion the card is simply there, then fades. */
const STILL_FADE_AT = 1600;
const STILL_FADE_MS = 300;
/** On a later launch the card is already written and flies at once. */
const QUICK_FLY_AT = 420;

const SPLASH_PAGE = '#F7F1E8';
const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 210;
/** The board's top, as a share of the screen: 214 of the board's 844 points. */
const BOARD_TOP = 0.25;
const TITLE_WIDTH = 236;
const LINE_WIDTH = 188;
/** How far the card flies up, to where the chalkboard hangs in the room. */
const FLY_UP = -233;

const { INTERFACE, CHARACTER, CAMERA, WRITE } = SPLASH_CURVES;

export interface SplashProps {
  /** The full card on a first launch; a short flight on every launch after. */
  readonly quick: boolean;
  /** Called once the card has gone and the screen under it is in front. */
  readonly onDone?: () => void;
  /** For a capture: the card held, fully written, with nothing moving. */
  readonly held?: boolean;
  /** False while the system's launch screen still covers it: the card waits, unseen, to begin. */
  readonly start?: boolean;
}

/**
 * The animated splash, from the Splash board: "Phu's Class" written in chalk, the line under it,
 * Thầy Phú rising behind the board, three drum beats that shake it, then the card flies up to
 * where the chalkboard hangs in the room as the first scene shows through. Under Reduce Motion the
 * card is simply there, then fades. It takes no touch: a card that held taps swallowed them
 * whenever it stayed longer than expected, on a slow phone or under a test. VoiceOver hears one
 * line.
 */
export function Splash({ quick, onDone, held = false, start = true }: SplashProps) {
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
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (held) return undefined;
    startLanding(moving && !quick && start);
    if (!start) return undefined;
    const goes = (total: number) => {
      const timer = setTimeout(() => onDone?.(), total);
      return () => clearTimeout(timer);
    };
    if (!moving) {
      // The still card's fade is the one motion Reduce Motion keeps, as the board's.
      page.set(
        withDelay(
          STILL_FADE_AT,
          withTiming(0, { duration: STILL_FADE_MS, reduceMotion: ReduceMotion.Never }),
        ),
      );
      return goes(STILL_FADE_AT + STILL_FADE_MS);
    }
    const flyAt = quick ? QUICK_FLY_AT : AT.fly;
    if (!quick) {
      written.set(withDelay(AT.write, withTiming(1, { duration: AT.writeMs, easing: WRITE })));
      line.set(withDelay(AT.line, withTiming(1, { duration: AT.lineMs, easing: INTERFACE })));
      rise.set(withDelay(AT.rise, withTiming(1, { duration: AT.riseMs, easing: CHARACTER })));
    }
    fly.set(withDelay(flyAt, withTiming(1, { duration: AT.flyMs, easing: CAMERA })));
    page.set(withDelay(flyAt, withTiming(0, { duration: AT.fadeMs, easing: CAMERA })));
    return goes(flyAt + AT.fadeMs + 40);
  }, [held, start, moving, quick, onDone, written, line, rise, fly, page]);

  const pageStyle = useAnimatedStyle(() => ({ opacity: page.get() }));
  const stageStyle = useAnimatedStyle(() => {
    const f = fly.get();
    return {
      opacity: f < 0.4 ? 1 : 1 - (f - 0.4) / 0.6,
      transform: [{ translateY: FLY_UP * f }, { scale: 1 + 0.15 * f }],
    };
  });
  const boardStyle = useAnimatedStyle(() => shakeStyle(shake.get()));
  const titleStyle = useAnimatedStyle(() => ({ width: TITLE_WIDTH * written.get() }));
  const lineStyle = useAnimatedStyle(() => ({ width: LINE_WIDTH * line.get() }));
  const phuStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 96 * (1 - rise.get()) }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };
  const left = (size.width - BOARD_WIDTH) / 2;
  // The card flies up and grows about its own middle, as the board's stage does.
  const origin = { transformOrigin: ['50%', size.height * BOARD_TOP + BOARD_HEIGHT / 2, 0] };

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
      <Animated.View style={[styles.stage, origin, stageStyle]}>
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
  anchor: {
    position: 'absolute',
    top: `${BOARD_TOP * 100}%`,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
  },
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
});
