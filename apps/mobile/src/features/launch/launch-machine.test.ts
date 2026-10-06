import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../data/repositories';
import { openTestDatabase } from '../../data/test/open-test-database';

import {
  askAccepted,
  finishedLaunchSettings,
  firstLaunchPending,
  LAUNCH_START,
  launchReducer,
  type LaunchEvent,
  type LaunchPermissions,
  type LaunchState,
} from './launch-machine';

const walk = (events: readonly LaunchEvent[], from: LaunchState = LAUNCH_START) =>
  events.reduce(launchReducer, from);

/** The system's prompts as a recorder: which were shown, and what the person answered. */
function fakePermissions(answers: { notifications: boolean; microphone: boolean }) {
  const shown: string[] = [];
  const permissions: LaunchPermissions = {
    askNotifications: () => {
      shown.push('notifications');
      return Promise.resolve(answers.notifications);
    },
    askMicrophone: () => {
      shown.push('microphone');
      return Promise.resolve(answers.microphone);
    },
  };
  return { shown, permissions };
}

const TO_PERMISSIONS: readonly LaunchEvent[] = [
  { type: 'greeted' },
  { type: 'attitude_chosen', attitude: 'unhinged' },
  { type: 'attitude_confirmed' },
];

describe('first launch', () => {
  it('goes hello, attitude, then the two favours one at a time', () => {
    expect(LAUNCH_START).toMatchObject({ step: 'hello', attitude: 'cheeky' });
    expect(walk([{ type: 'greeted' }]).step).toBe('attitude');

    const asking = walk(TO_PERMISSIONS);
    expect(asking).toMatchObject({
      step: 'permissions',
      attitude: 'unhinged',
      asking: 'notifications',
    });
    expect(walk([{ type: 'favour_answered', accepted: true }], asking)).toMatchObject({
      step: 'permissions',
      asking: 'microphone',
      accepted: ['notifications'],
    });
  });

  it('never shows the system prompt for a favour that was skipped', async () => {
    const skippedMicrophone = walk([
      ...TO_PERMISSIONS,
      { type: 'favour_answered', accepted: true },
      { type: 'favour_answered', accepted: false },
    ]);
    expect(skippedMicrophone.step).toBe('prompting');

    const system = fakePermissions({ notifications: true, microphone: true });
    const outcome = await askAccepted(skippedMicrophone.accepted, system.permissions);

    expect(system.shown).toEqual(['notifications']);
    expect(outcome).toEqual({ notifications: 'allowed', microphone: 'skipped' });
  });

  it('shows no system prompt at all when both are skipped, and finishes at once', async () => {
    const skippedBoth = walk([
      ...TO_PERMISSIONS,
      { type: 'favour_answered', accepted: false },
      { type: 'favour_answered', accepted: false },
    ]);
    expect(skippedBoth).toMatchObject({ step: 'finished', accepted: [] });

    const system = fakePermissions({ notifications: true, microphone: true });
    const outcome = await askAccepted(skippedBoth.accepted, system.permissions);

    expect(system.shown).toEqual([]);
    expect(outcome).toEqual({ notifications: 'skipped', microphone: 'skipped' });
  });

  it('asks the system for both accepted favours in order and reports a refusal', async () => {
    const acceptedBoth = walk([
      ...TO_PERMISSIONS,
      { type: 'favour_answered', accepted: true },
      { type: 'favour_answered', accepted: true },
    ]);
    const system = fakePermissions({ notifications: false, microphone: true });
    const outcome = await askAccepted(acceptedBoth.accepted, system.permissions);

    expect(system.shown).toEqual(['notifications', 'microphone']);
    expect(outcome).toEqual({ notifications: 'refused', microphone: 'allowed' });
    expect(walk([{ type: 'prompts_answered' }], acceptedBoth).step).toBe('finished');
  });

  it('is shown once: finishing stores the attitude and the moment, and it is never pending again', async () => {
    const { db } = await openTestDatabase();
    const { settings } = openRepositories(db);
    expect(firstLaunchPending(await settings.read('en'))).toBe(true);

    const finished = walk([
      ...TO_PERMISSIONS,
      { type: 'favour_answered', accepted: false },
      { type: 'favour_answered', accepted: false },
    ]);
    await settings.write(finishedLaunchSettings(finished, Date.UTC(2026, 9, 6, 9)));

    const stored = await settings.read('en');
    expect(stored).toMatchObject({
      attitude: 'unhinged',
      firstLaunchDoneAt: '2026-10-06T09:00:00.000Z',
    });
    expect(firstLaunchPending(stored)).toBe(false);
  });
});
