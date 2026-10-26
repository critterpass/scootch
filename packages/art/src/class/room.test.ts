import { describe, expect, it } from 'vitest';

import { addCarving, carvingSpot, carvingsLayer, YOUR_DESK, type Carving } from './carvings';
import { findLayer, layers, type TextItem } from './figure';
import { clampCamera, framing, MIN_CAMERA_WIDTH } from './camera';
import { room, ROOM_SIZE } from './room';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1600, height: 1000 };

describe('the camera', () => {
  it('stays inside the room', () => {
    expect(clampCamera({ x: -300, y: -50, w: 800 }, WIDE)).toEqual({ x: 0, y: 0, w: 800, h: 500 });
    expect(clampCamera({ x: 1500, y: 900, w: 800 }, WIDE)).toEqual({
      x: 800,
      y: 500,
      w: 800,
      h: 500,
    });
  });

  it('is never wider than the room, nor closer than its nearest', () => {
    expect(clampCamera({ x: 0, y: 0, w: 5000 }, WIDE).w).toBe(ROOM_SIZE.width);
    expect(clampCamera({ x: 0, y: 0, w: 10 }, WIDE).w).toBe(MIN_CAMERA_WIDTH);
  });

  it('holds a view taller than the room against the ceiling', () => {
    const view = clampCamera({ x: 400, y: 300, w: 780 }, PHONE);
    expect(view.h).toBeGreaterThan(ROOM_SIZE.height);
    expect(view.y).toBe(0);
    expect(view.x).toBe(400);
  });

  it('survives a camera that is not a number', () => {
    const view = clampCamera({ x: Number.NaN, y: Number.POSITIVE_INFINITY, w: Number.NaN }, WIDE);
    expect(view).toEqual({ x: 0, y: 0, w: 1600, h: 1000 });
  });

  it('frames the desk close, the session wide and recess further back', () => {
    const desk = clampCamera(framing('desk', PHONE), PHONE);
    const session = clampCamera(framing('session', PHONE), PHONE);
    const recess = clampCamera(framing('recess', PHONE), PHONE);
    expect(desk).toMatchObject({ x: 605, y: 0, w: 390 });
    expect(session.w).toBeGreaterThan(desk.w);
    expect(recess.w).toBeGreaterThan(session.w);
    for (const v of [desk, session, recess]) {
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x + v.w).toBeLessThanOrEqual(ROOM_SIZE.width);
    }
  });

  it('room() clamps the camera it is given', () => {
    const scene = room({ viewport: PHONE, camera: { x: -100, y: -100, w: 390 } });
    expect(scene.camera).toMatchObject({ x: 0, y: 0 });
  });
});

describe('the phone room', () => {
  it('keeps the App board shots on a phone, wide ones sitting where the board puts them', () => {
    const session = clampCamera(framing('session', PHONE), PHONE, 'phone');
    const recess = clampCamera(framing('recess', PHONE), PHONE, 'phone');
    expect(session).toMatchObject({ x: 410, y: 40, w: 780 });
    expect(recess.x).toBeCloseTo(380, 0);
    expect(recess.y).toBe(10);
  });

  it('never looks past the floor under the desk sheet', () => {
    expect(clampCamera({ x: 0, y: 5000, w: 390 }, PHONE, 'phone').y).toBe(2100 - 844);
  });

  it('draws the App board room: benches, your paper and pen, no notice board', () => {
    const phone = room({ viewport: PHONE, camera: framing('desk', PHONE), composition: 'phone' });
    const wide = room({ viewport: PHONE, camera: framing('desk', PHONE) });
    const markup = (scene: ReturnType<typeof room>, id: string) =>
      JSON.stringify(findLayer(scene.figure, id));
    expect(markup(phone, 'desks')).toContain('#B07A45');
    expect(markup(phone, 'desks')).toContain('#E8322B');
    expect(markup(wide, 'desks')).not.toContain('#B07A45');
    expect(markup(phone, 'back')).not.toContain('#D9A066');
    expect(markup(wide, 'back')).toContain('#D9A066');
    expect(phone.figure.height).toBe(1100);
  });

  it('turns him to face the way he walks while he paces on a phone', () => {
    const scene = room({
      viewport: PHONE,
      camera: framing('session', PHONE),
      composition: 'phone',
      pace: true,
    });
    expect(findLayer(scene.figure, 'phu.place')?.motion).toBe('paceWide');
  });

  it('carves the ends of your desk first, clear of the paper', () => {
    for (let i = 0; i < 6; i += 1) {
      const { x } = carvingSpot(i);
      expect(x < 740 || x > 870).toBe(true);
    }
  });
});

