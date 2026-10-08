import { Image, StyleSheet } from 'react-native';

import type { CardFinish, SettingsRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { FinishThumb, THUMB_SLOT, WallpaperThumb } from '../settings/look-thumbs';
import { Row, Section } from '../settings/rows';

import { ICON_PICTURES, iconLabel } from './icon-pictures';
import type { AppIconName } from './icons';

export interface LookFacts {
  /** The icon that is on now. */
  readonly icon: AppIconName;
  /** The finish the person wears. */
  readonly finish: CardFinish;
}

/**
 * The Look group of Settings: the app icon, the studio, the wallpaper and what the icon changes
 * with, each row showing what is picked. The first and last open the icon picker. The studio's
 * row shows the finish that is worn and opens the studio itself; on a day with something heavy in
 * it, when nothing is sold, the row rests.
 */
export function LookSection({
  look,
  follows,
  wallpaper,
  onOpen,
  onStudio,
}: {
  readonly look: LookFacts;
  readonly follows: SettingsRow['iconFollows'];
  readonly wallpaper: SettingsRow['wallpaper'];
  readonly onOpen: (page: 'icon' | 'wallpaper') => void;
  /** Opens the studio. Unset on a day when nothing is sold: the row is drawn and rests. */
  readonly onStudio?: (() => void) | undefined;
}) {
  const t = useT();
  const name = t(iconLabel(look.icon));
  return (
    <Section label={t('settings.look')}>
      <Row
        first
        leading={
          <Image
            accessibilityIgnoresInvertColors
            source={ICON_PICTURES[look.icon]}
            style={styles.icon}
          />
        }
        label={t('look.appIcon')}
        hint={t('look.appIcon.hint')}
        value={follows === 'pinned' ? name : t('look.appIcon.auto', { icon: name })}
        onPress={() => onOpen('icon')}
        testID="settings-app-icon"
      />
      <Row
        leading={<FinishThumb finish={look.finish} />}
        label={t('studio.title')}
        hint={t('look.studio.hint')}
        value={t(`studio.finish.${look.finish}.short`)}
        {...(onStudio ? { onPress: onStudio } : { inert: true })}
        testID="settings-studio"
      />
      <Row
        leading={<WallpaperThumb kind={wallpaper} />}
        label={t('look.wallpaper')}
        hint={t('look.wallpaper.hint')}
        value={t(`wallpaper.${wallpaper}`)}
        onPress={() => onOpen('wallpaper')}
        testID="settings-wallpaper"
      />
      <Row
        label={t('look.iconChangesWith')}
        hint={t('look.appIcon.hint')}
        value={t(`look.follows.${follows}`)}
        onPress={() => onOpen('icon')}
        testID="settings-icon-follows"
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  // The icon stands in the same slot as every other picture in the group.
  icon: { width: THUMB_SLOT, height: THUMB_SLOT, borderRadius: 8 },
});
