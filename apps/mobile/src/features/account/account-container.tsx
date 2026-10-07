import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { AccountView } from '../../api/together-api';
import { useTogether } from '../../state/together-context';
import { useScreenStyle } from '../../ui/use-screen-style';
import { TABLE_LOBBY } from '../table/table-rules';

import { accountStep, chooseName, signIn, type NameProblem } from './account-flow';
import { NamePage, SignInPage } from './account-page';
import { nativeApple } from './apple-port';
import { goHome } from '../navigation/go-home';

const RETURNS = /^\/(?:table|friends|[tf]\/[a-z2-7]{10})$/;

/**
 * Signing in and choosing a name, on the real phone. Reached only from a table that asked for an
 * account; when both are done the person goes on to where they were heading (`next`).
 */
export function AccountContainer() {
  const { api } = useTogether();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { palette } = useScreenStyle();
  const [account, setAccount] = useState<AccountView | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
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

  const step = account === undefined ? null : accountStep(account);
  useEffect(() => {
    // Only the places that ask for an account are gone back to; anything else is the lobby.
    if (step === 'ready')
      router.replace(next !== undefined && RETURNS.test(next) ? next : TABLE_LOBBY);
  }, [step, next, router]);

  const close = () => goHome(router);
  if (step === 'sign_in') {
    const onSignIn = () => {
      setBusy(true);
      setFailed(false);
      void signIn(api, nativeApple)
        .then((signedIn) => {
          if (signedIn !== null) setAccount(signedIn);
        })
        .catch(() => setFailed(true))
        .finally(() => setBusy(false));
    };
    return <SignInPage busy={busy} failed={failed} onSignIn={onSignIn} onClose={close} />;
  }
  if (step === 'name') {
    const onSave = (name: string) => {
      setBusy(true);
      void chooseName(api, name)
        .then((kept) => {
          if (kept.ok) setAccount(kept.account);
          else setProblem(kept.problem);
        })
        .finally(() => setBusy(false));
    };
    return <NamePage busy={busy} problem={problem} onSave={onSave} onClose={close} />;
  }
  return <View style={{ flex: 1, backgroundColor: palette.page }} />;
}
