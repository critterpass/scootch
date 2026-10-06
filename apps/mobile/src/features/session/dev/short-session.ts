/** How soon an armed session's timer comes due once its control is pressed. */
export const SHORT_SESSION_SECONDS = 3;

/** The extra control's words. Developer screens and controls are written in English only. */
export const DEVELOPER_END = {
  label: 'End soon',
  hint: 'Developer tools: time is up in a few seconds',
} as const;

let armed = false;

/**
 * Developer tools only. While armed, the session screen shows one extra control that ends the
 * running session's timer in a few seconds, for device flows. It can only be armed from the
 * developer tools screen, which the store app cannot open, and is forgotten when the app closes.
 */
export const shortSession = {
  isArmed: () => armed,
  arm: (on: boolean) => {
    armed = on;
  },
};
