/**
 * The motion every page shares: the scroll line Scootch runs along, headlines that rise, sections
 * that arrive as they are scrolled to, numbers that count up, buttons that lean towards the
 * pointer and cards that lean with it. With Reduce Motion only the scroll line moves.
 */
const spring = 'cubic-bezier(.32,.72,0,1)';
const bounce = 'cubic-bezier(.34,1.56,.64,1)';
const confetti = ['#F0562E', '#FFD66B', '#7FB7FF', '#F49AC1', '#1C1A17'];

export const stillPage = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A burst of paper from the middle of an element. Nothing with Reduce Motion. */
export function burst(host: Element | null, pieces = 22): void {
  if (!host || stillPage()) return;
  const box = host.getBoundingClientRect();
  for (let index = 0; index < pieces; index++) {
    const piece = document.createElement('div');
    const angle = (index / pieces) * Math.PI * 2;
    const reach = 120 + ((index * 37) % 90);
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach * 0.7;
    piece.style.cssText = `position:fixed;z-index:999;pointer-events:none;left:${box.left + box.width / 2}px;top:${box.top + box.height / 2}px;width:${index % 3 ? 7 : 11}px;height:${index % 3 ? 12 : 6}px;border-radius:2px;background:${confetti[index % confetti.length]}`;
    document.body.append(piece);
    piece.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
        {
          transform: `translate(calc(-50% + ${x * 0.8}px),calc(-50% + ${y}px)) rotate(${index * 40}deg)`,
          opacity: 1,
          offset: 0.3,
        },
        {
          transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y + 90}px)) rotate(${index * 80}deg) scale(.7)`,
          opacity: 0,
        },
      ],
      { duration: 1500, delay: index * 8, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ).onfinish = () => piece.remove();
  }
}

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
  const runner = document.querySelector<HTMLElement>('[data-scroll-runner]');
  if (!fill) return;
  const follow = (): void => {
    const page = document.documentElement;
    const done = Math.max(0, Math.min(1, scrollY / Math.max(1, page.scrollHeight - innerHeight)));
    fill.style.width = `${done * 100}%`;
    if (runner) runner.style.left = `${done * 100}%`;
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
  const pointer = { x: -1, y: -1, at: 0 };
  const magnets = [...document.querySelectorAll<HTMLElement>('[data-magnet]')];
  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.at = performance.now();
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

  type Card = {
    element: HTMLElement;
    rx: number;
    ry: number;
    sheen: HTMLElement | null;
    glare: HTMLElement | null;
  };
  let cards: Card[] = [];
  const known = new WeakMap<HTMLElement, Card>();
  const scan = (): void => {
    cards = [...document.querySelectorAll<HTMLElement>('[data-lean]')].map((element) => {
      const card = known.get(element) ?? { element, rx: 0, ry: 0, sheen: null, glare: null };
      card.sheen = element.querySelector(':scope > .mcard-sheen');
      card.glare = element.querySelector(':scope > .mcard-glare');
      known.set(element, card);
      return card;
    });
  };
  let frame = 0;
  const tick = (): void => {
    const now = performance.now();
    const seconds = now / 1000;
    if (frame++ % 60 === 0) scan();
    for (const [index, card] of cards.entries()) {
      const box = card.element.getBoundingClientRect();
      if (box.width === 0 || box.bottom < 0 || box.top > innerHeight) continue;
      let rx = Math.sin(seconds * 0.9 + index) * 5;
      let ry = Math.sin(seconds * 0.6 + index * 2) * 9;
      const near =
        now - pointer.at < 1500 &&
        pointer.x > box.left - 50 &&
        pointer.x < box.right + 50 &&
        pointer.y > box.top - 50 &&
        pointer.y < box.bottom + 50;
      if (near) {
        rx = -((pointer.y - box.top) / box.height - 0.5) * 22;
        ry = ((pointer.x - box.left) / box.width - 0.5) * 26;
      }
      card.rx += (rx - card.rx) * 0.12;
      card.ry += (ry - card.ry) * 0.12;
      card.element.style.transform = `${card.element.dataset['lean'] ?? ''} rotateX(${card.rx.toFixed(2)}deg) rotateY(${card.ry.toFixed(2)}deg)${near ? ' scale(1.03)' : ''}`;
      const x = 50 + card.ry * 2.6;
      const y = 50 - card.rx * 2.6;
      if (card.sheen) card.sheen.style.backgroundPosition = `${x}% ${y}%`;
      if (card.glare) {
        card.glare.style.background = `radial-gradient(circle at ${x}% ${y - 20}%,rgba(255,255,255,.75),transparent 50%)`;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function startSiteFx(): void {
  followScroll();
  if (stillPage()) return;
  arrive();
  leanToPointer();
  // The characters come alive once the page is up: their drawing code is not needed to read it.
  void import('./live-art').then((art) => art.startLiveArt());
}
