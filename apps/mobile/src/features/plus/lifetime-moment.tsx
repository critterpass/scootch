import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { CARD_BLEED, CARD_HEIGHT, CARD_WIDTH } from '@scootch/art';
import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';
import { composeShareImage } from '../share/share-image';
import { PIECE_BOX } from '../world/piece-kit';
import { worldInks } from '../world/world-commands';

import { inForeverFinish } from './lifetime-card';
import { lighthouse } from '../world/landmarks/lighthouse';
import type { MomentProps } from './moments';
import { Panel } from './ui/parts';

export interface LifetimeMomentProps extends MomentProps {
  readonly card: CardData;
  readonly language: Language;
  /** True once the world draws the landmark; until then nothing is claimed about it. */
  readonly landmark: boolean;
  readonly openWorld: () => void;
}

const CARD_SPACE = { width: CARD_WIDTH + CARD_BLEED * 2, height: CARD_HEIGHT + CARD_BLEED * 2 };
const PIECE_SPACE = { width: PIECE_BOX, height: PIECE_BOX };

/** The lifetime moment: the one-of-one card. It celebrates, and sells nothing. */
export function LifetimeMoment(props: LifetimeMomentProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { width } = useWindowDimensions();
  const inks = worldInks(useAppearance());
  const card = inForeverFinish(
    composeShareImage('card', props.card, { hideTask: true, language: props.language }).commands,
  );
  return (
    <KeepFrame
      testID="plus-lifetime"
      close={{ label: t('keep.close'), hint: t('plus.done.hint'), onPress: props.close }}
      closeTestID="plus-lifetime-close"
      footer={
        <Dock
          action={
            props.landmark
              ? {
                  label: t('plus.lifetime.put'),
                  hint: t('plus.lifetime.put.hint'),
                  testID: 'plus-lifetime-world',
                  onPress: props.openWorld,
                }
              : {
                  label: t('plus.lifetime.ok'),
                  hint: t('plus.done.hint'),
                  testID: 'plus-lifetime-ok',
                  onPress: props.close,
                }
          }
        />
      }
    >
      <View style={styles.centre}>
        <CommandCanvas
          commands={card}
          space={CARD_SPACE}
          width={Math.min(250, width - spacing.lg * 2)}
          label={`${props.card.name}, ${t('plus.lifetime.badge')}, ${props.card.flavourText}`}
          testID="plus-lifetime-card"
        />
      </View>
      {props.said === null ? null : (
        <SessionText face="headline" color={palette.ink} style={styles.centred}>
          {props.said}
        </SessionText>
      )}
      {props.landmark ? (
        <Panel testID="plus-lifetime-landmark">
          <View style={styles.step}>
            <CommandCanvas commands={lighthouse(() => 0.5, inks)} space={PIECE_SPACE} width={56} />
            <View style={styles.grow}>
              <SessionText face="action" color={palette.ink}>
                {t('plus.lifetime.landmark')}
              </SessionText>
              <SessionText face="caption" color={palette.muted}>
                {t('plus.lifetime.landmark.note')}
              </SessionText>
            </View>
          </View>
        </Panel>
      ) : null}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  centred: { textAlign: 'center' },
  grow: { flex: 1 },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
