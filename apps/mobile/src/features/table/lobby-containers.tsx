import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useToday } from '../../state/day-store-provider';
import { usePlus } from '../../state/keepsakes';
import { useTableState, useTogether } from '../../state/together-context';

import { PLUS_SHEET } from '../plus/routes';

import { JoinPage, LobbyPage, type JoinProblem } from './lobby-page';
import {
  accountThen,
  FRIENDS,
  TABLE_SEAT,
  inviteCodeFrom,
  joinOutcomeOf,
  labelModeFor,
} from './table-rules';
import { goHome } from '../navigation/go-home';

/** "Sit with someone" on the real phone. */
export function LobbyContainer() {
  const { api, table, purchaseState } = useTogether();
  const { tableId } = useTableState();
  const { today } = useToday();
  const plus = usePlus();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'open_failed' | 'not_a_link' | null>(null);
  const task = 'task' in today ? today.task : null;

  const open = () => {
    setBusy(true);
    setNotice(null);
    void api
      .openTable(purchaseState())
      .then((id) => {
        table.sit(id, labelModeFor(task));
        router.replace(TABLE_SEAT);
      })
      .catch((error: unknown) => {
        const outcome = joinOutcomeOf(error);
        if (outcome === 'not_signed_in' || outcome === 'name_required') {
          router.push(accountThen('/table'));
        } else setNotice('open_failed');
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
      busy={busy}
      notice={notice}
      onOpen={open}
      onLocked={() => router.push(PLUS_SHEET)}
      onJoin={join}
      onBack={() => router.replace(TABLE_SEAT)}
      onFriends={() => router.push(FRIENDS)}
      onClose={() => goHome(router)}
    />
  );
}

/** An invite link, opened as a universal link or pasted: the seat is asked for, then the table. */
export function JoinContainer() {
  const { api, table, purchaseState } = useTogether();
  const { today, ready } = useToday();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [problem, setProblem] = useState<JoinProblem | null>(null);
  const task = 'task' in today ? today.task : null;
  const mode = labelModeFor(task);

  const ask = useCallback(() => {
    const valid = inviteCodeFrom(code ?? '');
    if (valid === null) return setProblem('link_ended');
    setProblem(null);
    void api
      .joinTable(valid, purchaseState())
      .then((id) => {
        table.sit(id, mode);
        router.replace(TABLE_SEAT);
      })
      .catch((error: unknown) => {
        const outcome = joinOutcomeOf(error);
        if (outcome === 'not_signed_in' || outcome === 'name_required') {
          router.replace(accountThen(`/t/${valid}`));
        } else setProblem(outcome === 'plus_required' ? 'unreachable' : outcome);
      });
  }, [api, code, mode, purchaseState, router, table]);

  useEffect(() => {
    if (ready) ask();
    // Asked once for each link; a retry is the person's own tap.
  }, [ready, code]);

  return <JoinPage problem={problem} onAgain={ask} onClose={() => goHome(router)} />;
}
