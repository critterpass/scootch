import type { ReactElement } from 'react';

import type { Carving } from '@phusclass/domain/board';

import type { CardCopy } from '../share-copy';

import type { CardFonts } from './card-text';

/** What every card is drawn from. */
export type CardProps = {
  readonly copy: CardCopy;
  readonly fonts: CardFonts;
  /** 450 for a post, 640 for a story; always 360 wide. */
  readonly height: number;
  /** Thầy Phú, drawn 200 × 220 at the origin, where a card shows him. */
  readonly phu?: ReactElement | null;
  /** The marks on the desk, oldest first. */
  readonly carvings: readonly Carving[];
  /** The letters carved for initials. */
  readonly initials: string;
};
