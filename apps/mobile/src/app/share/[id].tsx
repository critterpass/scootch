import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ShareSheet } from '../../features/share/share-sheet';
import { useShareOffer } from '../../features/share/use-share-offer';
import { goBack } from '../../ui/motion/go-back';

/**
 * The share sheet for one finished task, as the system's page sheet over the screen it was
 * opened from. A sheet cannot be the only screen of the stack, so opened by a link with nothing
 * underneath it first puts the desk down and opens itself again over it.
 */
export default function ShareRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const taskId = typeof id === 'string' ? id : '';
  const [alone] = useState(() => !router.canGoBack());
  const offer = useShareOffer(taskId);

  useEffect(() => {
    if (!alone) return;
    router.replace('/');
    // Replacing unmounts this screen, so the reopening is not cancelled with it.
    setTimeout(() => router.push({ pathname: '/share/[id]', params: { id: taskId } }), 0);
  }, [alone, router, taskId]);

  if (alone) return null;
  return <ShareSheet offer={offer} onClose={() => goBack(router, '/')} framed={false} />;
}
