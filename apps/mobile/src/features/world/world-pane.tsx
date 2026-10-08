import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { Attitude, Id, IsoDate, MonsterRow, WorldPieceRow } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SendIcon } from '../../ui/icons';
import { FadeAway } from '../../ui/motion/fade-away';
import { PopIn } from '../../ui/motion/pop-in';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { CAUGHT, mix, presence, ramp, SONG, useKeepMotion, WORLD } from '../keep/keep-motion';
import { PaneHead } from '../keep/pane-head';
import { FirstOffer } from '../plus/first-offer';
import { SessionText } from '../session/ui/session-text';

import { Island } from './island';
import { ISLAND_SPACE, layoutIsland, type IslandTarget } from './island-layout';
import { inLandingOrder } from './world-layout';
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
  /** Opens a resident's card. Left out, a resident answers the press and nothing opens. */
  readonly openMonster?: (monsterId: Id) => void;
  /** Sends the world as a postcard. Left out (an empty world, a crisis day), there is no chip. */
  readonly sendPostcard?: () => void;
}

/** How long Scootch stays pleased with himself after a tap. */
const REACTION_MS = 1400;
const ISLAND_MAX = 420;
/** How long the note about a new piece stays before it steps aside. */
const LANDED_NOTE_MS = 3200;

/**
 * The world's tab: everything finished, as one island with Scootch in the middle. It fills the
 * width of the phone and rescales as it fills; the line under the title says how old the place is
 * and how many things live there, and Scootch's sentence sits under the island. Everything on the
 * island answers a tap: a resident opens its card, Scootch reacts, a landmark says what it is.
 *
 * Leaving for the shelf, the island pulls back and fades as if the eye had stepped away from it;
 * leaving for the record it sinks a little and lets its sand become the record.
 */
export function WorldPane({
  model,
  actions,
  active = true,
}: {
  readonly model: WorldModel;
  readonly actions: WorldActions;
  /** Whether this is the tab in view. Only then is it found by its name. */
  readonly active?: boolean;
}) {
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  const { width, height } = useWindowDimensions();
  const { from, to, progress, sand, calm, barSpace } = useKeepMotion();
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

  // A new piece is named once, a moment after the world is opened, and the note then steps
  // aside: it is news, not a label.
  const [noted, setNoted] = useState(true);
  useEffect(() => {
    if (!model.landing) return undefined;
    setNoted(true);
    const timer = setTimeout(() => setNoted(false), LANDED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [model.landing]);
  const size = Math.min(width - spacing.md * 2, ISLAND_MAX);
  const top = height > 760 ? 40 : spacing.sm;

  // Where the sand lies, for the record to rise out of.
  const ground = useMemo(
    () => layoutIsland(inLandingOrder(model.pieces, model.monsters)).ground,
    [model.pieces, model.monsters],
  );
  useEffect(() => {
    const unit = size / ISLAND_SPACE;
    sand.value = { cy: top + ground.y * unit, rx: ground.rx * unit, ry: ground.ry * unit };
  }, [ground, size, top, sand]);

  const island = useAnimatedStyle(() => {
    const { v, other } = presence(from.value, to.value, progress.value, WORLD);
    if (calm) return { opacity: v, transform: [{ translateY: 0 }, { scale: 1 }] };
    if (other === CAUGHT) {
      // The eye steps back: the island shrinks toward the top of the shelf and is gone.
      return {
        opacity: ramp(v, 0.3, 0.85),
        transform: [{ translateY: mix(-size * 0.2, 0, v) }, { scale: mix(0.5, 1, v) }],
      };
    }
    if (other === SONG) {
      return {
        opacity: ramp(v, 0.4, 0.95),
        transform: [{ translateY: mix(-10, 0, v) }, { scale: mix(0.94, 1, v) }],
      };
    }
    return { opacity: v > 0 ? 1 : 0, transform: [{ translateY: 0 }, { scale: 1 }] };
  }, [size, calm]);
  const under = useAnimatedStyle(() => {
    const { v } = presence(from.value, to.value, progress.value, WORLD);
    if (calm) return { opacity: v, transform: [{ translateY: 0 }] };
    return { opacity: ramp(v, 0.6, 1), transform: [{ translateY: mix(14, 0, ramp(v, 0.4, 1)) }] };
  }, [calm]);

  return (
    <View style={styles.fill} testID={active ? 'world' : undefined}>
      <PaneHead
        tab={WORLD}
        title={t('oneScreen.world')}
        subtitle={subtitle}
        countTestID="world-count"
      />
      <ScrollView
        // The island is not a page to scroll back up: a tap on the status bar is left alone.
        scrollsToTop={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.middle, { paddingTop: top, paddingBottom: barSpace }]}
      >
        <Animated.View style={island}>
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
        </Animated.View>
        <Animated.View style={[styles.under, under]}>
          {model.landing ? (
            <FadeAway shown={noted} style={styles.words}>
              <PopIn delayMs={still ? 0 : 380}>
                <SessionText face="eyebrow" color={palette.tomato} testID="world-landed">
                  {t('reveal.piece.eyebrow')}
                </SessionText>
              </PopIn>
            </FadeAway>
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
          {actions.sendPostcard && !empty ? (
            <View style={styles.chip}>
              <QuietLink
                label={t('world.postcard')}
                hint={t('world.postcard.hint')}
                onPress={actions.sendPostcard}
                testID="world-postcard"
                icon={<SendIcon color={palette.ink} />}
              />
            </View>
          ) : null}
          {offerMayShow(model) ? (
            <View style={styles.offer}>
              <FirstOffer />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  middle: { flexGrow: 1, alignItems: 'center' },
  under: { alignSelf: 'stretch' },
  words: { alignSelf: 'stretch', paddingHorizontal: spacing.lg + 4, marginTop: spacing.sm },
  // The way to send the world sits in the middle, a clear step under Scootch's sentence.
  chip: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  offer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
});
