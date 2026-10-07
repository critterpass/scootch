import { useMemo } from 'react';

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
 * One caught card as a flat picture, drawn by the art package's card builder: what a shared image
 * and a capture show. The card a person handles is `HandledCard`. To a screen reader it is a single
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
