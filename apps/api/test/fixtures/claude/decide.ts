/**
 * Claude Haiku 5.5 at low effort, recorded from the Anthropic API on 27 Oct 2026:
 * the decision fallback, asked the screen question about "Renew my passport before the trip".
 * The message id is replaced; nothing else is changed.
 */
export const recorded = {
  model: 'claude-haiku-5-5',
  id: 'msg_recorded',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '{"probabilities":{"pass":0.97,"serious":0.02,"crisis":0.01}}',
    },
  ],
  container: null,
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 891,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_5m_input_tokens: 0,
      ephemeral_1h_input_tokens: 0,
    },
    output_tokens: 36,
    output_tokens_details: {
      thinking_tokens: 0,
    },
    service_tier: 'standard',
    inference_geo: 'global',
    speed: 'standard',
  },
  diagnostics: null,
};
