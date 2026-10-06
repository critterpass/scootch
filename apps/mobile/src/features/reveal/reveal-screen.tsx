import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';
import { worldInks, worldRowCommands, PIECE_NAMES } from '../world/world-commands';
import { layoutWorld, ROW_HEIGHT, WORLD_WIDTH } from '../world/world-layout';

import { BarStep, DropStep } from './reveal-later-steps';
import {
  skipControl,
  type RevealActions,
  type RevealModel,
  type RevealStepProps,
} from './reveal-model';
import { CardView, TiltingCardView } from './ui/card-view';
import { CommandCanvas } from './ui/command-canvas';
import { Dock, KeepFrame } from './ui/keep-frame';

const FLIP_MS = 700;

/**
 * The card turns over from its back with a glow behind it. With Reduce Motion it is simply there,
 * face up, and its foil rests.
 */
function CardStep({ model, actions, t }: RevealStepProps) {
  const { palette } = useScreenStyle();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(330, screen - spacing.lg * 2);
  const turned = useSharedValue(model.reducedMotion ? 1 : 0);
  useEffect(() => {
    if (!model.reducedMotion) turned.value = withTiming(1, { duration: FLIP_MS });
  }, [model.reducedMotion, turned]);
  const back = useAnimatedStyle(() => ({
    opacity: turned.value < 0.5 ? 1 : 0,
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(turned.value, [0, 1], [0, 180])}deg` },
    ],
  }));
  const front = useAnimatedStyle(() => ({
    opacity: turned.value < 0.5 ? 0 : 1,
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(turned.value, [0, 1], [-180, 0])}deg` },
    ],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: turned.value * 0.22 }));
  if (!model.card) return null;
  const Card = model.tilting ? TiltingCardView : CardView;
  return (
    <KeepFrame
      testID="reveal-card"
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
      <View style={styles.centre}>
        <Animated.View
          style={[styles.glow, { backgroundColor: palette.tomato, width, height: width }, glow]}
        />
        <Animated.View style={front}>
          <Card
            card={model.card}
            language={model.language}
            width={width}
            testID="reveal-card-face"
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.back, { backgroundColor: palette.tomato, borderColor: palette.ink }, back]}
        >
          <Text style={[styles.brand, { color: palette.onTomato }]}>
            {t('brand.name').toLowerCase()}
          </Text>
          <Text style={[styles.backLabel, { color: palette.onTomato }]}>
            {t('reveal.cardBack')}
          </Text>
        </Animated.View>
      </View>
      {model.line ? <SpokenLine line={model.line} /> : null}
    </KeepFrame>
  );
}

/** Words Scootch says. They always come in from the store: no step writes one itself. */
export function SpokenLine({ line }: { readonly line: string }) {
  const { palette } = useScreenStyle();
  return (
    <SessionText
      face="body"
      color={palette.ink}
      accessibilityLiveRegion="polite"
      testID="reveal-line"
    >
      {line}
    </SessionText>
  );
}

/** The new piece, landed on its patch of the world, with the monster that lives there. */
function PieceStep({ model, actions, t }: RevealStepProps) {
  const { palette } = useScreenStyle();
  const inks = worldInks(useAppearance());
  const { width: screen } = useWindowDimensions();
  const { piece, monster } = model;
  const commands = useMemo(() => {
    if (!piece) return [];
    const monsters = new Map(monster ? [[monster.id, monster]] : []);
    return worldRowCommands(layoutWorld([piece], PIECE_NAMES), 0, monsters, inks);
  }, [piece, monster, inks]);
  return (
    <KeepFrame
      testID="reveal-piece"
      close={skipControl(actions, t)}
      closeTestID="reveal-skip"
      footer={
        <Dock
          quiet={{
            label: t('reveal.backToToday'),
            hint: t('reveal.backToToday.hint'),
            testID: 'reveal-back-to-today',
            onPress: actions.backToToday,
          }}
          {...(model.shareOffered
            ? {
                action: {
                  label: t('reveal.showSomeone'),
                  hint: t('reveal.showSomeone.hint'),
                  testID: 'reveal-show-someone',
                  onPress: actions.showSomeone,
                },
              }
            : {})}
        />
      }
    >
      <View style={styles.centre}>
        <CommandCanvas
          commands={commands}
          space={{ width: WORLD_WIDTH, height: ROW_HEIGHT }}
          width={screen - spacing.lg * 2}
        />
      </View>
      <SessionText face="eyebrow" color={palette.tomato} accessibilityRole="header">
        {t('reveal.piece.eyebrow')}
      </SessionText>
      {monster ? (
        <SessionText face="headline" color={palette.ink} testID="reveal-piece-name">
          {monster.name}
        </SessionText>
      ) : null}
    </KeepFrame>
  );
}

export interface RevealScreenProps {
  readonly model: RevealModel;
  readonly actions: RevealActions;
}

/** The reveal, whichever of its steps the model asks for. */
export function RevealScreen({ model, actions }: RevealScreenProps) {
  const t = useT();
  const props = { model, actions, t };
  switch (model.step) {
    case 'card':
      return <CardStep {...props} />;
    case 'piece':
      return <PieceStep {...props} />;
    case 'bar':
      return <BarStep {...props} />;
    case 'drop':
      return <DropStep {...props} />;
  }
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  glow: { position: 'absolute', borderRadius: 999 },
  back: {
    position: 'absolute',
    width: 250,
    height: 350,
    borderRadius: 22,
    borderWidth: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  brand: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 34 },
  backLabel: {
    fontFamily: fonts.body,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
