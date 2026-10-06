import { describe, expect, it } from 'vitest';

import {
  MONSTER_BODY_TYPE_IDS,
  monsterSpecSchema,
  type MonsterSpec,
} from '../../../domain/src/contracts/art';
import { toSvg } from '../backends/svg';
import { buildMonster, MONSTER_BODIES } from './build-monster';
import { hash } from './rng';
import { specFromSeed } from './spec-from-seed';

const spec: MonsterSpec = {
  bodyType: 'envelope',
  seed: 'council',
  ink: 'plum',
  size: 1,
  eyes: { count: 2, style: 'mismatched' },
  mouth: 'smile',
  horns: 'short',
  antennae: 0,
  legs: 'stick',
};

describe('buildMonster', { timeout: 60_000 }, () => {
  it('gives identical commands for the same spec', () => {
    expect(buildMonster(spec)).toEqual(buildMonster({ ...spec, eyes: { ...spec.eyes } }));
    expect(toSvg(buildMonster(spec))).toBe(toSvg(buildMonster(spec)));
  });

  it('gives 200 distinct drawings for 200 random specs', () => {
    const drawings = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const bodyType = MONSTER_BODY_TYPE_IDS[Math.floor(hash(i) * MONSTER_BODY_TYPE_IDS.length)]!;
      const hatched = specFromSeed(bodyType, `task-${Math.floor(hash(i + 1000) * 1e9)}`);
      expect(monsterSpecSchema.safeParse(hatched).success).toBe(true);
      drawings.add(JSON.stringify(buildMonster(hatched)));
    }
    expect(drawings.size).toBe(200);
  });

  it('builds every body of the contract', () => {
    expect(Object.keys(MONSTER_BODIES).sort()).toEqual([...MONSTER_BODY_TYPE_IDS].sort());
    for (const bodyType of MONSTER_BODY_TYPE_IDS) {
      expect(buildMonster({ ...spec, bodyType }).length, bodyType).toBeGreaterThan(10);
      expect(buildMonster(specFromSeed(bodyType, 'any task')).length, bodyType).toBeGreaterThan(10);
    }
  });

  it('has the contract reject an unknown body', () => {
    expect(monsterSpecSchema.safeParse({ ...spec, bodyType: 'dragon' }).success).toBe(false);
    expect(monsterSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('changes nothing but the scale when the size changes', () => {
    const full = buildMonster(spec);
    const small = buildMonster({ ...spec, size: 0.5 });
    expect(full[1]).toEqual({ op: 'transform', matrix: [1, 0, 0, 1, 0, 0] });
    expect(small[1]).toEqual({ op: 'transform', matrix: [0.5, 0, 0, 0.5, 50, 87] });
    expect(small.toSpliced(1, 1)).toEqual(full.toSpliced(1, 1));
    // The size factor stacks on the stored size, for drawing a shrink step before it is saved.
    expect(buildMonster(spec, 0.5)).toEqual(small);
    expect(buildMonster({ ...spec, size: 0.5 }, 0.5)[1]).toEqual({
      op: 'transform',
      matrix: [0.25, 0, 0, 0.25, 75, 130.5],
    });
  });
});
