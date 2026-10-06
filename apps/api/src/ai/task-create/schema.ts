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

/** The plain answer for a heavy task: the things and one small step, with no voice at all. */
export const plainOutputSchema = pickOutputSchema.extend({ tinyNextStep: z.string() });
export type PlainOutput = z.infer<typeof plainOutputSchema>;
