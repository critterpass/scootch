import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import type { Language } from '@phusclass/i18n';
import { fonts } from '@phusclass/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useBoard } from '../../state/board-provider';
import { PageHeader } from '../../ui/page-header';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PhuFace } from '../care/phu-face';
import { useFirstDay } from '../first-day/student';
import { clockText } from '../notes/notes-settings';

import {
  Foot,
  Group,
  Head,
  Row,
  Rule,
  Segments,
  SwitchRow,
  SETTINGS_PAGE,
  usePage,
} from './settings-parts';
import { PeriodAndDrum } from './period-and-drum';
import { StudentCard } from './student-card';
import { useSettingsActions } from './use-settings-actions';

/** Language names are written in their own language, whatever the app is in. */
const LANGUAGE_NAMES: Readonly<Record<Language, string>> = { en: 'English', vi: 'Tiếng Việt' };
const SITE = 'https://phusclass.com';
/** The board's version line, quieter than the muted grey. */
const VERSION_INK = '#B0A69B';

function siteLink(language: Language, page: 'privacy' | 'terms'): string {
  return language === 'vi' ? `${SITE}/vi/${page}` : `${SITE}/${page}`;
}

/**
 * Settings: the student card, notes home and quiet hours, the language, "be funny", tuition,
 * helplines, export and delete everything, the privacy and terms pages, and the version.
 */
export function SettingsScreen({
  studentName,
  opensAt,
}: {
  readonly studentName?: string;
  /** A capture of the timetable and the class, scrolled down to them. */
  readonly opensAt?: 'class';
} = {}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const t = useT();
  const router = useRouter();
  const board = useBoard();
  const { language, choose } = useLanguage();
  const { fullName } = useFirstDay();
  const { palette, allowFontScaling, size, captured } = useScreenStyle();
  const page = usePage();
  const daylight = page === SETTINGS_PAGE;
  const {
    notes,
    denied,
    beFunny,
    changeNotes,
    changeBeFunny,
    restore,
    exportAll,
    confirmDelete,
    openPage,
    version,
    setNotesSetting,
  } = useSettingsActions();

  return (
    <>
      <ScrollView
        ref={scroll}
        style={{ backgroundColor: page }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        testID="settings"
      >
        <StudentCard name={studentName ?? fullName} now={board.now.at} />

        <Head title={t('firstDay.label.notes')} />
        <Group>
          <SwitchRow
            first
            label={t('settings.notes.on')}
            value={notes.enabled}
            onChange={(on) => void changeNotes(on)}
            testID="settings-notes"
          />
          <Row
            label={t('settings.notes.perDay')}
            value={t('settings.notes.upTo')}
            faded={!notes.enabled}
          />
          <Row
            label={t('settings.notes.quiet')}
            value={`${clockText(notes.quiet.from)} – ${clockText(notes.quiet.to)}`}
            hint={t('settings.notes.quiet.hint')}
            chevron
            faded={!notes.enabled}
            onPress={() => router.push('/settings/quiet-hours')}
            testID="settings-quiet-hours"
          />
          <Row
            label={t('settings.notes.focus')}
            value={t('settings.notes.focusValue')}
            faded={!notes.enabled}
          />
          <SwitchRow
            label={t('settings.notes.timeSensitive')}
            value={notes.timeSensitive}
            disabled={!notes.enabled}
            onChange={(on) => void setNotesSetting({ timeSensitive: on })}
            testID="settings-time-sensitive"
          />
          {denied ? (
            <Row
              label={t('settings.notes.openSettings')}
              value={t('settings.notes.denied')}
              tone="link"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
        </Group>
        <Foot>{t('settings.notes.foot')}</Foot>

        <View
          onLayout={(event) => {
            if (opensAt === 'class') {
              scroll.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
            }
          }}
        />
        <Head title={t('settings.timetable.head')} />
        <Group>
          <Row
            first
            label={t('settings.timetable.row')}
            chevron
            onPress={() => router.push('/timetable')}
            testID="settings-timetable"
          />
        </Group>
        <Foot>{t('settings.timetable.foot')}</Foot>

        <Head title={t('settings.class.head')} />
        <Group>
          <PeriodAndDrum />
          <View style={styles.language}>
            <Rule />
            <Text
              allowFontScaling={allowFontScaling}
              style={{ color: palette.ink, fontSize: size(16) }}
            >
              {t('settings.language')}
            </Text>
            <Segments
              label={t('settings.language')}
              value={language}
              options={(['en', 'vi'] as const).map((value) => ({
                value,
                label: LANGUAGE_NAMES[value],
              }))}
              onChange={(next) => {
                if (!captured) void choose(next);
              }}
            />
          </View>
          <SwitchRow
            label={t('settings.beFunny')}
            value={beFunny}
            onChange={(on) => void changeBeFunny(on)}
            testID="settings-be-funny"
          />
        </Group>
        <Foot>{t('settings.beFunny.foot')}</Foot>

        <Head title={t('settings.tuition.head')} />
        <Group>
          <Row
            first
            label={t('settings.tuition.row')}
            chevron
            onPress={() => router.push('/tuition')}
            testID="settings-tuition"
          />
          <Row label={t('settings.restore')} onPress={restore} testID="settings-restore" />
        </Group>

        <Head title={t('settings.care.head')} />
        <Group>
          <Row
            first
            label={t('settings.helplines')}
            chevron
            onPress={() => router.push('/care/helplines')}
            testID="settings-helplines"
          />
          <Row
            label={t('settings.export')}
            hint={t('settings.export.hint')}
            chevron
            onPress={exportAll}
            testID="settings-export"
          />
          <Row
            label={t('settings.privacy')}
            hint={t('settings.opensInBrowser')}
            chevron
            onPress={() => openPage(siteLink(language, 'privacy'))}
            testID="settings-privacy"
          />
          <Row
            label={t('settings.terms')}
            hint={t('settings.opensInBrowser')}
            chevron
            onPress={() => openPage(siteLink(language, 'terms'))}
            testID="settings-terms"
          />
          <Row
            label={t('settings.delete')}
            tone="danger"
            onPress={confirmDelete}
            testID="settings-delete"
          />
        </Group>
        <Foot>{t('settings.privacy.foot')}</Foot>

        <View style={styles.footer}>
          <PhuFace mood="over" size={64} figureWidth={100} offsetY={-9} background="#FFF1DC" />
          <Text
            allowFontScaling={allowFontScaling}
            style={[
              styles.version,
              { color: daylight ? VERSION_INK : palette.faint, fontSize: size(12) },
            ]}
            testID="settings-version"
          >
            {version}
          </Text>
        </View>
      </ScrollView>
      <PageHeader title={t('settings.title')} />
    </>
  );
}

const styles = StyleSheet.create({
  // The system adds the bar above and the home bar below: the page keeps only its own room.
  content: { paddingTop: 4, paddingBottom: 48 },
  language: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  footer: { marginTop: 36, marginHorizontal: 20, alignItems: 'center', gap: 10 },
  version: { fontFamily: fonts.body, textAlign: 'center' },
});
