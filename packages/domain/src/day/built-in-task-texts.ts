/**
 * The three first-run suggestions the app writes itself, in each language. They are not the
 * person's words and need no judge: no model is asked about them, online or offline, and none
 * may ever make them heavy. These strings equal the `launch.chip.*` catalogue entries; the app's
 * tests keep the two in step.
 */
export const builtInTaskTexts = {
  en: ['reply to one message', 'drink some water', 'open the scary email'],
  vi: ['trả lời một tin nhắn', 'uống chút nước', 'mở cái email đáng sợ'],
} as const;

const known: ReadonlySet<string> = new Set(Object.values(builtInTaskTexts).flat());

/** Whether the text is exactly one of the app's own first-run suggestions. */
export function isBuiltInTaskText(text: string): boolean {
  return known.has(text.normalize('NFC').trim().toLowerCase());
}
