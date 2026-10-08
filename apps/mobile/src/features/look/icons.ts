import type { Attitude, CardFinish, SettingsRow } from '@scootch/domain';

/**
 * The app's ten icons: one for each attitude and one for each card finish. They are drawn by
 * `assets/render-app-icon.ts` and declared to iOS in `app.config.ts` under the same names.
 */
export const ATTITUDE_ICONS = ['soft', 'cheeky', 'unhinged'] as const;
export const FINISH_ICONS = [
  'paper',
  'holo',
  'chrome',
  'jelly',
  'glass',
  'velvet',
  'riso',
] as const;
export const APP_ICONS = [...ATTITUDE_ICONS, ...FINISH_ICONS] as const;
export type AppIconName = (typeof APP_ICONS)[number];

/** The icon a fresh install shows, which iOS knows as the app's own and not as an alternate. */
export const PRIMARY_ICON: AppIconName = 'cheeky';

/** The icon of each finish. Velvet is the finish the app's own tables call flock. */
const ICON_OF_FINISH: Readonly<Record<CardFinish, AppIconName>> = {
  paper: 'paper',
  holo: 'holo',
  chrome: 'chrome',
  jelly: 'jelly',
  glass: 'glass',
  flock: 'velvet',
  riso: 'riso',
};
const FINISH_OF_ICON = new Map(
  (Object.entries(ICON_OF_FINISH) as [CardFinish, AppIconName][]).map(([finish, icon]) => [
    icon,
    finish,
  ]),
);

export const iconOfFinish = (finish: CardFinish): AppIconName => ICON_OF_FINISH[finish];
/** The finish an icon is made of, or `null` for an attitude's icon. */
export const finishOfIcon = (icon: AppIconName): CardFinish | null =>
  FINISH_OF_ICON.get(icon) ?? null;

export function isAppIcon(name: string): name is AppIconName {
  return (APP_ICONS as readonly string[]).includes(name);
}

export interface IconFacts {
  readonly settings: Pick<SettingsRow, 'attitude' | 'iconFollows' | 'iconPinned'>;
  /** The finish the person wears. */
  readonly finish: CardFinish;
  /** Whether a finish may be worn: the one rule the studio uses (`features/studio/rules.ts`). */
  readonly mayWear: (finish: CardFinish) => boolean;
}

/** Whether an icon may be shown: an attitude's always, a finish's by whoever may wear it. */
export function mayShow(icon: AppIconName, mayWear: IconFacts['mayWear']): boolean {
  const finish = finishOfIcon(icon);
  return finish === null || mayWear(finish);
}

/**
 * The icon the app should be wearing. It follows the attitude, follows the worn finish, or stays
 * as picked. A finish that may no longer be worn falls back to the attitude's icon, so an icon is
 * never one the person could not choose today.
 */
export function iconFor({ settings, finish, mayWear }: IconFacts): AppIconName {
  const ofAttitude: AppIconName = settings.attitude satisfies Attitude;
  if (settings.iconFollows === 'attitude') return ofAttitude;
  const wanted =
    settings.iconFollows === 'finish'
      ? iconOfFinish(finish)
      : isAppIcon(settings.iconPinned)
        ? settings.iconPinned
        : ofAttitude;
  return mayShow(wanted, mayWear) ? wanted : ofAttitude;
}

/** The name iOS knows an icon by: `null` is the app's own icon. */
export function alternateName(icon: AppIconName): string | null {
  return icon === PRIMARY_ICON ? null : `Icon-${icon}`;
}
