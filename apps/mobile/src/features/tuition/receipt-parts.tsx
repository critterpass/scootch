import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { ReduceMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useMayMove } from '../../ui/motion/use-feel';
import { type as typeStyles } from '../desk/class-style';

/** The receipt's inks, as the Tuition board draws them. Paper is drawn in daylight only. */
export const paper = {
  page: '#F7F1E8',
  sheet: '#FFFDF7',
  ink: '#1C1A18',
  body: '#5E5852',
  muted: '#8A7F74',
  faint: 'rgba(28,26,24,0.035)',
  rule: 'rgba(28,26,24,0.14)',
  red: '#D42A24',
  redDeep: '#C9241E',
  blue: '#2B4C9A',
  green: '#2F6B56',
  greenSoft: '#EAF4EE',
  amber: '#9A6B00',
  amberDot: '#E0A030',
  amberSoft: '#FFF6DE',
  redSoft: '#FDECEA',
  grey: '#C9BFB2',
  gold: '#E0B44A',
  goldSoft: '#FFF8E6',
  white: '#FFFFFF',
} as const;

/** Thầy Phú's signature as he signs a receipt: the boards' 84 by 30 stroke, in blue ink. */
const RECEIPT_SIGNATURE =
  'M5 27 C7 19 8 11 10 3 C15 0 23 4 19 10 C16 14 10 13 8 11 M12 14 C15 9 18 4 20 2 C21 8 18 17 19 24 ' +
  'C20 18 24 13 26 17 C27 21 26 24 29 22 C31 19 31 16 32 15 C32 20 33 24 36 22 C38 20 38 17 39 15 ' +
  'C39 20 40 24 44 21 C52 17 64 16 82 9 M35 9 L40 4';

/** The board's `sigIn`: his pen draws the signature over 900 ms, 420 ms after the stamp's turn. */
const SIGN_DELAY_MS = 420;
const SIGN_MS = 900;

/** His signature; `sign` has him write it again now, stroke by stroke. */
export function ReceiptSignature({
  label,
  sign = false,
}: {
  readonly label: string;
  readonly sign?: boolean;
}) {
  const mayMove = useMayMove();
  const written = useSharedValue(1);
  useEffect(() => {
    if (!sign || !mayMove) return;
    written.value = 0;
    written.value = withDelay(
      SIGN_DELAY_MS,
      withTiming(1, { duration: SIGN_MS, easing: SPRING_CURVE, reduceMotion: ReduceMotion.Never }),
    );
  }, [sign, mayMove, written]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Canvas style={{ width: 84, height: 30 }}>
        <Path
          end={written}
          path={RECEIPT_SIGNATURE}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
          color={paper.blue}
        />
      </Canvas>
    </View>
  );
}

/** The red check the receipt ticks each line with. Decoration. */
export function RedTick() {
  return (
    <Canvas
      style={{ width: 20, height: 18 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        path="M2 10 L7.5 15 L18 2.5"
        style="stroke"
        strokeWidth={2.6}
        strokeCap="round"
        strokeJoin="round"
        color={paper.red}
      />
    </Canvas>
  );
}

/** The line height a text style sets, the last one set winning, as React Native reads it. */
function lineHeightOf(style: StyleProp<TextStyle>): number | undefined {
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i -= 1) {
      const set = lineHeightOf(style[i] as StyleProp<TextStyle>);
      if (set !== undefined) return set;
    }
    return undefined;
  }
  return typeof style === 'object' && style !== null ? (style as TextStyle).lineHeight : undefined;
}

/** Text at a design size, scaled by the phone's text size or a forced registry variant. */
export function Sized({
  size,
  style,
  children,
  lines,
  role,
  label,
}: {
  readonly size: number;
  readonly style?: StyleProp<TextStyle>;
  readonly children: ReactNode;
  readonly lines?: number;
  readonly role?: 'header' | 'text';
  readonly label?: string;
}) {
  const sizing = useTextSizing();
  const fontSize = sizing.size(size);
  // A set line height grows with the text, so larger sizes never draw one line over another.
  const lineHeight = lineHeightOf(style);
  return (
    <Text
      allowFontScaling={sizing.allowFontScaling}
      {...(lines !== undefined ? { numberOfLines: lines } : {})}
      {...(role !== undefined ? { accessibilityRole: role } : {})}
      {...(label !== undefined ? { accessibilityLabel: label } : {})}
      style={[
        style,
        { fontSize },
        lineHeight === undefined ? null : { lineHeight: (lineHeight * fontSize) / size },
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * A small capital label: "AMOUNT", "TODAY". On the receipt, `cap` is its red heading (the board's
 * `.cap`, tracked 0.12 em) and `small` a field's name (`.lbl`, 9.5 points tracked 0.1 em).
 */
export function Label({
  children,
  color = paper.muted,
  kind,
}: {
  readonly children: ReactNode;
  readonly color?: string;
  readonly kind?: 'cap' | 'small';
}) {
  const tracking = kind === 'cap' ? 1.2 : kind === 'small' ? 0.95 : 1;
  return (
    <Sized
      size={kind === 'small' ? 9.5 : 10}
      style={[styles.label, { color, letterSpacing: tracking }]}
    >
      {children}
    </Sized>
  );
}

/** The tuition and scholarship boards press their buttons and plans to 0.97. */
export const PAPER_PRESS = 0.97;

/** A full-width capsule: the one action of a screen, or a quiet one. */
export function Capsule({
  label,
  onPress,
  tone,
  testID,
  disabled = false,
  hint,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly tone: 'ink' | 'green' | 'soft';
  readonly testID?: string;
  readonly disabled?: boolean;
  readonly hint?: string;
}) {
  const colours =
    tone === 'ink'
      ? { bg: paper.ink, fg: paper.white }
      : tone === 'green'
        ? { bg: paper.greenSoft, fg: paper.green }
        : { bg: 'rgba(28,26,24,0.06)', fg: paper.ink };
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(hint !== undefined ? { accessibilityHint: hint } : {})}
      {...(testID !== undefined ? { testID } : {})}
      disabled={disabled}
      onPress={onPress}
      pressScale={PAPER_PRESS}
      restOpacity={disabled ? 0.5 : 1}
      style={[styles.capsule, { backgroundColor: colours.bg }]}
    >
      <Sized size={17} style={[styles.capsuleText, { color: colours.fg }]}>
        {label}
      </Sized>
    </PressSpring>
  );
}

/** A quiet text link: Terms, Privacy, "Can't pay right now?". */
export function TextLink({
  label,
  onPress,
  strong = false,
  testID,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly strong?: boolean;
  readonly testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={10}
      {...(testID !== undefined ? { testID } : {})}
    >
      <Sized
        size={12.5}
        style={[styles.link, strong ? { color: paper.red, fontWeight: '600' } : null]}
      >
        {label}
      </Sized>
    </Pressable>
  );
}

export const handText = typeStyles.hand;

const styles = StyleSheet.create({
  label: { fontWeight: '800', letterSpacing: 1, color: paper.muted },
  capsule: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'stretch',
  },
  capsuleText: { fontWeight: '700', textAlign: 'center' },
  link: { color: paper.muted },
});
