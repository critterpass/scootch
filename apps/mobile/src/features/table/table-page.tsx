import { StyleSheet, View } from 'react-native';

import type { TableSeat, WorkMode } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT, type Translate } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';
import { QuietLink } from '../dump/dump-panels';

import { ActionDock } from './action-dock';
import { OpenSeat, Seat } from './seat';
import { TableBanner } from './table-banner';
import type { TableTimer } from './table-rules';
import type { TableNotice, TableState } from './table-store';
import { Words } from './words';

export interface TablePageProps {
  readonly table: Pick<
    TableState,
    'status' | 'you' | 'seats' | 'capacity' | 'nudgesLeft' | 'hidden' | 'notice'
  >;
  /** The person's own work mode, for their own critter. */
  readonly workMode: WorkMode | null;
  /** The seat a nudge would go to. */
  readonly chosen: string | null;
  /** What the table's timer offers this person right now. */
  readonly timer: TableTimer;
  /**
   * The person finished their thing and is still seated: how long they sat, in whole minutes,
   * when the table said when they sat down. `null` while there is nothing finished.
   */
  readonly done: { readonly minutes: number | null } | null;
  readonly onChoose: (userId: string) => void;
  readonly onSeatSheet: (seat: TableSeat) => void;
  readonly onNudge: (userId: string) => void;
  readonly onInvite: () => void;
  readonly onTimer: () => void;
  /** Opens the table's menu. */
  readonly onMenu: () => void;
  /** The way to the next one thing, with the seat kept. */
  readonly onNext: () => void;
  readonly onDismiss: () => void;
  readonly onLeave: () => void;
  readonly onClose: () => void;
}

function nameOf(seats: readonly TableSeat[], userId: string, fallback: string): string {
  return seats.find((seat) => seat.userId === userId)?.name ?? fallback;
}

/** Who is at the table, in a few plain words: the table's own heading, and its menu's. */
export function tableSummary(table: Pick<TableState, 'you' | 'seats'>, t: Translate): string {
  const others = table.seats.filter((seat) => seat.userId !== table.you).length;
  return others === 0 ? t('table.summary.alone') : t('table.summary', { count: others });
}

/** What happened, where it is said as the screen's sentence: a seat emptied, or the fourth nudge. */
function Said(props: TablePageProps & { readonly notice: TableNotice }) {
  const { notice, table } = props;
  const t = useT();
  const someone = t('friends.noName');
  if (notice.kind !== 'left' && notice.kind !== 'nudge_limit') return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      testID={`table-notice-${notice.kind}`}
      style={styles.said}
    >
      <Words kind="headline">
        {notice.kind === 'nudge_limit'
          ? t('table.nudgeLimit')
          : notice.name === null
            ? t(notice.done ? 'table.leftDoneNoName' : 'table.leftNoName')
            : t(notice.done ? 'table.leftDone' : 'table.left', { name: notice.name })}
      </Words>
      {notice.kind === 'nudge_limit' ? (
        <Words kind="quiet">
          {t('table.nudgeLimit.sub', { name: nameOf(table.seats, notice.to, someone) })}
        </Words>
      ) : null}
      <View style={styles.chips}>
        <QuietLink
          label={t('table.ok')}
          hint={t('table.ok.hint')}
          onPress={props.onDismiss}
          testID="table-notice-ok"
        />
      </View>
    </View>
  );
}

/**
 * What is said over the seat card: someone sat down, someone waved, or the line to the table is
 * not what it was. An arrival and a wave go away on a tap; the state of the line stays.
 */
function Banner(props: TablePageProps & { readonly status: string | null }) {
  const { table, status } = props;
  const t = useT();
  const someone = t('friends.noName');
  const { notice } = table;
  if (notice?.kind === 'nudged') {
    return (
      <TableBanner
        seed={notice.from}
        title={t('table.nudged', { name: nameOf(table.seats, notice.from, someone) })}
        sub={t('table.nudged.sub')}
        hint={t('table.ok.hint')}
        onPress={props.onDismiss}
        testID="table-notice-nudged"
      />
    );
  }
  if (notice?.kind === 'sat') {
    const sat = table.seats.find((seat) => seat.userId === notice.userId);
    return (
      <TableBanner
        seed={notice.userId}
        title={notice.name === null ? t('table.satNoName') : t('table.sat', { name: notice.name })}
        sub={sat === undefined || sat.label === '' ? null : sat.label}
        hint={t('table.ok.hint')}
        onPress={props.onDismiss}
        testID="table-notice-sat"
      />
    );
  }
  return status === null ? null : <TableBanner title={status} testID="table-status" />;
}

/**
 * The table, as the board draws it: the seat card with up to four critters, each with a name and
 * one or two words; one big sentence under it; and one dock with what can be done now. Nothing is
 * said between seats but a wave. A dropped line is said plainly and without alarm.
 */
