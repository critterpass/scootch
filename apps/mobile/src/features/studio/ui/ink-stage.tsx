import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { dotScreen, type DrawCommand } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { Scootch } from '../../../art/Scootch';
import { useT } from '../../../i18n/i18n-provider';
import { useAppearance } from '../../../screens/registry/support/forced-variant';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { inkOf, type InkId } from '../catalogue';

import { STAGE, useEasedBackground } from './stage-parts';

/** The card's own stock, whatever the ink: the corner of it that shows is always paper. */
const CARD_STOCK = '#FBF8F3';
/** The session the one screen offers until its wheel is turned. */
const USUAL_MINUTES = 10;

export interface InkStageProps {
  readonly ink: InkId;
  /** Scootch's own line for the one screen with nothing set, from the line pack. */
  readonly line: string;
  readonly size: { readonly width: number; readonly height: number };
}

/**
 * The ink, on the things it changes: the one screen with Scootch and its Start button, a widget
 * and the corner of your card. Picking another ink recolours all three where they stand.
 */
export function InkStage({ ink, line, size }: InkStageProps) {
  const t = useT();
  const { palette, allowFontScaling } = useScreenStyle();
  const appearance = useAppearance();
  const character = useCharacterMotion();
  const colours = inkOf(ink).colours;
  // In the dark appearance the one screen is the dark page, and the ink is its accent alone.
  const paper = useEasedBackground(appearance === 'dark' ? palette.surface : colours.paper);
  const accent = useEasedBackground(colours.accent);
  const stamp = appearance === 'dark' ? colours.highlight : colours.deep;
  const dots = useMemo(
    (): DrawCommand[] => [
      {
        op: 'fill',
        path: dotScreen({ x: 0, y: 0, w: size.width, h: size.height }, 14, 1),
        color: colours.accent,
        alpha: 0.16,
        rule: 'nonzero',
      },
    ],
    [size.width, size.height, colours.accent],
  );
  const fit = Math.min(1, size.height / STAGE.height);
  return (
    <Animated.View
      testID="studio-preview"
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('studio.stage.ink.label', { ink: t(inkOf(ink).name) })}
      style={[styles.stage, size, paper]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CommandCanvas commands={dots} space={size} width={size.width} />
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.eyebrow, { color: stamp }]}>
        {t('studio.stage.ink').toLocaleUpperCase()}
      </Text>
      <View style={styles.figure}>
        <Scootch mood="scheming" ink={ink} size={160 * fit} {...character} />
      </View>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.line, { color: palette.ink }]}
      >
        {line}
      </Text>
      <Animated.View
        style={[styles.start, { boxShadow: `0 10px 24px -10px ${colours.accent}` }, accent]}
      >
        <View style={styles.play} />
        <Text allowFontScaling={false} style={styles.startLabel}>
          {t('morning.start', { minutes: USUAL_MINUTES })}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.widget, accent]}>
        <Text allowFontScaling={false} style={styles.widgetLabel}>
          {t('studio.stage.widget').toLocaleUpperCase()}
        </Text>
        <View style={styles.widgetFigure}>
          <Scootch mood="waiting" tone="paper" size={64} reducedMotion />
        </View>
      </Animated.View>
      <View style={styles.corner}>
        <Animated.View style={[styles.cornerBar, accent]} />
        <Text allowFontScaling={false} style={[styles.cornerCode, { color: colours.deep }]}>
          {inkOf(ink).code}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: STAGE.radius,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,23,0.1)',
  },
  eyebrow: { fontFamily: STAMPED, fontWeight: '700', fontSize: 10, letterSpacing: 1.6 },
  figure: { marginTop: 6 },
  line: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 26.4,
    letterSpacing: -0.48,
    textAlign: 'center',
  },
  start: {
    marginTop: 16,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  play: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderLeftColor: '#FFFFFF',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  startLabel: { color: '#FFFFFF', fontFamily: fonts.body, fontWeight: '600', fontSize: 15 },
  widget: {
    position: 'absolute',
    right: -18,
    bottom: -30,
    width: 104,
    height: 104,
    borderRadius: 26,
    padding: 12,
    transform: [{ rotate: '-7deg' }],
    boxShadow: '0 18px 30px -14px rgba(28,26,23,0.5)',
  },
  widgetLabel: {
    color: '#FFFFFF',
    opacity: 0.85,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8,
    letterSpacing: 1.1,
  },
  widgetFigure: { position: 'absolute', left: 8, top: 18 },
  corner: {
    position: 'absolute',
    left: -16,
    bottom: -26,
    width: 96,
    height: 62,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'flex-end',
    backgroundColor: CARD_STOCK,
    transform: [{ rotate: '6deg' }],
    boxShadow: '0 14px 24px -12px rgba(28,26,23,0.45)',
  },
  cornerBar: { height: 5, width: '70%', borderRadius: 3 },
  cornerCode: {
    marginTop: 6,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8,
    letterSpacing: 1,
  },
});
