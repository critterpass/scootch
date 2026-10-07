import { z } from 'zod';

import { decisionMetaSchema, screenInputResponseSchema } from './ai-labels';
import { monsterBodyTypeSchema, workModeSchema } from './art';
import {
  attitudeSchema,
  energySchema,
  isoDateSchema,
  languageSchema,
  lineSchema,
  taskTextSchema,
} from './common';

/**
 * task.create: the one call per task. It screens the text first, then returns
 * everything the day needs, so the session, its Live Activity lines and its
 * notifications all run with no connection afterwards.
 */
export const taskCreateRequestSchema = z.object({
  language: languageSchema,
  attitude: attitudeSchema,
  /** `guess` asks the server to read the energy from how the text is written. */
  energy: z.union([energySchema, z.literal('guess')]),
  /** The transcript, the typed text, or a drawer item being swapped in. */
  text: z.string().min(1).max(4000),
  source: z.enum(['ramble', 'typed', 'drawer']),
  /** The user's local day and zone, so "Friday" resolves to a real date. */
  localDate: isoDateSchema,
  timeZone: z.string().min(1).max(64),
  /** The user said "it's fine, be funny". Never lifts a crisis verdict. */
  overrideSerious: z.boolean(),
  /** One things already offered from this text and turned down with "Another". */
  declined: z.array(taskTextSchema).max(10).optional(),
  /**
   * The phone has things parked and can show Scootch's own pick of them: a text that only asks
   * him to choose may be answered with `choose`. Unset, such a text is treated as any other.
   */
  canChoose: z.boolean().optional(),
  /** True asks for stage one only; the answer is then `taskCreateStartResponseSchema`. */
  staged: z.boolean().optional(),
});
export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;

export const oneThingSchema = z.object({
  text: taskTextSchema,
  /** A real date heard for this very task, checked in code; otherwise `null`. */
  dueDate: isoDateSchema.nullable(),
});
export type OneThing = z.infer<typeof oneThingSchema>;

/** A thing with no date that goes straight to the drawer. */
export const parkedItemSchema = z.object({ text: taskTextSchema });
export type ParkedItem = z.infer<typeof parkedItemSchema>;

/**
 * A dated thing heard in the text. It is said out loud before it is parked.
 * The phone works out the day it comes back; the model never does.
 */
export const heardDeadlineSchema = z.object({
  text: taskTextSchema,
  dueDate: isoDateSchema,
  /** The user's own words for the date, "due on Friday". */
  heardAs: z.string().min(1).max(80),
  /** What Scootch says about it. Plain words when the verdict is serious. */
  line: lineSchema,
});
export type HeardDeadline = z.infer<typeof heardDeadlineSchema>;

/**
 * The server's word that it wrote a monster's name, title and card line: a signature over exactly
 * those words, the seed the monster is drawn from and the language they are in. A public page is
 * made only from words that carry it, so the seed is the server's own choice (a random UUID) and
 * the phone draws the monster from it.
 */
export const signedWordsSchema = z.object({
  seed: z.string().min(1).max(64),
  language: languageSchema,
  signature: z.string().min(1).max(128),
});
export type SignedWords = z.infer<typeof signedWordsSchema>;

/** The monster's words. Its drawing parameters are made on the phone. */
export const monsterCopySchema = z.object({
  /** "Name, Title of Something Oddly Specific". */
  name: z.string().min(1).max(60),
  /** The short kind line on the card, "Inbox dweller". */
  title: z.string().min(1).max(40),
  /** One sentence for the card. */
  flavourText: z.string().min(1).max(160),
  /** Absent on words the phone made itself, and on an answer from before words were signed. */
  signed: signedWordsSchema.optional(),
});
export type MonsterCopy = z.infer<typeof monsterCopySchema>;

/** Labels the server gathers alongside the writing, so the phone makes one call. */
export const taskLabelsSchema = z.object({
  workMode: workModeSchema.nullable(),
  bodyType: monsterBodyTypeSchema.nullable(),
  /** False means Scootch offers to shrink the task before the start. */
  fitsTenMinutes: z.boolean(),
  /** True means Scootch never offers to share this task. */
  sharePrivate: z.boolean(),
});
export type TaskLabels = z.infer<typeof taskLabelsSchema>;

/**
 * Every line a session can need, written about this task, stored on the phone
 * and played back offline. None of them names a session length.
 */
