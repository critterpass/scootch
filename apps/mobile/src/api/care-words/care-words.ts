/** One language's lists for the on-phone care gate. */
export interface CareWords {
  /** Everyday exaggerations, removed before anything is matched. */
  readonly idioms: readonly string[];
  /** Explicit phrases: crisis at once, with no connection needed. */
  readonly crisis: readonly string[];
  /** Dark or heavy words: no joke until the server has screened the text. */
  readonly hold: readonly string[];
  /** Words as typed with no accent marks. Ambiguous, so they hold and never call a crisis. */
  readonly holdWithoutMarks: readonly string[];
}
