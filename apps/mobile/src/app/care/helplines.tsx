import { CrisisScreen } from '../../features/care/crisis-screen';
import { phoneRegion } from '../../features/care/helpline-cards';
import { useBoard } from '../../state/board-provider';

/** The helplines, opened from Settings: the crisis screen's page, with the system's way back. */
export default function Helplines() {
  const board = useBoard();
  return <CrisisScreen kind="helplines" region={phoneRegion()} now={board.now.at} />;
}
