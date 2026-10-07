import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PURCHASE_STATES, hasPlus } from '../entitlements';

import {
  FREE_CAMERA_TRIES,
  NO_CAMERA_TRIES,
  asksBeforeReading,
  cameraAccess,
  consentAfter,
  maySendWords,
  triesAfter,
  type CameraConsent,
  type CameraConsentEvent,
  type CameraReadOutcome,
} from './access';
import { deskFamily, readDesk } from './desk';
import { CAMERA_MODES, ON_PHONE_MODES, SENT_MODES } from './modes';
import { ZONE_LETTERS, biggerZone, readRoom } from './room';
import type { Box, FoundThing } from './things';

function thing(id: string, box: Box, ...labels: string[]): FoundThing {
  return { id, box, labels };
}

const anyBox: fc.Arbitrary<Box> = fc
  .tuple(
    fc.double({ min: 0, max: 0.9, noNaN: true }),
    fc.double({ min: 0, max: 0.9, noNaN: true }),
    fc.double({ min: 0.01, max: 0.1, noNaN: true }),
    fc.double({ min: 0.01, max: 0.1, noNaN: true }),
  )
  .map(([x, y, w, h]) => [x, y, w, h] as const);
const anyLabel = fc.constantFrom('mug', 'cable', 'paper', 'laptop', 'desk', 'blob', 'Cup');
const anyThings = fc
  .array(fc.tuple(anyBox, fc.array(anyLabel, { maxLength: 2 })), { maxLength: 12 })
  .map((rows) => rows.map(([box, labels], index) => thing(`t${index}`, box, ...labels)));

describe('Desk: the one thing that leaves fastest', () => {
  const mug = thing('mug', [0.6, 0.5, 0.12, 0.12], 'mug');
  const papers = thing('papers', [0.1, 0.3, 0.4, 0.4], 'paper');
  const cable = thing('cable', [0.5, 0.1, 0.3, 0.05], 'cable');
  const laptop = thing('laptop', [0.3, 0.3, 0.2, 0.2], 'laptop');

  it('rings the mug on the desk the board draws, and fades the rest', () => {
    const read = readDesk([papers, mug, cable, laptop]);
    expect(read).toEqual({ kind: 'step', thing: mug, others: [cable, papers] });
  });

  it('takes what goes in one hand before what is small, and what is small before paper', () => {
    const tinyPen = thing('pen', [0.2, 0.2, 0.02, 0.02], 'pen');
    expect(readDesk([tinyPen, mug])).toMatchObject({ thing: mug });
    expect(readDesk([papers, tinyPen])).toMatchObject({ thing: tinyPen });
  });

  it('takes the smaller of two alike, then the one nearer the edge', () => {
    const bigMug = thing('big', [0.4, 0.4, 0.2, 0.2], 'mug');
    expect(readDesk([bigMug, mug])).toMatchObject({ thing: mug });
    const centre = thing('centre', [0.45, 0.45, 0.1, 0.1], 'cup');
    const edge = thing('edge', [0.02, 0.45, 0.1, 0.1], 'cup');
    expect(readDesk([centre, edge])).toMatchObject({ thing: edge });
  });

  it('reads the first label that names a family, whatever its case', () => {
    expect(deskFamily(['Object', ' Mug '])).toBe('carried');
    expect(deskFamily(['thingamajig'])).toBe('unnamed');
    expect(deskFamily([])).toBe('unnamed');
  });

  it('picks a thing nobody can name before leaving the user with nothing', () => {
    const blob = thing('blob', [0.2, 0.2, 0.1, 0.1]);
    expect(readDesk([laptop, blob])).toEqual({ kind: 'step', thing: blob, others: [] });
  });

  it('has nothing to start with on an empty desk or one holding only what belongs there', () => {
    expect(readDesk([])).toEqual({ kind: 'nothing' });
    expect(readDesk([laptop, thing('lamp', [0.8, 0.1, 0.1, 0.3], 'lamp')])).toEqual({
      kind: 'nothing',
    });
  });

  it('always rings one of the things it was given, never one that belongs on a desk', () => {
    fc.assert(
      fc.property(anyThings, (things) => {
        const read = readDesk(things);
        if (read.kind === 'nothing') {
          return things.every((each) => deskFamily(each.labels) === 'fixed');
        }
        return (
          things.includes(read.thing) &&
          deskFamily(read.thing.labels) !== 'fixed' &&
          !read.others.includes(read.thing)
        );
      }),
    );
  });
});

