/**
 * Describes an e2e-test build made on a GitHub runner (`eas build --local`) and names the GitHub
 * release that carries it, so a device run can find the build for a native fingerprint.
 *
 *   tsx tools/scripts/native-build-manifest.ts --artifact <file> --run-id <id> --out <manifest.json>
 *
 * Writes the manifest, and `tag` and `fingerprint` to the step outputs on GitHub Actions.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const MOBILE_DIR = path.resolve(import.meta.dirname, '../../apps/mobile');

/** The only build that is published where device runs look: the simulator build. */
export const DEVICE_PROFILE = 'e2e-test';

export interface BuildManifest {
  profile: string;
  platform: string;
  /** The native fingerprint hash (see {@link nativeFingerprint}). */
  fingerprint: string;
  commit: string;
  /** File name of the binary attached to the release. */
  artifact: string;
  runId: string;
  createdAt: string;
}

/** Every release of one fingerprint starts with this tag prefix; the run id follows. */
export function releaseTagPrefix(fingerprint: string): string {
  return `native-${DEVICE_PROFILE}-ios-${fingerprint.slice(0, 12)}-`;
}

/** The manifest in a release body; undefined when the text is anything else. */
export function parseManifest(text: string | null | undefined): BuildManifest | undefined {
  if (!text) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const field = (key: string): string => {
    const found = record[key];
    return typeof found === 'string' ? found : '';
  };
  const manifest: BuildManifest = {
    profile: field('profile'),
    platform: field('platform'),
    fingerprint: field('fingerprint'),
    commit: field('commit'),
    artifact: field('artifact'),
    runId: field('runId'),
    createdAt: field('createdAt'),
  };
  const complete =
    manifest.profile && manifest.platform && manifest.fingerprint && manifest.artifact;
  return complete ? manifest : undefined;
}

/**
 * The iOS native fingerprint of the checked-out commit as the e2e-test variant: the hash
 * expo-updates uses as the runtime version, computed from the installed packages and the app
 * config. Needs no account. A JavaScript-only change keeps it; a native package, a config plugin
 * or a native field of app.config.ts changes it.
 *
 * pnpm scripts export a NODE_PATH that can change what the Expo config resolves, so the child runs
 * without it.
 */
export function nativeFingerprint(): string {
  const { NODE_PATH: _nodePath, ...inherited } = process.env;
  const result = spawnSync(
    path.join(MOBILE_DIR, 'node_modules/.bin/expo-updates'),
    ['fingerprint:generate', '--platform', 'ios'],
    {
      cwd: MOBILE_DIR,
      env: { ...inherited, APP_VARIANT: DEVICE_PROFILE },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('expo-updates fingerprint:generate failed');
  // The JSON is the last thing printed; a config warning may come before it.
  const start = result.stdout.indexOf('{');
  const parsed = JSON.parse(result.stdout.slice(start)) as { hash?: unknown };
  if (typeof parsed.hash !== 'string' || !parsed.hash) {
    throw new Error('expo-updates fingerprint:generate returned no hash');
  }
  return parsed.hash;
}

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      artifact: { type: 'string' },
      'run-id': { type: 'string' },
      out: { type: 'string' },
    },
  });
  const { artifact, out } = values;
  const runId = values['run-id'];
  if (!artifact || !out || !runId) throw new Error('--artifact, --run-id and --out are required');

  const fingerprint = nativeFingerprint();
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const manifest: BuildManifest = {
    profile: DEVICE_PROFILE,
    platform: 'ios',
    fingerprint,
    commit,
    artifact: path.basename(artifact),
    runId,
    createdAt: new Date().toISOString(),
  };
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(out, text);
  console.log(text);
  if (process.env['GITHUB_OUTPUT']) {
    appendFileSync(
      process.env['GITHUB_OUTPUT'],
      `tag=${releaseTagPrefix(fingerprint)}${runId}\nfingerprint=${fingerprint}\n`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
