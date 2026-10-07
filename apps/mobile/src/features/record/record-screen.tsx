import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Language } from '@scootch/i18n';
import type { RecordInstrument } from '@scootch/sound';
import { spacing } from '@scootch/tokens';

import { Monster } from '../../art/Monster';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { weekdayName } from '../reveal/weekday-name';
import { SessionText } from '../session/ui/session-text';

import type { RecordPlayback } from './use-record-playback';
import { weekShareOffered, type RecordRow, type WeekView } from './record-week';
import { RecordDiscView } from './ui/record-disc-view';
import { BarStrip, bandLine, instrumentName } from './ui/record-parts';
import { PressSpring } from '../../ui/motion/press-spring';

export interface RecordModel {
  readonly week: WeekView;
  readonly language: Language;
  readonly plus: boolean;
  readonly playback: Omit<RecordPlayback, 'toggle'>;
  readonly reducedMotion: boolean;
  /** This week's record is on the shelf. */
  readonly kept?: boolean;
  /** How many records are on the shelf. They stay there whatever happens to Plus. */
  readonly keptCount?: number;
}

export interface RecordActions {
  readonly close: () => void;
  readonly togglePlay: () => void;
  readonly shareWeek: () => void;
  /** The locked control was tapped: the Plus sheet opens. Unset, it does nothing. */
  readonly openPlus?: () => void;
  readonly keep?: () => void;
  readonly openShelf?: () => void;
}

/** One line of the liner notes: an instrument, its day and the task that earned it. */
function CreditRow({ row, lit, language }: { row: RecordRow; lit: boolean; language: Language }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const instrument = instrumentName(row.instrument, t);
  const day = weekdayName(language, row.position, 'short');
  const detail = row.taskText ? `${day} · ${row.taskText}` : day;
  return (
    <View
      accessible
      accessibilityLabel={`${instrument}, ${weekdayName(language, row.position, 'long')}${
        row.taskText ? `, ${row.taskText}` : ''
      }${lit ? `, ${t('record.playingNow')}` : ''}`}
      testID={`record-row-${row.position}`}
      style={[styles.row, lit ? { backgroundColor: `${palette.tomato}22` } : null]}
    >
      <View style={[styles.thumb, { backgroundColor: palette.surface }]}>
        {row.monster ? <Monster spec={row.monster.spec} size={48} /> : null}
      </View>
      <View style={styles.grow}>
        <SessionText face="action" color={palette.ink}>
          {instrument}
        </SessionText>
        <SessionText face="caption" color={palette.muted}>
          {detail}
        </SessionText>
      </View>
    </View>
  );
}

/**
 * The week's record: its bars so far, the liner notes crediting each instrument to its day and
 * task, and the play control. Listening and sharing are free; keeping a record is Plus, drawn as
 * a locked control. Only earned bars are listed, so a short week is simply a smaller band.
 */
export function RecordScreen({ model, actions }: { model: RecordModel; actions: RecordActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { width } = useWindowDimensions();
  const { week, playback, language } = model;
  const instruments: RecordInstrument[] = week.rows.map((row) => row.instrument);
  const fallbackName = t('record.week', { number: week.weekNumber });
  const cover = week.rows.flatMap((row) => (row.monster ? [row.monster.spec] : []));
  const waiting = week.waitingFor;
  return (
    <KeepFrame
      testID="record"
      title={t('record.title')}
      subtitle={
        week.full
          ? `${fallbackName} · ${t('record.fullBand')}`
          : t('record.barsOfSeven', { count: week.barCount })
      }
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="record-close"
      footer={
        <Dock
          quiet={
            // What was kept stays reachable without Plus; keeping another needs it.
            model.kept === true || (!model.plus && (model.keptCount ?? 0) > 0)
              ? {
                  label: t('record.shelf', { count: model.keptCount ?? 0 }),
                  hint: t('record.shelf.hint'),
                  testID: 'record-shelf-open',
                  ...(actions.openShelf ? { onPress: actions.openShelf } : {}),
                }
              : model.plus
                ? {
                    label: t('record.keep'),
                    hint: t('record.keep.hint'),
                    testID: 'record-keep',
                    ...(actions.keep ? { onPress: actions.keep } : {}),
                  }
                : {
                    label: t('record.keep'),
                    hint: t('keep.plusOnly.hint'),
                    testID: 'record-keep',
                    locked: true,
                    ...(actions.openPlus ? { onPress: actions.openPlus } : {}),
                  }
          }
          {...(weekShareOffered(week)
            ? {
                action: {
                  label: t('record.shareWeek'),
                  hint: t('record.shareWeek.hint'),
                  testID: 'record-share-week',
                  onPress: actions.shareWeek,
                },
              }
            : {})}
        />
      }
    >
      <View style={styles.centre}>
        <RecordDiscView
          size={Math.min(300, width - spacing.lg * 2)}
          barCount={week.barCount}
          cover={cover}
          playing={playback.playing}
          armDeg={playback.armDeg}
          reducedMotion={model.reducedMotion}
        />
      </View>
      <View style={styles.playRow}>
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={playback.playing ? t('record.pause') : t('record.play')}
          accessibilityHint={t('record.play.hint')}
          accessibilityState={{ disabled: week.barCount === 0 }}
          disabled={week.barCount === 0}
          testID="record-play"
          onPress={actions.togglePlay}
          feedback="primary"
          style={[
            styles.play,
            { backgroundColor: palette.ink, opacity: week.barCount === 0 ? 0.45 : 1 },
          ]}
        >
          {playback.playing ? (
            <View style={styles.pause}>
              <View style={[styles.pauseBar, { backgroundColor: palette.page }]} />
              <View style={[styles.pauseBar, { backgroundColor: palette.page }]} />
            </View>
          ) : (
            <View style={[styles.triangle, { borderLeftColor: palette.page }]} />
          )}
        </PressSpring>
        <View style={styles.grow}>
          <SessionText face="action" color={palette.ink} testID="record-name">
            {week.name ?? fallbackName}
          </SessionText>
          <SessionText face="caption" color={palette.muted} testID="record-band">
            {week.barCount === 0 ? t('record.empty') : bandLine(instruments, t)}
          </SessionText>
        </View>
      </View>
      <BarStrip barCount={week.barCount} progress={playback.progress} />
      {week.linerNote ? (
        <View style={[styles.note, { backgroundColor: palette.surface }]}>
          <SessionText face="body" color={palette.ink} testID="record-liner-note">
            {week.linerNote}
          </SessionText>
        </View>
      ) : null}
      {week.rows.map((row) => (
        <CreditRow
          key={row.position}
          row={row}
          lit={playback.lit.includes(row.instrument)}
          language={language}
        />
      ))}
      {waiting ? (
        <View style={[styles.row, styles.waiting]} accessible testID="record-waiting">
          <View style={[styles.thumb, { backgroundColor: palette.surface }]} />
          <View style={styles.grow}>
            <SessionText face="action" color={palette.muted}>
              {t('record.waiting', {
                weekday: weekdayName(language, waiting.position, 'short'),
              })}
            </SessionText>
            <SessionText face="caption" color={palette.muted}>
              {t('record.waiting.hint', {
                instrument: instrumentName(waiting.instrument, t).toLowerCase(),
              })}
            </SessionText>
          </View>
        </View>
      ) : null}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  grow: { flex: 1 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  triangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 15,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pause: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 5, height: 18, borderRadius: 2 },
  note: { borderRadius: 24, padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    padding: 4,
  },
  waiting: { opacity: 0.6 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