describe('Room: the smallest corner', () => {
  const inA = thing('a1', [0.1, 0.1, 0.1, 0.1]);
  const inB = [thing('b1', [0.6, 0.1, 0.1, 0.1]), thing('b2', [0.8, 0.2, 0.1, 0.1])];
  const inC = thing('c1', [0.1, 0.7, 0.05, 0.05]);
  const inD = [0, 1, 2].map((n) => thing(`d${n}`, [0.6 + n * 0.1, 0.7, 0.05, 0.05]));

  it('hands over the corner with the least in it, the less covered of two alike first', () => {
    const read = readRoom([inA, ...inB, inC, ...inD]);
    expect(read).toMatchObject({ kind: 'step', order: ['C', 'A', 'B', 'D'] });
  });

  it('draws all four corners and never offers an empty one', () => {
    const read = readRoom([...inD, inA]);
    expect(read.kind === 'step' && read.zones.map((zone) => zone.letter)).toEqual([
      ...ZONE_LETTERS,
    ]);
    expect(read).toMatchObject({ order: ['A', 'D'] });
  });

  it('steps to a bigger zone until there is none', () => {
    const order = ['C', 'A', 'D'] as const;
    expect(biggerZone(order, 'C')).toBe('A');
    expect(biggerZone(order, 'D')).toBeNull();
    expect(biggerZone(order, 'B')).toBeNull();
  });

  it('has nothing to hand over in an empty room', () => {
    expect(readRoom([])).toEqual({ kind: 'nothing' });
  });

  it('puts every thing in exactly one corner, inside the photo', () => {
    fc.assert(
      fc.property(anyThings, (things) => {
        const read = readRoom(things);
        if (read.kind === 'nothing') return things.length === 0;
        const placed = read.zones.flatMap((zone) => zone.things);
        return (
          placed.length === things.length &&
          read.zones.every(
            ({ box: [x, y, w, h] }) => x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1,
          ) &&
          read.order.every(
            (letter) => read.zones.find((zone) => zone.letter === letter)!.things.length > 0,
          )
        );
      }),
    );
  });
});

describe('Paper and Screen: Plus, with one free try of each', () => {
  it('sorts the four modes into read on the phone and sent', () => {
    expect([...ON_PHONE_MODES, ...SENT_MODES].sort()).toEqual([...CAMERA_MODES].sort());
  });

  it.each(PURCHASE_STATES)('%s: Desk and Room are open, whatever was tried', (purchase) => {
    for (const mode of ON_PHONE_MODES) {
      expect(cameraAccess(mode, purchase, { paper: 9, screen: 9 })).toBe('open');
    }
  });

  it.each(PURCHASE_STATES)('%s: one free try of each, then locked without Plus', (purchase) => {
    for (const mode of SENT_MODES) {
      const used = { ...NO_CAMERA_TRIES, [mode]: FREE_CAMERA_TRIES };
      expect(cameraAccess(mode, purchase, NO_CAMERA_TRIES)).toBe(
        hasPlus(purchase) ? 'open' : 'free_try',
      );
      expect(cameraAccess(mode, purchase, used)).toBe(hasPlus(purchase) ? 'open' : 'locked');
    }
  });

  it('keeps the two tries apart: using Paper leaves Screen to try', () => {
    const tries = triesAfter(NO_CAMERA_TRIES, 'paper', 'free', 'step');
    expect(tries).toEqual({ paper: 1, screen: 0 });
    expect(cameraAccess('paper', 'free', tries)).toBe('locked');
    expect(cameraAccess('screen', 'free', tries)).toBe('free_try');
  });

  it.each(['unreadable', 'failed', 'not_allowed'] as const satisfies readonly CameraReadOutcome[])(
    'a read that ended %s costs nothing',
    (outcome) => {
      expect(triesAfter(NO_CAMERA_TRIES, 'screen', 'free', outcome)).toBe(NO_CAMERA_TRIES);
    },
  );

  it('counts nothing for Desk, Room or a user with Plus, so a lapsed trial still has its tries', () => {
    expect(triesAfter(NO_CAMERA_TRIES, 'desk', 'free', 'step')).toBe(NO_CAMERA_TRIES);
    const afterTrial = triesAfter(NO_CAMERA_TRIES, 'paper', 'trial', 'step');
    expect(cameraAccess('paper', 'expired', afterTrial)).toBe('free_try');
  });
});

describe('asking before anything is sent', () => {
  const anyConsent = fc.constantFrom<CameraConsent>('not_given', 'given');
  const anyEvent = fc.constantFrom<CameraConsentEvent>(
    'read_it',
    'not_now',
    'switched_on',
    'switched_off',
  );

  it('asks before the first Paper or Screen read and never for Desk or Room', () => {
    expect(SENT_MODES.map((mode) => asksBeforeReading(mode, 'not_given'))).toEqual([true, true]);
    expect(SENT_MODES.map((mode) => asksBeforeReading(mode, 'given'))).toEqual([false, false]);
    expect(ON_PHONE_MODES.map((mode) => asksBeforeReading(mode, 'not_given'))).toEqual([
      false,
      false,
    ]);
  });

  it('"Not now" sends nothing and the sheet comes back next time', () => {
    const consent = consentAfter('not_given', 'not_now');
    expect(maySendWords('paper', consent)).toBe(false);
    expect(asksBeforeReading('paper', consent)).toBe(true);
  });

  it('the switch in Privacy and data takes consent away again', () => {
    expect(consentAfter(consentAfter('not_given', 'read_it'), 'switched_off')).toBe('not_given');
  });

  it('sends nothing, in any mode, after any history that does not end in a yes', () => {
    fc.assert(
      fc.property(fc.array(anyEvent), fc.constantFrom(...CAMERA_MODES), (events, mode) => {
        const consent = events.reduce(consentAfter, 'not_given' as CameraConsent);
        const lastAnswer = events.filter((event) => event !== 'not_now').at(-1);
        const saidYes = lastAnswer === 'read_it' || lastAnswer === 'switched_on';
        return maySendWords(mode, consent) === (saidYes && SENT_MODES.includes(mode as never));
      }),
    );
    fc.assert(
      fc.property(anyConsent, (consent) => !ON_PHONE_MODES.some((m) => maySendWords(m, consent))),
    );
  });
});
