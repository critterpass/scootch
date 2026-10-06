import type { Attitude, CardData, MonsterRow, WorldPieceRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import type { RecordInstrument } from '@scootch/sound';

import type { Translate } from '../../i18n/i18n-provider';

import type { RevealStep } from './reveal-steps';

/** Everything the reveal draws, already worked out. No step reads the store itself. */
export interface RevealModel {
  readonly step: RevealStep;
  readonly language: Language;
  readonly attitude: Attitude;
  readonly reducedMotion: boolean;
  /** The foil follows the phone. Off under Reduce Motion and in a capture. */
  readonly tilting: boolean;
  readonly card: CardData | null;
  readonly monster: MonsterRow | null;
  /** The caught line of the task's own pack, as the store last showed it. */
  readonly line: string | null;
  readonly piece: WorldPieceRow | null;
  readonly bar: {
    /** 1 (Monday) to 7 (Sunday). */
    readonly position: number;
    readonly instruments: readonly RecordInstrument[];
    readonly playing: boolean;
  } | null;
  /** False for a private or serious task: "Show someone" is then not drawn at all. */
  readonly shareOffered: boolean;
}

export interface RevealActions {
  readonly next: () => void;
  readonly skip: () => void;
  readonly backToToday: () => void;
  readonly showSomeone: () => void;
  readonly playBar: () => void;
  readonly chooseDrop: (choice: 'wear' | 'later') => void;
}

export interface RevealStepProps {
  readonly model: RevealModel;
  readonly actions: RevealActions;
  readonly t: Translate;
}

/** The close control of every step: one tap skips the step on show. */
export function skipControl(actions: RevealActions, t: Translate) {
  return { label: t('reveal.skip'), hint: t('reveal.skip.hint'), onPress: actions.skip };
}
