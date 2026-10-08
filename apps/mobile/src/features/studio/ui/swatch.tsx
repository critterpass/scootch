import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildMaterial, CARD_MATERIALS } from '@scootch/art';

import { CommandCanvas } from '../../reveal/ui/command-canvas';
import type { FinishItem, InkItem, StudioItem, TrailId } from '../catalogue';

/** The board's swatch for an ink or a trail: a 50 point disc. */
export const SWATCH = 50;
/** A finish's swatch is a tiny card of the real material: 40 by 56 with an 8 point corner. */
export const FINISH_SWATCH = { width: 40, height: 56, radius: 8 } as const;
const FINISH_FACE = { x: 0, y: 0, w: FINISH_SWATCH.width, h: FINISH_SWATCH.height };

/** The outline of a swatch of this kind, for the ring drawn round the chosen one. */
export function swatchShape(kind: StudioItem['kind']): {
  readonly width: number;
  readonly height: number;
  readonly borderRadius: number;
} {
  return kind === 'finish'
    ? {
        width: FINISH_SWATCH.width,
        height: FINISH_SWATCH.height,
        borderRadius: FINISH_SWATCH.radius,
      }
    : { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 };
}

function Quarters({ colours }: { readonly colours: readonly [string, string, string, string] }) {
  // Clockwise from the top right, as the board's conic gradient lays them.
  const [first, second, third, fourth] = colours;
  return (
    <View style={styles.quarters}>
      {[fourth, first, third, second].map((colour, index) => (
        <View key={index} style={[styles.quarter, { backgroundColor: colour }]} />
      ))}
      <View style={styles.gloss} />
    </View>
  );
}

/** What each trail's swatch shows: a few of its own marks on the ground they read best on. */
const TRAIL_MARKS: Record<
  Exclude<TrailId, 'confetti'>,
  {
    readonly ground: string;
    readonly marks: readonly (readonly [x: number, y: number, size: number, colour: string])[];
    readonly ringed?: boolean;
  }
> = {
  stardust: {
    ground: '#1C1A17',
    marks: [
      [15, 17, 9, '#FFE6A3'],
      [33, 31, 7, '#FFD66B'],
      [30, 12, 4, '#FFFFFF'],
    ],
  },
  bubbles: {
    ground: '#EAF3FB',
    marks: [
      [17, 15, 20, 'rgba(160,210,255,0.5)'],
      [14, 12, 7, '#FFFFFF'],
      [34, 34, 9, 'rgba(160,210,255,0.6)'],
    ],
    ringed: true,
  },
  splat: {
    ground: '#F6F3EE',
    marks: [
      [25, 25, 32, '#1C1A17'],
      [39, 14, 9, '#1C1A17'],
      [12, 38, 7, '#1C1A17'],
    ],
  },
};

/**
 * One item of the studio as its swatch: an ink's four colours on a glossy pot, a finish as a tiny
 * card of its material, a trail's own marks.
 */
export function Swatch({ item }: { readonly item: StudioItem }) {
  const finish = item.kind === 'finish' ? (item as FinishItem).id : null;
  const commands = useMemo(
    () =>
      finish === null
        ? null
        : buildMaterial(FINISH_FACE, FINISH_SWATCH.radius, CARD_MATERIALS[finish]),
    [finish],
  );
  if (commands) {
    return <CommandCanvas commands={commands} space={FINISH_SWATCH} width={FINISH_SWATCH.width} />;
  }
  if (item.kind === 'ink') {
    const { accent, ink, paper, deep } = (item as InkItem).colours;
    return <Quarters colours={[accent, ink, paper, deep]} />;
  }
  if (item.id === 'confetti') {
    return <Quarters colours={['#F0562E', '#FFD66B', '#7FB7FF', '#1C1A17']} />;
  }
  const trail = TRAIL_MARKS[item.id as Exclude<TrailId, 'confetti'>];
  return (
    <View style={[styles.disc, { backgroundColor: trail.ground }]}>
      {trail.marks.map(([x, y, size, colour], index) => (
        <View
          key={index}
          style={[
            styles.mark,
            {
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colour,
            },
            trail.ringed && index === 0 ? styles.ringed : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, overflow: 'hidden' },
  quarters: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quarter: { width: SWATCH / 2, height: SWATCH / 2 },
  // The wet highlight on a pot of ink: a soft light up and to the left.
  gloss: {
    position: 'absolute',
    left: SWATCH * 0.34 - 3,
    top: SWATCH * 0.28 - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    boxShadow: '0 0 9px 7px rgba(255,255,255,0.4)',
  },
  mark: { position: 'absolute' },
  ringed: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
});
