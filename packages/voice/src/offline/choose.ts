import { stripMarks, wordsOf } from '../text';

/**
 * What a person says, as the whole of what they say, to hand the choice to Scootch. The phone
 * knows these by itself, so "pick for me" works with no connection; anything looser is the
 * decision model's to read. Vietnamese is matched with and without its marks.
 */
const CHOOSE_PHRASES = [
  'pick for me',
  'pick one for me',
  'pick something for me',
  'pick one',
  'pick something',
  'pick anything',
  'you pick',
  'you choose',
  'you decide',
  'choose for me',
  'choose one for me',
  'choose something for me',
  'decide for me',
  'anything',
  'surprise me',
  'pick from the drawer',
  'pick one from the drawer',
  'something from the drawer',
  'chọn giúp mình',
  'chọn giúp tôi',
  'chọn giúp em',
  'chọn giúp',
  'chọn hộ mình',
  'chọn hộ tôi',
  'chọn giùm mình',
  'chọn giùm tôi',
  'chọn cho mình',
  'chọn cho tôi',
  'chọn đi',
  'bạn chọn đi',
  'chọn đại đi',
  'chọn một việc giúp mình',
  'lấy đại một việc',
  'gì cũng được',
  'việc gì cũng được',
  'tuỳ bạn',
] as const;

/** Small words that can stand before or after the request without changing it. */
const FILLERS = new Set([
  'scootch',
  'please',
  'just',
  'hey',
  'ok',
  'okay',
  'oi',
  'nhe',
  'nha',
  'di',
]);

const tidy = (text: string) => wordsOf(stripMarks(text));
const known = new Set(CHOOSE_PHRASES.map((phrase) => tidy(phrase).join(' ')));

/**
 * True when the text is nothing but a request for Scootch to choose. A text that names anything
 * to do is never one, whatever words it uses: "pick up the parcel" is a task.
 */
export function asksToChoose(text: string): boolean {
  let words = tidy(text);
  if (words.length === 0 || words.length > 8) return false;
  if (known.has(words.join(' '))) return true;
  while (words.length > 1 && FILLERS.has(words[0] ?? '')) words = words.slice(1);
  while (words.length > 1 && FILLERS.has(words.at(-1) ?? '')) words = words.slice(0, -1);
  return known.has(words.join(' '));
}
