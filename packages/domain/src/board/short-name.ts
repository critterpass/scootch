import { chalkEnglish } from './short-name-en';
import { chalkVietnamese } from './short-name-vi';
import { chalkWords, cutToFit } from './short-name-words';

export { SHORT_NAME_MOST } from './short-name-words';

/**
 * A task's short name: the few words the chalkboard and the board write for it ("Dentist email"),
 * where the desk card keeps the user's whole sentence. Worked out on the phone, from the task's
 * own words only, so it never says anything the task did not.
 */

export type ShortNameLanguage = 'en' | 'vi';

const vietnameseLetters = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu;

/** The language a task is written in: Vietnamese when it carries Vietnamese letters. */
export function taskLanguage(text: string): ShortNameLanguage {
  return vietnameseLetters.test(text.normalize('NFC')) ? 'vi' : 'en';
}

function capitalised(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * The short name for a task, in its own language: filler and articles dropped, the noun phrase
 * kept, cut at a word. The same words always give the same name.
 */
export function shortName(text: string, language: ShortNameLanguage = taskLanguage(text)): string {
  const words = chalkWords(text);
  if (words.length === 0) return text.trim();
  const chalk = language === 'vi' ? chalkVietnamese(words) : chalkEnglish(words);
  const kept =
    chalk.length > 0
      ? chalk
      : cutToFit(
          words.map((word) => word.said),
          new Set(),
        );
  return capitalised(kept.join(' '));
}
