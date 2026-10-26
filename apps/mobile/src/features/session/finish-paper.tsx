import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import type { CommentStep } from '@phusclass/domain/board';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { ink, type } from '../desk/class-style';
import { fixedLine } from '../desk/his-line';

const DRAW = Easing.bezier(0.65, 0, 0.35, 1);
const CHECK = 'M12 56 Q26 62 42 86 Q64 38 112 8';
const RING =
  'M60 12 C 100 10 116 34 112 56 C 108 82 70 92 40 86 C 10 80 4 52 14 32 C 22 16 44 10 66 14';

/** The bits of confetti, as the App board drops them. */
const BITS = [
  { x: 70, color: '#E8322B', delay: 0 },
  { x: 110, color: '#FFC93C', delay: 90 },
  { x: 150, color: '#2F6B56', delay: 40 },
  { x: 230, color: '#E8322B', delay: 140 },
  { x: 270, color: '#4FB8F0', delay: 60 },
  { x: 310, color: '#FFC93C', delay: 180 },
  { x: 190, color: '#4FB8F0', delay: 220 },
] as const;

function Bit({ x, color, delay }: (typeof BITS)[number]) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(delay, withTiming(1, { duration: 1400, easing: Easing.bezier(0.2, 0.7, 0.3, 1) })),
    );
  }, [p, delay]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v === 0 ? 0 : v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85,
      transform: [{ translateY: -30 + 200 * v }, { rotate: `${280 * v}deg` }],
    };
  });
  return <Animated.View style={[styles.bit, { left: x, backgroundColor: color }, style]} />;
}

/** Confetti over the finish: never on a heavy task, never where nothing may move. */
export function Confetti() {
  const mayMove = useMayMove();
  if (!mayMove) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {BITS.map((bit) => (
        <Bit key={bit.x} {...bit} />
      ))}
    </View>
  );
}

/** A red stroke that draws itself, on the pen's curve; drawn whole where nothing may move. */
function RedStroke({ path, delay, width }: { path: string; delay: number; width: number }) {
  const mayMove = useMayMove();
  const end = useSharedValue(mayMove ? 0 : 1);
  useEffect(() => {
    if (mayMove) end.set(withDelay(delay, withTiming(1, { duration: 560, easing: DRAW })));
  }, [end, delay, mayMove]);
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={width}
      strokeCap="round"
      strokeJoin="round"
      color={ink.red}
      start={0}
      end={end}
    />
  );
}

export interface FinishPaperProps {
  readonly title: string;
  /** `null` on a heavy task: it is not graded. */
  readonly comment: CommentStep | null;
  readonly waitedDays: number;
  readonly tookMinutes: number;
}

/**
 * The graded paper: the task, how long it waited and how long it took, the red check drawing
 * itself and his comment in red. The circled 10 is drawn, with no words. A heavy task gets the
 * paper and nothing marked on it.
 */
export function FinishPaper({ title, comment, waitedDays, tookMinutes }: FinishPaperProps) {
  const t = useT();
  const { language } = useLanguage();
  const sizing = useTextSizing();
  const mayMove = useMayMove();
  const words =
    comment === 'fine'
      ? fixedLine(language, 'commentFine')
      : comment === 'good'
        ? fixedLine(language, 'commentGood')
        : comment === 'good work'
          ? fixedLine(language, 'commentGoodWork')
          : null;
  return (
    <View style={styles.paper} testID="finish-paper">
      <Text
        accessibilityRole="header"
        allowFontScaling={sizing.allowFontScaling}
        style={[
          styles.title,
          { fontSize: sizing.size(20), lineHeight: sizing.size(25) },
          // The check stands in the corner; the comment is written below it, never over it.
          comment !== null ? { paddingRight: 92, minHeight: 74 } : null,
        ]}
      >
        {title}
      </Text>
      {comment !== null ? (
        <Canvas
          style={styles.check}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('finish.check')}
        >
          <Group transform={[{ scale: 0.8 }]}>
            <RedStroke path={CHECK} delay={300} width={10} />
          </Group>
        </Canvas>
      ) : null}
      <View style={styles.foot}>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.facts, { fontSize: sizing.size(13) }]}
        >
          {waitedDays > 0 ? t('finish.waited', { count: waitedDays }) : t('finish.sameDay')}
          {'\n'}
          {t('finish.took', { count: tookMinutes })}
        </Text>
        {words !== null ? (
          <Animated.Text
            testID="finish-comment"
            {...(mayMove ? { entering: FadeIn.delay(780).duration(720) } : {})}
            allowFontScaling={sizing.allowFontScaling}
            style={[type.hand, styles.comment, { fontSize: sizing.size(50) }]}
          >
            {words}
          </Animated.Text>
        ) : comment === 'ten' ? (
          <View
            style={styles.ten}
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('finish.ten')}
            testID="finish-ten"
          >
            <Text style={[type.hand, styles.tenText]}>10</Text>
            <Canvas style={StyleSheet.absoluteFill}>
              <RedStroke path={RING} delay={900} width={4} />
            </Canvas>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    borderRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: ink.white,
    boxShadow: '0 1px 2px rgba(60,40,20,0.06), 0 10px 26px rgba(60,40,20,0.08)',
  },
  title: { fontWeight: '700', color: ink.text, letterSpacing: -0.3 },
  check: { position: 'absolute', right: 14, top: 10, width: 96, height: 80 },
  foot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  facts: { color: ink.muted, lineHeight: 20, flexShrink: 1 },
  comment: { color: ink.red, transform: [{ rotate: '-4deg' }] },
  ten: { width: 120, height: 100, alignItems: 'center', justifyContent: 'center' },
  tenText: { color: ink.red, fontSize: 54 },
  bit: { position: 'absolute', top: 150, width: 9, height: 4, borderRadius: 2 },
});
