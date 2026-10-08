import { useEffect } from 'react';

import * as LiveActivity from '../../../modules/scootch-live-activity';
import { useSession } from '../../state/day-store-provider';
import { useTogether } from '../../state/together-context';

import { tableOnSurfaces, WAVE_SHOWS_MS, type LastWave } from './table-on-surfaces';

/**
 * Keeps the session's Live Activity showing the table while the session is at one: every change
 * to the seats, and every wave, is written into it, and leaving the table takes it out again.
 * This runs only while the app does; a push from the table is what moves it otherwise.
 */
export function TableSurfaceHost() {
  const { table } = useTogether();
  const phase = useSession().session?.phase ?? null;

  useEffect(() => {
    let wave: LastWave | null = null;
    let written: string | null = null;
    let fade: ReturnType<typeof setTimeout> | null = null;
    let queue: Promise<void> = Promise.resolve();

    const write = () => {
      const state = table.getState();
      const shown = tableOnSurfaces(state, wave, Date.now());
      const json = JSON.stringify(shown);
      if (json === written) return;
      written = json;
      queue = queue
        .then(async () => {
          for (const activity of await LiveActivity.listActive()) {
            if (activity.status !== 'active' && activity.status !== 'stale') continue;
            await LiveActivity.update(activity.id, { ...activity.state, table: shown });
          }
        })
        .catch(() => undefined);
    };
    const changed = () => {
      const { notice } = table.getState();
      if (notice?.kind === 'nudged' && notice.from !== wave?.from) {
        wave = { from: notice.from, at: Date.now() };
        if (fade) clearTimeout(fade);
        // The ripple leaves its seat by itself.
        fade = setTimeout(() => {
          wave = null;
          write();
        }, WAVE_SHOWS_MS);
      }
      write();
    };
    changed();
    const stop = table.subscribe(changed);
    return () => {
      stop();
      if (fade) clearTimeout(fade);
    };
    // A session starting is a new activity, which has to be told of the table too.
  }, [table, phase]);

  return null;
}
