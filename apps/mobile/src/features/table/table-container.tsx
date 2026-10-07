import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';

import type { TableSeat } from '@scootch/domain';

import { siteBaseUrl } from '../../api/api-config';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { useTableState, useTogether } from '../../state/together-context';
import { sharedPageLink } from '../share/share-links';

import { seatControls } from './seat-controls';
import { SeatSheet } from './seat-sheet';
import { tableEndsAt } from './table-clock';
import { TablePage } from './table-page';
import { TABLE_LOBBY, labelModeFor, tableTimer } from './table-rules';
import { goHome } from '../navigation/go-home';

/**
 * The table on the real phone. The session it starts is the day store's own: this screen sets and
 * starts it exactly as the one screen does, then hands over to the session route.
 */
export function TableContainer() {
  const { api, table } = useTogether();
  const state = useTableState();
  const { today } = useToday();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useT();
  const { language } = useLanguage();
  const [chosen, setChosen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<TableSeat | null>(null);
  const [muted, setMuted] = useState<readonly string[]>([]);
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);
  const task = 'task' in today ? today.task : null;
  const mode = labelModeFor(task);
  const controls = seatControls(api, table);

  // The seat follows the task: a new one thing changes the work mode the table is told.
  useEffect(() => table.setMode({ workMode: mode }), [table, mode]);
  useEffect(() => {
    if (state.tableId === null) router.replace(TABLE_LOBBY);
  }, [state.tableId, router]);

  const others = state.seats.filter((seat) => seat.userId !== state.you);
  const target = chosen ?? others[0]?.userId ?? null;
  const running =
    today.kind === 'in_session' || (today.kind === 'serious' && today.session !== null);
  const timer = tableTimer(
    state,
    { taskSet: task !== null && task.status === 'set', inSession: running },
    Date.now(),
  );

  const begin = () => {
    if (timer.kind !== 'start' && timer.kind !== 'join_in') return;
    // The table is told when the line is up; the person's own session starts either way.
    if (timer.kind === 'start') table.start(timer.minutes);
    // Joining in, the session ends when the table's does; the strip keeps it there afterwards.
    const end = timer.kind === 'join_in' ? tableEndsAt(table.getState(), Date.now()) : null;
    void dispatch({ type: 'session_set', minutes: timer.minutes, treat: null })
      .then(() => dispatch({ type: 'session', event: { type: 'started' } }))
      .then(() => (end === null ? undefined : dispatch({ type: 'table_clock', endsAt: end })))
      .then(() => router.replace('/session'))
      .catch(() => undefined);
  };
  const invite = () => {
    if (state.tableId === null) return;
    void api
      .tableInvite(state.tableId)
      .then(({ code }) =>
        Share.share({
          message: t('table.invite.message', {
            link: sharedPageLink(siteBaseUrl(), language, 't', code),
          }),
        }),
      )
      .catch(() => setResult('failed'));
  };
  const act = (work: Promise<unknown>, close: boolean) => {
    setResult(null);
    void work
      .then(() => (close ? setSheet(null) : setResult('sent')))
      .catch(() => setResult('failed'));
  };

  return (
    <>
      <TablePage
        table={state}
        workMode={mode}
        chosen={target}
        timer={timer}
        onChoose={setChosen}
        onSeatSheet={(seat) => {
          setResult(null);
          setSheet(seat);
        }}
        onNudge={(userId) => {
          table.dismissNotice();
          table.nudge(userId);
        }}
        onInvite={invite}
        onTimer={begin}
        onShowLabel={(shown) => table.setMode({ hidden: !shown })}
        onDismiss={table.dismissNotice}
        onLeave={controls.leave}
        onClose={() => goHome(router)}
      />
      <SeatSheet
        seat={sheet}
        muted={sheet !== null && muted.includes(sheet.userId)}
        result={result}
        onMute={(next) => {
          if (!sheet) return;
          const { userId } = sheet;
          setMuted((all) => (next ? [...all, userId] : all.filter((one) => one !== userId)));
          act(controls.mute(userId, next), true);
        }}
        onReport={(reason, alsoLeave) =>
          sheet && act(controls.report(sheet.userId, reason, alsoLeave), false)
        }
        onBlock={() => sheet && act(controls.block(sheet.userId), true)}
        onLeave={() => {
          setSheet(null);
          controls.leave();
        }}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
