import { z } from 'zod';

import { attitudeSchema, languageSchema } from './common';

/**
 * The camera's routes. A photo never leaves the phone: Desk and Room send only the names the phone
 * gave the things it found, and Paper and Screen send only the words it read, after the user said
 * they may be sent. Every number shown on a camera screen is counted by the phone from what it
 * read; the model writes words and points at line ids, and an id it was not given is refused.
 */

/** What the phone's recogniser calls a thing, such as `coffee cup`. English, lower case. */
const thingLabelSchema = z.string().trim().min(1).max(40);

const speakerSchema = z.object({ language: languageSchema, attitude: attitudeSchema });

/**
 * What Scootch says about the step, and the two short texts that go with it. `action` is the
 * button's words and `task` is the step as the task it becomes; each is `null` when what the
 * model wrote failed its check, and the phone then uses its own plain words. `line` is always
 * there: it is Scootch's offline line when nothing better passed.
 */
const stepWordsSchema = z.object({
  line: z.string().min(1).max(160),
  action: z.string().min(1).max(28).nullable(),
  task: z.string().min(1).max(100).nullable(),
});
export type CameraStepWords = z.infer<typeof stepWordsSchema>;

// camera.desk: the one thing that leaves fastest, already picked by the phone.

export const cameraDeskRequestSchema = speakerSchema.extend({
  /** The ringed thing's names, best first. Empty when the phone could not name it. */
  picked: z.array(thingLabelSchema).max(3),
  /** The best name of each other thing on the desk that could be named. */
  others: z.array(thingLabelSchema).max(11),
});
export type CameraDeskRequest = z.infer<typeof cameraDeskRequestSchema>;

export const cameraDeskResponseSchema = stepWordsSchema;
export type CameraDeskResponse = z.infer<typeof cameraDeskResponseSchema>;

// camera.room: the smallest corner, already picked by the phone.

export const cameraRoomRequestSchema = speakerSchema.extend({
  /** Where the corner sits in the photo, so the line can say "the bit on the floor". */
  position: z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right']),
  /** The names of the things in that corner that could be named. */
  things: z.array(thingLabelSchema).max(12),
});
export type CameraRoomRequest = z.infer<typeof cameraRoomRequestSchema>;

export const cameraRoomResponseSchema = stepWordsSchema;
export type CameraRoomResponse = z.infer<typeof cameraRoomResponseSchema>;

// camera.paper and camera.screen: the words the phone read, in reading order.

/** `l0`, `l1`, …: the phone's own id for a line it read. */
export const cameraLineIdSchema = z.string().regex(/^l\d{1,3}$/);

export const cameraReadLineSchema = z.object({
  id: cameraLineIdSchema,
  text: z.string().trim().min(1).max(200),
});
export type CameraReadLine = z.infer<typeof cameraReadLineSchema>;

/** A page or a screen holds more lines than this only when it is too far away to act on. */
export const CAMERA_MAX_LINES = 150;

const readRequestSchema = speakerSchema.extend({
  lines: z
    .array(cameraReadLineSchema)
    .min(1)
    .max(CAMERA_MAX_LINES)
    .refine((lines) => new Set(lines.map((line) => line.id)).size === lines.length, {
      message: 'line ids must be unique',
    }),
});

export const cameraPaperRequestSchema = readRequestSchema;
export type CameraPaperRequest = z.infer<typeof cameraPaperRequestSchema>;

export const cameraScreenRequestSchema = readRequestSchema;
export type CameraScreenRequest = z.infer<typeof cameraScreenRequestSchema>;

/**
 * Words that are heavy or dangerous answer with the verdict alone: no joke, no step written by a
 * model. Words nobody could screen count as `serious`.
 */
const heavySchema = z.strictObject({ verdict: z.enum(['serious', 'crisis']) });
/** Read, and nothing on it to start with: not a form, not an inbox, or not words at all. */
const unreadableSchema = z.strictObject({
  verdict: z.literal('pass'),
  result: z.literal('unreadable'),
});

/** How many boxes of a form are numbered on the photo at most. */
export const CAMERA_MAX_BOXES = 6;

export const cameraPaperResponseSchema = z.union([
  heavySchema,
  unreadableSchema,
  z.strictObject({
    verdict: z.literal('pass'),
    result: z.literal('step'),
    /** The lines that are boxes to fill, in reading order. The phone numbers them from one. */
    boxes: z.array(cameraLineIdSchema).min(1).max(CAMERA_MAX_BOXES),
    /** The easiest box. Always one of `boxes`. */
    pick: cameraLineIdSchema,
    /** What the page is, in a few words, such as "Council tax form". */
    document: z.string().min(1).max(40).nullable(),
    /** One hard word copied from the page, with what it means and a little more if asked. */
    jargon: z
      .strictObject({
        term: z.string().min(1).max(40),
        meaning: z.string().min(1).max(160),
        more: z.string().min(1).max(320).nullable(),
      })
      .nullable(),
    ...stepWordsSchema.shape,
  }),
]);
export type CameraPaperResponse = z.infer<typeof cameraPaperResponseSchema>;

export const cameraScreenResponseSchema = z.union([
  heavySchema,
  unreadableSchema,
  z.strictObject({
    verdict: z.literal('pass'),
    result: z.literal('step'),
    /** The one line on the screen that matters today. */
    pick: cameraLineIdSchema,
    /** A first line the user could send, in their own voice, if they want it. */
    draft: z.string().min(1).max(200).nullable(),
    ...stepWordsSchema.shape,
  }),
]);
export type CameraScreenResponse = z.infer<typeof cameraScreenResponseSchema>;
