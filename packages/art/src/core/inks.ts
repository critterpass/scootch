import type { MonsterInk } from './spec';

export interface InkPair {
  readonly body: string;
  readonly shade: string;
  /** Light inks take dark face lines; dark inks take pale ones. */
  readonly light: boolean;
}

export const INKS: Record<MonsterInk, InkPair> = {
  charcoal: { body: '#3A3430', shade: '#221E1B', light: false },
  navy: { body: '#34506E', shade: '#22364C', light: false },
  moss: { body: '#4C6A4C', shade: '#334833', light: false },
  plum: { body: '#5E3B57', shade: '#40273B', light: false },
  teal: { body: '#2F6461', shade: '#1E4442', light: false },
  rust: { body: '#7A4A32', shade: '#553220', light: false },
  mustard: { body: '#C1922F', shade: '#9A7020', light: true },
  lilac: { body: '#8C80AE', shade: '#6B6090', light: true },
  kraft: { body: '#B8925F', shade: '#987443', light: true },
};

/** The inks a body draws from when it names none of its own. Kraft belongs to the box alone. */
export const COMMON_INKS: readonly MonsterInk[] = [
  'charcoal',
  'navy',
  'moss',
  'plum',
  'teal',
  'rust',
  'mustard',
  'lilac',
];
