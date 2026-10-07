import { StyleSheet, View } from 'react-native';

import {
  CAMERA_MODES,
  readDesk,
  readRoom,
  type CameraAccess,
  type CameraMode,
  type FoundThing,
} from '@scootch/domain';
import { noTaskLine, offlineLine, offlinePacks } from '@scootch/voice';

import { useLanguage, useT } from '../../../i18n/i18n-provider';
import { useForcedVariant } from '../../../screens/registry/support/forced-variant';
import type { CameraRead } from '../camera-read';
import { CameraScreen, type CameraShown } from '../camera-screen';
import { ConsentSheet } from '../consent-sheet';

import type { CameraCapture } from './camera-state';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;
const PHOTO = { width: 1179, height: 2556 };
const ATTITUDE = 'cheeky';

/** What the phone's reader would have found on the drawn desk below. */
const THINGS: readonly FoundThing[] = [
  { id: 't0', box: [0.12, 0.3, 0.42, 0.2], labels: ['paper'] },
  { id: 't1', box: [0.62, 0.42, 0.2, 0.1], labels: ['mug'] },
  { id: 't2', box: [0.2, 0.58, 0.5, 0.04], labels: ['cable'] },
  { id: 't3', box: [0.58, 0.62, 0.14, 0.07], labels: ['coaster'] },
];

const ALL_OPEN = Object.fromEntries(CAMERA_MODES.map((mode) => [mode, 'open'])) as Record<
  CameraMode,
  CameraAccess
>;

/** A desk drawn from plain shapes, standing in for the photo a capture cannot take. */
function DrawnDesk() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.desk]}>
      <View style={[styles.thing, styles.papers]} />
      <View style={[styles.thing, styles.mug]} />
      <View style={[styles.thing, styles.cable]} />
      <View style={[styles.thing, styles.coaster]} />
    </View>
  );
}

/** A page drawn from plain shapes: a heading and five ruled boxes. */
function DrawnPage() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.desk]}>
      <View style={styles.page}>
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} style={styles.rule} />
        ))}
      </View>
    </View>
  );
}

const BOXES = [0, 1, 2, 3, 4].map((row) => ({
  id: `l${row + 1}`,
  box: [0.16, 0.26 + row * 0.085, 0.68, 0.05] as const,
  number: row + 1,
}));

