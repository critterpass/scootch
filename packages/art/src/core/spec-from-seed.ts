import { MONSTER_BODIES, seededRoll } from './build-monster';
import { COMMON_INKS } from './inks';
import type { MonsterBodyType, MonsterInk, MonsterSpec } from './spec';

const HATCH_MOUTHS = ['smile', 'zigzag', 'fangs', 'gape', 'flat'] as const;

function pick<T>(list: readonly T[], roll: number, fallback: T): T {
  return list[Math.floor(roll * list.length)] ?? fallback;
}

/**
 * The spec a monster hatches with: the body comes from the task, everything else is rolled from
 * the seed within what that body allows (its inks, its legs, whether its top is free).
 */
export function specFromSeed(bodyType: MonsterBodyType, seed: string): MonsterSpec {
  const body = MONSTER_BODIES[bodyType];
  const roll = seededRoll(seed);
  const ink: MonsterInk = pick(body.inks ?? COMMON_INKS, roll(11), 'charcoal');
  const count = body.eyes ?? ((1 + Math.floor(roll(2) * 3)) as 1 | 2 | 3);
  const stalks = count <= 2 && body.tops && roll(17) > 0.8;
  const mismatched = count === 2 && roll(16) > 0.62;
  const top = body.tops ? Math.floor(roll(15) * 5) : 0;
  return {
    bodyType,
    seed,
    ink,
    size: 1,
    eyes: { count, style: stalks ? 'stalks' : mismatched ? 'mismatched' : 'matched' },
    mouth: pick(HATCH_MOUTHS, roll(14), 'flat'),
    horns: top === 1 ? 'short' : 'none',
    antennae: top === 2 ? 1 : top === 3 ? 3 : 0,
    legs: body.legs,
  };
}
