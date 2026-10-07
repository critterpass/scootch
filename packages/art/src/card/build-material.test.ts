import { describe, expect, it } from 'vitest';

import { CARD_FINISH_IDS } from '@scootch/domain';

import { toSvg } from '../backends/svg';
import type { DrawCommand } from '../core/commands';
import {
  buildMaterial,
  buildMaterialParts,
  CARD_MATERIALS,
  materialShift,
} from './build-material';

const FACE = { x: 10, y: 20, w: 214, h: 298 };
const kinds = (commands: readonly DrawCommand[]): string[] => commands.map((one) => one.op);

describe('a finish as a material', () => {
  it('has a material for every finish of the contract, and no other', () => {
    expect(Object.keys(CARD_MATERIALS).sort()).toEqual([...CARD_FINISH_IDS].sort());
  });

  it('builds every finish, with something for the stock and something for the light', () => {
    for (const finish of CARD_FINISH_IDS) {
      const parts = buildMaterialParts(FACE, 22, CARD_MATERIALS[finish]);
      expect(parts.base.length, finish).toBeGreaterThan(0);
      expect(parts.sheen.length, finish).toBeGreaterThan(0);
      expect(parts.glare, finish).toHaveLength(1);
    }
  });

  it('keeps every gradient stop in order and inside the gradient', () => {
    for (const finish of CARD_FINISH_IDS) {
      for (const command of buildMaterial(FACE, 22, CARD_MATERIALS[finish])) {
        if (command.op !== 'paint' || command.paint.kind === 'grain') continue;
        const offsets = command.paint.stops.map(([offset]) => offset);
        expect(offsets, finish).toEqual([...offsets].sort((a, b) => a - b));
        expect(Math.min(...offsets), finish).toBeGreaterThanOrEqual(0);
        expect(Math.max(...offsets), finish).toBeLessThanOrEqual(1);
      }
    }
  });

  it('slides the light with the lean and changes nothing else', () => {
    for (const finish of CARD_FINISH_IDS) {
      const level = buildMaterial(FACE, 22, CARD_MATERIALS[finish]);
      const leant = buildMaterial(FACE, 22, CARD_MATERIALS[finish], { lean: { rx: 6, ry: -9 } });
      expect(kinds(leant), finish).toEqual(kinds(level));
      expect(leant, finish).not.toEqual(level);
      const changed = leant.filter(
        (command, index) => JSON.stringify(command) !== JSON.stringify(level[index]),
      );
      expect(new Set(kinds(changed)), finish).toEqual(new Set(['transform']));
    }
  });

  it('slides the sheen twice as far as the glare, the other way, as the board does', () => {
    const shift = materialShift(FACE, { rx: 0, ry: 10 });
    expect(shift.glare[0]).toBeCloseTo(FACE.w * 0.26);
    expect(shift.sheen[0]).toBeCloseTo(-2 * FACE.w * 0.26);
    expect(materialShift(FACE, { rx: 0, ry: 0 })).toEqual({ sheen: [-0, 0], glare: [0, -0] });
  });

  it('keeps sparkle and halftone the same size in points on a larger drawing', () => {
    const count = (unit: number) =>
      buildMaterialParts(
        { x: 0, y: 0, w: 100 * unit, h: 100 * unit },
        10 * unit,
        CARD_MATERIALS.holo,
        unit,
      ).over.flatMap((command) => (command.op === 'fill' ? command.path : [])).length;
    expect(count(3)).toBe(count(1));
  });

  it('prints as a standalone picture, grain and blends included', () => {
    const svg = toSvg(buildMaterial(FACE, 22, CARD_MATERIALS.holo), { width: 240, height: 340 });
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('feTurbulence');
    expect(svg).toContain('mix-blend-mode:soft-light');
    expect(toSvg(buildMaterial(FACE, 22, CARD_MATERIALS.flock))).toContain('<radialGradient');
  });
});
