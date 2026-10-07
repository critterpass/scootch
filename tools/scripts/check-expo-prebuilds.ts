// Proves, before a native build, that the Expo packages installed in the app link with each other.
//
// Expo ships some modules as prebuilt xcframeworks inside the npm package
// (`<package>/prebuilds/output/<debug|release>/xcframeworks/<Product>.tar.gz`) and autolinking uses
// them when EXPO_USE_PRECOMPILED_MODULES is on, which expo-build-properties does by default. A
// prebuilt framework is compiled against one version of expo-modules-core and expo-modules-jsi; if
// the installed copy of either differs, dyld refuses to start the app before any JavaScript runs.
//
//   pnpm exec tsx tools/scripts/check-expo-prebuilds.ts [--app apps/mobile] [--flavor debug|release]
//        [--override <npm package>=<directory>]...   (swap an installed package, to replay an old set)
//
// Where each side of a symbol comes from:
//   - Prebuilt packages (ExpoModulesCore, ExpoFileSystem, ...): exported symbols are read with nm from
//     the unpacked binaries, for the device slice and the simulator slice.
//   - ExpoModulesJSI is built from source on the build machine (its podspec compiles Sources/ with
//     xcodebuild), so nothing can be read with nm. Its exports are checked against the installed
//     package's Swift sources: declared types, member names, parameter counts and ownership
//     (`borrowing` is `__shared`, `consuming` is `__owned`).
// Needs a Swift demangler, so it runs on macOS.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';

import { checkJsiSymbols, loadJsiSources } from './expo-jsi-source-check';

const args = argv.slice(2);
const option = (name: string): string[] =>
  args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1] as string] : []));
const appRoot = resolve(option('--app')[0] ?? 'apps/mobile');
const flavors = option('--flavor').length > 0 ? option('--flavor') : ['debug', 'release'];
const overrides = new Map(
  option('--override').map((o) => [
    o.split('=')[0] as string,
    resolve(o.split('=').slice(1).join('=')),
  ]),
);

