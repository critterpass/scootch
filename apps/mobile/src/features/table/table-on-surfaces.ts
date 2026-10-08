import type { SessionActivityTable } from '../../../modules/scootch-live-activity';

import type { TableState } from './table-store';

/** How long a wave shows on its seat. */
export const WAVE_SHOWS_MS = 60_000;

/** The last wave this phone was sent: who from, and when. */
export interface LastWave {
  readonly from: string;
  readonly at: number;
}

/**
 * The table as the Lock Screen and the Island show it, or `null` when they should show the hunt:
 * not seated, or seated with no session running. Only what the table itself shows goes out: a
 * name and the one or two words of a label, never a task. The person's own seat comes first.
 */
export function tableOnSurfaces(
  state: Pick<TableState, 'tableId' | 'you' | 'seats' | 'endsAt' | 'nudgesLeft'>,
  wave: LastWave | null,
  now: number,
): SessionActivityTable | null {
  const { tableId, you, seats } = state;
  if (tableId === null || you === null || state.endsAt === null) return null;
  if (!seats.some((seat) => seat.userId === you)) return null;
  const waving = wave !== null && now - wave.at < WAVE_SHOWS_MS ? wave.from : null;
  const shown = [...seats].sort((a, b) => Number(b.userId === you) - Number(a.userId === you));
  return {
    id: tableId,
    seats: shown.map((seat) => ({
      id: seat.userId,
      name: seat.userId === you ? null : (seat.name ?? null),
      label: seat.label.trim() === '' ? null : seat.label,
      you: seat.userId === you,
      waved: seat.userId === waving && seat.userId !== you,
      done: seat.done === true,
      away: seat.status === 'away',
    })),
    nudgesLeft: state.nudgesLeft,
    wavedBy: waving !== null && shown.some((seat) => seat.userId === waving) ? waving : null,
  };
}
