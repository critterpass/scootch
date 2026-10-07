import type { IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { Translate } from '../../i18n/i18n-provider';
import { dayWords } from '../drawer/day-words';

import { RETURN_CHIPS, type Stage } from './one-screen-stage';
import type { OneScreenShown } from './one-screen-view';

export interface ComposerWaysInput {
  readonly stage: Extract<Stage, { readonly kind: 'home' }>;
  readonly t: Translate;
  readonly language: Language;
  readonly today: IsoDate;
  /** Sends a chip's own words as what the person wants to do. */
  readonly sendChip: (text: string) => void;
}

/**
 * The small ways in under the ask on a return: its chips, with a dated thing that is close said
 * quietly beside them. Nothing is added on any other morning, or once the day has no start left.
 */
export function composerWays(
  input: ComposerWaysInput,
): Pick<Extract<OneScreenShown, { readonly kind: 'composer' }>, 'ways'> {
  const { stage, t } = input;
  if (!stage.returning || !stage.startLeft) return {};
  return {
    ways: {
      chips: RETURN_CHIPS.map((chip) => t(chip.label)),
      hint: t('morning.chip.hint'),
      onChip: input.sendChip,
      note: stage.note
        ? t('morning.note', {
            thing: stage.note.item.text,
            day: dayWords(stage.note.dueDate, input.today, input.language),
          })
        : null,
    },
  };
}