const run = (file: string, fileArgs: string[], input?: string): string =>
  execFileSync(file, fileArgs, {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
const which = (names: string[]): string | undefined =>
  names.find((n) => {
    try {
      run('which', [n]);
      return true;
    } catch {
      return false;
    }
  });
const nmTool = which(['llvm-nm', 'nm']);
const demangle = (() => {
  const onPath = which(['swift-demangle']);
  if (onPath) return onPath;
  try {
    return run('xcrun', ['--find', 'swift-demangle']).trim();
  } catch {
    return undefined;
  }
})();
if (!nmTool || !demangle) {
  console.error('check-expo-prebuilds needs nm (or llvm-nm) and swift-demangle: run it on macOS.');
  exit(2);
}

interface Pod {
  npmPackage: string;
  podName: string;
  root: string;
}

// The modules autolinking finds for the app, the same list pod install uses.
function resolvePods(): { pods: Pod[]; sourcePatterns: RegExp[] } {
  const appRequire = createRequire(join(appRoot, 'package.json'));
  const expoDir = dirname(appRequire.resolve('expo/package.json'));
  const autolinking = dirname(
    createRequire(join(expoDir, 'package.json')).resolve('expo-modules-autolinking/package.json'),
  );
  const json = JSON.parse(
    execFileSync(
      'node',
      [
        join(autolinking, 'bin/expo-modules-autolinking.js'),
        'resolve',
        '--platform',
        'apple',
        '--json',
      ],
      { cwd: appRoot, encoding: 'utf8', maxBuffer: 1 << 28 },
    ),
  ) as { modules: { packageName: string; pods?: { podName: string; podspecDir: string }[] }[] };
  const pods = json.modules.flatMap((m) =>
    (m.pods ?? []).map((p) => {
      const override = overrides.get(m.packageName);
      const dir =
        [p.podspecDir, dirname(p.podspecDir)].find(
          (d) => existsSync(join(d, 'package.json')) || existsSync(join(d, 'prebuilds')),
        ) ?? p.podspecDir;
      return { npmPackage: m.packageName, podName: p.podName, root: override ?? dir };
    }),
  );
  const pkg = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as {
    expo?: {
      autolinking?: {
        buildFromSource?: string[];
        ios?: { buildFromSource?: string[] };
        apple?: { buildFromSource?: string[] };
      };
    };
  };
  const al = pkg.expo?.autolinking;
  const patterns = [al?.buildFromSource, al?.ios?.buildFromSource, al?.apple?.buildFromSource]
    .flatMap((p) => p ?? [])
    .map((p) => new RegExp(`^${p}$`));
  return { pods, sourcePatterns: patterns };
}

const tarballs = (root: string, flavor: string): string[] => {
  const dir = join(root, 'prebuilds', 'output', flavor, 'xcframeworks');
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.tar.gz'))
        .map((f) => join(dir, f))
    : [];
};

// `<scratch>/<Product>/<Product>.xcframework/<slice>/<Product>.framework/<Product>`
function binaries(dir: string): { product: string; slice: 'device' | 'simulator'; file: string }[] {
  const found: { product: string; slice: 'device' | 'simulator'; file: string }[] = [];
  for (const product of readdirSync(dir)) {
    const xc = join(dir, product, `${product}.xcframework`);
    if (!existsSync(xc)) continue;
    for (const slice of readdirSync(xc).filter((s) => statSync(join(xc, s)).isDirectory())) {
      const file = join(xc, slice, `${product}.framework`, product);
      if (existsSync(file))
        found.push({ product, slice: slice.endsWith('-simulator') ? 'simulator' : 'device', file });
    }
  }
  return found;
}

const nm = (file: string, flags: string[]): string[] =>
  run(nmTool, ['--arch=arm64', ...flags, file])
    .split('\n')
    .map((l) => l.trim().split(/\s+/).pop() ?? '')
    .filter(Boolean);
// A symbol that belongs to an Expo module (Swift mangling names the module with its length) or an Expo ObjC class.
const expoModule = /\d+((?:Expo|EX|EAS)[A-Za-z0-9]*)/;
const isExpoSymbol = (s: string): boolean =>
  (s.startsWith('_$s') && expoModule.test(s)) || /^_OBJC_(META)?CLASS_\$_(Expo|EX|EAS)/.test(s);

const { pods, sourcePatterns } = resolvePods();
const scratch = mkdtempSync(join(tmpdir(), 'expo-prebuilds-'));
const failures: string[] = [];
const jsiPod = pods.find((p) => p.podName === 'ExpoModulesJSI');
const jsiSources = jsiPod ? loadJsiSources(jsiPod.root) : undefined;
try {
  for (const flavor of flavors) {
    const unpacked = join(scratch, flavor);
    const owners: { pod: Pod; product: string }[] = [];
    const skipped: string[] = [];
    for (const pod of pods) {
      const sourceBuilt = sourcePatterns.some(
        (re) => re.test(pod.podName) || re.test(pod.npmPackage),
      );
      const files = sourceBuilt ? [] : tarballs(pod.root, flavor);
      if (files.length === 0) {
        skipped.push(pod.podName);
        continue;
      }
      for (const tarball of files) {
        const product = tarball.replace(/^.*\//, '').replace(/\.tar\.gz$/, '');
        run('mkdir', ['-p', join(unpacked, product)]);
        run('tar', ['-xzf', tarball, '-C', join(unpacked, product)]);
        owners.push({ pod, product });
      }
    }
    const bins = binaries(unpacked);
    console.log(
      `[${flavor}] prebuilt: ${owners.map((o) => `${o.product}@${o.pod.npmPackage}`).join(' ')}`,
    );
    console.log(
      `[${flavor}] built from source (symbols come from their Swift sources, not nm): ${skipped.join(' ')}`,
    );
    for (const slice of ['device', 'simulator'] as const) {
      const inSlice = bins.filter((b) => b.slice === slice);
      const exported = new Set(inSlice.flatMap((b) => nm(b.file, ['-gU'])));
      let missing = 0;
      const jsiNeeds = new Map<string, string[]>();
      for (const b of inSlice) {
        const owner = owners.find((o) => o.product === b.product);
        const label = `[${flavor}/${slice}] ${owner?.pod.npmPackage}@${owner ? (JSON.parse(readFileSync(join(owner.pod.root, 'package.json'), 'utf8')) as { version: string }).version : '?'} ${b.product}`;
        for (const sym of new Set(nm(b.file, ['-u']).filter(isExpoSymbol))) {
          if (exported.has(sym)) continue;
          if (sym.includes('14ExpoModulesJSI')) {
            jsiNeeds.set(sym, [...(jsiNeeds.get(sym) ?? []), label]);
            continue;
          }
          missing++;
          failures.push(`${label} needs ${run(demangle, [sym]).trim()}   (${sym})`);
        }
      }
      const jsiSymbols = [...jsiNeeds.keys()];
      const bad = jsiSources
        ? checkJsiSymbols(jsiSymbols, (s) => run(demangle, [], s).split('\n'), jsiSources)
        : jsiSymbols.map((s) => ({ symbol: s, reason: 'ExpoModulesJSI is not installed' }));
      for (const b of bad)
        failures.push(
          `${(jsiNeeds.get(b.symbol) ?? [''])[0]} needs ExpoModulesJSI: ${b.reason}   (${b.symbol})`,
        );
      console.log(
        `[${flavor}/${slice}] ${inSlice.length} binaries, ${exported.size} exported symbols, ${missing} missing, ${jsiSymbols.length} ExpoModulesJSI symbols checked against ${jsiPod?.root.replace(/^.*node_modules\//, '')}: ${bad.length} not provided`,
      );
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`\nThe installed Expo packages cannot link: ${unique.length} symbol(s) missing.`);
  for (const line of unique.slice(0, 40)) console.error(`  ${line}`);
  if (unique.length > 40) console.error(`  ... and ${unique.length - 40} more`);
  exit(1);
}
console.log('OK: every Expo symbol a prebuilt framework needs is provided by the installed set.');
