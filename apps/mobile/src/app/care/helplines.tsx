import { useRouter } from 'expo-router';

import { CrisisScreen } from '../../features/care/crisis-screen';
import { phoneRegion } from '../../features/care/helpline-cards';
import { useBoard } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';

/** The helplines, opened from Settings: the crisis screen's page, with a way back. */
export default function Helplines() {
  const router = useRouter();
  const board = useBoard();
  return (
    <CrisisScreen
      kind="helplines"
      region={phoneRegion()}
      now={board.now.at}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
