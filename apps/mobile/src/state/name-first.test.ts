import { describe, expect, it } from '@jest/globals';

import type { TaskCreateNameResponse, TaskCreatePackResponse } from '@scootch/domain';

import nameFixture from '../../../../packages/voice/fixtures/task.create_name.en.json';
import packFixture from '../../../../packages/voice/fixtures/task.create_pack.en.json';
import { openRepositories } from '../data/repositories';
import { stageOf } from '../features/one-screen/one-screen-stage';

import { lineFor } from './lines';
import { stepDown } from './session-flow';
import { createRequestTaker } from './surface-actions';
import { recordedLines, stagedPhone, stagedServer } from './test/staged-phone';

const name: TaskCreateNameResponse = nameFixture.response;
const pack = packFixture.response as TaskCreatePackResponse;
const cheeky = { language: 'en', attitude: 'cheeky' } as const;

function held<T>() {
  let release: (value: T) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  return { promise, release, fail };
}

describe('the task call, name first', () => {
  it('hatches as soon as the name arrives, and takes the pack when it follows', async () => {
    const later = held<TaskCreatePackResponse>();
    const treats: (string | null)[] = [];
    const server = stagedServer({
      name: () => Promise.resolve(name),
      pack: (treat) => {
        treats.push(treat);
        return later.promise;
      },
    });
    const app = await stagedPhone(server);
    const said = app.say();
    await app.until(() => app.store.getState().monster !== null);

    const hatched = app.store.getState();
    expect(hatched.monster).toMatchObject(name.monster);
    expect(hatched.monsterPending).toBe(false);
    expect(hatched.line).toEqual({ slot: 'hatch', text: name.hatch });
    expect(app.task().lines).toBeNull();
    // The pick does not wait for the pack either: the hatch is on the screen at once.
    void app.store.dispatch({ type: 'one_thing_picked' });
    await app.until(() => app.store.getState().pick.kind === 'hatching');
    expect(stageOf({ ...app.store.getState(), energyAsked: false }).kind).toBe('hatch');
    expect([server.nameCalls, server.packCalls, server.lineCalls]).toEqual([1, 1, 0]);
    expect(treats).toEqual([null]);

    later.release(pack);
    await said;
    expect(app.task().lines).toMatchObject({ hatch: name.hatch, start: pack.lines.start });
    expect(app.task().notifications).toEqual(pack.notifications);
    // The monster the name brought is the one that stays.
    expect(app.store.getState().monster?.id).toBe(hatched.monster?.id);
    expect(app.data.count('monsters')).toBe(1);
  });

  it('keeps the signature the name came with, through the database, and draws from its seed', async () => {
    const signed = {
      seed: '0b6f1c1e-52c4-4f0e-9a51-7d7a3a0e9c11',
      language: 'en',
      signature: 'signed-by-the-server',
    } as const;
    const answer = { ...name, monster: { ...name.monster, signed } };
    const app = await stagedPhone(
      stagedServer({ name: () => Promise.resolve(answer), pack: () => Promise.resolve(pack) }),
    );
    await app.say();
    await app.until(() => app.store.getState().monster !== null);

    const [stored] = await openRepositories(app.data.db).monsters.all();
    expect(stored?.signed).toEqual(signed);
    expect(stored?.spec.seed).toBe(signed.seed);
    expect(app.store.getState().monster?.signed).toEqual(signed);

    // A name that came unsigned is stored with none, and its monster is drawn from the task's id.
    const old = await stagedPhone(
      stagedServer({ name: () => Promise.resolve(name), pack: () => Promise.resolve(pack) }),
    );
    await old.say();
    await old.until(() => old.store.getState().monster !== null);
    const [unsigned] = await openRepositories(old.data.db).monsters.all();
    expect(unsigned?.signed).toBeNull();
    expect(unsigned?.spec.seed).toBe(old.task().id);
  });

  it('asks for the pack with the treat, when one was named before the name arrived', async () => {
    const naming = held<TaskCreateNameResponse>();
    const treats: (string | null)[] = [];
    const server = stagedServer({
      name: () => naming.promise,
      pack: (treat) => {
        treats.push(treat);
        return Promise.resolve(pack);
      },
    });
    const app = await stagedPhone(server);
    const said = app.say();
    await app.until(() => app.store.getState().today.kind === 'task_set');
    void app.store.dispatch({ type: 'one_thing_picked' });
    void app.store.dispatch({ type: 'session_set', minutes: 10, treat: 'a flat white' });
    await app.until(() => app.store.getState().session !== null);
    naming.release(name);
    await said;
    expect(treats).toEqual(['a flat white']);
  });

  it('keeps the named monster and speaks the offline lines when the pack never comes', async () => {
    const server = stagedServer({ name: () => Promise.resolve(name) });
    const app = await stagedPhone(server);
    await app.say();
    expect(app.store.getState().monster).toMatchObject(name.monster);
    expect(app.task().lines).toBeNull();
    expect(lineFor('start', app.task(), cheeky)).not.toBeNull();
  });
});

