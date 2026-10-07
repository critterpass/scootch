import { z } from 'zod';

/**
 * speech.token: a pass the phone opens one live transcription with. It works once and for a few
 * minutes, so the provider's own key never leaves the server.
 */
export const speechTokenResponseSchema = z.object({ token: z.string().min(1) });
export type SpeechTokenResponse = z.infer<typeof speechTokenResponseSchema>;
