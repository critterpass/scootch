import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { REEL_CLICK, REEL_NEEDS, turnsWound, wound } from '../catch-rules';
import { clamp, easeOut, inOut, lerp, STAGE } from '../math';
import {
  Board,
  feetOf,
  Ink,
  MONSTER_SIZE,
  Puffs,
  SceneMonster,
  Stamp,
  STAMP_AWAY,
  squash,
  thwack,
  useSprite,
  type InkHandle,
  type InkStroke,
  type PuffsHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { arc, RING_BOX } from './reel-ring';
import { put } from '../sprite';
import { SessionText } from '../../ui/session-text';

const HORIZON = 250;
/** The reel's hub, and how near a touch has to be to take hold of it. */
const HUB = { x: 196, y: 712, reach: 96 } as const;
/** Where the line leaves the rod. */
const TIP = { x: 336, y: 604 } as const;
const FEET = feetOf(MONSTER_SIZE);
/** How high above his feet the hook holds him, at his full size. */
const HOOKED = 128;
/**
 * The reel: he is hooked far off on the horizon, and the work winds him closer. Three full turns
 * of the reel land him: each sixth of a turn clicks, he tugs back when the winding stops, and at
 * the end he is yanked out in an arc into the bucket.
 */
export function ReelScene(props: SceneProps) {
  const { monster, inks, still, t, ended } = props;
  const mon = useSprite(ended ? { x: 72 - MONSTER_SIZE / 2, y: 760 - FEET, sx: 0.5, sy: 0.5 } : {});
  const tumble = useSprite();
  const arm = useSprite();
  const knob = useSprite();
  const bucket = useSprite();
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const puffs = useRef<PuffsHandle>(null);
  const ink = useRef<InkHandle>(null);
  const ring = useRef<InkHandle>(null);
  const [turns, setTurns] = useState<number | null>(null);
  const rod: InkStroke = { d: 'M410 880 L336 604', width: 7, color: inks.ink };
  const track: InkStroke = { d: arc(1), width: 5, color: inks.track };
  const own = useRef({ near: 0, wound: 0, taut: 0, jolt: 0, last: 0, shown: -1 }).current;

  const spot = (near: number, time: number) => ({
    scale: lerp(0.36, 1.02, near),
    feet: lerp(268, 560, near),
    x: STAGE.middle + Math.sin(time * 1.3) * 70 * (1 - near) + own.jolt,
  });
  const drawLine = (hookX: number, hookY: number, time: number) => {
    const sag = lerp(70, 3, own.taut);
    const cx = (TIP.x + hookX) / 2 + Math.sin(time * 40) * own.taut * 2.5;
    const cy = (TIP.y + hookY) / 2 + sag;
    const d = `M${TIP.x} ${TIP.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${hookX.toFixed(1)} ${hookY.toFixed(1)}`;
    ink.current?.draw([{ d, width: 1.8, color: inks.ink }, rod]);
  };
  const place = (time: number) => {
    const { scale, feet, x } = spot(own.near, time);
    put(mon, { x: x - MONSTER_SIZE / 2, y: feet - FEET, s: scale });
    drawLine(x, feet - HOOKED * scale, time);
  };
  const showWinding = () => {
    const share = Math.round(clamp(own.wound / REEL_NEEDS) * 100);
    // Drawn again only when the ring or the count under it would change.
    const shown = share + (rig.m.state === 'ready' ? 1000 : 0);
    if (shown === own.shown) return;
    own.shown = shown;
    ring.current?.draw(
      share > 0 ? [track, { d: arc(share / 100), width: 5, color: inks.tomato }] : [track],
    );
    setTurns(rig.m.state === 'ready' ? turnsWound(own.wound) : null);
  };

  const yank = () => {
    const { m } = rig;
    m.state = 'busy';
    m.drag = false;
    setTurns(null);
    props.host.buzz('medium');
    rig.setMood('nervous');
    props.host.react({ name: 'reel.yank' });
    const from = spot(1, 0);
    const to = { x: 72, feet: 760, scale: 0.5 };
    rig.tw(
      760,
      (k) => {
        const e = inOut(k);
        const x = lerp(from.x, to.x, e);
        const feet = lerp(from.feet, to.feet, e) - Math.sin(k * Math.PI) * 280;
        const scale = lerp(from.scale, to.scale, e) * (1 + Math.sin(k * Math.PI) * 0.25);
        put(mon, { x: x - MONSTER_SIZE / 2, y: feet - FEET, s: scale });
        put(tumble, { r: k * 360 });
        own.taut = 1;
        if (k < 0.6) drawLine(x, feet - HOOKED * scale, 0);
        else ink.current?.draw([rod]);
      },
      null,
      () => {
        puffs.current?.fire(72, 680, {
          count: 22,
          colors: ['#8EBBDA', '#BFD9EA', '#FFFFFF'],
          angle: -Math.PI / 2,
          spread: 1.5,
          speed: 260,
          gravity: 560,
          life: 900,
        });
        props.host.buzz('heavy');
        squash(rig, bucket, 480, [
          [0, 1.14, 0.84],
          [0.45, 0.95, 1.06],
          [1, 1, 1],
        ]);
        rig.setMood('caught');
        rig.at(260, () => thwack(rig, stamp));
        rig.win('reel.won');
      },
    );
  };

  const rig = useRig(props, {
    tick: (time, dt) => {
      const { m } = rig;
      if (m.state === 'busy' || m.state === 'caught') return;
      if (m.state === 'during') {
        own.near = 0.7 * easeOut(m.p);
        own.taut = m.p * 0.4;
        own.wound = 0;
        rig.setMood(own.near < 0.42 ? 'idle' : 'nervous');
        rig.say(m.p < 0.6 ? 'reel.setting' : 'reel.noticed');
      } else {
        // He slips back out whenever the winding stops.
        if (!m.drag && own.wound > 0) own.wound = Math.max(0, own.wound - dt * 1.4);
        own.near = 0.7 + 0.3 * clamp(own.wound / REEL_NEEDS);
        own.taut += ((m.drag ? 0.9 : 0.45) - own.taut) * 0.08;
        rig.setMood('nervous');
        if (own.wound === 0) rig.say('reel.ready');
      }
      showWinding();
      own.jolt *= 0.86;
      place(time);
    },
    down: (x, y) => {
      if (Math.hypot(x - HUB.x, y - HUB.y) > HUB.reach) return false;
      if (rig.m.state !== 'ready') {
        if (rig.m.state === 'during') {
          rig.tw(360, (k) => put(knob, { r: Math.sin(k * Math.PI * 2) * -10 }));
          rig.refuse();
        }
        return false;
      }
      own.last = Math.atan2(y - HUB.y, x - HUB.x);
      return true;
    },
    move: (x, y) => {
      if (rig.m.state !== 'ready') return;
      const angle = Math.atan2(y - HUB.y, x - HUB.x);
      const turned = wound(own.last, angle);
      own.last = angle;
      put(arm, { r: (angle * 180) / Math.PI + 90 });
      if (turned <= 0) return;
      const before = Math.floor(own.wound / REEL_CLICK);
      own.wound += turned;
      const clicks = Math.floor(own.wound / REEL_CLICK);
      if (clicks > before) {
        props.host.cue('tick');
        props.host.buzz('tick');
        own.jolt = (Math.random() - 0.5) * 14;
        own.taut = 1;
        if (clicks % 6 === 0) {
          const turn = clicks / 6;
          props.host.react({
            name: turn === 1 ? 'reel.fighting' : turn === 2 ? 'reel.oneMore' : 'reel.winding',
          });
        }
      }
      if (own.wound >= REEL_NEEDS) yank();
    },
    up: () => {
      if (rig.m.state === 'ready' && own.wound > 0.3) props.host.react({ name: 'reel.stopped' });
    },
  });

  return (
    <Board>
      <View style={[styles.field, { top: HORIZON }]} />
      <View style={[styles.horizon, { top: HORIZON, backgroundColor: inks.hairline }]} />
      <View style={styles.water}>
        <View style={styles.waterTop} />
      </View>
      <SceneMonster
        monster={monster}
        mood={rig.mood}
        sprite={mon}
        spin={tumble}
        still={still}
        zIndex={2}
      />
      <Animated.View style={[styles.bucket, bucket.style]}>
        <View style={styles.bucketBody} />
        <View style={styles.bucketBand} />
      </Animated.View>
      <Ink ref={ink} first={[rod]} style={styles.lines} />
      <Animated.View style={[styles.knob, { backgroundColor: inks.surface }, knob.style]}>
        <Ink ref={ring} first={[track]} style={styles.ring} />
        <Animated.View style={[styles.arm, arm.style]}>
          <View style={[styles.spoke, { backgroundColor: inks.track }]} />
          <View style={[styles.handle, { backgroundColor: inks.tomato }]} />
        </Animated.View>
        <View style={[styles.hub, { backgroundColor: inks.ink }]} />
      </Animated.View>
      {turns === null ? null : (
        <View style={styles.turns}>
          <SessionText face="note" color={inks.muted} style={styles.turnsText}>
            {t('session.catch.reel.turns', { count: turns })}
          </SessionText>
        </View>
      )}
      <Stamp sprite={stamp} x={150} y={600} label={t('session.catch.stamp')} inks={inks} />
      <Puffs ref={puffs} />
    </Board>
  );
}

const styles = StyleSheet.create({
  // The ground runs past the board's edges, so a wider phone has no bare strip at its sides.
  field: {
    position: 'absolute',
    left: -400,
    right: -400,
    height: 1200,
    backgroundColor: 'rgba(184,172,151,0.18)',
  },
  horizon: { position: 'absolute', left: -400, right: -400, height: 2 },
  water: {
    position: 'absolute',
    left: 14,
    top: 668,
    width: 116,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8E8370',
    zIndex: 1,
    padding: 4,
    paddingHorizontal: 8,
  },
  waterTop: { flex: 1, borderRadius: 8, backgroundColor: '#8EBBDA' },
  bucket: {
    position: 'absolute',
    left: 14,
    top: 676,
    width: 116,
    height: 92,
    zIndex: 4,
    transformOrigin: 'bottom',
  },
  bucketBody: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    bottom: 0,
    backgroundColor: '#B8AC97',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  bucketBand: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(28,26,23,0.18)',
  },
  lines: { zIndex: 3 },
  knob: {
    position: 'absolute',
    left: HUB.x - 64,
    top: HUB.y - 64,
    width: 128,
    height: 128,
    borderRadius: 64,
    zIndex: 5,
    boxShadow: '0 10px 30px rgba(28,26,23,0.12)',
  },
  ring: { left: -14, top: -14, width: RING_BOX, height: RING_BOX },
  arm: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  spoke: {
    position: 'absolute',
    left: 61,
    top: 30,
    width: 6,
    height: 36,
    borderRadius: 3,
  },
  handle: { position: 'absolute', left: 48, top: 12, width: 32, height: 32, borderRadius: 16 },
  hub: { position: 'absolute', left: 53, top: 53, width: 22, height: 22, borderRadius: 11 },
  turns: { position: 'absolute', left: 0, right: 0, top: HUB.y + 82, zIndex: 5 },
  turnsText: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
