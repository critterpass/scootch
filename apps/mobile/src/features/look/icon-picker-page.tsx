import { Image, StyleSheet, Text, View } from 'react-native';

import type { SettingsRow } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note } from '../settings/rows';

import { ICON_PICTURES, iconLabel } from './icon-pictures';
import { ATTITUDE_ICONS, FINISH_ICONS, type AppIconName } from './icons';

type Follows = SettingsRow['iconFollows'];
const FOLLOWS = ['attitude', 'finish', 'pinned'] as const satisfies readonly Follows[];

export interface IconPickerPageProps {
  /** The icon that is on now, whatever it follows. */
  readonly icon: AppIconName;
  readonly follows: Follows;
  /** The icon each way of following would put on, drawn on its tile. */
  readonly iconOf: Readonly<Record<Follows, AppIconName>>;
  /** Whether an icon may be shown; a finish's icon that may not carries the Plus mark. */
  readonly mayShow: (icon: AppIconName) => boolean;
  readonly onFollow: (follows: Follows) => void;
  /** An icon was tapped: it is kept, or the studio opens on a finish that is not worn yet. */
  readonly onPick: (icon: AppIconName) => void;
  readonly onClose: () => void;
}

/** One icon as iOS rounds it, at `side` points. */
function IconPicture({ icon, side }: { readonly icon: AppIconName; readonly side: number }) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={ICON_PICTURES[icon]}
      style={{ width: side, height: side, borderRadius: side * 0.24 }}
    />
  );
}

/**
 * The icon picker: the icon between two neighbours as the Home Screen shows it, what it changes
 * with, and the ten icons. Tapping one keeps it. iOS shows its own alert when the icon changes.
 */
export function IconPickerPage(props: IconPickerPageProps) {
  const { icon, follows, iconOf, mayShow, onFollow, onPick } = props;
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const words = { allowFontScaling, style: { fontFamily: fonts.body } } as const;

  const tile = (one: AppIconName) => {
    const chosen = one === icon;
    const open = mayShow(one);
    return (
      <PressSpring
        key={one}
        accessibilityRole="radio"
        accessibilityState={{ selected: chosen, checked: chosen }}
        accessibilityLabel={open ? t(iconLabel(one)) : `${t(iconLabel(one))}. ${t('brand.plus')}`}
        accessibilityHint={t(open ? 'look.icon.hint' : 'look.icon.locked.hint')}
        onPress={() => onPick(one)}
        feedback="choice"
        testID={`icon-${one}`}
        style={styles.tile}
      >
        <View style={[styles.ring, { borderColor: chosen ? palette.ink : 'transparent' }]}>
          <IconPicture icon={one} side={58} />
          {open ? null : (
            <View style={[styles.badge, { backgroundColor: palette.ink }]}>
              <Text allowFontScaling={false} style={[styles.badgeWords, { color: palette.page }]}>
                {t('brand.plus').toLocaleUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text
          {...words}
          numberOfLines={2}
          style={[
            styles.tileName,
            { color: palette.ink, fontSize: size(14), fontWeight: chosen ? '700' : '400' },
          ]}
        >
          {t(iconLabel(one))}
        </Text>
      </PressSpring>
    );
  };

  const heading = (text: string) => (
    <Text
      accessibilityRole="header"
      allowFontScaling={allowFontScaling}
      style={[styles.heading, { color: palette.muted, fontSize: size(12) }]}
    >
      {text.toLocaleUpperCase()}
    </Text>
  );

  return (
    <Page title={t('look.appIcon')} onClose={props.onClose} testID="icon-picker">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('look.preview', { icon: t(iconLabel(icon)) })}
        style={[styles.shelf, { backgroundColor: `${palette.tomato}26` }]}
      >
        <View style={[styles.neighbour, { backgroundColor: `${palette.surface}B3` }]} />
        <View style={styles.own}>
          <IconPicture icon={icon} side={76} />
        </View>
        <View style={[styles.neighbour, { backgroundColor: `${palette.ink}1F` }]} />
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.cardTitle, { color: palette.muted, fontSize: size(15) }]}
        >
          {t('look.changesWith')}
        </Text>
        <View accessibilityRole="radiogroup" style={[styles.modes, largeText && styles.stacked]}>
          {FOLLOWS.map((one) => {
            const chosen = one === follows;
            return (
              <PressSpring
                key={one}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen, checked: chosen }}
                accessibilityLabel={`${t(`look.follows.${one}`)}. ${t(`look.follows.${one}.sub`)}`}
                accessibilityHint={t('look.follows.hint')}
                onPress={() => onFollow(one)}
                feedback="choice"
                testID={`icon-follows-${one}`}
                style={[
                  styles.mode,
                  {
                    borderColor: chosen ? palette.ink : 'transparent',
                    backgroundColor: chosen ? palette.surface : `${palette.ink}0A`,
                  },
                ]}
              >
                {largeText ? null : <IconPicture icon={iconOf[one]} side={44} />}
                <Text
                  {...words}
                  style={[styles.modeName, { color: palette.ink, fontSize: size(15) }]}
                >
                  {t(`look.follows.${one}`)}
                </Text>
                <Text
                  {...words}
                  style={[styles.modeSub, { color: palette.muted, fontSize: size(12) }]}
                >
                  {t(`look.follows.${one}.sub`)}
                </Text>
              </PressSpring>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {heading(t('look.icons.attitude'))}
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {ATTITUDE_ICONS.map(tile)}
        </View>
        {heading(t('look.icons.finishes'))}
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {FINISH_ICONS.map(tile)}
        </View>
      </View>
      <Note text={t('look.note')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  shelf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  neighbour: { width: 62, height: 62, borderRadius: 15 },
  own: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontFamily: fonts.body, fontWeight: '600' },
  modes: { flexDirection: 'row', gap: 6 },
  stacked: { flexDirection: 'column' },
  mode: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  modeName: { fontWeight: '700', textAlign: 'center', marginTop: 2 },
  modeSub: { textAlign: 'center' },
  heading: { fontFamily: fonts.body, letterSpacing: 1.6, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  tile: { width: '25%', alignItems: 'center', gap: 4 },
  ring: { padding: 3, borderWidth: 2, borderRadius: 20 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeWords: { fontFamily: fonts.body, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  tileName: { textAlign: 'center' },
});
