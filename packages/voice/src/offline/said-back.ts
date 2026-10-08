/**
 * The user's own words as a sentence of their own: a capital letter to open it, one full stop to
 * close it, and nothing else touched.
 */
export function saidBack(heardAs: string): string {
  const words = heardAs.trim().replace(/[.!?…\s]+$/u, '');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}
