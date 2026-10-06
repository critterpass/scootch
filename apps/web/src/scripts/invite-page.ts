import { buildScootch, toSvg } from '@scootch/art';

import {
  dateLocale,
  fetchShared,
  fill,
  idFromAddress,
  keepLanguageSwitchHere,
  showState,
} from './shared-page';

type WorkMode = Parameters<typeof buildScootch>[0]['workMode'];

/**
 * What `GET /v1/table-invite/:code` answers with: what the table shows everyone seated at it.
 * A seat carries a first name and a one- or two-word label, never a task; either may be hidden.
 */
export type TableInvite = {
  readonly state: 'open' | 'closed';
  /** The first name of whoever made the link; null when they show none. */
  readonly hostName: string | null;
  /** When the table closed, for a closed one that still remembers. */
  readonly closedAt: string | null;
  readonly seats: readonly {
    readonly name: string | null;
    readonly label: string | null;
    readonly workMode: WorkMode;
  }[];
};

function seat(drawing: string, name: string, label: string, saved = false): HTMLLIElement {
  const item = document.createElement('li');
  item.className = saved ? 'seat seat-saved' : 'seat';
  const art = document.createElement('span');
  art.className = 'drawing';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = drawing;
  const who = document.createElement('strong');
  who.textContent = name;
  const what = document.createElement('span');
  what.textContent = label;
  item.append(art, who, what);
  return item;
}

/** Wires the table invite page: who is at the table, the saved seat, and the way to sit down. */
export async function startInvitePage(root: HTMLElement): Promise<void> {
  const find = <E extends HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector);
    if (!element) throw new Error(`The invite page has no ${selector}`);
    return element;
  };
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const line = (key: string, values: Record<string, string> = {}): string =>
    fill(lines[key] ?? '', values);
  const language = root.dataset['language'] ?? 'en';
  const code = idFromAddress();
  keepLanguageSwitchHere('t', code);

  const invite = await fetchShared<TableInvite>('table-invite', code);
  if (invite === 'missing' || invite === 'offline') {
    showState(root, invite);
    return;
  }

  const open = invite.state === 'open';
  const host = invite.hostName;
  find('[data-seats]').replaceChildren(
    ...invite.seats.map((taken, index) =>
      seat(
        toSvg(
          buildScootch({
            mood: 'working',
            attitude: 'cheeky',
            workMode: taken.workMode,
            reducedMotion: true,
          }),
          { idPrefix: `seat-${index}-` },
        ),
        taken.name ?? line('seatName'),
        taken.label ?? '',
      ),
    ),
    seat('', line('you'), line('savedForYou'), true),
  );

  if (open) {
    find('[data-eyebrow]').textContent = line('hereNow', { count: String(invite.seats.length) });
    find('[data-headline]').textContent =
      host === null ? line('headline') : line('headlineBy', { name: host });
  } else {
    const time =
      invite.closedAt === null
        ? null
        : new Intl.DateTimeFormat(dateLocale(language), {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date(invite.closedAt));
    const key = `closedHeadline${host === null ? '' : 'By'}${time === null ? '' : 'At'}`;
    find('[data-eyebrow]').textContent = line('closedEyebrow');
    find('[data-headline]').textContent = line(key, { name: host ?? '', time: time ?? '' });
    find('[data-closed-body]').textContent =
      host === null ? line('closedBody') : line('closedBodyBy', { name: host });
  }
  document.title = `${find('[data-headline]').textContent} · Scootch`;
  showState(root, invite.state);
}
