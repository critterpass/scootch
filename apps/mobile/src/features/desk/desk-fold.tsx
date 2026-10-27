import { useRouter, type Href } from 'expo-router';

import { BoardPane, type BoardPaneData } from '../board/board-pane';
import { boardIsPage, type FoldLayout } from '../../ui/fold/fold-layout';
import { SideControls, type TellHandlers } from '../../ui/fold/side-controls';

const LOGBOOK = '/logbook' as Href;
/** The desk's own names for the controls the Duo moves to the side. */
const DESK_IDS = {
  timetable: 'desk-timetable',
  settings: 'desk-settings',
  tell: 'composer-type',
} as const;

export interface DeskFoldProps {
  readonly layout: FoldLayout;
  readonly onOpenBoard: () => void;
  readonly onOpenTimetable: () => void;
  readonly onSettings: () => void;
  /** At recess the board stays on the wall. */
  readonly boardPage?: boolean;
  /** The board the page shows, where it is given (a capture); otherwise the phone's own. */
  readonly boardData?: BoardPaneData;
  /** Telling him: hold the side's microphone to speak, tap it to type. */
  readonly tell?: TellHandlers;
}

/**
 * What the desk adds on iPhone Duo: the board as the left page when it is opened out, and the
 * controls down the side (or along the foot in the stand). Nothing on a phone.
 */
export function DeskFold({ layout, boardPage = true, ...props }: DeskFoldProps) {
  const router = useRouter();
  if (layout.pose === 'phone') return null;
  const page = boardPage && boardIsPage(layout.pose) ? layout.boardPage : null;
  return (
    <>
      {page !== null ? (
        <BoardPane frame={page} {...(props.boardData ? { data: props.boardData } : {})} />
      ) : null}
      <SideControls
        layout={layout}
        boardShown={page !== null}
        onBoard={props.onOpenBoard}
        onTimetable={props.onOpenTimetable}
        onLogbook={() => router.push(LOGBOOK)}
        onSettings={props.onSettings}
        {...(props.tell ? { tell: props.tell } : {})}
        ids={DESK_IDS}
      />
    </>
  );
}
