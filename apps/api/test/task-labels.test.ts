import { MONSTER_BODY_TYPE_IDS, type MonsterBodyType } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import { bodyFrom, bodyTypeQuestion, genericBody } from '../src/ai/task-create/labels';

/** An answer with the given probabilities and the rest spread over the other bodies. */
function answer(given: Partial<Record<MonsterBodyType, number>>) {
  const rest = MONSTER_BODY_TYPE_IDS.filter((body) => !(body in given));
  const left = 1 - Object.values(given).reduce((sum, value) => sum + value, 0);
  const probabilities = Object.fromEntries([
    ...rest.map((body) => [body, left / rest.length]),
    ...Object.entries(given),
  ]) as Record<MonsterBodyType, number>;
  const choice = MONSTER_BODY_TYPE_IDS.reduce((best, body) =>
    probabilities[body] > probabilities[best] ? body : best,
  );
  return { choice, probabilities };
}

describe('the body a task is drawn as', () => {
  it('describes every body the art can draw', () => {
    expect(Object.keys(bodyTypeQuestion.criteria).sort()).toEqual(
      [...MONSTER_BODY_TYPE_IDS].sort(),
    );
  });

  it('takes the literal fit when two bodies share the vote, as a dentist email does', () => {
    expect(bodyFrom(answer({ tooth: 0.42, envelope: 0.4 }))).toBe('tooth');
    expect(bodyFrom(answer({ envelope: 0.45, tooth: 0.35 }))).toBe('envelope');
  });

  it('prefers a literal fit over the generic body even when the generic one is likelier', () => {
    expect(bodyFrom(answer({ [genericBody]: 0.45, sock: 0.35 }))).toBe('sock');
  });

  it('falls back to the generic body only when nothing fits, and to nothing with no answer', () => {
    expect(bodyFrom(answer({}))).toBe(genericBody);
    expect(bodyFrom(answer({ [genericBody]: 0.8 }))).toBe(genericBody);
    expect(bodyFrom(null)).toBeNull();
  });
});
