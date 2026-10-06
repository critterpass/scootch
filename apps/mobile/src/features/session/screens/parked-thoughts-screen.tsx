import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { Characters } from '../ui/characters';
import { Capsule, FilledButton, RoundButton, TextButton } from '../ui/controls';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

/**
 * The thoughts parked during the session, shown only now. Each can come back tomorrow or go; the
 * ones left untouched are simply still there. One tap moves on.
 */
export function ParkedThoughtsScreen({ model, actions, inks, t }: ScreenProps) {
  const thoughts = model.view.kind === 'thoughts' ? model.view.thoughts : [];
  return (
    <SessionFrame
      inks={inks}
      testID="session-parked-thoughts"
      align="start"
      top={
        <RoundButton
          label={t('session.skip')}
          hint={t('session.skip.hint')}
          testID="session-thoughts-skip"
          inks={inks}
          onPress={actions.passThoughts}
        />
      }
      footer={
        <FilledButton
          label={t('session.finish.done')}
          hint={t('session.finish.done.hint')}
          testID="session-thoughts-done"
          inks={inks}
          onPress={actions.passThoughts}
        />
      }
    >
      <View style={styles.centre}>
        <Characters
          mood={model.quiet ? 'serious' : 'pleased'}
          attitude={model.attitude}
          monster={null}
          reducedMotion={model.reducedMotion}
          size={140}
        />
      </View>
      <SessionText face="eyebrow" color={inks.muted} accessibilityRole="header">
        {t('session.thoughts.title')}
      </SessionText>
      {model.thoughtsLine === null ? null : (
        <SessionText face="body" color={inks.muted} testID="session-thoughts-line">
          {model.thoughtsLine}
        </SessionText>
      )}
      {thoughts.map((thought, index) => (
        <View
          key={`${thought.parkedAt}-${index}`}
          testID={`session-thought-${index}`}
          style={[styles.card, { backgroundColor: inks.surface }]}
        >
          <View style={styles.words}>
            <SessionText face="body" color={inks.ink} style={styles.strong}>
              {thought.text}
            </SessionText>
            <SessionText face="caption" color={inks.muted}>
              {t('session.thoughts.parkedAt', { time: model.timeOf(thought) })}
            </SessionText>
          </View>
          <View style={styles.choices}>
            <Capsule
              label={t('session.thoughts.tomorrow')}
              hint={t('session.thoughts.tomorrow.hint')}
              testID={`session-thought-${index}-tomorrow`}
              inks={{ ...inks, surface: inks.page }}
              onPress={() => actions.resolveThought(thought, 'keep')}
            />
            <TextButton
              label={t('session.thoughts.letGo')}
              hint={t('session.thoughts.letGo.hint')}
              testID={`session-thought-${index}-let-go`}
              inks={inks}
              onPress={() => actions.resolveThought(thought, 'discard')}
            />
          </View>
        </View>
      ))}
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  centre: {
    alignSelf: 'center',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  words: {
    gap: 2,
  },
  strong: {
    fontWeight: '600',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
