import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { RiseIn } from '../../ui/motion/rise-in';
import { useScreenStyle } from '../../ui/use-screen-style';
import { bandLine } from '../record/ui/record-parts';
import { RecordDiscView } from '../record/ui/record-disc-view';
import { ARM_DROP_DEG } from '../record/record-audio';
import { SessionText } from '../session/ui/session-text';

import { skipControl, type RevealStepProps } from './reveal-model';
import { AddedBarStrip } from './ui/added-bar-strip';
import { Dock, KeepFrame } from './ui/keep-frame';
import { RewardEyebrow, RewardHeadline, RewardWords } from './ui/reward-words';
import { weekdayName } from './weekday-name';
import { PressSpring } from '../../ui/motion/press-spring';

/**
 * The bar the day added: Scootch pleased with it, the weekday's name, and the record on its white
 * card with the day's bar dropping into the strip and filling as it plays.
 */
export function BarStep({ model, actions, t }: RevealStepProps) {
  const { palette } = useScreenStyle();
  const { width: screen } = useWindowDimensions();
  const { bar } = model;
  if (!bar) return null;
  const cover = model.monster ? [model.monster.spec] : [];
  return (
    <KeepFrame
      testID="reveal-bar"
      close={skipControl(actions, t)}
      closeTestID="reveal-skip"
      footer={
        <Dock
          action={{
            label: t('reveal.next'),
            hint: t('reveal.next.hint'),
            testID: 'reveal-next',
            onPress: actions.next,
          }}
        />
      }
    >
      <RiseIn style={styles.scootch}>
        <Scootch
          mood="pleased"
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          size={200}
        />
      </RiseIn>
      <RewardWords>
        <RiseIn index={1}>
          <RewardEyebrow tone="muted">
            {t('reveal.bar.eyebrow', {
              weekday: weekdayName(model.language, bar.position, 'long'),
            })}
          </RewardEyebrow>
        </RiseIn>
      </RewardWords>
      <RiseIn index={2} style={[styles.deck, { backgroundColor: palette.surface }]}>
        <RecordDiscView
          size={Math.min(230, screen - spacing.lg * 4)}
          barCount={bar.instruments.length}
          cover={cover}
          playing={bar.playing}
          armDeg={ARM_DROP_DEG}
          reducedMotion={model.reducedMotion}
        />
        <View style={styles.playRow}>
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('record.playBar')}
            accessibilityHint={t('record.playBar.hint')}
            accessibilityState={{ selected: bar.playing }}
            testID="reveal-bar-play"
            onPress={actions.playBar}
            style={[styles.play, { backgroundColor: palette.ink }]}
          >
            <View style={[styles.triangle, { borderLeftColor: palette.page }]} />
          </PressSpring>
          <SessionText face="caption" color={palette.muted} style={styles.grow}>
            {bandLine(bar.instruments, t)}
          </SessionText>
        </View>
        <AddedBarStrip barCount={bar.instruments.length} playing={bar.playing} />
      </RiseIn>
    </KeepFrame>
  );
}

/**
 * A surprise drop: Scootch already wearing it, the eyebrow popping in, and what it is. Both
 * answers keep it. The drop row carries no name of its own, so the words are the step's fixed
 * ones; the one thing there is to drop is the beret, and Scootch has it on.
 */
export function DropStep({ model, actions, t }: RevealStepProps) {
  const { width: screen } = useWindowDimensions();
  return (
    <KeepFrame
      testID="reveal-drop"
      close={skipControl(actions, t)}
      closeTestID="reveal-skip"
      footer={
        <Dock
          quiet={{
            label: t('reveal.drop.later'),
            hint: t('reveal.drop.later.hint'),
            testID: 'reveal-drop-later',
            onPress: () => actions.chooseDrop('later'),
          }}
          action={{
            label: t('reveal.drop.wear'),
            hint: t('reveal.drop.wear.hint'),
            testID: 'reveal-drop-wear',
            onPress: () => actions.chooseDrop('wear'),
          }}
        />
      }
    >
      <RiseIn style={styles.dropScootch}>
        <Scootch
          mood="pleased"
          hat="beret"
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          size={Math.min(280, screen - spacing.lg * 2)}
        />
      </RiseIn>
      <RewardWords>
        <RewardEyebrow tone="tomato" pop>
          {t('reveal.drop.eyebrow')}
        </RewardEyebrow>
        <RiseIn index={2}>
          <RewardHeadline size={34} tight>
            {t('reveal.drop.title')}
          </RewardHeadline>
        </RiseIn>
      </RewardWords>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  // Scootch stands at the foot of a 210 point space, 6 under the corner bar.
  scootch: { height: 210, marginTop: 6, alignItems: 'center', justifyContent: 'flex-end' },
  dropScootch: { minHeight: 300, marginTop: 14, alignItems: 'center', justifyContent: 'flex-end' },
  // The record's white card: a 32 point corner, a hairline and a soft shadow under it.
  deck: {
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: spacing.md,
    alignItems: 'center',
    marginHorizontal: -10,
    boxShadow: '0 0 0 0.5px rgba(28,26,23,0.06), 0 8px 24px -6px rgba(28,26,23,0.10)',
  },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  triangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 15,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  grow: { flex: 1 },
});
