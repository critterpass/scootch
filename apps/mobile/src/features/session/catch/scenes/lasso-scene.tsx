import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { loopDrawn } from '../catch-rules';
import { back, clamp, inOut, lerp, STAGE, type Point } from '../math';
import {
  Binder,
  BINDER_AT,
  Board,
  bumpBinder,
  feetOf,
  Floor,
  Ink,
  MONSTER_SIZE,
  SceneMonster,
  Shadow,
  squash,
  useSprite,
  type InkHandle,
  type InkStroke,
} from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const FLOOR = 560;
const FEET = feetOf(MONSTER_SIZE);
/** The middle of his body above the floor: what a loop has to go round. */
const BODY = 62;
const PIPS = 5;

/** A rope along a drawn line: smooth through its points, closed into a loop, with a tail. */
function ropePath(
  line: readonly Point[],
  closed: boolean,
  tail?: readonly [Point, Point, Point],
): string {
  const first = line[0];
  const last = line[line.length - 1];
  if (!first || !last || line.length < 2) return '';
  let d = `M${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 1; i < line.length - 1; i += 1) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    d += ` Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  }
  d += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  if (closed) d += ' Z';
  if (tail) {
    const [from, bend, to] = tail;
    d += ` M${from[0].toFixed(1)} ${from[1].toFixed(1)} Q${bend[0].toFixed(1)} ${bend[1].toFixed(1)} ${to[0]} ${to[1]}`;
  }
  return d;
}

/**
 * The lasso: he runs laps, and his pep drains as the work goes on until he slows to a stop and
 * dozes off. A loop drawn all the way round him cinches tight and hauls him into the binder. Tried
 * early, he is too lively and dodges.
 */
