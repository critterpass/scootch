import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { AccountView } from '../../api/together-api';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { useTogether } from '../../state/together-context';
import { useScreenStyle } from '../../ui/use-screen-style';
import { startAlone } from '../table/start-alone';
import { useTablePrefs } from '../table/table-prefs';
import { TABLE_LOBBY } from '../table/table-rules';

import {
  accountStep,
  chooseName,
  returnPath,
  signIn,
  startCarriedBy,
  type NameProblem,
} from './account-flow';
import { NamePage, SignInCancelledPage, SignInPage, type WayOn } from './account-page';
import { nativeApple } from './apple-port';
import { goHome } from '../navigation/go-home';

/**
 * Signing in and choosing a name, on the real phone. Reached only from a table that asked for an
 * account; when both are done the person goes on to where they were heading (`next`). Saying no
 * is never a dead end: a start that was waiting begins alone.
 */
export function AccountContainer() {
  const { api } = useTogether();
  const { today } = useToday();
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; rename?: string; suggested?: string }>();
  const { next, rename } = params;
  // Opened to change the name: the name step is shown once more, for someone who has one.
  const [renamed, setRenamed] = useState(false);
  const { palette } = useScreenStyle();
  const [prefs, changePref] = useTablePrefs();
  const [account, setAccount] = useState<AccountView | null | undefined>(undefined);
  // Signed in elsewhere just before, the first name Apple handed over comes along.
  const [suggested, setSuggested] = useState(params.suggested ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [problem, setProblem] = useState<NameProblem | null>(null);

  useEffect(() => {
    let current = true;
    void api
      .me()
      .catch(() => null)
      .then((found) => {
        if (current) setAccount(found);
      });
    return () => {
      current = false;
    };
  }, [api]);

  const renaming = rename === '1' && !renamed && account != null;
  const step = account === undefined ? null : renaming ? 'name' : accountStep(account);
  useEffect(() => {
    // Only the places that ask for an account are gone back to; anything else is the lobby.
    if (step === 'ready') router.replace((returnPath(next) as Href | null) ?? TABLE_LOBBY);
  }, [step, next, router]);

  const close = () => goHome(router);
  const task = 'task' in today ? today.task : null;
  const minutes = startCarriedBy(next);
  const wayOn: WayOn =
    minutes !== null && task !== null && task.status === 'set'
      ? {
          startsAlone: true,
          onPress: () =>
            void startAlone(dispatch, minutes)
              .then(close)
              .catch(() => undefined),
        }
      : { startsAlone: false, onPress: close };

  if (step === 'sign_in') {
    const onSignIn = () => {
      setBusy(true);
      setFailed(false);
      setCancelled(false);
      void signIn(api, nativeApple)
        .then((signedIn) => {
          if (signedIn === null) return setCancelled(true);
          setSuggested(signedIn.suggestedName);
          setAccount(signedIn.account);
        })
        .catch(() => setFailed(true))
        .finally(() => setBusy(false));
    };
    if (cancelled) {
      return (
        <SignInCancelledPage
          taskText={wayOn.startsAlone ? (task?.text ?? null) : null}
          onAgain={onSignIn}
          wayOn={wayOn}
          onClose={close}
        />
      );
    }
    return (
      <SignInPage busy={busy} failed={failed} onSignIn={onSignIn} wayOn={wayOn} onClose={close} />
    );
  }
  if (step === 'name') {
    const onSave = (name: string) => {
      setBusy(true);
      void chooseName(api, name)
        .then((kept) => {
          if (!kept.ok) return setProblem(kept.problem);
          setRenamed(true);
          setAccount(kept.account);
        })
        .finally(() => setBusy(false));
    };
    return (
      <NamePage
        busy={busy}
        problem={problem}
        suggested={renaming ? (account.displayName ?? '') : suggested}
        renaming={renaming}
        showLabel={prefs.showLabel}
        onShowLabel={(shown) => changePref('showLabel', shown)}
        onSave={onSave}
        onClose={close}
      />
    );
  }
  return <View style={{ flex: 1, backgroundColor: palette.page }} />;
}
