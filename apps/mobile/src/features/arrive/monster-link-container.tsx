import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appHttp } from '../../api/app-http';
import { createMonsterPageApi, type MonsterPage } from '../../api/monster-page-api';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { goBack } from '../../ui/motion/go-back';
import { Page } from '../settings/page';
import { keychainKeptShares } from '../share/native-kept-shares';
import { Words } from '../table/words';

import { arrivalFor, pageIdFrom, rememberPage } from './arrive-rules';
import { AskPage } from './ask-page';

/**
 * A monster's link, opened (`scootch.app/m/<id>` in either language, the app's scheme, or the
 * link the App Clip kept). Its page is read, and by the rules its thing is taken in as a thing
 * shared from another app is, or asked for under the monster's card, or home is simply shown.
 */
export function MonsterLinkContainer() {
  const router = useRouter();
  const t = useT();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, today, heavyToday } = useToday();
  const dispatch = useDispatch();
  const languageNow = useRef(language);
  languageNow.current = language;
  const api = useMemo(() => createMonsterPageApi(appHttp(() => languageNow.current)), []);
  /** `undefined` while the page is read; `null` when there is none to read. */
  const [page, setPage] = useState<MonsterPage | null>();
  const settled = useRef(false);
  // Back to the screen the link was opened over, with the thing taken in under it as a shared one
  // is; opened cold, there is none, and this becomes home.
  const leave = useCallback(() => goBack(router, '/'), [router]);

  useEffect(() => {
    let current = true;
    const pageId = pageIdFrom(id);
    const read = pageId === null ? Promise.resolve(null) : api.read(pageId).catch(() => null);
    void read.then((found) => {
      if (current) setPage(found);
    });
    return () => {
      current = false;
    };
  }, [api, id]);

  const takeIn = useCallback(
    (from: MonsterPage, text: string) => {
      settled.current = true;
      void rememberPage(keychainKeptShares, from).catch(() => undefined);
      void dispatch({
        type: 'thing_shared_in',
        text,
        when: 'now',
        monsterPage: from.id,
      }).catch(() => undefined);
      leave();
    },
    [dispatch, leave],
  );

  // The day decides with the page, so nothing is done until today has been rebuilt from storage.
  const crisis = today.kind === 'crisis';
  const arrival = useMemo(
    () => (page === undefined || !ready ? null : arrivalFor(page, { crisis, heavy: heavyToday })),
    [page, ready, crisis, heavyToday],
  );
  useEffect(() => {
    if (arrival === null || arrival.kind === 'ask' || settled.current) return;
    if (arrival.kind === 'take_in') return takeIn(arrival.page, arrival.text);
    settled.current = true;
    leave();
  }, [arrival, takeIn, leave]);

  if (arrival?.kind === 'ask' && !settled.current) {
    return (
      <AskPage
        monster={arrival.page}
        onSend={(text) => takeIn(arrival.page, text)}
        onClose={leave}
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
