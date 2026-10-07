import { StyleSheet, View } from 'react-native';

import type { SessionInks } from './session-inks';

/** The tomato dot that leads the monster's pill. */
export function PillDot({ inks }: { readonly inks: SessionInks }) {
  return <View style={[styles.dot, { backgroundColor: inks.tomato }]} />;
}

/** The plus of "Park a thought": two 2.2-point strokes, 12 points across. */
export function PillPlus({ inks }: { readonly inks: SessionInks }) {
  return (
    <View style={styles.plus}>
      <View style={[styles.plusUp, { backgroundColor: inks.ink }]} />
      <View style={[styles.plusAcross, { backgroundColor: inks.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  plus: { width: 12, height: 12 },
  plusUp: { position: 'absolute', left: 4.9, top: 0, width: 2.2, height: 12, borderRadius: 1 },
  plusAcross: { position: 'absolute', top: 4.9, left: 0, height: 2.2, width: 12, borderRadius: 1 },
});
