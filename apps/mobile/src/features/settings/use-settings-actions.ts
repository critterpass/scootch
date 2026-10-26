import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { appHttp } from '../../api/app-http';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useBoardStore } from '../../state/board-provider';
import { careActions } from '../care/care-actions';
import { readBeFunny, writeBeFunny } from '../care/care-memory';
import { canBeFunny } from '../care/care-mode';
import { askForNotes, notesAllowed, notesAskable } from '../notes/notes-home';
import { DEFAULT_QUIET } from '../notes/notes-plan';
import {
  onNotesSettingsChange,
  readNotesSettings,
  writeNotesSettings,
  type NotesSettings,
} from '../notes/notes-settings';
import { useTuition } from '../tuition/tuition-provider';

import { deleteEverything } from './delete-everything';
import { shareExport } from './everything';

/** What the Settings rows read and do. */
export function useSettingsActions() {
  const t = useT();
  const router = useRouter();
  const db = useSQLiteContext();
  const store = useBoardStore();
  const { language, choose } = useLanguage();
  const tuition = useTuition();
  const [notes, setNotes] = useState<NotesSettings>({
    enabled: false,
    quiet: DEFAULT_QUIET,
    timeSensitive: false,
  });
  const [denied, setDenied] = useState(false);
  const [beFunny, setBeFunny] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    const read = () => {
      void Promise.all([readNotesSettings(db), readBeFunny(db)]).then(([stored, funny]) => {
        if (!current) return;
        setNotes(stored);
        setBeFunny(funny);
      });
    };
    read();
    const stop = onNotesSettingsChange(read);
    return () => {
      current = false;
      stop();
    };
  }, [db]);

  const changeNotes = async (on: boolean) => {
    if (!on) {
      await writeNotesSettings(db, { enabled: false });
      return;
    }
    let allowed = await notesAllowed();
    if (!allowed && (await notesAskable())) allowed = await askForNotes();
    setDenied(!allowed);
    await writeNotesSettings(db, { enabled: allowed });
  };

  const changeBeFunny = async (on: boolean) => {
    setBeFunny(on);
    await writeBeFunny(db, on);
    if (!on) return;
    // What the screen already judged serious is lifted too. Never a crisis, never unscreened.
    const care = careActions(store, db);
    for (const { task } of store.getSnapshot().board) {
      if (canBeFunny(task)) await care.beFunny(task.id);
    }
  };

  const restore = () => {
    void tuition.restore().then((found) => {
      Alert.alert(found === null ? t('settings.restore.failed') : t('settings.restore.done'));
    });
  };

  const exportAll = () => {
    if (busy) return;
    setBusy(true);
    void shareExport(db, Date.now())
      .catch(() => Alert.alert(t('settings.export.failed')))
      .finally(() => setBusy(false));
  };

  const confirmDelete = () => {
    Alert.alert(t('settings.delete.title'), t('settings.delete.body'), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.delete.confirm'),
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void deleteEverything({ db, store, http: appHttp(() => language) })
            .then(() => choose(null))
            .finally(() => {
              setBusy(false);
              router.replace('/first-day');
            });
        },
      },
    ]);
  };

  const openPage = (url: string) => {
    void WebBrowser.openBrowserAsync(url).catch(() => undefined);
  };

  const version = [
    t('brand.name'),
    Constants.expoConfig?.version ?? '',
    Application.nativeBuildVersion === null ? '' : `(${Application.nativeBuildVersion})`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
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
    setNotesSetting: (change: Partial<NotesSettings>) => writeNotesSettings(db, change),
  };
}
