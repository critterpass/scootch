import { DEFAULT_DAY_MOMENT_TIMES, type StartCue } from '@scootch/domain';

import { TaskSet, useCapture } from './captures';
import type { TaskSetHelpers } from './task-set-helpers';

// The set task's helpers as the screen registry shows them. The bites' words are the warm-up
// examples, in the capture's language; an unscreened task has no pack yet, so it has no bites.

const nothing = () => undefined;

type HelpersCapture =
  'guess' | 'guess-open' | 'guess-made' | 'bites-open' | 'when-open' | 'when-picked' | 'when-saved';

/** The cue the captures pick. The captures stand at 15:32, so lunch would be behind them. */
const DINNER: StartCue = { kind: 'moment', moment: 'dinner' };
const cued = (capture: HelpersCapture) => capture === 'when-picked' || capture === 'when-saved';

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
    guess: {
      minutes: capture === 'guess-made' || cued(capture) ? 120 : null,
      onGuess: nothing,
    },
    when: {
      cue: cued(capture) ? DINNER : null,
      moments: DEFAULT_DAY_MOMENT_TIMES,
      onCue: nothing,
    },
    bites: bitten ? { name: 'Molar', rows, onTick: nothing } : null,
    ...(capture === 'guess-open' ? { opened: 'guess' as const } : {}),
    ...(capture === 'bites-open' ? { opened: 'bites' as const } : {}),
    ...(capture === 'when-open' ? { opened: 'when' as const } : {}),
  };
}

function WithHelpers({
  capture,
  offline = false,
}: {
  readonly capture: HelpersCapture;
  readonly offline?: boolean;
}) {
  const helpers = useCapturedHelpers(capture, !offline);
  return (
    <TaskSet
      offline={offline}
      helpers={helpers}
      {...(cued(capture)
        ? { cue: { cue: DINNER, moments: DEFAULT_DAY_MOMENT_TIMES, localDate: '2026-10-06' } }
        : {})}
      {...(capture === 'when-picked' ? { onSave: nothing } : {})}
    />
  );
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

/** "When should I bring it back?", open over the set task. */
export function OneScreenTaskSetWhenSheet() {
  return <WithHelpers capture="when-open" />;
}

/** A cue picked: the chips read back, the line says when, and the dock is Start now, Save for later. */
export function OneScreenTaskSetWhenPicked() {
  return <WithHelpers capture="when-picked" />;
}

/** The cue saved: the thing stays set, its chip reads the cue back, and the one action is Start. */
export function OneScreenTaskSetWhenSaved() {
  return <WithHelpers capture="when-saved" />;
}

/** No connection, a cue picked: the cue and its message are the phone's own. */
export function OneScreenTaskSetWhenPickedOffline() {
  return <WithHelpers capture="when-picked" offline />;
}

/** No connection, and the When sheet open: it needs nothing from the server. */
export function OneScreenTaskSetWhenSheetOffline() {
  return <WithHelpers capture="when-open" offline />;
}
