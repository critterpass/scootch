import { TaskSet, useCapture } from './captures';
import type { TaskSetHelpers } from './task-set-helpers';

// The set task's helpers as the screen registry shows them. The bites' words are the warm-up
// examples, in the capture's language; an unscreened task has no pack yet, so it has no bites.

const nothing = () => undefined;

type HelpersCapture = 'guess' | 'guess-open' | 'guess-made' | 'bites-open';

function useCapturedHelpers(capture: HelpersCapture, bitten: boolean): TaskSetHelpers {
  const { t } = useCapture();
  const texts = [t('launch.chip.reply'), t('launch.chip.water'), t('launch.chip.email')];
  const minutes = [1, 3, 1];
  const rows = texts.map((text, place) => ({
    place,
    text,
    minutes: minutes[place] ?? null,
    ticked: place === 0,
    opensCatch: place === texts.length - 1,
  }));
  return {
    guess: { minutes: capture === 'guess-made' ? 120 : null, onGuess: nothing },
    bites: bitten ? { name: 'Molar', rows, onTick: nothing } : null,
    ...(capture === 'guess-open' ? { opened: 'guess' as const } : {}),
    ...(capture === 'bites-open' ? { opened: 'bites' as const } : {}),
  };
}

function WithHelpers({
  capture,
  offline = false,
}: {
  readonly capture: HelpersCapture;
  readonly offline?: boolean;
}) {
  return <TaskSet offline={offline} helpers={useCapturedHelpers(capture, !offline)} />;
}

/** The set task with its helpers at rest: "Ends at" under the wheel, the Guess chip and the bites. */
export function OneScreenTaskSetEndsAt() {
  return <WithHelpers capture="guess" />;
}

/** "How long would this take?", open over the set task. */
export function OneScreenTaskSetGuessSheet() {
  return <WithHelpers capture="guess-open" />;
}

/** A guess made: the chip reads it back. */
export function OneScreenTaskSetGuessMade() {
  return <WithHelpers capture="guess-made" />;
}

/** The bites, open over the set task, with the first one ticked. */
export function OneScreenTaskSetBitesSheet() {
  return <WithHelpers capture="bites-open" />;
}

/** No connection: "Ends at" and the guess are the phone's own, and there are no bites to open. */
export function OneScreenTaskSetHelpersOffline() {
  return <WithHelpers capture="guess" offline />;
}

/** No connection, and the guess asked for: the sheet needs nothing from the server. */
export function OneScreenTaskSetGuessSheetOffline() {
  return <WithHelpers capture="guess-open" offline />;
}
