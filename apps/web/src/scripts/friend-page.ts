import { wireOpenInApp } from './open-in-app';
import { fetchShared, fill, idFromAddress, keepLanguageSwitchHere, showState } from './shared-page';

/** What `GET /v1/friend-invite/:code` answers with. `gone`: used or run out, naming nobody. */
export type FriendInvite = {
  readonly state: 'valid' | 'gone';
  readonly fromName: string | null;
};

/** Wires the friend link page: who it is from, and the way into the app with the code. */
export async function startFriendPage(root: HTMLElement): Promise<void> {
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const code = idFromAddress();
  keepLanguageSwitchHere('f', code);

  const invite = await fetchShared<FriendInvite>('friend-invite', code);
  if (invite === 'missing' || invite === 'offline') {
    showState(root, invite);
    return;
  }
  if (invite.state === 'valid') {
    const headline =
      invite.fromName === null
        ? (lines['headline'] ?? '')
        : fill(lines['headlineBy'] ?? '', { name: invite.fromName });
    const heading = root.querySelector<HTMLElement>('[data-headline]');
    if (heading) heading.textContent = headline;
    document.title = `${headline} · Scootch`;
    wireOpenInApp(root, code);
  }
  showState(root, invite.state);
}
