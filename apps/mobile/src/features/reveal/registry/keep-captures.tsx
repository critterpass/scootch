import { SHARE_FRAMES } from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { offlineLine } from '@scootch/voice';

import { RecordScreen } from '../../record/record-screen';
import { ARM_REST_DEG } from '../../record/record-audio';
import { weekView } from '../../record/record-week';
import {
  composePoster,
  composeShareImage,
  composeWanted,
  formatsOffered,
  takesFrame,
  type ShareDress,
  type ShareFormat,
} from '../../share/share-image';
import { dayLog, monthWrap } from '../../share/share-logs';
import { SharePanel } from '../../share/share-panel';
import { lighthousePiece } from '../../world/landmarks';
import { WorldScreen } from '../../world/world-screen';
import { monthPages, pageOfToday, shelfCards } from '../../zoo/binder';
import { CardScreen } from '../../zoo/card-screen';
import { PagesScreen } from '../../zoo/pages-screen';
import { cardDataFor } from '../../zoo/zoo-cards';
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
    world: { pieces: fixturePieces(2), monsters: fixtureMonsters(2) },
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

/** The day every binder capture is taken on: the Thursday of the fixtures' week. */
const BINDER_TODAY = '2026-10-08';

function capturedZoo(
  language: Language,
  options: { count: number; plus: boolean; open?: boolean },
) {
  const monsters = asRows(fixtureMonsters(options.count));
  const cards = shelfCards(monsters, 'newest', options.plus);
  const first = cards[0];
  if (options.open && first) {
    return (
      <CardScreen
        model={{
          cards,
          index: 0,
          taskLine: fixtureTask(0, language).text,
          language,
          shareOffered: true,
        }}
        actions={{ close: nothing, show: nothing, share: nothing }}
      />
    );
  }
  // With cards on the shelf, two monsters are still wild, as the board draws them.
  const wild =
    options.count === 0
      ? []
      : [3, 12].map((day, index) => ({
          monster: { ...fixtureMonster(40 + index), caughtOn: null, caughtAt: null, number: null },
          day,
        }));
  return (
    <ZooScreen
      model={{
        cards,
        wild,
        language,
        plus: options.plus,
        sort: 'newest',
        month: pageOfToday(monsters, BINDER_TODAY),
        lastLooked: first?.id ?? null,
      }}
      actions={{
        close: nothing,
        openCard: nothing,
        sort: nothing,
        openPages: nothing,
        openWorld: nothing,
        sharePage: nothing,
      }}
    />
  );
}

/** The month pages on a month that filled its nine pockets, so the stamp shows. */
function capturedPages(language: Language) {
  const full = Array.from({ length: 11 }, (_, index) => ({
    ...fixtureMonster(index),
    caughtOn: '2026-09-12' as const,
  }));
  const pages = monthPages([...asRows(full), ...asRows(fixtureMonsters(4))], BINDER_TODAY);
  return (
    <PagesScreen
      model={{ pages, shown: '2026-09', current: '2026-10', language }}
      actions={{ close: nothing, show: nothing, openCard: nothing, sharePage: nothing }}
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

/** The composer's four frames, with Holo and Velvet open: the member every capture shows has Plus. */
const FRAMES = SHARE_FRAMES.map((id) => ({ id, locked: false }));
const SHARE_ACTIONS = {
  close: nothing,
  setFormat: nothing,
  setFrame: nothing,
  setHideTask: nothing,
  share: nothing,
  unshare: nothing,
  save: nothing,
  copyLink: nothing,
};

function capturedShare(language: Language, format: ShareFormat | 'wanted') {
  // A member wearing holo foil, with a few things caught today and the month they were caught in.
  const monsters = fixtureMonsters(5);
  const tasks = new Map(monsters.map((one, index) => [one.taskId, fixtureTask(index, language)]));
  const first = fixtureMonster(0);
  const [year = 2026, month = 1] = first.caughtOn.split('-').map(Number);
  const dress: ShareDress = {
    finish: 'holo',
    member: 42,
    plus: true,
    day: dayLog(monsters, tasks, first.caughtOn, 'UTC', false),
    month: monthWrap(monsters, tasks, year, month),
    frame: 'holo',
  };
  const still = { language, hideTask: false, notice: null, pageUp: false } as const;
  if (format === 'wanted') {
    const wanted = { monster: first.spec, name: first.name, title: first.title, day: 12, since: 9 };
    return (
      <SharePanel
        model={{
          ...still,
          moment: 'monster',
          image: composeWanted(wanted, 'riso', language),
          format: 'story',
          formats: [],
          frame: 'riso',
          frames: FRAMES,
          framed: true,
          canHideTask: false,
          pageOffered: true,
          linkOffered: false,
        }}
        actions={SHARE_ACTIONS}
      />
    );
  }
  if (format === 'poster' && dress.month) {
    return (
      <SharePanel
        model={{
          ...still,
          moment: 'month',
          image: composePoster(dress.month, language),
          format: 'story',
          formats: [],
          frame: 'paper',
          frames: [],
          framed: false,
          canHideTask: false,
          pageOffered: true,
          linkOffered: false,
        }}
        actions={SHARE_ACTIONS}
      />
    );
  }
  const shown = format === 'poster' ? 'story' : format;
  const card = cardDataFor(first, fixtureTask(0, language));
  return (
    <SharePanel
      model={{
        ...still,
        moment: 'caught',
        image: composeShareImage(shown, card, { hideTask: false, language }, dress),
        format: shown,
        formats: formatsOffered(dress).filter((one) => one !== 'poster'),
        frame: 'holo',
        frames: FRAMES,
        framed: takesFrame(shown),
        canHideTask: shown !== 'stickers',
        pageOffered: true,
        linkOffered: true,
      }}
      actions={SHARE_ACTIONS}
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
    case 'pages':
      return capturedPages(language);
    case 'record':
      return capturedRecord(language, capture.bars);
    case 'share':
      return capturedShare(language, capture.format);
  }
}
