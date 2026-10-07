import { StyleSheet, View } from 'react-native';

import type { MonsterRow } from '@scootch/domain';

import { Monster } from '../../../../art/Monster';
import type { Translate } from '../../../../i18n/i18n-provider';
import type { SessionInks } from '../../ui/session-inks';
import { SessionText } from '../../ui/session-text';
import type { Point } from '../math';

/** A page of the month's sticker book holds six. */
export const PAGE = 6;
const TILTS = [-4, 3, -2, 4, 0, -3] as const;

/** The middle of a place on the month's page, six to a page. */
export function placeAt(index: number): Point {
  return [38 + (index % 3) * 109 + 49.5, 516 + Math.floor(index / 3) * 136 + 63];
}

export interface StickerPageProps {
  /** The monsters already on this page, in the order they were stuck. */
  readonly mates: readonly MonsterRow[];
  readonly monthName: string;
  /** The sticker in the hand is close enough to the empty place to stick. */
  readonly near: boolean;
  /** It has been stuck: the empty place is taken and the count is one more. */
  readonly stuck: boolean;
  readonly inks: SessionInks;
  readonly t: Translate;
}

/**
 * This month's page of the sticker book: the monsters already caught this month, and the empty
 * place the next one goes in, which lights as the sticker comes near.
 */
export function StickerPage({ mates, monthName, near, stuck, inks, t }: StickerPageProps) {
  return (
    <>
      <View style={[styles.book, { backgroundColor: inks.surface }]}>
        <SessionText face="pill" color={inks.ink} style={styles.month}>
          {monthName}
        </SessionText>
        <SessionText face="note" color={inks.muted} style={styles.count}>
          {t('session.catch.sticker.count', {
            count: mates.length + (stuck ? 1 : 0),
            total: PAGE,
          })}
        </SessionText>
      </View>
      {Array.from({ length: PAGE }, (_, index) => {
        const [cx, cy] = placeAt(index);
        const mate = mates[index];
        if (mate) {
          return (
            <View
              key={index}
              style={[
                styles.mini,
                { left: cx - 44, top: cy - 50, transform: [{ rotate: `${TILTS[index] ?? 0}deg` }] },
              ]}
            >
              <View style={styles.miniMonster}>
                <Monster spec={mate.spec} idle={false} mood="caught" reducedMotion size={100} />
              </View>
            </View>
          );
        }
        const next = index === mates.length;
        return next && stuck ? null : (
          <View
            key={index}
            style={[
              styles.slot,
              {
                left: cx - 44,
                top: cy - 50,
                borderColor: next && near ? inks.tomato : inks.hairline,
                opacity: next ? 1 : 0.5,
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  book: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 468,
    height: 330,
    borderRadius: 26,
    boxShadow: '0 10px 30px -14px rgba(28,26,23,0.2)',
  },
  month: { position: 'absolute', left: 20, top: 14 },
  count: { position: 'absolute', right: 20, top: 18 },
  mini: {
    position: 'absolute',
    width: 88,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    boxShadow: '0 4px 10px -4px rgba(28,26,23,0.25)',
  },
  miniMonster: { position: 'absolute', left: -6, top: 0, width: 100, height: 100 },
  slot: {
    position: 'absolute',
    width: 88,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});
