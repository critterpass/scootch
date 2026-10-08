import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { DrawCommand } from '@scootch/art';
import type { Language } from '@scootch/i18n';

import { useT } from '../../i18n/i18n-provider';
import { CORNER } from '../../ui/corner-bar';
import { CROSSFADE_MS } from '../../ui/motion/motion-tokens';
import { useMayMove } from '../../ui/motion/use-feel';
import { STAMPED } from '../plus/ui/member-card';
import { useCardMotion } from '../reveal/ui/card-motion';
import { facesFront } from '../reveal/ui/card-turn';
import { CommandCanvas } from '../reveal/ui/command-canvas';

import { BINDER_CARD, BinderCard } from './ui/binder-card';
import { NightArrow, NightCapsule, NightCross, NightRound } from './ui/night-controls';
import type { CaughtMonster } from './zoo-cards';

export interface CardModel {
  /** The cards to browse, in the order the shelf was in. */
  readonly cards: readonly CaughtMonster[];
  /** Which of them is out of its pocket. */
  readonly index: number;
  /** The shown card's task in the person's own words, when it is still stored. */
  readonly taskLine: string | null;
  readonly language: Language;
  /** Whether the shown card may be shared: never for a task that asked for care. */
  readonly shareOffered: boolean;
}

export interface CardActions {
  readonly close: () => void;
  readonly show: (index: number) => void;
  readonly share: () => void;
}

/** The stage: dark in both appearances, lit from above the card. */
const NIGHT = ['#3A332D', '#1C1A17'] as const;
/** Room the card leaves on the stage: the bar above it, the controls under it and air round it. */
const AROUND = { top: 52, bottom: 96, air: 56, side: 60 } as const;
const STATUS_BAR = { statusBarStyle: 'light' } as const;

/**
 * The card with its own motion. It is mounted again for every card, so each starts level and face
 * up; `turn` counts the presses of the button, and each new count turns the card once more. It
 * reports which side is towards the reader, for that button's label.
 */
function Handled(props: {
  readonly monster: CaughtMonster;
  readonly taskLine: string | null;
  readonly language: Language;
  readonly width: number;
  readonly turn: number;
  readonly onSide: (front: boolean) => void;
}) {
  const { turn, onSide } = props;
  const mayMove = useMayMove();
  const motion = useCardMotion({
    mayMove,
    handled: true,
    width: props.width,
    height: (props.width / BINDER_CARD.width) * BINDER_CARD.height,
  });
  const { turnOver, flip } = motion;
  const asked = useRef(turn);
  useEffect(() => {
    if (asked.current === turn) return;
    asked.current = turn;
    turnOver();
  }, [turn, turnOver]);
  useAnimatedReaction(
    () => facesFront(flip.value),
    (front, before) => {
      if (before !== null && front !== before) scheduleOnRN(onSide, front);
    },
  );
  return (
    <BinderCard
      monster={props.monster}
      taskLine={props.taskLine}
      language={props.language}
      width={props.width}
      motion={motion}
      testID="zoo-card-face"
    />
  );
}

/**
 * A card out of its pocket, on a dark stage: it leans with the phone and under a finger, turns
 * over for its field notes, and the arrows either side of its actions go to the next card in the
 * shelf's order. It closes from the trailing corner like every screen, and a swipe from the
 * screen's edge goes back to the shelf.
 */
