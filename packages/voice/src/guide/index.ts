import type { Attitude, Language } from '@scootch/domain';

import { enGuide } from './en';
import type { VoiceGuide } from './types';
import { viGuide } from './vi';

export * from './types';

export const voiceGuides: Readonly<Record<Language, VoiceGuide>> = { en: enGuide, vi: viGuide };

/** A small seeded generator, so one seed always draws the same sample. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(pool: readonly T[], count: number, random: () => number): T[] {
  const rest = [...pool];
  const picked: T[] = [];
  while (picked.length < count && rest.length > 0) {
    picked.push(...rest.splice(Math.floor(random() * rest.length), 1));
  }
  return picked;
}

/** The first part of a "Name, Title" monster name. */
export function monsterFirstName(name: string): string {
  return (name.split(',')[0] ?? name).trim();
}

export type GuideSample = {
  readonly examples: readonly string[];
  readonly never: readonly string[];
  readonly monsterNames: readonly string[];
  readonly angles: readonly string[];
  /** How to build this call's monster name, so one name does not become every call's name. */
  readonly nameIdea: string;
};

/**
 * What one call is shown from the pools: a few tone examples, a few lines never to say, a few
 * monster names and a few angles. A different seed shows a different mix.
 */
export function sampleGuide(language: Language, attitude: Attitude, seed: number): GuideSample {
  const guide = voiceGuides[language];
  const random = randomFrom(seed);
  const monsterNames = pick(guide.monsterNames, 4, random);
  const [stage = ''] = monsterNames.splice(0, 1);
  return {
    examples: pick(guide.attitudes[attitude].examples, 4, random).map((line) =>
      line.replaceAll('{monster}', monsterFirstName(stage)),
    ),
    never: pick(guide.attitudes[attitude].never, 3, random),
    monsterNames,
    angles: pick(guide.angles, 3, random),
    nameIdea: guide.nameIdea(
      pick(guide.nameShapes, 1, random)[0] ?? '',
      pick(guide.nameOpenings, 1, random)[0] ?? '',
    ),
  };
}

function section(title: string, lines: readonly string[]): string {
  return [`# ${title}`, ...lines.map((line) => `- ${line}`)].join('\n');
}

/**
 * The voice guide as prompt text, in its own language, for one attitude and one seed. Every
 * route that writes in Scootch's voice starts its system prompt with this.
 */
export function renderVoiceGuide(language: Language, attitude: Attitude, seed: number): string {
  const guide = voiceGuides[language];
  const chosen = guide.attitudes[attitude];
  const sample = sampleGuide(language, attitude, seed);
  return [
    guide.intro,
    section(guide.headings.rules, guide.rules),
    `# ${guide.headings.attitude}: ${chosen.name}\n${chosen.description}`,
    `# ${guide.headings.bannedWords}\n${[...guide.bannedWords, ...guide.contextWords.filter(({ reason }) => reason === 'banned_word').map(({ word }) => word)].map((word) => word.replace('*', '')).join(', ')}`,
    `# ${guide.headings.offLimits}\n${guide.offLimitsNote}`,
    section(guide.headings.examples, sample.examples),
    section(guide.headings.never, sample.never),
    `${section(guide.headings.monsterNames, sample.monsterNames)}\n${sample.nameIdea}`,
    section(guide.headings.angles, sample.angles),
  ].join('\n\n');
}
