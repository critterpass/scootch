// Decides whether the Swift sources of the installed expo-modules-jsi declare what a prebuilt Expo
// framework imports from it. ExpoModulesJSI is compiled on the build machine, so the symbols it will
// export are not on disk; the demangled name of each needed symbol is matched to a declaration instead:
// the type, the member name, the number of parameters and each parameter's ownership.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface JsiSources {
  text: string;
}
export interface Unmatched {
  symbol: string;
  reason: string;
}

export function loadJsiSources(packageRoot: string): JsiSources {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (
        name.endsWith('.swift') &&
        !path.includes('/Tests/') &&
        !path.includes('/Benchmarks/')
      )
        files.push(path);
    }
  };
  const sources = join(packageRoot, 'apple', 'Sources');
  if (existsSync(sources)) walk(sources);
  return { text: files.map((f) => readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')).join('\n') };
}

// Splits a parameter list at the commas that are not inside <>, () or [].
function splitParams(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if ('<([{'.includes(ch)) depth++;
    if ('>)]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  if (current.trim() !== '') parts.push(current);
  return parts;
}

// The text between the parenthesis opened at `open` and its match.
function balanced(text: string, open: number): string | undefined {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return undefined;
}

// '*' stands for a closure, whose ownership is mangled differently by declaration form and is not compared.
type Ownership = '' | '__shared' | '__owned' | 'inout' | '*';
// How the compiler mangles a parameter. A function's parameters are borrowed unless marked, so
// `borrowing` adds nothing there; an initializer's are owned unless marked, so `borrowing` shows as
// `__shared`. An escaping or `sending` closure is owned.
const sourceOwnership = (param: string, isInit: boolean): Ownership => {
  if (/->|@escaping|\bsending\b|Closure\b|Handler\b|Callback\b/.test(param)) return '*';
  if (/\b__shared\b/.test(param)) return '__shared';
  if (/\bborrowing\b/.test(param)) return isInit ? '__shared' : '';
  if (/\binout\b/.test(param)) return 'inout';
  if (/\b__owned\b/.test(param)) return '__owned';
  if (/\bconsuming\b|\bsending\b|@escaping/.test(param)) return isInit ? '' : '__owned';
  return '';
};
const symbolOwnership = (param: string): Ownership => {
  if (/->/.test(param)) return '*';
  if (/^(?:\w+: )?__shared /.test(param.trim())) return '__shared';
  if (/^(?:\w+: )?__owned /.test(param.trim())) return '__owned';
  if (/^(?:\w+: )?inout /.test(param.trim())) return 'inout';
  return '';
};

const declares = (sources: JsiSources, ident: string): boolean =>
  new RegExp(
    `\\b(?:struct|class|enum|protocol|actor|typealias|associatedtype)\\s+${ident}\\b`,
  ).test(sources.text);

// The bodies of every type, protocol or extension declaration of `type`.
function typeBodies(sources: JsiSources, type: string): string[] {
  const re = new RegExp(
    `\\b(?:class|struct|enum|protocol|actor|extension)\\s+${type}\\b[^{]*\\{`,
    'g',
  );
  const bodies: string[] = [];
  for (let m = re.exec(sources.text); m; m = re.exec(sources.text)) {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < sources.text.length; i++) {
      if (sources.text[i] === '{') depth++;
      if (sources.text[i] === '}' && --depth === 0) {
        bodies.push(sources.text.slice(m.index, i));
        break;
      }
    }
  }
  return bodies;
}

// Ownership of each parameter of every declaration called `name` (or `init`) in `type`, or anywhere
// in the sources for a free function.
function declaredSignatures(
  sources: JsiSources,
  name: string,
  type: string | undefined,
): Ownership[][] {
  const isInit = name === 'init';
  const texts = type ? typeBodies(sources, type) : [sources.text];
  const re = new RegExp(
    `\\b${isInit ? 'init[?!]?' : `func\\s+\`?${name}\`?`}\\s*(?:<[^(]*>)?\\s*\\(`,
    'g',
  );
  const found: Ownership[][] = [];
  for (const text of texts) {
    const inProtocol = text.startsWith('protocol');
    for (let m = re.exec(text); m; m = re.exec(text)) {
      // Another module sees only public declarations (a protocol's requirements are public with it).
      // `@usableFromInline` declarations are exported too: inlinable public code calls them.
      const before = text.slice(Math.max(0, m.index - 120), m.index);
      const onLine = before.slice(before.lastIndexOf('\n') + 1);
      const attributes = before.slice(Math.max(0, before.lastIndexOf('\n\n')));
      if (
        !inProtocol &&
        !/\b(?:public|open)\b/.test(onLine) &&
        !/@usableFromInline\b/.test(attributes)
      )
        continue;
      const list = balanced(text, m.index + m[0].length - 1);
      if (list !== undefined)
        found.push(
          splitParams(list).map((p) => sourceOwnership(p.split('=')[0] as string, isInit)),
        );
    }
  }
  return found;
}

function matchDemangled(line: string, sources: JsiSources): string | undefined {
  const idents = [...line.matchAll(/ExpoModulesJSI\.(\w+)/g)].map((m) => m[1] as string);
  const first = idents[0];
  // A first name that is no type is a free function or variable of the module itself.
  const freeMember =
    first !== undefined &&
    !declares(sources, first) &&
    new RegExp(
      `^(?:[\\w ]*?(?:of|for) )?(?:static )?(?:\\(extension in ExpoModulesJSI\\):)?ExpoModulesJSI\\.${first}\\b[.(]?`,
    ).test(line);
  if (
    first !== undefined &&
    !declares(sources, first) &&
    !(freeMember && new RegExp(`\\b(?:func|var|let)\\s+\`?${first}\`?\\b`).test(sources.text))
  )
    return `${first} is not declared`;
  const enumCase = /^enum case for ExpoModulesJSI\.[\w.]+?\.(\w+)\(/.exec(line);
  if (enumCase)
    return new RegExp(`\\bcase\\s+[^\\n{]*\\b${enumCase[1]}\\b`).test(sources.text)
      ? undefined
      : `case ${enumCase[1]} is not declared`;
  let body = line
    .replace(/^(?:dispatch thunk of|method descriptor for|merged|protocol witness for) /, '')
    .replace(/^static /, '')
    .replace(/^\(extension in ExpoModulesJSI\):/, '');
  const accessor = /^(?:[\w.]+\.)?(\w+)\.(?:getter|setter|modify|read|_modify) :/.exec(body);
  if (accessor)
    return new RegExp(
      accessor[1] === 'subscript'
        ? '\\bsubscript\\b'
        : `\\b(?:var|let|case)\\s+\`?${accessor[1]}\`?\\b`,
    ).test(sources.text)
      ? undefined
      : `member ${accessor[1]} is not declared`;
  const call = /\.(init|__allocating_init|[A-Za-z_]\w*)\(/.exec(
    body.replace('__allocating_init', 'init'),
  );
  if (!call) return undefined; // type metadata, descriptors, witness tables: the type exists
  const index = call.index + 1;
  body = body.replace('__allocating_init', 'init');
  const list = balanced(body, index + (call[1] as string).length);
  if (list === undefined) return undefined;
  const wanted = splitParams(list)
    .filter((p) => p.trim() !== '')
    .map(symbolOwnership);
  const owner = /([A-Za-z_]\w*)(?:<[^>]*>)?$/.exec(body.slice(0, call.index))?.[1];
  const candidates = declaredSignatures(
    sources,
    call[1] as string,
    owner === 'ExpoModulesJSI' ? undefined : owner,
  );
  if (candidates.length === 0) return `${call[1]}() is not declared`;
  const same = (a: Ownership[], b: Ownership[]): boolean =>
    a.length === b.length && a.every((o, i) => o === b[i] || o === '*' || b[i] === '*');
  if (candidates.some((c) => same(c, wanted))) return undefined;
  return `${call[1]}(${wanted.map((o) => o || 'default').join(', ')}) has no declaration with these parameter conventions (declared: ${candidates.map((c) => `(${c.map((o) => o || 'default').join(', ')})`).join(' ')})`;
}

export function checkJsiSymbols(
  symbols: string[],
  demangleAll: (mangled: string) => string[],
  sources: JsiSources,
): Unmatched[] {
  const lines = demangleAll(symbols.join('\n'));
  const bad: Unmatched[] = [];
  symbols.forEach((symbol, i) => {
    const reason = matchDemangled(lines[i] ?? symbol, sources);
    if (reason) bad.push({ symbol, reason: `${reason}: ${lines[i]}` });
  });
  return bad;
}
