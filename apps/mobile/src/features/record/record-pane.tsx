import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { Language } from '@scootch/i18n';
import type { RecordInstrument } from '@scootch/sound';
import { spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { SendIcon } from '../../ui/icons';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { mix, presence, ramp, SONG, useKeepMotion, WORLD } from '../keep/keep-motion';
import { PaneHead } from '../keep/pane-head';
import { Lock } from '../reveal/ui/keep-frame';
import { weekdayName } from '../reveal/weekday-name';
import { SessionText } from '../session/ui/session-text';

import type { RecordPlayback } from './use-record-playback';
import { weekShareOffered, type WeekView } from './record-week';
import { PlayRow } from './ui/play-row';
import { RecordCredits } from './ui/record-credits';
import { RecordDaySheet } from './ui/record-day-sheet';
import { RecordDiscView } from './ui/record-disc-view';
import { BarStrip, bandLine, instrumentName } from './ui/record-parts';

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
  readonly togglePlay: () => void;
  readonly shareWeek: () => void;
  /** The locked control was tapped: the Plus sheet opens. Unset, it does nothing. */
  readonly openPlus?: () => void;
  readonly keep?: () => void;
  readonly openShelf?: () => void;
}

/** The record's room above it, and the record's widest. */
const DISC = { top: spacing.md, widest: 300 } as const;

/**
 * A part of the tab under the record, rising into place a little after the part above it, once
 * the record has landed.
 */
function Rising({ order, children }: { readonly order: number; readonly children: ReactNode }) {
  const { from, to, progress, calm } = useKeepMotion();
  const late = order * 0.05;
  const risen = useAnimatedStyle(() => {
    const { v } = presence(from.value, to.value, progress.value, SONG);
    if (calm) return { opacity: v, transform: [{ translateY: 0 }] };
    const k = ramp(v, 0.42 + late, 0.86 + late);
    return { opacity: k, transform: [{ translateY: mix(18, 0, k) }] };
  }, [late, calm]);
  return <Animated.View style={risen}>{children}</Animated.View>;
}

/**
 * The week's record, as a tab: its bars so far, the liner notes crediting each instrument to its
 * day and task, and the play control. Listening and sharing are free; keeping a record is Plus,
 * drawn as a locked chip. Only earned bars are listed, so a short week is simply a smaller band.
 *
 * Arriving from the world, the record rises out of the island's sand: it starts as wide and as
 * flat as the sand lies, tips up to face the eye while it turns once, and the arm comes in last.
 */
