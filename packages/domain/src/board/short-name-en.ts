import {
  cutToFit,
  SHORT_NAME_MOST,
  upToLink,
  withoutLeading,
  type ChalkWord,
} from './short-name-words';

/** English: what is said before the task itself ("I need to", "okay so"). */
const FILLER: readonly (readonly string[])[] = [
  ['okay', 'so'],
  ['ok', 'so'],
  ['so'],
  ['um'],
  ['uh'],
  ['and'],
  ['then'],
  ['also'],
  ['please'],
  ['i', 'need', 'to'],
  ['need', 'to'],
  ['i', 'have', 'to'],
  ['have', 'to'],
  ["i've", 'got', 'to'],
  ['i', 'got', 'to'],
  ['got', 'to'],
  ['i', 'gotta'],
  ['gotta'],
  ['i', 'must'],
  ['must'],
  ['i', 'should'],
  ['should'],
  ['i', 'want', 'to'],
  ['want', 'to'],
  ["i'll"],
  ['i', 'will'],
  ['remember', 'to'],
  ["don't", 'forget', 'to'],
  ['dont', 'forget', 'to'],
  ['try', 'to'],
  ['go', 'and'],
  ['to'],
];

/** Articles and the plainest possessives: chalk leaves them out. */
const ARTICLES = new Set(['the', 'a', 'an', 'my', 'your', 'our', 'their', 'some']);

/** Where the noun phrase ends and the reason, the time or a second clause begins. */
const LINKS = new Set([
  'to',
  'about',
  'for',
  'because',
  'so',
  'and',
  'before',
  'after',
  'by',
  'on',
  'at',
  're',
  'regarding',
  'with',
  'from',
  'until',
  'till',
  'when',
  'if',
  'then',
  'since',
  'while',
  'but',
  'or',
  'in',
  'into',
  'as',
  'that',
  'which',
  'asap',
  'today',
  'tonight',
  'tomorrow',
]);

/** Words that finish a verb ("pick up", "sign in") and are not yet its object. */
const PARTICLES = new Set(['up', 'out', 'off', 'down', 'back', 'over', 'away', 'in', 'on']);

/** A word left hanging at the end of a cut is dropped. */
const DANGLING = new Set([...ARTICLES, ...LINKS, 'of', 'his', 'her', 'its']);

const EMAIL = new Set(['email', 'e-mail', 'mail']);

/** A message and who it goes to: "Email the dentist …", "Send an email to the dentist …". */
type Emailed = { readonly word: string; readonly to: readonly ChalkWord[] };

function emailed(words: readonly ChalkWord[]): Emailed | null {
  const [first, second, third, fourth] = words;
  if (first === undefined) return null;
  if (EMAIL.has(first.low)) return { word: first.low, to: words.slice(1) };
  if (first.low !== 'send' && first.low !== 'write') return null;
  if (second !== undefined && EMAIL.has(second.low) && third?.low === 'to') {
    return { word: second.low, to: words.slice(3) };
  }
  const article = second !== undefined && ARTICLES.has(second.low);
  if (article && third !== undefined && EMAIL.has(third.low) && fourth?.low === 'to') {
    return { word: third.low, to: words.slice(4) };
  }
  return null;
}

/** "Dentist email": who it goes to, then the word as it was said, when that fits on the chalk. */
function emailName({ word, to }: Emailed): string[] | null {
  const object = upToLink(to, LINKS)
    .filter((one) => !ARTICLES.has(one.low))
    .map((one) => one.said);
  if (object.length === 0) return null;
  const fits = cutToFit(object, DANGLING, SHORT_NAME_MOST - word.length - 1);
  const name = [...fits, word];
  return name.join(' ').length <= SHORT_NAME_MOST ? name : null;
}

/** English chalk: the verb and its object, without filler, articles or what follows a link. */
export function chalkEnglish(words: readonly ChalkWord[]): string[] {
  const task = withoutLeading(words, FILLER);
  const message = emailed(task);
  const email = message === null ? null : emailName(message);
  if (email !== null) return email;
  const [verb, ...rest] = task;
  if (verb === undefined) return [];
  const phrase = [verb, ...upToLink(rest, LINKS, PARTICLES)];
  const kept = phrase.filter((word) => !ARTICLES.has(word.low));
  return cutToFit(
    (kept.length > 0 ? kept : phrase).map((word) => word.said),
    DANGLING,
  );
}
