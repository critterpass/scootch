import { usePreventRemove, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import type { Id } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useKeepsakes } from '../../state/keepsakes';
import { useLanguage } from '../../i18n/i18n-provider';
import { useHomePager, usePagerHold, usePageShown } from '../home-pager/home-pager-context';
import { SharePanel } from '../share/share-panel';
import { useShare } from '../share/use-share';
import { cardRoute } from '../zoo/binder-routes';
import { lookAt } from '../zoo/last-looked';

import { useLighthouse } from './use-lighthouse';
import { finishedThings } from './landmarks';
import { WorldScreen } from './world-screen';
import { worldScene } from './world-scene';
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
  const { palette } = useScreenStyle();
  const { localDate, settings, heavyToday, today } = useToday();
  const { language } = useLanguage();
  const share = useShare(language, today);
  // The composer is drawn over the world, not pushed: a swipe back closes it first, and the
  // pages beside home stay where they are under it.
  const { panel } = share;
  usePreventRemove(panel !== null, () => panel?.actions.close());
  usePagerHold(panel !== null);
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  const { keepsakes } = useKeepsakes(`${String(landed)}:${visits.current}`);
  const [landing, setLanding] = useState<Id | null>(null);

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

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (panel) return <SharePanel {...panel} />;
  const things = finishedThings(keepsakes.pieces);
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
        // A postcard of the world as it is now: it names no task, and a crisis day sends nothing.
        ...(things > 0 && today.kind !== 'crisis'
          ? {
              sendPostcard: () => {
                const [year = 0, month = 1] = localDate.split('-').map(Number);
                const scene = worldScene(keepsakes.pieces, keepsakes.monsters);
                share.open({
                  kind: 'world',
                  postcard: { things, month, year, scene: scene.commands, sceneSize: scene.size },
                });
              },
            }
          : {}),
        // A resident's card is the binder's: the same card, out of its pocket, pushed over the world.
        openMonster: (monsterId) => {
          lookAt(monsterId);
          router.push(cardRoute(monsterId));
        },
      }}
    />
  );
}
