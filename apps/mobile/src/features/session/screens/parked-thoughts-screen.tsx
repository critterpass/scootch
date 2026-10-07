import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../../art/Scootch';
import { PressSpring } from '../../../ui/motion/press-spring';
import { SwipeAway } from '../../../ui/swipe-away';
import { RoundButton } from '../ui/controls';
import { InkDock, PaperCard, Stage, Words } from '../ui/drawn-parts';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

/**
 * The thoughts parked during the session, shown only now, as the board draws them: Scootch pleased
 * with himself, his line, and one card for each thought with "Tomorrow" and "Let go" beside it.
 * A card swiped away to the left is let go, as "Let go" does. The ones left untouched wait in
 * the drawer. One tap moves on, and never drops one.
 */
export function ParkedThoughtsScreen({ model, actions, inks, t }: ScreenProps) {
  const thoughts = model.view.kind === 'thoughts' ? model.view.thoughts : [];
  return (
    <SessionFrame
      inks={inks}
      testID="session-parked-thoughts"
      align="drawn"
      footerInset={14}
      corner={
        <RoundButton
          label={t('session.skip')}
          hint={t('session.skip.hint')}
          testID="session-thoughts-skip"
          inks={inks}
          onPress={actions.passThoughts}
        />
      }
      footer={
        <InkDock
          label={t('session.finish.done')}
          hint={t('session.finish.done.hint')}
          testID="session-thoughts-done"
          onPress={actions.passThoughts}
        />
      }
    >
      <Stage height={210} top={6}>
        <Scootch
          mood={model.quiet ? 'serious' : 'pleased'}
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          squashOnChange
          size={200}
        />
      </Stage>
      <Words top={6}>
        <SessionText face="eyebrow" color={inks.muted} accessibilityRole="header">
          {t('session.thoughts.title')}
        </SessionText>
        {model.thoughtsLine === null ? null : (
          <SessionText face="line" color={inks.ink} testID="session-thoughts-line">
            {model.thoughtsLine}
          </SessionText>
        )}
      </Words>
      <View style={styles.cards}>
        {thoughts.map((thought, index) => (
          <SwipeAway
            key={`${thought.parkedAt}-${thought.text}`}
            radius={22}
            onGone={() => actions.resolveThought(thought, 'discard')}
          >
            <PaperCard
              inks={inks}
              radius={22}
              testID={`session-thought-${index}`}
              style={styles.card}
            >
              <View style={styles.words}>
                <SessionText face="thought" color={inks.ink}>
                  {thought.text}
                </SessionText>
                <SessionText face="note" color={inks.muted}>
                  {t('session.thoughts.parkedAt', { time: model.timeOf(thought) })}
                </SessionText>
              </View>
              <PressSpring
                accessibilityRole="button"
                accessibilityLabel={t('session.thoughts.tomorrow')}
                accessibilityHint={t('session.thoughts.tomorrow.hint')}
                testID={`session-thought-${index}-tomorrow`}
                feedback="choice"
                hitSlop={6}
                onPress={() => actions.resolveThought(thought, 'keep')}
                style={[styles.chip, { backgroundColor: `${inks.ink}0F` }]}
              >
                <SessionText face="chip" color={inks.ink}>
                  {t('session.thoughts.tomorrow')}
                </SessionText>
              </PressSpring>
              <PressSpring
                accessibilityRole="button"
                accessibilityLabel={t('session.thoughts.letGo')}
                accessibilityHint={t('session.thoughts.letGo.hint')}
                testID={`session-thought-${index}-let-go`}
                feedback="choice"
                hitSlop={6}
                onPress={() => actions.resolveThought(thought, 'discard')}
                style={styles.chip}
              >
                <SessionText face="chip" color={inks.muted}>
                  {t('session.thoughts.letGo')}
                </SessionText>
              </PressSpring>
            </PaperCard>
          </SwipeAway>
        ))}
      </View>
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  // The board's cards: 16 points in from the sides, 18 under the words, 10 apart.
  cards: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
  },
  words: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    gap: 2,
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
