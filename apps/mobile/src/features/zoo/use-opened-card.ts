import { usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import type { CardData, CardFinish, Id, TaskRow } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { finishOpen } from '../plus/finish-picker';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { cardDataFor, zooCards, type CaughtMonster } from './zoo-cards';

export interface OpenedCard {
  /** What the phone holds: read again after a finish is chosen. */
  readonly keepsakes: ReturnType<typeof useKeepsakes>['keepsakes'];
  readonly plus: boolean;
  /** The share panel, while it is open over the card. */
  readonly sharePanel: ReturnType<typeof useShare>['panel'];
  readonly open: (monsterId: Id) => void;
  readonly close: () => void;
  /**
   * Opens the share panel for a card picked from the grid, and says whether it did: a card whose
   * task may not be shared is not, and the caller opens it instead.
   */
  readonly shareOf: (monster: CaughtMonster) => boolean;
  /** The opened monster's card, when there is one. */
  readonly shown: {
    readonly monster: CaughtMonster;
    readonly card: CardData;
    readonly shareOffered: boolean;
    readonly share: () => void;
    readonly setFinish: (finish: CardFinish) => void;
  } | null;
}

/**
 * One monster's card, opened from anywhere: the zoo and the world both open it through here, so
 * the card, its finishes and its sharing are the same in both. `reread` is anything whose change
 * means the phone's tables should be read again.
 */
export function useOpenedCard(reread?: unknown): OpenedCard {
  const { language } = useLanguage();
  const db = useSQLiteContext();
  const [finishes, setFinishes] = useState(0);
  const { keepsakes } = useKeepsakes(`${String(reread)}:${finishes}`);
  const plus = usePlus();
  const { today } = useToday();
  const share = useShare(language, today);
  const [opened, setOpened] = useState<Id | null>(null);

  const monster =
    keepsakes && opened !== null
      ? (zooCards(keepsakes.monsters, plus).find((one) => one.id === opened) ?? null)
      : null;
  const task: TaskRow | null = monster ? (keepsakes?.tasks.get(monster.taskId) ?? null) : null;
  const card = monster ? cardDataFor(monster, task) : null;
  // The card is drawn over its screen, not pushed onto the stack: a swipe back, or anything else
  // that would leave the screen, closes what is open on top first (the share panel, then the card).
  const panel = share.panel;
  usePreventRemove(opened !== null || panel !== null, () => {
    if (panel) panel.actions.close();
    else setOpened(null);
  });
  return {
    keepsakes,
    plus,
    sharePanel: share.panel,
    open: setOpened,
    close: () => setOpened(null),
    shareOf: (picked) => {
      const pickedTask = keepsakes?.tasks.get(picked.taskId) ?? null;
      if (!shareOfferedOn(today, pickedTask)) return false;
      share.open({
        task: pickedTask,
        card: cardDataFor(picked, pickedTask),
        signed: picked.signed ?? null,
        kind: 'card',
      });
      return true;
    },
    shown:
      monster && card
        ? {
            monster,
            card,
            shareOffered: shareOfferedOn(today, task),
            share: () => share.open({ task, card, signed: monster.signed ?? null, kind: 'card' }),
            setFinish: (finish) => {
              // The entitlement decides again here, whatever the picker drew.
              if (!finishOpen(finish, plus, monster.finish)) return;
              void openRepositories(db)
                .monsters.put({ ...monster, finish })
                .then(() => setFinishes((count) => count + 1))
                .catch(() => undefined);
            },
          }
        : null,
  };
}
