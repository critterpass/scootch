import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Attitude } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import type { ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { FadeAway } from '../../ui/motion/fade-away';
import { PressSpring } from '../../ui/motion/press-spring';
import { RiseIn } from '../../ui/motion/rise-in';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ComposerHintLayer } from '../composer/composer-hint-layer';
import { ComposerView } from '../composer/composer-view';
import { StepDots } from '../launch/launch-page';
import { ChargeNote } from '../plus/charge-note';

import { HeardWords } from './heard-words';
import { Corners } from './one-screen-corners';
import { OneScreenFigure } from './one-screen-figure';
import { dockGap, frameOfShown, GUTTER } from './one-screen-frame';
import { chargeNoteShows } from './one-screen-stage';
import { Chips, TaskSetChoices, WorldRow } from './one-screen-panels';
import type { OneScreenShown } from './one-screen-shown';
import { StageScroll } from './stage-scroll';
import { choicesOf, TaskSetFooter } from './task-set-footer';

export type { OneScreenShown } from './one-screen-shown';
import { SafeFrame } from '../../ui/safe-frame';

const HEARD_SIZE = 22;
const NOTE_SIZE = 15;
/** With the keyboard up the dock sits just above it. */
const DOCK_OVER_KEYBOARD = 8;

export interface OneScreenViewProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: Attitude;
  /** Scootch's sentence, from the day store or the offline pack; `null` when he says nothing. */
  readonly line: string | null;
  readonly offline: boolean;
  /** Opens Settings. Unset, the more button is drawn and does nothing. */
  readonly onMore?: () => void;
  /** Opens the world. Unset, the button is drawn and does nothing. */
  readonly onWorld?: () => void;
  /** The person pulled the screen down on purpose: the drawer's own gesture. */
  readonly onPull?: () => void;
  /** True for the moment the screen shows its own pull, to say the drawer is there. */
  readonly pullNudge?: boolean;
  /** A tap on Scootch, where he is drawn alone. */
  readonly onSqueak?: () => void;
  /** Drawn over the screen: the drawer. */
  readonly overlay?: ReactNode;
  readonly shown: OneScreenShown;
  /** The last thing asked of the app went wrong: said in one plain line. */
  readonly failed?: boolean;
}

