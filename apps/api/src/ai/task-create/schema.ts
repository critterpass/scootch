import { z } from 'zod';

/**
 * What the models are asked for. It is looser than the wire contract on purpose: lengths, dates
 * and the voice are checked in code afterwards, where a single bad line can be replaced without
 * losing the whole answer.
 */
const heardDate = z.object({
  heardAs: z.string().describe("The person's exact words for the date, copied from the note."),
  date: z.string().describe('Your reading of it as YYYY-MM-DD.'),
});

const things = z.array(z.string()).default([]);

/** The things a note names, sorted: what the fast pick returns. Nothing in it is in Scootch's voice. */
export const pickOutputSchema = z.object({
  oneThing: z.string(),
  oneThingDue: heardDate.nullish(),
  parked: things,
  dated: z.array(heardDate.extend({ text: z.string() })).default([]),
});
export type PickOutput = z.infer<typeof pickOutputSchema>;

/** A missing or misshapen line reads as empty, so the check sends that one line back, not all. */
const line = z.string().catch('');

/**
 * Everything Scootch says about the one thing, as one flat object. The writer closes one brace
 * too many after nested objects often enough to matter, and the provider then hands back nothing;
 * a flat answer does not have that failure. An answer with no name at all is no answer.
 */
export const linesOutputSchema = z.object({
  name: z.string(),
  title: line,
  flavourText: line,
  hatch: line,
  start: line,
  working: z.array(z.string()).catch([]),
  pickedUp: line,
  checkIn: line,
  tinyNextStep: line,
  twoMinutesLeft: line,
  timeUp: line,
  caught: line,
  notFinished: line,
  notifications: z.array(z.string()).catch([]),
});
export type LinesOutput = z.infer<typeof linesOutputSchema>;

/** Only the lines that failed the check, written once more: one key per slot asked for. */
export function rewriteOutputSchema(slots: readonly string[]) {
  return z.object(Object.fromEntries(slots.map((slot) => [slot, line])));
}

/** The plain answer for a heavy task: the things and one small step, with no voice at all. */
export const plainOutputSchema = pickOutputSchema.extend({ tinyNextStep: z.string() });
export type PlainOutput = z.infer<typeof plainOutputSchema>;
