import { burst, stillPage } from './site-fx';

const holdMs = 1100;

/**
 * The web card's catch: hold the button until it fills and the card is stamped. A press from a
 * keyboard or a switch catches at once, so nothing here needs holding. A new monster arrives wild.
 */
export function startHoldToCatch(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('[data-hold]');
  const button = root.querySelector<HTMLButtonElement>('[data-hold-button]');
  if (!stage || !button) return;
  const words = JSON.parse(stage.dataset['hold'] ?? '{}') as Record<string, string>;
  const part = (name: string): HTMLElement | null =>
    stage.querySelector<HTMLElement>(`[data-${name}]`);
  const fill = part('hold-fill');
  const ring = part('hold-ring');
  const label = part('hold-label');
  const hint = part('hold-hint');
  let frame = 0;

  const draw = (done: number): void => {
    if (fill) fill.style.width = `${done * 100}%`;
    if (ring) ring.style.background = `conic-gradient(#fff ${done * 100}%, transparent 0)`;
  };
  const set = (caught: boolean): void => {
    stage.dataset['caught'] = String(caught);
    button.hidden = caught;
    for (const element of stage.querySelectorAll<HTMLElement>('[data-caught-only]')) {
      element.hidden = !caught;
    }
    const tag = part('catch-tag');
    if (tag) {
      tag.textContent = (caught ? words['caught'] : words['wild']) ?? '';
      tag.classList.toggle('tag-tomato', caught);
    }
    const foot = part('catch-foot');
    if (foot) foot.textContent = (caught ? words['onShelf'] : words['notCaught']) ?? '';
    const stamp = part('catch-stamp');
    if (stamp) stamp.hidden = !caught;
    if (label) label.textContent = words['hold'] ?? '';
    if (hint) hint.textContent = (caught ? words['done'] : words['idle']) ?? '';
    draw(0);
  };
  const catchIt = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
    set(true);
    const stamp = part('catch-stamp');
    if (!stillPage()) {
      stamp?.animate(
        [
          { scale: 2.6, rotate: '-30deg', opacity: 0 },
          { scale: 0.92, rotate: '-10deg', opacity: 1, offset: 0.55 },
          { scale: 1, rotate: '-14deg' },
        ],
        { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    }
    burst(stage.querySelector('[data-card]'));
  };
  const letGo = (): void => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
    draw(0);
    if (label) label.textContent = words['hold'] ?? '';
    if (hint) hint.textContent = words['early'] ?? '';
    if (!stillPage()) {
      button.animate(
        [0, -6, 5, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 360 },
      );
    }
  };

  button.addEventListener('pointerdown', () => {
    const start = performance.now();
    if (label) label.textContent = words['holding'] ?? '';
    const step = (): void => {
      const done = Math.min(1, (performance.now() - start) / holdMs);
      draw(done);
      if (done >= 1) catchIt();
      else frame = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(step);
  });
  for (const end of ['pointerup', 'pointerleave', 'pointercancel']) {
    button.addEventListener(end, letGo);
  }
  // A click with no pointer behind it comes from a keyboard, a switch or a screen reader.
  button.addEventListener('click', (event) => {
    if (event.detail === 0) catchIt();
  });

  new MutationObserver(() => {
    if (root.dataset['state'] === 'hatching') set(false);
  }).observe(root, { attributes: true, attributeFilter: ['data-state'] });
}
