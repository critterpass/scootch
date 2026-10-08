import { Image, StyleSheet } from 'react-native';

import type { CardFinish, SettingsRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
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
 * The Look group of Settings: the app icon, the card finish and what the icon changes with, each
 * row showing what is picked. The first and last open the icon picker; the finish is the studio's.
 */
export function LookSection({
  look,
  follows,
  wallpaper,
  onOpen,
}: {
  readonly look: LookFacts;
  readonly follows: SettingsRow['iconFollows'];
  readonly wallpaper: SettingsRow['wallpaper'];
  readonly onOpen: (page: 'icon' | 'studio' | 'wallpaper') => void;
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
        label={t('look.cardFinish')}
        hint={t('look.cardFinish.hint')}
        value={t(`studio.finish.${look.finish}.short`)}
        onPress={() => onOpen('studio')}
        testID="settings-card-finish"
      />
      <Row
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
  icon: { width: 36, height: 36, borderRadius: 9, marginRight: 12 },
});
