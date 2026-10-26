import { describe, expect, it } from '@jest/globals';

import { DAY_MS, momentAt } from '@phusclass/domain/board';
import { classWordLists } from '@phusclass/voice/class';

import { DEFAULT_QUIET, inQuietHours, planNotes, type NotesInput } from './notes-plan';

const at = (iso: string) => momentAt(Date.parse(iso), 'UTC', 4);

const base: NotesInput = {
  now: at('2026-10-27T08:00:00Z'),
  enabled: true,
  quiet: DEFAULT_QUIET,
  timeSensitive: false,
  language: 'en',
  desk: { id: 'task-1', text: 'Email the landlord', care: 'none', screened: true },
  heavyToday: false,
  careAllows: true,
  fullName: 'Trần Minh Anh',
};

const dayOf = (instant: number) => new Date(instant).toISOString().slice(0, 10);

function perDay(notes: readonly { at: number }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const note of notes) counts[dayOf(note.at)] = (counts[dayOf(note.at)] ?? 0) + 1;
  return counts;
}

describe('notes home', () => {
  it('sends at most three a day, each more pressing, all about the desk task', () => {
    const notes = planNotes(base);
    const today = notes.filter((note) => dayOf(note.at) === '2026-10-27');
    expect(today.map((note) => note.step)).toEqual([1, 2, 3]);
    expect(today.map((note) => note.face)).toEqual(['over', 'crossed', 'ruler']);
    expect(Math.max(...Object.values(perDay(notes)))).toBe(3);
    for (const note of notes) {
      expect(note.body).toContain('Email the landlord');
      expect(note.body).not.toMatch(/\{\w+\}/);
    }
  });

  it('never counts days away or uses a word from the banned list', () => {
    const lists = classWordLists.en;
    const banned = [...lists.banned, ...lists.gap].map((word) =>
      word.toLowerCase().replace('*', ''),
    );
    for (let hour = 0; hour < 24; hour += 1) {
      const notes = planNotes({
        ...base,
        now: at(`2026-10-27T${String(hour).padStart(2, '0')}:00:00Z`),
      });
      for (const note of notes) {
        const words = ` ${note.body.toLowerCase().replace(/[^\p{L}\s']/gu, ' ')} `;
        expect(banned.filter((word) => words.includes(` ${word}`))).toEqual([]);
      }
    }
  });

  it('turns down when ignored, then goes silent', () => {
    expect(perDay(planNotes(base))).toEqual({
      '2026-10-27': 3,
      '2026-10-28': 2,
      '2026-10-29': 1,
    });
    // Nothing is planned three days on: if the app is not opened, he is silent.
    const last = Math.max(...planNotes(base).map((note) => note.at));
    expect(last).toBeLessThan(Date.parse('2026-10-30T00:00:00Z'));
  });

  it('starts again from three when the app is opened the next day', () => {
    const next = planNotes({ ...base, now: at('2026-10-28T08:00:00Z') });
    expect(perDay(next)['2026-10-28']).toBe(3);
  });

  it('keeps quiet hours, and never schedules into the past', () => {
    const evening = planNotes({ ...base, now: at('2026-10-27T15:00:00Z') });
    expect(evening.filter((note) => dayOf(note.at) === '2026-10-27').map((n) => n.step)).toEqual([
      3,
    ]);

    const longQuiet = planNotes({ ...base, quiet: { from: 13 * 60, to: 11 * 60 } });
    for (const note of longQuiet) {
      const minute = (note.at % DAY_MS) / 60000;
      expect(inQuietHours(minute, { from: 13 * 60, to: 11 * 60 })).toBe(false);
    }
    expect(longQuiet.every((note) => new Date(note.at).getUTCHours() === 10)).toBe(true);
  });

  it('sends nothing on a heavy day, about a heavy task, or while care holds the act', () => {
    const heavyDay = planNotes({ ...base, heavyToday: true });
    expect(heavyDay.filter((note) => dayOf(note.at) === '2026-10-27')).toEqual([]);
    expect(
      planNotes({ ...base, careAllows: false }).some((n) => dayOf(n.at) === '2026-10-27'),
    ).toBe(false);
    expect(planNotes({ ...base, desk: { ...base.desk!, care: 'serious' } })).toEqual([]);
    expect(planNotes({ ...base, desk: { ...base.desk!, care: 'crisis' } })).toEqual([]);
  });

  it('says nothing about a task the screen has not cleared, or with notes off or no desk', () => {
    expect(planNotes({ ...base, desk: { ...base.desk!, screened: false } })).toEqual([]);
    expect(planNotes({ ...base, enabled: false })).toEqual([]);
    expect(planNotes({ ...base, desk: null })).toEqual([]);
  });

  it('lets only the third note of a full day through Focus, and only when allowed', () => {
    expect(planNotes(base).some((note) => note.timeSensitive)).toBe(false);
    const allowed = planNotes({ ...base, timeSensitive: true }).filter((n) => n.timeSensitive);
    expect(allowed.map((note) => [dayOf(note.at), note.step])).toEqual([['2026-10-27', 3]]);
  });

  it('leaves out the lines that shout a name it does not know', () => {
    for (let day = 0; day < 40; day += 1) {
      const notes = planNotes({
        ...base,
        fullName: null,
        desk: { ...base.desk!, id: `task-${day}` },
      });
      for (const note of notes) expect(note.body).not.toContain('{NAME}');
    }
  });
});
