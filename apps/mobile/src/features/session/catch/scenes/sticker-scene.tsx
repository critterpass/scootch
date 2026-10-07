import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { back, clamp, easeOut, keyed, lerp } from '../math';
import {
  Board,
  Ink,
  Puffs,
  SceneMonster,
  Stamp,
  STAMP_AWAY,
  thwack,
  useSprite,
  type InkHandle,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { PAGE, placeAt, StickerPage } from './sticker-page';
import { put } from '../sprite';

/** The sticker on its sheet. */
const STICKER = { x: 98, y: 206, w: 196, h: 222, cx: 196, cy: 317 } as const;
/** The cut line runs this far outside it. */
const CUT = 9;
/** Let go within this distance of the empty spot, he sticks. */
const STICKS_WITHIN = 95;

/** The cut line: a rounded box drawn from the top of its middle, clockwise, as a clock hand goes. */
function cutPath(): string {
  const l = STICKER.x - CUT;
  const t = STICKER.y - CUT;
  const r = STICKER.x + STICKER.w + CUT;
  const b = STICKER.y + STICKER.h + CUT;
  const c = 38;
  return (
    `M${STICKER.cx} ${t} L${r - c} ${t} A${c} ${c} 0 0 1 ${r} ${t + c} L${r} ${b - c} ` +
    `A${c} ${c} 0 0 1 ${r - c} ${b} L${l + c} ${b} A${c} ${c} 0 0 1 ${l} ${b - c} ` +
    `L${l} ${t + c} A${c} ${c} 0 0 1 ${l + c} ${t} Z`
  );
}
const CUT_PATH = cutPath();

/**
 * The sticker: he is printed on a sheet, and a dashed cut line traces round him like a clock hand,
 * closing when time is up. Then a corner curls: he is peeled off, dragged to the empty place on
 * this month's page, and stuck there.
 */
export function StickerScene(props: SceneProps) {
  const { monster, inks, still, t, monthMates, monthName, ended } = props;
  // The page being filled: six places, and the first empty one is his.
  const onPage = monthMates.slice(Math.floor(monthMates.length / PAGE) * PAGE);
  const place = placeAt(onPage.length);
  const sticker = useSprite(
    ended ? { x: place[0] - STICKER.cx, y: place[1] - STICKER.cy, r: -3, sx: 0.45, sy: 0.45 } : {},
  );
  const mon = useSprite();
  const peel = useSprite({ sx: 0, sy: 0 });
  const wobble = useSprite();
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const ink = useRef<InkHandle>(null);
  const puffs = useRef<PuffsHandle>(null);
  const [lifted, setLifted] = useState(false);
  const [near, setNear] = useState(false);
  const [stuck, setStuck] = useState(ended);
  const own = useRef({
    c: [STICKER.cx, STICKER.cy] as [number, number],
    r: 0,
    s: 1,
    lifted: false,
    finger: [0, 0] as [number, number],
    grip: [0, 0] as [number, number],
    cut: -1,
    peel: false,
    near: false,
  }).current;

  const apply = () =>
    put(sticker, { x: own.c[0] - STICKER.cx, y: own.c[1] - STICKER.cy, r: own.r, s: own.s });
  const isNear = () => Math.hypot(own.c[0] - place[0], own.c[1] - place[1]) < STICKS_WITHIN;
  const curl = (on: boolean) => {
    if (own.peel === on) return;
    own.peel = on;
    rig.tw(on ? 480 : 200, (k) => put(peel, { s: on ? back(k) : 1 - k }));
  };
  const showNear = (on: boolean) => {
    if (own.near === on) return;
    own.near = on;
    setNear(on);
  };

  const stick = () => {
    rig.m.state = 'busy';
    const from = { c: own.c.slice(), r: own.r, s: own.s };
    rig.tw(
      220,
      (k) => {
        own.c = [lerp(from.c[0] ?? 0, place[0], k), lerp(from.c[1] ?? 0, place[1], k)];
        own.r = lerp(from.r, -3, k);
        own.s = lerp(from.s, 0.45, k);
        apply();
      },
      easeOut,
      () => {
        setLifted(false);
        setStuck(true);
        // It lands with a thwap: big, then flat.
        rig.tw(400, (k) =>
          put(sticker, {
            s:
              0.45 *
              keyed(k, [
                [0, 1.3],
                [0.45, 0.9],
                [1, 1],
              ]),
          }),
        );
        props.host.buzz('medium');
        props.host.cue('tick');
        puffs.current?.fire(place[0], place[1], {
          count: 16,
          colors: [inks.tomato, inks.ink, '#E7DCCB'],
          speed: 150,
          gravity: 40,
          life: 600,
        });
        rig.setMood('caught');
        rig.at(200, () => thwack(rig, stamp));
        rig.win('sticker.won');
      },
    );
  };

  const rig = useRig(props, {
    tick: () => {
      const { m } = rig;
      if (m.state === 'during' || m.state === 'ready') {
        const cut = Math.round(clamp(m.p) * 200);
        const closed = m.state === 'ready' ? 1 : 0;
        if (cut * 2 + closed !== own.cut) {
          own.cut = cut * 2 + closed;
          ink.current?.draw([
            {
              d: CUT_PATH,
              width: 2.5,
              color: closed ? inks.tomato : inks.ink,
              dash: [7, 6],
              end: cut / 200,
            },
          ]);
        }
        if (!own.lifted) rig.setMood(m.p < 0.5 ? 'idle' : 'nervous');
        put(mon, { sy: 1 - 0.05 * m.p });
        curl(m.state === 'ready' && !own.lifted);
        rig.say(m.state === 'ready' ? 'sticker.ready' : 'sticker.setting');
      }
      if (!own.lifted) return;
      // Peeled, he trails the finger, tilts with the way he is carried, and shrinks to fit.
      const before = own.c[0];
      own.c[0] += (own.finger[0] - own.grip[0] - own.c[0]) * 0.35;
      own.c[1] += (own.finger[1] - own.grip[1] - own.c[1]) * 0.35;
      own.r += (clamp((own.c[0] - before) * 1.5, -20, 20) - own.r) * 0.2;
      own.s += (0.5 - own.s) * 0.22;
      apply();
      showNear(isNear());
    },
    down: (x, y) => {
      const inside =
        x >= STICKER.x &&
        x <= STICKER.x + STICKER.w &&
        y >= STICKER.y &&
        y <= STICKER.y + STICKER.h;
      if (!inside) return false;
      if (rig.m.state !== 'ready') {
        if (rig.m.state === 'during') {
          rig.tw(360, (k) => put(wobble, { r: Math.sin(k * Math.PI * 2) * -3 }));
          rig.refuse();
        }
        return false;
      }
      own.lifted = true;
      own.finger = [x, y];
      own.grip = [(x - STICKER.cx) * 0.5, (y - STICKER.cy) * 0.5];
      setLifted(true);
      curl(false);
      rig.setMood('nervous');
      props.host.cue('squeak');
      props.host.buzz('light');
      props.host.react({ name: 'sticker.peeled' });
      return true;
    },
    move: (x, y) => {
      own.finger = [x, y];
    },
    up: () => {
      if (!own.lifted) return;
      own.lifted = false;
      showNear(false);
      if (isNear()) {
        stick();
        return;
      }
      const from = { c: own.c.slice(), r: own.r, s: own.s };
      rig.tw(
        480,
        (k) => {
          own.c = [lerp(from.c[0] ?? 0, STICKER.cx, k), lerp(from.c[1] ?? 0, STICKER.cy, k)];
          own.r = lerp(from.r, 0, k);
          own.s = lerp(from.s, 1, k);
          apply();
        },
        back,
        () => setLifted(false),
      );
      props.host.react({ name: 'sticker.notThere' });
      props.host.cue('aww');
    },
  });

  return (
    <Board>
      <View style={[styles.sheet, { backgroundColor: inks.risoBlob }]} />
      <View style={[styles.hole, { backgroundColor: inks.hairline }]} />
      <Ink ref={ink} />
      <StickerPage
        mates={onPage}
        monthName={monthName}
        near={near}
        stuck={stuck}
        inks={inks}
        t={t}
      />
      <Animated.View style={[styles.sticker, sticker.style]}>
        <Animated.View style={[styles.paper, lifted ? styles.paperLifted : null, wobble.style]}>
          <SceneMonster
            monster={monster}
            mood={rig.mood}
            sprite={mon}
            still={still}
            size={214}
            left={-9}
            top={8}
          />
          <Animated.View style={[styles.peel, peel.style]} />
        </Animated.View>
      </Animated.View>
      <Stamp sprite={stamp} x={250} y={600} label={t('session.catch.stamp')} inks={inks} />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 36,
    top: 176,
    width: 321,
    height: 272,
    borderRadius: 20,
  },
  hole: {
    position: 'absolute',
    left: STICKER.x,
    top: STICKER.y,
    width: STICKER.w,
    height: STICKER.h,
    borderRadius: 30,
  },
  sticker: {
    position: 'absolute',
    left: STICKER.x,
    top: STICKER.y,
    width: STICKER.w,
    height: STICKER.h,
    zIndex: 6,
  },
  paper: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(28,26,23,0.08)',
  },
  paperLifted: { boxShadow: '0 26px 34px -12px rgba(28,26,23,0.4)' },
  peel: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 46,
    height: 46,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 14,
    backgroundColor: '#E0D6C5',
    transformOrigin: 'top right',
    boxShadow: '-3px 3px 7px rgba(28,26,23,0.14)',
  },
});
