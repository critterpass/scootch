import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { languages } from '@scootch/i18n';

import { captures, screenStates } from './support/all-states';

interface DesignScreen {
  readonly board: string;
  readonly section: string;
  readonly screen: string;
}

const designScreens = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../../../design/screens.json'), 'utf8'),
) as DesignScreen[];

describe('the screen registry', () => {
  it('registers every file in the folder', () => {
    const files = readdirSync(__dirname).filter(
      (name) => /\.tsx?$/.test(name) && !/^index\.|\.test\.tsx?$/.test(name),
    );
    expect(files.length).toBeGreaterThan(0);
    expect(screenStates).toHaveLength(files.length);
  });

  it('gives every state its own id, safe to use in a file name', () => {
    const ids = screenStates.map((state) => state.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('points every state at a designed screen, or says why it has none', () => {
    for (const state of screenStates) {
      const design = state.design;
      if (design === null) {
        expect({ id: state.id, reason: state.undesignedReason?.trim() ?? '' }).not.toEqual({
          id: state.id,
          reason: '',
        });
        continue;
      }
      const matches = designScreens.filter(
        (screen) =>
          screen.board === design.board &&
          screen.section === design.section &&
          screen.screen === design.screen,
      );
      expect({ id: state.id, designsFound: matches.length }).toEqual({
        id: state.id,
        designsFound: 1,
      });
    }
  });

  it('captures every state in every language', () => {
    for (const state of screenStates) {
      const captured = new Set(state.variants.map((variant) => variant.language));
      expect({ id: state.id, languages: [...captured].sort() }).toEqual({
        id: state.id,
        languages: [...languages].sort(),
      });
    }
  });

  it('names every capture once', () => {
    const names = captures.map((capture) => capture.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
