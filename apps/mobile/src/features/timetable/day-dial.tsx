import { Canvas, Circle, Group, Path, Shadow } from '@shopify/react-native-skia';
import type { PhuMood } from '@phusclass/art/class';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useHandFont } from '../../classroom/use-hand-font';
import { useMayMove } from '../../ui/motion/use-feel';
import { PhuFigure } from '../board/phu-figure';

import { arcPath, DIAL, dialNumbers, knobAt, type DialArc } from './dial-math';
import { DAY_FROM_HOUR, DAY_TO_HOUR } from './periods';

const COLOURS = { class: '#BCC6D3', free: '#F2A49B', booked: '#D42A24' } as const;

export interface DayDialProps {
  readonly size: number;
  readonly arcs: readonly DialArc[];
  /** Minutes after midnight now; `null` on a day that is not today (no knob). */
  readonly nowMinutes: number | null;
  readonly caption: string;
  readonly label: string;
  readonly mood: PhuMood;
}

/**
 * The day as a dial (`Dial.dc.html`): the school day round a ring, classes in slate, free periods
 * in red, booked ones solid red, the time now as a knob, and Thầy Phú in the middle. Free periods
 * still to come breathe; under Reduce Motion they hold still.
 */
export function DayDial({ size, arcs, nowMinutes, caption, label, mood }: DayDialProps) {
  const k = size / DIAL.size;
  const mayMove = useMayMove();
  const hand = useHandFont();
  const breath = useSharedValue(1);
  useEffect(() => {
    breath.value = mayMove
      ? withRepeat(
          withTiming(0.62, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        )
      : 1;
  }, [mayMove, breath]);
  const breathing = useDerivedValue(() => breath.value);
  const knob = nowMinutes === null ? null : knobAt(nowMinutes);
  const face = Math.round(size * 0.44);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="timetable-dial"
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ scale: k }]}>
          <Path
            path={arcPath(DAY_FROM_HOUR, DAY_TO_HOUR)}
            style="stroke"
            strokeWidth={DIAL.stroke}
            strokeCap="round"
            color="#F1E8DA"
          />
          {arcs.map((arc) => (
            <Path
              key={arc.key}
              path={arc.path}
              style="stroke"
              strokeWidth={DIAL.stroke}
              strokeCap="round"
              color={COLOURS[arc.kind]}
              opacity={arc.past ? 0.4 : arc.breathing ? breathing : 1}
            />
          ))}
          <Circle cx={DIAL.centre} cy={DIAL.centre} r={DIAL.face} color="#FFF4E4" />
          {knob !== null ? (
            <Group>
              <Circle cx={knob.x} cy={knob.y} r={10.5} color="#FFFFFF">
                <Shadow dx={0} dy={1.5} blur={2} color="rgba(60,40,20,0.28)" />
              </Circle>
              <Circle cx={knob.x} cy={knob.y} r={4} color="#1C1A18" />
            </Group>
          ) : null}
        </Group>
      </Canvas>
      {dialNumbers().map((number) => (
        <Text
          key={number.hour}
          allowFontScaling={false}
          style={[styles.number, { left: number.x * k - 12, top: number.y * k - 8 }]}
        >
          {number.hour}
        </Text>
      ))}
      <View
        style={[
          styles.face,
          {
            width: face,
            height: face,
            borderRadius: face / 2,
            left: (size - face) / 2,
            top: (size - face) / 2,
          },
        ]}
      >
        <View style={{ marginTop: -size * 0.05 }}>
          <PhuFigure mood={mood} width={Math.round(size * 0.56)} hand={hand} />
        </View>
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.caption, { top: 204 * k }]}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  number: {
    position: 'absolute',
    width: 24,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#B4AA9E',
  },
  face: { position: 'absolute', overflow: 'hidden', alignItems: 'center' },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#D42A24',
  },
});