describe('the new line slots', () => {
  const ready = async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    const session = (type: 'started' | 'stuck_tapped' | 'step_smaller' | 'hold_started') =>
      app.store.dispatch({ type: 'session', event: { type } });
    return { ...app, session };
  };
  const { lines } = recordedLines;

  it('steps "Smaller" on the stuck card down through real smaller steps, none twice', async () => {
    const app = await ready();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await app.session('started');
    await app.session('stuck_tapped');
    const shown = [app.store.getState().line?.text];
    for (let tap = 0; tap < 4; tap += 1) {
      await app.session('step_smaller');
      shown.push(app.store.getState().line?.text);
    }
    const steps = [lines.tinyNextStep, ...(lines.tinierNextSteps ?? [])];
    expect(shown.slice(0, 3)).toEqual(steps);
    expect(new Set(shown.slice(0, 3)).size).toBe(3);
    // Past the smallest step it stays there: it never starts over at a bigger one.
    expect(shown.slice(3)).toEqual([steps[2], steps[2]]);
    const { session } = app.store.getState();
    expect(lineFor('tinyNextStep', app.task(), cheeky, stepDown(app.task(), session))).toBe(
      steps[2],
    );
  });

  it('keeps the one step of a pack written before the smaller ones existed', async () => {
    const app = await ready();
    const { tinierNextSteps: _none, ...old } = lines;
    const task = { ...app.task(), lines: old };
    expect([0, 1, 5].map((turn) => lineFor('tinyNextStep', task, cheeky, turn))).toEqual(
      Array.from({ length: 3 }, () => lines.tinyNextStep),
    );
  });

  it('says the treat and parked-thoughts lines after a finish, and the let-go line on the hold', async () => {
    const app = await ready();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: 'a flat white' });
    await app.session('started');
    await app.store.dispatch({
      type: 'session',
      event: { type: 'thought_parked', text: 'Buy washers' },
    });
    await app.session('hold_started');
    await app.store.dispatch({ type: 'session', event: { type: 'hold_released' } });
    expect(app.store.getState().line).toEqual({ slot: 'releasedEarly', text: lines.releasedEarly });

    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    expect(app.store.getState().treat).toBe('a flat white');
    expect(app.store.getState().afterLines).toEqual({
      treat: 'A deal is a deal: a flat white. Drip can watch from the bucket.',
      parkedThoughts: lines.parkedThoughts,
    });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().afterLines).toEqual({ treat: null, parkedThoughts: null });
  });

  it('shows those screens as before when the pack has none of the new lines', async () => {
    const { tinierNextSteps, treatHandOver, parkedThoughts, releasedEarly, ...old } = lines;
    expect([tinierNextSteps, treatHandOver, parkedThoughts, releasedEarly]).not.toContain(
      undefined,
    );
    const app = await stagedPhone(
      stagedServer({ lines: () => Promise.resolve({ ...recordedLines, lines: old }) }),
    );
    await app.say();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: 'a flat white' });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'session', event: { type: 'hold_started' } });
    const before = app.store.getState().line;
    await app.store.dispatch({ type: 'session', event: { type: 'hold_released' } });
    expect(app.store.getState().line).toEqual(before);
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    expect(app.store.getState().afterLines).toEqual({ treat: null, parkedThoughts: null });
  });
});

describe('what a control or a widget asks a screen to do', () => {
  it('is handed to the screen of its kind once, and not again until a new request', async () => {
    const app = await stagedPhone(stagedServer());
    const composer = createRequestTaker('composer');
    const park = createRequestTaker('park_thought');
    expect(composer(null)).toBeNull();

    await app.store.dispatch({ type: 'surface_action', action: 'brain_dump' });
    const asked = app.store.getState().surfaceRequest ?? null;
    expect(park(asked)).toBeNull();
    expect(composer(asked)).toEqual({ kind: 'composer', listening: true });
    // The same request seen again, as on a second render, does nothing.
    expect(composer(asked)).toBeNull();
    await app.store.dispatch({ type: 'surface_request_taken' });
    expect(composer(app.store.getState().surfaceRequest ?? null)).toBeNull();

    await app.store.dispatch({ type: 'surface_action', action: 'start_session' });
    expect(composer(app.store.getState().surfaceRequest ?? null)).toEqual({
      kind: 'composer',
      listening: false,
    });
  });

  it('opens the park-a-thought field only for a running session', async () => {
    const app = await stagedPhone(stagedServer());
    const park = createRequestTaker('park_thought');
    await app.store.dispatch({ type: 'surface_action', action: 'park_thought' });
    expect(park(app.store.getState().surfaceRequest ?? null)).toBeNull();

    await app.say();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'surface_action', action: 'park_thought' });
    expect(park(app.store.getState().surfaceRequest ?? null)).toEqual({ kind: 'park_thought' });
    expect(park(app.store.getState().surfaceRequest ?? null)).toBeNull();
  });
});
