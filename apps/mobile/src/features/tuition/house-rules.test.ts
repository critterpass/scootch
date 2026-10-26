import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { momentAt, MINUTE_MS, tuitionNoticeDue } from '@phusclass/domain/board';

import { noticeUp, OFFERED_FROM } from './notice-rules';

const SRC = join(__dirname, '..', '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') ? [path] : [];
  });
}

/** Files that send a person to the receipt. */
function offeringFiles(): string[] {
  return sources(SRC)
    .filter((path) => /['"]\/tuition['"]/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path));
}

describe('the house rules: paid things never interrupt', () => {
  it('offers tuition only from the notice at recess and the quiet locks', () => {
    const offering = offeringFiles();
    expect(offering.map((path) => basename(path)).sort()).toEqual([...OFFERED_FROM].sort());
  });

  it('has no way to the receipt in first launch, on the desk, in a session or at a finish', () => {
    const forbidden = ['first-day', 'desk', 'session', 'composer', 'slip', 'care'];
    for (const path of offeringFiles()) {
      for (const place of forbidden) expect(path.split('/')).not.toContain(place);
    }
    // The desk carries the notice only as a slot, drawn at recess: it never names the receipt.
    const desk = readFileSync(join(SRC, 'features/desk/desk-view.tsx'), 'utf8');
    expect(desk).toContain('props.notice');
    expect(desk).not.toMatch(/['"]\/tuition/);
  });

  const at = (minutes: number) =>
    momentAt(Date.parse('2026-10-27T02:00:00Z') + minutes * MINUTE_MS, 'Asia/Ho_Chi_Minh');
  const due = (
    finishes: number,
    atRecess: boolean,
    over: { heavyToday?: boolean; enrolled?: boolean } = {},
  ) =>
    tuitionNoticeDue({
      now: at(finishes * 20),
      finishes,
      atRecess,
      heavyToday: over.heavyToday ?? false,
      enrolled: over.enrolled ?? false,
      lastPinnedAt: null,
    });

  it('comes after the third finish, at the next recess, and not at the finish itself', () => {
    expect(due(1, true)).toBe(false);
    expect(due(2, true)).toBe(false);
    expect(due(3, false)).toBe(false);
    expect(due(3, true)).toBe(true);
  });

  it('never comes on a day with something heavy in it, or to someone already enrolled', () => {
    expect(due(3, true, { heavyToday: true })).toBe(false);
    expect(due(9, true, { enrolled: true })).toBe(false);
  });

  it('stays up for the recess it was pinned at, and is gone when that recess ends', () => {
    const recess = { endsAt: 1_000, leftMs: 200 };
    expect(noticeUp({ recess }, 1_000)).toBe(true);
    expect(noticeUp({ recess: null }, 1_000)).toBe(false);
    expect(noticeUp({ recess: { endsAt: 9_000, leftMs: 300 } }, 1_000)).toBe(false);
    expect(noticeUp({ recess }, null)).toBe(false);
  });
});
