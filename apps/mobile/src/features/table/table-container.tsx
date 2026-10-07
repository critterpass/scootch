import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';

import { MINUTE_MS, type TableSeat } from '@scootch/domain';

import { siteBaseUrl } from '../../api/api-config';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDispatch, useSession, useToday } from '../../state/day-store-provider';
import { useTableState, useTogether } from '../../state/together-context';
import { sharedPageLink } from '../share/share-links';

import { seatControls } from './seat-controls';
import { SeatSheet } from './seat-sheet';
import { tableEndsAt } from './table-clock';
import { TableMenuSheet } from './table-menu-sheet';
import { TablePage, tableSummary } from './table-page';
import {
  TABLE_LOBBY,
  labelModeFor,
  startMinutesFrom,
  tableLengthFor,
  tableTimer,
} from './table-rules';
import { goHome } from '../navigation/go-home';

/**
 * The table on the real phone. The session it starts is the day store's own: this screen sets and
 * starts it exactly as the one screen does, then hands over to the session route.
 */
export function TableContainer() {
  const { api, table } = useTogether();
  const state = useTableState();
  const { today } = useToday();
  const { session } = useSession();
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ minutes?: string }>();
  const t = useT();
  const { language } = useLanguage();
  const [chosen, setChosen] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
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
  // The length chosen before sitting down ("Start at a table"), when the person came that way.
  const wanted = startMinutesFrom(params.minutes);
  const timer = tableTimer(
    state,
    { taskSet: task !== null && task.status === 'set', inSession: running, wanted },
    Date.now(),
  );
  // Their thing is finished and they are still seated: the table says so, and how long they sat.
  const mine = state.seats.find((seat) => seat.userId === state.you);
  const done =
    session !== null && session.phase === 'finished' && !running
      ? {
          minutes:
            mine?.seatedAt === undefined
              ? null
              : // The table's own clock says when they sat down, so it is read on that clock.
                Math.max(
                  1,
                  Math.round((Date.now() + state.clockAhead - mine.seatedAt) / MINUTE_MS),
                ),
        }
      : null;

  const begin = () => {
    if (timer.kind !== 'start' && timer.kind !== 'join_in') return;
    // The table is told when the line is up; the person's own session starts either way. Its
    // shared timer runs for the shortest of its lengths that covers theirs.
    const shared = timer.kind === 'start' ? tableLengthFor(timer.minutes) : null;
    if (shared !== null) table.start(shared);
    // Joining in, the session ends when the table's does; the strip keeps it there afterwards.
    const end = timer.kind === 'join_in' ? tableEndsAt(table.getState(), Date.now()) : null;
    void dispatch({ type: 'session_set', minutes: timer.minutes, treat: null })
      .then(() => dispatch({ type: 'session', event: { type: 'started' } }))
      .then(() => (end === null ? undefined : dispatch({ type: 'table_clock', endsAt: end })))
      .then(() => router.replace('/session'))
      .catch(() => undefined);
  };
  // "Start at a table" was the tap: once the table has been read, sitting down is the start.
  const started = useRef(false);
  const seatedHere = state.you !== null;
  useEffect(() => {
    if (wanted === null || started.current || !seatedHere) return;
    started.current = true;
    begin();
    // Once for an arrival: `begin` reads the table as it is at that moment.
  }, [wanted, seatedHere]);

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
        done={done}
        onMenu={() => setMenu(true)}
        onNext={() => goHome(router)}
        onDismiss={table.dismissNotice}
        onLeave={controls.leave}
        onClose={() => goHome(router)}
      />
      <TableMenuSheet
        open={menu}
        summary={tableSummary(state, t)}
        hidden={state.hidden}
        nudgesMuted={state.nudgesMuted}
        onInvite={
          state.seats.length < state.capacity
            ? () => {
                setMenu(false);
                invite();
              }
            : undefined
        }
        onHidden={(hidden) => table.setMode({ hidden })}
        onMuteNudges={table.muteNudges}
        onLeave={() => {
          setMenu(false);
          controls.leave();
        }}
        onClose={() => setMenu(false)}
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
