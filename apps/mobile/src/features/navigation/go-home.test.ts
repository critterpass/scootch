import { describe, expect, it } from '@jest/globals';

import { goHome } from './go-home';

function fakeRouter(stack: string[]) {
  const calls: string[] = [];
  return {
    calls,
    canGoBack: () => stack.length > 1,
    dismissTo: (href: string) => void calls.push(`dismissTo ${href}`),
    replace: (href: string) => void calls.push(`replace ${href}`),
  };
}

describe('going home from a screen over the one screen', () => {
  it('goes back to the one screen that is there instead of making a second one', () => {
    const router = fakeRouter(['/', '/settings', '/account']);
    goHome(router);
    expect(router.calls).toEqual(['dismissTo /']);
  });

  it('becomes the one screen when nothing is under it', () => {
    const router = fakeRouter(['/f/abc']);
    goHome(router);
    expect(router.calls).toEqual(['replace /']);
  });
});