export function LassoScene(props: SceneProps) {
  const { monster, inks, still, caughtCount, ended } = props;
  const mon = useSprite(ended ? { o: 0 } : {});
  const tumble = useSprite();
  const shadow = useSprite(ended ? { o: 0 } : {});
  const pips = useSprite();
  const binder = useSprite();
  const ink = useRef<InkHandle>(null);
  const [pipsLeft, setPipsLeft] = useState(PIPS);
  const [landed, setLanded] = useState(ended);
  const own = useRef({
    phase: 0,
    dodge: 0,
    mx: STAGE.middle,
    my: FLOOR - BODY,
    line: [] as Point[],
    token: 0,
    pips: PIPS,
  }).current;

  const rope = (d: string, opacity = 1): InkStroke[] =>
    d === ''
      ? []
      : [
          { d, width: 9, color: inks.ink, opacity },
          { d, width: 5, color: '#D9B98C', opacity },
          { d, width: 5, color: '#A88552', opacity, dash: [3, 6] },
        ];
  const clear = () => ink.current?.draw([]);

  // A rope that caught nothing drops and fades.
  const fall = () => {
    const dropped = own.line.slice();
    const token = own.token;
    rig.tw(
      600,
      (k) => {
        if (token !== own.token) return;
        const line = dropped.map(([x, y]) => [x, y + k * k * 220] as const);
        ink.current?.draw(rope(ropePath(line, false), 1 - k));
      },
      null,
      () => {
        if (token === own.token) clear();
      },
    );
  };

  const cinch = () => {
    rig.m.state = 'busy';
    const centre: Point = [own.mx, FLOOR - BODY];
    const loose = own.line.map(([x, y]) => [x - centre[0], y - centre[1]] as const);
    const tight = loose.map(([dx, dy]) => {
      const angle = Math.atan2(dy, dx);
      return [Math.cos(angle) * 72, Math.sin(angle) * 60] as const;
    });
    let loop: readonly Point[] = loose;
    const draw = (cx: number, cy: number, scale: number, slack: number) =>
      ink.current?.draw(
        rope(
          ropePath(
            loop.map(([x, y]) => [cx + x * scale, cy + y * scale] as const),
            true,
            [
              [cx + 72 * scale, cy],
              [cx + 72 * scale + 60, cy + slack],
              [430, 720],
            ],
          ),
        ),
      );
    rig.tw(
      420,
      (k) => {
        loop = loose.map(([x, y], i) => {
          const to = tight[i] ?? [x, y];
          return [lerp(x, to[0], k), lerp(y, to[1], k)] as const;
        });
        draw(centre[0], centre[1], 1, 90 * (1 - k) + 20);
      },
      back,
      () => {
        props.host.buzz('medium');
        props.host.cue('tick');
        rig.setMood('nervous');
        squash(rig, mon, 360, [
          [0, 1.08, 0.84],
          [1, 1, 1],
        ]);
        props.host.react({ name: 'lasso.cinched' });
        rig.at(650, () => {
          props.host.cue('send');
          rig.tw(
            700,
            (k) => {
              const e = inOut(k);
              const cx = lerp(centre[0], BINDER_AT[0], e);
              const cy = lerp(centre[1], BINDER_AT[1], e) - Math.sin(k * Math.PI) * 120;
              const scale = lerp(1, 0.12, e);
              // He is drawn about his feet, so they are placed where his shrunken body needs them.
              put(mon, { x: cx - MONSTER_SIZE / 2, y: cy + BODY * scale - FEET, s: scale });
              put(tumble, { r: k * -30 });
              put(shadow, { o: 1 - k });
              draw(cx, cy, scale, 20);
            },
            null,
            () => {
              clear();
              put(mon, { o: 0 });
              setLanded(true);
              bumpBinder(rig, binder);
              rig.win('lasso.won');
            },
          );
        });
      },
    );
  };

  const rig = useRig(props, {
    tick: (_time, dt) => {
      const { m } = rig;
      if (m.state === 'busy' || m.state === 'caught') return;
      const p = m.p;
      const reach = lerp(115, 0, clamp(p * 1.05));
      const hop = lerp(30, 0, p);
      own.phase += lerp(2.6, 0.3, p) * dt;
      const x = STAGE.middle + Math.sin(own.phase) * reach + own.dodge;
      const y = -Math.abs(Math.sin(own.phase * 2.2)) * hop;
      own.mx = x;
      own.my = FLOOR - BODY + y;
      // He faces the way he runs.
      const facing = reach > 8 && Math.cos(own.phase) < 0 ? -1 : 1;
      put(mon, { x: x - MONSTER_SIZE / 2, y: FLOOR - FEET + y, sx: facing, sy: 1 });
      put(shadow, { x: x - 55, s: 1 + y / 90 });
      put(pips, { x: x - 33, y: FLOOR - 178 + y, o: p >= 1 ? 0 : 1 });
      const left = Math.ceil(PIPS * (1 - p));
      if (left !== own.pips) {
        own.pips = left;
        setPipsLeft(left);
      }
      rig.setMood(p < 0.6 ? 'idle' : p < 1 ? 'nervous' : 'caught');
      rig.say(m.state === 'ready' ? 'lasso.ready' : p < 0.6 ? 'lasso.setting' : 'lasso.flagging');
    },
    down: (x, y) => {
      if (rig.m.state === 'busy' || rig.m.state === 'caught') return false;
      own.token += 1;
      own.line = [[x, y]];
      clear();
      return true;
    },
    move: (x, y) => {
      const last = own.line[own.line.length - 1];
      if (last && Math.hypot(x - last[0], y - last[1]) < 4) return;
      own.line.push([x, y]);
      ink.current?.draw(rope(ropePath(own.line, false)));
    },
    up: () => {
      const drawn = loopDrawn(own.line, [own.mx, own.my]);
      if (drawn === 'nothing') {
        clear();
        return;
      }
      if (drawn === 'around' && rig.m.state === 'ready') {
        cinch();
        return;
      }
      fall();
      if (drawn === 'around') {
        // Still running: he jumps clear and comes back.
        const far = own.mx > STAGE.middle ? -140 : 140;
        props.host.cue('cancel');
        rig.setMood('nervous');
        rig.tw(
          380,
          (k) => {
            own.dodge = lerp(0, far, k);
          },
          back,
          () =>
            rig.tw(
              1500,
              (k) => {
                own.dodge = lerp(far, 0, k);
              },
              inOut,
            ),
        );
        props.host.react({ name: 'lasso.lively' });
      } else {
        props.host.react({ name: drawn === 'beside' ? 'lasso.beside' : 'lasso.open' });
      }
    },
  });

  return (
    <Board>
      <Floor y={FLOOR} inks={inks} />
      <Shadow sprite={shadow} inks={inks} left={0} top={FLOOR - 8} width={110} height={16} />
      <SceneMonster monster={monster} mood={rig.mood} sprite={mon} spin={tumble} still={still} />
      <Animated.View style={[styles.pips, pips.style]}>
        {Array.from({ length: PIPS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pip,
              { backgroundColor: index < pipsLeft ? inks.tomato : inks.hairline },
            ]}
          />
        ))}
      </Animated.View>
      <Binder
        sprite={binder}
        count={caughtCount === null ? null : caughtCount + (landed ? 1 : 0)}
        inks={inks}
      />
      <Ink ref={ink} style={styles.rope} />
    </Board>
  );
}

const styles = StyleSheet.create({
  pips: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', gap: 5, zIndex: 4 },
  pip: { width: 9, height: 9, borderRadius: 5 },
  rope: { zIndex: 6 },
});
