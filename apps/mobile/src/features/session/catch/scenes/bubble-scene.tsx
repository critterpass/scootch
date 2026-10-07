import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { back, inOut, lerp, STAGE } from '../math';
import {
  Binder,
  BINDER_AT,
  Board,
  bumpBinder,
  Floor,
  Puffs,
  SceneMonster,
  Shadow,
  useSprite,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 560;
/** The bubble and the monster in it are one group, this big, moved by its middle. */
const GROUP = 300;
/** A flick has to travel at least this far up. */
const FLICK = 70;

/**
 * The bubble: it forms round him as the work goes on and lifts him off the floor. Flicked upward,
 * it wobbles off, drifts into the binder and pops.
 */
export function BubbleScene(props: SceneProps) {
  const { monster, inks, still, caughtCount, ended } = props;
  const group = useSprite(ended ? { o: 0 } : {});
  const bubble = useSprite({ sx: 0.12, sy: 0.12, o: 0.25 });
  const mon = useSprite();
  const shadow = useSprite(ended ? { o: 0 } : {});
  const binder = useSprite();
  const puffs = useRef<PuffsHandle>(null);
  const [landed, setLanded] = useState(ended);
  const own = useRef({
    c: [STAGE.middle, 498] as [number, number],
    size: 0.12,
    lift: 0,
    sx: 1,
    sy: 1,
    y0: 0,
    springing: false,
  }).current;

  const launch = () => {
    rig.m.state = 'busy';
    rig.setMood('nervous');
    props.host.react({ name: 'bubble.up' });
    props.host.buzz('light');
    props.host.cue('send');
    const from = [own.c[0], own.c[1] + own.lift] as const;
    const scale = own.sx;
    rig.tw(
      1150,
      (k) => {
        const e = inOut(k);
        const cx = lerp(from[0], BINDER_AT[0], e) + Math.sin(k * Math.PI * 3) * 28 * (1 - k);
        const cy = lerp(from[1], BINDER_AT[1], e) - Math.sin(k * Math.PI) * 40;
        const size = lerp(scale, 0.14, e);
        const wobble = Math.sin(k * 20) * 0.03;
        put(group, {
          x: cx - GROUP / 2,
          y: cy - GROUP / 2,
          sx: size * (1 + wobble),
          sy: size * (1 - wobble),
        });
        put(shadow, { o: 1 - k });
      },
      null,
      () => {
        put(group, { o: 0 });
        puffs.current?.fire(BINDER_AT[0], BINDER_AT[1], {
          count: 20,
          colors: ['#BFD9EA', '#FFFFFF', '#F7C9BA'],
          speed: 160,
          gravity: 60,
          life: 600,
        });
        props.host.buzz('medium');
        setLanded(true);
        bumpBinder(rig, binder);
        rig.win('bubble.won');
      },
    );
  };

  const rig = useRig(props, {
    tick: (time) => {
      const { m } = rig;
      if (m.state === 'busy' || m.state === 'caught') return;
      const p = m.p;
      own.c = [STAGE.middle, 498 - 70 * p * p];
      own.size = lerp(0.12, 1, p);
      rig.setMood(p < 0.5 ? 'idle' : 'nervous');
      rig.say(m.state === 'ready' ? 'bubble.ready' : p < 0.5 ? 'bubble.setting' : 'bubble.closing');
      // Whole and waiting, it bobs; in the hand it follows the finger.
      const bob = m.state === 'ready' && !m.drag ? Math.sin(time * 2) * 5 : 0;
      put(group, {
        x: own.c[0] - GROUP / 2,
        y: own.c[1] - GROUP / 2 + own.lift + bob,
        sx: own.sx,
        sy: own.sy,
      });
      put(bubble, {
        sx: own.size * (1 + Math.sin(time * 3) * 0.015),
        sy: own.size * (1 + Math.cos(time * 3) * 0.015),
        o: Math.min(1, 0.25 + p * 2),
      });
      put(shadow, { s: 1 - p * 0.35 });
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
      const pulled = Math.min(0, y - own.y0);
      const k = Math.min(1, -pulled / 220);
      own.lift = pulled * 0.45;
      own.sx = 1 - k * 0.1;
      own.sy = 1 + k * 0.14;
    },
    up: (_x, y) => {
      if (rig.m.state !== 'ready') return;
      if (y - own.y0 < -FLICK) {
        launch();
        return;
      }
      const from = { lift: own.lift, sx: own.sx, sy: own.sy };
      rig.tw(
        500,
        (k) => {
          own.lift = lerp(from.lift, 0, k);
          own.sx = lerp(from.sx, 1, k);
          own.sy = lerp(from.sy, 1, k);
        },
        back,
      );
      props.host.react({ name: 'bubble.more' });
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <Shadow sprite={shadow} left={96} top={FLOOR - 9} width={200} height={18} />
      <Animated.View style={[styles.group, group.style]}>
        <SceneMonster
          monster={monster}
          mood={rig.mood}
          sprite={mon}
          still={still}
          left={30}
          top={3}
        />
        <Animated.View style={[styles.bubble, bubble.style]}>
          <View style={styles.glint} />
          <View style={styles.glintSmall} />
        </Animated.View>
      </Animated.View>
      <Binder
        sprite={binder}
        count={caughtCount === null ? null : caughtCount + (landed ? 1 : 0)}
        inks={inks}
      />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  group: { position: 'absolute', left: 0, top: 0, width: GROUP, height: GROUP, zIndex: 3 },
  bubble: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1.5,
    borderColor: 'rgba(28,26,23,0.22)',
    backgroundColor: 'rgba(142,187,218,0.14)',
    boxShadow: 'inset 0 0 30px rgba(240,86,46,0.14)',
  },
  glint: {
    position: 'absolute',
    left: 70,
    top: 58,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  glintSmall: {
    position: 'absolute',
    left: 188,
    top: 204,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
