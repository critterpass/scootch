import { fadeEdges, secondsToSamples, type Stereo } from '../core/signal';

const FADE_IN_SECONDS = 0.2;
const FADE_OUT_SECONDS = 0.6;

/**
 * A clip of exactly `seconds` for sharing: the end of the track, where the whole band plays and
 * the last chord lands. It fades in if it starts mid-track and always fades out to silence. A track
 * shorter than the clip is kept whole and padded with silence.
 */
export function clip(track: Stereo, seconds: number): Stereo {
  const length = secondsToSamples(seconds, track.sampleRate);
  const start = Math.max(0, track.left.length - length);
  const cut = (channel: Float32Array) => {
    const out = new Float32Array(length);
    out.set(channel.subarray(start, start + length));
    return out;
  };
  const out: Stereo = {
    sampleRate: track.sampleRate,
    left: cut(track.left),
    right: cut(track.right),
  };
  fadeEdges(out, start > 0 ? FADE_IN_SECONDS : 0, FADE_OUT_SECONDS);
  return out;
}
