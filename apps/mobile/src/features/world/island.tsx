import { Canvas, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GROUND_Y, VIEW_SIZE } from '@scootch/art';
import type { Attitude, Id, MonsterRow, WorldPieceRow } from '@scootch/domain';

import { Scootch, type ScootchProps } from '../../art/Scootch';

import { islandCommands, ISLAND_INKS, itemCommands } from './island-commands';
import {
  hitIsland,
  ISLAND_SPACE,
  layoutIsland,
  SCOOTCH_AT,
  tapSpots,
  type IslandTarget,
  type TapSpot,
} from './island-layout';
import { recordPicture } from './island-picture';
import { inLandingOrder } from './world-layout';

/** The smallest hit area, in points: a resident drawn small is still as easy to press as a button. */
const MIN_HIT = 44;
// Whether anything moves is decided by the screen, so no animation asks the system again.
const ALWAYS = ReduceMotion.Never;

export interface IslandLabels {
  readonly monsterHint: string;
  readonly scootchHint: string;
  readonly landmark: string;
  readonly landmarkHint: string;
}

export interface IslandProps {
  readonly pieces: readonly WorldPieceRow[];
  readonly monsters: readonly MonsterRow[];
  /** Width and height on screen, in points. */
  readonly size: number;
  readonly mood: ScootchProps['mood'];
  readonly attitude?: Attitude;
  /** True when nothing may move: Reduce Motion, the Motion switch, or a capture. */
  readonly still: boolean;
  /** The piece that is landing on this visit: it pops in once. */
  readonly landing?: Id | null;
  /** What a tap does. Left out, the island is a picture and takes no taps. */
  readonly onTap?: (target: IslandTarget) => void;
  readonly labels?: IslandLabels;
  /** Read out for the island as a whole when it takes no taps. */
  readonly label?: string;
  readonly testID?: string;
}

/**
 * The world as one island. The sand and everything on it are two pictures, recorded once for a
 * list of pieces: one behind Scootch and one in front of him. Scootch himself is the only thing
 * that is drawn again as time passes. A tap is answered by geometry: the nearest resident whose
 * hit area holds the finger.
 */
