import { applyBiquad, type BiquadCoeffs } from './filter';
import { peak, scaled, type Stereo } from './signal';

/** The two K-weighting stages of ITU-R BS.1770 (a head-shaped high shelf, then a high-pass) for any sample rate. */
function kWeighting(sampleRate: number): readonly [BiquadCoeffs, BiquadCoeffs] {
  const shelfK = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  const shelfQ = 0.7071752369554196;
  const vh = Math.pow(10, 3.999843853973347 / 20);
  const vb = Math.pow(vh, 0.4996667741545416);
  const shelfA0 = 1 + shelfK / shelfQ + shelfK * shelfK;
  const passK = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  const passQ = 0.5003270373238773;
  const passA0 = 1 + passK / passQ + passK * passK;
  return [
    {
      b0: (vh + (vb * shelfK) / shelfQ + shelfK * shelfK) / shelfA0,
      b1: (2 * (shelfK * shelfK - vh)) / shelfA0,
      b2: (vh - (vb * shelfK) / shelfQ + shelfK * shelfK) / shelfA0,
      a1: (2 * (shelfK * shelfK - 1)) / shelfA0,
      a2: (1 - shelfK / shelfQ + shelfK * shelfK) / shelfA0,
    },
    {
      b0: 1,
      b1: -2,
      b2: 1,
      a1: (2 * (passK * passK - 1)) / passA0,
      a2: (1 - passK / passQ + passK * passK) / passA0,
    },
  ];
}

const ABSOLUTE_GATE = -70;
const RELATIVE_GATE = -10;

/**
 * Integrated loudness in LUFS: K-weighting, overlapping blocks, then the absolute and relative
 * gates of BS.1770. Sounds shorter than the standard 400 ms block use a 20 ms block instead, so
 * the silence between the clicks of a short cue is still gated out.
 */
export function integratedLufs(audio: Stereo): number {
  const { sampleRate } = audio;
  if (audio.left.length === 0) return ABSOLUTE_GATE;
  const [shelf, pass] = kWeighting(sampleRate);
  const weigh = (c: Float32Array) =>
    applyBiquad(applyBiquad(c, shelf, sampleRate), pass, sampleRate);
  const left = weigh(audio.left);
  const right = weigh(audio.right);
  const standard = Math.round(0.4 * sampleRate);
  const block =
    left.length >= standard ? standard : Math.min(left.length, Math.round(0.02 * sampleRate));
  const hop = Math.max(1, Math.round(block / 4));
  const powers: number[] = [];
  for (let start = 0; start + block <= left.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + block; i += 1) {
      const l = left[i] ?? 0;
      const r = right[i] ?? 0;
      sum += l * l + r * r;
    }
    powers.push(sum / block);
  }
  // Blocks are averaged as power, then the average is expressed in LUFS.
  const loudness = (blocks: readonly number[]) =>
    -0.691 + 10 * Math.log10(Math.max(blocks.reduce((a, b) => a + b, 0) / blocks.length, 1e-12));
  const audible = powers.filter((power) => loudness([power]) > ABSOLUTE_GATE);
  if (audible.length === 0) return ABSOLUTE_GATE;
  const gate = loudness(audible) + RELATIVE_GATE;
  const kept = audible.filter((power) => loudness([power]) > gate);
  return loudness(kept.length > 0 ? kept : audible);
}

/**
 * A copy at `targetLufs`, turned down further if that is what it takes to keep the peak under
 * `ceiling`. Never louder than the target, never clipped.
 */
export function normalise(audio: Stereo, targetLufs: number, ceiling: number): Stereo {
  const top = peak(audio);
  if (top === 0) return audio;
  const wanted = Math.pow(10, (targetLufs - integratedLufs(audio)) / 20);
  return scaled(audio, Math.min(wanted, ceiling / top));
}
