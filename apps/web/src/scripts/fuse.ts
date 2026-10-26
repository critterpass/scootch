/**
 * The fuse on the home page: while it is on screen his pressure rises a step at a time, 0 to 5, and
 * his face changes with it. A tap on a step shows that step. Start sounds the drum and puts him
 * back at 0. With Reduce Motion nothing rises on its own; the steps and Start still work.
 */
const STEP_MS = 2400;
const DRUM_MS = 2200;
const LAST = 5;

export function startFuse(fuse: HTMLElement): void {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const faces = [...fuse.querySelectorAll<HTMLElement>('.fuse-face')];
  const says = [...fuse.querySelectorAll<HTMLElement>('[data-say]')];
  const buttons = [...fuse.querySelectorAll<HTMLButtonElement>('[data-step-to]')];
  const start = fuse.querySelector<HTMLButtonElement>('[data-fuse-start]');
  let step = 0;
  let timer: number | undefined;
  let inView = false;
  let held = false;

  const show = (next: number): void => {
    step = Math.max(0, Math.min(LAST, next));
    fuse.dataset['step'] = String(step);
    fuse.style.setProperty('--burnt', String(step / LAST));
    faces.forEach((face, index) => face.classList.toggle('on', index === step));
    says.forEach((say, index) => (say.hidden = index !== step));
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === step)));
  };

  const stop = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const run = (): void => {
    stop();
    if (still || held || !inView) return;
    timer = window.setInterval(() => {
      if (step >= LAST) return stop();
      show(step + 1);
    }, STEP_MS);
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      held = true;
      stop();
      show(Number(button.dataset['stepTo']));
    });
  }

  start?.addEventListener('click', () => {
    stop();
    show(0);
    fuse.classList.remove('drumming');
    // Restart the drum's animation even when it is pressed twice in a row.
    void fuse.offsetWidth;
    fuse.classList.add('drumming');
    window.setTimeout(() => {
      fuse.classList.remove('drumming');
      held = false;
      run();
    }, DRUM_MS);
  });

  new IntersectionObserver(
    ([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) run();
      else stop();
    },
    { threshold: 0.5 },
  ).observe(fuse);

  show(0);
}
