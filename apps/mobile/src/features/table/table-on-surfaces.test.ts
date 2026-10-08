import { describe, expect, it } from '@jest/globals';

import type { TableSeat } from '@scootch/domain';

import { tableOnSurfaces, WAVE_SHOWS_MS } from './table-on-surfaces';

const NOW = Date.parse('2026-10-08T10:12:00.000Z');
const seat = (userId: string, changes: Partial<TableSeat> = {}): TableSeat => ({
  userId,
  label: 'email',
  workMode: null,
  online: true,
  nudgesLeft: 3,
  status: 'here',
  ...changes,
});
const table = (changes = {}) => ({
  tableId: 't1',
  you: 'me',
  seats: [seat('dana', { name: 'Dana', label: 'writing' }), seat('me', { name: 'Khanh' })],
  endsAt: NOW + 600_000,
  nudgesLeft: 2,
  ...changes,
});

describe('the table on the Lock Screen', () => {
  it('shows the seats, the own one first and without a name', () => {
    expect(tableOnSurfaces(table(), null, NOW)).toEqual({
      id: 't1',
      seats: [
        { id: 'me', name: null, label: 'email', you: true, waved: false, done: false, away: false },
        {
          id: 'dana',
          name: 'Dana',
          label: 'writing',
          you: false,
          waved: false,
          done: false,
          away: false,
        },
      ],
      nudgesLeft: 2,
      wavedBy: null,
    });
  });

  it('is the hunt, not the table, when not seated or with no session running', () => {
    expect(tableOnSurfaces(table({ tableId: null }), null, NOW)).toBeNull();
    expect(tableOnSurfaces(table({ endsAt: null }), null, NOW)).toBeNull();
    expect(tableOnSurfaces(table({ you: 'gone' }), null, NOW)).toBeNull();
  });

  it('shows a wave on its seat for a minute, and whom to wave back at', () => {
    const waved = tableOnSurfaces(table(), { from: 'dana', at: NOW - 5_000 }, NOW);
    expect(waved?.wavedBy).toBe('dana');
    expect(waved?.seats.map((one) => one.waved)).toEqual([false, true]);
    const later = tableOnSurfaces(table(), { from: 'dana', at: NOW - WAVE_SHOWS_MS }, NOW);
    expect(later?.wavedBy).toBeNull();
    // Someone who has since left is not waved back at.
    expect(tableOnSurfaces(table(), { from: 'left', at: NOW }, NOW)?.wavedBy).toBeNull();
  });

  it('says nothing of the work for a seat with no label, and marks done and away', () => {
    const made = tableOnSurfaces(
      table({
        seats: [
          seat('me', { label: '' }),
          seat('kofi', { name: 'Kofi', done: true }),
          seat('mei', { name: 'Mei', status: 'away', online: false }),
          seat('sam', { status: 'working', online: false }),
        ],
      }),
      null,
      NOW,
    );
    expect(made?.seats).toMatchObject([
      { id: 'me', label: null },
      { id: 'kofi', done: true, away: false },
      { id: 'mei', away: true },
      { id: 'sam', name: null, away: false },
    ]);
  });
});
