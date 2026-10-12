import { SHARE_FRAMES } from '@scootch/art';
import type { GuessMinutes } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { fixtureMonster, fixtureTask } from '../../../features/reveal/registry/keep-fixtures';
import { composeShareImage, type ShareDress } from '../../../features/share/share-image';
import { SharePanel } from '../../../features/share/share-panel';
import { cardDataFor } from '../../../features/zoo/zoo-cards';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;

export interface GuessedCard {
  /** What the person thought it would take, and what it took. */
  readonly guessMinutes: GuessMinutes;
  readonly catchMinutes: number;
  /** False is the composer after the person took the line off the picture. */
  readonly shown: boolean;
}

/**
 * The composer on the trading card of a catch that had a guess: a member wearing holo foil, the
 * line under the card's facts, and the switch that takes it off.
 */
export function GuessedCardPanel({ guess, language }: { guess: GuessedCard; language: Language }) {
  const monster = { ...fixtureMonster(0), catchMinutes: guess.catchMinutes };
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
          'card',
          card,
          { hideTask: false, language, guessMinutes: guess.shown ? guess.guessMinutes : null },
          dress,
        ),
        format: 'card',
        formats: ['story', 'card', 'stickers'],
        frame: 'holo',
        frames: SHARE_FRAMES.map((id) => ({ id, locked: false })),
        framesOpen: true,
        framed: false,
        hideTask: false,
        canHideTask: true,
        guess: guess.shown,
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