export function RecordPane({
  model,
  actions,
  active = true,
}: {
  readonly model: RecordModel;
  readonly actions: RecordActions;
  /** Whether this is the tab in view. Only then is it found by its name. */
  readonly active?: boolean;
}) {
  const t = useT();
  const { palette } = useScreenStyle();
  const character = useCharacterMotion();
  const { width } = useWindowDimensions();
  const { from, to, progress, sand, calm, barSpace } = useKeepMotion();
  const { week, playback, language } = model;
  const instruments: RecordInstrument[] = week.rows.map((row) => row.instrument);
  const fallbackName = t('record.week', { number: week.weekNumber });
  const cover = week.rows.flatMap((row) => (row.monster ? [row.monster.spec] : []));
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

  const size = Math.min(DISC.widest, width - spacing.lg * 2);
  const lying = useAnimatedStyle(() => {
    const { v, other } = presence(from.value, to.value, progress.value, SONG);
    const flat = [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }, { rotate: '0deg' }];
    if (calm) return { opacity: v, transform: flat };
    const lies = sand.value;
    if (other === WORLD && lies !== null) {
      // As wide and as flat as the sand, where the sand was; then up to face the eye, turning.
      return {
        opacity: ramp(v, 0.12, 0.5),
        transform: [
          { translateY: mix(lies.cy - (DISC.top + size / 2), 0, v) },
          { scaleX: mix((lies.rx * 2) / size, 1, v) },
          { scaleY: mix((lies.ry * 2) / size, 1, v) },
          { rotate: `${mix(-150, 0, v)}deg` },
        ],
      };
    }
    if (other >= 0) {
      const k = mix(0.8, 1, v);
      return {
        opacity: ramp(v, 0.2, 0.7),
        transform: [
          { translateY: mix(22, 0, v) },
          { scaleX: k },
          { scaleY: k },
          { rotate: `${mix(-80, 0, v)}deg` },
        ],
      };
    }
    return { opacity: v > 0 ? 1 : 0, transform: flat };
  }, [size, calm]);
  const armArriving = useAnimatedStyle(() => {
    const { v } = presence(from.value, to.value, progress.value, SONG);
    if (calm) return { opacity: v, transform: [{ translateY: 0 }] };
    const k = ramp(v, 0.68, 1);
    return { opacity: k, transform: [{ translateY: mix(-14, 0, k) }] };
  }, [calm]);

  const shelved = model.kept === true || (!model.plus && (model.keptCount ?? 0) > 0);
  return (
    <View style={styles.fill} testID={active ? 'record' : undefined}>
      <PaneHead
        tab={SONG}
        title={t('record.title')}
        subtitle={
          week.full
            ? `${fallbackName} · ${t('record.fullBand')}`
            : t('record.barsOfSeven', { count: week.barCount })
        }
        countTestID="record-count"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollsToTop={active}
        contentContainerStyle={[styles.middle, { paddingBottom: barSpace + spacing.md }]}
      >
        <View style={styles.centre}>
          <RecordDiscView
            size={size}
            barCount={week.barCount}
            cover={cover}
            playing={playback.playing}
            armDeg={playback.armDeg}
            reducedMotion={model.reducedMotion}
            lying={lying}
            armArriving={armArriving}
          />
        </View>
        <Rising order={0}>
          <PlayRow
            playing={playback.playing}
            empty={week.barCount === 0}
            name={week.name ?? fallbackName}
            band={week.barCount === 0 ? t('record.empty') : bandNow}
            onToggle={actions.togglePlay}
          />
        </Rising>
        <Rising order={1}>
          <BarStrip barCount={week.barCount} progress={playback.progress} />
        </Rising>
        <Rising order={2}>
          {/* What the dock used to hold: sharing the week, and keeping the record or its shelf. */}
          <View style={styles.chips}>
            {weekShareOffered(week) ? (
              <QuietLink
                label={t('record.shareWeek')}
                hint={t('record.shareWeek.hint')}
                testID="record-share-week"
                onPress={actions.shareWeek}
                icon={<SendIcon color={palette.ink} />}
              />
            ) : null}
            {shelved ? (
              <QuietLink
                label={t('record.shelf', { count: model.keptCount ?? 0 })}
                hint={t('record.shelf.hint')}
                testID="record-shelf-open"
                {...(actions.openShelf ? { onPress: actions.openShelf } : {})}
              />
            ) : model.plus ? (
              <QuietLink
                label={t('record.keep')}
                hint={t('record.keep.hint')}
                testID="record-keep"
                {...(actions.keep ? { onPress: actions.keep } : {})}
              />
            ) : (
              <QuietLink
                label={t('record.keep')}
                hint={t('keep.plusOnly.hint')}
                testID="record-keep"
                icon={<Lock color={palette.muted} />}
                {...(actions.openPlus ? { onPress: actions.openPlus } : {})}
              />
            )}
          </View>
        </Rising>
        {week.linerNote ? (
          <Rising order={3}>
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
          </Rising>
        ) : null}
        <Rising order={4}>
          <RecordCredits
            week={week}
            language={language}
            lit={playback.lit}
            onDay={(position) => {
              setDay(position);
              setDayOpen(true);
            }}
          />
        </Rising>
      </ScrollView>
      <RecordDaySheet
        open={dayOpen}
        row={shown}
        language={language}
        onClose={() => setDayOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  middle: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  centre: { alignItems: 'center', paddingTop: DISC.top },
  // The week's ways out, as glass chips in the middle: they wrap at the large text sizes.
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
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
});
