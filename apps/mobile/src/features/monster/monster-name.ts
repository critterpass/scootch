import type { MonsterRow } from '@scootch/domain';

/**
 * A monster as it is introduced: its name and its title, "Molar, Keeper of Thursday". A name that
 * already carries a title of its own (one made on the phone, "Tooth, Keeper of Thursday") is not
 * given a second one.
 */
export function nameAndTitle(monster: Pick<MonsterRow, 'name' | 'title'>): string {
  const name = monster.name.trim();
  const title = monster.title.trim();
  if (title === '' || name.includes(',')) return name;
  return `${name}, ${title}`;
}

/**
 * The name a monster goes by where there is little room: "Molar" of "Molar, Keeper of Thursday".
 * A name with no title in it is already short.
 */
export function shortName(name: string): string {
  return name.split(',')[0]?.trim() || name.trim();
}
