import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { languages } from '@scootch/i18n';
import { offlinePacks } from '@scootch/voice';

import { screenStates } from '../../screens/registry/support/all-states';

const FEATURE = __dirname;

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** The file without its comments, where words about behaviour are allowed. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const files = [...sourceFiles(FEATURE), path.join(FEATURE, '../../app/session.tsx')];
const screens = files.filter((file) => file.endsWith('.tsx'));

describe('what the session screens say', () => {
  it('writes no words of its own between tags: text comes from the catalogue or the store', () => {
    expect(screens.length).toBeGreaterThan(8);
    for (const file of screens) {
      const words = [...code(file).matchAll(/>\s*([^<>{}=()]*[A-Za-z]{2,}[^<>{}=()]*)\s*<\//g)]
        .map((match) => match[1]?.trim())
        .filter(Boolean);
      expect({ file: path.basename(file), words }).toEqual({
        file: path.basename(file),
        words: [],
      });
    }
  });

  it('labels every control from the catalogue, never from a string in the file', () => {
    for (const file of screens) {
      const literal = [
        ...code(file).matchAll(
          /\b(?:label|hint|accessibilityLabel|accessibilityHint|placeholder)=(?:["'`]|\{\s*["'`])\s*[A-Za-z]/g,
        ),
      ].map((match) => match[0]);
      expect({ file: path.basename(file), literal }).toEqual({
        file: path.basename(file),
        literal: [],
      });
    }
  });

  it('holds none of the lines Scootch speaks', () => {
    const spoken = languages.flatMap((language) => {
      const pack = offlinePacks[language];
      const plain = Object.values(pack.plain).flat();
      const voiced = Object.values(pack.lines).flatMap((lines) => Object.values(lines).flat());
      return [...plain, ...voiced];
    });
    expect(spoken.length).toBeGreaterThan(40);
    for (const file of files) {
      const source = code(file);
      const found = spoken.filter((line) => source.includes(line));
      expect({ file: path.basename(file), found }).toEqual({
        file: path.basename(file),
        found: [],
      });
    }
  });
});

describe('the session in the screen registry', () => {
  const session = screenStates.filter((state) => state.id.startsWith('session-'));

  it('registers every state the session can be in', () => {
    expect(session.map((state) => state.id).sort()).toEqual([
      'session-caught',
      'session-finish-tap-twice',
      'session-hold-to-finish',
      'session-not-finished',
      'session-park-a-thought',
      'session-parked-thoughts',
      'session-quiet',
      'session-quiet-done',
      'session-released-early',
      'session-running',
      'session-start-burst',
      'session-stuck-help',
      'session-thought-parked',
      'session-treat',
      'session-two-minutes-left',
    ]);
  });

  it('captures each one in both languages at the largest text size, with a design or a reason', () => {
    for (const state of session) {
      for (const language of languages) {
        const largest = state.variants.some(
          (variant) => variant.language === language && variant.textSize === 'largest',
        );
        expect({ id: state.id, language, largest }).toEqual({
          id: state.id,
          language,
          largest: true,
        });
      }
      const explained = state.design !== null || (state.undesignedReason ?? '').trim().length > 20;
      expect({ id: state.id, explained }).toEqual({ id: state.id, explained: true });
    }
  });
});
