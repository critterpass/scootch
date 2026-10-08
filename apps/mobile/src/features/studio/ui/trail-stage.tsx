import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { roundRect, type DrawCommand, type MonsterLife } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { Monster, type MonsterProps } from '../../../art/Monster';
import { Scootch } from '../../../art/Scootch';
import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { useAppActive } from '../../reveal/ui/use-app-active';
import { BurstMarks } from '../../session/ui/burst-marks';
import { sessionInks } from '../../session/ui/session-inks';
import type { InkId, TrailId } from '../catalogue';

import { STAGE, StagePill } from './stage-parts';

/** The board's stage for a trail is dark in both appearances: a trail reads best against it. */
const NIGHT = ['#3A332D', '#1C1A17'] as const;
const SPOT = '#FFF0DC';
/** The board plays the catch again every few seconds. */
const REPLAY_MS = 4600;
/** How long the monster stays caught before it is let go for the next one. */
const CAUGHT_MS = 2200;

type Mood = NonNullable<MonsterLife['mood']>;

export interface TrailStageProps {
  readonly trail: TrailId;
  readonly ink: InkId;
  /** The person's newest monster, to be caught again here; `null` before there is one. */
  readonly monster: { readonly spec: MonsterProps['spec']; readonly name: string } | null;
  readonly size: { readonly width: number; readonly height: number };
}

/**
 * The trail, where it happens: a catch, on a dark stage under one light. The button catches the
 * monster in the trail in focus, and while the stage is in front it plays again every few
 * seconds. Where nothing may move it plays once for each press, as a soft glow.
 */
export function TrailStage({ trail, ink, monster, size }: TrailStageProps) {
  const t = useT();
  const { reducedMotion } = useScreenStyle();
  const character = useCharacterMotion();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const inks = useMemo(() => sessionInks('dark', ink), [ink]);
  const [played, setPlayed] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');

  const play = useCallback(() => {
    setPlayed((count) => count + 1);
    setMood('caught');
  }, []);
  // A new trail is thrown at once, so picking one shows it.
  useEffect(() => {
    play();
  }, [trail, play]);
  useEffect(() => {
    if (mood !== 'caught') return undefined;
    const letGo = setTimeout(() => setMood('idle'), CAUGHT_MS);
    return () => clearTimeout(letGo);
  }, [mood, played]);
  const replaying = !reducedMotion && focused && appActive;
  useEffect(() => {
    if (!replaying) return undefined;
    const again = setInterval(play, REPLAY_MS);
    return () => clearInterval(again);
    // A press starts the wait over, so a replay never lands on top of one just asked for.
  }, [replaying, play, played]);

  const night = useMemo((): DrawCommand[] => {
    const { width, height } = size;
    return [
      {
        op: 'paint',
        path: roundRect({ x: 0, y: 0, w: width, h: height }, STAGE.radius),
        paint: {
          kind: 'radial',
          centre: [width / 2, height * 0.4],
          radius: height * 0.8,
          stops: [
            [0, NIGHT[0], 1],
            [0.7, NIGHT[1], 1],
            [1, NIGHT[1], 1],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
      // The light from above: a tall, narrow cone, drawn as a circle squeezed sideways.
      { op: 'save' },
      { op: 'transform', matrix: [110 / 360, 0, 0, 1, (width / 2) * (1 - 110 / 360), 0] },
      {
        op: 'paint',
        path: roundRect({ x: -width, y: 22, w: width * 3, h: 360 }, 0),
        paint: {
          kind: 'radial',
          centre: [width / 2, 22],
          radius: 360,
          stops: [
            [0, SPOT, 0.22],
            [0.7, SPOT, 0],
            [1, SPOT, 0],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
      { op: 'restore' },
    ];
  }, [size]);

  const fit = Math.min(1, size.height / STAGE.height);
  const label = monster
    ? t('studio.stage.catch', { name: monster.name })
    : t('studio.stage.catch.plain');
  return (
    <View testID="studio-preview" style={[styles.stage, size]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CommandCanvas commands={night} space={size} width={size.width} />
      </View>
      <View pointerEvents="none" style={styles.floor} />
      <View pointerEvents="none" style={styles.figure}>
        {monster ? (
          <Monster
            spec={monster.spec}
            mood={mood}
            size={190 * fit}
            squashOnChange
            {...(reducedMotion ? { reducedMotion: true } : {})}
          />
        ) : (
          <Scootch
            mood={mood === 'caught' ? 'celebrating' : 'waiting'}
            ink={ink}
            ground="dark"
            size={190 * fit}
            {...character}
          />
        )}
      </View>
      {played === 0 ? null : (
        <BurstMarks
          key={played}
          kind="catch"
          inks={inks}
          reducedMotion={reducedMotion}
          trail={trail}
        />
      )}
      <StagePill
        side="leading"
        tone="night"
        label={t(`studio.trail.${trail}`)}
        testID="studio-trail"
      />
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('studio.stage.catch.hint')}
        onPress={play}
        feedback="primary"
        testID="studio-trail-catch"
        style={styles.catch}
      >
        <Text allowFontScaling={false} numberOfLines={1} style={styles.catchLabel}>
          {label}
        </Text>
      </PressSpring>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: STAGE.radius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floor: {
    position: 'absolute',
    bottom: 100,
    width: 126,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    boxShadow: '0 0 14px 8px rgba(0,0,0,0.4)',
  },
  figure: { marginTop: -50 },
  catch: {
    position: 'absolute',
    bottom: 22,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '86%',
  },
  catchLabel: { color: '#FFFFFF', fontFamily: fonts.body, fontWeight: '600', fontSize: 15 },
});
