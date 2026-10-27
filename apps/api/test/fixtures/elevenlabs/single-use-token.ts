/**
 * ElevenLabs' answers to `POST /v1/single-use-token/realtime_scribe`, recorded on 27 Oct 2026.
 * The minted token (34 characters, starting `sutkn`) and the refusal's request id are replaced;
 * nothing else is changed.
 */
export const recordedToken = { token: 'sutkn_recorded_0000000000000000000' };

/** The answer to a key ElevenLabs does not know, with status 401. */
export const recordedRefusal = {
  detail: {
    type: 'authentication_error',
    code: 'unauthorized',
    message: 'Invalid API key',
    status: 'invalid_api_key',
    request_id: 'recorded',
  },
};