/** The one screen: one critter, one sentence, one action, with a quiet button in each top corner. */
export function OneScreenView({
  mood,
  attitude,
  line,
  offline,
  onMore,
  onWorld,
  onPull,
  pullNudge = false,
  onSqueak,
  overlay = null,
  shown,
  failed = false,
}: OneScreenViewProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const [composerHeight, setComposerHeight] = useState(0);
  const note = (text: string, testID: string) => (
    <Text
      testID={testID}
      allowFontScaling={allowFontScaling}
      style={[styles.note, { color: palette.muted, fontSize: size(NOTE_SIZE) }]}
    >
      {text}
    </Text>
  );

  let body: ReactNode = null;
  let footer: ReactNode = null;
  let banner: ReactNode = null;
  if (shown.kind === 'composer') {
    const { composer, warmUp, home } = shown;
    const { state } = composer;
    const recording = state.phase === 'listening' || state.phase === 'finishing';
    const heard = recording && state.transcript !== '';
    // Home's own parts keep the screen only while the composer is at rest: a hold, the keyboard,
    // words in the field or a wait for Scootch each take it over.
    const typing = state.mode === 'typing' && (keyboardOpen || state.text.trim() !== '');
    const atRest =
      state.phase === 'idle' && !typing && !composer.thinking && !composer.notUnderstood;
    const waiting = home && atRest ? home.waiting : null;
    const startsNote = home && atRest ? home.startsNote : null;
    // Who is at a table sits under the header, and steps aside with the rest of home.
    banner =
      home?.company === undefined ? null : <FadeAway shown={atRest}>{home.company}</FadeAway>;
    const anything =
      heard ||
      ((warmUp ?? shown.ways) && !recording) ||
      shown.notificationsOff ||
      waiting !== null ||
      startsNote !== null;
    body = !anything ? null : (
      <>
        {heard ? <HeardWords transcript={state.transcript} /> : null}
        {waiting === null ? null : (
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('done.tomorrow', { task: waiting })}
            accessibilityHint={t('done.waiting.hint')}
            disabled={home?.onWaiting === undefined}
            onPress={home?.onWaiting}
            hitSlop={10}
            testID="done-waiting-row"
          >
            <Text
              testID="done-waiting"
              numberOfLines={1}
              allowFontScaling={allowFontScaling}
              style={[styles.note, { color: palette.muted, fontSize: size(NOTE_SIZE) }]}
            >
              {t('done.tomorrow', { task: waiting })}
            </Text>
          </PressSpring>
        )}
        {startsNote === null ? null : note(startsNote, 'starts-note')}
        {warmUp && !recording ? (
          <Chips
            chips={warmUp.chips}
            disabled={state.phase !== 'idle' || composer.thinking}
            onChip={warmUp.onChip}
          />
        ) : null}
        {shown.ways && !recording ? (
          <>
            {shown.ways.note === null ? null : note(shown.ways.note, 'quiet-note')}
            <Chips
              chips={shown.ways.chips}
              disabled={state.phase !== 'idle' || composer.thinking}
              onChip={shown.ways.onChip}
              hint={shown.ways.hint}
              testPrefix="way-chip"
            />
          </>
        ) : null}
        {shown.notificationsOff ? note(t('launch.notificationsOff'), 'notifications-off') : null}
      </>
    );
    footer = (
      <>
        {warmUp ? <StepDots step={4} /> : null}
        {home?.onWorldCardAway && onWorld ? (
          <FadeAway shown={atRest}>
            <WorldRow onPress={onWorld} onAway={home.onWorldCardAway} />
          </FadeAway>
        ) : null}
        <View onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}>
          <ComposerView {...composer} />
        </View>
      </>
    );
  } else if (shown.kind === 'task_set') {
    const { taskText, label = null, company = null, extra = null } = shown;
    body = (
      <>
        {label === null && taskText === null ? null : (
          <View style={styles.inset}>
            {label === null ? null : note(label, 'task-label')}
            {taskText === null ? null : (
              <Text
                testID="task-text"
                accessibilityLabel={`${t('oneScreen.yourTask')}: ${taskText}`}
                allowFontScaling={allowFontScaling}
                style={[styles.heard, { color: palette.ink, fontSize: size(HEARD_SIZE) }]}
              >
                {taskText}
              </Text>
            )}
          </View>
        )}
        <TaskSetChoices {...choicesOf(shown)} />
        {company}
        {extra}
      </>
    );
    footer = <TaskSetFooter shown={shown} />;
  } else if (shown.kind === 'panel') {
    body = shown.body;
    footer = shown.footer;
  }
  const figure = 'figure' in shown ? shown.figure : undefined;
  const testName = shown.kind === 'panel' ? shown.name : shown.kind;
  const frame = frameOfShown(shown, mood === 'thinking');

  // A heavy task gets no squeak: nothing plays around it.
  const squeak = mood === 'serious' ? undefined : onSqueak;
  // The board's 30 points under the dock, never less than the home bar's own clear space; over
  // the keyboard the dock sits just above the keys.
  const dockBottom = keyboardOpen ? DOCK_OVER_KEYBOARD : dockGap(insets.bottom);
  return (
    <SafeFrame
      testID={`one-screen-${testName}`}
      style={[styles.page, { backgroundColor: palette.page }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        {/* One box inside the keyboard's padding: what is placed from its bottom stays above the keys. */}
        <View style={styles.page}>
          <Corners
            offline={offline}
            {...(onWorld ? { onWorld } : {})}
            {...(onMore ? { onMore } : {})}
          />
          <StageScroll onPull={onPull} nudge={pullNudge}>
            {banner}
            <OneScreenFigure
              frame={frame}
              mood={mood}
              attitude={attitude}
              line={line}
              figure={figure}
              onPress={squeak}
            />
            {failed ? (
              <View style={styles.words}>{note(t('oneScreen.failed'), 'one-screen-failed')}</View>
            ) : null}
            {/* A new stage rises in under Scootch, who stays where he is. */}
            {body === null ? null : (
              <RiseIn
                key={testName}
                index={1}
                style={[
                  styles.body,
                  shown.kind === 'task_set' ? styles.choices : styles.words,
                  // With nothing said above it, the body stands where the board puts the words.
                  line === null && shown.kind !== 'task_set' && { marginTop: frame.textTop },
                ]}
              >
                {body}
              </RiseIn>
            )}
            {/* Said beside nothing else: never during a task, a pick or a hatch. */}
            {chargeNoteShows(shown.kind) ? (
              <View style={styles.words}>
                <ChargeNote />
              </View>
            ) : null}
          </StageScroll>
          {footer === null ? null : (
            <RiseIn key={testName} index={2} style={[styles.footer, { marginBottom: dockBottom }]}>
              {footer}
            </RiseIn>
          )}
          {shown.kind === 'composer' && composerHeight > 0 ? (
            <ComposerHintLayer {...shown.composer} composerTop={dockBottom + composerHeight} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      {overlay}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  words: {
    paddingHorizontal: GUTTER.words,
    marginTop: 12,
  },
  choices: {
    paddingHorizontal: GUTTER.choices,
    marginTop: 16,
  },
  body: {
    gap: 12,
  },
  inset: {
    paddingHorizontal: GUTTER.words - GUTTER.choices,
    gap: 12,
  },
  footer: {
    paddingHorizontal: GUTTER.dock,
    gap: 18,
  },
  heard: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  note: {
    fontFamily: fonts.body,
  },
});
