import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import type { SessionEvent } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { Scootch } from '../../../art/Scootch';
import { PaperCard, Stage, Words } from '../ui/drawn-parts';
import { FilledButton, TextButton } from '../ui/controls';
import { NextTimeSheet } from '../ui/next-time-sheet';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';
import { PressSpring } from '../../../ui/motion/press-spring';

const CHOICES: readonly {
  readonly id: string;
  readonly label: StringKey & `session.notFinished.${string}`;
  readonly hint: StringKey & `session.notFinished.${string}`;
  readonly event: SessionEvent;
}[] = [
  {
    id: 'session-carry-on',
    label: 'session.notFinished.carryOn',
    hint: 'session.notFinished.carryOn.hint',
    event: { type: 'chose_carry_on' },
  },
  {
    id: 'session-make-smaller',
    label: 'session.notFinished.smaller',
    hint: 'session.notFinished.smaller.hint',
    event: { type: 'chose_make_smaller' },
  },
  {
    id: 'session-let-go',
    label: 'session.notFinished.letGo',
    hint: 'session.notFinished.letGo.hint',
    event: { type: 'chose_let_go' },
  },
];

/** Not finished is a normal outcome: starting was the hard bit, and there are three calm ways on. */
export function NotFinishedScreen({ model, actions, inks, t }: ScreenProps) {
  // Letting go deletes the task and its monster, so it is asked about once before it happens.
  const [lettingGo, setLettingGo] = useState(false);
  // Carrying on offers one line for next time first. It is never offered after letting go.
  const [carryingOn, setCarryingOn] = useState(model.nextTimeOpen === true);
  const choose = (event: SessionEvent) =>
    event.type === 'chose_let_go'
      ? setLettingGo(true)
      : event.type === 'chose_carry_on'
        ? setCarryingOn(true)
        : actions.send(event);
  const carryOn = () => actions.send({ type: 'chose_carry_on' });
  if (carryingOn) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <SessionFrame
          inks={inks}
          testID="session-not-finished-next-time"
          align="drawn"
          footer={
            <NextTimeSheet
              inks={inks}
              t={t}
              onSave={(line) => (actions.carryOnWith ? actions.carryOnWith(line) : carryOn())}
              onSkip={carryOn}
            />
          }
        >
          <Stage height={200} top={18}>
            <Scootch
              mood={model.quiet ? 'serious' : 'nudge'}
              attitude={model.attitude}
              reducedMotion={model.reducedMotion}
              size={190}
            />
          </Stage>
        </SessionFrame>
      </KeyboardAvoidingView>
    );
  }
  return (
    <SessionFrame inks={inks} testID="session-not-finished-choices" align="drawn">
      <Stage height={240} top={18}>
        {/* A small wave, not a party: stopping is a normal way for a session to end. */}
        <Scootch
          mood={model.quiet ? 'serious' : 'nudge'}
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          squashOnChange
          size={230}
        />
      </Stage>
      <Words top={8}>
        <SessionText face="eyebrow" color={inks.muted} accessibilityRole="header">
          {t('session.notFinished.title')}
        </SessionText>
        {model.line ? (
          <SessionText face="lineSmall" color={inks.ink} testID="session-not-finished-line">
            {model.line.text}
          </SessionText>
        ) : null}
      </Words>
      <View style={styles.choices}>
        {lettingGo ? (
          <PaperCard inks={inks} radius={26} style={styles.ask} testID="session-let-go-ask">
            <SessionText face="action" color={inks.ink}>
              {t('session.letGo.ask')}
            </SessionText>
            <SessionText face="caption" color={inks.muted}>
              {t('session.letGo.ask.sub')}
            </SessionText>
            <FilledButton
              label={t('session.letGo.keep')}
              hint={t('session.letGo.keep.hint')}
              testID="session-let-go-keep"
              inks={inks}
              onPress={() => setLettingGo(false)}
            />
            <TextButton
              label={t('session.notFinished.letGo')}
              hint={t('session.notFinished.letGo.hint')}
              testID="session-let-go-confirm"
              inks={inks}
              onPress={() => actions.send({ type: 'chose_let_go' })}
            />
          </PaperCard>
        ) : (
          <>
            <PaperCard inks={inks} radius={26}>
              {CHOICES.map((choice, index) => (
                <PressSpring
                  key={choice.id}
                  accessibilityRole="button"
                  accessibilityLabel={t(choice.label)}
                  accessibilityHint={t(choice.hint)}
                  testID={choice.id}
                  onPress={() => choose(choice.event)}
                  feedback="choice"
                  style={[
                    styles.row,
                    index > 0
                      ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: inks.hairline }
                      : null,
                  ]}
                >
                  <SessionText face="row" color={inks.ink} style={styles.grow}>
                    {t(choice.label)}
                  </SessionText>
                  <SessionText face="row" color={inks.chevron}>
                    ›
                  </SessionText>
                </PressSpring>
              ))}
            </PaperCard>
            <TextButton
              label={t('session.notFinished.back')}
              hint={t('session.notFinished.back.hint')}
              testID="session-not-finished-back"
              inks={inks}
              onPress={() => actions.send({ type: 'mind_changed' })}
            />
          </>
        )}
      </View>
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // The board's list: 16 points in from the sides, 22 under the words.
  choices: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    marginTop: 22,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ask: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  grow: {
    flex: 1,
  },
});
