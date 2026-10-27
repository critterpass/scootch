/**
 * Messages from ElevenLabs Scribe Realtime (`scribe_v2_realtime`, `pcm_16000`, `commit_strategy=vad`,
 * no language named), recorded on 27 Oct 2026 by streaming a spoken clip in 100 ms chunks at the
 * pace it was said. The session ids are replaced; nothing else is changed.
 */

const started = (language: string) =>
  JSON.stringify({
    message_type: 'session_started',
    session_id: `recorded-${language}`,
    config: {
      sample_rate: 16000,
      audio_format: 'pcm_16000',
      language_code: null,
      secondary_languages: [],
      timestamps_granularity: 'word',
      vad_commit_strategy: true,
      vad_silence_threshold_secs: 1.5,
      vad_threshold: 0.4,
      min_speech_duration_ms: 100,
      min_silence_duration_ms: 100,
      max_tokens_to_recompute: 5,
      model_id: 'scribe_v2_realtime',
      disable_logging: false,
      include_timestamps: false,
      include_language_detection: false,
      filter_background_audio: false,
      keyterms: [],
      no_verbatim: false,
      entity_detection: null,
      keepalive_interval_ms: null,
    },
  });

const partial = (text: string) => JSON.stringify({ message_type: 'partial_transcript', text });
const committed = (text: string) => JSON.stringify({ message_type: 'committed_transcript', text });

/**
 * English, said without a pause and let go at the end: the guesses grow, and the commit sent on
 * letting go settles the whole phrase.
 */
export const recordedEnglish = {
  beforeCommit: [
    started('en'),
    partial('Email the Dent'),
    partial('Email the dentist to move Thursday.'),
    partial("Email the dentist to move Thursday's appointment."),
    partial("Email the dentist to move Thursday's appointment and call the bank before-"),
  ],
  afterCommit: [
    committed("Email the dentist to move Thursday's appointment and call the bank before Friday."),
  ],
} as const;

/**
 * Vietnamese in the same session settings, with two seconds of quiet before letting go: the voice
 * detector settles the phrase itself, and the commit on letting go settles nothing more.
 */
export const recordedVietnamese = {
  beforeCommit: [
    started('vi'),
    partial('Gọi điện cho-'),
    partial('Gọi điện cho mẹ tối nay.'),
    partial('Gọi điện cho mẹ tối nay và nộp báo...'),
    partial('Gọi điện cho mẹ tối nay và nộp báo cáo tài chính'),
    partial('Gọi điện cho mẹ tối nay và nộp báo cáo tài chính trước thứ Sáu.'),
    partial('Gọi điện cho mẹ tối nay và nộp báo cáo tài chính trước thứ Sáu.'),
    committed('Gọi điện cho mẹ tối nay và nộp báo cáo tài chính trước thứ Sáu.'),
  ],
  afterCommit: [committed('')],
} as const;
