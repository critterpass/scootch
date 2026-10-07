import { describe, expect, it } from '@jest/globals';

import { addDays } from '@scootch/domain';
import { t as translate, type Language } from '@scootch/i18n';

import type { Translate } from '../../i18n/i18n-provider';
import { FIXTURE_MONDAY, fixtureMonsters, fixturePieces } from '../reveal/registry/keep-fixtures';

import { lighthousePiece } from './landmarks';
import {
  arrivedToday,
  offerMayShow,
  worldAge,
  worldDay,
  worldSentence,
  worldSubtitle,
} from './world-words';

const say =
  (language: Language): Translate =>
  (key, ...params) =>
    translate(language, key, ...params);
const en = say('en');
const names = (count: number) =>
  new Map(fixtureMonsters(count).map((monster) => [monster.id, monster]));

describe('the line under the title', () => {
  it('carries the age of the world and how many things live there', () => {
    const one = fixturePieces(1);
    expect(worldSubtitle(en, one, FIXTURE_MONDAY)).toBe('Day 1 · one thing lives here');
    expect(worldSubtitle(en, fixturePieces(3), addDays(FIXTURE_MONDAY, 2))).toBe(
      'Day 3 · three things live here',
    );
    expect(worldSubtitle(en, fixturePieces(5), addDays(FIXTURE_MONDAY, 5))).toBe(
      'Day 6 · 5 things live here',
    );
    expect(worldSubtitle(en, fixturePieces(8), addDays(FIXTURE_MONDAY, 7))).toBe(
      'Week 1 · 8 things',
    );
    expect(worldSubtitle(en, fixturePieces(71), addDays(FIXTURE_MONDAY, 95))).toBe(
      'Month 3 · 71 things',
    );
    expect(worldSubtitle(say('vi'), one, FIXTURE_MONDAY)).toBe('Ngày 1 · một thứ đang sống ở đây');
    expect(worldSubtitle(say('vi'), fixturePieces(8), addDays(FIXTURE_MONDAY, 7))).toBe(
      'Tuần 1 · 8 thứ',
    );
  });

  it('counts from the day the first piece landed, and never counts a landmark', () => {
    const pieces = [...fixturePieces(1), lighthousePiece('2020-01-01')];
    expect(worldAge(pieces, FIXTURE_MONDAY)).toEqual({ unit: 'day', count: 1 });
    expect(worldAge(pieces, addDays(FIXTURE_MONDAY, 13))).toEqual({ unit: 'week', count: 2 });
    expect(worldAge(pieces, addDays(FIXTURE_MONDAY, 29))).toEqual({ unit: 'month', count: 1 });
    expect(worldSubtitle(en, pieces, FIXTURE_MONDAY)).toBe('Day 1 · one thing lives here');
  });

  it('says so when nobody lives there yet', () => {
    expect(worldSubtitle(en, [], FIXTURE_MONDAY)).toBe('Nobody lives here yet');
    expect(worldSubtitle(en, [lighthousePiece(FIXTURE_MONDAY)], FIXTURE_MONDAY)).toBe(
      'Nobody lives here yet',
    );
    expect(worldDay([], undefined)).toBeNull();
  });
});

describe("Scootch's sentence under the world", () => {
  it('names the monster that moved in today', () => {
    expect(worldSentence(en, fixturePieces(1), names(1), FIXTURE_MONDAY)).toBe(
      'Molar moved in today. Shy, but staying.',
    );
    expect(worldSentence(say('vi'), fixturePieces(1), names(1), FIXTURE_MONDAY)).toBe(
      'Molar vừa dọn vào hôm nay. Hơi nhát, nhưng sẽ ở lại.',
    );
  });

  it('is a plain line about the place on a day when nothing moved in', () => {
    const later = addDays(FIXTURE_MONDAY, 40);
    expect(worldSentence(en, [], names(0), later)).toBe(
      'Nothing lives here yet. The first thing you finish moves in.',
    );
    expect(worldSentence(en, fixturePieces(1), names(1), later)).toBe(
      'One thing lives here now. It is staying.',
    );
    expect(worldSentence(en, fixturePieces(8), names(8), later)).toBe(
      'A little village is forming near the hill.',
    );
    expect(worldSentence(en, fixturePieces(20), names(20), later)).toBe(
      'It is getting busy out here. Nobody is leaving.',
    );
    expect(worldSentence(en, fixturePieces(60), names(60), later)).toBe(
      'A whole town now. Everyone is asleep.',
    );
  });

  it('does not name or joke about a quiet piece that landed today', () => {
    // The seventh fixture piece is a quiet one, and it lands on the third day.
    const pieces = fixturePieces(7);
    const today = addDays(FIXTURE_MONDAY, 2);
    expect(arrivedToday(pieces, names(7), today)?.kind).toBe('plain');
    expect(worldSentence(en, pieces, names(7), today)).toBe(
      'A little village is forming near the hill.',
    );
  });

  it('lands a piece only on the day it arrived', () => {
    const pieces = fixturePieces(1);
    expect(arrivedToday(pieces, names(1), FIXTURE_MONDAY)?.id).toBe('fixture-piece-0000');
    expect(arrivedToday(pieces, names(1), addDays(FIXTURE_MONDAY, 1))).toBeNull();
    expect(arrivedToday(pieces, names(1), null)).toBeNull();
  });
});

describe('a heavy day in the world', () => {
  it('draws nothing about Plus', () => {
    expect(offerMayShow({ heavy: true })).toBe(false);
    expect(offerMayShow({ heavy: false })).toBe(true);
    expect(offerMayShow({})).toBe(true);
  });
});
