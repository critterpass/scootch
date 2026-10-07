/**
 * A small QR code encoder for the site's own links: byte mode, error correction level L,
 * versions 1 to 5 (up to 106 bytes), which is every link the site makes. One block of data, so
 * no interleaving. Follows ISO/IEC 18004; the mask is chosen by the standard's penalty rules.
 */

/** Data and error correction codewords at level L, by version (index 0 is version 1). */
const versions = [
  { data: 19, correction: 7 },
  { data: 34, correction: 10 },
  { data: 55, correction: 15 },
  { data: 80, correction: 20 },
  { data: 108, correction: 26 },
] as const;

/** The longest text, in UTF-8 bytes, that fits. */
export const qrCapacity = 106;

/** Multiplies two elements of GF(256) under the QR polynomial x^8 + x^4 + x^3 + x^2 + 1. */
function multiply(x: number, y: number): number {
  let z = 0;
  for (let bit = 7; bit >= 0; bit -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> bit) & 1) * x;
  }
  return z & 0xff;
}

/** The Reed–Solomon error correction codewords for one block of data. */
function correctionFor(data: readonly number[], degree: number): number[] {
  const divisor = Array<number>(degree).fill(0);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      divisor[j] = multiply(divisor[j] ?? 0, root) ^ (divisor[j + 1] ?? 0);
    }
    root = multiply(root, 2);
  }
  const remainder = Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() ?? 0);
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) {
      remainder[i] = (remainder[i] ?? 0) ^ multiply(divisor[i] ?? 0, factor);
    }
  }
  return remainder;
}

/** The text as data codewords: the mode, the length, the bytes, then padding to the capacity. */
function codewords(bytes: Uint8Array, capacity: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number): void => {
    for (let bit = length - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  push(0, Math.min(4, capacity * 8 - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  for (let pad = 0xec; data.length < capacity; pad ^= 0xec ^ 0x11) data.push(pad);
  return data;
}

type Grid = { size: number; dark: boolean[][]; fixed: boolean[][] };

function emptyGrid(size: number): Grid {
  const rows = (): boolean[][] =>
    Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  return { size, dark: rows(), fixed: rows() };
}

/** Sets a module that is part of the symbol's own structure, never of the data. */
function fix(grid: Grid, x: number, y: number, dark: boolean): void {
  const row = grid.dark[y];
  const fixedRow = grid.fixed[y];
  if (!row || !fixedRow || x < 0 || x >= grid.size) return;
  row[x] = dark;
  fixedRow[x] = true;
}

/** The finder patterns with their separators, the timing lines and the alignment pattern. */
function drawStructure(grid: Grid, version: number): void {
  const { size } = grid;
  for (let i = 0; i < size; i += 1) {
    fix(grid, 6, i, i % 2 === 0);
    fix(grid, i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        fix(grid, cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  }
  if (version >= 2) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        fix(grid, size - 7 + dx, size - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
}

/** The fifteen format bits (level L and the mask), written twice around the finders. */
function drawFormat(grid: Grid, mask: number): void {
  const data = (1 << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;
  const { size } = grid;
  for (let i = 0; i <= 5; i += 1) fix(grid, 8, i, bit(i));
  fix(grid, 8, 7, bit(6));
  fix(grid, 8, 8, bit(7));
  fix(grid, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) fix(grid, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i += 1) fix(grid, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) fix(grid, 8, size - 15 + i, bit(i));
  fix(grid, 8, size - 8, true);
}

/** Lays the codewords in the zigzag the standard asks for, around the fixed modules. */
function drawData(grid: Grid, data: readonly number[]): void {
  const { size } = grid;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - step : step;
        const row = grid.dark[y];
        if (!row || grid.fixed[y]?.[x] !== false || index >= data.length * 8) continue;
        row[x] = (((data[index >>> 3] ?? 0) >>> (7 - (index & 7))) & 1) === 1;
        index += 1;
      }
    }
  }
}

const masks: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Flips the data modules a mask covers. Applying the same mask again undoes it. */
function applyMask(grid: Grid, mask: number): void {
  const covers = masks[mask];
  if (!covers) return;
  grid.dark.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (grid.fixed[y]?.[x] === false && covers(x, y)) row[x] = !dark;
    });
  });
}

/** How hard a symbol is to read, by the standard's four rules. Lower is better. */
function penalty({ size, dark }: Grid): number {
  const at = (x: number, y: number): boolean => dark[y]?.[x] === true;
  let score = 0;
  let darkCount = 0;
  const finderLike = (line: boolean[], start: number): boolean =>
    [true, false, true, true, true, false, true].every((want, i) => line[start + i] === want);
  const quiet = (line: boolean[], from: number): boolean =>
    [0, 1, 2, 3].every((i) => line[from + i] !== true);
  for (let i = 0; i < size; i += 1) {
    for (const line of [
      Array.from({ length: size }, (_, j) => at(j, i)),
      Array.from({ length: size }, (_, j) => at(i, j)),
    ]) {
      let run = 1;
      for (let j = 1; j <= size; j += 1) {
        if (j < size && line[j] === line[j - 1]) run += 1;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      for (let j = 0; j + 7 <= size; j += 1) {
        if (finderLike(line, j) && (quiet(line, j - 4) || quiet(line, j + 7))) score += 40;
      }
    }
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (at(x, y)) darkCount += 1;
      if (x + 1 < size && y + 1 < size) {
        const colour = at(x, y);
        if (at(x + 1, y) === colour && at(x, y + 1) === colour && at(x + 1, y + 1) === colour) {
          score += 3;
        }
      }
    }
  }
  return score + Math.floor(Math.abs((darkCount * 20) / (size * size) - 10)) * 10;
}

/**
 * The QR code for a text, as rows of modules (`true` is dark), without the quiet zone. Throws
 * for a text longer than `qrCapacity` bytes.
 */
export function qrModules(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const index = versions.findIndex(({ data }) => bytes.length <= data - 2);
  const spec = versions[index];
  if (!spec) throw new Error('The text is too long for this QR code');
  const version = index + 1;
  const data = codewords(bytes, spec.data);
  const grid = emptyGrid(17 + 4 * version);
  drawStructure(grid, version);
  drawFormat(grid, 0);
  drawData(grid, [...data, ...correctionFor(data, spec.correction)]);

  let best = { mask: 0, score: Infinity };
  for (let mask = 0; mask < masks.length; mask += 1) {
    applyMask(grid, mask);
    drawFormat(grid, mask);
    const score = penalty(grid);
    if (score < best.score) best = { mask, score };
    applyMask(grid, mask);
  }
  applyMask(grid, best.mask);
  drawFormat(grid, best.mask);
  return grid.dark;
}

/** The QR code as an SVG picture with its quiet zone: dark modules in ink, on white. */
export function qrSvg(text: string, label: string): string {
  const modules = qrModules(text);
  const quiet = 4;
  const side = modules.length + quiet * 2;
  const path = modules
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + quiet} ${y + quiet}h1v1h-1z` : '')))
    .join('');
  const title = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" role="img" shape-rendering="crispEdges"><title>${title}</title><rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="#111"/></svg>`;
}