export function Island(props: IslandProps) {
  const { pieces, monsters, size, mood, still, onTap, labels } = props;
  const landing = still ? null : (props.landing ?? null);
  const unit = size / ISLAND_SPACE;

  const byId = useMemo(
    () => new Map<Id, MonsterRow>(monsters.map((monster) => [monster.id, monster])),
    [monsters],
  );
  const layout = useMemo(() => layoutIsland(inLandingOrder(pieces, monsters)), [pieces, monsters]);
  // The pictures are recorded here and nowhere else: only a new list of pieces, a new size or a
  // landing piece settling makes them again.
  const pictures = useMemo(() => {
    const drawing = islandCommands(layout, byId, landing);
    return {
      behind: recordPicture(drawing.behind, unit),
      inFront: recordPicture(drawing.inFront, unit),
    };
  }, [layout, byId, landing, unit]);
  const landingPicture = useMemo(() => {
    const item = landing ? layout.items.find((one) => one.id === landing) : undefined;
    return item ? { item, picture: recordPicture(itemCommands(item, byId), unit) } : null;
  }, [layout, byId, landing, unit]);

  const spots = useMemo(
    () => (onTap ? tapSpots(layout, MIN_HIT / 2 / unit) : []),
    [layout, unit, onTap],
  );

  // The press response: a soft ring where the finger found something.
  const ringAt = useSharedValue({ x: 0, y: 0, reach: 0 });
  const ring = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 0.22 * (1 - ring.value),
    width: ringAt.value.reach * 2,
    height: ringAt.value.reach * 2,
    borderRadius: ringAt.value.reach,
    left: ringAt.value.x - ringAt.value.reach,
    top: ringAt.value.y - ringAt.value.reach,
    transform: [{ scale: 0.7 + ring.value * 0.6 }],
  }));

  const answer = (spot: TapSpot) => {
    if (!still) {
      ringAt.value = { x: spot.x * unit, y: spot.y * unit, reach: spot.reach * unit };
      ring.value = withSequence(
        withTiming(0.01, { duration: 0, reduceMotion: ALWAYS }),
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad), reduceMotion: ALWAYS }),
        withTiming(0, { duration: 0, reduceMotion: ALWAYS }),
      );
    }
    onTap?.(spot.target);
  };
  const press = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const spot = hitIsland(spots, locationX / unit, locationY / unit);
    if (spot) answer(spot);
  };

  // The landing: the new piece drops onto its place and settles, about its own foot.
  const landed = useSharedValue(landing ? 0 : 1);
  useEffect(() => {
    if (!landing) return;
    landed.value = 0;
    landed.value = withSpring(1, { damping: 9, stiffness: 140, mass: 0.7, reduceMotion: ALWAYS });
  }, [landing, landed]);
  const foot = landingPicture
    ? { x: landingPicture.item.x * unit - size / 2, y: landingPicture.item.y * unit - size / 2 }
    : { x: 0, y: 0 };
  const landingStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, landed.value * 3),
    transform: [
      { translateX: foot.x },
      { translateY: foot.y - (1 - Math.min(1, landed.value)) * 18 },
      { scale: landed.value },
      { translateX: -foot.x },
      { translateY: -foot.y },
    ],
  }));

  const box = { width: size, height: size };
  const scootchSize = VIEW_SIZE * layout.scootchScale * unit;
  const inFrontOfScootch = landingPicture ? landingPicture.item.y > SCOOTCH_AT.y : false;
  const landingLayer: ReactNode = landingPicture ? (
    <Animated.View pointerEvents="none" style={[styles.layer, box, landingStyle]}>
      <Canvas style={box}>
        <Picture picture={landingPicture.picture} />
      </Canvas>
    </Animated.View>
  ) : null;

  return (
    <View
      testID={props.testID}
      style={box}
      accessible={!onTap && props.label !== undefined}
      accessibilityRole="image"
      accessibilityLabel={onTap ? undefined : props.label}
    >
      <Canvas style={[styles.layer, box]} pointerEvents="none">
        <Picture picture={pictures.behind} />
      </Canvas>
      {inFrontOfScootch ? null : landingLayer}
      <View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            left: (SCOOTCH_AT.x - (VIEW_SIZE / 2) * layout.scootchScale) * unit,
            top: (SCOOTCH_AT.y - GROUND_Y * layout.scootchScale) * unit,
          },
        ]}
      >
        <Scootch
          mood={mood}
          size={scootchSize}
          reducedMotion={still}
          {...(props.attitude ? { attitude: props.attitude } : {})}
        />
      </View>
      <Canvas style={[styles.layer, box]} pointerEvents="none">
        <Picture picture={pictures.inFront} />
      </Canvas>
      {inFrontOfScootch ? landingLayer : null}
      {onTap ? (
        <>
          <Pressable
            accessible={false}
            onPress={press}
            style={[styles.layer, box]}
            testID={props.testID ? `${props.testID}-surface` : undefined}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.layer, { backgroundColor: ISLAND_INKS.ink }, ringStyle]}
          />
          {spots.map((spot, index) => (
            <TapMarker
              key={index}
              spot={spot}
              unit={unit}
              index={index}
              name={
                spot.target.kind === 'monster' && spot.target.item.monsterId
                  ? (byId.get(spot.target.item.monsterId)?.name ?? '')
                  : ''
              }
              labels={labels}
              onActivate={() => answer(spot)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

/**
 * What a screen reader, or a test, finds where a resident stands: a button with the resident's
 * name. It takes no touches itself, so a finger always goes to the island, which picks the
 * nearest resident; activating it by voice does the same as tapping that resident.
 */
function TapMarker(props: {
  readonly spot: TapSpot;
  readonly unit: number;
  readonly index: number;
  readonly name: string;
  readonly labels: IslandLabels | undefined;
  readonly onActivate: () => void;
}) {
  const { spot, unit, labels } = props;
  const kind = spot.target.kind;
  const side = Math.max(MIN_HIT, spot.reach * unit * 1.2);
  const label = kind === 'monster' ? props.name : kind === 'scootch' ? 'Scootch' : labels?.landmark;
  const hint =
    kind === 'monster'
      ? labels?.monsterHint
      : kind === 'scootch'
        ? labels?.scootchHint
        : labels?.landmarkHint;
  // Scootch is first in the list of spots; the residents are numbered from the back of the island.
  const testID =
    kind === 'monster'
      ? `world-monster-${props.index - 1}`
      : kind === 'scootch'
        ? 'world-scootch'
        : 'world-landmark';
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onAccessibilityTap={props.onActivate}
      testID={testID}
      style={[
        styles.layer,
        {
          width: side,
          height: side,
          left: spot.x * unit - side / 2,
          top: spot.y * unit - side / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
