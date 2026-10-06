import type {
  MonsterRow,
  RecordBarRow,
  SessionTone,
  TaskRow,
  WorldPieceRow,
} from '@scootch/domain';

import type { SurpriseDropRow } from '../../data/repositories/surprise-drops';

/** The reveal, in the order it is shown: a card, a world piece, a bar of the song, a drop. */
export type RevealStep = 'card' | 'piece' | 'bar' | 'drop';

/** What one finish gave, as the rewards rules wrote it to storage. */
export interface Earned {
  /** Read from the session. A serious task is `quiet` and is shown none of this. */
  readonly tone: SessionTone;
  readonly card: boolean;
  readonly piece: boolean;
  readonly bar: boolean;
  readonly drop: boolean;
}

const ORDER: readonly RevealStep[] = ['card', 'piece', 'bar', 'drop'];

/** The steps a finish is shown. A serious finish has none: it goes quietly back to the one screen. */
export function revealSteps(earned: Earned): RevealStep[] {
  if (earned.tone === 'quiet') return [];
  return ORDER.filter((step) => earned[step]);
}

export interface RevealState {
  readonly steps: readonly RevealStep[];
  /** The step on show; past the last one the reveal is over. */
  readonly index: number;
}

export type RevealEvent =
  /** The step's own way on: a tap on the card, "Later", "Wear it". */
  | { readonly type: 'next' }
  /** One tap on the close control skips the step on show. */
  | { readonly type: 'skip' }
  /** "Back to today": the rest is passed over, except a drop, which is always handed over. */
  | { readonly type: 'back_to_today' };

export function startReveal(earned: Earned): RevealState {
  return { steps: revealSteps(earned), index: 0 };
}

export function currentStep(state: RevealState): RevealStep | null {
  return state.steps[state.index] ?? null;
}

export function revealOver(state: RevealState): boolean {
  return state.index >= state.steps.length;
}

export function revealReducer(state: RevealState, event: RevealEvent): RevealState {
  if (revealOver(state)) return state;
  if (event.type === 'back_to_today') {
    const drop = state.steps.indexOf('drop');
    return { ...state, index: drop > state.index ? drop : state.steps.length };
  }
  return { ...state, index: state.index + 1 };
}

export interface FinishRows {
  readonly task: Pick<TaskRow, 'id'> | null;
  readonly tone: SessionTone;
  readonly localDate: string;
  readonly monster: MonsterRow | null;
  readonly pieces: readonly WorldPieceRow[];
  readonly bars: readonly RecordBarRow[];
  readonly drops: readonly SurpriseDropRow[];
}

/** The world piece this finish added, found by the seed the finish wrote it with. */
export function pieceOfFinish(rows: FinishRows): WorldPieceRow | null {
  const seed = rows.monster?.spec.seed ?? rows.task?.id;
  return (
    rows.pieces.find((piece) => piece.addedOn === rows.localDate && piece.seed === seed) ?? null
  );
}

/** The bar this finish added. A second finish on a day adds none: the day has its bar already. */
export function barOfFinish(rows: FinishRows): RecordBarRow | null {
  const bar = rows.bars.find((one) => one.localDate === rows.localDate) ?? null;
  return bar && bar.monsterId === (rows.monster?.id ?? null) ? bar : null;
}

/** The drop of this finish that has not been handed over yet. */
export function dropOfFinish(rows: FinishRows): SurpriseDropRow | null {
  return rows.drops.find((drop) => drop.taskId === rows.task?.id && drop.choice === null) ?? null;
}

/** What the finish of today's task gave, read back from what it wrote. */
export function earnedBy(rows: FinishRows): Earned {
  const { monster } = rows;
  return {
    tone: rows.tone,
    card: monster !== null && monster.number !== null && monster.caughtOn === rows.localDate,
    piece: pieceOfFinish(rows) !== null,
    bar: barOfFinish(rows) !== null,
    drop: dropOfFinish(rows) !== null,
  };
}
