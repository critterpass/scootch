/**
 * Bakes Scootch's poses and the small glyphs into the widget target's asset catalogue, for the
 * Swift surfaces (widgets, the Live Activity, the control). Art that has not changed is skipped.
 *
 *   pnpm --filter @scootch/art exec tsx scripts/bake-surfaces.ts [catalogue folder]
 */
import path from 'node:path';

import { bake } from '../src/bake/bake';
import { bakedArt } from '../src/bake/baked-art';
import { renderPngWithCanvas } from '../src/bake/render-png';

const DEFAULT_CATALOGUE = path.resolve(
  import.meta.dirname,
  '../../../apps/mobile/targets/widgets/ScootchArt.xcassets',
);

const catalogue = path.resolve(process.argv[2] ?? DEFAULT_CATALOGUE);
const result = bake(bakedArt(), catalogue, renderPngWithCanvas);
console.log(`bake-surfaces: ${result.written.length} written, ${result.skipped.length} skipped`);
for (const name of result.written) console.log(`  wrote ${name}`);
