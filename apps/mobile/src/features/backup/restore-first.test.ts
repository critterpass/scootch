import { describe, expect, it } from '@jest/globals';

import { HOUR_MS } from '@scootch/domain';

import { stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { NOW, phone } from './test/backup-phone';
import { monster, task, TOKEN } from './test/sample-world';

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
