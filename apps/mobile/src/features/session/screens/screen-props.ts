import type { Attitude, MonsterRow, ParkedThought, SessionEvent, WorkMode } from '@scootch/domain';

import type { Translate } from '../../../i18n/i18n-provider';
import type { ShownLine } from '../../../state/day-types';
import type { SessionView } from '../session-view';
import type { SessionInks } from '../ui/session-inks';

/** Everything the session screens draw, already worked out. No screen reads the store itself. */
export interface SessionModel {
  readonly view: SessionView;
  /** A serious task: plain words, no monster, no burst. Read from the session, never worked out. */
  readonly quiet: boolean;
  readonly taskText: string;
  readonly monster: MonsterRow | null;
  readonly workMode: WorkMode | null;
  readonly attitude: Attitude;
  readonly plannedMinutes: number;
  readonly minutesLeft: number;
  /** Time left, from 1 down to 0. */
  readonly fraction: number;
  /** What Scootch last said, from the store. */
  readonly line: ShownLine | null;
  /** The task's own tiny next step, from the store. */
  readonly tinyNextStep: string | null;
  readonly reducedMotion: boolean;
  readonly parkOpen: boolean;
  /** The thought just parked, shown for a moment. */
  readonly parkedNote: string | null;
  /** Where the hold ring starts, for a capture of a ring let go of early. */
  readonly holdStartsAt: number;
  /** The developer control that ends the timer in a few seconds is on show. */
  readonly developerEnd: boolean;
  /** A parked thought's time of day, as the phone writes times. */
  readonly timeOf: (thought: ParkedThought) => string;
}

export interface SessionActions {
  readonly leave: () => void;
  readonly openPark: () => void;
  readonly closePark: () => void;
  readonly park: (text: string) => void;
  /** Sends one session event to the store. */
  readonly send: (event: SessionEvent) => void;
  readonly finishEarly: () => void;
  readonly keepGoing: () => void;
  readonly passBurst: () => void;
  readonly passMoment: () => void;
  readonly passTreat: () => void;
  readonly passThoughts: () => void;
  readonly resolveThought: (thought: ParkedThought, resolution: 'keep' | 'discard') => void;
  readonly developerEnd: () => void;
}

export interface ScreenProps {
  readonly model: SessionModel;
  readonly actions: SessionActions;
  readonly inks: SessionInks;
  readonly t: Translate;
}
