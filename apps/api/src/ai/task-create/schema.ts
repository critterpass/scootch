import { z } from 'zod';

/**
 * What the writer is asked for. It is looser than the wire contract on purpose: lengths, dates
 * and the voice are checked in code afterwards, where a single bad line can be replaced without
 * losing the whole answer.
 */
const heardDate = z.object({
  heardAs: z.string().describe("The person's exact words for the date, copied from the note."),
  date: z.string().describe('Your reading of it as YYYY-MM-DD.'),
});

const things = z.array(z.string()).default([]);

export const writerOutputSchema = z.object({
  oneThing: z.string(),
  oneThingDue: heardDate.nullish(),
  parked: things,
  dated: z.array(heardDate.extend({ text: z.string(), line: z.string() })).default([]),
  monster: z.object({ name: z.string(), title: z.string(), flavourText: z.string() }),
  lines: z.object({
    hatch: z.string(),
    start: z.string(),
    working: z.array(z.string()),
    pickedUp: z.string(),
    checkIn: z.string(),
    tinyNextStep: z.string(),
    twoMinutesLeft: z.string(),
    timeUp: z.string(),
    caught: z.string(),
    notFinished: z.string(),
  }),
  notifications: z.array(z.string()).default([]),
});
export type WriterOutput = z.infer<typeof writerOutputSchema>;

/** The plain answer for a heavy task: the things and one small step, with no voice at all. */
export const plainOutputSchema = z.object({
  oneThing: z.string(),
  oneThingDue: heardDate.nullish(),
  parked: things,
  dated: z.array(heardDate.extend({ text: z.string() })).default([]),
  tinyNextStep: z.string(),
});
export type PlainOutput = z.infer<typeof plainOutputSchema>;
