import { englishVerbs } from '../hearing/split-words';

import {
  cutToFit,
  SHORT_NAME_MOST,
  upToLink,
  upToPause,
  withoutLeading,
  type ChalkWord,
} from './short-name-words';

/** English: what is said before the task itself ("I need to", "okay so"). */
const FILLER: readonly (readonly string[])[] = [
  ['okay', 'so'],
  ['ok', 'so'],
  ['okay'],
  ['ok'],
  ['so'],
  ['um'],
  ['uh'],
  ['uhm'],
  ['umm'],
  ['er'],
  ['erm'],
  ['hmm'],
  ['like'],
  ['well'],
  ['we', 'need', 'to'],
  ['we', 'need'],
  ['i', 'need'],
  ['we', 'have', 'to'],
  ['we', 'should'],
  ["let's"],
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

/** Links after which a thing's name comes first on the chalk: "Evaluation for X" → "X eval". */
const NAMED_BY = new Set(['for', 'of', 'about', 'on', 'with', 're', 'regarding']);

/**
 * Long words the chalk writes by their start, as people write them: still the task's own word,
 * only shorter.
 */
const SHORTENED: Readonly<Record<string, string>> = {
  evaluation: 'eval',
  application: 'app',
  information: 'info',
  specification: 'spec',
  configuration: 'config',
  introduction: 'intro',
  administration: 'admin',
};

const fits = (words: readonly string[]) => words.join(' ').length <= SHORT_NAME_MOST;

/** Matches the case of the word it stands for: "Evaluation" → "Eval". */
function shortened(word: string): string {
  const short = SHORTENED[word.toLowerCase()];
  if (short === undefined) return word;
  return word.charAt(0) === word.charAt(0).toUpperCase()
    ? short.charAt(0).toUpperCase() + short.slice(1)
    : short;
}

/**
 * A thing named by what it is for: "Evaluation for Gemini replacement" → "Gemini replacement
 * eval", "Meeting with Tom" → "Tom meeting". Only for a task that starts with a short noun, not a
 * verb, and only when the name fits; otherwise `null`.
 */
function namedBy(task: readonly ChalkWord[]): string[] | null {
  const head = upToLink(task, LINKS).filter((word) => !ARTICLES.has(word.low));
  const first = head[0];
  if (first === undefined || head.length > 2 || englishVerbs.has(first.low)) return null;
  const link = task[task.indexOf(head[head.length - 1] ?? first) + 1];
  if (link === undefined || !NAMED_BY.has(link.low)) return null;
  const object = upToLink(upToPause(task.slice(task.indexOf(link) + 1)), LINKS)
    .filter((word) => !ARTICLES.has(word.low))
    .map((word) => word.said);
  if (object.length === 0 || object.length > 3 || /^\d/.test(object[0] ?? '')) return null;
  // The first word was capitalised only because it came first.
  const heads = head.map((word, index) => (index === 0 ? word.low : word.said));
  const named = [
    [...object, ...heads],
    [...object, ...heads.map(shortened)],
  ].find(fits);
  if (named === undefined) return null;
  const [lead = '', ...rest] = named;
  return [lead.charAt(0).toUpperCase() + lead.slice(1), ...rest];
}

/**
 * The verb and as much of its object as fits. An English noun phrase ends on its main word, so
 * when the whole phrase is too long the verb keeps the last words: "Finish the quarterly budget
 * report" → "Finish budget report".
 */
function verbPhrase(phrase: readonly string[]): string[] {
  if (fits(phrase)) return [...phrase];
  const [verb = '', ...object] = phrase;
  for (let from = 1; from < object.length; from += 1) {
    const kept = [verb, ...object.slice(from)];
    if (fits(kept)) return kept;
  }
  return cutToFit(phrase, DANGLING);
}

/** English chalk: the verb and its object, without filler, articles or what follows a link. */
export function chalkEnglish(words: readonly ChalkWord[]): string[] {
  const task = withoutLeading(words, FILLER);
  const message = emailed(task);
  const email = message === null ? null : emailName(message);
  if (email !== null) return email;
  const named = namedBy(task);
  if (named !== null) return named;
  const [verb, ...rest] = task;
  if (verb === undefined) return [];
  const phrase = [verb, ...upToLink(rest, LINKS, PARTICLES)];
  const kept = phrase.filter((word) => !ARTICLES.has(word.low));
  const said = (kept.length > 0 ? kept : phrase).map((word) => word.said);
  // A verb with particles ("pick up") keeps its words in order; only an object loses its front.
  return PARTICLES.has(said[1]?.toLowerCase() ?? '') ? cutToFit(said, DANGLING) : verbPhrase(said);
}
