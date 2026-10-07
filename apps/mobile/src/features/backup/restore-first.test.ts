import { describe, expect, it } from '@jest/globals';

import { HOUR_MS } from '@scootch/domain';

import { stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { NOW, phone } from './test/backup-phone';
import { LAST_BACKUP_KEY, settingsValues } from './settings-values';
import { day, monster, task, TOKEN } from './test/sample-world';

/** The snapshot an earlier phone left on the server. */
async function serverCopy(): Promise<unknown> {
  const old = await phone({ token: TOKEN });
  await old.open().afterFinish();
  return old.server.stored;
}

describe('a reinstalled phone', () => {
  it('is offered its world back after the app has opened today, and uploads nothing first', async () => {
    const stored = await serverCopy();
    // The app starts: the day store opens today before any screen is drawn.
    const app = await stagedPhone(stagedServer(), undefined, NOW);
    const fresh = await phone({ world: false, token: TOKEN, stored, database: app.data });
    const backup = fresh.open();

    await backup.maybeUpload();
    await backup.afterFinish();
    expect(fresh.server.puts).toEqual([]);
    expect(fresh.server.stored).toEqual(stored);

    const found = await backup.findRestore();
    expect(found).toEqual(stored);
    expect(found && (await backup.restore(found))).toBe('restored');
    expect(await fresh.repositories.monsters.all()).toEqual([monster]);
    expect(await fresh.repositories.tasks.get(task.id)).toEqual(task);

    // Once the world is back, the phone backs up again.
    await backup.afterFinish();
    expect(fresh.server.puts).toEqual([TOKEN]);
  });

  it('uploads once the person has chosen to start fresh, and is not asked a second time', async () => {
    const stored = await serverCopy();
    const fresh = await phone({ world: false, token: TOKEN, stored });
    const backup = fresh.open();
    expect(await backup.findRestore()).toEqual(stored);

    await backup.declineRestore();
    expect(await fresh.open().findRestore()).toBeNull();
    await fresh.repositories.tasks.put(task);
    await fresh.open().afterFinish();
    expect(fresh.server.puts).toEqual([TOKEN]);
  });

  it('never replaces a fuller server copy when the offer could not be made', async () => {
    const stored = await serverCopy();
    const fresh = await phone({ world: false, token: TOKEN, stored });
    // No connection at first launch: no offer, and the person makes one thing.
    fresh.server.online = false;
    expect(await fresh.open().findRestore()).toBeNull();
    await fresh.repositories.tasks.put({
      ...task,
      id: 'task-new',
      status: 'set',
      finishedAt: null,
    });

    fresh.server.online = true;
    fresh.time.now = NOW + 2 * HOUR_MS;
    await fresh.open().afterFinish();
    expect(fresh.server.puts).toEqual([]);
    expect(fresh.server.stored).toEqual(stored);

    // The offer is made late, and taking it adds the old world to what was made here.
    const backup = fresh.open();
    const found = await backup.findRestore();
    expect(found).toEqual(stored);
    expect(found && (await backup.restore(found))).toBe('restored');
    expect(await fresh.repositories.monsters.all()).toEqual([monster]);
    expect((await fresh.repositories.tasks.all()).map((one) => one.id)).toEqual(
      expect.arrayContaining([task.id, 'task-new']),
    );
    await backup.afterFinish();
    expect(fresh.server.puts).toEqual([TOKEN]);
  });

  it('backs up as before on a phone that has already uploaded, or whose server copy is empty', async () => {
    const used = await phone({ token: TOKEN, stored: null });
    await used.open().afterFinish();
    await used.open().afterFinish();
    expect(used.server.puts).toEqual([TOKEN, TOKEN]);
    expect(used.server.gets).toEqual([TOKEN]);
  });
});

describe('settling which world the server copy is', () => {
  it('settles nothing while neither token store can be read', async () => {
    const stored = await serverCopy();
    const fresh = await phone({ world: false, token: TOKEN, stored });
    await fresh.repositories.tasks.put({
      ...task,
      id: 'task-new',
      status: 'set',
      finishedAt: null,
    });
    fresh.keychain.off = true;
    fresh.cloud.off = true;
    expect(await fresh.open().findRestore()).toBeNull();
    await fresh.open().afterFinish();

    // The stores answer again: the fuller copy is still there, and is still offered.
    fresh.keychain.off = false;
    fresh.cloud.off = false;
    await fresh.open().afterFinish();
    expect(fresh.server.puts).toEqual([]);
    expect(await fresh.open().findRestore()).toEqual(stored);
  });

  it('offers a server copy of a different world, however many rows this phone holds', async () => {
    const stored = await serverCopy();
    const other = await phone({ world: false, token: TOKEN, stored });
    // As many rows as the server holds, and none of them the same.
    for (let n = 0; n < 12; n += 1) {
      await other.repositories.tasks.put({ ...task, id: `mine-${n}`, text: `Mine ${n}` });
    }
    await other.open().afterFinish();
    expect(other.server.puts).toEqual([]);
    expect(await other.open().findRestore()).toEqual(stored);
  });

  it('settles silently when everything the server holds is already on the phone', async () => {
    const old = await phone({ token: TOKEN });
    await old.open().afterFinish();
    const same = await phone({ token: TOKEN, stored: old.server.stored });
    expect(await same.open().findRestore()).toBeNull();
    await same.open().afterFinish();
    expect(same.server.puts).toEqual([TOKEN]);
  });

  it('leaves a phone that has uploaded before alone: no offer, its world untouched, backups go on', async () => {
    const stored = await serverCopy();
    // The phone in use today: it has uploaded, it was never marked settled, and it holds less.
    const used = await phone({ world: false, token: TOKEN, stored });
    await used.repositories.tasks.put({ ...task, id: 'only-mine' });
    await settingsValues(used.data.db).set(
      LAST_BACKUP_KEY,
      new Date(NOW - 5 * HOUR_MS).toISOString(),
    );

    expect(await used.open().findRestore()).toBeNull();
    expect(used.server.gets).toEqual([]);
    expect((await used.repositories.tasks.all()).map((one) => one.id)).toEqual(['only-mine']);
    await used.open().afterFinish();
    expect(used.server.puts).toEqual([TOKEN]);
  });
});

describe('adding a restored world to a phone in use', () => {
  const TODAY = '2026-10-07';
  async function inUse() {
    const old = await phone({ token: TOKEN });
    await old.repositories.tasks.put({
      ...task,
      id: 'old-open',
      text: 'Old open thing',
      localDate: TODAY,
      status: 'started',
      finishedAt: null,
    });
    await old.open().afterFinish();
    const mine = await phone({ world: false, token: TOKEN, stored: old.server.stored });
    await mine.repositories.days.put({ ...day, localDate: TODAY, status: 'open' });
    await mine.repositories.tasks.put({
      ...task,
      id: 'my-open',
      text: 'My open thing',
      localDate: TODAY,
      status: 'set',
      finishedAt: null,
    });
    await mine.repositories.monsters.put({
      ...monster,
      id: 'my-monster',
      taskId: 'my-open',
      number: 1,
    });
    const backup = mine.open();
    const found = await backup.findRestore();
    expect(found && (await backup.restore(found))).toBe('restored');
    return mine;
  }

  it('numbers the restored cards after the ones caught here, so no two share a number', async () => {
    const mine = await inUse();
    const numbers = (await mine.repositories.monsters.all()).map((one) => [one.id, one.number]);
    expect(numbers).toEqual(
      expect.arrayContaining([
        ['my-monster', 1],
        [monster.id, 2],
      ]),
    );
    expect(new Set(numbers.map(([, number]) => number)).size).toBe(numbers.length);
  });

  it('puts restored unfinished things in the drawer whole: today keeps its one open task', async () => {
    const mine = await inUse();
    const open = (await mine.repositories.tasks.all()).filter(
      (one) => one.localDate === TODAY && one.status !== 'finished',
    );
    expect(open.map((one) => one.id)).toEqual(['my-open']);
    expect((await mine.repositories.drawerItems.all()).map((item) => item.id)).toContain(
      'old-open',
    );
    expect(await mine.repositories.tasks.get('old-open')).toMatchObject({ text: 'Old open thing' });
  });
});
