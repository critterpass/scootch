import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Attitude } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import type { ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { RiseIn } from '../../ui/motion/rise-in';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ComposerView } from '../composer/composer-view';
import { StepDots } from '../launch/launch-page';
import { ChargeNote } from '../plus/charge-note';

import { HeardWords } from './heard-words';
import { Corners } from './one-screen-corners';
import { OneScreenFigure } from './one-screen-figure';
import { DOCK_BOTTOM, frameOfShown, GUTTER } from './one-screen-frame';
import { chargeNoteShows } from './one-screen-stage';
import { Chips, TaskSetChoices, WorldRow } from './one-screen-panels';
import type { OneScreenShown } from './one-screen-shown';

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
  /** A tap on Scootch, where he is drawn alone. */
  readonly onSqueak?: () => void;
  /** Drawn over the screen: the drawer. */
  readonly overlay?: ReactNode;
  readonly shown: OneScreenShown;
  /** The last thing asked of the app went wrong: said in one plain line. */
  readonly failed?: boolean;
}

/** How far the screen must be pulled down before it counts as meant. */
const PULL_POINTS = 90;

/** The one screen: one critter, one sentence, one action, with a quiet button in each top corner. */
export function OneScreenView({
  mood,
  attitude,
  line,
  offline,
  onMore,
  onWorld,
  onPull,
  onSqueak,
  overlay = null,
  shown,
  failed = false,
}: OneScreenViewProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
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
  if (shown.kind === 'composer') {
    const { composer, warmUp } = shown;
    const { state } = composer;
    const recording = state.phase === 'listening' || state.phase === 'finishing';
    const heard = recording && state.transcript !== '';
    const anything = heard || ((warmUp ?? shown.ways) && !recording) || shown.notificationsOff;
    body = !anything ? null : (
      <>
        {heard ? <HeardWords transcript={state.transcript} /> : null}
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
        <ComposerView {...composer} />
      </>
    );
  } else if (shown.kind === 'task_set') {
    const {
      taskText,
      onStart,
      label = null,
      startLabel,
      extra = null,
      figure: _,
      ...choices
    } = shown;
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
        <TaskSetChoices {...choices} />
        {extra === null ? null : <View style={styles.inset}>{extra}</View>}
      </>
    );
    footer = (
      <GlassSurface style={styles.dock}>
        <CapsuleButton
          label={startLabel ?? t('session.start')}
          hint={t('taskSet.start.hint', { minutes: choices.minutes })}
          disabled={onStart === null}
          onPress={onStart ?? (() => undefined)}
          testID="one-action"
        />
      </GlassSurface>
    );
  } else if (shown.kind === 'done') {
    const waiting = shown.waiting ?? null;
    body =
      waiting === null ? null : (
        <>
          {note(t('done.waiting'), 'done-waiting-label')}
          <Text
            testID="done-waiting"
            accessibilityLabel={`${t('done.waiting')}: ${waiting}`}
            allowFontScaling={allowFontScaling}
            style={[styles.heard, { color: palette.ink, fontSize: size(HEARD_SIZE) }]}
          >
            {waiting}
          </Text>
        </>
      );
    footer = onWorld ? (
      <>
        <WorldRow onPress={onWorld} />
        {shown.under}
      </>
    ) : null;
  } else if (shown.kind === 'panel') {
    body = shown.body;
    footer = shown.footer;
  }
  const figure = 'figure' in shown ? shown.figure : undefined;
  const testName = shown.kind === 'panel' ? shown.name : shown.kind;
  const frame = frameOfShown(shown, mood === 'thinking');

  // A heavy task gets no squeak: nothing plays around it.
  const squeak = mood === 'serious' ? undefined : onSqueak;
  // The dock stands 30 points off the bottom of the screen, as the boards draw it, whatever the
  // home bar takes; over the keyboard it sits just above the keys.
  const dockBottom = keyboardOpen ? DOCK_OVER_KEYBOARD : DOCK_BOTTOM - insets.bottom;
  return (
    <SafeFrame
      testID={`one-screen-${testName}`}
      style={[styles.page, { backgroundColor: palette.page }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        <Corners
          offline={offline}
          {...(onWorld ? { onWorld } : {})}
          {...(onMore ? { onMore } : {})}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onScrollEndDrag={(event) => {
            if (event.nativeEvent.contentOffset.y <= -PULL_POINTS) onPull?.();
          }}
        >
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
        </ScrollView>
        {footer === null ? null : (
          <RiseIn
            key={testName}
            index={2}
            style={[
              styles.footer,
              shown.kind === 'done' && styles.footerDone,
              { marginBottom: dockBottom },
            ]}
          >
            {footer}
          </RiseIn>
        )}
      </KeyboardAvoidingView>
      {overlay}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.md,
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
  footerDone: {
    gap: 10,
  },
  heard: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  note: {
    fontFamily: fonts.body,
  },
  dock: {
    borderRadius: 34,
    padding: 7,
    overflow: 'hidden',
  },
});
