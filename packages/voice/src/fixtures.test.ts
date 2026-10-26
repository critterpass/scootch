import { aiRoutes, type AiRouteId } from '@phusclass/domain';
import { describe, expect, it } from 'vitest';

import unscreenedEn from '../fixtures/screen.input.unscreened.en.json' with { type: 'json' };
import unscreenedVi from '../fixtures/screen.input.unscreened.vi.json' with { type: 'json' };

describe('the recorded screen fixture for a text only the fallback judged', () => {
  it.each([
    ['en', unscreenedEn],
    ['vi', unscreenedVi],
  ] as const)('%s matches the route and is never a pass', (_, fixture) => {
    const route = aiRoutes[fixture.route as AiRouteId];

    expect(route.request.safeParse(fixture.request).success).toBe(true);
    expect(route.response.parse(fixture.response)).toMatchObject({
      verdict: 'serious',
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });
});
