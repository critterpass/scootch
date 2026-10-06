import type { Language } from '@scootch/i18n';
import { offlineLine } from '@scootch/voice';

import { RecordScreen } from '../../record/record-screen';
import { ARM_REST_DEG } from '../../record/record-audio';
import { weekView } from '../../record/record-week';
import { SharePanel } from '../../share/share-panel';
import { lighthousePiece } from '../../world/landmarks';
import { WorldScreen } from '../../world/world-screen';
import { cardDataFor, zooCards } from '../../zoo/zoo-cards';
import { ZooScreen } from '../../zoo/zoo-screen';
import type { RevealModel } from '../reveal-model';
import { RevealScreen } from '../reveal-screen';
import type { RevealStep } from '../reveal-steps';

import {
  asRows,
  FIXTURE_MONDAY,
  fixtureBars,
  fixtureMonster,
  fixtureMonsters,
  fixturePieces,
  fixtureTask,
} from './keep-fixtures';
import type { KeepCapture } from './keep-state';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;

const NO_REVEAL_ACTIONS = {
  next: nothing,
  skip: nothing,
  backToToday: nothing,
  showSomeone: nothing,
  playBar: nothing,
  chooseDrop: nothing,
};

/** One step of the reveal, for the catch of the first fixture monster on a Tuesday. */
function capturedReveal(step: RevealStep, language: Language) {
  const monster = fixtureMonster(1);
  const model: RevealModel = {
    step,
    language,
    attitude: 'cheeky',
    reducedMotion: true,
    tilting: false,
    card: cardDataFor(monster, fixtureTask(1, language)),
    monster,
    // The offline pack's own caught line stands in for the task's.
    line: offlineLine(language, 'cheeky', 'caught', 0),
    piece: fixturePieces(2)[1] ?? null,
    bar: { position: 2, instruments: ['keys', 'bassline'], playing: false },
    shareOffered: true,
  };
  return <RevealScreen model={model} actions={NO_REVEAL_ACTIONS} />;
}

function capturedWorld(count: number, lighthouse = false) {
  const pieces = fixturePieces(count);
  return (
    <WorldScreen
      model={{
        pieces: lighthouse ? [...pieces, lighthousePiece(FIXTURE_MONDAY)] : pieces,
        monsters: asRows(fixtureMonsters(count)),
      }}
      actions={{ close: nothing, openZoo: nothing, openRecord: nothing }}
    />
  );
}

function capturedZoo(
  language: Language,
  options: { count: number; plus: boolean; open?: boolean },
) {
  const cards = zooCards(asRows(fixtureMonsters(options.count)), options.plus);
  const first = cards[0];
  return (
    <ZooScreen
      model={{
        cards,
        language,
        plus: options.plus,
        sort: null,
        open:
          options.open && first
            ? { card: cardDataFor(first, fixtureTask(0, language)), shareOffered: true }
            : null,
      }}
      actions={{
        close: nothing,
        openCard: nothing,
        closeCard: nothing,
        nextSort: nothing,
        shareCard: nothing,
      }}
    />
  );
}

function capturedRecord(language: Language, barCount: number) {
  const monsters = fixtureMonsters(7);
  const week = weekView({
    week: '2026-W41',
    bars: fixtureBars(barCount),
    monsters,
    tasks: new Map(
      monsters.map((monster, index) => [monster.taskId, fixtureTask(index, language)]),
    ),
    weekRecords: [],
    todayPosition: Math.min(7, barCount + 1),
  });
  return (
    <RecordScreen
      model={{
        week,
        language,
        plus: false,
        playback: { playing: false, lit: [], progress: 0, armDeg: ARM_REST_DEG },
        reducedMotion: true,
      }}
      actions={{ close: nothing, togglePlay: nothing, shareWeek: nothing }}
    />
  );
}

function capturedShare(language: Language) {
  return (
    <SharePanel
      model={{
        card: cardDataFor(fixtureMonster(0), fixtureTask(0, language)),
        kind: 'story',
        language,
        hideTask: false,
        notice: null,
        pageUp: false,
      }}
      actions={{
        close: nothing,
        setHideTask: nothing,
        share: nothing,
        unshare: nothing,
        save: nothing,
      }}
    />
  );
}

/** The keeping screen a registry state asks for. */
export function Captured({ capture, language }: { capture: KeepCapture; language: Language }) {
  switch (capture.screen) {
    case 'reveal':
      return capturedReveal(capture.step, language);
    case 'world':
      return capturedWorld(capture.pieces, capture.lighthouse);
    case 'zoo':
      return capturedZoo(language, {
        count: capture.cards,
        plus: capture.plus,
        open: capture.open === true,
      });
    case 'record':
      return capturedRecord(language, capture.bars);
    case 'share':
      return capturedShare(language);
  }
}
