import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Attitude, ClockTime, SettingsRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { fonts, radius, spacing } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { QuietHoursRows } from './quiet-hours';
import { Page } from './page';
import { Note, Row, Section, SwitchRow } from './rows';
import { PressSpring } from '../../ui/motion/press-spring';

const ATTITUDES = ['soft', 'cheeky', 'unhinged'] as const satisfies readonly Attitude[];
const CARD_MOODS: Record<Attitude, ScootchProps['mood']> = {
  soft: 'asleep',
  cheeky: 'waiting',
  unhinged: 'stuck',
};
const FINISH_LABELS = {
  hold: 'finishWith.hold',
  double_tap: 'finishWith.tapTwice',
  voice: 'finishWith.sayDone',
} as const;
const LANGUAGES: readonly (Language | null)[] = [null, 'en', 'vi'];
const LANGUAGE_LABELS = { en: 'English', vi: 'Tiếng Việt' } as const;

/** `8:30` for `08:30`, as the design writes the quiet hours. */
export function shortClock(time: ClockTime): string {
  return time.replace(/^0(?=\d)/, '');
}

export interface SettingsPageProps {
  readonly settings: SettingsRow;
  /** The person's own choice of language, or `null` while the phone's language decides. */
  readonly chosenLanguage: Language | null;
  /** What Scootch says when no spare copy can be kept, from the offline pack; `null` otherwise. */
  readonly backupLine: string | null;
  readonly developerTools: boolean;
  readonly onChange: (changes: Partial<Omit<SettingsRow, 'id'>>) => void;
  /** Music with the ringer switch off: the choice and its change. Off until the person says so. */
  readonly musicWhenSilent?: boolean;
  readonly onMusicWhenSilent?: (on: boolean) => void;
  readonly onLanguage: (language: Language | null) => void;
  readonly onOpen: (
    page: 'finish-with' | 'privacy' | 'helplines' | 'plus' | 'tables' | 'developer-tools',
  ) => void;
  /** The name the person's seat shows; `null` on a phone that is not signed in for tables. */
  readonly tableName?: string | null;
  /** Opens the share sheet with a friend link. Unset (a capture), the row does nothing. */
  readonly onInvite?: () => void;
  readonly onClose: () => void;
}

/**
 * Settings: one page. The attitude, how the app feels, the quiet hours, how a session is finished,
 * privacy, and the few rows the app needs beyond the design: language, Plus and the helplines.
 */
