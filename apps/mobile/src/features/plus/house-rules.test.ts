import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { ALWAYS_FREE, PURCHASE_STATES, isUnlocked, unlockedBy } from '@scootch/domain';

import { STUDIO, STUDIO_KINDS } from '../studio/catalogue';

import { unlockedFor } from './entitlement';
import { PLAN_PRODUCTS, PLANS, PLUS_ENTITLEMENT } from './products';
import { CUSTOMERS } from './test/fake-purchases';

// The house rules, checked against the source: paid things never interrupt, nothing is sold with
// guilt or luck, and what is free stays free whatever the store says.

const SOURCE = path.resolve(__dirname, '../..');
const APP = path.join(SOURCE, 'app');
const relative = (file: string) => path.relative(SOURCE, file);

function filesUnder(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) return filesUnder(file);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

/** The route a file under the app folder is served at. */
function routeOf(file: string): string {
  const name = path
    .relative(APP, file)
    .replace(/\.tsx$/, '')
    .split(path.sep)
    .filter((part) => !/^\(.*\)$/.test(part) && part !== 'index')
    .join('/');
  return `/${name}`;
}

const routeFiles = filesUnder(APP).filter((file) => !path.basename(file).startsWith('_'));
/** The developer app's own pages. They are not in a build a person installs. */
const isDeveloperRoute = (file: string) => file.includes(`${path.sep}(dev)${path.sep}`);
const routes = new Map(routeFiles.map((file) => [routeOf(file), file]));

/** The module a relative import names, as a file on disk; `null` for a package. */
function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every source file a file pulls in, itself included: what can be on screen with it. */
function closureOf(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
      const next = resolve(file, match[1] ?? '');
      if (next && !/\.test\.tsx?$/.test(next)) queue.push(next);
    }
  }
  return [...seen];
}

/** The routes on which something can be bought: the sheet, and the studio. */
const SELLING_ROUTES = ['/plus', '/studio'];
/** The names those routes are reached by, from the routes file, and the paths themselves. */
const WAYS_IN = /\b(PLUS_SHEET(?:_ONE_MORE)?|STUDIO_ROUTE)\b|['"`]\/(?:plus|studio)(?:[?'"`])/g;

function waysIn(file: string): string[] {
  const source = readFileSync(file, 'utf8')
    // An import of the names is not a use of them.
    .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, '');
  return [...source.matchAll(WAYS_IN)].map((match) => {
    const line = source.slice(0, match.index).split('\n').length - 1;
    return source.split('\n')[line]?.trim() ?? '';
  });
}

const ROUTES_FILE = path.join(SOURCE, 'features/plus/routes.ts');

