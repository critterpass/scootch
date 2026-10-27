import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Carving, Framing, PhuMood } from '@phusclass/art/class';
import type { Happening } from '@phusclass/domain/board';

import { Classroom } from '../../classroom/classroom';
import { useT } from '../../i18n/i18n-provider';
import { useBoard } from '../../state/board-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { buttonText, ink, shapes } from '../desk/class-style';
import { SpeechBubble } from '../desk/speech-bubble';
import { ShareButton } from '../share/share-button';
import { foldRoom } from '../../ui/fold/fold-camera';
import { foldRoomStyle } from '../../ui/fold/fold-sheet';
import { SideControls } from '../../ui/fold/side-controls';
import { useFold } from '../../ui/fold/use-fold';
import { duoBubble } from '../desk/duo-places';

import { DrumBurst } from './drum-burst';
import { Confetti, FinishPaper, type FinishPaperProps } from './finish-paper';
import { HappeningScene } from './happening-scene';
import { PartialPanel } from './partial-panel';
import { SessionSheet } from './session-sheet';
import { SessionWorking } from './session-working';
import type { SessionClock } from './session-model';
import type { SessionChalk } from './use-session-chalk';

export type SessionPanel = 'working' | 'partial' | 'note' | 'finish';

export interface SessionViewProps {
  readonly framing: Framing;
  readonly mood: PhuMood;
  readonly pace: boolean;
  readonly line: string | null;
  readonly title: string;
  /** The chalkboard behind him, as on the desk. */
  readonly chalkboard: SessionChalk;
  readonly heavy: boolean;
  /** Plain company after a crisis: no grade, burst, share or "started in time". */
  readonly plain?: boolean;
  readonly clock: SessionClock | null;
  readonly panel: SessionPanel;
  readonly finish: (FinishPaperProps & { readonly recessOffered: boolean }) | null;
  readonly carvings: readonly Carving[];
  readonly happening: Happening | null;
  readonly drum: boolean;
  /** "Say it" for a stray thought, while it is open. */
  readonly stray: ReactNode;
  readonly note: string;
  readonly onNote: (note: string) => void;
  readonly onRaiseHand: () => void;
  readonly onStray: () => void;
  readonly onDone: () => void;
  readonly onNotYet: () => void;
  readonly onAnother: () => void;
  readonly onBackOnBoard: () => void;
  readonly onSaveNote: () => void;
  readonly onErase: () => void;
  readonly onClosePartial: () => void;
  readonly onNext: () => void;
  readonly onRecess: () => void;
}

/**
 * A period: the camera pulled back to the whole room while he paces and grades, the time left,
 * raise a hand, a stray thought, then the drum and "Done?". Done brings the camera in to the
 * graded paper; Not yet gives partial credit. Drawn from props only, for the registry.
 */
export function SessionView(props: SessionViewProps) {
  const t = useT();
  const sizing = useTextSizing();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // On iPhone Duo the room and the card take the pose's places; the period runs on.
  const fold = useFold();
  const duo = fold.sheet !== null;
  const room = foldRoom(fold);
  const { clock, panel } = props;
  // The finish being shown is the store's last one; its share button checks the guard itself.
  const finishedId = useBoard().lastFinish?.task.id ?? null;

  const working = (
    <SessionWorking
      title={props.title}
      clock={clock}
      heavy={props.heavy}
      {...(props.plain !== undefined ? { plain: props.plain } : {})}
      stray={props.stray}
      duo={duo}
      onRaiseHand={props.onRaiseHand}
      onStray={props.onStray}
      onDone={props.onDone}
      onNotYet={props.onNotYet}
    />
  );

  const partial = <PartialPanel {...props} which="choices" />;
  const note = <PartialPanel {...props} which="note" />;

  const finish =
    props.finish === null ? null : (
      <View style={styles.panel} testID="session-finish">
        <FinishPaper
          title={props.finish.title}
          comment={props.finish.comment}
          waitedDays={props.finish.waitedDays}
          tookMinutes={props.finish.tookMinutes}
        />
        <View style={styles.finishButtons}>
          {finishedId !== null && !props.heavy && props.plain !== true ? (
            <ShareButton
              logEntryId={finishedId}
              label={t('share.open')}
              color={ink.text}
              style={[shapes.button, shapes.soft, styles.share]}
              testID="finish-share"
            />
          ) : null}
          {props.finish.recessOffered ? (
            <PressSpring
              testID="finish-recess"
              feedback="choice"
              accessibilityRole="button"
              onPress={props.onRecess}
              style={[shapes.button, shapes.soft]}
            >
              <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.soft}>
                {t('finish.recess')}
              </Text>
            </PressSpring>
          ) : null}
          <PressSpring
            testID="finish-next"
            feedback="primary"
            accessibilityRole="button"
            onPress={props.onNext}
            style={[shapes.button, shapes.ink, styles.grow]}
          >
            <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
              {t('finish.next')}
            </Text>
          </PressSpring>
        </View>
      </View>
    );

  return (
    <View style={styles.fill} testID="session">
      {/* The room starts below the status bar, as on the desk; the wall fills above it. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wall]} />
      <Classroom
        style={[styles.room, duo ? foldRoomStyle(fold, 0) : { top: insets.top }]}
        framing={props.framing}
        {...(room ? { composition: room.composition, camera: room.camera } : {})}
        mood={props.mood}
        pace={props.pace}
        chalk={props.chalkboard.chalk}
        date={props.chalkboard.date}
        more={props.chalkboard.more}
        carvings={props.carvings}
        {...(props.line !== null ? { accessibilityLabel: props.line } : {})}
      />
      {props.heavy ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.quiet]} />
      ) : null}
      {props.happening !== null ? <HappeningScene happening={props.happening} /> : null}
      {panel === 'finish' && props.finish?.comment != null ? <Confetti /> : null}
      {props.line !== null && props.line !== '' ? (
        <SpeechBubble
          text={props.line}
          place={props.framing === 'desk' ? 'desk' : 'room'}
          top={insets.top}
          {...(duo ? { at: duoBubble(fold, room?.camera) } : {})}
        />
      ) : null}
      <SessionSheet panel={panel} fold={fold}>
        {panel === 'finish'
          ? finish
          : panel === 'partial'
            ? partial
            : panel === 'note'
              ? note
              : working}
      </SessionSheet>
      <SideControls
        layout={fold}
        onBoard={() => router.push('/board')}
        onTimetable={() => router.push('/timetable')}
        onLogbook={() => router.push('/logbook')}
        onSettings={() => router.push('/settings')}
        {...(panel === 'working' ? { tell: { onTap: props.onStray } } : {})}
      />
      {props.drum ? <DrumBurst /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  share: { width: 56, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, backgroundColor: '#E8D2AE' },
  wall: { backgroundColor: '#FFF1DC' },
  room: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quiet: { backgroundColor: ink.grey },
  panel: { gap: 10 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  taskTitle: { fontWeight: '600', color: ink.text, letterSpacing: -0.2, marginTop: -4 },

  buttons: { gap: 10, marginTop: 14 },
  pair: { flexDirection: 'row', gap: 10 },
  small: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
  finishButtons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  grow: { flex: 1 },
});
