import { StyleSheet, View } from 'react-native';
import type { MonsterSpec } from '@scootch/domain';

import { Monster } from '../../../art/Monster';
import type { OddHatchProps } from '../odd-hatch-figures';

/** How much of the one monster's box each of the three takes, biggest first. */
const SHARES = [0.34, 0.31, 0.27] as const;
/** The inks the other two come in, in the order they are tried. */
const INKS: readonly MonsterSpec['ink'][] = ['kraft', 'moss', 'lilac', 'teal'];

/** The three of a tiny hatch: the monster itself, and two more of its kind in inks of their own. */
export function tinySpecs(spec: MonsterSpec): MonsterSpec[] {
  const others = INKS.filter((ink) => ink !== spec.ink);
  return [
    spec,
    ...others.slice(0, 2).map((ink, index) => ({ ...spec, ink, seed: `${spec.seed}/${index}` })),
  ];
}

/** The tiny hatch: the task's monster came out as three small ones, standing in a row. */
export function TinyHatch({ monster, size, onPress, testID, ...drawn }: OddHatchProps) {
  return (
    <View style={[styles.row, { width: size, height: size }]}>
      {tinySpecs(monster.spec).map((spec, index) => (
        <Monster
          key={spec.seed}
          spec={spec}
          size={Math.round(size * (SHARES[index] ?? SHARES[2]))}
          {...drawn}
          {...(onPress ? { onPress } : {})}
          {...(index === 0 && testID ? { testID } : {})}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
