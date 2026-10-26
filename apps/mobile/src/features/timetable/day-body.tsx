import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useLanguage, useT, type Translate } from '../../i18n/i18n-provider';
import { paper, Sized } from '../tuition/receipt-parts';

import { DayDial } from './day-dial';
import { dialArcs, freeAhead } from './dial-math';
import { clockOf, type Period, type SchoolDay } from './periods';
import type { TimetableBody } from './timetable-view';

const DIAL_SIZE = 236;

function subjectName(subject: Extract<Period, { kind: 'class' }>['subject'], t: Translate) {
  switch (subject) {
    case 'pe':
      return t('timetable.subject.pe');
    case 'homeroom':
      return t('timetable.subject.homeroom');
    case 'recess':
      return t('timetable.subject.recess');
    case 'biology':
      return t('timetable.subject.biology');
    case 'geography':
      return t('timetable.subject.geography');
    case 'music':
      return t('timetable.subject.music');
    case 'literature':
      return t('timetable.subject.literature');
    case 'maths':
      return t('timetable.subject.maths');
    case 'elective':
      return t('timetable.subject.elective');
  }
}

function dialWords(day: SchoolDay, nowMinutes: number | null, t: Translate) {
  const ahead = freeAhead(day, nowMinutes);
  const classes = [...day.morning, ...day.afternoon].some((one) => one.kind === 'class');
  return {
    caption: !classes
      ? t('timetable.dial.empty')
      : ahead > 0
        ? t('timetable.dial.free', { count: ahead })
        : t('timetable.dial.none'),
    label: t('timetable.dial.label', { count: ahead }),
  };
}

/** The day: the dial, a card per free period with his pick, then the periods by half. */
export function DayBody({
  body,
  onBook,
}: {
  readonly body: Extract<TimetableBody, { kind: 'day' }>;
  readonly onBook: (periodId: string, taskId: string) => void;
}) {
  const t = useT();
  const { language } = useLanguage();
  const booked = new Set(Object.keys(body.bookings));
  const words = dialWords(body.day, body.nowMinutes, t);
  const halves = [
    { key: 'morning', title: t('timetable.morning'), periods: body.day.morning },
    { key: 'afternoon', title: t('timetable.afternoon'), periods: body.day.afternoon },
  ] as const;

  return (
    <View style={styles.stack} testID="timetable-today">
      <View style={styles.dialRow}>
        <DayDial
          size={DIAL_SIZE}
          arcs={dialArcs(body.day, booked, body.nowMinutes)}
          nowMinutes={body.nowMinutes}
          caption={words.caption}
          label={words.label}
          mood="over"
        />
      </View>
      {body.picks.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cards}
        >
          {body.picks.map(({ period, task }) => {
            const isBooked = task !== null && body.bookings[period.id] === task.id;
            const minutes = period.end - period.start;
            return (
              <View
                key={period.id}
                testID={`timetable-free-${period.id}`}
                style={[styles.card, { backgroundColor: isBooked ? paper.red : paper.redSoft }]}
              >
                <Sized
                  size={24}
                  style={[styles.cardTime, { color: isBooked ? paper.white : paper.redDeep }]}
                >
                  {clockOf(period.start)}
                </Sized>
                <Sized size={12} style={{ color: isBooked ? 'rgba(255,255,255,0.8)' : '#A8564F' }}>
                  {t('timetable.free.length', { count: minutes })}
                </Sized>
                <Sized
                  size={14}
                  lines={2}
                  style={[styles.cardTask, { color: isBooked ? paper.white : paper.ink }]}
                >
                  {task?.text ?? t('timetable.free.nothing')}
                </Sized>
                {task !== null ? (
                  <Pressable
                    testID={`timetable-book-${period.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isBooked
                        ? t('timetable.free.booked')
                        : t('timetable.free.bookLabel', {
                            task: task.text,
                            time: clockOf(period.start),
                          })
                    }
                    accessibilityState={{ selected: isBooked }}
                    onPress={() => onBook(period.id, task.id)}
                    style={[
                      styles.book,
                      { backgroundColor: isBooked ? 'rgba(255,255,255,0.22)' : paper.ink },
                    ]}
                  >
                    <Sized size={13.5} style={styles.bookText}>
                      {isBooked ? t('timetable.free.booked') : t('timetable.free.book')}
                    </Sized>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.list}>
        {halves.map((half, index) => (
          <Fragment key={half.key}>
            {index === 1 ? (
              <View style={styles.recess}>
                <Sized size={12} style={styles.recessText}>
                  {t('timetable.recess').toLocaleUpperCase(language)}
                </Sized>
              </View>
            ) : null}
            {half.periods.length > 0 ? (
              <View style={styles.half}>
                <Sized size={12} role="header" style={styles.halfTitle}>
                  {half.title.toLocaleUpperCase(language)}
                </Sized>
                {half.periods.map((period, row) => (
                  <View key={period.id} style={[styles.row, row > 0 ? styles.rowRule : null]}>
                    <Sized size={13} style={styles.rowTime}>
                      {clockOf(period.start)}
                    </Sized>
                    <View style={styles.rowText}>
                      <Sized size={12} style={styles.rowPeriod}>
                        {t('timetable.period', { number: period.number })}
                        {' · '}
                        {period.kind === 'class'
                          ? subjectName(period.subject, t)
                          : t('timetable.free.period')}
                      </Sized>
                      {period.kind === 'class' ? (
                        <Sized size={15} style={styles.rowTitle}>
                          {period.title}
                          {period.classEndsAt !== null ? (
                            <Sized size={12.5} style={styles.classEnds}>
                              {' · '}
                              {t('timetable.classEnds', { time: clockOf(period.classEndsAt) })}
                            </Sized>
                          ) : null}
                        </Sized>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  dialRow: { alignItems: 'center', marginTop: 8 },
  cards: { gap: 10, paddingHorizontal: 16 },
  card: { width: 168, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12, gap: 1 },
  cardTime: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  cardTask: { marginTop: 8, fontWeight: '700' },
  book: {
    marginTop: 10,
    minHeight: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  bookText: { color: paper.white, fontWeight: '700' },
  list: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: paper.white,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(60,40,20,0.05)',
  },
  half: { paddingVertical: 6 },
  halfTitle: {
    fontWeight: '800',
    letterSpacing: 1,
    color: paper.muted,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(28,26,24,0.12)' },
  rowTime: { width: 48, color: paper.muted, fontVariant: ['tabular-nums'] },
  rowText: { flex: 1, gap: 1 },
  rowPeriod: { color: paper.muted, fontWeight: '600' },
  rowTitle: { fontWeight: '600', color: paper.ink },
  classEnds: { fontWeight: '500', color: paper.red },
  recess: { backgroundColor: '#F7F1E8', paddingVertical: 6, alignItems: 'center' },
  recessText: { fontWeight: '800', letterSpacing: 1, color: paper.green },
});
