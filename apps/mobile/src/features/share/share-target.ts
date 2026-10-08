import type { ShareFrame, WantedData } from '@scootch/art';
import type { CardData, SignedWords, TaskRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { Keepsakes } from '../../state/keepsakes';

import { composePoster, composeWanted, type ShareFormat, type ShareImage } from './share-image';
import { monthWrap } from './share-logs';

/** A catch to share: its story, its sticker sheet, its card or the receipt of its day. */
export interface CatchTarget {
  readonly kind?: 'catch';
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  /** The signature stored with the monster's words; `null` when it has none. */
  readonly signed: SignedWords | null;
  /** The picture the composer opens on. */
  readonly format: ShareFormat;
}

/** A monster that is still wild, to put on a wanted poster. */
export interface WantedTarget {
  readonly kind: 'wanted';
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly wanted: WantedData;
}

/** One month of the binder, to share as its poster. */
export interface MonthTarget {
  readonly kind: 'month';
  readonly year: number;
  readonly month: number;
}

export type ShareTarget = CatchTarget | WantedTarget | MonthTarget;

/** Whether a target is one catch, which has formats and can have a page. */
export function isCatch(target: ShareTarget): target is CatchTarget {
  return target.kind === undefined || target.kind === 'catch';
}

/**
 * The picture of a target that stands by itself, with the name its file is given: a wanted
 * poster on a frame, or a month's poster from what the phone keeps. `null` while the month has
 * not been read yet, or has nothing shareable in it.
 */
export function standalonePicture(
  target: WantedTarget | MonthTarget,
  frame: ShareFrame,
  language: Language,
  kept: Keepsakes | null,
): { readonly image: ShareImage; readonly name: string } | null {
  if (target.kind === 'wanted') {
    return {
      image: composeWanted(target.wanted, frame, language),
      name: `scootch-wanted-${target.wanted.monster.seed}`,
    };
  }
  const wrap = kept ? monthWrap(kept.monsters, kept.tasks, target.year, target.month) : null;
  if (wrap === null) return null;
  return {
    image: composePoster(wrap, language),
    name: `scootch-${target.year}-${String(target.month).padStart(2, '0')}`,
  };
}