describe('the house rules', () => {
  it('knows every route of the app, and which of them sell', () => {
    expect([...routes.keys()].sort()).toEqual(
      [
        '/',
        '/account',
        '/binder/card',
        '/binder/pages',
        '/camera',
        '/camera-after',
        '/care',
        '/characters',
        '/developer-tools',
        '/f/[code]',
        '/finish-with',
        '/friends',
        '/haunt/received',
        '/haunt/send',
        '/helplines',
        '/look/icon',
        '/look/wallpaper',
        '/plus',
        '/plus/last-day',
        '/plus/manage',
        '/plus/records',
        '/plus/renewal-off',
        '/plus/welcome',
        '/privacy',
        '/record',
        '/registry',
        '/registry/[capture]',
        '/reveal',
        '/session',
        '/settings',
        '/studio',
        '/t/[code]',
        '/table',
        '/table-quieted',
        '/table-settings',
        '/table/seat',
        '/world',
        '/zoo',
      ].sort(),
    );
    // Anything that can reach the store's purchase call is on a selling route and nowhere else.
    const buys = /\.purchase\(|controller\.buy\(/;
    const selling = [...routes].filter(
      ([, file]) =>
        !isDeveloperRoute(file) &&
        closureOf(file).some((one) => buys.test(readFileSync(one, 'utf8'))),
    );
    expect(selling.map(([route]) => route).sort()).toEqual(SELLING_ROUTES);
  });

  it('opens a selling route only from a tap the person makes, in a short list of places', () => {
    const users = filesUnder(SOURCE)
      .filter((file) => file !== ROUTES_FILE && !file.includes(`${path.sep}registry${path.sep}`))
      .flatMap((file) => waysIn(file).map((line) => `${relative(file)}: ${line}`));
    expect(users.sort()).toEqual(
      [
        // The camera's Paper and Screen chips, once their free try is used: the quiet lock.
        'features/camera/camera-container.tsx: openPlus: () => router.push(PLUS_SHEET),',
        'features/one-screen/one-screen.tsx: onUnlock: () => router.push(PLUS_SHEET_ONE_MORE),',
        'features/plus/first-offer.tsx: onTell={() => router.push(PLUS_SHEET)}',
        'features/plus/manage-container.tsx: openStudio: () => router.push(STUDIO_ROUTE),',
        'features/plus/manage-container.tsx: seePlus: () => router.push(PLUS_SHEET),',
        // The welcome's "Pick my first finish": a member wears every finish, so nothing is sold
        // on the way in.
        'features/plus/moment-containers.tsx: pickFinish={() => router.push(STUDIO_ROUTE)}',
        'features/record/record-container.tsx: openPlus: () => router.push(PLUS_SHEET),',
        'features/table/lobby-containers.tsx: onLocked={() => router.push(PLUS_SHEET)}',
        // The binder's sorting is the zoo's one locked control.
        'features/zoo/zoo-container.tsx: openPlus: () => router.push(PLUS_SHEET),',
      ].sort(),
    );
    // Every one of them is a handler: nothing redirects, replaces or opens it from an effect.
    for (const use of users) expect(use).toMatch(/\(\) => router\.push\(\w+\)[,}]?$/);
  });

  it('leaves the locked controls of the keeping screens inert on a heavy day', () => {
    // The zoo's binder and the record each have one way to the sheet, and each hands it over only
    // when the day has nothing heavy in it.
    for (const file of ['features/zoo/zoo-container.tsx', 'features/record/record-container.tsx']) {
      const source = readFileSync(path.join(SOURCE, file), 'utf8');
      expect(source.match(/PLUS_SHEET\)/g)).toHaveLength(1);
      expect(source).toMatch(
        /const plusDoor = \{\s*openPlus: \(\) => router\.push\(PLUS_SHEET\),\s*\};/,
      );
      // The door is used once, and only on the side of the question where the day is not heavy.
      expect(source.match(/\bplusDoor\b/g)).toHaveLength(2);
      expect(source).toMatch(/\.\.\.\(heavyToday \? \{\} : plusDoor\)/);
      expect(source).toMatch(/\{[^}]*\bheavyToday\b[^}]*\} = useToday\(\)/);
    }
    // Your card offers the sheet and the studio only when the one selling guard says so.
    const card = readFileSync(path.join(SOURCE, 'features/plus/manage-container.tsx'), 'utf8');
    expect(card).toMatch(/selling: showsSelling\(day\)/);
    const page = readFileSync(path.join(SOURCE, 'features/plus/manage-screen.tsx'), 'utf8');
    expect(page).toMatch(/model\.selling \? \{ onPress: actions\.seePlus \} : \{ inert: true \}/);
    expect(page).toMatch(/\{model\.selling \? \(\s*<Row\s+label=\{t\('studio\.title'\)\}/);
  });

  it('reaches no selling route from first launch, a session, the reveal or the care screens', () => {
    const quiet = [
      ...filesUnder(path.join(SOURCE, 'features/launch')),
      ...['/session', '/reveal', '/care', '/helplines'].flatMap((route) =>
        closureOf(routes.get(route) ?? ''),
      ),
    ];
    expect(quiet.length).toBeGreaterThan(20);
    expect(quiet.filter((file) => waysIn(file).length > 0).map(relative)).toEqual([]);
    for (const file of quiet) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/features\/(plus\/sheet|studio\/studio-)/);
    }
  });

  it('reaches the sheet from the one screen only through the locked talk capsule on home', () => {
    const closure = closureOf(routes.get('/') ?? '');
    const users = closure.filter((file) => file !== ROUTES_FILE && waysIn(file).length > 0);
    // The world is the page beside home, and brings one door with it: the first offer, which is
    // not shown at all on a heavy day. Nothing else on the way from home names a selling route.
    const ONE_SCREEN = 'features/one-screen/one-screen.tsx';
    expect(users.map(relative).sort()).toEqual([ONE_SCREEN, 'features/plus/first-offer.tsx']);

    const source = readFileSync(path.join(SOURCE, ONE_SCREEN), 'utf8');
    const at = source.indexOf('router.push(PLUS_SHEET_ONE_MORE)');
    // It sits in home's branch, after every other state has had its own return, as the tap of
    // the gated capsule and nothing else. No task-set, pick or hatch branch names a selling route.
    const taskSet = source.indexOf("stage.kind === 'task_set'");
    const home = source.indexOf('const starts = homeStarts(');
    expect(taskSet).toBeGreaterThan(-1);
    expect(home).toBeGreaterThan(taskSet);
    expect(at).toBeGreaterThan(home);
    expect(source.slice(taskSet, home)).not.toMatch(/PLUS_|STUDIO_ROUTE|\/plus|\/studio/);
    expect(source.match(/PLUS_SHEET/g)).toHaveLength(2);
    expect(source).toMatch(
      /gate: \{\s*kind: starts,\s*onUnlock: \(\) => router\.push\(PLUS_SHEET_ONE_MORE\),\s*\}/,
    );
    // The view and the dock draw the control they are handed and know no route at all.
    for (const file of closure) {
      if (/one-screen-view|composer-(row|stacked|view)|charge-note/.test(file)) {
        expect(readFileSync(file, 'utf8')).not.toMatch(/router|Redirect|Href/);
      }
    }
  });

  it('asks the one selling guard before the locked capsule, the first offer and any spoken Plus line', () => {
    const read = (file: string) => readFileSync(path.join(SOURCE, file), 'utf8');
    // Whether the capsule locks is decided with the guard's own answer, and by nothing else.
    expect(read('features/one-screen/one-screen.tsx')).toMatch(
      /homeStarts\(\{ startLeft: stage\.startLeft, plus, selling: showsSelling\(day\) \}\)/,
    );
    expect(read('state/plus-runtime.ts')).toMatch(/selling: showsSelling\(day\)/);
    // A Plus screen takes Scootch's words from `plusLine`, which is silent on a heavy day. Only
    // the first offer (not shown at all then) and the charge reminders read the pack directly.
    const speakers = filesUnder(path.join(SOURCE, 'features/plus'))
      .filter((file) => !file.includes(`${path.sep}registry${path.sep}`))
      .filter((file) => /\b(noTaskLine|lineWithNoTask)\(/.test(readFileSync(file, 'utf8')));
    expect(speakers.map(relative).sort()).toEqual([
      'features/plus/charge-reminders.ts',
      'features/plus/first-offer.tsx',
    ]);
  });

  it("opens the manage page from Settings' Plus row, and never the sheet", () => {
    const read = (file: string) => readFileSync(path.join(SOURCE, file), 'utf8');
    expect(read('features/settings/settings-container.tsx')).toMatch(/plus: '\/plus\/manage'/);
    expect(read('features/settings/settings-page.tsx')).toMatch(
      /onPress=\{\(\) => onOpen\('plus'\)\}\s*testID="settings-plus"/,
    );
    expect(routes.has('/plus/manage')).toBe(true);
  });

  it('sells plans and plain cosmetics, and never rarity, luck, a currency or a mended day', () => {
    const NEVER_SOLD =
      /rar(e|ity)|random|pack|loot|gacha|lucky|chance|odds|coin|gem|currency|credit|token|streak|repair|freeze|missed|skip|catch.?up/i;
    const sold = [
      ...PLANS.map((plan) => ({ id: plan, productId: PLAN_PRODUCTS[plan], words: [] as string[] })),
      ...STUDIO.map((item) => ({
        id: item.id,
        productId: item.productId ?? '',
        words: [item.name, item.short, item.about, item.kind],
      })),
    ];
    expect(sold.map((one) => one.productId).filter(Boolean)).toEqual([
      'plus_monthly',
      'plus_yearly',
      'plus_lifetime',
      'ink_midnight_riso',
      'ink_moss',
      'ink_plum',
      'ink_mustard',
      'finish_holo',
      'finish_chrome',
      'finish_jelly',
      'finish_glass',
      'finish_flock',
      'finish_riso',
      'trail_stardust',
      'trail_bubbles',
      'trail_splat',
    ]);
    expect(PLUS_ENTITLEMENT).toBe('plus');
    for (const one of sold) {
      for (const text of [one.id, one.productId, ...one.words]) {
        expect([one.id, text, NEVER_SOLD.test(text)]).toEqual([one.id, text, false]);
      }
    }
    // A studio item is exactly what it shows: one fixed thing, with no amount and no odds.
    for (const item of STUDIO) {
      expect(STUDIO_KINDS).toContain(item.kind);
      const own = item.kind === 'ink' ? ['code', 'colours'] : [];
      expect(Object.keys(item).sort()).toEqual(
        ['about', 'id', 'kind', 'name', 'productId', 'short', ...own].sort(),
      );
    }
    const products = sold.map((one) => one.productId).filter(Boolean);
    expect(new Set(products).size).toBe(products.length);
    // The store's port has no way to spend, top up or consume anything.
    const port = readFileSync(path.join(SOURCE, 'features/plus/purchases-port.ts'), 'utf8');
    expect(port).not.toMatch(/consum|balance|wallet|quantity/i);
  });

  it('keeps every always-free capability on in every purchase state', () => {
    for (const state of PURCHASE_STATES) {
      for (const capability of ALWAYS_FREE) {
        expect([state, capability, isUnlocked(state, capability)]).toEqual([
          state,
          capability,
          true,
        ]);
      }
      expect(unlockedBy(state).startsPerDay).toBeGreaterThanOrEqual(1);
    }
    for (const customer of Object.values(CUSTOMERS)) {
      const { capabilities } = unlockedFor(customer);
      expect(ALWAYS_FREE.filter((capability) => !capabilities.has(capability))).toEqual([]);
    }
  });
});

