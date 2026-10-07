import { z } from 'zod';

import { attitudeSchema, isoDateSchema } from './common';

/**
 * The 30 work modes, in the order of the Characters board. The art package's
 * work-mode folder must hold exactly one file per id; a mode it cannot draw
 * falls back to the plain working loop, never a blank.
 */
export const WORK_MODE_IDS = [
  'email',
  'writing',
  'reading',
  'studying',
  'coding',
  'calling',
  'texting',
  'money',
  'paperwork',
  'research',
  'meeting',
  'presenting',
  'designing',
  'music',
  'cleaning',
  'dusting',
  'laundry',
  'dishes',
  'cooking',
  'groceries',
  'decluttering',
  'parcel',
  'diy',
  'plants',
  'pets',
  'exercise',
  'stretch',
  'selfcare',
  'trip',
  'rest',
] as const;
export const workModeSchema = z.enum(WORK_MODE_IDS);
export type WorkMode = z.infer<typeof workModeSchema>;

/** What Scootch is doing. `working` is the only mood that uses a work mode. */
export const scootchMoodSchema = z.enum([
  'waiting',
  'listening',
  'typing',
  'thinking',
  'bargaining',
  'working',
  'stuck',
  'pleased',
  'celebrating',
  'asleep',
  'serious',
  'scheming',
  'dramatic',
]);
export type ScootchMood = z.infer<typeof scootchMoodSchema>;

/** Props the app passes to the Scootch component. */
export const scootchPropsSchema = z.object({
  mood: scootchMoodSchema,
  /** Sets how loud the acting is. Ignored when `mood` is `serious`. */
  attitude: attitudeSchema,
  /** Read only when `mood` is `working`; `null` draws the plain working loop. */
  workMode: workModeSchema.nullable(),
  /** True draws the still Reduce Motion form of the mood. */
  reducedMotion: z.boolean(),
});
export type ScootchProps = z.infer<typeof scootchPropsSchema>;

/** The 20 monster bodies, in the order of the monster zoo on the Characters board. */
export const MONSTER_BODY_TYPE_IDS = [
  'tooth',
  'envelope',
  'bubble',
  'receipt',
  'scroll',
  'slime',
  'sock',
  'dust',
  'phone',
  'weed',
  'beetle',
  'pot',
  'bolt',
  'clock',
  'kettle',
  'splat',
  'note',
  'hairball',
  'box',
  'pillow',
] as const;
export const monsterBodyTypeSchema = z.enum(MONSTER_BODY_TYPE_IDS);
export type MonsterBodyType = z.infer<typeof monsterBodyTypeSchema>;

export const monsterInkSchema = z.enum([
  'charcoal',
  'navy',
  'moss',
  'plum',
  'teal',
  'rust',
  'mustard',
  'lilac',
  'kraft',
]);
export type MonsterInk = z.infer<typeof monsterInkSchema>;

export const monsterEyesSchema = z.object({
  count: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  style: z.enum(['matched', 'mismatched', 'stalks']),
});

export const monsterMouthSchema = z.enum(['flat', 'smile', 'frown', 'fangs', 'zigzag', 'gape']);
export const monsterHornsSchema = z.enum(['none', 'short', 'tall']);
export const monsterLegsSchema = z.enum(['none', 'stick', 'stub', 'roots', 'six']);

/**
 * Everything needed to draw one monster. Drawing is a pure function of this
 * value: the same spec draws the same monster on the phone and on the web.
 * The body type comes from the task's meaning; the phone picks the other
 * parameters from the seed when the monster hatches, then stores them.
 */
export const monsterSpecSchema = z.object({
  bodyType: monsterBodyTypeSchema,
  /** Seeds every detail the parameters below do not fix. */
  seed: z.string().min(1).max(64),
  ink: monsterInkSchema,
  /** 1 as hatched. Each "too big" makes it smaller, never larger. */
  size: z.number().min(0.25).max(1),
  eyes: monsterEyesSchema,
  mouth: monsterMouthSchema,
  horns: monsterHornsSchema,
  antennae: z.number().int().min(0).max(3),
  legs: monsterLegsSchema,
});
export type MonsterSpec = z.infer<typeof monsterSpecSchema>;

export const monsterMoodSchema = z.enum(['idle', 'nervous', 'caught']);
export type MonsterMood = z.infer<typeof monsterMoodSchema>;

/** Props the app passes to the monster component. */
export const monsterPropsSchema = z.object({
  spec: monsterSpecSchema,
  mood: monsterMoodSchema,
  reducedMotion: z.boolean(),
});
export type MonsterProps = z.infer<typeof monsterPropsSchema>;

/** Earned from the task, never bought and never random. */
export const cardRaritySchema = z.enum(['common', 'uncommon', 'rare']);
export type CardRarity = z.infer<typeof cardRaritySchema>;

export const cardFinishSchema = z.enum(['standard', 'kraft', 'gold', 'night', 'riso']);
export type CardFinish = z.infer<typeof cardFinishSchema>;

/**
 * One caught card, as the card component draws it and as a share page shows it.
 * A serious or crisis task never has a card.
 */
export const cardDataSchema = z.object({
  monster: monsterSpecSchema,
  /** "Molar, Keeper of Thursday". */
  name: z.string().min(1).max(60),
  /** The short kind line beside the rarity, "Inbox dweller". */
  title: z.string().min(1).max(40),
  rarity: cardRaritySchema,
  /** The catch order in this user's collection, shown as "No. 041". */
  number: z.number().int().min(1),
  /** The task in the user's words; `null` when the user hides the task on a share. */
  taskLine: z.string().min(1).max(280).nullable(),
  daysLurked: z.number().int().min(0),
  /** Minutes of sessions it took, shown as "Caught in 9 min". */
  catchMinutes: z.number().int().min(1),
  /** The five-pip meter on the card. */
  dread: z.number().int().min(1).max(5),
  flavourText: z.string().min(1).max(160),
  finish: cardFinishSchema,
  caughtOn: isoDateSchema,
});
export type CardData = z.infer<typeof cardDataSchema>;
