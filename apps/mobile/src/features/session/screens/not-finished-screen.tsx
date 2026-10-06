import { Pressable, StyleSheet, View } from 'react-native';

import type { SessionEvent } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { radius, spacing } from '@scootch/tokens';

import { Characters } from '../ui/characters';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

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
      <View style={[styles.list, { backgroundColor: inks.surface }]}>
        {CHOICES.map((choice, index) => (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityLabel={t(choice.label)}
            accessibilityHint={t(choice.hint)}
            testID={choice.id}
            onPress={() => actions.send(choice.event)}
            style={({ pressed }) => [
              styles.row,
              index > 0
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: inks.track }
                : null,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <SessionText face="body" color={inks.ink} style={styles.grow}>
              {t(choice.label)}
            </SessionText>
            <SessionText face="body" color={inks.muted}>
              ›
            </SessionText>
          </Pressable>
        ))}
      </View>
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  characters: {
    alignSelf: 'center',
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
