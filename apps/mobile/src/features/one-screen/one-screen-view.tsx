import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import type { ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { ScootchSays } from '../../ui/scootch-says';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ComposerView, type ComposerViewProps } from '../composer/composer-view';
import { StepDots } from '../launch/launch-page';
import { ChargeNote } from '../plus/charge-note';

import { Corners } from './one-screen-corners';
import { chargeNoteShows } from './one-screen-stage';
import { Chips, TaskSetChoices, WorldRow, type TaskSetChoicesProps } from './one-screen-panels';
import { SafeFrame } from '../../ui/safe-frame';

const HEARD_SIZE = 22;
const NOTE_SIZE = 15;

/** What the screen is showing under Scootch and his sentence. */
export type OneScreenShown =
  | {
      readonly kind: 'composer';
      readonly composer: ComposerViewProps;
      /** The first ask after first launch: the example chips and the last step mark. */
      readonly warmUp: {
        readonly chips: readonly string[];
        readonly onChip: (text: string) => void;
      } | null;
      /** Said once, straight after the system's prompt was refused, and never again. */
      readonly notificationsOff: boolean;
      /** Small ways in under the ask: the three chips of a return, or "pick for me". */
      readonly ways?: {
        readonly chips: readonly string[];
        readonly onChip: (text: string) => void;
        readonly hint: string;
        /** A dated thing that is close, said quietly beside the ask. */
        readonly note: string | null;
      };
    }
  | ({
      readonly kind: 'task_set';
      /** The person's own words for the task, shown when Scootch has no line about it yet. */
      readonly taskText: string | null;
      readonly onStart: () => void;
      /** A small line above the task: a morning's greeting, or the plain words of a serious task. */
      readonly label?: string | null;
      /** The label of the one action, when it is not the plain "Start". */
      readonly startLabel?: string;
      /** Quiet controls under the choices: "Not now", "Something else". */
      readonly extra?: ReactNode;
      /** Drawn in place of Scootch alone, when the task's monster stands beside him. */
      readonly figure?: ReactNode;
    } & TaskSetChoicesProps)
  /** A state drawn by its own feature: the one thing, the hatch, a counter-offer. */
  | {
      readonly kind: 'panel';
      /** Names the state in its test id. */
      readonly name: string;
      /** Drawn in place of Scootch and his sentence, when the state has its own figure. */
      readonly figure?: ReactNode;
      readonly body: ReactNode;
      readonly footer: ReactNode;
    }
  | {
      readonly kind: 'done';
      /** The task carried on to tomorrow, said plainly while the day rests. */
      readonly waiting?: string | null;
      /** Drawn under the world row: "One more". */
      readonly under?: ReactNode;
    }
  /** Nothing is asked and nothing is offered. */
  | { readonly kind: 'quiet' };

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
  /** Drawn over the screen: the drawer. */
  readonly overlay?: ReactNode;
  readonly shown: OneScreenShown;
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
  overlay = null,
  shown,
}: OneScreenViewProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
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
    body = (
      <>
        {recording && state.transcript !== '' ? (
          <Text
            testID="composer-heard"
            accessibilityLiveRegion="polite"
            allowFontScaling={allowFontScaling}
            style={[styles.heard, { color: palette.ink, fontSize: size(HEARD_SIZE) }]}
          >
            {state.transcript}
          </Text>
        ) : null}
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
        <TaskSetChoices {...choices} />
        {extra}
      </>
    );
    footer = (
      <GlassSurface style={styles.dock}>
        <CapsuleButton
          label={startLabel ?? t('session.start')}
          hint={t('taskSet.start.hint', { minutes: choices.minutes })}
          onPress={onStart}
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
          {figure === undefined ? (
            <ScootchSays mood={mood} attitude={attitude} line={line} />
          ) : (
            <>
              {figure}
              {line === null ? null : (
                <Text
                  testID="one-sentence"
                  allowFontScaling={allowFontScaling}
                  style={[styles.heard, { color: palette.ink, fontSize: size(HEARD_SIZE) }]}
                >
                  {line}
                </Text>
              )}
            </>
          )}
          {body}
          {/* Said beside nothing else: never during a task, a pick or a hatch. */}
          {chargeNoteShows(shown.kind) ? <ChargeNote /> : null}
        </ScrollView>
        {footer === null ? null : <View style={styles.footer}>{footer}</View>}
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
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
