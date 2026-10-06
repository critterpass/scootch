import type { Attitude, Language } from '@scootch/domain';

/** Things Scootch never jokes about, whatever the task. */
export const offLimitsTopics = ['politics', 'religion', 'bodies', 'harm', 'hardship'] as const;
export type OffLimitsTopic = (typeof offLimitsTopics)[number];

/**
 * A word list entry is a word or a phrase matched whole, in any letter case. A trailing `*`
 * matches every ending (`fail*` matches failed and failure).
 */
export type WordList = readonly string[];

/**
 * A word that is only wrong in some of its senses. `lapse` and `safe` are pattern sources matched
 * against the lower-cased line as whole words: a `lapse` use is about the user or something that
 * slipped and always fails; a `safe` use is plain description of the task and passes. `otherwise`
 * says what a use matching neither does.
 */
export type ContextWord = {
  readonly word: string;
  readonly reason: 'banned_word' | `topic_${OffLimitsTopic}`;
  readonly lapse: readonly string[];
  readonly safe: readonly string[];
  readonly otherwise: 'fail' | 'pass';
};

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
  /** Words banned by what they are about, not by their letters. The prompt lists them as banned. */
  readonly contextWords: readonly ContextWord[];
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
  /** First names a model reaches for on its own, whatever the prompt shows. Never accepted. */
  readonly nameAttractors: readonly string[];
  /** Ways to build a first name. One is drawn per call, so no single name becomes the default. */
  readonly nameShapes: readonly string[];
  /** Opening letters or sounds for a first name. One is drawn per call. */
  readonly nameOpenings: readonly string[];
  /** The sentence that hands the drawn shape and opening to the writer. */
  readonly nameIdea: (shape: string, opening: string) => string;
  /** Comic angles, rotated per call so one motif does not become the default joke. */
  readonly angles: readonly string[];
  readonly headings: GuideHeadings;
};