const texts = (id: string, scene: ReturnType<typeof room>): TextItem[] => {
  const layer = findLayer(scene.figure, id);
  return layer ? layer.pieces.flatMap((p) => (p.kind === 'text' ? [p.item] : [])) : [];
};

describe('the room', () => {
  const base = { viewport: PHONE, camera: framing('desk', PHONE) };

  it('writes the chalk lines in order, the first underlined and the rest fading', () => {
    const scene = room({ ...base, date: 'Monday 26', chalk: ['One', 'Two', 'Three'] });
    const lines = texts('chalk', scene);
    expect(lines.map((t) => t.text)).toEqual(['Monday 26', 'One', 'Two', 'Three']);
    expect(lines[1]?.underline).toBeDefined();
    expect(lines[2]!.opacity).toBeGreaterThan(lines[3]!.opacity);
    expect(lines.map((t) => t.y)).toEqual([...lines.map((t) => t.y)].sort((a, b) => a - b));
  });

  it('takes the chalkboard and its writing off the wall', () => {
    const scene = room({ ...base, board: 'off', chalk: ['One'] });
    const ids = [...layers(scene.figure.root)].map((l) => l.id);
    expect(ids).toContain('board.off');
    expect(ids).not.toContain('board.on');
    expect(ids).not.toContain('chalk');
  });

  it('paces him only when asked', () => {
    expect(findLayer(room(base).figure, 'phu.place')?.motion).toBeUndefined();
    expect(findLayer(room({ ...base, pace: true }).figure, 'phu.place')?.motion).toBe('pace');
  });

  it('darkens around the lamp in the evening', () => {
    expect(findLayer(room(base).figure, 'lamp')).toBeUndefined();
    const lit = room({ ...base, lamp: true });
    expect(findLayer(lit.figure, 'lamp')).toBeDefined();
    expect(lit.figure.defs).toContain('rmLamp');
  });

  it('puts the class and banner the caller gives on the wall', () => {
    const back = texts('back', room({ ...base, plate: '12B', banner: 'TIÊN HỌC LỄ, HẬU HỌC VĂN' }));
    expect(back.map((t) => t.text)).toEqual(['12B', 'TIÊN HỌC LỄ, HẬU HỌC VĂN']);
  });
});

describe('desk carvings', () => {
  const marks: Carving[] = [
    { kind: 'star' },
    { kind: 'initials', text: 'M.A' },
    { kind: 'heart' },
    { kind: 'ten' },
  ];

  it('are kept in the order they were carved, and never removed', () => {
    let list: readonly Carving[] = [];
    for (const mark of marks) list = addCarving(list, mark);
    expect(list).toEqual(marks);
    const before = list;
    const after = addCarving(list, { kind: 'phu' });
    expect(before).toHaveLength(4);
    expect(after.slice(0, 4)).toEqual(before);
  });

  it('never move an old mark when a new one is carved', () => {
    const layerOf = (list: readonly Carving[]) => carvingsLayer(list).pieces;
    const short = layerOf(marks);
    const long = layerOf([...marks, ...marks, ...marks]);
    expect(long.slice(0, short.length)).toEqual(short);
  });

  it('draw every mark, oldest first', () => {
    const many = Array.from({ length: 120 }, (_, i): Carving =>
      i % 2 ? { kind: 'star' } : { kind: 'heart' },
    );
    const pieces = carvingsLayer(many).pieces;
    expect(pieces).toHaveLength(120);
    expect(pieces.map((p) => (p.kind === 'layer' ? p.layer.id : ''))).toEqual(
      many.map((_, i) => `carving.${i + 1}`),
    );
  });

  it('sit on your desk top', () => {
    const top = YOUR_DESK.y - YOUR_DESK.top;
    for (let i = 0; i < 200; i += 1) {
      const spot = carvingSpot(i);
      expect(spot.y).toBeGreaterThan(top + 12);
      expect(spot.y).toBeLessThanOrEqual(YOUR_DESK.y);
      expect(spot.x).toBeGreaterThan(YOUR_DESK.x + YOUR_DESK.inset);
      expect(spot.x + 16).toBeLessThan(YOUR_DESK.x + YOUR_DESK.width - YOUR_DESK.inset);
    }
  });

  it('need the letters for initials', () => {
    expect(() => addCarving([], { kind: 'initials' })).toThrow();
    expect(() => addCarving([], { kind: 'initials', text: '  ' })).toThrow();
  });
});
