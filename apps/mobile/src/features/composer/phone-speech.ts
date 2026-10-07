import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';

import { speechTokenResponseSchema, type Language } from '@scootch/domain';

import { appHttp } from '../../api/app-http';

import { appSpeech } from './app-speech';
import { cloudSpeech } from './cloud-speech';
import { speechPermission, type SpeechPort } from './speech';
import { speechTokens } from './speech-tokens';

/** A pass is small and quick to issue; past this the phone listens by itself instead. */
const SPEECH_TOKEN_TIMEOUT_MS = 4000;

// Unknown until the phone has said; a recording that then cannot reach ElevenLabs falls back.
let reachable: boolean | null = null;
let watching = false;

function phoneOnline(): boolean {
  if (!watching) {
    watching = true;
    const read = (network: NetworkState) => {
      reachable = network.isInternetReachable ?? network.isConnected ?? null;
    };
    addNetworkStateListener(read);
    void getNetworkStateAsync()
      .then(read)
      .catch(() => undefined);
  }
  return reachable ?? true;
}

export interface PhoneSpeechOptions {
  /** The phone's own recognition, which listens when the phone is offline. */
  readonly onDevice: SpeechPort;
  /** The language a phone that has never called the API registers with. */
  readonly language: () => Language;
  /** Whether a recording plays alongside other apps' sound instead of stopping it. */
  readonly mixes?: boolean;
}

/** Speech on the real phone: ElevenLabs when online, the phone's own recognition when not. */
export function phoneSpeech({ onDevice, language, mixes = false }: PhoneSpeechOptions): SpeechPort {
  const http = appHttp(language);
  const tokens = speechTokens(() =>
    http.post('/v1/speech-token', {}, (json) => speechTokenResponseSchema.parse(json).token, {
      timeoutMs: SPEECH_TOKEN_TIMEOUT_MS,
    }),
  );
  // Asked once here so the answer is already known when the first recording starts.
  phoneOnline();
  return appSpeech({
    cloud: cloudSpeech({ tokens, mixes }),
    onDevice,
    permission: speechPermission,
    online: phoneOnline,
  });
}