export function SettingsPage(props: SettingsPageProps) {
  const { settings, chosenLanguage, onChange, onOpen } = props;
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const [open, setOpen] = useState<'quiet' | 'language' | null>(null);
  const toggle = (group: 'quiet' | 'language') => setOpen(open === group ? null : group);

  return (
    <Page barTitle={t('brand.name')} onClose={props.onClose} testID="settings">
      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.heading, { color: palette.muted, fontSize: size(13) }]}
        >
          {t('settings.attitude').toLocaleUpperCase()}
        </Text>
        <View
          accessibilityRole="radiogroup"
          style={[styles.dial, largeText && styles.stacked, { backgroundColor: palette.surface }]}
        >
          {ATTITUDES.map((attitude) => {
            const chosen = attitude === settings.attitude;
            return (
              <PressSpring
                key={attitude}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen, checked: chosen }}
                accessibilityLabel={t(`settings.attitude.${attitude}`)}
                accessibilityHint={t(`settings.attitude.${attitude}.note`)}
                onPress={() => onChange({ attitude })}
                feedback="choice"
                testID={`settings-attitude-${attitude}`}
                style={[styles.card, { borderColor: chosen ? palette.tomato : 'transparent' }]}
              >
                {largeText ? null : (
                  <Scootch
                    mood={CARD_MOODS[attitude]}
                    attitude={attitude}
                    reducedMotion
                    size={72}
                  />
                )}
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[
                    styles.cardName,
                    { color: palette.ink, fontSize: size(17), fontWeight: chosen ? '700' : '400' },
                  ]}
                >
                  {t(`settings.attitude.${attitude}`)}
                </Text>
              </PressSpring>
            );
          })}
        </View>
        <Note
          text={t(`settings.attitude.${settings.attitude}.note`)}
          testID="settings-attitude-note"
        />
      </View>

      <Section label={t('settings.feel')}>
        <SwitchRow
          first
          label={t('settings.music')}
          hint={t('settings.music.hint')}
          value={settings.music}
          onChange={(music) => onChange({ music })}
          testID="settings-music"
        />
        {settings.music && props.onMusicWhenSilent ? (
          <SwitchRow
            label={t('settings.musicWhenSilent')}
            sub={t('settings.musicWhenSilent.sub')}
            hint={t('settings.musicWhenSilent.hint')}
            value={props.musicWhenSilent === true}
            onChange={props.onMusicWhenSilent}
            testID="settings-music-when-silent"
          />
        ) : null}
        <SwitchRow
          label={t('settings.effects')}
          hint={t('settings.effects.hint')}
          value={settings.effects}
          onChange={(effects) => onChange({ effects })}
          testID="settings-effects"
        />
        <SwitchRow
          label={t('settings.haptics')}
          hint={t('settings.haptics.hint')}
          value={settings.haptics}
          onChange={(haptics) => onChange({ haptics })}
          testID="settings-haptics"
        />
        <SwitchRow
          label={t('settings.motion')}
          hint={t('settings.motion.hint')}
          value={settings.motion === 'full'}
          onChange={(full) => onChange({ motion: full ? 'full' : 'calm' })}
          testID="settings-motion"
        />
      </Section>

      <Section label={t('settings.calm')}>
        <Row
          first
          label={t('settings.quietHours')}
          hint={t('settings.quietHours.hint')}
          value={`${shortClock(settings.quietHoursStart)}–${shortClock(settings.quietHoursEnd)}`}
          onPress={() => toggle('quiet')}
          testID="settings-quiet-hours"
        />
        {open === 'quiet' ? (
          <QuietHoursRows
            start={settings.quietHoursStart}
            end={settings.quietHoursEnd}
            onChange={onChange}
          />
        ) : null}
        <Row
          label={t('settings.finishWith')}
          hint={t('settings.finishWith.hint')}
          value={t(FINISH_LABELS[settings.finishWith])}
          onPress={() => onOpen('finish-with')}
          testID="settings-finish-with"
        />
        <Row
          label={t('settings.privacyAndData')}
          hint={t('settings.privacyAndData.hint')}
          onPress={() => onOpen('privacy')}
          testID="settings-privacy"
        />
      </Section>

      <Section label={t('settings.company')}>
        <Row
          first
          label={t('settings.tables')}
          hint={t('settings.tables.hint')}
          value={props.tableName ?? t('settings.tables.off')}
          onPress={() => onOpen('tables')}
          testID="settings-tables"
        />
        <Row
          label={t('settings.invite')}
          hint={t('settings.invite.hint')}
          {...(props.onInvite ? { onPress: props.onInvite } : {})}
          testID="settings-invite"
        />
      </Section>

      <Section label={t('settings.more')}>
        <Row
          first
          label={t('settings.language')}
          hint={t('settings.language.hint')}
          value={
            chosenLanguage === null ? t('settings.language.phone') : LANGUAGE_LABELS[chosenLanguage]
          }
          onPress={() => toggle('language')}
          testID="settings-language"
        />
        {open === 'language'
          ? LANGUAGES.map((language) => (
              <Row
                key={language ?? 'phone'}
                kind="choice"
                selected={language === chosenLanguage}
                label={language === null ? t('settings.language.phone') : LANGUAGE_LABELS[language]}
                hint={t('settings.language.choose.hint')}
                onPress={() => props.onLanguage(language)}
                testID={`settings-language-${language ?? 'phone'}`}
              />
            ))
          : null}
        <Row
          label={t('brand.plus')}
          hint={t('settings.plus.hint')}
          onPress={() => onOpen('plus')}
          testID="settings-plus"
        />
        <Row
          label={t('settings.helplines')}
          hint={t('settings.helplines.hint')}
          onPress={() => onOpen('helplines')}
          testID="settings-helplines"
        />
        {props.developerTools ? (
          <Row
            label={t('settings.developerTools')}
            hint={t('settings.developerTools.hint')}
            onPress={() => onOpen('developer-tools')}
            testID="developer-tools"
          />
        ) : null}
      </Section>

      {props.backupLine === null ? null : (
        <Note text={props.backupLine} testID="settings-backup-off" />
      )}
      <Note text={t('settings.supportTool')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontFamily: fonts.body, marginLeft: spacing.md, letterSpacing: 0.3 },
  dial: { flexDirection: 'row', gap: 6, padding: 12, borderRadius: radius.lg },
  stacked: { flexDirection: 'column' },
  card: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  cardName: { fontFamily: fonts.body, textAlign: 'center' },
});
