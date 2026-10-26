import { sentencesOf, type HeardTask } from '@phusclass/domain/hearing';

/** The store's way in: heard on the phone, each task onto the board. */
export type Say = (text: string) => Promise<readonly HeardTask[]>;

export type HandedIn =
  | {
      readonly ok: true;
      readonly tasks: readonly HeardTask[];
      readonly how: 'picked' | 'sentences';
    }
  | { readonly ok: false };

/**
 * Hands words to the board. A long ramble is never lost: if picking tasks out of the whole fails,
 * every sentence goes on the board as it was said, one by one. Only when not one sentence could
 * be written does it fail, and then the caller keeps the words in the field.
 */
export async function handIn(text: string, say: Say): Promise<HandedIn> {
  try {
    const tasks = await say(text);
    if (tasks.length > 0) return { ok: true, tasks, how: 'picked' };
  } catch {
    // Picking failed; the sentences go on as said.
  }
  const sentences = sentencesOf(text).filter((one) => one.trim() !== '');
  const landed: HeardTask[] = [];
  for (const sentence of sentences.length > 0 ? sentences : [text]) {
    try {
      landed.push(...(await say(sentence)));
    } catch {
      // This one could not be written; the others still go.
    }
  }
  return landed.length > 0 ? { ok: true, tasks: landed, how: 'sentences' } : { ok: false };
}
