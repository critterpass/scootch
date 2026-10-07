import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useSession, useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useTogether } from '../../state/together-context';
import { useScreenStyle } from '../../ui/use-screen-style';
import { nativePcmPlayer } from '../record/native-pcm-player';
import { barSound, trackKey } from '../record/record-audio';
import { keychainKeptShares } from '../share/native-kept-shares';
import { tellPageOfCatch } from '../share/share-flow';
import { SharePanel } from '../share/share-panel';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';
import { cardDataFor, isCaught } from '../zoo/zoo-cards';

import type { RevealActions, RevealModel } from './reveal-model';
import { RevealScreen } from './reveal-screen';
import { markRevealSeen } from './reveal-seen';
import {
  barOfFinish,
  currentStep,
  dropOfFinish,
  earnedBy,
  pieceOfFinish,
  revealOver,
  revealReducer,
  startReveal,
  type FinishRows,
  type RevealEvent,
  type RevealState,
} from './reveal-steps';

/** If what the finish wrote cannot be read back in this long, the reveal steps aside. */
const GIVE_UP_MS = 4000;

/**
 * The reveal on the real phone. It reads back what the finish wrote, walks its steps, and then
 * returns to the session screens, which hand over the treat and the parked thoughts. A serious
 * finish never arrives here; if one did, it would have no steps and go straight back.
 */
export function RevealContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { session, line } = useSession();
  const { today, localDate, settings, ready } = useToday();
  const { reducedMotion, captured } = useScreenStyle();
  // Today is read back from storage after every store event, so a change in it is a reason to look again.
  const { keepsakes, chooseDrop } = useKeepsakes(today);
  const share = useShare(language, today);
  const { pages } = useTogether();
  const player = useMemo(() => nativePcmPlayer(), []);
  const [state, setState] = useState<RevealState | null>(null);
  const [playing, setPlaying] = useState(false);

  const finished = session !== null && session.phase === 'finished' ? session : null;
  const taskId = finished?.taskId ?? null;
  const task = (taskId && keepsakes?.tasks.get(taskId)) || null;
  const monster = keepsakes?.monsters.find((one) => one.taskId === taskId) ?? null;
  const rows = useMemo<FinishRows | null>(
    () =>
      keepsakes && finished && task
        ? {
            task,
            tone: finished.tone,
            localDate,
            monster,
            pieces: keepsakes.pieces,
            bars: keepsakes.bars,
            drops: keepsakes.drops,
          }
        : null,
    [keepsakes, finished, task, localDate, monster],
  );
  const piece = rows ? pieceOfFinish(rows) : null;

  // The reveal begins once the finish's rows can be read: the piece is the last thing every
  // ordinary finish writes.
  useEffect(() => {
    if (state === null && rows && (piece !== null || rows.tone === 'quiet')) {
      setState(startReveal(earnedBy(rows)));
    }
  }, [state, rows, piece]);

  const leave = useMemo(
    () => () => {
      if (taskId) markRevealSeen(taskId);
      player.stop();
      // The session takes the reveal's place for what follows it; with none, the one screen
      // underneath is uncovered.
      if (taskId) router.replace('/session');
      else router.dismissTo('/');
    },
    [taskId, player, router],
  );
  const over = (ready && finished === null) || (state !== null && revealOver(state));
  useEffect(() => {
    if (over) leave();
  }, [over, leave]);
  useEffect(() => {
    if (state !== null) return undefined;
    const timer = setTimeout(leave, GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [state, leave]);

  const step = state ? currentStep(state) : null;
  const bar = rows ? barOfFinish(rows) : null;
  const musicOn = settings.music;

  // The day's bar plays by itself when its step comes up.
  useEffect(() => {
    if (step !== 'bar' || !bar) return undefined;
    if (musicOn) player.play(`bar-${trackKey(bar.week, [bar])}`, () => barSound(bar));
    setPlaying(musicOn);
    return () => {
      player.stop();
      setPlaying(false);
    };
  }, [step, bar, musicOn, player]);

  // A caught monster that has its own page on the website: the page is told, so it reads caught.
  const caughtSeed = monster && isCaught(monster) ? monster.spec.seed : null;
  const caughtMinutes = monster?.catchMinutes ?? null;
  useEffect(() => {
    if (caughtSeed === null || caughtMinutes === null) return;
    void tellPageOfCatch(
      { api: pages, kept: keychainKeptShares },
      { seed: caughtSeed, catchMinutes: caughtMinutes },
    ).catch(() => undefined);
  }, [caughtSeed, caughtMinutes, pages]);

  if (share.panel) return <SharePanel {...share.panel} />;
  if (!state || !step || !rows) return <View style={{ flex: 1 }} />;

  const send = (event: RevealEvent) => setState((before) => before && revealReducer(before, event));
  const card = monster && isCaught(monster) ? cardDataFor(monster, task) : null;
  const weekBars = keepsakes?.bars.filter((one) => one.week === bar?.week) ?? [];
  const model: RevealModel = {
    step,
    language,
    attitude: settings.attitude,
    reducedMotion,
    tilting: !captured && !reducedMotion,
    card,
    monster,
    line: line?.slot === 'caught' ? line.text : null,
    piece,
    world: { pieces: keepsakes?.pieces ?? [], monsters: keepsakes?.monsters ?? [] },
    bar: bar
      ? {
          position: bar.position,
          instruments: weekBars
            .sort((a, b) => a.position - b.position)
            .map((one) => one.instrument),
          playing,
        }
      : null,
    shareOffered: card !== null && shareOfferedOn(today, task),
  };
  const actions: RevealActions = {
    next: () => send({ type: 'next' }),
    skip: () => send({ type: 'skip' }),
    backToToday: () => send({ type: 'back_to_today' }),
    showSomeone: () => {
      if (card) share.open({ task, card, signed: monster?.signed ?? null, format: 'story' });
    },
    playBar: () => {
      if (!bar || !musicOn) return;
      player.play(`bar-${trackKey(bar.week, [bar])}`, () => barSound(bar));
      setPlaying(true);
    },
    chooseDrop: (choice) => {
      const drop = dropOfFinish(rows);
      if (drop) void chooseDrop(drop, choice).catch(() => undefined);
      send({ type: 'next' });
    },
  };
  return <RevealScreen model={model} actions={actions} />;
}
