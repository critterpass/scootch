import { beforeEach, describe, expect, it } from '@jest/globals';

import { openMigratedDatabase } from '../../data/test-database';

import { firstDayRedirect } from './first-day-redirect';
import {
  forgetFirstDay,
  givenNameOf,
  loadFirstDay,
  markFirstDayDone,
  saveFullName,
} from './student';

const ready = { loaded: true, done: false, top: undefined, navigationReady: true } as const;

describe('the first-day redirect', () => {
  it('sends a new student to the first day from the desk or any other screen', () => {
    expect(firstDayRedirect(ready)).toBe('/first-day');
    expect(firstDayRedirect({ ...ready, top: 'settings' })).toBe('/first-day');
    expect(firstDayRedirect({ ...ready, top: 'care' })).toBe('/first-day');
  });

  it('stays put once the first day is done', () => {
    expect(firstDayRedirect({ ...ready, done: true })).toBeNull();
  });

  it('waits until it knows, and never moves the first day or the developer screens', () => {
    expect(firstDayRedirect({ ...ready, loaded: false })).toBeNull();
    expect(firstDayRedirect({ ...ready, navigationReady: false })).toBeNull();
    expect(firstDayRedirect({ ...ready, top: 'first-day' })).toBeNull();
    expect(firstDayRedirect({ ...ready, top: '(dev)' })).toBeNull();
  });
});

describe('the first day on the phone', () => {
  beforeEach(() => forgetFirstDay());

  it('is remembered as done, with the name from roll call, across a launch', async () => {
    const db = await openMigratedDatabase();
    await loadFirstDay(db);
    await saveFullName(db, '  Trần   Minh Anh ');
    await markFirstDayDone(db);

    expect(db.column("SELECT value FROM settings WHERE key = 'student.fullName'")).toEqual([
      JSON.stringify('Trần Minh Anh'),
    ]);
    expect(db.column("SELECT value FROM settings WHERE key = 'first-day.done'")).toEqual(['true']);
  });
});

describe('roll call', () => {
  it('repeats the given name, family name first or last, with or without marks', () => {
    expect(givenNameOf('Trần Minh Anh')).toBe('Anh');
    expect(givenNameOf('Tran Minh Anh')).toBe('Anh');
    expect(givenNameOf('nguyễn thị hoa')).toBe('hoa');
    expect(givenNameOf('Sam Lee')).toBe('Sam');
    expect(givenNameOf('Linh')).toBe('Linh');
  });
});
