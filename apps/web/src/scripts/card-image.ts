import { buildMonster, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';
import { colors } from '@scootch/tokens';

export type CardToSave = {
  readonly seed: string;
  readonly bodyType: keyof typeof MONSTER_BODIES;
  readonly name: string;
  readonly flavourText: string;
  /** Null when the visitor hid what they typed: the image then carries no trace of it. */
  readonly typed: string | null;
};

const width = 600;
const height = 840;
const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Breaks a line into rows of about `perRow` characters, at spaces. */
function rows(text: string, perRow: number, most: number): string[] {
  const out: string[] = [];
  let row = '';
  for (const word of text.split(/\s+/)) {
    if (row !== '' && `${row} ${word}`.length > perRow) {
      out.push(row);
      row = word;
    } else {
      row = row === '' ? word : `${row} ${word}`;
    }
  }
  if (row !== '') out.push(row);
  return out.slice(0, most);
}

function textRows(lines: readonly string[], x: number, y: number, step: number, style: string) {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * step}" ${style}>${escape(line)}</text>`)
    .join('');
}

/** The card as one standalone SVG, in the light inks whatever the page is showing. */
export function cardSvg(card: CardToSave): string {
  const ink = colors.light;
  const monster = toSvg(buildMonster(specFromSeed(card.bodyType, card.seed)), {
    idPrefix: 'c-',
  }).replace('<svg ', '<svg x="110" y="170" width="380" height="380" ');
  const sans = 'font-family="ui-rounded, system-ui, sans-serif"';
  const typed = card.typed === null ? [] : rows(`“${card.typed}”`, 44, 1);
  const flavourTop = typed.length > 0 ? 668 : 636;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="44" fill="${ink.ink}"/>`,
    `<rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="30" fill="${ink.page}"/>`,
    textRows(
      rows(card.name, 26, 2),
      48,
      84,
      36,
      `${sans} font-size="30" font-weight="800" fill="${ink.ink}"`,
    ),
    `<rect x="48" y="150" width="504" height="430" rx="18" fill="${ink.risoBlob}"/>`,
    monster,
    textRows(typed, 48, 628, 30, `${sans} font-size="22" font-weight="700" fill="${ink.muted}"`),
    textRows(
      rows(card.flavourText, 46, 3),
      48,
      flavourTop,
      30,
      `${sans} font-size="22" font-style="italic" fill="${ink.ink}"`,
    ),
    `<text x="552" y="792" text-anchor="end" ${sans} font-size="22" font-weight="800" fill="${ink.ink}">scootch.app</text>`,
    '</svg>',
  ].join('');
}

/** Saves the card as a PNG, drawn in the browser. Nothing is sent anywhere. */
export async function saveCardImage(card: CardToSave): Promise<void> {
  const image = new Image();
  const source = URL.createObjectURL(new Blob([cardSvg(card)], { type: 'image/svg+xml' }));
  try {
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'scootch-monster.png';
    link.click();
  } finally {
    URL.revokeObjectURL(source);
  }
}
