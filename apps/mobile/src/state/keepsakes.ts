import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  Id,
  MonsterRow,
  RecordBarRow,
  TaskRow,
  WeekRecordRow,
  WorldPieceRow,
} from '@scootch/domain';

import { openRepositories, type Repositories } from '../data/repositories';
import type { SurpriseDropRow } from '../data/repositories/surprise-drops';

import { usePlusState } from './plus-context';

/** Everything the person has caught and kept, read from the phone's own tables. */
export interface Keepsakes {
  /** Every monster, caught or not, so a piece or a bar can find its own. */
  readonly monsters: readonly MonsterRow[];
  readonly tasks: ReadonlyMap<Id, TaskRow>;
  readonly pieces: readonly WorldPieceRow[];
  readonly bars: readonly RecordBarRow[];
  readonly weekRecords: readonly WeekRecordRow[];
  readonly drops: readonly SurpriseDropRow[];
}

export async function loadKeepsakes(repositories: Repositories): Promise<Keepsakes> {
  const [monsters, tasks, pieces, bars, weekRecords, drops] = await Promise.all([
    repositories.monsters.all(),
    repositories.tasks.all(),
    repositories.worldPieces.all(),
    repositories.recordBars.all(),
    repositories.weekRecords.all(),
    repositories.surpriseDrops.all(),
  ]);
  return {
    monsters,
    tasks: new Map(tasks.map((task) => [task.id, task])),
    pieces,
    bars,
    weekRecords,
    drops,
  };
}

export interface KeepsakesHandle {
  /** `null` until the first read has come back. */
  readonly keepsakes: Keepsakes | null;
  /** Records what the person tapped on a surprise drop. Wearing it is not built here. */
  readonly chooseDrop: (drop: SurpriseDropRow, choice: 'wear' | 'later') => Promise<void>;
}

/**
 * The keepsakes as the world, the zoo, the record and the reveal read them. They are read when the
 * screen opens, and again whenever `version` changes.
 */
export function useKeepsakes(version: unknown = null): KeepsakesHandle {
  const db = useSQLiteContext();
  const repositories = useMemo(() => openRepositories(db), [db]);
  const [stored, setKeepsakes] = useState<Keepsakes | null>(null);
  // A finish is worn, not kept per card: every card shows in the one the person wears now.
  const { finish } = usePlusState().look;
  const keepsakes = useMemo(
    () =>
      stored && {
        ...stored,
        monsters: stored.monsters.map((monster) => ({ ...monster, finish })),
      },
    [stored, finish],
  );

  useEffect(() => {
    let current = true;
    void loadKeepsakes(repositories)
      .then((loaded) => {
        if (current) setKeepsakes(loaded);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [repositories, version]);

  const chooseDrop = useCallback(
    (drop: SurpriseDropRow, choice: 'wear' | 'later') =>
      repositories.surpriseDrops.put({ ...drop, choice }),
    [repositories],
  );
  return { keepsakes, chooseDrop };
}

/** Whether Plus is active: what the store last said, through the domain's entitlement rules. */
export function usePlus(): boolean {
  return usePlusState().unlocked.plus;
}
