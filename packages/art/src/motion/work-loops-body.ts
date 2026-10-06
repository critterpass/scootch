import type { WorkLoop } from './work-loop';

/**
 * The loops of the modes about the body and getting away. Each comment gives the design's own
 * speed; a value turns a whole number of times per loop, at that speed or slower.
 */
export const BODY_LOOPS = {
  // The arms pump with sin(9t); drops fly at 1.2 a second.
  exercise: {
    seconds: 4,
    tracks: { stride: { kind: 'swing', turns: 3 }, sweat: { kind: 'cycle', turns: 3 } },
  },
  // The bend follows sin(1.1t); sparkles drift at 0.25 a second.
  stretch: {
    seconds: 6,
    tracks: { bend: { kind: 'swing', turns: 1 }, sparkle: { kind: 'cycle', turns: 1 } },
  },
  // A breath with sin(1.2t); steam rises at 0.6 a second.
  selfcare: {
    seconds: 6,
    tracks: { breath: { kind: 'swing', turns: 1 }, steam: { kind: 'cycle', turns: 3 } },
  },
  // The eyes follow the route with sin(1.1t); the pin hops with |sin(4t)|.
  trip: {
    seconds: 6,
    tracks: { look: { kind: 'swing', turns: 1 }, hop: { kind: 'lift', turns: 3 } },
  },
  // A breath with sin(1.2t); steam rises at 0.5 a second.
  rest: {
    seconds: 6,
    tracks: { breath: { kind: 'swing', turns: 1 }, steam: { kind: 'cycle', turns: 3 } },
  },
} satisfies Record<string, WorkLoop>;
