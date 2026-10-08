import { drawCommands, GROUND_Y, toSvg, VIEW_SIZE } from '@scootch/art';

import { artFrame, BREATH, type ArtSpec } from '../lib/art-spec';

/** A big character is redrawn this often; a small one half as often, where it cannot be seen. */
const fullHz = 24;
const smallHz = 12;
const smallSize = 96;

interface Live {
  readonly host: HTMLElement;
  readonly spec: ArtSpec;
  readonly canvas: HTMLCanvasElement;
  /** Characters with the same spec start at different moments, so a row does not move as one. */
  readonly offset: number;
  seen: boolean;
  nextAt: number;
}

const still = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const living = new Map<HTMLElement, Live>();
let watcher: IntersectionObserver | undefined;
let running = false;

function draw(live: Live, seconds: number): void {
  const width = live.host.clientWidth;
  if (width === 0) return;
  const pixels = Math.round(width * Math.min(2, devicePixelRatio));
  if (live.canvas.width !== pixels) {
    live.canvas.width = pixels;
    live.canvas.height = pixels;
  }
  const context = live.canvas.getContext('2d');
  if (!context) return;
  const frame = artFrame(live.spec, seconds + live.offset);
  const scale = pixels / VIEW_SIZE;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);
  // The breath stretches the whole figure about its feet.
  context.translate(VIEW_SIZE / 2, GROUND_Y);
  context.scale(1 - frame.breath * BREATH.narrower, 1 + frame.breath * BREATH.taller);
  context.translate(-VIEW_SIZE / 2, -GROUND_Y);
  drawCommands(context, frame.commands);
  live.host.dataset['live'] = '1';
}

function tick(now: number): void {
  for (const live of living.values()) {
    // Gone from the page, or emptied by the page's own script: nothing left to move.
    if (!live.host.isConnected || !live.canvas.isConnected) {
      living.delete(live.host);
      delete live.host.dataset['live'];
      continue;
    }
    if (!live.seen || now < live.nextAt) continue;
    live.nextAt = now + 1000 / (live.host.clientWidth >= smallSize ? fullHz : smallHz);
    draw(live, now / 1000);
  }
  if (living.size > 0) requestAnimationFrame(tick);
  else running = false;
}

/** Brings one drawn character to life. Its still stays underneath, for whatever reads the page. */
function adopt(host: HTMLElement): void {
  if (still()) return;
  const spec = JSON.parse(host.dataset['art'] ?? 'null') as ArtSpec | null;
  if (!spec) return;
  living.get(host)?.canvas.remove();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  living.set(host, { host, spec, canvas, offset: living.size * 0.37, seen: false, nextAt: 0 });
  watcher ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const live = living.get(entry.target as HTMLElement);
        if (live) live.seen = entry.isIntersecting;
      }
    },
    { rootMargin: '80px' },
  );
  watcher.observe(host);
  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }
}

/** Draws a character into an element of the page, still first, then alive. */
export function showArt(host: HTMLElement, spec: ArtSpec, idPrefix = ''): void {
  host.innerHTML = toSvg(artFrame(spec, null).commands, { idPrefix });
  host.dataset['art'] = JSON.stringify(spec);
  delete host.dataset['live'];
  adopt(host);
}

/** Brings every character already on the page to life. Nothing moves with Reduce Motion. */
export function startLiveArt(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-art]')) adopt(host);
}