describe('the words and prices on a Plus screen', () => {
  const screens = ['features', 'ui', 'app'].flatMap((folder) =>
    filesUnder(path.join(SOURCE, folder)).filter(
      (file) =>
        /\.tsx$/.test(file) || /features\/(plus|studio)\//.test(file.split(path.sep).join('/')),
    ),
  );
  /** A money amount written into the source: a currency sign or code beside a number. */
  const PRICE = /[$€£¥₫]\s?\d|\d\s?(?:USD|EUR|GBP|VND)\b|\d[.,]\d{2}\s+(?:a|per|mỗi|một)\s/;
  /** A line of Scootch's written into a screen, handed to the prop that carries his words. */
  const LITERAL_SAID = /\s(?:said|line|more)=(?:["'`]|\{\s*["'`])/;

  it('finds a written price and a written line when there is one', () => {
    expect(PRICE.test("label: 'Buy · $1.99'")).toBe(true);
    expect(PRICE.test('then 39.99 a year')).toBe(true);
    expect(PRICE.test('`${price} a year`')).toBe(false);
    expect(LITERAL_SAID.test('<PlusSheet said="I work for free." />')).toBe(true);
    expect(LITERAL_SAID.test('<PlusSheet said={said} />')).toBe(false);
  });

  it('are never written into a screen: prices come from the store, lines from the pack', () => {
    expect(screens.length).toBeGreaterThan(40);
    const priced = screens.filter((file) => PRICE.test(readFileSync(file, 'utf8')));
    expect(priced.map(relative)).toEqual([]);
    const spoken = screens.filter((file) => LITERAL_SAID.test(readFileSync(file, 'utf8')));
    expect(spoken.map(relative)).toEqual([]);
  });

  it('has no price in either catalogue of interface strings', () => {
    for (const file of ['en-plus.ts', 'vi-plus.ts', 'en.ts', 'vi.ts']) {
      const catalogue = readFileSync(
        path.resolve(SOURCE, '../../../packages/i18n/src', file),
        'utf8',
      );
      expect([file, /[$€£¥₫]\s?\d/.test(catalogue)]).toEqual([file, false]);
    }
  });
});