export function Captured({ capture }: { readonly capture: CameraCapture }) {
  const { language } = useLanguage();
  const t = useT();
  const long = useForcedVariant()?.condition === 'long-text';
  const speaker = { language, attitude: ATTITUDE } as const;
  // Scootch's words in a capture are his own offline lines: none is written here.
  const step = offlineLine(language, ATTITUDE, 'tinyNextStep');
  const words = (line: string) => ({ line, action: null, task: null });

  const desk = readDesk(THINGS);
  const room = readRoom(THINGS);
  const reads: Partial<Record<CameraCapture, CameraRead>> = {
    ...(desk.kind === 'step'
      ? {
          desk: {
            kind: 'desk',
            photo: PHOTO,
            thing: desk.thing,
            others: desk.others,
            words: words(noTaskLine(speaker.language, speaker.attitude, 'cameraDesk')),
          },
        }
      : {}),
    ...(room.kind === 'step' && room.order[0] !== undefined
      ? {
          room: {
            kind: 'room',
            photo: PHOTO,
            zones: room.zones,
            order: room.order,
            letter: room.order[0],
            words: words(noTaskLine(speaker.language, speaker.attitude, 'cameraRoom')),
          },
        }
      : {}),
    paper: paperRead(step, t('camera.mode.paper'), long),
    'paper-explained': paperRead(step, t('camera.mode.paper'), long),
    screen: {
      kind: 'screen',
      photo: PHOTO,
      pick: BOXES[2]?.box ?? [0, 0, 1, 1],
      linesRead: 7,
      // A capture's draft is chrome standing in for the person's own words.
      draft: t('camera.screen.draft'),
      words: words(step),
    },
    nothing: { kind: 'nothing', mode: 'desk' },
    'no-step': { kind: 'no_step' },
    dark: { kind: 'dark' },
    poor: { kind: 'poor', issue: 'blurry' },
    'needs-connection': { kind: 'needs_connection' },
    failed: { kind: 'failed' },
    heavy: { kind: 'heavy', crisis: false },
    crisis: { kind: 'heavy', crisis: true },
  };

  const read = reads[capture];
  const shown: CameraShown =
    capture === 'permission' || capture === 'permission-refused'
      ? { kind: 'permission', canAsk: capture === 'permission' }
      : capture === 'asks-first'
        ? { kind: 'reading' }
        : read
          ? { kind: 'read', read }
          : { kind: 'looking' };
  const mode: CameraMode =
    read?.kind === 'room'
      ? 'room'
      : capture.startsWith('paper') || capture === 'asks-first' || capture === 'heavy'
        ? 'paper'
        : capture === 'screen'
          ? 'screen'
          : 'desk';
  const paperLike = mode === 'paper' || mode === 'screen';

  return (
    <>
      <CameraScreen
        mode={mode}
        access={
          capture === 'tries-spent' ? { ...ALL_OPEN, paper: 'locked', screen: 'locked' } : ALL_OPEN
        }
        shown={shown}
        attitude={ATTITUDE}
        picture={shown.kind === 'permission' ? null : paperLike ? <DrawnPage /> : <DrawnDesk />}
        plainLine={offlinePacks[language].plain.acknowledge}
        openingLine={noTaskLine(language, ATTITUDE, 'cameraOpen')}
        moreShown={capture === 'paper-explained'}
        copied={false}
        onMode={nothing}
        onClose={nothing}
        onShutter={nothing}
        onRetake={nothing}
        onStep={nothing}
        onBigger={nothing}
        onAllow={nothing}
        onSettings={nothing}
        onMore={nothing}
        onCopy={nothing}
        onHelplines={nothing}
      />
      {capture === 'asks-first' ? (
        <ConsentSheet open mode="paper" onReadIt={nothing} onNotNow={nothing} />
      ) : null}
    </>
  );
}

/** A read page. Its hard word and meaning are chrome strings standing in for a page's own. */
function paperRead(line: string, name: string, long: boolean): CameraRead {
  const pick = BOXES[2] ?? { id: 'l3', box: [0, 0, 1, 1] as const, number: 3 };
  return {
    kind: 'paper',
    photo: PHOTO,
    boxes: BOXES,
    pick,
    document: long ? `${name} ${name} ${name}` : name,
    jargon: { term: name, meaning: line, more: line },
    words: { line, action: null, task: null },
  };
}

const styles = StyleSheet.create({
  desk: { backgroundColor: '#B79A78' },
  thing: { position: 'absolute' },
  papers: {
    left: '12%',
    top: '30%',
    width: '42%',
    height: '20%',
    backgroundColor: '#F4EFE6',
    transform: [{ rotate: '-4deg' }],
  },
  mug: {
    left: '62%',
    top: '42%',
    width: '20%',
    height: '10%',
    borderRadius: 999,
    backgroundColor: '#3E5C76',
  },
  cable: { left: '20%', top: '58%', width: '50%', height: '4%', backgroundColor: '#2B2B2B' },
  coaster: {
    left: '58%',
    top: '62%',
    width: '14%',
    height: '7%',
    borderRadius: 8,
    backgroundColor: '#8C5A3C',
  },
  page: {
    position: 'absolute',
    left: '8%',
    top: '14%',
    width: '84%',
    height: '62%',
    backgroundColor: '#F7F4EE',
    paddingTop: '18%',
    paddingHorizontal: '8%',
    gap: 22,
  },
  rule: { height: 34, borderWidth: 1, borderColor: '#9A948A' },
});
