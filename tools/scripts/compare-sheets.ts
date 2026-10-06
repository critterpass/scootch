import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/**
 * Design-beside-device sheets: one image per registered screen state, with the design render on
 * the left and every captured variant beside it, each under its name.
 *
 *   tsx tools/scripts/compare-sheets.ts --captures <folder> --out <folder>
 *
 * The captures are the images a device run saves from e2e/sheets/capture-registry.yaml, named
 * `<state id>--<variant>.png`. The designs are the renders listed in design/screens.json
 * (tools/scripts/fetch-design-renders.sh downloads them). Besides the sheets it writes
 * `<out>/summary.md`: states with no design, states with captures missing, and captures whose
 * shape differs from their design. Gaps are reported, not failed: the sheet is the review.
 */
const repoRoot = path.resolve(import.meta.dirname, '../..');
const registryDir = path.join(repoRoot, 'apps/mobile/src/screens/registry');

/** Sheet geometry in pixels: every panel is drawn this tall, under its caption. */
export const SHEET = { panelHeight: 1000, pad: 32, gap: 32, caption: 64 } as const;
/** How far a capture's width-to-height ratio may differ from its design's before it is reported. */
const SHAPE_TOLERANCE = 0.02;
const INK = '#16131f';
const PAPER = '#f4efe4';
const MUTED = '#a9a3c0';

// The canvas is the mobile app's dependency (it draws the app icon); it is loaded from there so
// this script adds none of its own.
interface CanvasImage {
  readonly width: number;
  readonly height: number;
}
interface Context2D {
  fillStyle: string;
  strokeStyle: string;
  font: string;
  textBaseline: string;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  setLineDash(segments: number[]): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  drawImage(image: CanvasImage, x: number, y: number, width: number, height: number): void;
}
interface CanvasModule {
  createCanvas(
    width: number,
    height: number,
  ): { getContext(kind: '2d'): Context2D; toBuffer(mime: 'image/png'): Buffer };
  loadImage(source: string | Buffer): Promise<CanvasImage>;
}
export const canvas = createRequire(path.join(repoRoot, 'apps/mobile/package.json'))(
  '@napi-rs/canvas',
) as CanvasModule;

/** A registered screen state, as far as a sheet needs it. */
export interface SheetState {
  readonly id: string;
  readonly design: { board: string; section: string; screen: string } | null;
  readonly undesignedReason?: string;
  /** Variant names, such as `vi-dark-largest`, in registry order. */
  readonly variants: readonly string[];
}

/** One entry of design/screens.json. `path` is relative to the repository root. */
export interface DesignScreen {
  readonly board: string;
  readonly section: string;
  readonly screen: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface CompareInput {
  readonly states: readonly SheetState[];
  readonly designScreens: readonly DesignScreen[];
  /** The folder design render paths are relative to. */
  readonly designRoot: string;
  readonly capturesDir: string;
  readonly outDir: string;
}

export interface CompareResult {
  /** Sheets written, one per state that has a capture. */
  readonly sheets: string[];
  /** State id and why there is no design beside it. */
  readonly noDesign: { id: string; reason: string }[];
  /** State id and the variants with no capture. */
  readonly noCapture: { id: string; missing: string[]; expected: number }[];
  readonly sizeMismatches: { capture: string; captured: string; designed: string }[];
  /** Images in the captures folder that belong to no registered state and variant. */
  readonly unknownCaptures: string[];
  readonly summaryPath: string;
}

function scaledWidth(image: CanvasImage): number {
  return Math.max(1, Math.round((image.width / image.height) * SHEET.panelHeight));
}

interface Panel {
  readonly label: string;
  readonly image?: CanvasImage;
  readonly width: number;
}

/** The panels left to right, each under its caption; a panel with no image is a dashed outline. */
function composeSheet(panels: readonly Panel[]): Buffer {
  const { panelHeight, pad, gap, caption } = SHEET;
  const width =
    pad * 2 + panels.reduce((sum, panel) => sum + panel.width, 0) + gap * (panels.length - 1);
  const sheet = canvas.createCanvas(width, pad * 2 + caption + panelHeight);
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, width, pad * 2 + caption + panelHeight);
  ctx.font = '600 22px sans-serif';
  ctx.textBaseline = 'middle';
  let x = pad;
  for (const panel of panels) {
    ctx.fillStyle = panel.image ? PAPER : MUTED;
    ctx.fillText(panel.label, x, pad + caption / 2, panel.width);
    if (panel.image) {
      ctx.drawImage(panel.image, x, pad + caption, panel.width, panelHeight);
    } else {
      ctx.strokeStyle = MUTED;
      ctx.setLineDash([12, 12]);
      ctx.strokeRect(x, pad + caption, panel.width, panelHeight);
      ctx.setLineDash([]);
    }
    x += panel.width + gap;
  }
  return sheet.toBuffer('image/png');
}

