import { useEffect, useRef } from 'react';

import { useDispatch, useSurfaceRequestState } from './day-store-provider';
import type { SurfaceRequest } from './day-types';
import { createRequestTaker, type RequestOf } from './surface-actions';

/**
 * What a control, the Action button or a widget asked this screen to do. While `ready`, `act` runs
 * once for each request of the screen's kind, and the store is told it was taken so it is cleared.
 */
export function useSurfaceRequest<K extends SurfaceRequest['kind']>(
  kind: K,
  ready: boolean,
  act: (request: RequestOf<K>) => void,
): void {
  const request = useSurfaceRequestState();
  const dispatch = useDispatch();
  const take = useRef(createRequestTaker(kind)).current;
  const acting = useRef(act);
  acting.current = act;
  useEffect(() => {
    if (!ready) return;
    const mine = take(request);
    if (mine === null) return;
    acting.current(mine);
    void dispatch({ type: 'surface_request_taken' }).catch(() => undefined);
  }, [request, ready, take, dispatch]);
}
