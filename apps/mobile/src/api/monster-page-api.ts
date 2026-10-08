import { MONSTER_BODY_TYPE_IDS, type Language, type MonsterBodyType } from '@scootch/domain';

import type { HttpClient } from './http-client';

/** A monster made on the website, as its own page gives it (`GET /v1/monster-page/:id`). */
export interface MonsterPage {
  /** The id in `scootch.app/m/<id>`. */
  readonly id: string;
  readonly seed: string;
  readonly bodyType: MonsterBodyType;
  readonly name: string;
  readonly flavourText: string;
  readonly language: Language;
  /** What was typed for it, or `null` when whoever made it chose to hide the words. */
  readonly typed: string | null;
  readonly status: 'wild' | 'caught';
}

/** The page as the server sent it. Anything that is not a monster's page is refused. */
export function monsterPageFrom(json: unknown): MonsterPage {
  const page = (json ?? {}) as Record<string, unknown>;
  const { id, seed, bodyType, name, flavourText, language, typed, status } = page;
  const words = [id, seed, name, flavourText].every((one) => typeof one === 'string' && one !== '');
  const body = MONSTER_BODY_TYPE_IDS.find((one) => one === bodyType);
  if (!words || body === undefined) throw new Error('not a monster page');
  if (language !== 'en' && language !== 'vi') throw new Error('not a monster page');
  if (status !== 'wild' && status !== 'caught') throw new Error('not a monster page');
  if (typed !== null && typeof typed !== 'string') throw new Error('not a monster page');
  return {
    id: id as string,
    seed: seed as string,
    bodyType: body,
    name: name as string,
    flavourText: flavourText as string,
    language,
    typed,
    status,
  };
}

export interface MonsterPageApi {
  /** Rejects when there is no such page, or it could not be reached. */
  read(id: string): Promise<MonsterPage>;
}

export function createMonsterPageApi(http: HttpClient): MonsterPageApi {
  return {
    read: (id) =>
      http.request('GET', `/v1/monster-page/${encodeURIComponent(id)}`, null, monsterPageFrom),
  };
}
