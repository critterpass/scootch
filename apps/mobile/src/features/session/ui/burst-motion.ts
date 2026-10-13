import type { BurstBloom, BurstMark } from './burst-shapes';

/** Where a thrown mark is, `t` seconds into its life, and how much of its throw is left. */
export function pathAt(mark: BurstMark, t: number) {
  'worklet';
  const left = Math.exp(-mark.drag * t);
  const spent = 1 - left;
  // The speed it settles to, where gravity and the air agree.
  const settled = mark.gravity / mark.drag;
  // The drift from side to side comes in as the throw is spent.
  const drift = mark.sway * spent * Math.sin(mark.swayRate * t + mark.phase);
  return {
    x: (mark.vx / mark.drag) * spent + drift,
    y: settled * t + ((mark.vy - settled) / mark.drag) * spent,
    left,
  };
}

const HIDDEN = { opacity: 0 } as const;
/** Below this speed a flying blot has landed. */
const LANDED_SPEED = 90;

/** One frame of a mark, `ms` after it was thrown: only transforms and opacity. */
export function markFrame(mark: BurstMark, ms: number) {
  'worklet';
  if (ms <= 0 || ms >= mark.life) return HIDDEN;
  const t = ms / 1000;
  const k = ms / mark.life;
  let opacity = mark.opacity * Math.min(1, ms / 50);
  if (k > mark.fadeFrom) opacity *= (1 - k) / (1 - mark.fadeFrom);
  let scale = mark.scale;
  let across = 1;
  let along = 1;
  let heading = 0;

  const flung = mark.fling;
  const place = pathAt(mark, flung ? Math.min(t, flung.at / 1000) : t);
  let x = place.x;
  let y = place.y;

  if (flung) {
    // A droplet is inside its bubble until the pop throws it out.
    const since = ms - flung.at;
    if (since < 0) return HIDDEN;
    const s = since / 1000;
    const spent = 1 - Math.exp(-6 * s);
    x += (flung.vx / 6) * spent;
    y += (flung.vy / 6) * spent + 260 * s * s;
    const share = since / Math.max(1, mark.life - flung.at);
    opacity = mark.opacity * (1 - share);
    scale *= 1 - 0.4 * share;
  }

  if (mark.popAt !== null && ms > mark.popAt) {
    const popped = (ms - mark.popAt) / 120;
    if (popped >= 1) return HIDDEN;
    scale *= 1 + 0.5 * popped;
    opacity *= 1 - popped;
  }

  if (mark.wobble > 0) {
    const give = 0.07 * Math.sin(mark.wobble * t + mark.phase);
    along *= 1 + give;
    across *= 1 - give;
    // Blown up out of nothing, quickly, then left to wobble.
    const blown = Math.min(1, ms / 220);
    scale *= 0.35 + 0.65 * (1 - Math.pow(1 - blown, 3));
  }

  if (mark.twinkle > 0) {
    const glint = 0.5 + 0.5 * Math.sin(mark.twinkle * t + mark.phase);
    scale *= 0.55 + 0.6 * glint;
    opacity *= 0.45 + 0.55 * glint;
    // A sparkle comes on with a flash larger than itself.
    const lit = Math.min(1, ms / 240);
    scale *= 0.2 + 0.8 * lit + 0.5 * Math.sin(Math.PI * lit);
  }

  if (mark.lands) {
    // Stretched along its flight, then squashed flat as it lands, and the ink spreads a little.
    const thrown = Math.hypot(mark.vx, mark.vy);
    heading = Math.atan2(mark.vy, mark.vx);
    const stretch = Math.min(0.9, (thrown * place.left) / 700);
    const landsAt = thrown > LANDED_SPEED ? Math.log(thrown / LANDED_SPEED) / mark.drag : 0;
    const since = t - landsAt;
    let splash = 0;
    let size = 0.7;
    if (since > 0) {
      splash = 0.32 * Math.exp(-since * 8) * Math.sin(since * 30 + 0.6);
      size = 0.7 + 0.3 * Math.min(1, since / 0.06) + 0.08 * Math.min(1, since / 1.4);
    }
    along = (1 + stretch + splash) * size;
    across = ((1 - splash * 0.5) / (1 + stretch * 0.6)) * size;
  }

  const turn = mark.rotation + mark.spin * t;
  const tumble = mark.flip === 0 ? 0 : mark.phase + mark.flip * t;
  return {
    opacity,
    transform: [
      { perspective: 500 },
      { translateX: x },
      { translateY: y },
      { rotate: `${heading}rad` },
      { scaleX: along * scale },
      { scaleY: across * scale },
      { rotate: `${turn - heading}rad` },
      { rotateX: `${mark.flipAxis === 'x' ? tumble : 0}rad` },
      { rotateY: `${mark.flipAxis === 'y' ? tumble : 0}rad` },
    ],
  };
}

/** The one soft flash where a throw goes off: up quickly, then gone. */
export function bloomFrame(bloom: BurstBloom, ms: number) {
  'worklet';
  const k = (ms - bloom.delay) / bloom.life;
  if (k <= 0 || k >= 1) return HIDDEN;
  const out = 1 - Math.pow(1 - k, 3);
  return {
    opacity: bloom.peak * Math.min(1, k * 6) * (1 - k) * (1 - k),
    transform: [{ scale: 0.45 + 0.75 * out }],
  };
}
