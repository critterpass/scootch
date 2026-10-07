import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Language } from '@scootch/i18n';
import type { RecordInstrument } from '@scootch/sound';
import { spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { weekdayName } from '../reveal/weekday-name';
import { SessionText } from '../session/ui/session-text';

import type { RecordPlayback } from './use-record-playback';
import { weekShareOffered, type WeekView } from './record-week';
import { CreditRow } from './ui/credit-row';
import { RecordDaySheet } from './ui/record-day-sheet';
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

/**
 * The week's record: its bars so far, the liner notes crediting each instrument to its day and
 * task, and the play control. Listening and sharing are free; keeping a record is Plus, drawn as
 * a locked control. Only earned bars are listed, so a short week is simply a smaller band.
 */
export function RecordScreen({ model, actions }: { model: RecordModel; actions: RecordActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const character = useCharacterMotion();
  const { width } = useWindowDimensions();
  const { week, playback, language } = model;
  const instruments: RecordInstrument[] = week.rows.map((row) => row.instrument);
  const fallbackName = t('record.week', { number: week.weekNumber });
  const cover = week.rows.flatMap((row) => (row.monster ? [row.monster.spec] : []));
  const waiting = week.waitingFor;
  // The day whose things are listed on the sheet; it stays drawn while the sheet closes.
  const [dayOpen, setDayOpen] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const shown = week.rows.find((row) => row.position === day) ?? null;
  // While the band builds, one instrument is lit: the one joining. The line under the name says so.
  const joining =
    playback.playing && playback.lit.length === 1
      ? week.rows.find((row) => row.instrument === playback.lit[0])
      : undefined;
  const bandNow = joining
    ? t('record.nowJoins', {
        weekday: weekdayName(language, joining.position, 'short'),
        instrument: instrumentName(joining.instrument, t),
      })
    : bandLine(instruments, t);
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
        <View style={styles.meta}>
          <SessionText
            face="action"
            color={palette.ink}
            numberOfLines={1}
            style={styles.name}
            testID="record-name"
          >
            {week.name ?? fallbackName}
          </SessionText>
          <SessionText
            face="caption"
            color={palette.muted}
            style={styles.band}
            accessibilityLiveRegion="polite"
            testID="record-band"
          >
            {week.barCount === 0 ? t('record.empty') : bandNow}
          </SessionText>
        </View>
      </View>
      <BarStrip barCount={week.barCount} progress={playback.progress} />
      {week.linerNote ? (
        <View style={[styles.note, { backgroundColor: palette.surface }]}>
          <Scootch mood="pleased" size={46} {...character} />
          <SessionText
            face="caption"
            color={palette.ink}
            style={styles.noteWords}
            testID="record-liner-note"
          >
            {week.linerNote}
          </SessionText>
        </View>
      ) : null}
      <View style={styles.credits}>
        {week.rows.map((row) => {
          const lit = playback.lit.includes(row.instrument);
          const instrument = instrumentName(row.instrument, t);
          const day = weekdayName(language, row.position, 'short');
          return (
            <CreditRow
              key={row.position}
              testID={`record-row-${row.position}`}
              title={instrument}
              detail={row.taskText ? `${day} · ${row.taskText}` : day}
              label={`${instrument}, ${weekdayName(language, row.position, 'long')}${
                row.taskText ? `, ${row.taskText}` : ''
              }${lit ? `, ${t('record.playingNow')}` : ''}`}
              lit={lit}
              // A day with no monster asked for care: its row names no task and draws nobody.
              {...(row.monster ? { work: row.workMode } : {})}
              // A day with something caught on it opens the list of what that was.
              {...(row.caught.length > 0
                ? {
                    hint: t('record.day.hint'),
                    onPress: () => {
                      setDay(row.position);
                      setDayOpen(true);
                    },
                  }
                : {})}
            />
          );
        })}
        {waiting ? (
          <CreditRow
            waiting
            testID="record-waiting"
            title={t('record.waiting', {
              weekday: weekdayName(language, waiting.position, 'short'),
            })}
            detail={t('record.waiting.hint', {
              instrument: instrumentName(waiting.instrument, t).toLowerCase(),
            })}
            label={`${t('record.waiting', {
              weekday: weekdayName(language, waiting.position, 'long'),
            })}, ${t('record.waiting.hint', {
              instrument: instrumentName(waiting.instrument, t).toLowerCase(),
            })}`}
          />
        ) : null}
        {week.rows.length > 0 ? (
          <SessionText face="caption" color={palette.muted} style={styles.produced}>
            {t('record.produced')}
          </SessionText>
        ) : null}
      </View>
      <RecordDaySheet
        open={dayOpen}
        row={shown}
        language={language}
        onClose={() => setDayOpen(false)}
      />
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', paddingTop: spacing.sm },
  // The play control and the words beside it: 14 apart, the name on one line.
  meta: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 18, lineHeight: 18 * 1.2 },
  band: { fontSize: 13, fontWeight: '500' },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 16px -4px rgba(28,26,23,0.35)',
  },
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
  // Scootch's note: a 22 point corner, 14 by 16 inside, 20 in from the screen's sides.
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: -4,
    boxShadow: '0 0 0 0.5px rgba(28,26,23,0.06)',
  },
  noteWords: { flex: 1, fontSize: 15, lineHeight: 15 * 1.32, fontWeight: '600' },
  // The rows sit 16 in from the screen's sides and 4 apart.
  credits: { gap: 4, marginHorizontal: -8 },
  produced: { fontSize: 12, lineHeight: 12 * 1.4, paddingHorizontal: 12, paddingTop: 10 },
});
