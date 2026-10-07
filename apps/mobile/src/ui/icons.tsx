import { StyleSheet, View } from 'react-native';

// The few glyphs the controls carry, drawn from plain views so they take any ink and need no
// image or font. Each is decoration: the control it sits in carries the label.

interface IconProps {
  readonly color: string;
}

const WAVE_HEIGHTS = [8, 16, 22, 14, 8] as const;

/** Five bars of a waveform: voice. */
export function WaveIcon({ color }: IconProps) {
  return (
    <View style={styles.wave}>
      {WAVE_HEIGHTS.map((height, index) => (
        <View key={index} style={[styles.waveBar, { height, backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** A keyboard: typing. */
export function KeyboardIcon({ color }: IconProps) {
  return (
    <View style={[styles.keyboard, { borderColor: color }]}>
      <View style={styles.keyRow}>
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={[styles.key, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={[styles.spaceBar, { backgroundColor: color }]} />
    </View>
  );
}

/** Three dots: more. */
export function MoreIcon({ color }: IconProps) {
  return (
    <View style={styles.more}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={[styles.moreDot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** A small island with a flag on it: the world. */
export function WorldIcon({ color, accent, ground }: IconProps & WorldInks) {
  return (
    <View style={styles.world}>
      <View style={[styles.worldGround, { backgroundColor: ground }]} />
      <View style={[styles.worldBlob, { backgroundColor: accent }]} />
      <View style={[styles.worldPole, { backgroundColor: color }]} />
      <View style={[styles.worldFlag, { borderLeftColor: accent }]} />
    </View>
  );
}

interface WorldInks {
  readonly accent: string;
  readonly ground: string;
}

/** An arrow pointing up: send. */
export function SendIcon({ color }: IconProps) {
  return (
    <View style={styles.send}>
      <View style={[styles.sendHead, { borderColor: color }]} />
      <View style={[styles.sendStem, { backgroundColor: color }]} />
    </View>
  );
}

/** A small chevron; `direction` is the way it points. */
export function Chevron({
  color,
  direction,
}: IconProps & { readonly direction: 'left' | 'right' }) {
  return (
    <View
      style={[
        styles.chevron,
        { borderColor: color, transform: [{ rotate: direction === 'right' ? '45deg' : '225deg' }] },
      ]}
    />
  );
}

/** A small bin: put this down. */
export function BinIcon({ color }: IconProps) {
  return (
    <View style={styles.bin}>
      <View style={[styles.binHandle, { borderColor: color }]} />
      <View style={[styles.binLid, { backgroundColor: color }]} />
      <View style={[styles.binBody, { borderColor: color }]}>
        <View style={[styles.binRib, { backgroundColor: color }]} />
        <View style={[styles.binRib, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** A tick, for the chosen option. */
export function Tick({ color }: IconProps) {
  return <View style={[styles.tick, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 },
  waveBar: { width: 3, borderRadius: 2 },
  keyboard: {
    width: 24,
    height: 17,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  keyRow: { flexDirection: 'row', gap: 2 },
  key: { width: 3, height: 3, borderRadius: 1 },
  spaceBar: { width: 12, height: 3, borderRadius: 1 },
  more: { flexDirection: 'row', gap: 4 },
  moreDot: { width: 5, height: 5, borderRadius: 3 },
  world: { width: 28, height: 22 },
  worldGround: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, borderRadius: 4 },
  worldBlob: { position: 'absolute', left: 5, bottom: 4, width: 12, height: 10, borderRadius: 6 },
  worldPole: { position: 'absolute', left: 19, bottom: 4, width: 2, height: 14 },
  worldFlag: {
    position: 'absolute',
    left: 21,
    bottom: 12,
    borderLeftWidth: 7,
    borderTopWidth: 3.5,
    borderBottomWidth: 3.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  send: { width: 18, height: 20, alignItems: 'center' },
  sendHead: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    transform: [{ rotate: '45deg' }],
    marginTop: 3,
  },
  sendStem: { position: 'absolute', top: 2, width: 2.5, height: 17, borderRadius: 1 },
  chevron: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2 },
  bin: { width: 18, height: 21, alignItems: 'center' },
  binHandle: {
    width: 8,
    height: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  binLid: { width: 18, height: 2, borderRadius: 1 },
  binBody: {
    width: 14,
    height: 14,
    marginTop: 1,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 3,
  },
  binRib: { width: 2, height: 7, borderRadius: 1 },
  tick: {
    width: 12,
    height: 7,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '-45deg' }],
    marginBottom: 3,
  },
});
