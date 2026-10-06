import { useEffect, useMemo, useState } from 'react';
import { SensorType, useAnimatedSensor } from 'react-native-reanimated';

import { CARD_BLEED, CARD_HEIGHT, CARD_WIDTH, type CardTilt } from '@scootch/art';
import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { composeShareImage } from '../../share/share-image';
import { cardSpokenLabel } from '../../zoo/zoo-cards';

import { CommandCanvas } from './command-canvas';

const SPACE = { width: CARD_WIDTH + CARD_BLEED * 2, height: CARD_HEIGHT + CARD_BLEED * 2 };
const FLAT: CardTilt = { x: 0, y: 0 };

export interface CardViewProps {
  readonly card: CardData;
  readonly language: Language;
  readonly width: number;
  /** Where the light falls on the foil. Flat when left out. */
  readonly tilt?: CardTilt;
  readonly hideTask?: boolean;
  readonly testID?: string;
}

/**
 * One caught card, drawn by the art package's card builder. To a screen reader it is a single
 * element that reads the card's name, its rarity and its stats.
 */
export function CardView({ card, language, width, tilt = FLAT, hideTask, testID }: CardViewProps) {
  const commands = useMemo(
    () => composeShareImage('card', card, { hideTask: hideTask === true, language, tilt }).commands,
    [card, language, hideTask, tilt],
  );
  return (
    <CommandCanvas
      commands={commands}
      space={SPACE}
      width={width}
      label={cardSpokenLabel(card, language)}
      {...(testID ? { testID } : {})}
    />
  );
}

const clamp = (value: number) => Math.min(1, Math.max(-1, Math.round(value * 10) / 10));
/** How often the foil follows the phone. */
const TILT_EVERY_MS = 120;

/**
 * The card with its foil following the phone's tilt, read from gravity. Mounted only with motion
 * on: with Reduce Motion the plain `CardView` is shown and the foil stays where it rests.
 */
export function TiltingCardView(props: Omit<CardViewProps, 'tilt'>) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: TILT_EVERY_MS });
  const [tilt, setTilt] = useState<CardTilt>(FLAT);
  useEffect(() => {
    const timer = setInterval(() => {
      const { x, y } = gravity.sensor.get();
      // Held upright a phone reads most of gravity on y; the resting hold is the flat foil.
      const next = { x: clamp(x / 5), y: clamp((y + 6) / 5) };
      setTilt((before) => (before.x === next.x && before.y === next.y ? before : next));
    }, TILT_EVERY_MS);
    return () => clearInterval(timer);
  }, [gravity]);
  return <CardView {...props} tilt={tilt} />;
}
