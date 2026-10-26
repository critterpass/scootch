import { describe, expect, it } from '@jest/globals';

import { momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import {
  initialComposer,
  step,
  type ComposerEvent,
  type ComposerState,
  type Step,
} from './composer-machine';
import { handIn } from './hand-in';

/** Runs events from a state, keeping every command asked for along the way. */
function run(events: readonly ComposerEvent[], from: ComposerState = initialComposer): Step {
  let state = from;
  const commands: Step['commands'][number][] = [];
  for (const event of events) {
    const next = step(state, event);
    state = next.state;
    commands.push(...next.commands);
  }
  return { state, commands };
}

async function board() {
  let id = 0;
  const store = createBoardStore({
    db: await openMigratedDatabase(),
    clock: () => momentAt(Date.parse('2026-10-27T09:00:00Z'), 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  return store;
}

describe('a tap too short to be speech', () => {
  it('gets one line and nothing else, however much was heard', () => {
    const { state, commands } = run([
      { type: 'press', at: 0, permission: 'granted' },
      { type: 'heard', words: 'call' },
      { type: 'release', at: 250 },
      { type: 'ended' },
    ]);
    expect(state).toEqual({ mode: 'idle', note: 'short tap' });
    expect(commands.map((c) => c.kind)).toEqual(['start hearing', 'stop hearing', 'say']);
    expect(commands).not.toContainEqual(expect.objectContaining({ kind: 'hand in' }));
  });

  it('is the same for a long hold with nothing heard', () => {
    const { state } = run([
      { type: 'press', at: 0, permission: 'granted' },
      { type: 'release', at: 3000 },
      { type: 'ended' },
    ]);
    expect(state).toEqual({ mode: 'idle', note: 'short tap' });
  });
});

describe('holding to talk', () => {
  it('shows the words while they come, and hands in the last words heard after letting go', () => {
    const listening = run([
      { type: 'press', at: 0, permission: 'granted' },
      { type: 'heard', words: 'call the bank' },
    ]);
    expect(listening.state).toMatchObject({ mode: 'listening', words: 'call the bank' });

    const { state, commands } = run(
      [
        { type: 'release', at: 2000 },
        // The phone's last words arrive after the finger is up.
        { type: 'heard', words: 'call the bank about  the card' },
        { type: 'ended' },
      ],
      listening.state,
    );
    expect(state).toEqual({ mode: 'handing', text: 'call the bank about the card', from: 'voice' });
    expect(commands).toContainEqual({ kind: 'hand in', text: 'call the bank about the card' });
  });
});

describe('the microphone', () => {
  it('is asked for on the first hold, not before, and that hold does not hear', () => {
    const asked = run([{ type: 'press', at: 0, permission: 'unknown' }]);
    expect(asked.commands).toEqual([{ kind: 'ask permission' }]);

    // The system sheet took the finger: by the answer it has been let go.
    const after = run(
      [
        { type: 'release', at: 900 },
        { type: 'permission', granted: true },
      ],
      asked.state,
    );
    expect(after.state).toEqual({ mode: 'idle', note: null });
    expect(after.commands).toEqual([]);
  });

  it('refused, opens typing with a note, and every later hold goes straight to typing', () => {
    const refused = run([
      { type: 'press', at: 0, permission: 'unknown' },
      { type: 'permission', granted: false },
    ]);
    expect(refused.state).toEqual({ mode: 'typing', draft: '', note: 'mic off' });

    const later = run([{ type: 'press', at: 0, permission: 'denied' }]);
    expect(later.state).toEqual({ mode: 'typing', draft: '', note: 'mic off' });
    expect(later.commands).toEqual([]);
  });

  it('with no hearing for the language on this phone, keeps what was heard in the field', () => {
    const { state, commands } = run([
      { type: 'press', at: 0, permission: 'granted' },
      { type: 'heard', words: 'email the' },
      { type: 'unavailable' },
    ]);
    expect(state).toEqual({ mode: 'typing', draft: 'email the', note: 'no hearing' });
    expect(commands).toContainEqual({ kind: 'abort hearing' });
  });
});

describe('typing', () => {
  it('hands in what was typed, and an empty field just closes', () => {
    const typed = run([
      { type: 'type' },
      { type: 'edit', draft: ' Call the landlord about the sink ' },
      { type: 'submit' },
    ]);
    expect(typed.state).toEqual({
      mode: 'handing',
      text: 'Call the landlord about the sink',
      from: 'typing',
    });

    expect(run([{ type: 'type' }, { type: 'submit' }]).state).toEqual({ mode: 'idle', note: null });
  });

  it('gives the words back when the board could not take them', () => {
    const { state } = run([
      { type: 'type' },
      { type: 'edit', draft: 'Renew passport' },
      { type: 'submit' },
      { type: 'handed', ok: false },
    ]);
    expect(state).toEqual({ mode: 'typing', draft: 'Renew passport', note: 'kept' });
  });
});

describe('handing in', () => {
  it('works with no connection: the phone hears, splits and writes the board itself', async () => {
    const store = await board();
    const handed = await handIn(
      'I need to call the bank about the card and get a birthday gift for Linh before Saturday',
      store.say,
    );
    expect(handed).toMatchObject({ ok: true, how: 'picked' });
    expect(store.getSnapshot().board.map(({ task }) => task.text)).toEqual(
      expect.arrayContaining(['Call the bank about the card']),
    );
  });

  it('lands every sentence as said when picking the whole ramble fails', async () => {
    const store = await board();
    const ramble = 'Call the dentist. Pay the electricity bill. Reply to Minh.';
    // Picking the ramble as a whole fails; each sentence alone is written as usual.
    const say = (text: string) =>
      text === ramble ? Promise.reject(new Error('picking failed')) : store.say(text);

    const handed = await handIn(ramble, say);

    expect(handed).toMatchObject({ ok: true, how: 'sentences' });
    expect(
      store
        .getSnapshot()
        .board.map(({ task }) => task.text)
        .sort(),
    ).toEqual(['Call the dentist', 'Pay the electricity bill', 'Reply to Minh']);
  });

  it('fails only when nothing could be written, so the words stay in the field', async () => {
    const handed = await handIn('Call the dentist. Reply to Minh.', () =>
      Promise.reject(new Error('the database is gone')),
    );
    expect(handed).toEqual({ ok: false });
  });
});
