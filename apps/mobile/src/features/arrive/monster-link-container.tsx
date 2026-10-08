import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appHttp } from '../../api/app-http';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDataTools, useDayStore, useToday } from '../../state/day-store-provider';
import { takenOnToday } from '../../state/shared-in';
import { goBack } from '../../ui/motion/go-back';
import { Page } from '../settings/page';
import { nativeSharedStore } from '../surfaces/native-surface-ports';
import { Words } from '../table/words';

import { dropKeptLink, holdLink } from './arrive-rules';
import { AskPage } from './ask-page';
import { nativeLinkPorts } from './native-link-ports';
import { openLink, takeIn, type LinkPorts, type Opened } from './open-link';

/**
 * A monster's link, opened (`scootch.app/m/<id>` in either language, the app's scheme, or the
 * link that was kept). Its page is read, and by the rules its thing is taken in as a thing
 * shared from another app is, or asked for under the monster's card, or home is simply shown.
 * The reading and the taking in go on by themselves: this screen only shows what they came to,
 * so a session that takes the screen over at launch does not lose the thing.
 */
export function MonsterLinkContainer() {
  const router = useRouter();
  const t = useT();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const day = useToday();
  const store = useDayStore();
  const db = useSQLiteContext();
  const { backup } = useDataTools();
  const languageNow = useRef(language);
  languageNow.current = language;
  const ports = useMemo<LinkPorts>(
    () => ({
      ...nativeLinkPorts({ db, http: appHttp(() => languageNow.current), backup }),
      store,
      shared: nativeSharedStore(),
      now: () => Date.now(),
    }),
    [store, db, backup],
  );
  /** `null` while the link is being opened. */
  const [opened, setOpened] = useState<Opened | null>(null);
  // Back to the screen the link was opened over, with the thing taken in under it as a shared one
  // is; opened cold, there is none, and this becomes home. Only ever once.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    goBack(router, '/');
  }, [router]);

  useEffect(() => {
    let shown = true;
    void openLink(ports, id)
      .catch((): Opened => ({ kind: 'home' }))
      .then((result) => {
        if (shown) return setOpened(result);
        // Taken off the screen before it could ask (a session took the launch over): the link
        // is kept, and asks the next time the app comes to the front.
        if (result.kind === 'ask' && !left.current) {
          holdLink(ports.shared, `/m/${result.page.id}`, ports.now());
        }
      });
    return () => {
      shown = false;
    };
  }, [ports, id]);

  useEffect(() => {
    if (opened?.kind === 'home') leave();
  }, [opened, leave]);

  if (opened?.kind === 'ask' && !left.current) {
    const { page } = opened;
    return (
      <AskPage
        monster={page}
        forToday={takenOnToday(day)}
        onSend={(text) => {
          void takeIn(ports, page, text);
          leave();
        }}
        onClose={() => {
          // The person looked and closed it: the link is not shown to them again.
          dropKeptLink(ports.shared, `/m/${page.id}`);
          leave();
        }}
      />
    );
  }
  // Nothing has been decided yet, or home is on its way: the page says only that it is opening.
  return (
    <Page onClose={leave} testID="monster-link-opening">
      <View style={styles.said}>
        <Words kind="headline">{t('arrive.opening')}</Words>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  said: { paddingHorizontal: 12 },
});
