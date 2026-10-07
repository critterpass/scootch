/** How long the app has to come to the front before the page gives up and goes to the store. */
const appOpensWithinMs = 1500;

/**
 * Wires a page's way into the app for one code: the button opens `<scheme>://<kind>/<code>` and,
 * if the page is still in front a moment later (no app took the link), goes to the App Store.
 * The code is written out beside a copy button, for pasting into the app by hand.
 */
export function wireOpenInApp(page: HTMLElement, code: string): void {
  for (const root of page.querySelectorAll<HTMLElement>('[data-open-in-app]')) {
    const { kind = '', scheme = '', store = '' } = root.dataset;
    const open = root.querySelector<HTMLAnchorElement>('[data-open]');
    const appLink = `${scheme}://${kind}/${encodeURIComponent(code)}`;
    if (open) {
      open.dataset['appLink'] = appLink;
      open.addEventListener('click', (event) => {
        event.preventDefault();
        const toStore = setTimeout(() => {
          if (document.visibilityState === 'visible') location.assign(store);
        }, appOpensWithinMs);
        addEventListener('pagehide', () => clearTimeout(toStore), { once: true });
        location.assign(appLink);
      });
    }

    const shown = root.querySelector<HTMLElement>('[data-code]');
    if (shown) shown.textContent = code;
    const copied = root.querySelector<HTMLElement>('[data-copied]');
    root.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', () => {
      void navigator.clipboard
        .writeText(code)
        .then(() => true)
        .catch(() => false)
        .then((done) => {
          if (copied) copied.hidden = !done;
          // Where copying is refused, the code is selected so the reader can copy it themselves.
          if (!done && shown) getSelection()?.selectAllChildren(shown);
        });
    });
  }
}
