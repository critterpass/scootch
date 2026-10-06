import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { refusalOf, type Friend, type HauntDare, type WaitingHaunt } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { useTogether } from '../../state/together-context';
import { useScreenStyle } from '../../ui/use-screen-style';

import { HauntReceivedPage, HauntSendPage } from './haunt-pages';
import {
  HAUNT_RECEIVED,
  catchHaunt,
  hauntToSend,
  offersHaunt,
  sendProblemOf,
  shooHaunt,
  showsHauntCard,
  type SendProblem,
} from './haunt-rules';

/** "Haunt a friend" on the real phone, for today's monster. */
export function HauntSendContainer() {
  const { api } = useTogether();
  const day = useToday();
  const router = useRouter();
  const [friends, setFriends] = useState<readonly Friend[]>([]);
  const [to, setTo] = useState<string | null>(null);
  const [dare, setDare] = useState<HauntDare>('two_minutes');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<SendProblem | null>(null);
  const task = 'task' in day.today ? day.today.task : null;
  const allowed = offersHaunt(day, task, day.monster);

  useEffect(() => {
    let current = true;
    void api
      .friends()
      .catch(() => [])
      .then((all) => {
        if (current) setFriends(all.filter((friend) => friend.canBeHaunted));
      });
    return () => {
      current = false;
    };
  }, [api]);
  useEffect(() => {
    // Opened by hand for a task that haunts nobody: there is nothing to show.
    if (day.ready && !allowed && !sent) router.replace('/');
  }, [day.ready, allowed, sent, router]);

  const send = () => {
    if (to === null || day.monster === null || !allowed) return;
    setBusy(true);
    setProblem(null);
    void api
      .sendHaunt(hauntToSend(day.monster, to, dare, anonymous))
      .then(() => setSent(true))
      .catch((error: unknown) => setProblem(sendProblemOf(refusalOf(error))))
      .finally(() => setBusy(false));
  };

  return (
    <HauntSendPage
      friends={friends}
      to={to}
      dare={dare}
      anonymous={anonymous}
      busy={busy}
      sent={sent}
      problem={problem}
      onTo={setTo}
      onDare={setDare}
      onAnonymous={setAnonymous}
      onSend={send}
      onClose={() => router.replace('/')}
    />
  );
}

/**
 * Asks once, when the app opens, whether a haunt is waiting, and shows its card when the day
 * allows one. A phone that never signed in has none, and is told nothing.
 */
export function HauntArrival() {
  const { api } = useTogether();
  const day = useToday();
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    let current = true;
    void api
      .waitingHaunts()
      .then((haunts) => {
        if (current) setWaiting(haunts.length > 0);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [api]);
  const show = waiting && day.ready && showsHauntCard(day);
  useEffect(() => {
    if (!show) return;
    setWaiting(false);
    router.push(HAUNT_RECEIVED);
  }, [show, router]);
  return null;
}

/** The waiting haunt's card on the real phone. */
export function HauntReceivedContainer() {
  const { api } = useTogether();
  const day = useToday();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useT();
  const { palette } = useScreenStyle();
  const [haunt, setHaunt] = useState<WaitingHaunt | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const home = () => router.replace('/');

  useEffect(() => {
    let current = true;
    void api
      .waitingHaunts()
      .catch(() => [])
      .then((haunts) => {
        if (current) setHaunt(haunts[0] ?? null);
      });
    return () => {
      current = false;
    };
  }, [api]);
  const hidden = haunt === null || (day.ready && !showsHauntCard(day) && !busy);
  useEffect(() => {
    if (hidden) router.replace('/');
  }, [hidden, router]);

  if (!haunt || hidden) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  const act = (work: Promise<void>) => {
    setBusy(true);
    void work.catch(() => undefined).then(home);
  };
  return (
    <HauntReceivedPage
      bodyType={haunt.bodyType}
      seed={haunt.seed}
      dare={haunt.dare}
      from={haunt.from === null ? null : (haunt.from.displayName ?? t('friends.noName'))}
      busy={busy}
      onCatch={() => act(catchHaunt(api, dispatch, haunt, t(`haunt.dare.${haunt.dare}`)))}
      onShoo={() => act(shooHaunt(api, haunt))}
    />
  );
}
