import { describe, expect, it } from '@jest/globals';

import { t } from '@scootch/i18n';
import { offlinePacks } from '@scootch/voice';

import { lineFor } from '../../state/lines';
import { stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { wordsWhileUnscreened } from './waiting-words';

const cheeky = { language: 'en', attitude: 'cheeky' } as const;

describe('a task typed with no connection', () => {
  it('is screened once and gets its monster once, however the connection flaps', async () => {
    const server = stagedServer({ online: false });
    const phone = await stagedPhone(server);
    const { store } = phone;

    await phone.say('Email the dentist', 'typed');
    expect(phone.task().screen).toBe('unscreened');
    expect(server.startCalls).toBe(0);

    // The connection comes back, drops and comes back, and the app is opened in the middle of it.
    server.online = true;
    await Promise.all([
      store.dispatch({ type: 'connection_returned' }),
      store.dispatch({ type: 'connection_returned' }),
      store.dispatch({ type: 'app_foregrounded' }),
      store.dispatch({ type: 'connection_returned' }),
    ]);
    server.online = false;
    await store.dispatch({ type: 'connection_returned' });
    server.online = true;
    await store.dispatch({ type: 'connection_returned' });
    await store.dispatch({ type: 'app_foregrounded' });

    expect(server.startCalls).toBe(1);
    expect(server.lineCalls).toBe(1);
    expect(phone.task().screen).toBe('pass');
    expect(phone.data.count('monsters')).toBe(1);
    expect(phone.data.count('tasks')).toBe(1);
  });

  it('keeps plain company until then, and says when the monster will come', async () => {
    const phone = await stagedPhone(stagedServer({ online: false }));
    await phone.say('Email the dentist', 'typed');
    const task = phone.task();
    const connection = { offline: true, modelDown: false };

    expect(wordsWhileUnscreened(task, 'offered', connection, cheeky)).toBe(
      offlinePacks.en.noTask.cheeky.offline,
    );
    expect(lineFor('working', task, cheeky)).toBe(offlinePacks.en.noTask.cheeky.hatchesWhenBack);
    // Nothing from the playful pack is said about a task nobody has screened, and nothing from
    // the care pack either: its words claim nothing about the task.
    expect(lineFor('caught', task, cheeky)).toBe(t('en', 'plain.unscreened.done'));
    expect(lineFor('acknowledge', task, cheeky)).toBe(t('en', 'plain.unscreened.acknowledge'));
    expect(lineFor('acknowledge', task, { language: 'vi', attitude: 'unhinged' })).toBe(
      t('vi', 'plain.unscreened.acknowledge'),
    );
    for (const slot of ['acknowledge', 'start', 'done', 'notFinished', 'tinyNextStep'] as const) {
      expect(Object.values(offlinePacks.en.plain)).not.toContain(lineFor(slot, task, cheeky));
    }
    expect(phone.store.getState().modelDown).toBe(false);
  });

  it('says nothing about monsters or signal when the phone held the task back', async () => {
    const phone = await stagedPhone(stagedServer({ online: false }));
    await phone.say('Call the hospice about the funeral', 'typed');
    const task = phone.task();

    expect(
      wordsWhileUnscreened(task, 'offered', { offline: true, modelDown: false }, cheeky),
    ).toBeNull();
    expect(lineFor('working', task, cheeky)).toBe(offlinePacks.en.plain.working[0]);
  });

  it('keeps the care pack for text that was judged serious, by the gate or by the screen', async () => {
    const phone = await stagedPhone(stagedServer({ online: false }));
    await phone.say('Call the hospice about the funeral', 'typed');
    const held = phone.task();
    expect(held.screen).toBe('unscreened');
    expect(lineFor('acknowledge', held, cheeky)).toBe(offlinePacks.en.plain.acknowledge);

    // A task the screen called serious whose own lines have not arrived speaks the care pack too.
    const serious = { ...held, text: 'Email the dentist', screen: 'serious' as const, lines: null };
    expect(lineFor('acknowledge', serious, cheeky)).toBe(offlinePacks.en.plain.acknowledge);
  });
});

describe('the model not answering', () => {
  it('is said once, from the offline pack, and the typed task still counts', async () => {
    const server = stagedServer();
    const phone = await stagedPhone(server);
    // The connection is up and the call fails.
    Object.defineProperty(server, 'start', {
      get: () => {
        throw new Error('down');
      },
    });

    await phone.say('Email the dentist', 'typed');

    expect(phone.store.getState().modelDown).toBe(true);
    expect(phone.task().screen).toBe('unscreened');
    expect(
      wordsWhileUnscreened(phone.task(), 'offered', { offline: false, modelDown: true }, cheeky),
    ).toBe(offlinePacks.en.noTask.cheeky.modelDown);
  });
});
