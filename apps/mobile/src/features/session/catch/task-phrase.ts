/**
 * A task's own words made ready to sit inside a sentence ("Go email the dentist."): no full stop
 * of its own, and no capital at the front unless the word needs one ("I", a name in capitals, an
 * abbreviation).
 */
export function taskPhrase(task: string): string {
  const text = task.trim().replace(/[.!?…\s]+$/u, '');
  const first = text.split(/\s+/u)[0] ?? '';
  const keepsCapital = first === 'I' || /^I['’]/u.test(first) || /^\p{Lu}{2,}/u.test(first);
  if (text === '' || keepsCapital) return text;
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}
