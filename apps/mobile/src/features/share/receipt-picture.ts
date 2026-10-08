import { buildReceipt } from '@scootch/art';
import type { CardFinish, IsoDate, Language } from '@scootch/domain';

import type { Repositories } from '../../data/repositories';

import type { ShareDevice } from './share-flow';
import { dayLog } from './share-logs';

export interface ReceiptPictureDeps {
  readonly repositories: Pick<Repositories, 'monsters' | 'tasks'>;
  readonly device: Pick<ShareDevice, 'renderPng'>;
  readonly day: () => { readonly localDate: IsoDate; readonly language: Language };
  readonly timeZone: () => string;
  readonly finish: () => CardFinish;
  readonly plus: () => boolean;
}

/**
 * Draws today's receipt to a file, for the notification that carries it in the evening. It is the
 * receipt the share sheet makes, with each monster's name in place of its task's words, since a
 * notification can be read by whoever is beside the phone. `null` when the day has nothing a
 * receipt may list.
 */
export function createReceiptPicture(deps: ReceiptPictureDeps): () => Promise<string | null> {
  return async () => {
    const { localDate, language } = deps.day();
    const tasks = new Map((await deps.repositories.tasks.all()).map((task) => [task.id, task]));
    const day = dayLog(
      await deps.repositories.monsters.all(),
      tasks,
      localDate,
      deps.timeZone(),
      true,
    );
    if (day === null) return null;
    const image = buildReceipt({
      language,
      ...day,
      stamp: deps.plus() ? deps.finish() : null,
    });
    return deps.device.renderPng(image, 'scootch-evening-receipt');
  };
}
