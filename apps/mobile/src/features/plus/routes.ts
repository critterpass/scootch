import type { Href } from 'expo-router';

// The routes of Plus, reached by name. The sheet is the only place anything is sold, and it is
// opened by a tap on a locked control, on "Tell me" or on the manage page, and by nothing else.

export const PLUS_SHEET = '/plus' as Href;
/** The sheet opened from "One more": Scootch's line fits the moment. */
export const PLUS_SHEET_ONE_MORE = '/plus?from=one-more' as Href;
export const PLUS_MANAGE = '/plus/manage' as Href;
export const PLUS_TRIAL_STARTED = '/plus/trial-started' as Href;
export const PLUS_LAST_DAY = '/plus/last-day' as Href;
export const PLUS_RENEWAL_OFF = '/plus/renewal-off' as Href;
export const PLUS_CANCELLED = '/plus/renewal-off?after=cancel' as Href;
export const PLUS_LIFETIME = '/plus/lifetime' as Href;
export const PLUS_RECORDS = '/plus/records' as Href;
export const SHELF_ROUTE = '/shelf' as Href;
