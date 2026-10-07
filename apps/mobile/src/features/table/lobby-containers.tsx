import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { TableInviteView } from '../../api/together-api';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { usePlus } from '../../state/keepsakes';
import { useTableState, useTogether } from '../../state/together-context';

import { PLUS_SHEET } from '../plus/routes';

import { InvitePage } from './invite-page';
import { JoinPage, type JoinProblem } from './join-page';
import { LobbyPage } from './lobby-page';
import { startAlone } from './start-alone';
import {
  accountThen,
  FRIENDS,
  inviteCodeFrom,
  joinOutcomeOf,
  labelModeFor,
  lobbyPath,
  seatPath,
  startMinutesFrom,
} from './table-rules';
import { useFriendsTables } from './use-friends-tables';
import { goHome } from '../navigation/go-home';

/** "Sit with someone" on the real phone. */
export function LobbyContainer() {
  const { api, table, purchaseState } = useTogether();
  const { tableId } = useTableState();
  const { today } = useToday();
  const dispatch = useDispatch();
  const plus = usePlus();
  const router = useRouter();
  const params = useLocalSearchParams<{ minutes?: string }>();
  const { tables, refresh } = useFriendsTables();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'open_failed' | 'sit_failed' | 'not_a_link' | null>(null);
  const task = 'task' in today ? today.task : null;
  // The person came from "Start at a table": the length goes with them to the seat.
  const minutes = startMinutesFrom(params.minutes);
  const starting = minutes !== null && task !== null && task.status === 'set';

  const seat = (asked: Promise<string>, failed: 'open_failed' | 'sit_failed') => {
    setBusy(true);
    setNotice(null);
    void asked
      .then((id) => {
        table.sit(id, labelModeFor(task));
        router.replace(seatPath(minutes));
      })
      .catch((error: unknown) => {
        const outcome = joinOutcomeOf(error);
        if (outcome === 'not_signed_in' || outcome === 'name_required') {
          router.push(accountThen(lobbyPath(minutes)));
        } else {
          // A seat that went while the lobby was open is gone from the list when it is read again.
          refresh();
          setNotice(failed);
        }
      })
      .finally(() => setBusy(false));
  };
  const join = (pasted: string) => {
    const code = inviteCodeFrom(pasted);
    if (code === null) return setNotice('not_a_link');
    router.push(`/t/${code}` as Href);
  };

  return (
    <LobbyPage
      plus={plus}
      seated={tableId !== null}
      tables={tables}
      busy={busy}
      notice={notice}
      onSit={(id) => seat(api.joinFriendsTable(id, purchaseState()), 'sit_failed')}
      onOpen={() => seat(api.openTable(purchaseState()), 'open_failed')}
      onLocked={() => router.push(PLUS_SHEET)}
      onJoin={join}
      onBack={() => router.replace(seatPath(minutes))}
      onFriends={() => router.push(FRIENDS)}
      onAlone={
        starting
          ? () =>
              void startAlone(dispatch, minutes)
                .then(() => goHome(router))
                .catch(() => undefined)
          : undefined
      }
      onClose={() => goHome(router)}
    />
  );
}

/**
 * An invite link, opened as a universal link or pasted. It lands on who saved the seat; the seat
 * is asked for only when the person says so, then the table. Coming back from signing in
 * (`sit=1`), the tap was already given and the seat is asked for at once.
 */
export function JoinContainer() {
  const { api, table, purchaseState } = useTogether();
  const { today, ready } = useToday();
  const router = useRouter();
  const { code, sit } = useLocalSearchParams<{ code: string; sit?: string }>();
  const [invite, setInvite] = useState<TableInviteView | 'unknown' | null>(null);
  const [asking, setAsking] = useState(sit === '1');
  const [problem, setProblem] = useState<JoinProblem | null>(null);
  const task = 'task' in today ? today.task : null;
  const mode = labelModeFor(task);
  const valid = inviteCodeFrom(code ?? '');

  const ask = useCallback(() => {
    if (valid === null) return setProblem('link_ended');
    setProblem(null);
    setAsking(true);
    void api
      .joinTable(valid, purchaseState())
      .then((id) => {
        table.sit(id, mode);
        router.replace(seatPath(null));
      })
      .catch((error: unknown) => {
        const outcome = joinOutcomeOf(error);
        if (outcome === 'not_signed_in' || outcome === 'name_required') {
          router.replace(accountThen(`/t/${valid}?sit=1`));
        } else setProblem(outcome === 'plus_required' ? 'unreachable' : outcome);
      });
  }, [api, valid, mode, purchaseState, router, table]);

  useEffect(() => {
    if (!ready) return;
    if (sit === '1') return ask();
    if (valid === null) return setProblem('link_ended');
    let current = true;
    void api
      .tableInvitePage(valid)
      // The landing is drawn without a name when the table cannot be read: the seat can still be
      // asked for, and that answer is the one that counts.
      .catch(() => 'unknown' as const)
      .then((found) => {
        if (!current) return;
        if (found !== 'unknown' && found.state === 'closed') setProblem('link_ended');
        else setInvite(found);
      });
    return () => {
      current = false;
    };
    // Read once for each link; asking for the seat is the person's own tap.
  }, [ready, code]);

  const close = () => goHome(router);
  if (problem !== null || asking || invite === null) {
    return <JoinPage problem={problem} onAgain={ask} onClose={close} />;
  }
  const hostName = invite === 'unknown' ? null : invite.hostName;
  const host =
    invite === 'unknown' ? undefined : invite.seats.find((seat) => seat.name === hostName);
  return (
    <InvitePage
      hostName={hostName}
      hostLabel={host === undefined || host.label === '' ? null : host.label}
      taskText={task !== null && mode !== null ? task.text : null}
      busy={false}
      onSit={ask}
      onNotNow={close}
      onClose={close}
    />
  );
}
