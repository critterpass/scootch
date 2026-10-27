import type { SkTypeface } from '@shopify/react-native-skia';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

import type { PhuMood } from '@phusclass/art/class';

import { useHandFont } from '../../classroom/use-hand-font';
import type { Frame } from '../../ui/motion/hand-off';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useMayMove } from '../../ui/motion/use-feel';
import { GLIDE_MS } from '../../ui/fold/use-glide';

import { BoardPage, LedgeHandle } from './board-page';
import type { RowAction } from './board-row';
import type { BoardRow } from './board-rows';
import { useBoardPage } from './use-board-page';

const TIMETABLE = '/timetable' as Href;
const LOGBOOK = '/logbook' as Href;
/** The board follows the device widening by a beat (the Duo board's +70 ms). */
const BEAT_MS = 70;

/** What the page shows when it is given rather than read from the phone's board (a capture). */
export interface BoardPaneData {
  readonly rows: readonly BoardRow[];
  readonly dateLine: string;
  readonly remark: string | null;
  readonly mood: PhuMood;
}

interface Shown extends BoardPaneData {
  readonly stillYours: Readonly<Record<string, string>>;
  readonly hand: SkTypeface | null;
  readonly onAction: (id: string, action: RowAction) => void;
  readonly onReword: (id: string, text: string) => void;
}

const noop = () => undefined;

/**
 * The board as the left page beside the desk, on iPhone Duo opened out: the chalkboard taken off
 * the wall in its wooden frame, the same board as its own screen, sliding in from the left a beat
 * after the device widens and leaving first when it closes. It reads the phone's board; a
 * registry capture gives it the state's own board instead, so the page and the desk agree.
 */
export function BoardPane({
  frame,
  data,
}: {
  readonly frame: Frame;
  readonly data?: BoardPaneData;
}) {
  return data ? <GivenPane frame={frame} data={data} /> : <LivePane frame={frame} />;
}

function LivePane({ frame }: { readonly frame: Frame }) {
  const page = useBoardPage();
  if (page.crisis) return null;
  return <PaneView frame={frame} shown={page} />;
}

function GivenPane({ frame, data }: { readonly frame: Frame; readonly data: BoardPaneData }) {
  const hand = useHandFont();
  return (
    <PaneView
      frame={frame}
      shown={{ ...data, stillYours: {}, hand, onAction: noop, onReword: noop }}
    />
  );
}

function PaneView({ frame, shown }: { readonly frame: Frame; readonly shown: Shown }) {
  const router = useRouter();
  const mayMove = useMayMove();
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
          rows={shown.rows}
          dateLine={shown.dateLine}
          remark={shown.remark}
          stillYours={shown.stillYours}
          mood={shown.mood}
          hand={shown.hand}
          onAction={shown.onAction}
          onReword={shown.onReword}
          onLogbook={() => router.push(LOGBOOK)}
          onTimetable={() => router.push(TIMETABLE)}
          ledge={<LedgeHandle />}
          page
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
