import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import type { Id } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { useToday } from '../../state/day-store-provider';
import type { Keepsakes } from '../../state/keepsakes';
import { PLUS_SHEET } from '../plus/routes';
import { useShare } from '../share/use-share';
import { cardRoute } from '../zoo/binder-routes';
import { lookAt } from '../zoo/last-looked';

import { finishedThings } from './landmarks';
import { WorldPane } from './world-pane';
import { worldScene } from './world-scene';
import { arrivedToday } from './world-words';

/** Scootch sleeps with everyone else from ten at night until six. */
const isNight = (hour: number) => hour >= 22 || hour < 6;

export interface WorldTabProps {
  readonly keepsakes: Keepsakes;
  /** Whether the world is the tab in view. */
  readonly active: boolean;
  /**
   * Whether the world is being looked at: the tab in view, on a page that is on the screen. A
   * piece lands only then, and Scootch stands still until then.
   */
  readonly shown: boolean;
}

/**
 * The world's tab on the real phone. Beside home it is kept ready out of sight: there it stands
 * still until it slides into view, and a piece that landed today is shown landing only once it is
 * looked at.
 */
export function WorldTab({ keepsakes, active, shown }: WorldTabProps) {
  const router = useRouter();
  const { localDate, settings, heavyToday, today } = useToday();
  // A locked frame on the postcard asks about Plus, except on a day with something heavy in it,
  // when nothing is sold and it rests.
  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  const door: { readonly openPlus?: () => void } = heavyToday ? {} : plusDoor;
  const share = useShare(today, door.openPlus);
  const [landing, setLanding] = useState<Id | null>(null);

  // A piece that landed today pops in the first time the world is opened after it, and never
  // again: that it has been seen is kept with the day, so opening the app again does not replay it.
  // It waits for the world to be looked at: a tab out of sight has shown nobody anything.
  const db = useSQLiteContext();
  useEffect(() => {
    if (!shown) return undefined;
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
  }, [keepsakes, localDate, db, shown]);
  // Out of sight, the landing is over: coming back does not play it a second time.
  useEffect(() => {
    if (!shown) setLanding(null);
  }, [shown]);

  const things = finishedThings(keepsakes.pieces);
  return (
    <WorldPane
      active={active}
      model={{
        pieces: keepsakes.pieces,
        monsters: keepsakes.monsters,
        today: localDate,
        attitude: settings.attitude,
        asleep: isNight(new Date().getHours()),
        landing,
        calm: settings.motion === 'calm' || !shown,
        heavy: heavyToday,
      }}
      actions={{
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
