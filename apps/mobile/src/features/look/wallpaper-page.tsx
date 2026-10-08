import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note } from '../settings/rows';

import { WALLPAPERS, type WallpaperKind } from './wallpaper-scene';

/** The preview's size on the page, and the corner the phone around it is drawn with. */
export const PREVIEW = { width: 196, height: 410, corner: 32 } as const;

export type SaveState = 'idle' | 'saving' | 'saved' | 'refused' | 'failed';

export interface WallpaperPageProps {
  readonly kind: WallpaperKind;
  readonly onKind: (kind: WallpaperKind) => void;
  /** The wallpaper itself, drawn `PREVIEW` points in size. */
  readonly preview: ReactNode;
  readonly saving: SaveState;
  readonly onSave: () => void;
  /** Opens this app's page in the Settings app, where Photos can be allowed. */
  readonly onOpenSettings: () => void;
  readonly onOpenShortcuts: () => void;
  readonly onClose: () => void;
}

const STEPS = [
  'wallpaper.refresh.one',
  'wallpaper.refresh.two',
  'wallpaper.refresh.three',
] as const;

/**
 * Wallpaper: three drawings of the person's own world, sized for a Lock Screen. An app cannot set
 * the wallpaper, so the page saves the picture and says who presses the last button; "Refresh
 * every morning" shows the Shortcuts automation that does it daily.
 */
export function WallpaperPage(props: WallpaperPageProps) {
  const { kind, saving } = props;
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const [steps, setSteps] = useState(false);
  const night = kind === 'night';

  return (
    <Page title={t('look.wallpaper')} onClose={props.onClose} testID="wallpaper">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('wallpaper.preview', { wallpaper: t(`wallpaper.${kind}`) })}
        style={styles.stage}
      >
        <View style={[styles.phone, { borderColor: '#151311' }]}>
          {props.preview}
          <View style={styles.island} />
          <Text
            allowFontScaling={false}
            style={[
              styles.clock,
              { color: night ? '#F3EBDD' : kind === 'perched' ? '#3B1A10' : '#1C1A17' },
            ]}
          >
            9:41
          </Text>
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        style={[styles.tabs, { backgroundColor: `${palette.ink}0F` }]}
      >
        {WALLPAPERS.map((one) => {
          const chosen = one === kind;
          return (
            <PressSpring
              key={one}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(`wallpaper.${one}`)}
              accessibilityHint={t('wallpaper.kind.hint')}
              onPress={() => props.onKind(one)}
              feedback="choice"
              testID={`wallpaper-${one}`}
              style={[styles.tab, chosen && { backgroundColor: palette.surface }]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.tabName,
                  { color: palette.ink, fontSize: size(13), fontWeight: chosen ? '700' : '500' },
                ]}
              >
                {t(`wallpaper.${one}`)}
              </Text>
            </PressSpring>
          );
        })}
      </View>

      <CapsuleButton
        label={t(saving === 'saved' ? 'wallpaper.saved' : 'wallpaper.save')}
        hint={t('wallpaper.save.hint')}
        onPress={props.onSave}
        disabled={saving === 'saving'}
        testID="wallpaper-save"
      />
      {saving === 'refused' ? (
        <View style={styles.notice}>
          <Note text={t('wallpaper.refused')} testID="wallpaper-refused" />
          <CapsuleButton
            tone="quiet"
            label={t('wallpaper.openSettings')}
            hint={t('wallpaper.openSettings.hint')}
            onPress={props.onOpenSettings}
            testID="wallpaper-open-settings"
          />
        </View>
      ) : null}
      {saving === 'failed' ? <Note text={t('wallpaper.failed')} testID="wallpaper-failed" /> : null}

      <CapsuleButton
        tone="quiet"
        label={t('wallpaper.refresh')}
        hint={t('wallpaper.refresh.hint')}
        onPress={() => setSteps(!steps)}
        testID="wallpaper-refresh"
      />
      {steps ? (
        <View style={[styles.steps, { backgroundColor: palette.surface }]} testID="wallpaper-steps">
          {STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.stepNumber, { color: palette.muted, fontSize: size(15) }]}
              >
                {index + 1}
              </Text>
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.stepWords, { color: palette.ink, fontSize: size(15) }]}
              >
                {t(step)}
              </Text>
            </View>
          ))}
          <CapsuleButton
            label={t('wallpaper.openShortcuts')}
            hint={t('wallpaper.openShortcuts.hint')}
            onPress={props.onOpenShortcuts}
            testID="wallpaper-open-shortcuts"
          />
        </View>
      ) : null}
      <Note text={t('wallpaper.note')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingVertical: spacing.sm },
  phone: {
    width: PREVIEW.width + 10,
    height: PREVIEW.height + 10,
    borderWidth: 5,
    borderRadius: PREVIEW.corner + 5,
    overflow: 'hidden',
  },
  island: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 62,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  clock: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2.5,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: radius.pill,
    gap: 2,
  },
  tab: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabName: { fontFamily: fonts.body, textAlign: 'center' },
  notice: { gap: spacing.sm },
  steps: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.sm },
  stepNumber: { fontFamily: fonts.heading, fontWeight: '700', width: 18 },
  stepWords: { fontFamily: fonts.body, flex: 1 },
});
