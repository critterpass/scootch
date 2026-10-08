import { useState } from 'react';

import {
  dailyNotificationLimit,
  type CardFinish,
  type ClockTime,
  type SettingsRow,
} from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { LookSection, type LookFacts } from '../look/look-section';
import type { PlanId } from '../plus/products';

import { AttitudeDial } from './attitude-dial';
import { CardThumb, SeatThumb } from './look-thumbs';
import { Page } from './page';
import { QuietHoursRows } from './quiet-hours';
import { Note, Row, Section, SwitchRow } from './rows';

const FINISH_LABELS = {
  hold: 'finishWith.hold',
  double_tap: 'finishWith.tapTwice',
  voice: 'finishWith.sayDone',
} as const;
const LANGUAGES: readonly (Language | null)[] = [null, 'en', 'vi'];
const LANGUAGE_LABELS = { en: 'English', vi: 'Tiếng Việt' } as const;
/** The seat's ground in the Tables row: a shade under the page, in either appearance. */
const SEAT_GROUND = { light: '#EDE7DD', dark: '#2E2A26' } as const;

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
    page:
      | 'finish-with'
      | 'privacy'
      | 'helplines'
      | 'plus'
      | 'tables'
      | 'developer-tools'
      | 'icon'
      | 'wallpaper'
      | 'shortcuts',
  ) => void;
  /** What the Look group shows as picked. Unset, the group is left out. */
  readonly look?: LookFacts;
  /**
   * What the Plus row shows: the plan that holds Plus (`null` without it), the member's number
   * once the server has given one, and the finish that is worn, which the card is drawn in.
   */
  readonly card: {
    readonly plan: PlanId | null;
    readonly number: number | null;
    readonly finish: CardFinish;
  };
  /** The name the person's seat shows; `null` on a phone that is not signed in for tables. */
  readonly tableName?: string | null;
  /** Opens the share sheet with a friend link. Unset (a capture), the row does nothing. */
  readonly onInvite?: () => void;
  readonly onClose: () => void;
}

/**
 * Settings: one page. The attitude, the Plus card, the look, how the app feels, the quiet hours,
 * how a monster is caught, privacy, tables, and the few rows the app needs beyond the design:
 * language and the helplines. Every row with an arrow opens a page that lives with its topic.
 */
export function SettingsPage(props: SettingsPageProps) {
  const { settings, chosenLanguage, onChange, onOpen } = props;
  const t = useT();
  const appearance = useAppearance();
  const [open, setOpen] = useState<'quiet' | 'language' | null>(null);
  const toggle = (group: 'quiet' | 'language') => setOpen(open === group ? null : group);

  return (
    <Page barTitle={t('brand.name')} onClose={props.onClose} testID="settings">
      <AttitudeDial attitude={settings.attitude} onChoose={(attitude) => onChange({ attitude })} />

      <Section label={`${t('brand.name')} ${t('brand.plus')}`}>
        <Row
          first
          leading={<CardThumb finish={props.card.finish} number={props.card.number} />}
          label={props.card.plan === null ? t('settings.plus.free') : t('plus.card.title')}
          hint={t('settings.plus.hint')}
          {...(props.card.plan === null ? {} : { value: t(`plus.plan.${props.card.plan}`) })}
          onPress={() => onOpen('plus')}
          testID="settings-plus"
        />
      </Section>

      {props.look ? (
        <LookSection
          look={props.look}
          follows={settings.iconFollows}
          wallpaper={settings.wallpaper}
          onOpen={onOpen}
        />
      ) : null}

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
          kind="fact"
          label={t('look.monstersMessage')}
          value={t('look.monstersMessage.upTo', {
            count: dailyNotificationLimit(settings.attitude),
          })}
          testID="settings-monsters-message"
        />
        <Row
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
          label={t('settings.backTap')}
          sub={t('settings.backTap.sub')}
          hint={t('settings.backTap.hint')}
          onPress={() => onOpen('shortcuts')}
          testID="settings-back-tap"
        />
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

      <Section label={t('settings.people')}>
        <Row
          first
          leading={<SeatThumb ground={SEAT_GROUND[appearance]} />}
          label={t('settings.tables')}
          hint={t('settings.tables.hint')}
          sub={props.tableName ?? t('settings.tables.off')}
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
