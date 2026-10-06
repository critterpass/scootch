import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MONSTER_BODIES, SCOOTCH_MOODS, specFromSeed } from '@scootch/art';
import { colors, fonts, spacing, type Palette } from '@scootch/tokens';

import { Monster } from '../../art/Monster';
import { Scootch, type ScootchProps } from '../../art/Scootch';

type Mood = ScootchProps['mood'];
type Attitude = NonNullable<ScootchProps['attitude']>;
type MonsterBody = keyof typeof MONSTER_BODIES;

const ATTITUDES: readonly Attitude[] = ['soft', 'cheeky', 'unhinged'];
const MOODS = Object.keys(SCOOTCH_MOODS) as Mood[];
const BODIES = Object.keys(MONSTER_BODIES) as MonsterBody[];
const TILE_SIZE = 104;

function Tile({ id, label, palette, children }: TileProps) {
  return (
    <View testID={id} style={styles.tile}>
      {children}
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

interface TileProps {
  readonly id: string;
  readonly label: string;
  readonly palette: Palette;
  readonly children: React.ReactNode;
}

/**
 * Every character the app can draw, for checking the Skia drawing on a device: each Scootch mood
 * at the three attitudes, then the monster bodies. All are drawn still, so a capture is the same
 * every time. This folder's layout keeps it out of reach in the store app.
 */
export default function CharacterGallery() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const monsters = useMemo(() => BODIES.map((body) => specFromSeed(body, body)), []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
      <ScrollView testID="character-gallery" contentContainerStyle={styles.content}>
        {MOODS.map((mood) => (
          <View key={mood} style={styles.row}>
            {ATTITUDES.map((attitude) => (
              <Tile
                key={attitude}
                id={`scootch-${mood}-${attitude}`}
                label={`${mood} · ${attitude}`}
                palette={palette}
              >
                <Scootch mood={mood} attitude={attitude} reducedMotion size={TILE_SIZE} />
              </Tile>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          {monsters.map((spec) => (
            <Tile
              key={spec.bodyType}
              id={`monster-${spec.bodyType}`}
              label={spec.bodyType}
              palette={palette}
            >
              <Monster spec={spec} size={TILE_SIZE} />
            </Tile>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tile: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
