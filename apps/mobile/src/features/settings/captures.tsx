import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { lineWithNoTask } from '../../state/lines';
import { RestoreOfferView } from '../backup/restore-offer';
import { OneScreenView } from '../one-screen/one-screen-view';
import { DeleteSheet, PrivacyPage } from '../privacy/privacy-page';

import { DayMomentsSheet, GetReadySheet } from './day-helper-sheets';
import { FinishWithPage } from './finish-with-page';
import { DayTimeRows, OthersHuntingRow } from './helper-rows';
import { Page } from './page';
import { Row, Section } from './rows';
import { SettingsPage } from './settings-page';

// Settings, privacy and the edge states as the screen registry shows them: the real views with
// fixed state and no store behind them.

const nothing = () => undefined;

function Settings({
  backupOff = false,
  tableName = null,
}: {
  readonly backupOff?: boolean;
  readonly tableName?: string | null;
}) {
  const { language } = useLanguage();
  return (
    <SettingsPage
      settings={defaultSettings(language)}
      chosenLanguage={null}
      backupLine={backupOff ? lineWithNoTask('backupOff', { language, attitude: 'cheeky' }) : null}
      developerTools={false}
      tableName={tableName}
      look={{ icon: 'cheeky', finish: 'holo' }}
      // The member the board draws: a yearly plan, number 42, wearing holo foil.
      card={{ plan: 'yearly', number: 42, finish: 'holo' }}
      onInvite={nothing}
      onChange={nothing}
      onOpen={nothing}
      onClose={nothing}
    />
  );
}

export function SettingsCapture() {
  return <Settings />;
}

/** Settings on a phone signed in for tables: the Tables row carries the seat's name. */
export function SettingsSignedInForTables() {
  return <Settings tableName="Priya" />;
}

export function SettingsBackupOff() {
  return <Settings backupOff />;
}

/**
 * The rows for the day's times and the count of others, in the groups they sit in on Settings:
 * a capture of the whole page would leave them below its fold.
 */
export function DayAndCompanyRowsCapture() {
  const t = useT();
  const { language } = useLanguage();
  const settings = { ...defaultSettings(language), coffeeAt: '08:20', getReadyLeadMinutes: 45 };
  return (
    <Page title={t('settings.title')} onClose={nothing} testID="settings">
      <Section label={t('settings.calm')}>
        <Row first label={t('settings.quietHours')} value="21:00–8:30" onPress={nothing} />
        <DayTimeRows settings={settings} onOpen={nothing} />
      </Section>
      <Section label={t('settings.people')}>
        <Row first label={t('settings.invite')} onPress={nothing} />
        <OthersHuntingRow settings={settings} onChange={nothing} />
      </Section>
    </Page>
  );
}

/** The five moments of the day, with one moved off its default. */
export function DayMomentsCapture() {
  const { language } = useLanguage();
  return (
    <DayMomentsSheet
      settings={{ ...defaultSettings(language), coffeeAt: '08:20' }}
      onChange={nothing}
      onClose={nothing}
    />
  );
}

/** The lead before a time heard, at its default. */
export function GetReadyCapture() {
  const { language } = useLanguage();
  return (
    <GetReadySheet settings={defaultSettings(language)} onChange={nothing} onClose={nothing} />
  );
}

export function FinishWithCapture() {
  return <FinishWithPage catchWith="rolled" monster={null} onChoose={nothing} onClose={nothing} />;
}

function Privacy({
  asking,
  backupTooLarge = false,
}: {
  readonly asking: boolean;
  readonly backupTooLarge?: boolean;
}) {
  return (
    <>
      <PrivacyPage
        keepTranscripts={false}
        notice={null}
        backupTooLarge={backupTooLarge}
        onKeepTranscripts={nothing}
        onExport={nothing}
        onAskDelete={nothing}
        onClose={nothing}
      />
      <DeleteSheet
        open={asking}
        monsterName="Molar"
        attitude="cheeky"
        onKeep={nothing}
        onDelete={nothing}
      />
    </>
  );
}

export function PrivacyCapture() {
  return <Privacy asking={false} />;
}

export function PrivacyBackupTooLargeCapture() {
  return <Privacy asking={false} backupTooLarge />;
}

export function PrivacyDeleteCapture() {
  return <Privacy asking />;
}

export function RestoreOfferCapture() {
  const { language } = useLanguage();
  return (
    <RestoreOfferView
      line={lineWithNoTask('restoreOffer', { language, attitude: 'cheeky' })}
      attitude="cheeky"
      busy={false}
      onRestore={nothing}
      onFresh={nothing}
    />
  );
}

/** The model did not answer: Scootch says so, and the person's own words are the one thing. */
export function ModelDownCapture() {
  const { language } = useLanguage();
  const t = useT();
  return (
    <OneScreenView
      mood="thinking"
      attitude="cheeky"
      line={lineWithNoTask('modelDownMore', { language, attitude: 'cheeky' })}
      offline={false}
      shown={{
        kind: 'task_set',
        taskText: t('launch.chip.reply'),
        treat: '',
        minutes: 10,
        onTreat: nothing,
        onMinutes: nothing,
        onStart: nothing,
      }}
    />
  );
}
