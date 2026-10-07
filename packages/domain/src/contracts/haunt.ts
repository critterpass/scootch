import { z } from 'zod';

/**
 * The seed a haunt's monster is drawn from. On the phone a monster's seed is the one the server
 * chose when it wrote the monster's words, or the id of the task it hatched for when the phone
 * named it itself; either is a random UUID in lower case. Nothing else is a seed, so a haunt has
 * no field that could carry words.
 */
export const hauntSeedPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const hauntSeedSchema = z.string().regex(hauntSeedPattern);
