/**
 * The monster spec is owned by the domain contracts. Only its types are used here, so the drawing
 * model carries no runtime dependency on the schema library.
 */
import type {
  MonsterBodyType,
  MonsterInk,
  MonsterMood,
  MonsterSpec,
} from '../../../domain/src/contracts/art';

export type { MonsterBodyType, MonsterInk, MonsterMood, MonsterSpec };
export type MonsterLegs = MonsterSpec['legs'];
export type MonsterMouth = MonsterSpec['mouth'];
export type MonsterHorns = MonsterSpec['horns'];
export type MonsterEyes = MonsterSpec['eyes'];
