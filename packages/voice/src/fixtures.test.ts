import { aiRoutes, type AiRouteId } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import linesEn from '../fixtures/task.create_lines.en.json' with { type: 'json' };
import linesVi from '../fixtures/task.create_lines.vi.json' with { type: 'json' };
import nameEn from '../fixtures/task.create_name.en.json' with { type: 'json' };
import nameVi from '../fixtures/task.create_name.vi.json' with { type: 'json' };
import packEn from '../fixtures/task.create_pack.en.json' with { type: 'json' };
import packVi from '../fixtures/task.create_pack.vi.json' with { type: 'json' };
import startEn from '../fixtures/task.create_start.en.json' with { type: 'json' };
import startVi from '../fixtures/task.create_start.vi.json' with { type: 'json' };
import taskEn from '../fixtures/task.create.en.json' with { type: 'json' };
import taskVi from '../fixtures/task.create.vi.json' with { type: 'json' };

type Fixture = { route: string; request: unknown; response: unknown };

const fixtures: readonly (readonly [string, Fixture])[] = [
  ['task.create en', taskEn],
  ['task.create vi', taskVi],
  ['task.create_start en', startEn],
  ['task.create_start vi', startVi],
  ['task.create_lines en', linesEn],
  ['task.create_lines vi', linesVi],
  ['task.create_name en', nameEn],
  ['task.create_name vi', nameVi],
  ['task.create_pack en', packEn],
  ['task.create_pack vi', packVi],
];

describe('the recorded task call fixtures', () => {
  it.each(fixtures)(
    '%s matches its route, in every shape the call can be asked in',
    (_, fixture) => {
      const route = aiRoutes[fixture.route as AiRouteId];

      expect(route.request.safeParse(fixture.request).success).toBe(true);
      expect(route.response.safeParse(fixture.response).success).toBe(true);
    },
  );

  it.each([
    ['en', packEn],
    ['vi', packVi],
  ] as const)('names the treat the %s pack was asked with', (_, fixture) => {
    expect(fixture.response.lines.treatHandOver).toContain(fixture.request.treat);
  });
});
