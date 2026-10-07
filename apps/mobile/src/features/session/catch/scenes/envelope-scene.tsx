import { useRef, useState } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { AnimatedViewStyle } from '../../../../ui/motion/animated-style';
import { back, clamp, keyed } from '../math';
import { Binder, Board, bumpBinder, flyToBinder, SceneMonster, useSprite } from '../parts';
import { useRig, type SceneProps } from '../rig';
import { put } from '../sprite';

const W = 230;
const H = 156;
const CENTRE = [196, 410] as const;
/** How far open each flap lies, in degrees, about the edge it is hinged on. */
const OPEN = [-168, 168, 168, -168] as const;
/** The address is written line by line as the work goes on. */
const ADDRESS = [70, 54, 38] as const;
const AFTER_FOLD = ['envelope.three', 'envelope.two', 'envelope.last', 'envelope.seal'] as const;

/** One flap: a triangle that turns about the edge of the envelope it is hinged on. */
function Flap({
  angle,
  axis,
  frame,
  shape,
}: {
  readonly angle: SharedValue<number>;
  readonly axis: 'x' | 'y';
  readonly frame: AnimatedViewStyle;
  readonly shape: ViewProps['style'];
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      axis === 'x' ? { rotateX: `${angle.value}deg` } : { rotateY: `${angle.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.flap, frame, style]}>
      <View style={[styles.triangle, shape]} />
    </Animated.View>
  );
}

/**
 * The envelope: he sits in an open one that is addressed to the binder as the work goes on. A tap
 * folds each of the four flaps over him, one more seals it, and it is posted.
 */
export function EnvelopeScene(props: SceneProps) {
  const { monster, inks, still, caughtCount, ended } = props;
  const envelope = useSprite(ended ? { o: 0 } : { x: CENTRE[0] - W / 2, y: CENTRE[1] - H / 2 });
  const mon = useSprite();
  const seal = useSprite({ o: 0, r: -10 });
  const binder = useSprite();
  const left = useSharedValue<number>(OPEN[0]);
  const right = useSharedValue<number>(OPEN[1]);
  const bottom = useSharedValue<number>(OPEN[2]);
  const top = useSharedValue<number>(OPEN[3]);
  const flaps = [left, right, bottom, top];
  const [written, setWritten] = useState(0);
  const [landed, setLanded] = useState(ended);
  const own = useRef({ folded: 0, written: -1 }).current;

  const post = () => {
    props.host.cue('send');
    flyToBinder(
      rig,
      CENTRE,
      (cx, cy, k, scale) => put(envelope, { x: cx - W / 2, y: cy - H / 2, r: k * -24, s: scale }),
      () => {
        put(envelope, { o: 0 });
        setLanded(true);
        bumpBinder(rig, binder);
        rig.win('envelope.won');
      },
    );
  };

  const rig = useRig(props, {
    tick: () => {
      const { m } = rig;
      if (m.state !== 'during' && m.state !== 'ready') return;
      const share = Math.round(clamp(m.p) * 100);
      if (share !== own.written) {
        own.written = share;
        setWritten(share / 100);
      }
      if (own.folded > 0) return;
      rig.setMood(m.p < 0.5 ? 'idle' : 'nervous');
      rig.say(m.state === 'ready' ? 'envelope.ready' : 'envelope.setting');
    },
    // Every tap is its own step, so no touch is ever followed.
    down: () => {
      if (rig.m.state !== 'ready') {
        if (rig.m.state === 'during') {
          rig.refuse();
          rig.tw(320, (k) => put(mon, { y: -16 * Math.sin(k * Math.PI) }));
        }
        return false;
      }
      const index = own.folded;
      const flap = flaps[index];
      const open = OPEN[index];
      const said = AFTER_FOLD[index];
      if (flap && open !== undefined && said) {
        own.folded += 1;
        rig.tw(
          420,
          (k) => {
            flap.value = open * (1 - k);
          },
          back,
        );
        props.host.cue('tick');
        props.host.buzz('light');
        rig.setMood(index === 3 ? 'caught' : 'nervous');
        props.host.react({ name: said });
        return false;
      }
      rig.m.state = 'busy';
      rig.tw(380, (k) =>
        put(seal, {
          o: Math.min(1, k / 0.6),
          s: keyed(k, [
            [0, 2.2],
            [0.6, 0.9],
            [1, 1],
          ]),
          r: keyed(k, [
            [0, -30],
            [0.6, -8],
            [1, -10],
          ]),
        }),
      );
      rig.at(200, () => {
        props.host.buzz('medium');
        props.host.shake(4);
      });
      props.host.react({ name: 'envelope.sealed' });
      rig.at(650, post);
      return false;
    },
  });

  return (
    <Board>
      <Animated.View style={[styles.envelope, envelope.style]}>
        <View style={styles.back}>
          {ADDRESS.map((width, index) => (
            <View
              key={index}
              style={[
                styles.line,
                { top: 102 + index * 12, width: width * clamp(written * 3.3 - index) },
              ]}
            />
          ))}
          <View
            style={[
              styles.postage,
              { backgroundColor: inks.tomato, opacity: written >= 1 ? 1 : 0 },
            ]}
          />
        </View>
        <SceneMonster
          monster={monster}
          mood={rig.mood}
          sprite={mon}
          still={still}
          size={150}
          left={40}
          top={8}
        />
        <Flap
          angle={left}
          axis="y"
          frame={{ left: 0, top: 0, width: W * 0.54, height: H, transformOrigin: 'left' }}
          shape={{
            borderTopWidth: H / 2,
            borderBottomWidth: H / 2,
            borderLeftWidth: W * 0.54,
            borderLeftColor: '#F3ECE0',
          }}
        />
        <Flap
          angle={right}
          axis="y"
          frame={{ right: 0, top: 0, width: W * 0.54, height: H, transformOrigin: 'right' }}
          shape={{
            borderTopWidth: H / 2,
            borderBottomWidth: H / 2,
            borderRightWidth: W * 0.54,
            borderRightColor: '#F3ECE0',
          }}
        />
        <Flap
          angle={bottom}
          axis="x"
          frame={{ left: 0, bottom: 0, width: W, height: H * 0.58, transformOrigin: 'bottom' }}
          shape={{
            borderLeftWidth: W / 2,
            borderRightWidth: W / 2,
            borderBottomWidth: H * 0.58,
            borderBottomColor: '#EFE7DA',
          }}
        />
        <Flap
          angle={top}
          axis="x"
          frame={{ left: 0, top: 0, width: W, height: H * 0.62, transformOrigin: 'top' }}
          shape={{
            borderLeftWidth: W / 2,
            borderRightWidth: W / 2,
            borderTopWidth: H * 0.62,
            borderTopColor: '#F8F2E8',
          }}
        />
        <Animated.View style={[styles.seal, { backgroundColor: inks.tomato }, seal.style]}>
          <View style={styles.sealRing} />
        </Animated.View>
      </Animated.View>
      <Binder
        sprite={binder}
        count={caughtCount === null ? null : caughtCount + (landed ? 1 : 0)}
        inks={inks}
      />
    </Board>
  );
}

const styles = StyleSheet.create({
  envelope: { position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 3 },
  back: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    borderWidth: 2,
    // Paper is paper on either page: its edge is drawn in the ink that is written on it.
    borderColor: '#1C1A17',
    backgroundColor: '#E9E0D1',
    boxShadow: '0 20px 30px -18px rgba(28,26,23,0.4)',
  },
  line: {
    position: 'absolute',
    left: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(28,26,23,0.4)',
  },
  postage: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 30,
    height: 36,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: '#E9E0D1',
  },
  flap: { position: 'absolute' },
  triangle: { width: 0, height: 0, borderColor: 'transparent' },
  seal: {
    position: 'absolute',
    left: W / 2 - 19,
    top: H * 0.62 - 26,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.14)',
  },
});
