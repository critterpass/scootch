import { describe, expect, it } from 'vitest';

import { findLayer, layers, toSvg, type Figure } from './figure';
import { parseMarkup } from './markup';
import { sampleLoop } from './loop-sample';
import { LOOPS } from './motion';
import { blinking, buildPhu, canBlink, phuPose, PHU_MOODS, pressureMood } from './phu';
import { buildProp, PROP_NAMES } from './props';
import { room } from './room';

const ids = (figure: Figure) => [...layers(figure.root)].map((l) => l.id);

describe('Thầy Phú', () => {
  it.each(PHU_MOODS)('builds the %s pose from one part of each family', (mood) => {
    const pose = phuPose(mood);
    const figure = buildPhu(pose);
    const all = ids(figure);
    for (const id of [
      'feet.left',
      'feet.right',
      'body',
      'head',
      'eyes',
      'mouth',
      'mustache',
      'arms',
    ]) {
      expect(all.filter((x) => x === id)).toHaveLength(1);
    }
    expect(all).toContain(`arms.${pose.arms.toLowerCase()}`);
    expect(all.filter((x) => x.startsWith('arms.'))).toHaveLength(1);
    expect(all.includes('glasses')).toBe(pose.glasses !== 'None');
    const svg = toSvg(figure);
    expect(svg).not.toContain('{{');
    expect(() => parseMarkup(svg)).not.toThrow();
  });

  it('never grows bigger than a small puff, however angry', () => {
    for (const mood of PHU_MOODS) expect(phuPose(mood).puff).toBeLessThanOrEqual(1.06);
  });

  it('puffs and tilts his head about his neck', () => {
    const head = findLayer(buildPhu(phuPose('name')), 'head');
    expect(head?.matrix?.[0]).toBeCloseTo(1.06);
    expect(head?.pivot).toEqual([100, 128]);
  });

  it('takes his glasses off in serious mode, with no act on him', () => {
    const pose = phuPose('serious');
    expect(pose.glasses).toBe('None');
    expect(pose.effects).toEqual([]);
    expect(pose.red).toBe(0);
    expect(canBlink(pose)).toBe(false);
  });

  it('blinks by closing the eyes only, and not behind the glint', () => {
    expect(blinking(phuPose('calm')).lens).toBe('Shut');
    expect(blinking(phuPose('over')).above).toBe('Closed');
    expect(canBlink(phuPose('stare'))).toBe(false);
    const open = buildPhu(phuPose('calm'));
    const shut = buildPhu(blinking(phuPose('calm')));
    expect(toSvg(shut)).not.toBe(toSvg(open));
    expect(JSON.stringify(findLayer(shut, 'mouth'))).toBe(JSON.stringify(findLayer(open, 'mouth')));
  });
});

describe('the pressure ladder', () => {
  it('maps steps 0 to 5 as the brief says', () => {
    expect([0, 1, 2, 3, 4, 5].map(pressureMood)).toEqual([
      'calm',
      'over',
      'crossed',
      'ruler',
      'name',
      'stare',
    ]);
  });

  it('draws each step as the brief describes him', () => {
    const step = (n: number) => phuPose(pressureMood(n));
    // 0: looks up
    expect(step(0).glasses).toBe('Up');
    expect(step(0).lens).toBe('Open');
    // 1: sips tea over his glasses
    expect(step(1).glasses).toBe('Down');
    expect(step(1).arms).toBe('Tea');
    // 2: arms crossed
    expect(step(2).arms).toBe('Crossed');
    // 3: taps the ruler
    expect(step(3).arms).toBe('Ruler');
    expect(ids(buildPhu(step(3)))).toEqual(expect.arrayContaining(['ruler', 'ruler.tap']));
    // 4: puffed and pink (the chalk flies from the app)
    expect(step(4).red).toBeGreaterThan(0);
    expect(step(4).effects).toContain('steam');
    expect(step(4).puff).toBe(Math.max(...[0, 1, 2, 3, 4, 5].map((n) => step(n).puff)));
    // 5: silence, white glare
    expect(step(5).lens).toBe('Glint');
    expect(step(5).mouth).toBe('Flat');
  });

  it('holds out-of-range steps to the ends', () => {
    expect(pressureMood(-2)).toBe('calm');
    expect(pressureMood(9)).toBe('stare');
    expect(pressureMood(Number.NaN)).toBe('calm');
    expect(pressureMood(2.4)).toBe('crossed');
  });
});

describe('moving layers', () => {
  it('only name loops that exist', () => {
    const figures: Figure[] = [
      ...PHU_MOODS.map((m) => buildPhu(phuPose(m))),
      ...PROP_NAMES.map(buildProp),
      room({ viewport: { width: 390, height: 844 }, camera: { x: 0, y: 0, w: 1600 }, pace: true })
        .figure,
    ];
    for (const figure of figures) {
      for (const layer of layers(figure.root)) {
        if (layer.motion) expect(LOOPS).toHaveProperty(layer.motion);
      }
    }
  });
});

describe('loops', () => {
  it('pace him across the front as the Room board does', () => {
    expect(sampleLoop(LOOPS.pace, 0).x).toBeCloseTo(-170);
    expect(sampleLoop(LOOPS.pace, 4500).x).toBeCloseTo(170);
    expect(sampleLoop(LOOPS.pace, 5000).x).toBeCloseTo(170);
    expect(sampleLoop(LOOPS.pace, 10000).x).toBeCloseTo(-170);
  });

  it('start the second pair of cat legs half a stride later', () => {
    expect(sampleLoop(LOOPS.legA, 0).rotate).toBeCloseTo(16);
    expect(sampleLoop(LOOPS.legB, 0).rotate).toBeCloseTo(-16);
  });

  it('tick the clock in whole seconds', () => {
    expect(sampleLoop(LOOPS.clockTick, 1500).rotate).toBeCloseTo(6);
  });
});

describe('props', () => {
  it.each(PROP_NAMES)('builds the %s', (name) => {
    const figure = buildProp(name);
    expect(figure.width).toBeGreaterThan(0);
    expect(() => parseMarkup(toSvg(figure))).not.toThrow();
  });

  it('gives the cat four legs, a tail and a head that move', () => {
    const cat = ids(buildProp('cat'));
    expect(cat).toEqual(
      expect.arrayContaining(['legA.1', 'legA.2', 'legB.1', 'legB.2', 'tail.1', 'head.1']),
    );
    // The board turns a leg about 50% 8% of its box: x 47..59, y 62..94.
    const leg = findLayer(buildProp('cat'), 'legB.1');
    expect(leg?.pivot).toEqual([53, 64.56]);
  });

  it('keeps the thermos steam, which starts invisible, for its loop', () => {
    const steam = findLayer(buildProp('thermos'), 'steam.1');
    expect(steam?.opacity).toBe(0);
  });

  it('draws the armband words as text, not SVG', () => {
    const band = buildProp('armband');
    const texts = [...layers(band.root)].flatMap((l) => l.pieces.filter((p) => p.kind === 'text'));
    expect(texts).toHaveLength(1);
  });
});
