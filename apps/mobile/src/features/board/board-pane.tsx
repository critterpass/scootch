import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

import type { Frame } from '../../ui/motion/hand-off';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useMayMove } from '../../ui/motion/use-feel';
import { GLIDE_MS } from '../../ui/fold/use-glide';

import { BoardPage, LedgeHandle } from './board-page';
import { useBoardPage } from './use-board-page';

const TIMETABLE = '/timetable' as Href;
const LOGBOOK = '/logbook' as Href;
/** The board follows the device widening by a beat (the Duo board's +70 ms). */
const BEAT_MS = 70;

/**
 * The board as the left page beside the desk, on iPhone Duo opened out: the chalkboard taken off
 * the wall in its wooden frame, the same board as its own screen, sliding in from the left a beat
 * after the device widens and leaving first when it closes.
 */
export function BoardPane({ frame }: { readonly frame: Frame }) {
  const page = useBoardPage();
  const router = useRouter();
  const mayMove = useMayMove();
  if (page.crisis) return null;
  const entering = mayMove
    ? SlideInLeft.delay(BEAT_MS).duration(GLIDE_MS).easing(SPRING_CURVE)
    : FadeIn.duration(CROSSFADE_MS);
  const exiting = mayMove
    ? SlideOutLeft.duration(GLIDE_MS).easing(SPRING_CURVE)
    : FadeOut.duration(CROSSFADE_MS);
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      testID="board-pane"
      style={[
        styles.frame,
        { left: frame.x, top: frame.y, width: frame.width, height: frame.height },
      ]}
    >
      <View style={styles.board}>
        <BoardPage
          rows={page.rows}
          dateLine={page.dateLine}
          remark={page.remark}
          stillYours={page.stillYours}
          mood={page.mood}
          hand={page.hand}
          onAction={page.onAction}
          onReword={page.onReword}
          onLogbook={() => router.push(LOGBOOK)}
          onTimetable={() => router.push(TIMETABLE)}
          ledge={<LedgeHandle />}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    borderRadius: 24,
    backgroundColor: '#8A5A36',
    padding: 10,
    boxShadow: '0 2px 0 #6E4528, 0 22px 44px rgba(40,25,10,0.32)',
    zIndex: 2,
  },
  board: { flex: 1, borderRadius: 15, overflow: 'hidden' },
});
