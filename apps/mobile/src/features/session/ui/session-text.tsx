import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { fonts, fontSizes } from '@scootch/tokens';

import { useTextSizing } from '../../../screens/registry/support/forced-variant';

interface Face {
  readonly base: number;
  /** The most the largest text sizes may enlarge it, so a headline still fits a phone. */
  readonly cap: number;
  readonly style: TextStyle;
}

const heading: TextStyle = { fontFamily: fonts.heading, fontWeight: '700' };
const body: TextStyle = { fontFamily: fonts.body };

const FACES = {
  headline: { base: fontSizes.sentence, cap: 1.5, style: heading },
  minutes: { base: 44, cap: 1.5, style: heading },
  // The time under the ring: 700 40/1, tight, in figures that do not jiggle as they change.
  time: {
    base: 40,
    cap: 1.5,
    style: { ...heading, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  },
  // The time of a serious task, a size down.
  quietTime: { base: 34, cap: 1.5, style: heading },
  // A pill's label and a toast's title: 600 15.
  pill: { base: 15, cap: 1.6, style: { ...body, fontWeight: '600' } },
  // A menu row and a dock's quiet button: 17, regular and medium.
  // The task under the time: 400 17/1.3.
  task: { base: 17, cap: 2.2, style: body },
  row: { base: 17, cap: 1.8, style: body },
  dock: { base: 17, cap: 1.6, style: { ...body, fontWeight: '500' } },
  dockStrong: { base: 17, cap: 1.6, style: { ...body, fontWeight: '600', letterSpacing: -0.17 } },
  // The tiny next step: the rounded face at 24, tight.
  step: { base: 24, cap: 1.5, style: { ...heading, letterSpacing: -0.36 } },
  note: { base: 13, cap: 2, style: body },
  action: { base: fontSizes.action, cap: 1.6, style: heading },
  body: { base: fontSizes.body, cap: 2.2, style: body },
  caption: { base: 15, cap: 2.2, style: body },
  eyebrow: {
    base: 13,
    cap: 2,
    style: { ...body, fontWeight: '600', letterSpacing: 0.26, textTransform: 'uppercase' },
  },
} as const satisfies Record<string, Face>;

export interface SessionTextProps extends Omit<TextProps, 'style'> {
  readonly face: keyof typeof FACES;
  readonly color: string;
  readonly style?: StyleProp<TextStyle>;
}

/**
 * Text on the session screens. It follows the phone's text size, or a registry capture's, up to
 * a limit for each face.
 */
export function SessionText({ face, color, style, ...rest }: SessionTextProps) {
  const { allowFontScaling, size } = useTextSizing();
  const { base, cap, style: faceStyle } = FACES[face];
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={cap}
      {...rest}
      style={[faceStyle, { color, fontSize: Math.min(size(base), base * cap) }, style]}
    />
  );
}
