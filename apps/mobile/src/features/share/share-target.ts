import type { PostcardData, ShareFrame, SleeveData, WantedData } from '@scootch/art';
import type { CardData, SignedWords, TaskRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { Keepsakes } from '../../state/keepsakes';

import {
  composePage,
  composePoster,
  composePostcard,
  composeSleeve,
  composeWanted,
  type MonthFormat,
  type ShareFormat,
  type ShareImage,
} from './share-image';
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

/** One month of the binder, to share as the leaf that is open or as its poster. */
export interface MonthTarget {
  readonly kind: 'month';
  readonly year: number;
  readonly month: number;
  /** The leaf of the month that was open, from 0. The first when it is not said. */
  readonly leaf?: number;
}

/** The world, to send as a postcard. It names no task. */
export interface WorldTarget {
  readonly kind: 'world';
  readonly postcard: PostcardData;
}

/** A week's record, to share in its sleeve. Its credits carry only tasks that may be shared. */
export interface SongTarget {
  readonly kind: 'song';
  readonly sleeve: SleeveData;
  /** Sends the week's clip as sound, beside the picture. */
  readonly sound: () => void;
}

/** A target with no formats and no page: one picture, the person's own. */
export type AloneTarget = WantedTarget | MonthTarget | WorldTarget | SongTarget;
export type ShareTarget = CatchTarget | AloneTarget;

/** Whether a target is one catch, which has formats and can have a page. */
export function isCatch(target: ShareTarget): target is CatchTarget {
  return target.kind === undefined || target.kind === 'catch';
}

/**
 * The picture of a target that stands by itself, with the name its file is given: a wanted
 * poster, a postcard or a record sleeve on a frame, or a month's poster from what the phone
 * keeps. `null` while the month has not been read yet, or has nothing shareable in it.
 */
export function standalonePicture(
  target: AloneTarget,
  frame: ShareFrame,
  language: Language,
  kept: Keepsakes | null,
  hideTask: boolean,
  /** The style a month goes out in. Nothing else has more than one. */
  style: MonthFormat = 'poster',
): { readonly image: ShareImage; readonly name: string } | null {
  if (target.kind === 'world') {
    return { image: composePostcard(target.postcard, frame, language), name: 'scootch-world' };
  }
  if (target.kind === 'song') {
    return {
      image: composeSleeve(target.sleeve, frame, language, hideTask),
      name: `scootch-${target.sleeve.week}`,
    };
  }
  if (target.kind === 'wanted') {
    return {
      image: composeWanted(target.wanted, frame, language),
      name: `scootch-wanted-${target.wanted.monster.seed}`,
    };
  }
  const wrap = kept ? monthWrap(kept.monsters, kept.tasks, target.year, target.month) : null;
  if (wrap === null) return null;
  return {
    image:
      style === 'page'
        ? composePage(wrap, target.leaf ?? 0, language)
        : composePoster(wrap, language),
    name: `scootch-${target.year}-${String(target.month).padStart(2, '0')}`,
  };
}
