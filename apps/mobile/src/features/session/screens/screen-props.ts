import type {
  Attitude,
  MonsterRow,
  ParkedThought,
  SessionEvent,
  SessionOpening,
  WorkMode,
} from '@scootch/domain';

import type { Translate } from '../../../i18n/i18n-provider';
import type { CatchKind } from '../catch/catch-kinds';
import type { ShownLine } from '../../../state/day-types';
import type { SessionView } from '../session-view';
import type { SessionInks } from '../ui/session-inks';

/** The two a session can be about: the task's monster and its catch, or Scootch at work. */
export type SessionFace = 'monster' | 'scootch';

/** What a session that ends in a catch draws beside the session itself. */
export interface CatchModel {
  /** The catch this task rolled. */
  readonly kind: CatchKind;
  /**
   * Who the session opens on: the monster and its catch, or Scootch at work with the hold to
   * finish. A tap on whoever sits in the corner swaps them.
   */
  readonly opensOn: SessionFace;
  /** How many monsters the binder already holds; `null` until that has been read. */
  readonly caughtCount: number | null;
  /** The other monsters caught this month, oldest first. */
  readonly monthMates: readonly MonsterRow[];
  /** The month's name, as the phone writes it. */
  readonly monthName: string;
}

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
  /** What Scootch last said, from the store. `null` while the sitting is opened on the user's line. */
  readonly line: ShownLine | null;
  /**
   * The line the user left for this sitting, for as long as the sitting is opened on it. Left out
   * or `null` when there is none, and once it has folded away.
   */
  readonly opening?: SessionOpening | null;
  /** The not-finished screen is already on its "Next time, start with…" sheet: a capture of it. */
  readonly nextTimeOpen?: boolean;
  /** The task's own tiny next step, from the store. */
  readonly tinyNextStep: string | null;
  /** The task's own ceremony line for the treat; `null` shows the treat as before. */
  readonly treatLine: string | null;
  /** The task's own line over its parked thoughts; `null` shows them without one. */
  readonly thoughtsLine: string | null;
  readonly reducedMotion: boolean;
  readonly parkOpen: boolean;
  /** The thought just parked, shown for a moment. */
  readonly parkedNote: string | null;
  /** Where the hold ring starts, for a capture of a ring let go of early. */
  readonly holdStartsAt: number;
  /** The task's catch, when its monster can be caught by hand; `null` when the finish is held. */
  readonly catch: CatchModel | null;
  /** The developer control that ends the timer in a few seconds is on show. */
  readonly developerEnd: boolean;
  /** A parked thought's time of day, as the phone writes times. */
  readonly timeOf: (thought: ParkedThought) => string;
}

export interface SessionActions {
  /** The close control: mid-session it leads to the not-finished choices; otherwise it leaves. */
  readonly leave: () => void;
  /** "I'm not finished", said on purpose: on to the calm choices. */
  readonly leaveNow: () => void;
  readonly openPark: () => void;
  readonly closePark: () => void;
  readonly park: (text: string) => void;
  /**
   * "Save for tomorrow": the task is carried on with these words kept for its next sitting.
   * Left out where nothing is stored, and the task is then simply carried on.
   */
  readonly carryOnWith?: (line: string) => void;
  /** Sends one session event to the store. */
  readonly send: (event: SessionEvent) => void;
  /** The same, for the finish control: settles when the store has applied or refused it. */
  readonly sendFinish: (event: SessionEvent) => Promise<void>;
  /** "Start" on the card that explains catching: the session begins. */
  readonly startNow: () => void;
  readonly finishEarly: () => void;
  readonly keepGoing: () => void;
  readonly passBurst: () => void;
  /** A tap during the catch: the reveal takes over at once. */
  readonly passCaught: () => void;
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
