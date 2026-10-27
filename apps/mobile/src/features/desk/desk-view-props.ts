import type { ReactNode } from 'react';

import type { Carving } from '@phusclass/art/class';

import type { TellHandlers } from '../../ui/fold/side-controls';
import type { BoardPaneData } from '../board/board-pane';

import type { DeskModel } from './desk-model';
import type { DeskGestures } from './use-desk-gestures';

export interface RecessView {
  readonly left: string;
  /** 0 to 1 of the five minutes gone. */
  readonly gone: number;
  readonly over: boolean;
}

export interface DeskViewProps {
  readonly model: DeskModel;
  /** What he says in passing, over the model's line. */
  readonly passing: { readonly text: string } | null;
  readonly carvings: readonly Carving[];
  readonly offline: boolean;
  readonly now: number;
  /** The composer bar, or `null` where nothing may be said (recess). */
  readonly composer: ReactNode;
  readonly typing: boolean;
  /** The keyboard's height. Unused: the sheet rides the keyboard itself, on the UI thread. */
  readonly keyboard?: number;
  /** The length chosen for the next period, if one was. */
  readonly chosenMinutes: number | null;
  /** The drum is sounding: Start swings its drum and ripples. */
  readonly ringing?: boolean;
  readonly recess: RecessView | null;
  /** Pinned on the chalkboard at recess: the tuition notice, when the board's rule puts it up. */
  readonly notice?: ReactNode;
  /** Overlays above everything: the slip sheet, flying chalk, the drum. */
  readonly overlays?: ReactNode;
  readonly gestures?: Pick<
    DeskGestures,
    'pullBoard' | 'swipeTimetable' | 'sheetStyle' | 'sheetContentStyle'
  >;
  readonly onStart: () => void;
  readonly onLength: (minutes: number) => void;
  readonly onSlip: () => void;
  readonly onNotNow: () => void;
  readonly onOpenBoard: () => void;
  readonly onOpenTimetable: () => void;
  readonly onStillYours: (answer: 'yes' | 'no') => void;
  readonly onBackToClass: () => void;
  readonly onSettings: () => void;
  readonly onChalkThrown?: () => void;
  /**
   * On iPhone Duo opened out, the board as its left page shows; left out, the phone's own board.
   * A capture gives its state's board, so the page and the desk agree.
   */
  readonly boardPage?: BoardPaneData;
  /** On iPhone Duo: telling him from the side, and whether he is listening or reading. */
  readonly duo?: {
    readonly composing: boolean;
    readonly tell?: TellHandlers;
  };
}
