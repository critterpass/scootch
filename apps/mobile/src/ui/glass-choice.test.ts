import { describe, expect, it } from '@jest/globals';

import { glassDraw, pressOwner } from './glass-choice';

describe('how a glass surface is drawn', () => {
  it("draws the system's glass only where the design and its effect classes are both there", () => {
    expect(glassDraw({ liquidGlass: true, glassApi: true })).toBe('liquid');
  });

  it('falls back before iOS 26, and where the app opted out of the design', () => {
    expect(glassDraw({ liquidGlass: false, glassApi: false })).toBe('fallback');
    expect(glassDraw({ liquidGlass: false, glassApi: true })).toBe('fallback');
  });

  it('falls back on a system that has the design but not the effect, so nothing can crash', () => {
    expect(glassDraw({ liquidGlass: true, glassApi: false })).toBe('fallback');
  });
});

describe('who answers a press', () => {
  it("leaves an interactive control on the system's glass to the glass", () => {
    expect(pressOwner('liquid', true)).toBe('glass');
  });

  it('keeps the press spring for a surface that is not itself pressed, such as a dock', () => {
    expect(pressOwner('liquid', false)).toBe('spring');
  });

  it('keeps the press spring on the fallback, where nothing else would move', () => {
    expect(pressOwner('fallback', true)).toBe('spring');
    expect(pressOwner('fallback', false)).toBe('spring');
  });
});
