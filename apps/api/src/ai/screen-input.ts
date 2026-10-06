import type { ScreenInputResponse } from '../contracts';

import type { Decision } from './decide';
import type { ChoiceQuestion } from './jev';

/**
 * The care screen's question and thresholds, in one place. The thresholds were measured against
 * this exact wording on the pinned Jev version, so the two change together and only with the eval
 * set (`packages/voice/evals/screen-input`) rerun.
 *
 * The question has no `reject` option, so this screen never answers `reject`.
 */
export const screenInputQuestion = {
  instructions:
    'The state is a note a person wrote to a to-do app, in English or Vietnamese. Which kind of note is it? Judge the real meaning, not single words: exaggerated everyday idioms about being busy, tired or annoyed are ordinary.',
  criteria: {
    pass: 'An ordinary task or everyday worry. Includes figurative dark idioms with no real danger and routine errands such as a dentist checkup.',
    serious:
      'A heavy life matter where jokes would hurt: serious illness, medical results or a diagnosis, a death or funeral, court or legal trouble, divorce or custody, a debt crisis or eviction. No sign the writer may harm themselves.',
    crisis:
      'The writer may be in danger: wanting to die or to harm themselves, stated directly or hinted at, such as saying goodbye, giving belongings away, not being around much longer, being a burden others are better off without, or thinking about a method.',
  },
} as const satisfies ChoiceQuestion;

export type ScreenLabel = keyof typeof screenInputQuestion.criteria;
export type ScreenProbabilities = Readonly<Record<ScreenLabel, number>>;

export const screenThresholds = {
  /** Crisis at or above this p(crisis), whatever else is likely. */
  crisisAtLeast: 0.1,
  /** Serious at or above this p(serious). */
  seriousAtLeast: 0.2,
  /** Serious when p(pass) is under this. */
  passAtLeast: 0.9,
} as const;

/**
 * The verdict for one set of probabilities. `pass` has to be earned on every count: anything
 * else, a number that is not a number included, is the quieter answer.
 */
export function screenVerdict({ pass, serious, crisis }: ScreenProbabilities): ScreenLabel {
  if (crisis >= screenThresholds.crisisAtLeast) return 'crisis';
  const clear =
    crisis < screenThresholds.crisisAtLeast &&
    serious < screenThresholds.seriousAtLeast &&
    pass >= screenThresholds.passAtLeast;
  return clear ? 'pass' : 'serious';
}

/** What the phone is told when no model answered: no joke, and nothing judged. */
export const unscreenedResponse: ScreenInputResponse = {
  verdict: 'serious',
  confidence: 0,
  lowConfidence: true,
  answeredBy: 'default',
};

/** A decision as the route's response. Low confidence means caution chose the verdict. */
export function screenResponse(decision: Decision<ScreenLabel>): ScreenInputResponse {
  const { choice, probabilities } = decision.answer;
  const verdict = screenVerdict(probabilities);
  return {
    verdict,
    confidence: probabilities[choice],
    lowConfidence: verdict !== choice,
    answeredBy: decision.answeredBy,
  };
}
