import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { useCareGuard } from '../care/use-care-guard';
import { isoWeek, logbookRows } from '../logbook/logbook-rows';

import { boardControls } from './board-controls';
import { useBoardGrow } from './board-grow';
import { BoardPage, LedgeHandle } from './board-page';
import type { RowAction } from './board-row';
import { boardDateLine, boardRows } from './board-rows';
import { CHALK } from './chalk';
import { LogbookPreview, useLogbookPull } from './logbook-preview';
import { useSay } from './use-say';

/** The timetable sheet's route, built with tuition. */
const TIMETABLE = '/timetable' as Href;

/**
 * The board route. It grows out of the chalkboard on the desk, following the desk's pull while
 * the finger is down and springing open or back when it lets go; the ledge pushes it back up. A
 * pull down on its header lowers the logbook page from the top.
 */
export function BoardScreen() {
  const crisis = useCareGuard();
  const snapshot = useBoard();
  const store = useBoardStore();
  const say = useSay();
  const controls = useMemo(() => boardControls(store, say), [store, say]);
  const t = useT();
  const { language } = useLanguage();
  const hand = useHandFont();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const grow = useBoardGrow(width, height);
  const logbook = useLogbookPull();
  const [remark, setRemark] = useState<string | null>(null);

  // His remark as the board opens, once per opening: the long board (once a day) or the empty one.
  useEffect(() => {
    let current = true;
    void controls.opened().then((line) => {
      if (current && line !== null) setRemark(line);
    });
    return () => {
      current = false;
    };
  }, []);

  // "Still yours?" is put once; the store remembers it was.
  const asking = snapshot.stillYours?.id ?? null;
  useEffect(() => {
    if (asking !== null) void controls.asked(asking);
  }, [asking, controls]);

  const rows = useMemo(
    () =>
      boardRows(snapshot.board, snapshot.faded, snapshot.now, language, {
        today: t('board.today'),
      }),
    [snapshot.board, snapshot.faded, snapshot.now, language, t],
  );

  // His question under each old row, chosen once per row while the board is open.
  const questions = useRef(new Map<string, string>());
  const stillYours: Record<string, string> = {};
  for (const row of rows) {
    if (!row.faded) continue;
    let line = questions.current.get(row.id);
    if (line === undefined) {
      line = say('boardStillYours', row.id, { task: row.text }) ?? '';
      questions.current.set(row.id, line);
    }
    if (line !== '') stillYours[row.id] = line;
  }

  const onAction = (id: string, action: RowAction) => {
    if (action === 'desk') {
      void controls.swap(id).then((line) => {
        if (line !== null) setRemark(line);
      });
    } else if (action === 'tick') void controls.tick(id);
    else if (action === 'erase') void controls.erase(id);
    else if (action === 'keep') void controls.keep(id);
    else if (action === 'letGo') void controls.letGo(id);
  };

  const today = snapshot.now.day;
  const logRows = useMemo(
    () =>
      logbookRows(snapshot.logbook, today, language, {
        minutes: (minutes) => t('logbook.minutes', { minutes }),
        ticked: t('logbook.ticked'),
        certificate: t('logbook.certificate'),
      }),
    [snapshot.logbook, today, language, t],
  );

  if (crisis) return <View style={styles.crisis} />;

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
            rows={rows}
            dateLine={boardDateLine(today, language)}
            remark={remark}
            stillYours={stillYours}
            mood={snapshot.desk?.heavy === true ? 'serious' : 'over'}
            hand={hand}
            onAction={onAction}
            onReword={(id, text) => void controls.reword(id, text)}
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
          <LogbookPreview rows={logRows} week={isoWeek(today)} hand={hand} />
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
