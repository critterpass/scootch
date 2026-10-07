import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Attitude, Id, IsoDate, MonsterRow, WorldPieceRow } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { FirstOffer } from '../plus/first-offer';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { Island } from './island';
import type { IslandTarget } from './island-layout';
import { WorldDock } from './world-dock';
import { offerMayShow, worldDay, worldSentence, worldSubtitle } from './world-words';

export interface WorldModel {
  readonly pieces: readonly WorldPieceRow[];
  readonly monsters: readonly MonsterRow[];
  /** The phone's day. Left out, the world is read on the day its newest piece landed. */
  readonly today?: IsoDate;
  readonly attitude?: Attitude;
  /** Night, when Scootch sleeps with everyone else. */
  readonly asleep?: boolean;
  /** The piece that lands on this visit, when the person has just come from a finish. */
  readonly landing?: Id | null;
  /** The Motion switch in Settings set to calm. Reduce Motion is read by the screen itself. */
  readonly calm?: boolean;
  /** A day with something heavy in it: the world is shown and nothing is offered. */
  readonly heavy?: boolean;
}

export interface WorldActions {
  readonly close: () => void;
  readonly openZoo: () => void;
  readonly openRecord: () => void;
  /** Opens a resident's card. Left out, a resident answers the press and nothing opens. */
  readonly openMonster?: (monsterId: Id) => void;
}

/** How long Scootch stays pleased with himself after a tap. */
const REACTION_MS = 1400;
const ISLAND_MAX = 420;
const ALWAYS = ReduceMotion.Never;

/**
 * The world: everything finished, as one island with Scootch in the middle. It fills the width of
 * the phone and rescales as it fills; the line under the title says how old the place is and how
 * many things live there, and Scootch's sentence sits under the island. Everything on the island
 * answers a tap: a resident opens its card, Scootch reacts, a landmark says what it is.
 */
export function WorldScreen({ model, actions }: { model: WorldModel; actions: WorldActions }) {
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  const { width, height } = useWindowDimensions();
  const still = reducedMotion || model.calm === true;
  const today = worldDay(model.pieces, model.today);
  const names = useMemo(
    () => new Map(model.monsters.map((monster) => [monster.id, monster])),
    [model.monsters],
  );
  const subtitle = worldSubtitle(t, model.pieces, today);
  const sentence = worldSentence(t, model.pieces, names, today);
  const empty = subtitle === t('world.count.none');

  const [reacting, setReacting] = useState(false);
  const [told, setTold] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const onTap = (target: IslandTarget) => {
    if (target.kind === 'monster') {
      if (target.item.monsterId) actions.openMonster?.(target.item.monsterId);
    } else if (target.kind === 'landmark') {
      setTold(t('world.lighthouse.line'));
    } else {
      setReacting(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setReacting(false), REACTION_MS);
    }
  };

  // The world arrives: it rises into place once, and a new piece's eyebrow pops in after it.
  const risen = useSharedValue(still ? 1 : 0);
  const popped = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    risen.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ALWAYS,
    });
    popped.value = withDelay(
      380,
      withSpring(1, { damping: 10, stiffness: 180, reduceMotion: ALWAYS }),
    );
  }, [still, risen, popped]);
  const riseStyle = useAnimatedStyle(() => ({
    opacity: risen.value,
    transform: [{ translateY: (1 - risen.value) * 18 }],
  }));
  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, popped.value * 2),
    transform: [{ scale: 0.6 + popped.value * 0.4 }],
  }));

  const size = Math.min(width - spacing.md * 2, ISLAND_MAX);
  return (
    <KeepFrame
      testID="world"
      title={t('oneScreen.world')}
      subtitle={subtitle}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="world-close"
      scroll={false}
      footer={
        <>
          {offerMayShow(model) ? <FirstOffer /> : null}
          <WorldDock
            items={[
              {
                label: t('world.caught'),
                hint: t('world.caught.hint'),
                testID: 'world-open-zoo',
                onPress: actions.openZoo,
              },
              {
                label: t('world.song'),
                hint: t('world.song.hint'),
                testID: 'world-open-record',
                onPress: actions.openRecord,
              },
            ]}
          />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={[styles.middle, { paddingTop: height > 760 ? 40 : spacing.sm }]}
      >
        <Animated.View style={[styles.rise, riseStyle]}>
          <Island
            pieces={model.pieces}
            monsters={model.monsters}
            size={size}
            mood={reacting ? 'celebrating' : model.asleep ? 'asleep' : 'pleased'}
            still={still}
            landing={model.landing ?? null}
            onTap={onTap}
            labels={{
              monsterHint: t('world.monster.hint'),
              scootchHint: t('world.scootch.hint'),
              landmark: t('world.lighthouse'),
              landmarkHint: t('world.lighthouse.hint'),
            }}
            testID="world-island"
            {...(model.attitude ? { attitude: model.attitude } : {})}
          />
          {model.landing ? (
            <Animated.View style={[styles.words, popStyle]}>
              <SessionText face="eyebrow" color={palette.tomato} testID="world-landed">
                {t('reveal.piece.eyebrow')}
              </SessionText>
            </Animated.View>
          ) : null}
          <SessionText
            face="body"
            color={palette.muted}
            style={styles.words}
            testID={empty ? 'world-empty' : 'world-sentence'}
            accessibilityLiveRegion="polite"
          >
            {told ?? sentence}
          </SessionText>
        </Animated.View>
      </ScrollView>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  middle: { flexGrow: 1, alignItems: 'center', paddingBottom: spacing.md },
  rise: { alignItems: 'center', alignSelf: 'stretch' },
  words: { alignSelf: 'stretch', paddingHorizontal: spacing.lg + 4, marginTop: spacing.sm },
});