export const sessionLinePackSchema = z.object({
  /** Said when the monster appears. */
  hatch: lineSchema,
  /** Said with the start burst. */
  start: lineSchema,
  /** Rotated through the session and the Live Activity. */
  working: z.array(lineSchema).min(3).max(8),
  /** Said when Scootch is opened or its Live Activity is tapped mid-session. */
  pickedUp: lineSchema,
  /** The timed check-in that offers a tiny next step. */
  checkIn: lineSchema,
  /** The tiny next step used for stuck help when there is no connection. */
  tinyNextStep: lineSchema,
  twoMinutesLeft: lineSchema,
  timeUp: lineSchema,
  caught: lineSchema,
  /** "Not finished" is a normal outcome; this line introduces the three choices. */
  notFinished: lineSchema,
  /**
   * Two more tiny next steps, each smaller than the one before, so "Smaller" has somewhere to
   * go. Absent on packs written before these existed, as are the three lines below.
   */
  tinierNextSteps: z.array(lineSchema).max(2).optional(),
  /**
   * The ceremony line when the treat named before the session is handed over. It names the
   * treat: the server fills it in when the pack is asked for with one, and otherwise leaves
   * `{treat}` where the phone puts the treat's name.
   */
  treatHandOver: lineSchema.optional(),
  /** Said when the thoughts parked during the session are shown. */
  parkedThoughts: lineSchema.optional(),
  /** Said when the hold to finish is let go too soon. Kind, never a telling-off. */
  releasedEarly: lineSchema.optional(),
});

/** Where a `treatHandOver` line names the treat until a real treat is filled in. */
export const treatPlaceholder = '{treat}';
export type SessionLinePack = z.infer<typeof sessionLinePackSchema>;

/** The plain-words pack for a serious task: company, no comedy. */
export const seriousLinePackSchema = z.object({
  acknowledge: lineSchema,
  working: z.array(lineSchema).min(1).max(4),
  tinyNextStep: lineSchema,
  done: lineSchema,
  notFinished: lineSchema,
});
export type SeriousLinePack = z.infer<typeof seriousLinePackSchema>;

/**
 * One notification for today, about this task. The order is the order they are
 * sent in, quietest first. The phone picks the times and applies quiet hours,
 * Sleep, Focus and its own back-off; it may send fewer, never more.
 */
export const dayNotificationSchema = z.object({ text: z.string().min(1).max(140) });
export type DayNotification = z.infer<typeof dayNotificationSchema>;

/**
 * Who screened the text, with the screen route's own fields and values. Any judge but `jev`
 * cleared nothing, so the phone may ask again; `reason: 'unscreened'` marks a `serious` that
 * nobody trusted chose. Both are optional: an answer made before they existed has neither.
 */
export const taskJudgeSchema = z.object({
  answeredBy: decisionMetaSchema.shape.answeredBy.optional(),
  reason: screenInputResponseSchema.shape.reason,
});
export type TaskJudge = z.infer<typeof taskJudgeSchema>;

const passSchema = taskJudgeSchema.extend({
  verdict: z.literal('pass'),
  /** True when the text was serious and `overrideSerious` let the comedy back in. */
  seriousOverridden: z.boolean(),
  /** The energy used: the one sent, or the guess. */
  energy: energySchema,
  oneThing: oneThingSchema,
  parked: z.array(parkedItemSchema).max(30),
  deadlines: z.array(heardDeadlineSchema).max(10),
  monster: monsterCopySchema,
  labels: taskLabelsSchema,
  lines: sessionLinePackSchema,
  /** Soft: at most one. Cheeky and Unhinged: at most three. */
  notifications: z.array(dayNotificationSchema).max(3),
});

/** No monster, no joke, no card, no share, no burst, and no notifications. */
const seriousSchema = taskJudgeSchema.extend({
  verdict: z.literal('serious'),
  energy: energySchema,
  oneThing: oneThingSchema,
  parked: z.array(parkedItemSchema).max(30),
  deadlines: z.array(heardDeadlineSchema).max(10),
  lines: seriousLinePackSchema,
});

/** Every task is hidden for the day and the phone shows its helplines first. */
const crisisSchema = taskJudgeSchema.extend({ verdict: z.literal('crisis') });

/** Abuse or an injection attempt: nothing is written, and the user is asked to say it another way. */
const rejectSchema = taskJudgeSchema.extend({ verdict: z.literal('reject') });

/**
 * The text named nothing to do and asked Scootch to choose ("pick for me"). Nothing is written or
 * parked; the phone offers one of the things it already holds. Only answered when `canChoose`.
 */
const chooseSchema = taskJudgeSchema.extend({ verdict: z.literal('choose') });

export const taskCreateResponseSchema = z.discriminatedUnion('verdict', [
  passSchema,
  seriousSchema,
  crisisSchema,
  rejectSchema,
  chooseSchema,
]);
export type TaskCreateResponse = z.infer<typeof taskCreateResponseSchema>;
export type TaskCreatePass = z.infer<typeof passSchema>;
export type TaskCreateSerious = z.infer<typeof seriousSchema>;

/** The verdict shapes on their own, for the staged call, which shares all but the pass. */
export const taskCreateSeriousSchema = seriousSchema;
export const taskCreateCrisisSchema = crisisSchema;
export const taskCreateRejectSchema = rejectSchema;
export const taskCreateChooseSchema = chooseSchema;
