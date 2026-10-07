import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { swipeMade, type TimedPoint } from '../catch-rules';
import { clamp, easeOut, lerp, STAGE } from '../math';
import {
  Board,
  Hint,
  dust,
  feetOf,
  Floor,
  Ink,
  MONSTER_SIZE,
  Puffs,
  SceneMonster,
  Shadow,
  Stamp,
  STAMP_AWAY,
  thwack,
  useSprite,
  type InkHandle,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 560;
const FEET = feetOf(MONSTER_SIZE);
const BODY = 62;
interface NetAt {
  x: number;
  y: number;
  r: number;
  s: number;
}

/** Where the net waits, leaning, and how it is held: by the middle of its hoop. */
const REST: NetAt = { x: 316, y: 630, r: -10, s: 1 };
const HOOP = { x: 75, y: 30 } as const;
const BAG = 122;
/** The bag's mesh: threads ten points apart, crossing both ways. */
const MESH = [1, -1].map((way) =>
  Array.from({ length: 25 }, (_, index) => {
    const x = (index - 12) * 10;
    return way > 0 ? `M${x} 0 L${x + BAG} ${BAG}` : `M${x} ${BAG} L${x + BAG} 0`;
  }).join(' '),
);
/** How many touches of the swipe leave a trail. */
const TRAIL = 14;

/** The gesture, as the hint traces it. */
const HINT = 'M70 505 L322 505 M308 491 L322 505 L308 519';

/**
 * The net: he flits about in the air, and the work makes him dozy until he sinks to the floor. One
 * quick swipe across him swoops the net over and pins him with a thud. Swiped at early, he just
 * bobs out of the way.
 */
export function NetScene(props: SceneProps) {
  const { monster, inks, still, t, ended } = props;
  const mon = useSprite();
  const shadow = useSprite();
  const net = useSprite({ x: REST.x - HOOP.x, y: REST.y - HOOP.y, r: REST.r });
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const ink = useRef<InkHandle>(null);
  const puffs = useRef<PuffsHandle>(null);
  const own = useRef({
    phase: 0,
    bob: 0,
    mx: STAGE.middle,
    my: FLOOR - BODY,
    feet: FLOOR,
    swooping: false,
    path: [] as TimedPoint[],
    token: 0,
    net: { ...REST },
  }).current;

  const placeNet = () =>
    put(net, { x: own.net.x - HOOP.x, y: own.net.y - HOOP.y, r: own.net.r, s: own.net.s });
  const trail = (strength: number) => {
    const recent = own.path.slice(-TRAIL);
    ink.current?.draw(
      recent.slice(1).map((point, index) => {
        const before = recent[index] ?? point;
        const k = (index + 1) / recent.length;
        return {
          d: `M${before[0].toFixed(1)} ${before[1].toFixed(1)} L${point[0].toFixed(1)} ${point[1].toFixed(1)}`,
          width: 2 + k * 14,
          color: inks.ink,
          opacity: strength * k * 0.45,
        };
      }),
    );
  };

  const swoop = (direction: 1 | -1) => {
    rig.m.state = 'busy';
    own.swooping = true;
    const from = { ...own.net };
    const to = { x: own.mx, y: FLOOR - 6 };
    props.host.cue('catch-swoosh');
    rig.tw(
      320,
      (k) => {
        const e = easeOut(k);
        own.net = {
          x: lerp(from.x, to.x, e),
          y: lerp(from.y, to.y, e) - Math.sin(k * Math.PI) * 170,
          r: lerp(from.r, direction > 0 ? 180 : -180, e),
          s: lerp(1, 1.3, e),
        };
        placeNet();
      },
      null,
      () => {
        props.host.cue('catch-slam');
        props.host.shake(7);
        puffs.current?.fire(to.x - 90, FLOOR - 4, { ...dust(inks.dark), angle: Math.PI });
        puffs.current?.fire(to.x + 90, FLOOR - 4, { ...dust(inks.dark), angle: 0 });
        rig.setMood('nervous');
        // He struggles under it, then gives in.
        const x = own.mx - MONSTER_SIZE / 2;
        rig.tw(900, (k) => {
          const fight = Math.sin(k * Math.PI * 6) * (1 - k);
          put(mon, { x: x + fight * 6, r: fight * 6 });
        });
        rig.at(900, () => {
          rig.setMood('caught');
          thwack(rig, stamp);
          rig.win('net.won');
        });
      },
    );
  };

  const rig = useRig(props, {
    hint: () => HINT,
    tick: (time, dt) => {
      const { m } = rig;
      if (m.state === 'busy' || m.state === 'caught') return;
      const p = m.p;
      const reach = lerp(110, 0, clamp(p * 1.05));
      own.phase += lerp(2.2, 0.3, p) * dt;
      const height = lerp(150, 0, easeOut(p));
      const x = STAGE.middle + Math.sin(own.phase) * reach;
      const feet = FLOOR - height + Math.sin(own.phase * 2.3) * 14 * (1 - p) + own.bob;
      own.mx = x;
      own.my = feet - BODY;
      own.feet = feet;
      put(mon, { x: x - MONSTER_SIZE / 2, y: feet - FEET });
      put(shadow, { x: x - 55, s: 1 - (FLOOR - feet) / 300 });
      if (!own.swooping) {
        own.net.r = REST.r + Math.sin(time * 1.5) * 3;
        placeNet();
      }
      rig.setMood(p < 0.55 ? 'idle' : p < 1 ? 'nervous' : 'caught');
      rig.say(m.state === 'ready' ? 'net.ready' : p < 0.55 ? 'net.setting' : 'net.dozy');
    },
    down: (x, y) => {
      if (rig.m.state === 'busy' || rig.m.state === 'caught') return false;
      own.path = [[x, y, Date.now()]];
      own.token += 1;
      return true;
    },
    move: (x, y) => {
      own.path.push([x, y, Date.now()]);
      trail(1);
    },
    up: () => {
      const token = own.token;
      rig.tw(
        260,
        (k) => {
          if (token === own.token) trail(1 - k);
        },
        null,
        () => {
          if (token === own.token) ink.current?.draw([]);
        },
      );
      const swipe = swipeMade(own.path, [own.mx, own.my]);
      if (!swipe) return;
      const ready = rig.m.state === 'ready';
      if (swipe.across && swipe.quick && ready) {
        swoop(swipe.direction);
      } else if (swipe.across && !ready) {
        rig.tw(300, (k) => {
          own.bob = -120 * Math.sin(k * Math.PI);
        });
        props.host.react({ name: 'net.quick' });
        props.host.cue('cancel');
      } else if (ready) {
        props.host.react({ name: swipe.across ? 'net.faster' : 'net.missed' });
      }
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <Shadow sprite={shadow} inks={inks} left={0} top={FLOOR - 8} width={110} height={16} />
      <SceneMonster monster={monster} mood={rig.mood} sprite={mon} still={still} />
      <Animated.View style={[styles.net, net.style]}>
        <View style={styles.bag}>
          <Ink
            style={styles.mesh}
            first={MESH.map((d) => ({ d, width: 1.5, color: inks.ink, opacity: 0.42 }))}
          />
        </View>
        <View style={styles.handle} />
        <View style={[styles.hoop, { borderColor: inks.ink }]} />
      </Animated.View>
      <Ink ref={ink} style={styles.trail} />
      <Hint ref={rig.hint} inks={inks} />
      <Stamp sprite={stamp} x={236} y={340} label={t('session.catch.stamp')} inks={inks} />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  net: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 150,
    height: 300,
    zIndex: 7,
    transformOrigin: `${HOOP.x}px ${HOOP.y}px`,
  },
  bag: {
    position: 'absolute',
    left: 14,
    top: 28,
    width: BAG,
    height: BAG,
    borderBottomLeftRadius: 61,
    borderBottomRightRadius: 61,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  mesh: { width: BAG, height: BAG },
  handle: {
    position: 'absolute',
    left: 136,
    top: 26,
    width: 8,
    height: 250,
    borderRadius: 4,
    backgroundColor: '#C9A574',
    transformOrigin: '4px 4px',
    transform: [{ rotate: '-28deg' }],
  },
  hoop: {
    position: 'absolute',
    left: 5,
    top: 0,
    width: 140,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
  },
  trail: { zIndex: 8 },
});