export function CardScreen({ model, actions }: { model: CardModel; actions: CardActions }) {
  const t = useT();
  const mayMove = useMayMove();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cards, index } = model;
  const monster = cards[index];
  const [front, setFront] = useState(true);
  const [turn, setTurn] = useState(0);
  const [came, setCame] = useState<1 | -1>(1);

  const stage = useMemo((): DrawCommand[] => {
    const { width, height } = window;
    return [
      {
        op: 'paint',
        path: [['M', 0, 0], ['L', width, 0], ['L', width, height], ['L', 0, height], ['Z']],
        paint: {
          kind: 'radial',
          centre: [width / 2, height * 0.34],
          radius: height * 0.62,
          stops: [
            [0, NIGHT[0], 1],
            [0.72, NIGHT[1], 1],
            [1, NIGHT[1], 1],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
    ];
  }, [window]);

  // The card is as big as the board's where there is room, and smaller on a short or narrow phone.
  const room = {
    width: window.width - AROUND.side,
    height:
      window.height -
      insets.top -
      Math.max(insets.bottom, 34) -
      AROUND.top -
      AROUND.bottom -
      AROUND.air,
  };
  const width = Math.round(
    Math.min(BINDER_CARD.width, room.width, (room.height * BINDER_CARD.width) / BINDER_CARD.height),
  );

  const go = (by: 1 | -1) => {
    if (cards.length < 2) return;
    setCame(by);
    setFront(true);
    setTurn(0);
    actions.show((index + by + cards.length) % cards.length);
  };
  if (!monster) return <View style={styles.page} />;
  const arriving = mayMove
    ? (came === 1 ? SlideInRight : SlideInLeft).duration(320).reduceMotion(ReduceMotion.Never)
    : FadeIn.duration(CROSSFADE_MS).reduceMotion(ReduceMotion.Never);
  return (
    <View style={styles.page} testID="binder-card-screen">
      <Stack.Screen options={STATUS_BAR} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CommandCanvas commands={stage} space={window} width={window.width} />
      </View>
      <View style={[styles.bar, { marginTop: insets.top }]}>
        <View style={styles.corner} />
        <Text allowFontScaling={false} style={styles.place} testID="binder-card-place">
          {t('binder.card.place', { place: index + 1, count: cards.length })}
        </Text>
        <NightRound
          label={t('keep.close')}
          hint={t('keep.close.hint')}
          onPress={actions.close}
          testID="zoo-card-close"
        >
          <NightCross />
        </NightRound>
      </View>
      <View style={styles.stage}>
        <View pointerEvents="none" style={styles.floor} />
        <Animated.View
          key={monster.id}
          entering={arriving}
          exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.Never)}
        >
          <Handled
            monster={monster}
            taskLine={model.taskLine}
            language={model.language}
            width={width}
            turn={turn}
            onSide={setFront}
          />
        </Animated.View>
      </View>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 30) }]}>
        <View style={styles.dock}>
          <NightRound
            size={52}
            label={t('binder.card.previous')}
            hint={t('binder.card.browse.hint')}
            disabled={cards.length < 2}
            onPress={() => go(-1)}
            testID="binder-card-previous"
          >
            <NightArrow to="left" />
          </NightRound>
          <NightCapsule
            tone="glass"
            label={front ? t('binder.card.flip') : t('binder.card.front')}
            hint={t('zoo.card.turn.hint')}
            onPress={() => setTurn((count) => count + 1)}
            testID="binder-card-flip"
          />
          {model.shareOffered ? (
            <NightCapsule
              tone="paper"
              label={t('binder.card.share')}
              hint={t('zoo.shareCard.hint')}
              onPress={actions.share}
              testID="binder-card-share"
            />
          ) : null}
          <NightRound
            size={52}
            label={t('binder.card.next')}
            hint={t('binder.card.browse.hint')}
            disabled={cards.length < 2}
            onPress={() => go(1)}
            testID="binder-card-next"
          >
            <NightArrow to="right" />
          </NightRound>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: NIGHT[1] },
  bar: {
    minHeight: AROUND.top,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CORNER.side,
    paddingTop: 4,
  },
  // An empty corner the size of the close control, so the place sits in the middle.
  corner: { width: CORNER.size, height: CORNER.size },
  place: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.54,
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floor: {
    position: 'absolute',
    bottom: 44,
    width: 190,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    boxShadow: '0 0 22px 12px rgba(0,0,0,0.45)',
  },
  actions: { paddingHorizontal: 14 },
  // The dark stage's dock: one faint glass capsule that holds the way to browse, the flip and the
  // one action, as every dock holds a screen's controls. Its corner is concentric with theirs.
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 7,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
