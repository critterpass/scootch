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
  squash,
  thwack,
  useSprite,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 560;
/** The jar's height off its resting place: hanging high at the start, hovering once set. */
const HIGH = -180;
const SET = 130;
const DOWN = 310;
/** Pulled past here and let go, it slams; short of it, it springs back. */
const SLAMS_PAST = 205;

/** The gesture, as the hint traces it. */
const HINT = 'M330 250 L330 400 M316 386 L330 400 L344 386';

/**
 * The jar: it lowers a little with every minute of work, and the monster grows twitchy as its
 * shadow spreads. Pulling it down slams it over him; a card slides under, and the whole jar flips
 * over with him inside.
 */
export function JarScene(props: SceneProps) {
  const { monster, inks, still, t } = props;
  const { ended } = props;
  const jar = useSprite({ y: ended ? DOWN : HIGH });
  const shadow = useSprite(ended ? {} : { o: 0.2, sx: 0.4, sy: 0.4 });
  const mon = useSprite();
  const tumble = useSprite();
  const card = useSprite(ended ? {} : { x: 420, o: 0 });
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const puffs = useRef<PuffsHandle>(null);
  const own = useRef({ jy: HIGH, y0: 0, settling: false }).current;
  // Glass catches the light of the page it stands on: a glare on paper, a glint in the dark.
  const shine = inks.dark ? 0.22 : 0.85;

  const setJar = (y: number, turn = 0) => {
    own.jy = y;
    put(jar, { y, r: turn });
    const k = clamp((y - HIGH) / 490);
    put(shadow, { o: 0.2 + k * 0.8, s: 0.4 + k * 0.6 });
  };

  const slam = () => {
    const { m } = rig;
    m.state = 'busy';
    const from = own.jy;
    rig.tw(
      110,
      (k) => setJar(lerp(from, DOWN, k)),
      (k) => k * k,
      () => {
        props.host.cue('catch-slam');
        props.host.shake(9);
        puffs.current?.fire(98, FLOOR - 4, { ...dust(inks.dark), angle: Math.PI });
        puffs.current?.fire(294, FLOOR - 4, { ...dust(inks.dark), angle: 0 });
        rig.setMood('nervous');
        put(mon, { x: 0 });
        squash(rig, mon, 480, [
          [0, 1.1, 0.78],
          [0.4, 0.95, 1.08],
          [1, 1, 1],
        ]);
        props.host.react({ name: 'jar.under' });
        rig.at(620, () => {
          props.host.cue('send');
          put(card, { o: 1 });
          rig.tw(520, (k) =>
            put(card, { x: k < 0.8 ? lerp(420, -8, k / 0.8) : lerp(-8, 0, (k - 0.8) / 0.2) }),
          );
          props.host.react({ name: 'jar.card' });
        });
        rig.at(1350, () => {
          rig.setMood('caught');
          props.host.cue('catch-swoosh');
          // The jar turns right over, and he tumbles round inside it.
          rig.tw(
            780,
            (k) => {
              setJar(DOWN - Math.sin(k * Math.PI) * 80, back(k) * 180);
              put(mon, { y: -Math.sin(k * Math.PI) * 80, s: 1 - Math.sin(k * Math.PI) * 0.08 });
              put(tumble, { r: k * 360 });
            },
            null,
            () => {
              props.host.cue('catch-stick');
              thwack(rig, stamp);
              rig.win('jar.won');
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
        setJar(lerp(HIGH, SET, 1 - Math.pow(1 - m.p, 2)));
        rig.setMood(m.p < 0.45 ? 'idle' : 'nervous');
        put(mon, { x: 0, sx: 1 + 0.04 * m.p, sy: 1 - 0.07 * m.p });
        rig.say('jar.setting');
      } else if (m.state === 'ready') {
        rig.say('jar.ready');
        rig.setMood('nervous');
        if (!m.drag && !own.settling) setJar(SET + Math.max(0, Math.sin(time * 3)) * 12);
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
      // The first stretch follows the finger; past it the jar resists.
      const pulled = Math.max(0, y - own.y0);
      const eased = pulled < 120 ? pulled : 120 + (pulled - 120) * 0.35;
      const jy = Math.min(300, SET + eased);
      const k = (jy - SET) / 170;
      setJar(jy);
      put(mon, { x: Math.sin(Date.now() / 22) * k * 3, sx: 1.04 + k * 0.05, sy: 0.93 - k * 0.08 });
    },
    up: () => {
      if (rig.m.state !== 'ready') return;
      if (own.jy > SLAMS_PAST) {
        slam();
        return;
      }
      const from = own.jy;
      own.settling = true;
      rig.tw(
        480,
        (k) => setJar(lerp(from, SET, k)),
        back,
        () => {
          own.settling = false;
        },
      );
      put(mon, { x: 0, sx: 1.04, sy: 0.93 });
      props.host.react({ name: 'jar.almost' });
      props.host.cue('aww');
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <Shadow sprite={shadow} inks={inks} left={96} top={FLOOR - 10} width={200} height={20} />
      <SceneMonster
        monster={monster}
        mood={rig.mood}
        sprite={mon}
        spin={tumble}
        still={still}
        left={76}
        top={FLOOR - feetOf(MONSTER_SIZE)}
      />
      <Animated.View style={[styles.jar, jar.style]}>
        <View style={[styles.body, { borderColor: inks.ink }]}>
          <View style={[styles.shine, styles.shineLong, { opacity: shine }]} />
          <View style={[styles.shine, styles.shineShort, { opacity: shine }]} />
        </View>
        <View style={[styles.rim, { borderColor: inks.ink, backgroundColor: `${inks.page}BF` }]}>
          <View style={[styles.thread, { backgroundColor: inks.hairline }]} />
          <View style={[styles.thread, { backgroundColor: inks.hairline }]} />
        </View>
        <Animated.View
          style={[styles.card, { backgroundColor: inks.tomato, borderColor: inks.ink }, card.style]}
        />
      </Animated.View>
      <Hint ref={rig.hint} inks={inks} />
      <Stamp sprite={stamp} x={226} y={336} label={t('session.catch.stamp')} inks={inks} />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  jar: { position: 'absolute', left: 96, top: 0, width: 200, height: 250, zIndex: 4 },
  body: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    height: 228,
    borderWidth: 3,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 46,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: 'rgba(142,187,218,0.16)',
  },
  shine: {
    position: 'absolute',
    left: 18,
    width: 13,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  shineLong: { top: 28, height: 118 },
  shineShort: { top: 156, height: 18 },
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    borderWidth: 3,
    borderRadius: 9,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  thread: { height: 2, borderRadius: 1 },
  card: {
    position: 'absolute',
    left: -16,
    top: 247,
    width: 232,
    height: 12,
    borderRadius: 4,
    borderWidth: 2,
  },
});
