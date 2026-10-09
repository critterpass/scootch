import { createContext } from 'react';

/**
 * The number a registry capture draws in the session's footer, in place of the phone's own: a
 * number, or `null` for no line. Unset, the footer shows what the phone last read. Kept apart from
 * the footer so the registry can name it without loading a screen.
 */
export const OthersHuntingFixed = createContext<number | null | undefined>(undefined);
