import { StyleSheet } from 'react-native';
import { Easing } from 'react-native-reanimated';

import { CURVES } from '@phusclass/art/class';
import { fonts } from '@phusclass/tokens';

import { HAND_FAMILY } from '../../classroom/use-hand-font';

/**
 * The classroom's inks as the App board draws them. The classroom is drawn in daylight only, so
 * these do not change with the phone's appearance.
 */
export const ink = {
  text: '#1C1A18',
  muted: '#6B655E',
  soft: 'rgba(28,26,24,0.06)',
  red: '#D42A24',
  redTop: '#E2453E',
  redDeep: '#C9241E',
  purple: '#6A45B8',
  green: '#2F6B56',
  chalk: '#EEF6F0',
  sheet: 'rgba(255,253,249,0.96)',
  paper: '#FCFAF6',
  white: '#FFFFFF',
  scrim: 'rgba(30,22,14,0.32)',
  grey: 'rgba(236,234,230,0.5)',
} as const;

const bezier = (c: readonly [number, number, number, number]) =>
  Easing.bezier(c[0], c[1], c[2], c[3]);

/** The three curves the screens move on. */
export const curves = {
  ui: bezier(CURVES.interface),
  character: bezier(CURVES.character),
  camera: bezier(CURVES.camera),
} as const;

export const type = StyleSheet.create({
  hand: { fontFamily: HAND_FAMILY, fontWeight: '700' },
  rounded: { fontFamily: fonts.heading, fontWeight: '800' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, color: ink.text },
});

export const shapes = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  ink: {
    backgroundColor: ink.text,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 20px rgba(28,26,24,0.18)',
  },
  red: {
    backgroundColor: ink.red,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(201,36,30,0.28)',
  },
  soft: { backgroundColor: ink.soft },
  sheet: {
    backgroundColor: ink.sheet,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    boxShadow: '0 -8px 30px rgba(60,40,20,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(28,26,24,0.16)',
  },
});

export const buttonText = StyleSheet.create({
  ink: { color: ink.white, fontSize: 17, fontWeight: '700' },
  red: { color: ink.white, fontSize: 17, fontWeight: '700' },
  soft: { color: ink.text, fontSize: 17, fontWeight: '600' },
});

/** How far a button's label grows with the text size; past it the layout stacks instead. */
export const BUTTON_MAX_SCALE = 1.6;

/**
 * A label's size that grows with the text size only up to `max` times its design size: the
 * phone's own setting is capped by `maxFontSizeMultiplier`, a registry capture's here.
 */
export function cappedSize(
  sizing: { readonly allowFontScaling: boolean; readonly size: (design: number) => number },
  design: number,
  max = BUTTON_MAX_SCALE,
): number {
  return sizing.allowFontScaling ? design : Math.min(sizing.size(design), design * max);
}
