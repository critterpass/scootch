import type { Task } from '@phusclass/domain/board';
import { fonts } from '@phusclass/tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHandFont } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { PhuFigure } from '../board/phu-figure';
import { LockedPanel } from '../tuition/locked-panel';
import { Capsule, paper, Sized } from '../tuition/receipt-parts';

import type { Bookings } from './bookings';
import { DayBody } from './day-body';
import { DayDial } from './day-dial';
import { dialArcs } from './dial-math';
import type { FreePick, SchoolDay } from './periods';

/** One day in the strip above the timetable. */
export interface StripDay {
  readonly date: string;
  /** The weekday's short name in the language: "M", "T2". */
  readonly letter: string;
  readonly number: string;
  /** Its full name, for VoiceOver. */
  readonly spoken: string;
  readonly selected: boolean;
  readonly weekend: boolean;
}

export type TimetableBody =
  | { readonly kind: 'locked'; readonly sample: SchoolDay }
  | { readonly kind: 'ask'; readonly line: string }
  | { readonly kind: 'denied' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'weekend'; readonly task: Task | null; readonly line: string | null }
  | {
      readonly kind: 'day';
      readonly day: SchoolDay;
      readonly picks: readonly FreePick[];
      readonly bookings: Bookings;
      /** Minutes after midnight now; `null` on another day. */
      readonly nowMinutes: number | null;
    };

export interface TimetableViewProps {
  readonly days: readonly StripDay[];
  readonly body: TimetableBody;
  readonly onPickDay: (date: string) => void;
  readonly onAsk: () => void;
  readonly onNotNow: () => void;
  readonly onOpenSettings: () => void;
  readonly onBook: (periodId: string, taskId: string) => void;
  readonly onToDesk: (taskId: string) => void;
}

const DIAL_SIZE = 236;

/**
 * The timetable under the desk's task: the week's days, then the day as a dial, one card per
 * free period with his pick and Book it, and the day's periods in two halves with recess between.
 * Its other states: asking for the calendar, the weekend, and the quiet lock without tuition.
 */
export function TimetableView(props: TimetableViewProps) {
  const t = useT();
  const hand = useHandFont();
  const { body } = props;

  return (
    <View style={styles.body}>
      <View style={styles.strip} accessibilityRole="tablist">
        {props.days.map((day) => (
          <Pressable
            key={day.date}
            testID={`timetable-day-${day.date}`}
            accessibilityRole="tab"
            accessibilityLabel={day.spoken}
            accessibilityState={{ selected: day.selected }}
            onPress={() => props.onPickDay(day.date)}
            style={[styles.day, day.selected ? styles.daySelected : null]}
          >
            <Sized
              size={11}
              style={[
                styles.dayLetter,
                { color: day.selected ? paper.white : day.weekend ? '#B0A69B' : paper.ink },
              ]}
            >
              {day.letter}
            </Sized>
            <Sized
              size={17}
              style={[
                styles.dayNumber,
                { color: day.selected ? paper.white : day.weekend ? '#B0A69B' : paper.ink },
              ]}
            >
              {day.number}
            </Sized>
          </Pressable>
        ))}
      </View>

      {body.kind === 'ask' ? (
        <View style={styles.askCard} testID="timetable-ask">
          <View accessibilityElementsHidden style={styles.askPhu}>
            <PhuFigure mood="point" width={130} hand={hand} />
          </View>
          <Sized size={22} role="header" style={styles.askTitle}>
            {body.line}
          </Sized>
          <Sized size={14.5} style={styles.askBody}>
            {t('timetable.ask.promise')}
          </Sized>
          <View style={styles.askButtons}>
            <Capsule
              testID="timetable-ask-show"
              label={t('timetable.ask.show')}
              tone="ink"
              onPress={props.onAsk}
            />
            <Pressable
              testID="timetable-ask-not-now"
              accessibilityRole="button"
              onPress={props.onNotNow}
              style={styles.notNow}
            >
              <Sized size={15} style={styles.notNowText}>
                {t('timetable.ask.notNow')}
              </Sized>
            </Pressable>
          </View>
        </View>
      ) : null}

      {body.kind === 'denied' ? (
        <View style={styles.askCard} testID="timetable-denied">
          <Sized size={15} style={styles.askBody}>
            {t('timetable.denied')}
          </Sized>
          <Capsule label={t('timetable.openSettings')} tone="soft" onPress={props.onOpenSettings} />
        </View>
      ) : null}

      {body.kind === 'loading' ? (
        <Sized size={14} style={styles.loading}>
          {t('timetable.reading')}
        </Sized>
      ) : null}

      {body.kind === 'weekend' ? (
        <View testID="timetable-weekend" style={styles.stack}>
          <View style={styles.dialRow}>
            <DayDial
              size={DIAL_SIZE}
              arcs={[]}
              nowMinutes={null}
              caption={t('timetable.dial.empty')}
              label={t('timetable.weekend.title')}
              mood="sleep"
            />
          </View>
          <View style={styles.weekendCard}>
            <Sized size={22} role="header" style={styles.weekendTitle}>
              {t('timetable.weekend.title')}
            </Sized>
            <Sized size={14} style={styles.muted}>
              {body.line ?? t('timetable.weekend.nothing')}
            </Sized>
            {body.task !== null && body.task.status !== 'desk' ? (
              <Capsule
                testID="timetable-weekend-desk"
                label={t('timetable.weekend.toDesk')}
                tone="soft"
                onPress={() => body.task !== null && props.onToDesk(body.task.id)}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {body.kind === 'day' ? <DayBody body={body} onBook={props.onBook} /> : null}

      {body.kind === 'locked' ? (
        <View testID="timetable-locked" style={styles.lockedWrap}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.lockedBehind}
          >
            <View style={styles.dialRow}>
              <DayDial
                size={DIAL_SIZE}
                arcs={dialArcs(body.sample, new Set(), null)}
                nowMinutes={8.2 * 60}
                caption=""
                label=""
                mood="over"
              />
            </View>
          </View>
          <LockedPanel style={styles.lockedPanel} testID="timetable-lock" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  strip: { flexDirection: 'row', gap: 4, paddingHorizontal: 14 },
  day: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  daySelected: { backgroundColor: paper.ink },
  dayLetter: { fontWeight: '700', opacity: 0.7 },
  dayNumber: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  stack: { gap: 10 },
  dialRow: { alignItems: 'center', marginTop: 8 },
  askCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 26,
    backgroundColor: paper.white,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 2px rgba(60,40,20,0.05)',
  },
  askPhu: { width: 130, height: 143, overflow: 'hidden' },
  askTitle: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    letterSpacing: -0.22,
    textAlign: 'center',
    color: paper.ink,
    marginTop: 4,
  },
  askBody: { textAlign: 'center', color: '#6B655E', lineHeight: 21 },
  askButtons: { alignSelf: 'stretch', gap: 6, marginTop: 12 },
  notNow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notNowText: { color: '#6B655E', fontWeight: '600' },
  loading: { color: '#6B655E', textAlign: 'center', marginTop: 40 },
  weekendCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: paper.white,
    padding: 16,
    gap: 6,
    boxShadow: '0 1px 2px rgba(60,40,20,0.05)',
  },
  weekendTitle: { fontFamily: fonts.heading, fontWeight: '800', color: paper.ink },
  muted: { color: '#6B655E' },
  lockedWrap: { minHeight: 420 },
  lockedBehind: { opacity: 0.3 },
  lockedPanel: { position: 'absolute', left: 16, right: 16, top: 120 },
});
