import type { WorkLoop } from './work-loop';

/**
 * The loops of the modes done at a desk or a screen. Each comment gives the design's own
 * speed; a value turns a whole number of times per loop, as near that speed as the loop allows.
 * The typing hands of the laptop modes follow the clock of the working pose, not a value here.
 */
export const DESK_LOOPS = {
  // Envelopes fly at 0.55 a second.
  email: {
    seconds: 9,
    tracks: {
      fly: { kind: 'cycle', turns: 5 },
    },
  },
  // The hand crosses with sin(3.4t); the page fills at 0.25 a second.
  writing: {
    seconds: 4,
    tracks: {
      stroke: { kind: 'swing', turns: 2 },
      written: { kind: 'cycle', turns: 1 },
    },
  },
  // A page turns at 0.3 a second; the head nods with sin(1.5t).
  reading: {
    seconds: 13,
    tracks: {
      turn: { kind: 'cycle', turns: 4 },
      nod: { kind: 'swing', turns: 3 },
    },
  },
  // The hand scans with sin(2.6t), the highlight runs at 0.4 a second, the drop bobs with sin(3t).
  studying: {
    seconds: 10,
    tracks: {
      scan: { kind: 'swing', turns: 4 },
      marked: { kind: 'cycle', turns: 4 },
      sweat: { kind: 'swing', turns: 5 },
    },
  },
  // Braces drift up at 0.3 a second.
  coding: {
    seconds: 10,
    tracks: {
      rise: { kind: 'cycle', turns: 3 },
    },
  },
  // The mouth flaps 2.5 times a second, the hand moves with sin(3t), the body with sin(0.8t) and
  // the sound waves run at 1.6 a second.
  calling: {
    seconds: 8,
    tracks: {
      talk: { kind: 'pulse', turns: 20 },
      gesture: { kind: 'swing', turns: 4 },
      sway: { kind: 'swing', turns: 1 },
      ring: { kind: 'cycle', turns: 13 },
    },
  },
  // The thumbs tap with sin(14t); the bubbles rise at 0.45 a second.
  texting: {
    seconds: 9,
    tracks: {
      tap: { kind: 'swing', turns: 20 },
      bubbles: { kind: 'cycle', turns: 4 },
    },
  },
  // The finger taps three times a second; receipts fall at 0.3 a second.
  money: {
    seconds: 10,
    tracks: {
      press: { kind: 'pulse', turns: 30 },
      fall: { kind: 'cycle', turns: 3 },
    },
  },
  // One stamping every 1 / 1.1 seconds.
  paperwork: {
    seconds: 10,
    tracks: {
      stamp: { kind: 'cycle', turns: 11 },
    },
  },
  // The glass sweeps with sin(1.2t).
  research: {
    seconds: 5,
    tracks: {
      sweep: { kind: 'swing', turns: 1 },
    },
  },
  // A wave for about a fifth of every five seconds, the mouth once a second, a nod with sin(3t).
  meeting: {
    seconds: 5,
    tracks: {
      wave: { kind: 'window', from: 0.4, to: 0.62 },
      talk: { kind: 'pulse', turns: 5 },
      nod: { kind: 'swing', turns: 2 },
    },
  },
  // The bars grow over half of every five seconds, the mouth flaps twice a second, the pointer
  // moves with sin(2t).
  presenting: {
    seconds: 6,
    tracks: {
      grow: { kind: 'fill', turns: 1 },
      talk: { kind: 'pulse', turns: 12 },
      point: { kind: 'swing', turns: 2 },
    },
  },
  // The brush dabs with sin(3t) and sin(5t); the canvas fills every 1 / 0.12 seconds.
  designing: {
    seconds: 8,
    tracks: {
      dab: { kind: 'swing', turns: 4 },
      painted: { kind: 'cycle', turns: 1 },
    },
  },
  // The body sways with sin(2t) and bounces with |sin(4t)|, each hand lifts with |sin(6t)|, notes
  // rise at 0.4 a second.
  music: {
    seconds: 10,
    tracks: {
      sway: { kind: 'swing', turns: 3 },
      bounce: { kind: 'lift', turns: 13 },
      left: { kind: 'lift', turns: 19 },
      right: { kind: 'lift', turns: 18 },
      notes: { kind: 'cycle', turns: 4 },
    },
  },
} satisfies Record<string, WorkLoop>;
