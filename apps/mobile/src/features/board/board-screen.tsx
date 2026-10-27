import { useRouter, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { goBack } from '../../ui/motion/go-back';
import { boardIsPage } from '../../ui/fold/fold-layout';
import { useFold } from '../../ui/fold/use-fold';
import { isoWeek } from '../logbook/logbook-rows';

import { useBoardGrow } from './board-grow';
import { BoardPage, LedgeHandle } from './board-page';
import { CHALK } from './chalk';
import { LogbookPreview, useLogbookPull } from './logbook-preview';
import { useBoardPage } from './use-board-page';

/** The timetable sheet's route, built with tuition. */
const TIMETABLE = '/timetable' as Href;

/**
 * The board route. It grows out of the chalkboard on the desk, following the desk's pull while
 * the finger is down and springing open or back when it lets go; the ledge pushes it back up. A
 * pull down on its header lowers the logbook page from the top.
 *
 * On iPhone Duo opened out, the board hangs as the desk's left page instead: the route gives way
 * to the desk underneath, which shows the same board where it was scrolled to.
 */
export function BoardScreen() {
  const page = useBoardPage();
  const t = useT();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const grow = useBoardGrow(width, height);
  const logbook = useLogbookPull();
  const fold = useFold();
  const asPage = boardIsPage(fold.pose);

  useEffect(() => {
    if (asPage) goBack(router, '/');
  }, [asPage, router]);

  if (page.crisis) return <View style={styles.crisis} />;

  const header = (children: ReactNode) => (
    <GestureDetector gesture={logbook.headerPan}>
      <Animated.View style={logbook.headerFollows}>{children}</Animated.View>
    </GestureDetector>
  );

  return (
    <View style={styles.fill} testID="board-screen">
      <Animated.View style={[styles.clip, grow.clip]}>
        <Animated.View style={[{ width, height }, grow.inner]}>
          <BoardPage
            rows={page.rows}
            dateLine={page.dateLine}
            remark={page.remark}
            stillYours={page.stillYours}
            mood={page.mood}
            hand={page.hand}
            onAction={page.onAction}
            onReword={page.onReword}
            onLogbook={logbook.open}
            onTimetable={() => router.push(TIMETABLE)}
            header={header}
            contentStyle={grow.content}
            ledge={
              <GestureDetector gesture={grow.ledgePan}>
                <Pressable
                  testID="board-close"
                  accessibilityRole="button"
                  accessibilityLabel={t('board.close')}
                  accessibilityHint={t('board.close.hint')}
                  onPress={grow.close}
                >
                  <LedgeHandle />
                </Pressable>
              </GestureDetector>
            }
          />
          <LogbookPreview rows={page.logRows} week={isoWeek(page.today)} hand={page.hand} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  crisis: {
    flex: 1,
    backgroundColor: CHALK.board,
  },
  clip: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
