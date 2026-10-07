import type { WorkLoop } from './work-loop';

/**
 * The loops of the modes about the body and getting away. Each comment gives the design's own
 * speed; a value turns a whole number of times per loop, as near that speed as the loop allows.
 * The typing hands of the laptop modes follow the clock of the working pose, not a value here.
 */
export const BODY_LOOPS = {
  // The arms pump with sin(9t), which lifts the feet 2.9 times a second; drops fly at 1.2 a second.
  exercise: {
    seconds: 7,
    tracks: {
      stride: { kind: 'swing', turns: 10 },
      sweat: { kind: 'cycle', turns: 8 },
    },
  },
  // The bend follows sin(1.1t); sparkles drift at 0.25 a second.
  stretch: {
    seconds: 12,
    tracks: {
      bend: { kind: 'swing', turns: 2 },
      sparkle: { kind: 'cycle', turns: 3 },
    },
  },
  // A breath with sin(1.2t); steam rises at 0.6 a second.
  selfcare: {
    seconds: 5,
    tracks: {
      breath: { kind: 'swing', turns: 1 },
      steam: { kind: 'cycle', turns: 3 },
    },
  },
  // The eyes follow the route with sin(1.1t); the pin hops with |sin(4t)|.
  trip: {
    seconds: 11,
    tracks: {
      look: { kind: 'swing', turns: 2 },
      hop: { kind: 'lift', turns: 14 },
    },
  },
  // A breath with sin(1.2t); steam rises at 0.4 a second. The letters drift with the clock.
  rest: {
    seconds: 10,
    tracks: {
      breath: { kind: 'swing', turns: 2 },
      steam: { kind: 'cycle', turns: 4 },
    },
  },
} satisfies Record<string, WorkLoop>;
