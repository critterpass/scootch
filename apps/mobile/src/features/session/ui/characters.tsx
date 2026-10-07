import { StyleSheet, View } from 'react-native';

import type { MonsterRow } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { Monster, type MonsterProps } from '../../../art/Monster';
import { Scootch, type ScootchProps } from '../../../art/Scootch';

export interface CharactersProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: NonNullable<ScootchProps['attitude']>;
  /** The task's monster, when it has one. A serious task never has. */
  readonly monster: MonsterRow | null;
  readonly reducedMotion: boolean;
  /** How the monster feels: nervous while its end is being held, caught once it is. */
  readonly monsterMood?: MonsterProps['mood'];
  readonly size?: number;
}

/** Scootch, with the task's monster beside him when there is one. */
export function Characters({
  mood,
  attitude,
  monster,
  reducedMotion,
  monsterMood = 'idle',
  size = 200,
}: CharactersProps) {
  return (
    <View style={styles.row}>
      <Scootch
        mood={mood}
        attitude={attitude}
        reducedMotion={reducedMotion}
        squashOnChange
        size={size}
      />
      {monster ? (
        <Monster
          spec={monster.spec}
          idle
          mood={monsterMood}
          squashOnChange
          reducedMotion={reducedMotion}
          size={size * 0.6}
          testID="session-monster"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
