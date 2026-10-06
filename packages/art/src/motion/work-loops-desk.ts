import type { WorkLoop } from './work-loop';

/**
 * The loops of the modes done at a desk or a screen. Each comment gives the design's own speed;
 * a value turns a whole number of times per loop, at that speed or slower.
 */
export const DESK_LOOPS = {
  // Envelopes fly at 0.55 a second.
  email: { seconds: 4, tracks: { fly: { kind: 'cycle', turns: 2 } } },
  // The hand crosses with sin(3.4t); the page fills at 0.25 a second.
  writing: {
    seconds: 4,
    tracks: { stroke: { kind: 'swing', turns: 2 }, written: { kind: 'cycle', turns: 1 } },
  },
  // A page turns at 0.3 a second; the head nods with sin(1.5t).
  reading: {
    seconds: 5,
    tracks: { turn: { kind: 'cycle', turns: 1 }, nod: { kind: 'swing', turns: 1 } },
  },
  // The hand scans with sin(2.6t), the highlight runs at 0.4 a second, the drop bobs with sin(3t).
  studying: {
    seconds: 5,
    tracks: {
      scan: { kind: 'swing', turns: 2 },
      marked: { kind: 'cycle', turns: 2 },
      sweat: { kind: 'swing', turns: 2 },
    },
  },
  // Braces drift up at 0.3 a second.
  coding: { seconds: 4, tracks: { rise: { kind: 'cycle', turns: 1 } } },
  // The mouth flaps 2.5 times a second, the hand moves with sin(3t), the body with sin(0.8t) and
  // the sound waves run at 1.6 a second.
  calling: {
    seconds: 8,
    tracks: {
      talk: { kind: 'pulse', turns: 3 },
      gesture: { kind: 'swing', turns: 3 },
      sway: { kind: 'swing', turns: 1 },
      ring: { kind: 'cycle', turns: 3 },
    },
  },
  // The thumbs tap with sin(14t); the bubbles rise at 0.45 a second.
  texting: {
    seconds: 4,
    tracks: { tap: { kind: 'swing', turns: 3 }, bubbles: { kind: 'cycle', turns: 1 } },
  },
  // The finger taps three times a second; receipts fall at 0.3 a second.
  money: {
    seconds: 4,
    tracks: { press: { kind: 'pulse', turns: 3 }, fall: { kind: 'cycle', turns: 1 } },
  },
  // One stamping every 1 / 1.1 seconds.
  paperwork: { seconds: 4, tracks: { stamp: { kind: 'cycle', turns: 3 } } },
  // The glass sweeps with sin(1.2t).
  research: { seconds: 6, tracks: { sweep: { kind: 'swing', turns: 1 } } },
  // A wave for about a fifth of every five seconds, the mouth once a second, a nod with sin(3t).
  meeting: {
    seconds: 5,
    tracks: {
      wave: { kind: 'window', from: 0.4, to: 0.62 },
      talk: { kind: 'pulse', turns: 3 },
      nod: { kind: 'swing', turns: 2 },
    },
  },
  // The bars grow over half of every five seconds, the mouth flaps twice a second, the pointer
  // moves with sin(2t).
  presenting: {
    seconds: 5,
    tracks: {
      grow: { kind: 'fill', turns: 1 },
      talk: { kind: 'pulse', turns: 3 },
      point: { kind: 'swing', turns: 1 },
    },
  },
  // The brush dabs with sin(3t) and sin(5t); the canvas fills every 1 / 0.12 seconds.
  designing: {
    seconds: 9,
    tracks: { dab: { kind: 'swing', turns: 3 }, painted: { kind: 'cycle', turns: 1 } },
  },
  // The body sways with sin(2t), each hand lifts with |sin(6t)|, notes rise at 0.4 a second.
  music: {
    seconds: 4,
    tracks: {
      sway: { kind: 'swing', turns: 1 },
      left: { kind: 'lift', turns: 3 },
      right: { kind: 'lift', turns: 2 },
      notes: { kind: 'cycle', turns: 1 },
    },
  },
} satisfies Record<string, WorkLoop>;
