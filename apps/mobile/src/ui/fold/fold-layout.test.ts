import { describe, expect, it } from '@jest/globals';

import { boardIsPage, DUO, foldLayout, foldPose, type FoldReading } from './fold-layout';

const outer = DUO.outer;
const inner = DUO.inner;
const portrait = { width: inner.height, height: inner.width };
const none = { top: 0, right: 0, bottom: 0, left: 0 };
const flat: FoldReading = { status: 'open', angle: 180, division: null };
const half: FoldReading = {
  status: 'partial',
  angle: 110,
  division: { x: 451, y: 0, width: 49, height: inner.height },
};

describe('which pose the phone is in', () => {
  it('is a phone on any other iPhone, with or without the hinge module', () => {
    expect(foldPose({ width: 402, height: 874 }, { width: 402, height: 874 }, null)).toBe('phone');
    expect(
      foldPose(
        { width: 402, height: 874 },
        { width: 402, height: 874 },
        {
          status: 'none',
          angle: 0,
          division: null,
        },
      ),
    ).toBe('phone');
  });

  it('reads the outer display as closed, by its size alone', () => {
    expect(foldPose(outer, outer, null)).toBe('closed');
  });

  it('tells flat from half open in landscape only by the hinge', () => {
    expect(foldPose(inner, inner, flat)).toBe('open');
    expect(foldPose(inner, inner, half)).toBe('book');
    // A binary without the module still opens; it cannot know the fold.
    expect(foldPose(inner, inner, null)).toBe('open');
  });

  it('stands in portrait, and splits beside another app', () => {
    expect(foldPose(portrait, portrait, half)).toBe('stand');
    expect(foldPose({ width: 475, height: inner.height }, inner, flat)).toBe('split');
  });
});

describe('where everything sits', () => {
  it('leaves a phone to its own layout', () => {
    const layout = foldLayout({ width: 402, height: 874 }, { width: 402, height: 874 }, null, none);
    expect(layout.sheet).toBeNull();
    expect(layout.controls).toBeNull();
  });

  it('floats the card clear of the trailing column when closed', () => {
    const layout = foldLayout(outer, outer, null, none);
    expect(layout.controls).toBe('trailing');
    expect(layout.sheet).toEqual({
      left: DUO.gap,
      width: outer.width - DUO.column - DUO.gap * 2,
      bottom: DUO.gap,
      top: null,
      floating: true,
    });
  });

  it('keeps both pages out of the fold when half open', () => {
    const layout = foldLayout(inner, inner, half, none);
    const page = layout.boardPage;
    const sheet = layout.sheet;
    expect(page && page.x + page.width).toBeLessThanOrEqual(451);
    expect(sheet && sheet.left).toBeGreaterThanOrEqual(500);
    expect(sheet && sheet.left + sheet.width).toBeLessThanOrEqual(inner.width - DUO.column);
    expect(boardIsPage(layout.pose)).toBe(true);
  });

  it('puts the room above the fold and the work below it in the stand', () => {
    const division = { x: 0, y: 451, width: portrait.width, height: 49 };
    const layout = foldLayout(portrait, portrait, { ...half, division }, none);
    expect(layout.room.height).toBe(451);
    expect(layout.sheet?.top).toBe(500);
    expect(layout.controls).toBe('bottom');
    expect(boardIsPage(layout.pose)).toBe(false);
  });

  it('moves the controls to the outer edge beside another app', () => {
    const layout = foldLayout({ width: 475, height: inner.height }, inner, flat, {
      top: 0,
      right: 0,
      bottom: 0,
      left: 58,
    });
    expect(layout.controls).toBe('leading');
    expect(layout.sheet?.left).toBe(DUO.column + DUO.gap);
  });
});
