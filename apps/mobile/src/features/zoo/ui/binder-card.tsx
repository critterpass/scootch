import { useIsFocused } from 'expo-router';
import { Canvas, Group, rect, rrect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import {
  buildMaterialParts,
  CARD_LABELS,
  dotScreen,
  formatCardDate,
  MATERIAL_LIGHT,
  RARITY_LOOKS,
  rgba,
  VIEW_SIZE,
  type DrawCommand,
} from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { fonts } from '@scootch/tokens';

import { CommandLayer } from '../../../art/skia-commands';
import { useT } from '../../../i18n/i18n-provider';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { STAMPED } from '../../plus/ui/member-card';
import type { CardMotion } from '../../reveal/ui/card-motion';
import { facesFront } from '../../reveal/ui/card-turn';
import { LiveMonsterLayer } from '../../reveal/ui/live-monster';
import { TiltSensor } from '../../reveal/ui/tilt-sensor';
import { cardDataFor, cardSpokenLabel, type CaughtMonster } from '../zoo-cards';

import { FieldNotes } from './field-notes';

/** The board's card in the binder: 272 by 400 with a 22 point corner. */
export const BINDER_CARD = { width: 272, height: 400, radius: 22 } as const;
/** The panel the monster sits on: 14 points in, 196 tall, under the card's top line. */
const PANEL = { x: 14, y: 33, w: 244, h: 196, radius: 14, monster: 190 } as const;
const PERSPECTIVE = 1200;
const STAMP = '#F0562E';
const FACE = { x: 0, y: 0, w: BINDER_CARD.width, h: BINDER_CARD.height };
const SPACE = { width: BINDER_CARD.width, height: BINDER_CARD.height };

export interface BinderCardProps {
  readonly monster: CaughtMonster;
  /** The task in the person's own words, when it is still stored; `null` leaves the line off. */
  readonly taskLine: string | null;
  readonly language: Language;
  /** How wide the card is on screen. Everything on it scales from the board's 272. */
  readonly width: number;
  readonly motion: CardMotion;
  readonly testID?: string;
}

/**
 * One card out of its pocket: the stock of its rarity catching the light as it leans, its
 * monster asleep on its panel, its name, the task and its two numbers; and on the back, the
 * field notes. It turns over under a tap, a flick or the button, and both sides are one size, so
 * nothing jumps as it turns. To a screen reader it is one image that reads the card.
 */
export function BinderCard({
  monster,
  taskLine,
  language,
  width,
  motion,
  testID,
}: BinderCardProps) {
  const t = useT();
  const character = useCharacterMotion();
  const labels = CARD_LABELS[language];
  const look = RARITY_LOOKS[monster.rarity];
  const k = width / BINDER_CARD.width;
  const size = { width, height: BINDER_CARD.height * k };
  // Asked here, outside the canvas, and handed to the monster's layer inside it.
  const focused = useIsFocused();
  const alive = focused && !character.reducedMotion && character.care === 'none';

  const parts = useMemo(
    () => buildMaterialParts(FACE, BINDER_CARD.radius, look.material),
    [look.material],
  );
  const clip = useMemo(
    () => rrect(rect(0, 0, FACE.w, FACE.h), BINDER_CARD.radius, BINDER_CARD.radius),
    [],
  );
  const panelClip = useMemo(
    () => rrect(rect(PANEL.x, PANEL.y, PANEL.w, PANEL.h), PANEL.radius, PANEL.radius),
    [],
  );
  const panel = useMemo(
    (): DrawCommand[] => [
      {
        op: 'fill',
        path: [
          ['M', PANEL.x, PANEL.y],
          ['L', PANEL.x + PANEL.w, PANEL.y],
          ['L', PANEL.x + PANEL.w, PANEL.y + PANEL.h],
          ['L', PANEL.x, PANEL.y + PANEL.h],
          ['Z'],
        ],
        color: look.panel,
        alpha: 1,
        rule: 'nonzero',
      },
      {
        op: 'fill',
        path: dotScreen({ x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h }, 9, 1.3),
        color: STAMP,
        alpha: 0.22,
        rule: 'nonzero',
      },
    ],
    [look.panel],
  );

  const { rx, ry, flip, scale } = motion;
  const tilt = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value + flip.value}deg` },
      { scale: scale.value },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: facesFront(ry.value + flip.value) ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: facesFront(ry.value + flip.value) ? 0 : 1,
  }));
  const slide = (MATERIAL_LIGHT.sheenSize - 1) * MATERIAL_LIGHT.perDegree;
  const sheen = useDerivedValue(() => [
    { translateX: -slide * FACE.w * ry.value },
    { translateY: slide * FACE.h * rx.value },
  ]);
  const glare = useDerivedValue(() => [
    { translateX: MATERIAL_LIGHT.perDegree * FACE.w * ry.value },
    { translateY: -MATERIAL_LIGHT.perDegree * FACE.h * rx.value },
  ]);

  const sub = rgba(look.material.sub[0], look.material.sub[1]);
  const ink = look.material.text;
  const number = labels.number(String(monster.number).padStart(3, '0'));
  const lurked = labels.days(monster.daysLurked);
  const took = labels.duration(Math.floor(monster.catchMinutes / 60), monster.catchMinutes % 60);
  const notes: readonly (readonly [string, string])[] = [
    [labels.lurked, lurked],
    [labels.caughtIn, took],
    [labels.dread, '★'.repeat(monster.dread) + '☆'.repeat(Math.max(0, 5 - monster.dread))],
    [t('binder.card.caughtOn'), formatCardDate(monster.caughtOn, language)],
  ];
  const fitted = [styles.fitted, { transform: [{ scale: k }] }];
  return (
    <GestureDetector gesture={motion.gesture}>
      <Animated.View
        testID={testID}
        accessible
        accessibilityRole="image"
        accessibilityLabel={cardSpokenLabel(cardDataFor(monster, null), language)}
        style={[size, tilt]}
      >
        {motion.sensing ? <TiltSensor into={motion.phone} /> : null}
        <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
          <View style={fitted}>
            <Canvas style={SPACE}>
              <Group clip={clip}>
                <CommandLayer commands={parts.base} />
                <Group transform={sheen}>
                  <CommandLayer commands={parts.sheen} />
                </Group>
                <CommandLayer commands={parts.over} />
                <Group clip={panelClip}>
                  <CommandLayer commands={panel} />
                  <Group
                    transform={[
                      { translateX: PANEL.x + (PANEL.w - PANEL.monster) / 2 },
                      { translateY: PANEL.y + PANEL.h - PANEL.monster },
                      { scale: PANEL.monster / VIEW_SIZE },
                    ]}
                  >
                    <LiveMonsterLayer spec={monster.spec} alive={alive} mood="caught" />
                  </Group>
                </Group>
                <Group transform={glare}>
                  <CommandLayer commands={parts.glare} />
                </Group>
              </Group>
              <CommandLayer commands={parts.edge} />
            </Canvas>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.front]}>
              <View style={styles.spread}>
                <Text allowFontScaling={false} style={[styles.stamp, { color: sub }]}>
                  {number}
                </Text>
                {monster.rarity === 'common' ? null : (
                  <Text allowFontScaling={false} style={[styles.stamp, { color: look.word }]}>
                    {labels.rarity[monster.rarity].toLocaleUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.underPanel}>
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.name, { color: ink }]}
                >
                  {monster.name}
                </Text>
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[styles.title, { color: sub }]}
                >
                  {monster.title}
                </Text>
              </View>
              <View>
                {taskLine === null ? null : (
                  <Text
                    allowFontScaling={false}
                    numberOfLines={2}
                    style={[styles.task, { color: sub }]}
                  >
                    {`“${taskLine}”`}
                  </Text>
                )}
                <View
                  style={[styles.numbers, { borderTopColor: rgba(look.rule[0], look.rule[1]) }]}
                >
                  {[
                    [labels.lurked, lurked],
                    [labels.caughtIn, took],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.number}>
                      <Text allowFontScaling={false} style={[styles.small, { color: sub }]}>
                        {label?.toLocaleUpperCase()}
                      </Text>
                      <Text allowFontScaling={false} style={[styles.value, { color: ink }]}>
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
        {/* The back is the front's mirror image, so it reads the right way round once turned. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.mirrored, backStyle]}>
          <View style={fitted}>
            <FieldNotes monster={monster} number={number} rows={notes} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Laid out at the board's size and scaled from its top corner, so type keeps its proportions.
  fitted: {
    width: BINDER_CARD.width,
    height: BINDER_CARD.height,
    transformOrigin: 'top left',
  },
  mirrored: { transform: [{ scaleX: -1 }] },
  front: { padding: 14, justifyContent: 'space-between' },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  stamp: { fontFamily: STAMPED, fontWeight: '700', fontSize: 8.5, letterSpacing: 1.2 },
  // The name starts 12 points under the panel, which the canvas draws.
  underPanel: { position: 'absolute', left: 14, right: 14, top: PANEL.y + PANEL.h + 12 },
  name: { fontFamily: fonts.heading, fontWeight: '900', fontSize: 26, letterSpacing: -0.78 },
  title: { marginTop: 4, fontFamily: fonts.body, fontWeight: '500', fontSize: 12 },
  task: { fontFamily: STAMPED, fontWeight: '500', fontSize: 10.5, lineHeight: 13.7 },
  numbers: { flexDirection: 'row', gap: 14, marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  number: { gap: 3 },
  small: { fontFamily: STAMPED, fontWeight: '700', fontSize: 7, letterSpacing: 0.84 },
  value: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 15 },
});
