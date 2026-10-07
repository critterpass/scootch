import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import type { Id } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useHomePager, usePagerHold, usePageShown } from '../home-pager/home-pager-context';
import { PLUS_SHEET } from '../plus/routes';
import { SharePanel } from '../share/share-panel';
import { MonsterDetail } from '../zoo/monster-detail';
import { useOpenedCard } from '../zoo/use-opened-card';

import { useLighthouse } from './use-lighthouse';
import { WorldScreen } from './world-screen';
import { arrivedToday } from './world-words';

/** Scootch sleeps with everyone else from ten at night until six. */
const isNight = (hour: number) => hour >= 22 || hour < 6;

/**
 * The world on the real phone, read from the phone's own tables each time it is opened. Beside
 * home it is a page kept ready out of sight: there it is read again each time it slides into view,
 * stands still until then, and closes by sliding home.
 */
export function WorldContainer() {
  const router = useRouter();
  const pager = useHomePager();
  const inView = usePageShown();
  const visits = useRef(0);
  const wasInView = useRef(inView);
  if (inView && !wasInView.current) visits.current += 1;
  wasInView.current = inView;
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const { localDate, settings, heavyToday } = useToday();
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  const opened = useOpenedCard(`${String(landed)}:${visits.current}`);
  const { keepsakes, plus, shown } = opened;
  const [landing, setLanding] = useState<Id | null>(null);
  // A card being handled, or the share panel over it, keeps the pages from sliding under it.
  usePagerHold(shown !== null || opened.sharePanel !== null);

  // A piece that landed today pops in the first time the world is opened after it, and never
  // again: that it has been seen is kept with the day, so opening the app again does not replay it.
  // It waits for the world to be looked at: a page out of sight has shown nobody anything.
  const db = useSQLiteContext();
  useEffect(() => {
    if (!keepsakes || !inView) return undefined;
    const names = new Map(keepsakes.monsters.map((monster) => [monster.id, monster]));
    const arrival = arrivedToday(keepsakes.pieces, names, localDate);
    if (!arrival) return undefined;
    let current = true;
    const { dayNotes } = openRepositories(db);
    void dayNotes
      .read(localDate)
      .then(async (notes) => {
        if (notes.worldLanded.includes(arrival.id)) return;
        await dayNotes.write({ ...notes, worldLanded: [...notes.worldLanded, arrival.id] });
        if (current) setLanding(arrival.id);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [keepsakes, localDate, db, inView]);
  // Slid out of sight, the landing is over: coming back does not play it a second time.
  useEffect(() => {
    if (!inView) setLanding(null);
  }, [inView]);

  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (opened.sharePanel) return <SharePanel {...opened.sharePanel} />;
  // A resident's card is the same screen the zoo opens: the card to handle, its finishes and its
  // sharing. It is opened over the world and closed back to it.
  if (shown) {
    return (
      <MonsterDetail
        model={{ card: shown.card, language, plus, shareOffered: shown.shareOffered }}
        actions={{
          close: opened.close,
          share: shown.share,
          // Nothing sells near something heavy: on such a day a locked finish does nothing.
          ...(heavyToday ? {} : plusDoor),
          setFinish: shown.setFinish,
        }}
      />
    );
  }
  return (
    <WorldScreen
      model={{
        pieces: keepsakes.pieces,
        monsters: keepsakes.monsters,
        today: localDate,
        attitude: settings.attitude,
        asleep: isNight(new Date().getHours()),
        landing,
        calm: settings.motion === 'calm' || !inView,
        heavy: heavyToday,
      }}
      actions={{
        close: () => (pager ? pager.show('home') : router.dismissTo('/')),
        openZoo: () => router.push('/zoo'),
        openRecord: () => router.push('/record'),
        openMonster: opened.open,
      }}
    />
  );
}
