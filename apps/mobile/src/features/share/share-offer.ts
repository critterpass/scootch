import type { Moment } from '@phusclass/domain/board';

import { readCarvings } from '../../data/carvings-repository';
import type { DataDatabase } from '../../data/data-database';
import { readKv } from '../../data/kv-repository';
import { readSetting } from '../../data/settings-repository';
import { readTasks } from '../../data/tasks-repository';
import { KEYS } from '../../state/board-core';

import {
  formatsFor,
  isCrisisDay,
  shareGuard,
  subjectOf,
  type ShareBlock,
  type ShareFormat,
  type ShareSubject,
} from './share-rules';

/** Where roll call keeps the full name the cards are written out to. */
export const STUDENT_NAME_SETTING = 'student.fullName';

export type ShareOffer =
  | { readonly kind: 'blocked'; readonly why: ShareBlock }
  | {
      readonly kind: 'ready';
      readonly subject: ShareSubject;
      readonly formats: readonly ShareFormat[];
    };

/**
 * What the share sheet may offer for one logbook entry, read from the phone's database at `now`:
 * nothing on a crisis day or for a heavy task, otherwise the subject and its formats.
 */
export async function loadShareOffer(
  db: DataDatabase,
  taskId: string,
  now: Moment,
): Promise<ShareOffer> {
  const [tasks, carvings, crisisShownOn, name] = await Promise.all([
    readTasks(db, now.at),
    readCarvings(db),
    readKv(db, KEYS.crisisShown),
    readSetting<string>(db, STUDENT_NAME_SETTING),
  ]);
  const task = tasks.find((one) => one.id === taskId) ?? null;
  const guard = shareGuard({
    task,
    crisisDay: isCrisisDay({ tasks, crisisShownOn: crisisShownOn || null, now }),
  });
  if (!guard.allowed) return { kind: 'blocked', why: guard.why };
  const subject =
    task === null ? null : subjectOf(task, carvings, typeof name === 'string' ? name : null);
  if (subject === null) return { kind: 'blocked', why: 'not finished' };
  return { kind: 'ready', subject, formats: formatsFor(subject) };
}