export function TablePage(props: TablePageProps) {
  const { table, timer, chosen, done } = props;
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const open = Math.max(0, table.capacity - table.seats.length);
  const alone = table.seats.length <= 1;
  const target = table.seats.find((seat) => seat.userId === chosen && seat.userId !== table.you);
  const size = largeText ? 64 : 104;
  const status =
    table.status === 'reconnecting' || table.status === 'connecting'
      ? t('table.reconnecting')
      : table.status === 'replaced'
        ? t('table.replaced')
        : table.status === 'removed'
          ? t('table.removed')
          : null;

  // The quiet side of the dock: a wave back, a nudge to the chosen seat, or the invite.
  const nudged = table.notice?.kind === 'nudged' ? table.notice.from : null;
  const quiet =
    nudged !== null
      ? {
          label: t('table.nudgeBack'),
          hint: t('table.nudgeBack.hint'),
          onPress: () => props.onNudge(nudged),
          testID: 'table-nudge-back',
        }
      : target
        ? {
            label: t('table.nudge', {
              name: target.name ?? t('friends.noName'),
              count: table.nudgesLeft,
            }),
            hint: t('table.nudge.hint'),
            onPress: () => props.onNudge(target.userId),
            testID: 'table-nudge',
          }
        : open > 0
          ? {
              label: t('table.invite'),
              hint: t('table.invite.hint'),
              onPress: props.onInvite,
              testID: 'table-invite',
            }
          : undefined;
  const dock =
    done !== null ? (
      <ActionDock
        quiet={{
          label: t('table.done.leave'),
          hint: t('table.leave.hint'),
          onPress: props.onLeave,
          testID: 'table-done-leave',
        }}
        action={{
          label: t('table.done.next'),
          hint: t('table.done.next.hint'),
          onPress: props.onNext,
          testID: 'table-done-next',
        }}
      />
    ) : (
      <ActionDock
        quiet={quiet}
        action={
          timer.kind === 'start' || timer.kind === 'join_in'
            ? {
                label: t(timer.kind === 'start' ? 'table.start' : 'table.joinIn', {
                  minutes: timer.kind === 'start' ? timer.minutes : timer.left,
                }),
                hint: t(timer.kind === 'start' ? 'table.start.hint' : 'table.joinIn.hint'),
                onPress: props.onTimer,
                testID: 'table-timer',
              }
            : undefined
        }
      />
    );

  return (
    <Page
      barTitle={t('table.title')}
      onClose={props.onClose}
      testID="table"
      menu={{ label: t('table.menu'), hint: t('table.menu.hint'), onPress: props.onMenu }}
      footer={dock}
    >
      <Banner {...props} status={status} />
      <View style={[styles.seats, { backgroundColor: palette.risoBlob }]}>
        {table.seats.map((seat) => (
          <Seat
            key={seat.userId}
            seat={seat}
            yours={seat.userId === table.you}
            workMode={seat.userId === table.you ? props.workMode : seat.workMode}
            chosen={seat.userId === chosen && seat.userId !== table.you}
            size={size}
            // A wave: whoever sent it is waving, and the person it reached is pleased.
            {...(nudged === null
              ? {}
              : seat.userId === nudged
                ? { mood: 'nudge' as const }
                : seat.userId === table.you
                  ? { mood: 'celebrating' as const }
                  : {})}
            {...(seat.userId === table.you
              ? {}
              : {
                  onPress: () => props.onChoose(seat.userId),
                  onLongPress: () => props.onSeatSheet(seat),
                })}
          />
        ))}
        {Array.from({ length: open }, (_, index) => (
          <OpenSeat key={`open-${index}`} size={size} />
        ))}
      </View>
      {table.notice?.kind !== 'left' && table.notice?.kind !== 'nudge_limit' ? (
        <View style={styles.said}>
          <Words kind="headline" testID="table-caption">
            {alone ? t('table.seatsSaved', { count: open }) : t('table.together')}
          </Words>
          {done !== null || timer.kind === 'start' || timer.kind === 'join_in' ? null : (
            <Words kind="quiet" testID="table-timer-note">
              {t(timer.kind === 'running' ? 'table.running' : 'table.needTask')}
            </Words>
          )}
        </View>
      ) : (
        <Said {...props} notice={table.notice} />
      )}
      {done === null ? null : (
        <>
          <Section>
            {done.minutes === null ? null : (
              <Row
                first
                kind="fact"
                label={t('table.done.sat')}
                value={t('taskSet.minutes', { minutes: done.minutes })}
                testID="table-done-sat"
              />
            )}
            <Row
              first={done.minutes === null}
              kind="fact"
              label={t('table.done.keptFor')}
              value={t('taskSet.minutes', { minutes: 10 })}
              testID="table-done-kept"
            />
          </Section>
          <Note text={t('table.done.kept')} />
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 40,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    rowGap: spacing.lg,
    columnGap: spacing.sm,
  },
  said: { paddingHorizontal: 12, gap: 10 },
  chips: { flexDirection: 'row' },
});
