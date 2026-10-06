import { cardStats, type CardStats, type TaskHistory } from '../rarity';
import type { SessionTone } from '../session';

import { recordBarFor, type RecordBar } from './record-bar';
import { surpriseDropFor, type DropDraw, type SurpriseDrop } from './surprise-drop';

/** One thing a session earned. The app shows them in this order; this package shows nothing. */
export type Earning =
  /** Starting is the win, whatever happens next. */
  | { readonly kind: 'start' }
  | { readonly kind: 'card'; readonly number: number; readonly stats: CardStats }
  /** `plain` is the quiet piece a serious task leaves. */
  | { readonly kind: 'world_piece'; readonly piece: 'monster' | 'plain' }
  | { readonly kind: 'record_bar'; readonly bar: RecordBar }
  | { readonly kind: 'treat'; readonly treat: string }
  | { readonly kind: 'surprise_drop'; readonly drop: SurpriseDrop };

export interface FinishedSession {
  readonly ending: 'finished';
  /** `quiet` is a serious task: read from the session, never worked out again here. */
  readonly tone: SessionTone;
  readonly history: TaskHistory;
  /** The treat named before starting. */
  readonly treat: string | null;
  /** The day already has its bar: a day adds one bar, however much was finished. */
  readonly dayHasBar: boolean;
  readonly drop: DropDraw;
}

/**
 * How a session ended. Nothing here says whether the user has Plus or owns anything from the
 * shelf, so no purchase can change what a session earns.
 */
export type SessionEnd =
  | FinishedSession
  | { readonly ending: 'not_finished' | 'left_early' }
  | { readonly ending: 'let_go' };

/**
 * What a session earned, as data. A task the user let go earns nothing and leaves nothing; a
 * session that was not finished keeps the start. A serious task leaves its piece and its bar, with
 * no card, no treat ceremony and no surprise.
 */
export function sessionEarnings(end: SessionEnd): readonly Earning[] {
  if (end.ending === 'let_go') return [];
  if (end.ending !== 'finished') return [{ kind: 'start' }];

  const quiet = end.tone === 'quiet';
  const earned: Earning[] = [{ kind: 'start' }];
  if (!quiet) {
    earned.push({ kind: 'card', number: end.drop.catchNumber, stats: cardStats(end.history) });
  }
  earned.push({ kind: 'world_piece', piece: quiet ? 'plain' : 'monster' });
  if (!end.dayHasBar) earned.push({ kind: 'record_bar', bar: recordBarFor(end.history.caughtOn) });
  if (quiet) return earned;

  if (end.treat !== null) earned.push({ kind: 'treat', treat: end.treat });
  const drop = surpriseDropFor(end.drop);
  if (drop) earned.push({ kind: 'surprise_drop', drop });
  return earned;
}
