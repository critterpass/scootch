import { cutToFit, isCapital, upToLink, withoutLeading, type ChalkWord } from './short-name-words';

/** Vietnamese: what is said before the task itself ("mình cần", "à"). */
const FILLER: readonly (readonly string[])[] = [
  ['à'],
  ['ừ'],
  ['ờ'],
  ['ừm'],
  ['ok'],
  ['okay'],
  ['thì'],
  ['rồi'],
  ['xong'],
  ['và'],
  ['với', 'lại'],
  ['còn'],
  ...['mình', 'tôi', 'tớ', 'em', 'anh', 'chị', 'con', ''].flatMap((who) =>
    ['cần phải', 'cần', 'phải nhớ', 'phải', 'nhớ là', 'nhớ', 'muốn', 'nên', 'sẽ', 'định'].map(
      (want) => [...(who === '' ? [] : [who]), ...want.split(' ')],
    ),
  ),
];

/** Where the noun phrase ends and the reason, the time or a second clause begins. */
const LINKS = new Set([
  'về',
  'để',
  'vì',
  'cho',
  'trước',
  'sau',
  'lúc',
  'vào',
  'rồi',
  'và',
  'với',
  'ở',
  'tại',
  'nhé',
  'hôm',
  'ngày',
  'tối',
  'sáng',
  'chiều',
  'trưa',
  'mai',
  'nay',
  'khi',
  'nếu',
  'nhưng',
  'hoặc',
  'mà',
  'thì',
  'đến',
  'tới',
  'trong',
  'của',
]);

/** Verbs that start a second clause after the person named ("… nha sĩ dời lịch"). */
const NEXT_VERBS = new Set([
  'dời',
  'hỏi',
  'báo',
  'xin',
  'nói',
  'nhờ',
  'gửi',
  'hẹn',
  'đặt',
  'hủy',
  'huỷ',
  'xác',
  'nhắc',
  'trả',
  'mua',
  'lấy',
  'đổi',
  'chuyển',
  'kiểm',
  'cảm',
]);

/** A word left hanging at the end of a cut is dropped. */
const DANGLING = new Set([...LINKS, 'cái', 'các', 'những', 'một']);

/** Classifiers and plural words before a noun: chalk leaves them out. */
const ARTICLES = new Set(['cái', 'các', 'những', 'một']);

/** The most words kept for the person after "cho": "nha sĩ", "chủ nhà", "cô giáo Lan". */
const MOST_NAMED = 3;

const EMAIL = new Set(['email', 'e-mail', 'mail']);

/** The person a message goes to: up to a link or a second verb, names kept whole. */
function named(words: readonly ChalkWord[]): string[] {
  const kept: string[] = [];
  for (const word of words) {
    const capital = isCapital(word);
    if (!capital && (LINKS.has(word.low) || NEXT_VERBS.has(word.low))) break;
    if (!capital && kept.length >= MOST_NAMED) break;
    if (!ARTICLES.has(word.low)) kept.push(word.said);
  }
  return kept;
}

/** The word after `at` when it is `low`, skipped: "gọi (điện) cho". */
function skip(words: readonly ChalkWord[], at: number, ...lows: string[]): number {
  let index = at;
  while (lows.includes(words[index]?.low ?? '')) index += 1;
  return index;
}

/** "Gửi email cho nha sĩ …" → "Email nha sĩ"; "Gọi (điện) cho ngân hàng …" → "Gọi ngân hàng". */
function message(words: readonly ChalkWord[]): string[] | null {
  const [first, second] = words;
  if (first === undefined) return null;
  let verb: string;
  let at: number;
  if ((first.low === 'gửi' || first.low === 'viết') && second && EMAIL.has(second.low)) {
    verb = second.said;
    at = 2;
  } else if (EMAIL.has(first.low)) {
    verb = first.said;
    at = 1;
  } else if (first.low === 'gọi') {
    verb = first.said;
    at = skip(words, 1, 'điện', 'thoại', 'lại');
  } else if (first.low === 'nhắn') {
    verb = first.said;
    at = skip(words, 1, 'tin', 'lại');
  } else return null;
  const person = named(words.slice(skip(words, at, 'cho')));
  return person.length === 0 ? null : cutToFit([verb, ...person], DANGLING);
}

/** Vietnamese chalk: the verb and its object, without filler or what follows a link. */
export function chalkVietnamese(words: readonly ChalkWord[]): string[] {
  const task = withoutLeading(words, FILLER);
  const sent = message(task);
  if (sent !== null) return sent;
  const [verb, ...rest] = task;
  if (verb === undefined) return [];
  const kept = [verb, ...upToLink(rest, LINKS).filter((word) => !ARTICLES.has(word.low))];
  return cutToFit(
    kept.map((word) => word.said),
    DANGLING,
  );
}
