import { describe, expect, it } from 'vitest';

import { checkClassLine, placeholdersIn } from './check';
import { fillLine, linePacks } from './choose';
import { moments, type ClassLanguage } from './types';

const languages: readonly ClassLanguage[] = ['en', 'vi'];

describe('the shared note home', () => {
  it.each(languages)('only the %s note home counts how long a task waited', (language) => {
    for (const moment of moments) {
      const lines = linePacks[language][moment] as readonly string[];
      const counts = lines.some((line) => placeholdersIn(line).includes('waited'));
      expect([moment, counts]).toEqual([moment, moment === 'shareNoteWaited']);
    }
  });

  it.each(languages)('every %s line passes his checks', (language) => {
    for (const moment of ['shareNoteDone', 'shareNoteWaited', 'shareNoteSameDay'] as const) {
      for (const line of linePacks[language][moment]) {
        expect(checkClassLine(line, language).reasons).toEqual([]);
      }
    }
  });

  it.each(languages)('the %s note names the student and the task, and nothing else', (language) => {
    for (const line of linePacks[language].shareNoteDone) {
      expect(placeholdersIn(line).sort()).toEqual(['name', 'task']);
    }
    for (const line of linePacks[language].shareNoteSameDay) {
      expect(placeholdersIn(line)).toEqual([]);
    }
  });

  it('reads as the brief writes it, once filled', () => {
    const done = fillLine(linePacks.en.shareNoteDone[0], {
      name: 'Trần Minh Anh',
      task: 'Email the dentist',
    });
    const waited = fillLine(linePacks.en.shareNoteWaited[0], { waited: 'nine days' });
    expect(`${done} ${waited}`).toBe(
      'Dear parents of Trần Minh Anh. Today your child did this: Email the dentist. ' +
        'It had waited nine days. I have no complaints at this time.',
    );
  });
});
