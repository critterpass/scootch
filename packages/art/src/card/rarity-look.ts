import type { CardRarity } from '@scootch/domain';

import type { FinishMaterial, Tint } from './material';
import { holo } from './materials/holo';
import { paper } from './materials/paper';

/**
 * How a card of one rarity is made in the binder, where rarity is the material: the stock it is
 * printed on, the panel its monster sits on, the ink its rarity is stamped in and the rule over
 * its two numbers. Earned from the task, never bought: nothing here is a finish that is sold.
 */
export interface RarityLook {
  readonly material: FinishMaterial;
  /** The panel behind the monster. */
  readonly panel: string;
  /** The ink of the rarity's own word. */
  readonly word: string;
  /** The rule between the card's words and its numbers. */
  readonly rule: Tint;
  /** Whether what is printed on the stock reads as dark ink or as light. */
  readonly ground: 'light' | 'dark';
}

/** Common is paper, the middle tier is foil, and the top tier is dark stock with dust on it. */
export const RARITY_LOOKS: Record<CardRarity, RarityLook> = {
  common: {
    material: paper,
    panel: '#F3E6D3',
    word: '#6F6A62',
    rule: ['#1C1A17', 0.12],
    ground: 'light',
  },
  uncommon: {
    // The foil of a card is quieter than the finish that is sold: about half its rainbow.
    material: { ...holo, sheenAlpha: 0.55, spark: 0.7, sub: ['#1C1A17', 0.62] },
    panel: '#F6EFE3',
    word: '#C2387A',
    rule: ['#1C1A17', 0.15],
    ground: 'light',
  },
  rare: {
    material: {
      base: [
        {
          kind: 'linear',
          angle: 160,
          stops: [
            [0, '#2E2722', 1],
            [1, '#1C1A17', 1],
          ],
        },
      ],
      sheen: holo.sheen,
      sheenAlpha: 0.22,
      sheenBlend: 'normal',
      spark: 1,
      grain: 0,
      text: '#F6EBD9',
      sub: ['#F6EBD9', 0.6],
      edge: ['#FFFFFF', 0.3],
      shadow: ['#000000', 0.55],
      glow: ['#FFD66B', 0.35],
    },
    panel: '#F3E6D3',
    word: '#FFD66B',
    rule: ['#F6EBD9', 0.18],
    ground: 'dark',
  },
};
