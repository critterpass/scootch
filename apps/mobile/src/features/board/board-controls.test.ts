import { describe, expect, it, jest } from '@jest/globals';

import { momentAt } from '@phusclass/domain/board';
import { createChooser, type Moment } from '@phusclass/voice/class';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { boardControls, type Say } from './board-controls';
import { boardRows } from './board-rows';

/** A board on a real migrated database, his English lines, and a record of every moment he spoke. */
async function board() {
  const db = await openMigratedDatabase();
  let id = 0;
  const store = createBoardStore({
    db,
    clock: () => momentAt(Date.parse('2026-10-27T09:00:00Z'), 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  const chooser = createChooser('en');
  const said: Moment[] = [];
  const say = jest.fn<Say>((moment, seed, values) => {
    said.push(moment);
    return chooser.say(moment, seed, values)?.text;
  });
  const controls = boardControls(store, say);
  const text = (status: string) =>
    store
      .getSnapshot()
      .board.filter(({ task }) => task.status === status)
      .map(({ task }) => task.text);
  return { store, controls, said, say, text };
}

describe('the board controls', () => {
  it('swaps a task onto the desk, sends the desk task back, and he says one line', async () => {
    const { store, controls, said, text } = await board();
    await store.say('buy milk and call the bank');
    expect(text('desk')).toEqual(['Buy milk']);
    const bank = store.getSnapshot().board.find(({ task }) => task.text === 'Call the bank');
    await store.screened(bank!.task.id, 'none');

    const line = await controls.swap(bank!.task.id);

    expect(text('desk')).toEqual(['Call the bank']);
    expect(text('board')).toEqual(['Buy milk']);
    expect(store.getSnapshot().desk?.reason).toBe('swapped');
    expect(said).toEqual(['swapAllowed']);
    expect(typeof line).toBe('string');
    expect(line).not.toContain('{task}');
  });

  it('says nothing about a swap before the task is screened, or onto a serious task', async () => {
    const { store, controls, said } = await board();
    await store.say('buy milk and call the bank and see the lawyer');
    const [, bank, lawyer] = store.getSnapshot().board.map(({ task }) => task.id);
    await store.screened(lawyer!, 'serious');

    expect(await controls.swap(bank!)).toBeNull();
    expect(await controls.swap(lawyer!)).toBeNull();
    expect(store.getSnapshot().desk?.task.id).toBe(lawyer);
    expect(said).toEqual([]);
  });

  it('erases quietly: the task leaves the board and he makes no remark', async () => {
    const { store, controls, said, text } = await board();
    await store.say('buy milk and call the bank');
    const bank = store.getSnapshot().board.find(({ task }) => task.text === 'Call the bank');

    expect(await controls.erase(bank!.task.id)).toBeNull();

    expect(text('board')).toEqual([]);
    expect(store.getSnapshot().logbook).toEqual([]);
    expect(said).toEqual([]);
  });

  it('ticks a task off into the logbook, and the desk takes his next pick', async () => {
    const { store, controls, said, text } = await board();
    await store.say('buy milk and call the bank');
    const milk = store.getSnapshot().desk!.task.id;

    await controls.tick(milk);

    expect(text('desk')).toEqual(['Call the bank']);
    expect(store.getSnapshot().logbook.map((entry) => entry.text)).toEqual(['Buy milk']);
    expect(said).toEqual([]);
  });

  it('rewords in the user’s own words, and ignores empty words', async () => {
    const { store, controls, text } = await board();
    await store.say('buy milk');
    const milk = store.getSnapshot().desk!.task.id;

    await controls.reword(milk, '   ');
    expect(text('desk')).toEqual(['Buy milk']);
    await controls.reword(milk, '  Buy oat milk ');
    expect(text('desk')).toEqual(['Buy oat milk']);
  });

  it('remarks on an empty board when it opens', async () => {
    const { controls, said } = await board();
    expect(await controls.opened()).toEqual(expect.any(String));
    expect(said).toEqual(['emptyDesk']);
  });

  it('remarks on a long board once a day', async () => {
    const { store, controls, said } = await board();
    const many = Array.from({ length: 14 }, (_, n) => `task number ${n + 1}`);
    for (const one of many) await store.say(one);
    expect(store.getSnapshot().longBoard).toBe(true);

    expect(await controls.opened()).toEqual(expect.any(String));
    expect(await controls.opened()).toBeNull();
    expect(said).toEqual(['boardLong']);
  });
});

describe('the board rows', () => {
  const words = { today: 'Today' };

  it('chalks a tally for a graded late slip, and none for an accepted one', async () => {
    const { store } = await board();
    await store.say('call the bank and buy milk');
    await store.slip('too tired', false);
    await store.slip('the shop is shut', true);
    const snapshot = store.getSnapshot();

    const rows = boardRows(snapshot.board, snapshot.faded, snapshot.now, 'en', words);

    expect(rows.map((row) => [row.text, row.mark])).toEqual(
      expect.arrayContaining([
        ['Call the bank', { kind: 'tally', count: 1, frontRow: false }],
        ['Buy milk', { kind: 'none' }],
      ]),
    );
  });

  it('never shows tally marks on a serious task', async () => {
    const { store } = await board();
    await store.say('call the bank');
    await store.slip('too tired', false);
    const id = store.getSnapshot().board[0]!.task.id;
    expect(store.getSnapshot().board[0]!.task.slips).toHaveLength(1);
    await store.screened(id, 'serious');
    const snapshot = store.getSnapshot();

    const [row] = boardRows(snapshot.board, snapshot.faded, snapshot.now, 'en', words);

    expect(row).toMatchObject({ heavy: true, mark: { kind: 'none' } });
  });

  it('underlines the desk task and writes a due date in the corner', async () => {
    const { store } = await board();
    await store.say('call the bank and email the landlord by Friday');
    const snapshot = store.getSnapshot();

    const rows = boardRows(snapshot.board, snapshot.faded, snapshot.now, 'en', words);

    expect(rows.map((row) => [row.text, row.onDesk, row.today, row.mark])).toEqual([
      ['Call the bank', true, true, { kind: 'none' }],
      ['Email the landlord', false, false, { kind: 'date', label: 'Fri' }],
    ]);
  });
});
