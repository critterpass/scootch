import type { WorkLoop } from './work-loop';

/**
 * The loops of the chores around the home. Each comment gives the design's own
 * speed; a value turns a whole number of times per loop, as near that speed as the loop allows.
 * The typing hands of the laptop modes follow the clock of the working pose, not a value here.
 */
export const HOME_LOOPS = {
  // The sponge circles 1.1 times a second; suds rise at 0.6 a second.
  cleaning: {
    seconds: 10,
    tracks: {
      scrub: { kind: 'cycle', turns: 11 },
      bubbles: { kind: 'cycle', turns: 6 },
    },
  },
  // The duster flicks with sin(6t), dust puffs at 0.7 a second, a sneeze every 5.5 seconds.
  dusting: {
    seconds: 5.5,
    tracks: {
      flick: { kind: 'swing', turns: 5 },
      dust: { kind: 'cycle', turns: 4 },
      sneeze: { kind: 'window', from: 0.8, to: 0.95 },
    },
  },
  // The hands fold with sin(1.6t).
  laundry: {
    seconds: 4,
    tracks: {
      fold: { kind: 'sway01', turns: 1 },
    },
  },
  // The sponge circles 0.95 times a second, suds rise at 0.5 a second, the plate glints for the
  // last fifth of every 3.3 seconds.
  dishes: {
    seconds: 4,
    tracks: {
      scrub: { kind: 'cycle', turns: 4 },
      bubbles: { kind: 'cycle', turns: 2 },
      shine: { kind: 'window', from: 0.78, to: 0.98 },
    },
  },
  // The spoon turns 0.64 times a second; steam rises at 0.5 a second.
  cooking: {
    seconds: 8,
    tracks: {
      stir: { kind: 'cycle', turns: 5 },
      steam: { kind: 'cycle', turns: 4 },
    },
  },
  // A step with |sin(6t)|; the body rocks with sin(3t).
  groceries: {
    seconds: 4,
    tracks: {
      step: { kind: 'lift', turns: 8 },
      sway: { kind: 'swing', turns: 2 },
    },
  },
  // One toss every 1 / 0.55 seconds.
  decluttering: {
    seconds: 9,
    tracks: {
      toss: { kind: 'cycle', turns: 5 },
    },
  },
  // The tape is pulled every two seconds.
  parcel: {
    seconds: 4,
    tracks: {
      tape: { kind: 'cycle', turns: 2 },
    },
  },
  // One blow every 1 / 1.4 seconds.
  diy: {
    seconds: 5,
    tracks: {
      hammer: { kind: 'cycle', turns: 7 },
    },
  },
  // The leaves move with sin(2t); drops fall at 1.2 a second.
  plants: {
    seconds: 6,
    tracks: {
      sway: { kind: 'swing', turns: 2 },
      pour: { kind: 'cycle', turns: 7 },
    },
  },
  // The brush strokes with sin(4t), the tail wags with sin(8t), hearts rise at 0.5 a second.
  pets: {
    seconds: 8,
    tracks: {
      brush: { kind: 'swing', turns: 5 },
      wag: { kind: 'swing', turns: 10 },
      hearts: { kind: 'cycle', turns: 4 },
    },
  },
} satisfies Record<string, WorkLoop>;
