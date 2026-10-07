import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { Id } from '@scootch/domain';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PLUS_SHEET } from '../plus/routes';
import { SharePanel } from '../share/share-panel';
import { MonsterDetail } from '../zoo/monster-detail';
import { useOpenedCard } from '../zoo/use-opened-card';

import { useLighthouse } from './use-lighthouse';
import { WorldScreen } from './world-screen';
import { arrivedToday } from './world-words';

/** Pieces that have already landed in front of the person since the app was opened. */
const landedBefore = new Set<Id>();

/** Scootch sleeps with everyone else from ten at night until six. */
const isNight = (hour: number) => hour >= 22 || hour < 6;

/** The world on the real phone, read from the phone's own tables each time it is opened. */
export function WorldContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const { localDate, settings, heavyToday } = useToday();
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  const opened = useOpenedCard(landed);
  const { keepsakes, plus, shown } = opened;
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
          openPlus: () => router.push(PLUS_SHEET),
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
        calm: settings.motion === 'calm',
        heavy: heavyToday,
      }}
      actions={{
        close: () => router.dismissTo('/'),
        openZoo: () => router.push('/zoo'),
        openRecord: () => router.push('/record'),
        openMonster: opened.open,
      }}
    />
  );
}
