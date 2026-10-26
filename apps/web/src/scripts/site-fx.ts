/**
 * The motion every page shares: the scroll line, headlines that rise, sections that arrive as they
 * are scrolled to, numbers that count up and buttons that lean towards the pointer. With Reduce
 * Motion only the scroll line moves.
 */
const spring = 'cubic-bezier(.32,.72,0,1)';
const bounce = 'cubic-bezier(.34,1.56,.64,1)';

const stillPage = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Calls `seen` once for each element, the first time it scrolls into view. */
function onceInView(
  elements: Iterable<Element>,
  threshold: number,
  seen: (element: HTMLElement) => void,
): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        seen(entry.target as HTMLElement);
      }
    },
    { threshold },
  );
  for (const element of elements) observer.observe(element);
}

function followScroll(): void {
  const fill = document.querySelector<HTMLElement>('[data-scroll-fill]');
  if (!fill) return;
  const follow = (): void => {
    const page = document.documentElement;
    const done = Math.max(0, Math.min(1, scrollY / Math.max(1, page.scrollHeight - innerHeight)));
    fill.style.width = `${done * 100}%`;
  };
  addEventListener('scroll', follow, { passive: true });
  follow();
}

function arrive(): void {
  for (const [index, word] of [...document.querySelectorAll('[data-rise]')].entries()) {
    word.animate([{ transform: 'translateY(110%) rotate(6deg)' }, { transform: 'none' }], {
      duration: 900,
      delay: 120 + index * 90,
      easing: spring,
      fill: 'backwards',
    });
  }
  for (const marker of document.querySelectorAll('.marker')) {
    marker.animate(
      [{ transform: 'rotate(-1.2deg) scaleX(0)' }, { transform: 'rotate(-1.2deg) scaleX(1)' }],
      { duration: 700, delay: 750, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' },
    );
  }

  const waiting = [...document.querySelectorAll<HTMLElement>('[data-reveal], main section h2')];
  const show = (element: HTMLElement): void => {
    if (element.dataset['shown']) return;
    element.dataset['shown'] = '1';
    element.style.opacity = '';
    if (element.dataset['reveal'] === 'stagger') {
      for (const [index, child] of [...element.children].entries()) {
        child.animate(
          [
            { opacity: 0, transform: 'translateY(36px) scale(.97)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 900, delay: index * 90, easing: spring, fill: 'backwards' },
        );
      }
    } else {
      element.animate(
        [
          { opacity: 0, transform: 'translateY(30px)', clipPath: 'inset(0 0 35% 0)' },
          { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
        ],
        { duration: 950, easing: spring },
      );
    }
  };
  for (const element of waiting) element.style.opacity = '0';
  onceInView(waiting, 0.1, show);
  // Nothing stays hidden because an observer never fired.
  setTimeout(() => waiting.forEach(show), 6000);

  onceInView(document.querySelectorAll('[data-count]'), 0.5, (element) => {
    const total = Number(element.dataset['count']);
    const start = performance.now();
    const step = (): void => {
      const done = Math.min(1, (performance.now() - start) / 1400);
      element.textContent = String(Math.round(total * (1 - (1 - done) ** 3)));
      if (done < 1) requestAnimationFrame(step);
    };
    step();
  });
}

function leanToPointer(): void {
  const magnets = [...document.querySelectorAll<HTMLElement>('[data-magnet]')];
  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      for (const magnet of magnets) {
        const box = magnet.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        magnet.style.translate =
          Math.hypot(dx, dy) < 130 ? `${(dx * 0.22).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px` : '';
        magnet.style.transition = `translate .35s ${bounce}, background .2s`;
      }
    },
    { passive: true },
  );
}

export function startSiteFx(): void {
  followScroll();
  if (stillPage()) return;
  arrive();
  leanToPointer();
}
