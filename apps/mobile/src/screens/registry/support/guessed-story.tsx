import { SHARE_FRAMES } from '@scootch/art';
import type { GuessMinutes } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { fixtureMonster, fixtureTask } from '../../../features/reveal/registry/keep-fixtures';
import { composeShareImage, type ShareDress } from '../../../features/share/share-image';
import { SharePanel } from '../../../features/share/share-panel';
import { cardDataFor } from '../../../features/zoo/zoo-cards';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;

export interface GuessedStory {
  /** What the person thought it would take, and what it took. */
  readonly guessMinutes: GuessMinutes;
  readonly catchMinutes: number;
  /** False is the composer after the person took the line off the picture. */
  readonly shown: boolean;
}

/**
 * The composer on the story of a catch that had a guess: a member wearing holo foil, the line
 * under the story's sentence, and the switch that takes it off.
 */
export function GuessedStoryPanel({
  story,
  language,
}: {
  story: GuessedStory;
  language: Language;
}) {
  const monster = { ...fixtureMonster(0), catchMinutes: story.catchMinutes };
  const card = cardDataFor(monster, fixtureTask(0, language));
  const dress: ShareDress = {
    finish: 'holo',
    member: 42,
    plus: true,
    day: null,
    month: null,
    frame: 'holo',
  };
  return (
    <SharePanel
      model={{
        moment: 'caught',
        image: composeShareImage(
          'story',
          card,
          { hideTask: false, language, guessMinutes: story.shown ? story.guessMinutes : null },
          dress,
        ),
        format: 'story',
        formats: ['story', 'card', 'stickers'],
        frame: 'holo',
        frames: SHARE_FRAMES.map((id) => ({ id, locked: false })),
        framesOpen: true,
        framed: true,
        hideTask: false,
        canHideTask: true,
        guess: story.shown,
        language,
        notice: null,
        pageUp: false,
        pageOffered: true,
        linkOffered: true,
      }}
      actions={{
        close: nothing,
        setFormat: nothing,
        setFrame: nothing,
        setHideTask: nothing,
        setGuess: nothing,
        share: nothing,
        unshare: nothing,
        save: nothing,
        copyLink: nothing,
      }}
    />
  );
}
