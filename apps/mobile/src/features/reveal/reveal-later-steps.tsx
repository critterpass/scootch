import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useScreenStyle } from '../../ui/use-screen-style';
import { BarStrip, bandLine } from '../record/ui/record-parts';
import { RecordDiscView } from '../record/ui/record-disc-view';
import { ARM_DROP_DEG } from '../record/record-audio';
import { SessionText } from '../session/ui/session-text';

import { skipControl, type RevealStepProps } from './reveal-model';
import { Dock, KeepFrame } from './ui/keep-frame';
import { weekdayName } from './weekday-name';

/** The bar the day added: the weekday's instrument joins the record, and the bar plays. */
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
      <SessionText face="eyebrow" color={palette.muted} accessibilityRole="header">
        {t('reveal.bar.eyebrow', { weekday: weekdayName(model.language, bar.position, 'long') })}
      </SessionText>
      <View style={[styles.deck, { backgroundColor: palette.surface }]}>
        <RecordDiscView
          size={Math.min(260, screen - spacing.lg * 4)}
          barCount={bar.instruments.length}
          cover={cover}
          playing={bar.playing}
          armDeg={ARM_DROP_DEG}
          reducedMotion={model.reducedMotion}
        />
        <View style={styles.playRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('record.playBar')}
            accessibilityHint={t('record.playBar.hint')}
            accessibilityState={{ selected: bar.playing }}
            testID="reveal-bar-play"
            onPress={actions.playBar}
            style={[styles.play, { backgroundColor: palette.ink }]}
          >
            <View style={[styles.triangle, { borderLeftColor: palette.page }]} />
          </Pressable>
          <SessionText face="caption" color={palette.muted} style={styles.grow}>
            {bandLine(bar.instruments, t)}
          </SessionText>
        </View>
        <BarStrip barCount={bar.instruments.length} progress={0} />
      </View>
    </KeepFrame>
  );
}

/**
 * A surprise drop. Both answers keep it; "Wear it" only records the wish, since outfits are not
 * drawn yet. The drop's own name and what Scootch says about it have nowhere to come from yet.
 */
export function DropStep({ model, actions, t }: RevealStepProps) {
  const { palette } = useScreenStyle();
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
      <View style={styles.centre}>
        <Scootch
          mood="celebrating"
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          size={220}
        />
      </View>
      <SessionText face="eyebrow" color={palette.tomato} accessibilityRole="header">
        {t('reveal.drop.eyebrow')}
      </SessionText>
      <SessionText face="headline" color={palette.ink}>
        {t('reveal.drop.title')}
      </SessionText>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', paddingVertical: spacing.lg },
  deck: { borderRadius: 32, padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
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
