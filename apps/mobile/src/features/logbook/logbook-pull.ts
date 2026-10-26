import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * How far the logbook page has come down over the board: 0 tucked away above it, 1 covering it.
 * The board writes it while a finger pulls its header; the logbook route takes it from there, so
 * the page never jumps when the route opens or closes under the finger.
 */
export const logbookPull: SharedValue<number> = makeMutable(0);
