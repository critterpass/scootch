import type { IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { Translate } from '../../i18n/i18n-provider';
import { dayWords } from '../drawer/day-words';

import { RETURN_CHIPS, type Stage } from './one-screen-stage';
import type { OneScreenShown } from './one-screen-view';

export interface ComposerWaysInput {
  readonly stage: Extract<Stage, { readonly kind: 'composer' }>;
  /** Straight after first launch the warm-up chips are shown instead of "pick for me". */
  readonly warmUp: boolean;
  readonly t: Translate;
  readonly language: Language;
  readonly today: IsoDate;
  /** Sends a chip's own words as what the person wants to do. */
  readonly sendChip: (text: string) => void;
  readonly pickForMe: () => void;
}

/**
 * The small ways in under the ask: the three chips of a return, or "pick for me", with a dated
 * thing that is close said quietly beside them. Nothing is added when there is no chip to show.
 */
export function composerWays(
  input: ComposerWaysInput,
): Pick<Extract<OneScreenShown, { readonly kind: 'composer' }>, 'ways'> {
  const { stage, t } = input;
  const pickLabel = t('morning.chip.pick');
  const chips = stage.returning
    ? RETURN_CHIPS.filter((chip) => chip.id !== 'pick' || stage.canPickForMe).map((chip) =>
        t(chip.label),
      )
    : stage.canPickForMe && !input.warmUp
      ? [pickLabel]
      : [];
  if (chips.length === 0) return {};
  return {
    ways: {
      chips,
      hint: t('morning.chip.hint'),
      onChip: (text) => (text === pickLabel ? input.pickForMe() : input.sendChip(text)),
      note: stage.note
        ? t('morning.note', {
            thing: stage.note.item.text,
            day: dayWords(stage.note.dueDate, input.today, input.language),
          })
        : null,
    },
  };
}
