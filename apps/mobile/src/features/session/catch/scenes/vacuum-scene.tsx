import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { holdControl, holdReducer, type HoldInput } from '../../hold-control';
import { SessionText } from '../../ui/session-text';
import { easeIn, lerp } from '../math';
import {
  Board,
  Hint,
  feetOf,
  Floor,
  Ink,
  MONSTER_SIZE,
  SceneMonster,
  Stamp,
  STAMP_AWAY,
  squash,
  thwack,
  useSprite,
  type InkHandle,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 520;
/** The vacuum, and the part of the board that takes hold of it. */
const VACUUM = { x: 215, y: 400 } as const;
const GRIP = { left: 215, top: 390, bottom: 560 } as const;
const CELLS = 4;
/** The height the air is pulled in at. */
const MOUTH = 475;

/** The gesture, as the hint traces it. */
const HINT = 'M346 415 A60 60 0 1 1 345.9 415';

/**
 * The vacuum: it charges while the work goes on, one cell at a time. Pressed and held, he
 * stretches, clings on, and is slurped into the bag; let go of early, he snaps back. It is the
 * hold the session always ended on, so the same rising sound plays under it.
 */
export function VacuumScene(props: SceneProps) {
  const { monster, inks, still, t, ended } = props;
  const mon = useSprite(ended ? { o: 0 } : {});
  const vacuum = useSprite();
  const body = useSprite();
  const stamp = useSprite(ended ? { r: 9 } : STAMP_AWAY);
  const ink = useRef<InkHandle>(null);
  const [cells, setCells] = useState(0);
  const [label, setLabel] = useState<'charging' | 'hold' | 'full'>(ended ? 'full' : 'charging');
  const own = useRef({ hold: holdControl('hold'), cells: -1, label: 'charging' }).current;

  // The hold is the session's own: every step of it goes to the store as it always has.
  const input = (next: HoldInput) => {
    const step = holdReducer(own.hold, next);
    own.hold = step.control;
    for (const event of step.send) void props.host.sendFinish(event);
  };
  const show = (next: 'charging' | 'hold' | 'full') => {
    if (own.label === next) return;
    own.label = next;
    setLabel(next);
  };

  const slurp = () => {
    rig.m.state = 'busy';
    rig.m.drag = false;
    ink.current?.draw([]);
    put(vacuum, { x: 0, y: 0 });
    rig.tw(
      240,
      (k) => put(mon, { x: 34 + k * 66, y: k * 10, sx: 1.3 * (1 - k), sy: 0.86 * (1 - k * 0.7) }),
      easeIn,
      () => {
        put(mon, { o: 0 });
        props.host.cue('catch-slurp');
        squash(rig, body, 520, [
          [0, 1, 1],
          [0.3, 1.18, 0.9],
          [0.6, 0.96, 1.05],
          [1, 1, 1],
        ]);
        show('full');
        rig.at(250, () => thwack(rig, stamp));
        // The finish went with the hold itself.
        rig.win('vacuum.won', true);
      },
    );
  };

  const rig = useRig(props, {
    hint: () => HINT,
    tick: (time, dt) => {
      const { m } = rig;
      if (m.state === 'busy' || m.state === 'caught') return;
      const charged = Math.floor(m.p * CELLS + 1e-6);
      if (charged !== own.cells) {
        own.cells = charged;
        setCells(charged);
      }
      show(m.state === 'ready' ? 'hold' : 'charging');
      rig.setMood(m.p < 0.5 ? 'idle' : 'nervous');
      if (m.state === 'ready') rig.say('vacuum.ready');
      else rig.say('vacuum.setting', { percent: Math.round(m.p * 100) });

      input({ type: 'frame', elapsedMs: dt * 1000 });
      const pull = own.hold.progress;
      const holding = own.hold.holding;
      const judder = holding ? Math.sin(time * 60) * pull * 2 : 0;
      put(mon, { x: pull * 34 + judder, sx: 1 + pull * 0.3, sy: 1 - pull * 0.14 });
      put(vacuum, {
        x: holding ? Math.sin(time * 70) * 1.5 : 0,
        y: holding ? Math.cos(time * 63) * 1.2 : 0,
      });
      ink.current?.draw(
        pull > 0.02
          ? Array.from({ length: 7 }, (_, index) => {
              const k = (time * 2.4 + index / 7) % 1;
              const x = lerp(120, 214, k);
              const y = MOUTH + Math.sin(index * 2.1) * 46 * (1 - k);
              return {
                d: `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + 14).toFixed(1)} ${(y + (MOUTH - y) * 0.12).toFixed(1)}`,
                width: 2,
                color: inks.ink,
                opacity: pull * Math.sin(k * Math.PI) * 0.6,
              };
            })
          : [],
      );
      if (own.hold.finished) slurp();
    },
    down: (x, y) => {
      if (x < GRIP.left || y < GRIP.top || y > GRIP.bottom) return false;
      if (rig.m.state !== 'ready') {
        if (rig.m.state === 'during') {
          rig.tw(360, (k) => put(vacuum, { r: Math.sin(k * Math.PI * 2) * -4 }));
          rig.refuse();
        }
        return false;
      }
      input({ type: 'pressed' });
      props.host.react({ name: 'vacuum.holding' });
      return true;
    },
    up: () => {
      if (!own.hold.holding) return;
      input({ type: 'released' });
      if (rig.m.state === 'ready') props.host.react({ name: 'vacuum.letGo' });
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <SceneMonster
        monster={monster}
        mood={rig.mood}
        sprite={mon}
        still={still}
        left={30}
        top={FLOOR - feetOf(MONSTER_SIZE)}
        // He stretches towards the nozzle from his far foot.
        origin={`60px ${feetOf(MONSTER_SIZE)}px`}
        zIndex={3}
      />
      <Ink ref={ink} style={styles.air} />
      <Animated.View style={[styles.vacuum, vacuum.style]}>
        <Ink
          style={styles.nozzle}
          first={[{ d: 'M0 44 L72 61.4 L72 88.6 L0 106 Z', width: 0, color: inks.ink, fill: true }]}
        />
        <View style={[styles.neck, { backgroundColor: inks.muted }]} />
        <Animated.View style={[styles.body, { backgroundColor: inks.tomato }, body.style]}>
          <SessionText face="pill" color={inks.onTomato}>
            {t(
              label === 'full'
                ? 'session.catch.vacuum.full'
                : label === 'hold'
                  ? 'session.catch.vacuum.hold'
                  : 'session.catch.vacuum.charging',
            )}
          </SessionText>
          <View style={[styles.battery, { borderColor: inks.onTomato }]}>
            {Array.from({ length: CELLS }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.cell,
                  { backgroundColor: inks.onTomato, opacity: index < cells ? 1 : 0.25 },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
      <Hint ref={rig.hint} inks={inks} />
      <Stamp sprite={stamp} x={200} y={320} label={t('session.catch.stamp')} inks={inks} />
    </Board>
  );
}

const styles = StyleSheet.create({
  air: { zIndex: 4 },
  vacuum: {
    position: 'absolute',
    left: VACUUM.x,
    top: VACUUM.y,
    width: 176,
    height: 150,
    zIndex: 5,
  },
  // The nozzle flares towards him: wide at the mouth, narrowing to the neck.
  nozzle: { width: 176, height: 150 },
  neck: {
    position: 'absolute',
    left: 68,
    top: 63,
    width: 22,
    height: 24,
  },
  body: {
    position: 'absolute',
    left: 86,
    top: 0,
    width: 90,
    height: 150,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  battery: {
    flexDirection: 'column-reverse',
    gap: 4,
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
  },
  cell: { width: 26, height: 10, borderRadius: 3 },
});