function renderSummary(result: Omit<CompareResult, 'summaryPath'>, stateCount: number): string {
  const section = (title: string, lines: string[]) =>
    [`### ${title}`, '', ...(lines.length > 0 ? lines : ['None.']), ''].join('\n');
  return [
    `## Design beside device: ${result.sheets.length} sheet(s) for ${stateCount} state(s)`,
    '',
    section(
      'States with no design',
      result.noDesign.map((entry) => `- \`${entry.id}\`: ${entry.reason}`),
    ),
    section(
      'States with no capture',
      result.noCapture.map((entry) =>
        entry.missing.length === entry.expected
          ? `- \`${entry.id}\`: none of its ${entry.expected} variants`
          : `- \`${entry.id}\`: missing ${entry.missing.map((name) => `\`${name}\``).join(', ')}`,
      ),
    ),
    section(
      'Size mismatches',
      result.sizeMismatches.map(
        (entry) => `- \`${entry.capture}\`: captured ${entry.captured}, designed ${entry.designed}`,
      ),
    ),
    section(
      'Images that match no registered state',
      result.unknownCaptures.map((name) => `- \`${name}\``),
    ),
  ].join('\n');
}

/** Writes `<out>/<state id>.png` for every state with a capture, and `<out>/summary.md`. */
export async function compareSheets(input: CompareInput): Promise<CompareResult> {
  const { states, designScreens, designRoot, capturesDir, outDir } = input;
  mkdirSync(outDir, { recursive: true });
  const captured = existsSync(capturesDir)
    ? readdirSync(capturesDir).filter((name) => name.endsWith('.png'))
    : [];
  const expected = new Set(
    states.flatMap((state) => state.variants.map((variant) => `${state.id}--${variant}.png`)),
  );
  const result: Omit<CompareResult, 'summaryPath'> = {
    sheets: [],
    noDesign: [],
    noCapture: [],
    sizeMismatches: [],
    unknownCaptures: captured.filter((name) => !expected.has(name)).sort(),
  };

  for (const state of states) {
    const reference = state.design;
    const listed = reference
      ? designScreens.find(
          (screen) =>
            screen.board === reference.board &&
            screen.section === reference.section &&
            screen.screen === reference.screen,
        )
      : undefined;
    const designFile = listed ? path.resolve(designRoot, listed.path) : undefined;
    const design = listed && designFile && existsSync(designFile) ? listed : undefined;
    if (reference === null) {
      result.noDesign.push({ id: state.id, reason: state.undesignedReason ?? 'not designed' });
    } else if (!listed) {
      const name = `${reference.board} / ${reference.section} / ${reference.screen}`;
      result.noDesign.push({ id: state.id, reason: `"${name}" is not in design/screens.json` });
    } else if (!design) {
      result.noDesign.push({ id: state.id, reason: `no render at ${listed.path}` });
    }

    const present = state.variants.filter((variant) =>
      captured.includes(`${state.id}--${variant}.png`),
    );
    const missing = state.variants.filter((variant) => !present.includes(variant));
    if (missing.length > 0) {
      result.noCapture.push({ id: state.id, missing, expected: state.variants.length });
    }
    if (present.length === 0) continue;

    const panels: Panel[] = [];
    let designWidth: number | undefined;
    if (design && designFile) {
      const image = await canvas.loadImage(designFile);
      designWidth = scaledWidth(image);
      panels.push({ label: `DESIGN  ${design.screen}`, image, width: designWidth });
    }
    const devicePanels: Panel[] = [];
    for (const variant of present) {
      const name = `${state.id}--${variant}`;
      const image = await canvas.loadImage(path.join(capturesDir, `${name}.png`));
      devicePanels.push({ label: variant, image, width: scaledWidth(image) });
      if (design) {
        const designShape = design.width / design.height;
        const drift = Math.abs(image.width / image.height - designShape) / designShape;
        if (drift > SHAPE_TOLERANCE) {
          result.sizeMismatches.push({
            capture: name,
            captured: `${image.width}×${image.height}`,
            designed: `${design.width}×${design.height}`,
          });
        }
      }
    }
    if (panels.length === 0) {
      panels.push({ label: 'DESIGN  none', width: devicePanels[0]?.width ?? SHEET.panelHeight });
    }
    const file = path.join(outDir, `${state.id}.png`);
    writeFileSync(file, composeSheet([...panels, ...devicePanels]));
    result.sheets.push(file);
  }

  const summaryPath = path.join(outDir, 'summary.md');
  writeFileSync(summaryPath, renderSummary(result, states.length));
  return { ...result, summaryPath };
}

/** The app's registry, read from its source: the entries name their screens without loading them. */
async function registeredStates(): Promise<SheetState[]> {
  const load = (file: string) => import(pathToFileURL(path.join(registryDir, file)).href);
  const entries = (await load('index.generated.ts')) as Record<string, unknown>;
  const { variantName } = (await load('support/screen-state.ts')) as {
    variantName: (variant: unknown) => string;
  };
  return Object.values(entries)
    .filter((entry): entry is Omit<SheetState, 'variants'> & { variants: unknown[] } => {
      return typeof entry === 'object' && entry !== null && 'id' in entry && 'variants' in entry;
    })
    .map((entry) => ({ ...entry, variants: entry.variants.map(variantName) }));
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { captures: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.captures || !values.out) {
    console.error('Usage: compare-sheets.ts --captures <folder> --out <folder>');
    process.exitCode = 1;
    return;
  }
  const result = await compareSheets({
    states: await registeredStates(),
    designScreens: JSON.parse(
      readFileSync(path.join(repoRoot, 'design/screens.json'), 'utf8'),
    ) as DesignScreen[],
    designRoot: repoRoot,
    capturesDir: path.resolve(values.captures),
    outDir: path.resolve(values.out),
  });
  const summary = readFileSync(result.summaryPath, 'utf8');
  console.log(summary);
  const jobSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (jobSummary) writeFileSync(jobSummary, `${summary}\n`, { flag: 'a' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
