import type { Attitude, Language } from '@scootch/domain';

/** Things Scootch never jokes about, whatever the task. */
export const offLimitsTopics = ['politics', 'religion', 'bodies', 'harm', 'hardship'] as const;
export type OffLimitsTopic = (typeof offLimitsTopics)[number];

/**
 * A word list entry is a word or a phrase matched whole, in any letter case. A trailing `*`
 * matches every ending (`fail*` matches failed and failure).
 */
export type WordList = readonly string[];

export type AttitudeGuide = {
  /** The attitude's name as the prompt shows it. */
  readonly name: string;
  readonly description: string;
  /**
   * The pool of good lines. A few are sampled per call, because a model shown the same example
   * every time copies it. `{monster}` is filled with a rotated monster name.
   */
  readonly examples: readonly string[];
  /** Lines that break the voice at this attitude. */
  readonly never: readonly string[];
};

/** The headings of the rendered guide, in the guide's own language. */
export type GuideHeadings = {
  readonly rules: string;
  readonly attitude: string;
  readonly bannedWords: string;
  readonly offLimits: string;
  readonly examples: string;
  readonly never: string;
  readonly monsterNames: string;
  readonly angles: string;
};

/**
 * One language's voice guide, as data. It is the single source of the prompt and of the line
 * checker's word lists. Each language is written in that language, not translated.
 */
export type VoiceGuide = {
  readonly language: Language;
  readonly intro: string;
  readonly rules: readonly string[];
  readonly attitudes: Readonly<Record<Attitude, AttitudeGuide>>;
  /** Words Scootch never uses, at any attitude. */
  readonly bannedWords: WordList;
  /** Keywords that mark a topic Scootch never jokes about. */
  readonly offLimits: Readonly<Record<OffLimitsTopic, WordList>>;
  /** The off-limits topics in a sentence, for the prompt. */
  readonly offLimitsNote: string;
  /** Phrases that judge the user: their worth, habits, memory or past. */
  readonly userWorth: WordList;
  /** Phrases that count days, mention a gap or remark on coming back. */
  readonly missedDays: WordList;
  /** "Name, Title" examples. They show the shape and are never accepted back as output. */
  readonly monsterNames: readonly string[];
  /** Comic angles, rotated per call so one motif does not become the default joke. */
  readonly angles: readonly string[];
  readonly headings: GuideHeadings;
};
