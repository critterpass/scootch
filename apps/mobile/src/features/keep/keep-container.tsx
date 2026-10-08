import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useHomePager, usePageShown } from '../home-pager/home-pager-context';
import { RecordTab } from '../record/record-container';
import { useLighthouse } from '../world/use-lighthouse';
import { WorldTab } from '../world/world-container';
import { ZooTab } from '../zoo/zoo-container';

import type { KeepTab } from './keep-motion';
import { KeepScreen } from './keep-screen';

/** How long the world has the phone to itself before the other two tabs are made ready. */
const READY_AFTER_MS = 700;

/**
 * The keeping place on the real phone: the world, everything caught and the week's song, read
 * from the phone's own tables. Beside home it is a page kept ready out of sight: there it is read
 * again each time it slides into view, it is the world again each time, and it closes by sliding
 * home. Reached any other way (a link, a moment that ends there) it opens on the tab it was asked
 * for and closes back to where it was opened from.
 */
export function KeepContainer({ initial = 'world' }: { readonly initial?: KeepTab }) {
  const router = useRouter();
  const pager = useHomePager();
  const inView = usePageShown();
  const focused = useIsFocused();
  const { palette } = useScreenStyle();
  const { settings } = useToday();
  const [tab, setTab] = useState<KeepTab>(initial);
  const visits = useRef(0);
  const wasInView = useRef(inView);
  if (inView && !wasInView.current) visits.current += 1;
  wasInView.current = inView;
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  // Read again whenever the place comes back into view: a catch may have happened since, on the
  // one screen or behind a card that was open over this.
  const { keepsakes } = useKeepsakes(`${String(landed)}:${visits.current}:${String(focused)}`);

  // Slid out of sight beside home, it is the world again the next time.
  useEffect(() => {
    if (pager && !inView) setTab('world');
  }, [pager, inView]);

  // The other two tabs are drawn once the first has had a moment, so that the move to either is
  // already made of real things; one asked for sooner is drawn then.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!inView || ready) return undefined;
    const timer = setTimeout(() => setReady(true), READY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [inView, ready]);
  const [asked, setAsked] = useState<readonly KeepTab[]>([initial]);
  const show = (next: KeepTab) => {
    setAsked((before) => (before.includes(next) ? before : [...before, next]));
    setTab(next);
  };
  const drawn = (one: KeepTab) => ready || asked.includes(one);

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  return (
    <KeepScreen
      tab={tab}
      onTab={show}
      close={() => (pager ? pager.show('home') : goBack(router, '/'))}
      homeIsBeside={pager !== null}
      calm={settings.motion === 'calm' || !inView}
      panes={{
        world: drawn('world') ? (
          <WorldTab
            keepsakes={keepsakes}
            active={tab === 'world'}
            shown={inView && focused && tab === 'world'}
          />
        ) : null,
        caught: drawn('caught') ? <ZooTab keepsakes={keepsakes} active={tab === 'caught'} /> : null,
        song: drawn('song') ? (
          <RecordTab keepsakes={keepsakes} active={inView && focused && tab === 'song'} />
        ) : null,
      }}
    />
  );
}
