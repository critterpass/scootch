import type { MONSTER_BODIES } from '@scootch/art';

export type Shareable = {
  readonly seed: string;
  readonly bodyType: keyof typeof MONSTER_BODIES;
  readonly name: string;
  readonly flavourText: string;
  /** Null when the visitor hid what they typed: it is then never sent. */
  readonly typed: string | null;
};

/** `heavy`: the screen would not let it be shared. `failed`: the request did not get through. */
export type ShareOutcome = { readonly id: string } | 'heavy' | 'failed';

const storeKey = 'scootch.shares';

/** The unshare tokens of the monsters shared from this browser, by id. They stay here. */
function tokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(storeKey) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function keep(all: Record<string, string>): void {
  try {
    localStorage.setItem(storeKey, JSON.stringify(all));
  } catch {
    // Private windows may refuse storage: the monster is shared, and cannot be unshared from here.
  }
}

export function sharedFromHere(id: string): boolean {
  return tokens()[id] !== undefined;
}

/** Shares one hatched monster. The typed line travels only when the visitor chose to show it. */
export async function shareMonster(monster: Shareable, language: string): Promise<ShareOutcome> {
  try {
    const response = await fetch('/api/monster-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: monster.seed,
        bodyType: monster.bodyType,
        name: monster.name,
        flavourText: monster.flavourText,
        language,
        ...(monster.typed === null ? {} : { typed: monster.typed }),
      }),
    });
    if (!response.ok) return 'failed';
    const answer = (await response.json()) as
      { verdict: 'serious' | 'crisis' } | { verdict: 'pass'; id: string; unshareToken: string };
    if (answer.verdict !== 'pass') return 'heavy';
    keep({ ...tokens(), [answer.id]: answer.unshareToken });
    return { id: answer.id };
  } catch {
    return 'failed';
  }
}

/** Unshares a monster shared from this browser. True once its page is gone. */
export async function unshareMonster(id: string): Promise<boolean> {
  const all = tokens();
  const token = all[id];
  if (token === undefined) return false;
  try {
    const response = await fetch(`/api/monster-share/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 404) return false;
    const { [id]: gone, ...rest } = all;
    void gone;
    keep(rest);
    return true;
  } catch {
    return false;
  }
}

/** A monster page's address on this site, in the page's language. */
export function monsterPath(id: string, language: string): string {
  return `${language === 'vi' ? '/vi' : ''}/m/${id}`;
}
