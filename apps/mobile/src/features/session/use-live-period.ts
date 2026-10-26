import { useEffect, useRef } from 'react';

import { nativeLiveActivity } from '../../effects/native-adapters';

/**
 * The period on the Lock Screen and the Dynamic Island, through the Live Activity module already
 * in the build: the task, the time left and his line. It starts once per period and ends when
 * the period does. His face at the current pressure and the burning fuse need fields the native
 * activity does not have yet; they arrive with the surfaces' native batch, and this is where they
 * are passed in.
 */
export function useLivePeriod(
  period: { readonly id: string; readonly taskId: string; readonly endsAt: number } | null,
  title: string,
  line: string,
): void {
  const started = useRef<string | null>(null);
  const id = period?.id ?? null;
  const endsAt = period?.endsAt ?? null;
  const taskId = period?.taskId ?? null;

  useEffect(() => {
    if (id === null || endsAt === null || taskId === null) {
      if (started.current !== null) {
        started.current = null;
        void nativeLiveActivity.end().catch(() => undefined);
      }
      return;
    }
    if (started.current === id) {
      void nativeLiveActivity.update({ endsAt, line }).catch(() => undefined);
      return;
    }
    started.current = id;
    void nativeLiveActivity.start({ title, taskId, endsAt, line }).catch(() => undefined);
  }, [id, endsAt, taskId, title, line]);
}
