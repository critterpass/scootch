/**
 * Claude Haiku 5.5 at low effort, recorded from the Anthropic API on 28 Oct 2026: one utterance
 * heard as tasks, with the system prompt in `src/ai/hearing-tasks.ts`. The message ids are
 * replaced; nothing else is changed.
 */

/** One long task said with filler and pauses. */
export const oneTaskEnglish = {
  said: 'Uhm. We need... Evaluation for Gemini replacement.',
  response: {
    model: 'claude-haiku-5-5',
    id: 'msg_recorded',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: '{"tasks":[{"text":"Evaluation for Gemini replacement","short":"Gemini replacement eval"}]}',
      },
    ],
    container: null,
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1089,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 0,
      },
      output_tokens: 44,
      output_tokens_details: {
        thinking_tokens: 0,
      },
      service_tier: 'standard',
      inference_geo: 'global',
      speed: 'standard',
    },
    diagnostics: null,
  },
};

/** Three tasks joined by "and also" and "then I have to". */
export const threeTasksEnglish = {
  said: 'Um, I need to call the dentist, and also pay the electricity bill. Then I have to pick up the kids at three.',
  response: {
    model: 'claude-haiku-5-5',
    id: 'msg_recorded',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: '{"tasks":[{"text":"call the dentist","short":"Call dentist"},{"text":"pay the electricity bill","short":"Pay electricity bill"},{"text":"pick up the kids at three","short":"Pick up kids"}]}',
      },
    ],
    container: null,
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1104,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 0,
      },
      output_tokens: 84,
      output_tokens_details: {
        thinking_tokens: 0,
      },
      service_tier: 'standard',
      inference_geo: 'global',
      speed: 'standard',
    },
    diagnostics: null,
  },
};

/** One long task in Vietnamese, with ờ, thì là, kiểu and trailing dots. */
export const oneTaskVietnamese = {
  said: 'Ờ. Thì là… mình cần, kiểu, làm cái đánh giá… cho việc thay Gemini.',
  response: {
    model: 'claude-haiku-5-5',
    id: 'msg_recorded',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: '{"tasks":[{"text":"làm cái đánh giá cho việc thay Gemini","short":"Đánh giá thay Gemini"}]}',
      },
    ],
    container: null,
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1108,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 0,
      },
      output_tokens: 53,
      output_tokens_details: {
        thinking_tokens: 0,
      },
      service_tier: 'standard',
      inference_geo: 'global',
      speed: 'standard',
    },
    diagnostics: null,
  },
};
