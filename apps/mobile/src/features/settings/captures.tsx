import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { lineWithNoTask } from '../../state/lines';
import { RestoreOfferView } from '../backup/restore-offer';
import { OneScreenView } from '../one-screen/one-screen-view';
import { DeleteSheet, PrivacyPage } from '../privacy/privacy-page';

import { FinishWithPage } from './finish-with-page';
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
      onLanguage={nothing}
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

export function FinishWithCapture() {
  return <FinishWithPage finishWith="double_tap" onChoose={nothing} onClose={nothing} />;
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
