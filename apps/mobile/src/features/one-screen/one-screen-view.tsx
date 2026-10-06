import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Attitude } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import type { ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, RoundButton } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { MoreIcon, WorldIcon } from '../../ui/icons';
import { ScootchSays } from '../../ui/scootch-says';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ComposerView, type ComposerViewProps } from '../composer/composer-view';
import { StepDots } from '../launch/launch-page';

import { Chips, TaskSetChoices, WorldRow, type TaskSetChoicesProps } from './one-screen-panels';

const HEARD_SIZE = 22;
const NOTE_SIZE = 15;
const PILL_SIZE = 14;

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
    }
  | ({
      readonly kind: 'task_set';
      /** The person's own words for the task, shown when Scootch has no line about it yet. */
      readonly taskText: string | null;
      readonly onStart: () => void;
    } & TaskSetChoicesProps)
  | { readonly kind: 'done' }
  /** Nothing is asked and nothing is offered. */
  | { readonly kind: 'quiet' };

export interface OneScreenViewProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: Attitude;
  /** Scootch's sentence, from the day store or the offline pack; `null` when he says nothing. */
  readonly line: string | null;
  readonly offline: boolean;
  /** Opens the developer tools in the developer app. Unset, the more button does nothing yet. */
  readonly onDeveloperTools?: () => void;
  readonly shown: OneScreenShown;
}

/** The one screen: one critter, one sentence, one action, with a quiet button in each top corner. */
export function OneScreenView({
  mood,
  attitude,
  line,
  offline,
  onDeveloperTools,
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
    const { taskText, onStart, ...choices } = shown;
    body = (
      <>
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
      </>
    );
    footer = (
      <GlassSurface style={styles.dock}>
        <CapsuleButton
          label={t('session.start')}
          hint={t('taskSet.start.hint', { minutes: choices.minutes })}
          onPress={onStart}
          testID="one-action"
        />
      </GlassSurface>
    );
  } else if (shown.kind === 'done') {
    footer = <WorldRow />;
  }

  return (
    <SafeAreaView
      testID={`one-screen-${shown.kind}`}
      style={[styles.page, { backgroundColor: palette.page }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        <View style={styles.corners}>
          <RoundButton
            label={t('oneScreen.world')}
            hint={t('oneScreen.notOpenYet')}
            inert
            testID="world-button"
          >
            <WorldIcon color={palette.ink} accent={palette.tomato} ground={palette.risoBlob} />
          </RoundButton>
          {offline ? (
            <GlassSurface style={styles.pill}>
              <View style={styles.pillRow}>
                <View style={[styles.pillDot, { backgroundColor: palette.muted }]} />
                <Text
                  testID="offline"
                  allowFontScaling={allowFontScaling}
                  style={[styles.pillText, { color: palette.ink, fontSize: size(PILL_SIZE) }]}
                >
                  {t('oneScreen.offline')}
                </Text>
              </View>
            </GlassSurface>
          ) : null}
          <RoundButton
            label={t('oneScreen.more')}
            hint={t('oneScreen.notOpenYet')}
            inert={onDeveloperTools === undefined}
            testID={onDeveloperTools === undefined ? 'more-button' : 'developer-tools'}
            {...(onDeveloperTools ? { onPress: onDeveloperTools } : {})}
          >
            <MoreIcon color={palette.ink} />
          </RoundButton>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScootchSays mood={mood} attitude={attitude} line={line} />
          {body}
        </ScrollView>
        {footer === null ? null : <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  corners: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
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
  pill: {
    flexShrink: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pillRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontFamily: fonts.body,
    fontWeight: '600',
    flexShrink: 1,
  },
});
