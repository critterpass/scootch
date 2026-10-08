import { SHARE_FRAMES } from '@scootch/art';
import type { Language } from '@scootch/i18n';

import {
  composePostcard,
  composePoster,
  composeShareImage,
  composeSleeve,
  composeWanted,
  formatsOffered,
  takesFrame,
  type ShareDress,
  type ShareFormat,
} from '../../share/share-image';
import { dayLog, monthWrap } from '../../share/share-logs';
import { SharePanel } from '../../share/share-panel';
import { worldScene } from '../../world/world-scene';
import { cardDataFor } from '../../zoo/zoo-cards';

import {
  asRows,
  fixtureMonster,
  fixtureMonsters,
  fixturePieces,
  fixtureTask,
} from './keep-fixtures';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;

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

/** The composer as a registry state shows it: a member wearing holo foil, on one moment. */
export function capturedShare(
  language: Language,
  format: ShareFormat | 'wanted' | 'postcard' | 'sleeve',
) {
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
  if (format === 'postcard' || format === 'sleeve') {
    const scene = worldScene(fixturePieces(40), asRows(fixtureMonsters(40)));
    const image =
      format === 'postcard'
        ? composePostcard(
            { things: 40, month, year, scene: scene.commands, sceneSize: scene.size },
            'paper',
            language,
          )
        : composeSleeve(
            {
              weekNumber: 41,
              week: '2026-W41',
              name: null,
              credits: monsters.map((one, index) => ({
                position: index + 1,
                instrument: ['Keys', 'Bassline', 'Marimba', 'Drums', 'Whistle'][index] ?? 'Keys',
                task: tasks.get(one.taskId)?.text ?? null,
              })),
            },
            'velvet',
            language,
            false,
          );
    return (
      <SharePanel
        model={{
          ...still,
          moment: format === 'postcard' ? 'world' : 'song',
          image,
          format: 'story',
          formats: [],
          frame: format === 'postcard' ? 'paper' : 'velvet',
          frames: FRAMES,
          framed: true,
          canHideTask: format === 'sleeve',
          pageOffered: true,
          linkOffered: false,
        }}
        actions={format === 'sleeve' ? { ...SHARE_ACTIONS, sound: nothing } : SHARE_ACTIONS}
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
