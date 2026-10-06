import { buildMonster, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

import {
  dateLocale,
  fetchShared,
  fill,
  idFromAddress,
  keepLanguageSwitchHere,
  showState,
} from './shared-page';

/**
 * What `GET /v1/shared-record/:id` answers with: the week's record as the sharer chose to show
 * it. A track is a finished day and the monster caught on it; a day whose task was heavy or
 * hidden is simply not among the tracks. The clip is at `GET /v1/shared-record/:id/clip`.
 */
export type SharedRecord = {
  readonly id: string;
  readonly language: 'en' | 'vi';
  readonly sharedAt: string;
  readonly sharerName: string | null;
  /** The record's name, written for the week. */
  readonly title: string;
  /** The week's one sentence, when there is one. */
  readonly line: string | null;
  /** The Monday the week starts on, `YYYY-MM-DD`. */
  readonly weekStart: string;
  readonly tracks: readonly {
    readonly day: string;
    readonly name: string;
    readonly bodyType: keyof typeof MONSTER_BODIES;
    readonly seed: string;
  }[];
};

const utcDay = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

/** "6 – 12 October": the week's first and last day, with no time zone involved. */
function weekInWords(weekStart: string, language: string): string {
  const first = utcDay(weekStart);
  const last = new Date(first.getTime() + 6 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat(dateLocale(language), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).formatRange(first, last);
}

/** Wires the record page: the sleeve, the clip's player and the week's tracks. */
export async function startRecordPage(root: HTMLElement): Promise<void> {
  const find = <E extends HTMLElement>(selector: string): E => {
    const element = (root.closest('main') ?? root).querySelector<E>(selector);
    if (!element) throw new Error(`The record page has no ${selector}`);
    return element;
  };
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const language = root.dataset['language'] ?? 'en';
  const id = idFromAddress();
  keepLanguageSwitchHere('r', id);

  const record = await fetchShared<SharedRecord>('shared-record', id);
  if (record === 'missing' || record === 'offline') {
    find('[data-ask]').hidden = record === 'missing';
    showState(root, record);
    return;
  }

  const { tracks, sharerName } = record;
  const dates = weekInWords(record.weekStart, language);
  const weekday = new Intl.DateTimeFormat(dateLocale(language), {
    weekday: 'short',
    timeZone: 'UTC',
  });
  document.title = `${record.title} · Scootch`;
  find('[data-eyebrow]').textContent =
    sharerName === null
      ? fill(lines['eyebrow'] ?? '', { dates })
      : fill(lines['eyebrowBy'] ?? '', { name: sharerName, dates });
  find('[data-title]').textContent = record.title;
  find('[data-player-title]').textContent = record.title;
  find('[data-line]').textContent = record.line ?? '';
  find('[data-line]').hidden = record.line === null;
  const count =
    tracks.length === 1
      ? (lines['oneBar'] ?? '')
      : fill(lines['bars'] ?? '', { count: String(tracks.length) });
  find('[data-band]').textContent =
    `${count} · ${tracks.length >= 7 ? (lines['fullBand'] ?? '') : (lines['smallBand'] ?? '')}`;
  find('[data-only-shown]').textContent =
    sharerName === null
      ? (lines['onlyShown'] ?? '')
      : fill(lines['onlyShownBy'] ?? '', { name: sharerName });

  const rows = tracks.map((track) => {
    const row = document.createElement('li');
    const art = document.createElement('span');
    art.className = 'drawing';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = toSvg(buildMonster(specFromSeed(track.bodyType, track.seed)), {
      idPrefix: `track-${track.day}-`,
    });
    const day = document.createElement('span');
    day.className = 'track-day';
    day.textContent = weekday.format(utcDay(track.day));
    const name = document.createElement('strong');
    name.textContent = track.name;
    row.append(art, day, name);
    return row;
  });
  find('[data-tracks]').replaceChildren(...rows);
  const bars = tracks.map(() => document.createElement('span'));
  find('[data-bars]').replaceChildren(...bars);

  // The player: each bar, and its track, lights up as its part of the clip plays.
  const clip = find<HTMLAudioElement>('[data-clip]');
  const play = find<HTMLButtonElement>('[data-play]');
  const light = (): void => {
    const playing = !clip.paused && !clip.ended;
    const at = clip.duration > 0 ? clip.currentTime / clip.duration : 0;
    const current = Math.min(tracks.length - 1, Math.floor(at * tracks.length));
    bars.forEach((bar, index) => bar.classList.toggle('lit', playing && index <= current));
    rows.forEach((row, index) => row.classList.toggle('lit', playing && index === current));
    find('[data-disc]').classList.toggle('spinning', playing);
    find('[data-play-mark]').textContent = playing ? '❚❚' : '▶';
    play.setAttribute('aria-label', playing ? (lines['pause'] ?? '') : (lines['play'] ?? ''));
  };
  clip.src = `/api/shared-record/${encodeURIComponent(id)}/clip`;
  for (const event of ['play', 'pause', 'ended', 'timeupdate']) clip.addEventListener(event, light);
  clip.addEventListener('error', () => {
    play.disabled = true;
    find('[data-caption]').textContent = lines['noClip'] ?? '';
    light();
  });
  play.addEventListener('click', () => {
    if (clip.paused) void clip.play().catch(() => undefined);
    else clip.pause();
  });

  showState(root, 'found');
}
