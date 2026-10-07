import { Canvas, Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { buildCardLayers, CARD_BLEED, CARD_WIDTH } from '@scootch/art';
import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { CommandLayer } from '../../../art/skia-commands';

import { cardCanvasSize } from './card-size';

/**
 * The board's stamp (`[data-anim="stamp2"]`), in milliseconds from the moment it shows: it comes
 * in a little turned and large, lands squashed, bounces and settles at its nine degrees.
 */
export const STAMP_LANDING = {
  times: [0, 384, 640, 896],
  /** The turn on top of the nine degrees the stamp rests at. */
  turns: [1, -3, 0, 0],
  scales: [1.15, 0.9, 1.06, 1],
} as const;

export interface CardStampProps {
  readonly card: CardData;
  readonly language: Language;
  readonly cardWidth: number;
  /** Milliseconds since the stamp began to come down; below zero it is not there yet. */
  readonly sinceMs: SharedValue<number>;
}

/** The CAUGHT stamp by itself, over a card drawn without one, thumping down about its own middle. */
export function CardStamp({ card, language, cardWidth, sinceMs }: CardStampProps) {
  const layers = useMemo(() => buildCardLayers(card, { language }), [card, language]);
  const scale = cardWidth / CARD_WIDTH;
  const size = cardCanvasSize(cardWidth);
  const origin = [
    (CARD_BLEED + layers.stampCentre.x) * scale,
    (CARD_BLEED + layers.stampCentre.y) * scale,
    0,
  ];
  const landing = useAnimatedStyle(() => {
    const at = sinceMs.value;
    const times = STAMP_LANDING.times;
    return {
      opacity: interpolate(at, [0, times[1]], [0, 1], 'clamp'),
      transform: [
        { rotate: `${interpolate(at, times, STAMP_LANDING.turns, 'clamp')}deg` },
        { scale: interpolate(at, times, STAMP_LANDING.scales, 'clamp') },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: origin }, landing]}
    >
      <Canvas style={size}>
        <Group transform={[{ scale }, { translateX: CARD_BLEED }, { translateY: CARD_BLEED }]}>
          <CommandLayer commands={layers.stamp} />
        </Group>
      </Canvas>
    </Animated.View>
  );
}
