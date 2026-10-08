import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { back, clamp, lerp } from '../math';
import {
  Board,
  Hint,
  dust,
  Floor,
  feetOf,
  MONSTER_SIZE,
  Puffs,
  SceneMonster,
  Shadow,
  Stamp,
  STAMP_AWAY,
  thwack,
  useSprite,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 560;
const CUP_HEIGHT = 220;
/** The cup's height off the top of the board: out of sight, hovering once set, and over him. */
const HIGH = -170;
const SET = 96;
const DOWN = FLOOR - CUP_HEIGHT;
/** How far it leans while it hangs. It straightens as it comes down. */
const LEAN = -20;
/** Dragged past here and let go, it comes down; short of it, it swings back up. */
const DROPS_PAST = 190;

/** The gesture, as the hint traces it. */
const HINT = 'M340 250 L340 400 M326 386 L340 400 L354 386';

/**
 * The teacup: an upturned cup that swings into place as the work goes on, leaning. Dragging it
 * down tips it level and claps it over him; it rattles once, and that is that.
 */
export function TeacupScene(props: SceneProps) {
  const { monster, inks, still, t } = props;
  const { ended } = props;
  const cup = useSprite({ y: ended ? DOWN : HIGH, r: ended ? 0 : LEAN });
  const shadow = useSprite(ended ? {} : { o: 0.2, sx: 0.4, sy: 0.4 });
  const mon = useSprite(ended ? { o: 0 } : {});
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const puffs = useRef<PuffsHandle>(null);
  const own = useRef({ cy: HIGH, y0: 0, settling: false }).current;

  const setCup = (y: number, wobble = 0) => {
    own.cy = y;
    // Level by the time its rim is on the floor.
    put(cup, { y, r: lerp(LEAN, 0, clamp((y - SET) / (DOWN - SET))) + wobble });
    const k = clamp((y - HIGH) / (DOWN - HIGH));
    put(shadow, { o: 0.2 + k * 0.8, s: 0.4 + k * 0.6 });
  };

  const drop = () => {
    const { m } = rig;
    m.state = 'busy';
    const from = own.cy;
    rig.tw(
      130,
      (k) => setCup(lerp(from, DOWN, k)),
      (k) => k * k,
      () => {
        props.host.cue('catch-slam');
        props.host.shake(7);
        puffs.current?.fire(92, FLOOR - 4, { ...dust(inks.dark), angle: Math.PI });
        puffs.current?.fire(300, FLOOR - 4, { ...dust(inks.dark), angle: 0 });
        // He is under it now: nothing of him shows round the cup.
        put(mon, { o: 0 });
        rig.setMood('caught');
        props.host.react({ name: 'teacup.under' });
        // One rattle from inside, and it settles.
        rig.at(520, () => {
          props.host.cue('tick');
          rig.tw(
            460,
            (k) =>
              setCup(DOWN - Math.sin(k * Math.PI) * 10, Math.sin(k * Math.PI * 3) * 5 * (1 - k)),
            null,
            () => {
              setCup(DOWN);
              props.host.cue('catch-stick');
              thwack(rig, stamp);
              rig.win('teacup.won');
            },
          );
        });
      },
    );
  };

  const rig = useRig(props, {
    hint: () => HINT,
    tick: (time) => {
      const { m } = rig;
      if (m.state === 'during') {
        setCup(lerp(HIGH, SET, 1 - Math.pow(1 - m.p, 2)));
        rig.setMood(m.p < 0.45 ? 'idle' : 'nervous');
        put(mon, { x: 0, sx: 1 + 0.04 * m.p, sy: 1 - 0.07 * m.p });
        rig.say('teacup.setting');
      } else if (m.state === 'ready') {
        rig.say('teacup.ready');
        rig.setMood('nervous');
        if (!m.drag && !own.settling) setCup(SET + Math.max(0, Math.sin(time * 3)) * 10);
      }
    },
    down: (_x, y) => {
      if (rig.m.state !== 'ready') {
        if (rig.m.state === 'during') rig.refuse();
        return false;
      }
      own.y0 = y;
      props.host.cue('tick');
      return true;
    },
    move: (_x, y) => {
      // The first stretch follows the finger; past it the cup resists.
      const pulled = Math.max(0, y - own.y0);
      const eased = pulled < 120 ? pulled : 120 + (pulled - 120) * 0.35;
      const cy = Math.min(DOWN - 20, SET + eased);
      const k = (cy - SET) / (DOWN - SET);
      setCup(cy);
      put(mon, { x: Math.sin(Date.now() / 22) * k * 3, sx: 1.04 + k * 0.05, sy: 0.93 - k * 0.08 });
    },
    up: () => {
      if (rig.m.state !== 'ready') return;
      if (own.cy > DROPS_PAST) {
        drop();
        return;
      }
      const from = own.cy;
      own.settling = true;
      rig.tw(
        480,
        (k) => setCup(lerp(from, SET, k)),
        back,
        () => {
          own.settling = false;
        },
      );
      put(mon, { x: 0, sx: 1.04, sy: 0.93 });
      props.host.react({ name: 'teacup.almost' });
      props.host.cue('aww');
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <Shadow sprite={shadow} inks={inks} left={86} top={FLOOR - 10} width={220} height={20} />
      <SceneMonster
        monster={monster}
        mood={rig.mood}
        sprite={mon}
        still={still}
        left={76}
        top={FLOOR - feetOf(MONSTER_SIZE)}
      />
      <Animated.View style={[styles.cup, cup.style]}>
        <View style={[styles.handle, { borderColor: inks.tomato }]} />
        <View style={[styles.body, { borderBottomColor: inks.tomato }]} />
        <View style={[styles.rim, { backgroundColor: inks.tomato }]}>
          <View style={styles.rimShade} />
        </View>
      </Animated.View>
      <Hint ref={rig.hint} inks={inks} />
      <Stamp sprite={stamp} x={226} y={300} label={t('session.catch.stamp')} inks={inks} />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  cup: { position: 'absolute', left: 86, top: 0, width: 220, height: CUP_HEIGHT, zIndex: 4 },
  // Upturned: the foot is at the top and narrower, the mouth is at the bottom.
  body: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 220,
    height: 0,
    borderBottomWidth: CUP_HEIGHT - 10,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    right: -46,
    top: 44,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 17,
  },
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // The lip is the cup's own colour, a shade down.
  rimShade: { flex: 1, backgroundColor: 'rgba(28,26,23,0.22)' },
});
