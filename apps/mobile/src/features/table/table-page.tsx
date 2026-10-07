import { StyleSheet, View } from 'react-native';

import type { TableSeat, WorkMode } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { useT, type Translate } from '../../i18n/i18n-provider';
import { CapsuleButton, RoundButton } from '../../ui/buttons';
import { MoreIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';

import { OpenSeat, Seat } from './seat';
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

/** Someone sat down, a nudge arrived, a seat emptied, or the fourth nudge explaining itself. */
function Notice(props: TablePageProps & { readonly notice: TableNotice }) {
  const { notice, table } = props;
  const t = useT();
  const { palette } = useScreenStyle();
  const someone = t('friends.noName');
  return (
    <View
      accessibilityLiveRegion="polite"
      testID={`table-notice-${notice.kind}`}
      style={[styles.notice, { backgroundColor: palette.surface }]}
    >
      {notice.kind === 'nudged' ? (
        <>
          <Words kind="title">
            {t('table.nudged', { name: nameOf(table.seats, notice.from, someone) })}
          </Words>
          <Words kind="quiet">{t('table.nudged.sub')}</Words>
          <CapsuleButton
            tone="quiet"
            label={t('table.nudgeBack')}
            hint={t('table.nudgeBack.hint')}
            onPress={() => props.onNudge(notice.from)}
            testID="table-nudge-back"
          />
        </>
      ) : notice.kind === 'nudge_limit' ? (
        <>
          <Words kind="title">{t('table.nudgeLimit')}</Words>
          <Words kind="quiet">
            {t('table.nudgeLimit.sub', { name: nameOf(table.seats, notice.to, someone) })}
          </Words>
        </>
      ) : notice.kind === 'sat' ? (
        <Words kind="title">
          {notice.name === null ? t('table.satNoName') : t('table.sat', { name: notice.name })}
        </Words>
      ) : (
        <Words>
          {notice.name === null
            ? t(notice.done ? 'table.leftDoneNoName' : 'table.leftNoName')
            : t(notice.done ? 'table.leftDone' : 'table.left', { name: notice.name })}
        </Words>
      )}
      <CapsuleButton
        tone="quiet"
        label={t('table.ok')}
        hint={t('table.ok.hint')}
        onPress={props.onDismiss}
        testID="table-notice-ok"
      />
    </View>
  );
}

/**
 * The table: up to four critters, each with a name and one or two words, and nothing to say to
 * each other but a wave. A dropped line is said plainly and without alarm.
 */
export function TablePage(props: TablePageProps) {
  const { table, timer, chosen, done } = props;
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const open = Math.max(0, table.capacity - table.seats.length);
  const alone = table.seats.length <= 1;
  const target = table.seats.find((seat) => seat.userId === chosen && seat.userId !== table.you);
  const size = largeText ? 64 : 96;
  const status =
    table.status === 'reconnecting' || table.status === 'connecting'
      ? t('table.reconnecting')
      : table.status === 'replaced'
        ? t('table.replaced')
        : table.status === 'removed'
          ? t('table.removed')
          : null;

  return (
    <Page barTitle={t('table.title')} onClose={props.onClose} testID="table">
      {status === null ? null : (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="table-status">
          {status}
        </Words>
      )}
      <View style={styles.head}>
        <View style={styles.summary}>
          <Words kind="quiet" testID="table-summary">
            {tableSummary(table, t)}
          </Words>
        </View>
        <RoundButton
          label={t('table.menu')}
          hint={t('table.menu.hint')}
          onPress={props.onMenu}
          testID="table-menu-button"
        >
          <MoreIcon color={palette.ink} />
        </RoundButton>
      </View>
      <View style={[styles.seats, { backgroundColor: palette.surface }]}>
        {table.seats.map((seat) => (
          <Seat
            key={seat.userId}
            seat={seat}
            yours={seat.userId === table.you}
            workMode={seat.userId === table.you ? props.workMode : seat.workMode}
            chosen={seat.userId === chosen && seat.userId !== table.you}
            size={size}
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
      {table.notice === null ? (
        <Words kind="quiet" testID="table-caption">
          {alone ? t('table.seatsSaved', { count: open }) : t('table.together')}
        </Words>
      ) : (
        <Notice {...props} notice={table.notice} />
      )}
      {done !== null ? (
        <>
          {done.minutes === null ? null : (
            <Section>
              <Row
                first
                kind="fact"
                label={t('table.done.sat')}
                value={t('taskSet.minutes', { minutes: done.minutes })}
                testID="table-done-sat"
              />
            </Section>
          )}
          <Note text={t('table.done.kept')} testID="table-done-kept" />
          <CapsuleButton
            label={t('table.done.next')}
            hint={t('table.done.next.hint')}
            onPress={props.onNext}
            testID="table-done-next"
          />
          <CapsuleButton
            tone="quiet"
            label={t('table.done.leave')}
            hint={t('table.leave.hint')}
            onPress={props.onLeave}
            testID="table-done-leave"
          />
        </>
      ) : timer.kind === 'start' || timer.kind === 'join_in' ? (
        <CapsuleButton
          label={t(timer.kind === 'start' ? 'table.start' : 'table.joinIn', {
            minutes: timer.kind === 'start' ? timer.minutes : timer.left,
          })}
          hint={t(timer.kind === 'start' ? 'table.start.hint' : 'table.joinIn.hint')}
          onPress={props.onTimer}
          testID="table-timer"
        />
      ) : (
        <Words kind="quiet" testID="table-timer-note">
          {t(timer.kind === 'running' ? 'table.running' : 'table.needTask')}
        </Words>
      )}
      {target ? (
        <CapsuleButton
          tone="quiet"
          label={t('table.nudge', {
            name: target.name ?? t('friends.noName'),
            count: table.nudgesLeft,
          })}
          hint={t('table.nudge.hint')}
          onPress={() => props.onNudge(target.userId)}
          testID="table-nudge"
        />
      ) : null}
      {open > 0 ? (
        <CapsuleButton
          tone="quiet"
          label={t('table.invite')}
          hint={t('table.invite.hint')}
          onPress={props.onInvite}
          testID="table-invite"
        />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summary: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.lg + 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notice: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
});
