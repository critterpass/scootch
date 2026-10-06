import { z } from 'zod';

/**
 * The seed a haunt's monster is drawn from. On the phone a monster's seed is the id of the task
 * it hatched for, and that id is a random UUID in lower case; nothing else is a seed, so a haunt
 * has no field that could carry words.
 */
export const hauntSeedPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const hauntSeedSchema = z.string().regex(hauntSeedPattern);
