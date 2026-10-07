import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import type { Id } from '@scootch/domain';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { cardDataFor, zooCards } from '../zoo/zoo-cards';
import { ZooScreen } from '../zoo/zoo-screen';

import { useLighthouse } from './use-lighthouse';
import { WorldScreen } from './world-screen';
import { arrivedToday } from './world-words';

/** Pieces that have already landed in front of the person since the app was opened. */
const landedBefore = new Set<Id>();
const nothing = () => undefined;

/** Scootch sleeps with everyone else from ten at night until six. */
const isNight = (hour: number) => hour >= 22 || hour < 6;

/** The world on the real phone, read from the phone's own tables each time it is opened. */
export function WorldContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const plus = usePlus();
  const { localDate, settings, heavyToday } = useToday();
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  const { keepsakes } = useKeepsakes(landed);
  const [opened, setOpened] = useState<Id | null>(null);
  const [landing, setLanding] = useState<Id | null>(null);

  // A piece that landed today pops in the first time the world is opened after it.
  useEffect(() => {
    if (!keepsakes) return;
    const names = new Map(keepsakes.monsters.map((monster) => [monster.id, monster]));
    const arrival = arrivedToday(keepsakes.pieces, names, localDate);
    if (!arrival || landedBefore.has(arrival.id)) return;
    landedBefore.add(arrival.id);
    setLanding(arrival.id);
  }, [keepsakes, localDate]);

  const card = useMemo(() => {
    if (!keepsakes || opened === null) return null;
    const monster = zooCards(keepsakes.monsters, plus).find((one) => one.id === opened);
    return monster ? cardDataFor(monster, keepsakes.tasks.get(monster.taskId) ?? null) : null;
  }, [keepsakes, opened, plus]);

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  // A resident's card is the zoo's own card view, opened over the world and closed back to it.
  if (card) {
    return (
      <ZooScreen
        model={{ cards: [], language, plus, sort: null, open: { card, shareOffered: false } }}
        actions={{
          close: () => setOpened(null),
          closeCard: () => setOpened(null),
          openCard: nothing,
          nextSort: nothing,
          shareCard: nothing,
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
        calm: settings.motion === 'calm',
        heavy: heavyToday,
      }}
      actions={{
        close: () => router.replace('/'),
        openZoo: () => router.replace('/zoo'),
        openRecord: () => router.replace('/record'),
        openMonster: setOpened,
      }}
    />
  );
}
