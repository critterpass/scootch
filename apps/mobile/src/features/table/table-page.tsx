import { StyleSheet, View } from 'react-native';

import {
  TABLE_MAX_SEATS,
  type SessionMinutes,
  type TableSeat,
  type WorkMode,
} from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Row, Section, SwitchRow } from '../settings/rows';

import { OpenSeat, Seat } from './seat';
import type { TableNotice, TableState } from './table-store';
import { Words } from './words';

export interface TablePageProps {
  readonly table: Pick<TableState, 'status' | 'you' | 'seats' | 'nudgesLeft' | 'hidden' | 'notice'>;
  /** The person's own work mode, for their own critter. */
  readonly workMode: WorkMode | null;
  /** The seat a nudge would go to. */
  readonly chosen: string | null;
  /** What the table's timer offers this person right now. */
  readonly timer:
    | { readonly kind: 'start'; readonly minutes: SessionMinutes }
    | { readonly kind: 'join_in'; readonly minutes: SessionMinutes }
    | { readonly kind: 'running' }
    | { readonly kind: 'need_task' };
  readonly onChoose: (userId: string) => void;
  readonly onSeatSheet: (seat: TableSeat) => void;
  readonly onNudge: (userId: string) => void;
  readonly onInvite: () => void;
  readonly onTimer: () => void;
  readonly onShowLabel: (shown: boolean) => void;
  readonly onDismiss: () => void;
  readonly onLeave: () => void;
  readonly onClose: () => void;
}

function nameOf(seats: readonly TableSeat[], userId: string, fallback: string): string {
  return seats.find((seat) => seat.userId === userId)?.name ?? fallback;
}

/** A nudge that arrived, a seat that emptied, or the fourth nudge explaining itself. */
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
      ) : (
        <Words>
          {notice.name === null ? t('table.leftNoName') : t('table.left', { name: notice.name })}
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
  const { table, timer, chosen } = props;
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const open = Math.max(0, TABLE_MAX_SEATS - table.seats.length);
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
      <View style={[styles.seats, { backgroundColor: palette.surface }]}>
        {table.seats.map((seat) => (
          <Seat
            key={seat.userId}
            seat={seat}
            yours={seat.userId === table.you}
            workMode={seat.userId === table.you ? props.workMode : null}
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
      {timer.kind === 'start' || timer.kind === 'join_in' ? (
        <CapsuleButton
          label={t(timer.kind === 'start' ? 'table.start' : 'table.joinIn', {
            minutes: timer.minutes,
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
      <Section label={t('table.title')}>
        <SwitchRow
          first
          label={t('table.showLabel')}
          sub={t('table.showLabel.sub')}
          hint={t('table.showLabel.hint')}
          value={!table.hidden}
          onChange={props.onShowLabel}
          testID="table-show-label"
        />
        <Row
          danger
          label={t('table.leave')}
          hint={t('table.leave.hint')}
          onPress={props.onLeave}
          testID="table-leave"
        />
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.lg + 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notice: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
});
