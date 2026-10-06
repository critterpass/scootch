/** The monster a launch-day email should carry, and its name for the line that follows. */
export type WaitlistMonster = { readonly id: string | null; readonly name: string | null };

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Wires one "tell me when it's out" form: one email field, one request, one line afterwards.
 * `monster` is asked only once the email looks right, so nothing is shared for a typo.
 */
export function startWaitlistForm(
  root: HTMLElement,
  monster: () => Promise<WaitlistMonster> = () => Promise.resolve({ id: null, name: null }),
): void {
  const form = root.querySelector('form');
  const input = root.querySelector<HTMLInputElement>('input[name="email"]');
  const error = root.querySelector<HTMLElement>('[data-waitlist-error]');
  const ask = root.querySelector<HTMLElement>('[data-waitlist-ask]');
  const done = root.querySelector<HTMLElement>('[data-waitlist-done]');
  if (!form || !input || !error || !ask || !done) return;
  let sending = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sending) return;
    const email = input.value.trim();
    error.textContent = '';
    if (!emailShape.test(email)) {
      error.textContent = root.dataset['badEmail'] ?? '';
      input.focus();
      return;
    }
    sending = true;
    void (async () => {
      try {
        const carried = await monster();
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            language: root.dataset['language'] ?? 'en',
            platform: root.dataset['platform'] ?? 'ios',
            monsterId: carried.id,
          }),
        });
        if (response.status === 400) {
          error.textContent = root.dataset['badEmail'] ?? '';
          return;
        }
        if (!response.ok) throw new Error('not listed');
        const line =
          carried.name === null
            ? (root.dataset['donePlain'] ?? '')
            : (root.dataset['done'] ?? '').replace('{name}', carried.name);
        done.textContent = line;
        ask.hidden = true;
        done.hidden = false;
        done.focus({ preventScroll: true });
      } catch {
        error.textContent = root.dataset['failed'] ?? '';
      } finally {
        sending = false;
      }
    })();
  });
}
