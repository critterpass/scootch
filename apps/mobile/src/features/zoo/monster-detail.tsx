import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { useT } from '../../i18n/i18n-provider';
import { useMayMove } from '../../ui/motion/use-feel';
import { useCardMotion } from '../reveal/ui/card-motion';
import { cardCanvasSize, cardWidthIn } from '../reveal/ui/card-size';
import { HandledCard } from '../reveal/ui/handled-card';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';

export interface MonsterDetailModel {
  readonly card: CardData;
  readonly language: Language;
  /** Whether this card may be shared: never for a task that asked for care. */
  readonly shareOffered: boolean;
}

export interface MonsterDetailActions {
  readonly close: () => void;
  readonly share: () => void;
}

/**
 * A monster's own screen, the same wherever it is opened from: its card at the board's size, to
 * lean, turn over and look at the foil of, in the finish the person wears; and the dock, which
 * turns it over and shares it.
 */
export function MonsterDetail({
  model,
  actions,
}: {
  readonly model: MonsterDetailModel;
  readonly actions: MonsterDetailActions;
}) {
  const t = useT();
  const mayMove = useMayMove();
  const window = useWindowDimensions();
  // The card is sized from the room the frame really leaves it, whatever bar the screen wears and
  // whatever the text size makes of the dock: it is drawn once that is known, so
  // it never changes size after it first appears.
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  const cardWidth = cardWidthIn(room ?? { width: window.width, height: window.height / 2 });
  const canvas = cardCanvasSize(cardWidth);
  const motion = useCardMotion({
    mayMove,
    handled: true,
    width: canvas.width,
    height: canvas.height,
  });
  const measured = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!room || Math.abs(width - room.width) > 1 || Math.abs(height - room.height) > 1) {
      setRoom({ width, height });
    }
  };
  return (
    <KeepFrame
      testID="zoo-card"
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="zoo-card-close"
      scroll={false}
      footer={
        <Dock
          quiet={{
            label: t('zoo.card.turn'),
            hint: t('zoo.card.turn.hint'),
            testID: 'zoo-card-turn',
            onPress: motion.turnOver,
          }}
          {...(model.shareOffered
            ? {
                action: {
                  label: t('zoo.shareCard'),
                  hint: t('zoo.shareCard.hint'),
                  testID: 'zoo-share-card',
                  onPress: actions.share,
                },
              }
            : {})}
        />
      }
    >
      <View style={styles.room} onLayout={measured}>
        {room ? (
          <HandledCard
            card={model.card}
            language={model.language}
            cardWidth={cardWidth}
            motion={motion}
            testID="zoo-card-face"
          />
        ) : null}
      </View>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
});
