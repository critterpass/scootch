import type { Stereo } from './signal';

/** 16-bit stereo PCM WAV bytes for finished audio. Plain bytes, so it runs anywhere. */
export function encodeWav(audio: Stereo): Uint8Array {
  const frames = audio.left.length;
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = frames * channels * bytesPerSample;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (const channel of [audio.left, audio.right]) {
      const clamped = Math.max(-1, Math.min(1, channel[i] ?? 0));
      view.setInt16(offset, Math.round(clamped * 32767), true);
      offset += 2;
    }
  }
  return bytes;
}
