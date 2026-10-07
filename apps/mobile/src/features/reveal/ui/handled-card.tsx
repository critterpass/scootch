import { Canvas, Group, rect, rrect } from '@shopify/react-native-skia';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  buildCardBack,
  buildCardLayers,
  CARD_BACK_CIRCLE,
  CARD_BACK_SCOOTCH,
  CARD_BLEED,
  CARD_FINISHES,
  CARD_HEIGHT,
  CARD_WIDTH,
  FOIL_BY_RARITY,
  VIEW_SIZE,
} from '@scootch/art';
import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { Scootch } from '../../../art/Scootch';
import { CommandLayer } from '../../../art/skia-commands';
import { useT } from '../../../i18n/i18n-provider';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { cardSpokenLabel } from '../../zoo/zoo-cards';

import { CardFoil } from './card-foil';
import type { CardMotion } from './card-motion';
import { cardCanvasSize } from './card-size';
import { facesFront } from './card-turn';
import { LiveMonsterLayer } from './live-monster';
import { TiltSensor } from './tilt-sensor';

/** The board sets the card in 1100 points of perspective. */
const PERSPECTIVE = 1100;
/** How far the monster shifts in its panel for each degree of lean: it stands a little off the paper. */
const PARALLAX = 0.32;

export interface HandledCardProps {
  readonly card: CardData;
  readonly language: Language;
  /** The width of the card itself on screen; the board's is 330. */
  readonly cardWidth: number;
  /** What moves it: made by `useCardMotion` in whoever shows the card. */
  readonly motion: CardMotion;
  readonly hideTask?: boolean;
  /** False leaves the stamp off the face, for a reveal that brings it down by itself. */
  readonly stamped?: boolean;
  /** Drawn over the face and turning with it: the reveal's own stamp. */
  readonly overFront?: ReactNode;
  readonly testID?: string;
}

/**
 * One caught card as an object: it leans in three dimensions, its foil and glare follow the lean,
 * its monster is alive in the panel, and it has a back. Front and back are the same size, so
 * nothing jumps as it turns. To a screen reader it is one image that reads the card.
 */
export function HandledCard(props: HandledCardProps) {
  const { card, language, cardWidth, motion, hideTask = false, stamped = true, testID } = props;
  const t = useT();
  const character = useCharacterMotion();
  const scale = cardWidth / CARD_WIDTH;
  const size = cardCanvasSize(cardWidth);

  const layers = useMemo(
    () => buildCardLayers(hideTask ? { ...card, taskLine: null } : card, { hideTask, language }),
    [card, hideTask, language],
  );
  const back = useMemo(() => buildCardBack({ label: t('reveal.cardBack'), scootch: false }), [t]);
  const alive = !character.reducedMotion && character.care === 'none';
  const panelClip = useMemo(() => {
    const { x, y, w, h } = layers.panel;
    return rrect(rect(x, y, w, h), 11, 11);
  }, [layers.panel]);

  const { rx, ry, flip } = motion;
  const tilt = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value + flip.value}deg` },
      { scale: motion.scale.value },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: facesFront(ry.value + flip.value) ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: facesFront(ry.value + flip.value) ? 0 : 1,
  }));
  const parallax = useDerivedValue(() => [
    { translateX: ry.value * PARALLAX },
    { translateY: -rx.value * PARALLAX },
  ]);
  // Scootch on the back is alive only while the back is, or is about to be, in view.
  const [backNear, setBackNear] = useState(false);
  useAnimatedReaction(
    () => Math.cos(((ry.value + flip.value) * Math.PI) / 180) < 0.35,
    (near, before) => {
      if (near !== before) scheduleOnRN(setBackNear, near);
    },
  );

  const placeCard = [{ scale }, { translateX: CARD_BLEED }, { translateY: CARD_BLEED }];
  const inSpace = (points: number) => (CARD_BLEED + points) * scale;
  return (
    <GestureDetector gesture={motion.gesture}>
      <Animated.View
        testID={testID}
        accessible
        accessibilityRole="image"
        accessibilityLabel={cardSpokenLabel(card, language)}
        style={[size, tilt]}
      >
        {motion.sensing ? <TiltSensor into={motion.phone} /> : null}
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              left: inSpace(0),
              top: inSpace(0),
              width: CARD_WIDTH * scale,
              height: CARD_HEIGHT * scale,
              borderRadius: 22 * scale,
              boxShadow: `0 ${30 * scale}px ${60 * scale}px ${-24 * scale}px rgba(28,26,23,0.55)`,
            },
          ]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
          <Canvas style={size}>
            <Group transform={placeCard}>
              <CommandLayer commands={layers.under} />
              <Group clip={panelClip}>
                <Group transform={parallax}>
                  <Group
                    transform={[
                      { translateX: layers.monster.x },
                      { translateY: layers.monster.y },
                      { scale: layers.monster.w / VIEW_SIZE },
                    ]}
                  >
                    <LiveMonsterLayer spec={card.monster} alive={alive} />
                  </Group>
                </Group>
              </Group>
              <CommandLayer commands={layers.over} />
              <CardFoil
                face={layers.face}
                radius={layers.faceRadius}
                inks={CARD_FINISHES[card.finish]}
                strength={FOIL_BY_RARITY[card.rarity]}
                rx={rx}
                ry={ry}
                clock={motion.clock}
                lively={motion.lively}
              />
              {stamped ? <CommandLayer commands={layers.stamp} /> : null}
            </Group>
          </Canvas>
          {props.overFront}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, styles.back, backStyle]}
        >
          <Canvas style={size}>
            <Group transform={placeCard}>
              <CommandLayer commands={back} />
            </Group>
          </Canvas>
          <View
            style={[
              styles.circle,
              {
                left: inSpace(CARD_BACK_CIRCLE.x - CARD_BACK_CIRCLE.r),
                top: inSpace(CARD_BACK_CIRCLE.y - CARD_BACK_CIRCLE.r),
                width: CARD_BACK_CIRCLE.r * 2 * scale,
                height: CARD_BACK_CIRCLE.r * 2 * scale,
                borderRadius: CARD_BACK_CIRCLE.r * scale,
              },
            ]}
          >
            <Scootch
              mood="scheming"
              size={CARD_BACK_SCOOTCH.w * scale}
              {...character}
              {...(backNear ? {} : { reducedMotion: true })}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute' },
  back: { transform: [{ rotateY: '180deg' }] },
  circle: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
