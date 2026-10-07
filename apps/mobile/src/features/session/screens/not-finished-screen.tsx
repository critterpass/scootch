import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SessionEvent } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { radius, spacing } from '@scootch/tokens';

import { Characters } from '../ui/characters';
import { FilledButton, TextButton } from '../ui/controls';
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
  const choose = (event: SessionEvent) =>
    event.type === 'chose_let_go' ? setLettingGo(true) : actions.send(event);
  return (
    <SessionFrame inks={inks} testID="session-not-finished-choices" align="start">
      <View style={styles.characters}>
        <Characters
          mood={model.quiet ? 'serious' : 'pleased'}
          attitude={model.attitude}
          monster={null}
          reducedMotion={model.reducedMotion}
        />
      </View>
      <SessionText face="eyebrow" color={inks.muted} accessibilityRole="header">
        {t('session.notFinished.title')}
      </SessionText>
      {model.line ? (
        <SessionText face="headline" color={inks.ink} testID="session-not-finished-line">
          {model.line.text}
        </SessionText>
      ) : null}
      {lettingGo ? (
        <View style={[styles.ask, { backgroundColor: inks.surface }]} testID="session-let-go-ask">
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
        </View>
      ) : (
        <>
          <View style={[styles.list, { backgroundColor: inks.surface }]}>
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
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: inks.track }
                    : null,
                ]}
              >
                <SessionText face="body" color={inks.ink} style={styles.grow}>
                  {t(choice.label)}
                </SessionText>
                <SessionText face="body" color={inks.muted}>
                  ›
                </SessionText>
              </PressSpring>
            ))}
          </View>
          <TextButton
            label={t('session.notFinished.back')}
            hint={t('session.notFinished.back.hint')}
            testID="session-not-finished-back"
            inks={inks}
            onPress={() => actions.send({ type: 'mind_changed' })}
          />
        </>
      )}
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  characters: {
    alignSelf: 'center',
  },
  ask: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  list: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grow: {
    flex: 1,
  },
});
