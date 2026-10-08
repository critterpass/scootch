import { StyleSheet, View } from 'react-native';

import type { MonsterSpec } from '@scootch/domain';
import { radius, shadows, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { RecordSleeve, sleeveStage } from '../record/ui/record-sleeve';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

export interface KeptRecord {
  readonly week: string;
  readonly weekNumber: number;
  /** The record's own name, or the plain "Week n" when it has none. */
  readonly name: string;
  readonly bars: number;
  /** The monsters that played on it, in the order of their days. */
  readonly cover: readonly MonsterSpec[];
}

export interface RecordShelfProps {
  /** Every week's record that was kept, newest first. */
  readonly records: readonly KeptRecord[];
  /** The week whose record is out of its sleeve and playing, or `null`. */
  readonly playing: string | null;
  /** A tap on a record: it plays, or stops if it is the one playing. */
  readonly onPlay: (week: string) => void;
  readonly close: () => void;
}

/** A sleeve's side on the shelf, and the outline that stands where the first record will. */
const SLEEVE = 92;

/**
 * The record shelf: every week's record that was kept, newest first, each in a sleeve printed in
 * its week's colour with its band on the front. A tap slides the record out of its sleeve and
 * plays that week; a tap again, or a tap on another, puts it back. With nothing kept yet an
 * empty sleeve stands in the first place, and says how a record comes to stand there.
 */
export function RecordShelf({ records, playing, onPlay, close }: RecordShelfProps) {
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  return (
    <KeepFrame
      testID="record-shelf"
      title={t('recordShelf.title')}
      {...(records.length > 0
        ? { subtitle: t('recordShelf.count', { count: records.length }) }
        : {})}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: close }}
      closeTestID="record-shelf-close"
    >
      {records.length === 0 ? (
        <View
          testID="record-shelf-empty"
          style={[styles.card, { backgroundColor: palette.surface }]}
        >
          <View style={{ width: sleeveStage(SLEEVE), height: SLEEVE }}>
            <View
              style={[
                styles.outline,
                styles.outlineDisc,
                { borderColor: palette.muted, left: SLEEVE * 0.42 },
              ]}
            />
            <View
              style={[
                styles.outline,
                styles.outlineSleeve,
                { borderColor: palette.muted, backgroundColor: palette.surface },
              ]}
            />
          </View>
          <View style={styles.words}>
            <SessionText face="action" color={palette.ink}>
              {t('recordShelf.empty')}
            </SessionText>
            <SessionText face="caption" color={palette.muted}>
              {t('recordShelf.empty.how')}
            </SessionText>
          </View>
        </View>
      ) : (
        <View style={styles.shelf}>
          {records.map((record) => {
            const on = record.week === playing;
            const bars =
              record.bars >= 7
                ? t('record.fullBand')
                : t('recordShelf.bars', { count: record.bars });
            return (
              <PressSpring
                key={record.week}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${record.name}, ${bars}${on ? `, ${t('record.playingNow')}` : ''}`}
                accessibilityHint={t(on ? 'recordShelf.stop.hint' : 'recordShelf.play.hint')}
                // A record with no bars in it has nothing to play.
                disabled={record.bars === 0}
                onPress={() => onPlay(record.week)}
                feedback="primary"
                testID={`record-shelf-${record.week}`}
                style={[styles.card, { backgroundColor: palette.surface }]}
              >
                <RecordSleeve
                  side={SLEEVE}
                  weekNumber={record.weekNumber}
                  label={t('record.week', { number: record.weekNumber })}
                  barCount={record.bars}
                  cover={record.cover}
                  playing={on}
                  reducedMotion={reducedMotion}
                />
                <View style={styles.words}>
                  <SessionText face="action" color={palette.ink} numberOfLines={2}>
                    {record.name}
                  </SessionText>
                  <SessionText face="caption" color={palette.muted}>
                    {bars}
                  </SessionText>
                  <SessionText
                    face="caption"
                    color={on ? palette.tomato : palette.muted}
                    testID={on ? 'record-shelf-playing' : undefined}
                  >
                    {t(on ? 'record.playingNow' : 'recordShelf.tap')}
                  </SessionText>
                </View>
              </PressSpring>
            );
          })}
        </View>
      )}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: shadows.card,
  },
  words: { flex: 1, gap: 2 },
  outline: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed' },
  outlineSleeve: { left: 0, top: 0, width: SLEEVE, height: SLEEVE, borderRadius: 8 },
  outlineDisc: {
    top: SLEEVE * 0.04,
    width: SLEEVE * 0.92,
    height: SLEEVE * 0.92,
    borderRadius: SLEEVE * 0.46,
  },
});
