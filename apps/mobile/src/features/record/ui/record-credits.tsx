import { StyleSheet, View } from 'react-native';

import type { Language } from '@scootch/i18n';
import type { RecordInstrument } from '@scootch/sound';

import { useT } from '../../../i18n/i18n-provider';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { weekdayName } from '../../reveal/weekday-name';
import { SessionText } from '../../session/ui/session-text';
import type { WeekView } from '../record-week';

import { CreditRow } from './credit-row';
import { instrumentName } from './record-parts';

export interface RecordCreditsProps {
  readonly week: WeekView;
  readonly language: Language;
  /** The instruments whose rows are lit just now. */
  readonly lit: readonly RecordInstrument[];
  /** Opens the list of what was caught on a day, by its place in the week. */
  readonly onDay: (position: number) => void;
}

/**
 * The liner notes: each instrument credited to its day and task, the day still waiting for its
 * instrument, and who produced it. Only earned bars are listed.
 */
export function RecordCredits({ week, language, lit, onDay }: RecordCreditsProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  const waiting = week.waitingFor;
  return (
    <View style={styles.credits}>
      {week.rows.map((row) => {
        const on = lit.includes(row.instrument);
        const instrument = instrumentName(row.instrument, t);
        const weekday = weekdayName(language, row.position, 'short');
        return (
          <CreditRow
            key={row.position}
            testID={`record-row-${row.position}`}
            title={instrument}
            detail={row.taskText ? `${weekday} · ${row.taskText}` : weekday}
            label={`${instrument}, ${weekdayName(language, row.position, 'long')}${
              row.taskText ? `, ${row.taskText}` : ''
            }${on ? `, ${t('record.playingNow')}` : ''}`}
            lit={on}
            // A day with no monster asked for care: its row names no task and draws nobody.
            {...(row.monster ? { work: row.workMode } : {})}
            // A day with something caught on it opens the list of what that was.
            {...(row.caught.length > 0
              ? { hint: t('record.day.hint'), onPress: () => onDay(row.position) }
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
  );
}

const styles = StyleSheet.create({
  // The rows sit 16 in from the screen's sides and 4 apart.
  credits: { gap: 4, marginHorizontal: -8 },
  produced: { fontSize: 12, lineHeight: 12 * 1.4, paddingHorizontal: 12, paddingTop: 10 },
});
