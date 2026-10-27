import { useRouter, type Href } from 'expo-router';

import { BoardPane } from '../board/board-pane';
import { boardIsPage, type FoldLayout } from '../../ui/fold/fold-layout';
import { SideControls } from '../../ui/fold/side-controls';

const LOGBOOK = '/logbook' as Href;

export interface DeskFoldProps {
  readonly layout: FoldLayout;
  readonly onOpenBoard: () => void;
  readonly onOpenTimetable: () => void;
  readonly onSettings: () => void;
  /** At recess, and in a capture, the board stays on the wall. */
  readonly boardPage?: boolean;
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
      {page !== null ? <BoardPane frame={page} /> : null}
      <SideControls
        layout={layout}
        boardShown={page !== null}
        onBoard={props.onOpenBoard}
        onTimetable={props.onOpenTimetable}
        onLogbook={() => router.push(LOGBOOK)}
        onSettings={props.onSettings}
      />
    </>
  );
}
