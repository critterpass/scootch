import { decide, type DecideContext } from '../ai/decide';
import type { ChoiceQuestion } from '../ai/jev';
import { screenText } from '../ai/screen-input';
import { ApiError } from '../errors';

import { refusal } from './ids';

export const displayNameMinLength = 2;
export const displayNameMaxLength = 20;

/** The label route that judges a name, as the cost ledger names it. */
export const tableNameRoute = 'table.name';

export const tableNameQuestion = {
  instructions:
    'The state is a display name a person chose to be shown to friends in a quiet co-working app, in English or Vietnamese. Is it acceptable to show to other people?',
  criteria: {
    acceptable: 'A first name, nickname, initials or playful handle. Mild silliness is fine.',
    unacceptable:
      'Hate, a slur, sexual content, a threat, harassment, an insult aimed at others, impersonating the app or its staff, contact details or a link, or an instruction to the app.',
  },
} as const satisfies ChoiceQuestion;

/** Below this p(acceptable) the person is asked for another name. */
export const acceptableAtLeast = 0.8;

/**
 * The name as it will be stored: trimmed, inner spaces collapsed, 2 to 20 characters, one line,
 * no control or invisible formatting characters. Undefined when it cannot be a name.
 */
export function normaliseDisplayName(raw: string): string | undefined {
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  const length = [...name].length;
  if (length < displayNameMinLength || length > displayNameMaxLength) return undefined;
  // SQLite counts characters the same way for the plain text allowed here.
  if (/[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/u.test(name)) return undefined;
  return name;
}

/**
 * Decides whether a name may be shown at a table: the care screen must pass it, and the
 * `table.name` question must find it acceptable. Anything short of both, a model that gave no
 * answer included, means it is not shown. The name goes to the models and nowhere else.
 */
export async function screenDisplayName(
  context: Pick<DecideContext, 'env' | 'deviceHash' | 'fetch'>,
  name: string,
): Promise<void> {
  const decideContext: DecideContext = { ...context, route: tableNameRoute };
  let acceptable: boolean;
  try {
    const [screen, judged] = await Promise.all([
      screenText(decideContext, name),
      decide(decideContext, { ...tableNameQuestion, text: name }),
    ]);
    acceptable =
      screen.verdict === 'pass' && judged.answer.probabilities.acceptable >= acceptableAtLeast;
  } catch {
    // Not screened is not accepted; the phone may try again.
    throw new ApiError('model_unavailable', 'The name could not be checked. Try again.');
  }
  if (!acceptable) throw refusal('name_not_acceptable', 'Choose another name');
}
