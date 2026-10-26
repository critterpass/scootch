/**
 * Bakes the art the Swift surfaces draw into their asset catalogues: the glyphs, his face and his
 * figure in every mood the surfaces show (light and dark) and two props into the widget target,
 * and his figure at each pressure step into the notification service extension. Art that has not
 * changed is skipped.
 *
 *   pnpm --filter @phusclass/art bake
 */
import path from 'node:path';

import { bake } from '../src/bake/bake';
import { bakedArt, notificationArt } from '../src/bake/baked-art';
import { renderDrawingWithCanvas, renderPngWithCanvas } from '../src/bake/render-png';

const TARGETS = path.resolve(import.meta.dirname, '../../../apps/mobile/targets');

const CATALOGUES = [
  { folder: path.join(TARGETS, 'widgets/SurfaceArt.xcassets'), art: bakedArt },
  { folder: path.join(TARGETS, 'notification-service/NoteArt.xcassets'), art: notificationArt },
] as const;

for (const { folder, art } of CATALOGUES) {
  const result = bake(art(), folder, renderPngWithCanvas, renderDrawingWithCanvas);
  console.log(
    `bake-surfaces: ${path.relative(TARGETS, folder)}: ${result.written.length} written, ${result.skipped.length} skipped`,
  );
  for (const name of result.written) console.log(`  wrote ${name}`);
}
