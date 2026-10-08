import { stillPage } from './site-fx';

const bounce = 'cubic-bezier(.34,1.56,.64,1)';
const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const lines = (element: HTMLElement, name: string): string[] =>
  JSON.parse(element.dataset[name] ?? '[]') as string[];

/** The session that plays as the page scrolls past it: ten minutes, start to caught. */
function scrollTheHunt(hunt: HTMLElement): void {
  const part = (name: string): HTMLElement | null =>
    hunt.querySelector<HTMLElement>(`[data-h-${name}]`);
  const run = part('run');
  const monster = part('mon');
  const time = part('time');
  const fill = part('fill');
  const line = part('line');
  const caught = part('caught');
  const steps = [...hunt.querySelectorAll<HTMLElement>('[data-h-step]')];
  const said = lines(hunt, 'lines');
  // The section is only tall, and its panel only pinned, once something is here to play it.
  hunt.dataset['live'] = '1';

  const follow = (): void => {
    const box = hunt.getBoundingClientRect();
    const through = Math.max(0, Math.min(1, -box.top / Math.max(1, box.height - innerHeight)));
    const done = Math.max(0, Math.min(1, (through - 0.14) / 0.7));
    if (time) time.textContent = clock(Math.round(600 * (1 - done)));
    if (fill) fill.style.width = `${done * 100}%`;
    if (run) run.style.left = `${done * 100}%`;
    if (monster) monster.style.scale = (1 - done * 0.6).toFixed(3);
    if (line) line.textContent = said[Math.min(3, Math.floor(done * 4))] ?? '';
    if (caught) caught.dataset['on'] = String(through > 0.88);
    const step = through < 0.08 ? 0 : through < 0.16 ? 1 : through < 0.88 ? 2 : 3;
    for (const [index, element] of steps.entries()) element.classList.toggle('on', index === step);
  };
  addEventListener('scroll', follow, { passive: true });
  follow();
}

/** Drag the days and the monster in the widget grows, until it is pressed against the glass. */
function growTheLurker(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('input[type="range"]');
  if (!input) return;
  const stages = lines(root, 'stages');
  const units = lines(root, 'units');
  const all = (name: string): HTMLElement[] => [
    ...root.querySelectorAll<HTMLElement>(`[data-lurk-${name}]`),
  ];
  const monster = all('monster')[0];
  const inks = [
    ['#EDE4D6', '#1C1A17'],
    ['#FFD66B', '#1C1A17'],
    ['#FFB08F', '#1C1A17'],
    ['#F0562E', '#fff'],
  ] as const;

  const draw = (): void => {
    const days = Number(input.value);
    const stage = days < 3 ? 0 : days < 6 ? 1 : days < 10 ? 2 : 3;
    const along = `calc(1.5rem + (100% - 3rem) * ${((days - 1) / 13).toFixed(4)})`;
    const size = Math.min(1.55, 0.42 + days * 0.085);
    const squashed = days >= 11;
    root.style.setProperty('--along', along);
    root.style.setProperty('--days', String(days));
    for (const element of all('days')) element.textContent = String(days);
    for (const element of all('unit'))
      element.textContent = (days === 1 ? units[0] : units[1]) ?? '';
    for (const element of all('line')) element.textContent = stages[stage] ?? '';
    for (const element of all('day')) {
      element.textContent = (root.dataset['day'] ?? '').replace('{n}', String(days));
    }
    for (const element of all('chip')) {
      element.style.background = inks[stage][0];
      element.style.color = inks[stage][1];
    }
    if (monster) {
      monster.style.transform = `translateX(-50%) translateY(${squashed ? 3.75 : days > 7 ? 1.875 : 0}rem) scale(${(squashed ? size * 1.06 : size).toFixed(3)},${(squashed ? size * 0.9 : size).toFixed(3)})`;
    }
  };
  input.addEventListener('input', () => {
    draw();
    if (stillPage()) return;
    monster?.firstElementChild?.animate(
      [
        { transform: 'rotate(0)' },
        { transform: 'rotate(-5deg) scale(1.04,.96)' },
        { transform: 'rotate(4deg)' },
        { transform: 'rotate(0)' },
      ],
      { duration: 420, easing: 'ease-out' },
    );
  });
  draw();
}

/** The Lock Screen's session counts down, and the Dynamic Island takes its three shapes in turn. */
function runTheSurfaces(root: HTMLElement): void {
  const island = root.querySelector<HTMLElement>('[data-island]');
  const modes = ['compact', 'table', 'caught'];
  const next = (): void => {
    if (!island) return;
    island.dataset['mode'] =
      modes[(modes.indexOf(island.dataset['mode'] ?? '') + 1) % modes.length];
  };
  island?.addEventListener('click', next);

  let left = 432;
  const draw = (): void => {
    const done = 1 - left / 600;
    root.style.setProperty('--done', `${(done * 100).toFixed(1)}%`);
    root.style.setProperty('--shrunk', (1 - done * 0.45).toFixed(3));
    for (const element of root.querySelectorAll('[data-clock]')) element.textContent = clock(left);
    for (const element of root.querySelectorAll('[data-mins]')) {
      element.textContent = `${Math.ceil(left / 60)}m`;
    }
  };
  draw();
  if (stillPage()) return;
  setInterval(() => {
    left = left > 0 ? left - 1 : 600;
    draw();
  }, 1000);
  setInterval(next, 3400);
}

function waveAtTheTable(room: HTMLElement): void {
  const button = room.querySelector<HTMLButtonElement>('[data-wave]');
  const back = room.querySelector<HTMLElement>('[data-wave-back]');
  if (!button) return;
  const ask = button.textContent;
  button.addEventListener('click', () => {
    if (room.dataset['waved']) return;
    room.dataset['waved'] = '1';
    button.textContent = button.dataset['waved'] ?? ask;
    if (back) back.hidden = false;
    if (!stillPage()) {
      for (const [index, ring] of [...room.querySelectorAll('.wave-ring')].entries()) {
        ring.animate(
          [
            { transform: 'scale(.5)', opacity: 0.9 },
            { transform: 'scale(1.6)', opacity: 0 },
          ],
          { duration: 1200, delay: index * 500, iterations: 2, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
      }
      back?.animate(
        [
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1 },
        ],
        { duration: 500, easing: bounce },
      );
    }
    setTimeout(() => {
      delete room.dataset['waved'];
      button.textContent = ask;
      if (back) back.hidden = true;
    }, 3600);
  });
}

function pickAnAttitude(root: HTMLElement): void {
  const notes = JSON.parse(root.dataset['notes'] ?? '[]') as string[][];
  const said = [...root.querySelectorAll<HTMLElement>('[data-note]')];
  const picks = [...root.querySelectorAll<HTMLButtonElement>('[data-attitude-pick]')];
  for (const pick of picks) {
    pick.addEventListener('click', () => {
      const attitude = Number(pick.dataset['attitudePick']);
      root.dataset['attitude'] = String(attitude);
      for (const other of picks) other.setAttribute('aria-pressed', String(other === pick));
      for (const [index, note] of said.entries()) {
        note.textContent = notes[attitude]?.[index] ?? '';
        if (stillPage()) continue;
        note.closest('.note')?.animate(
          [
            { opacity: 0, transform: 'translateY(-18px) scale(.96)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 620, delay: index * 110, easing: bounce, fill: 'backwards' },
        );
      }
    });
  }
}

/** Picking a finish dresses every card on the page that wears one, the hatched card included. */
function wearAFinish(root: HTMLElement): void {
  const picks = [...root.querySelectorAll<HTMLButtonElement>('[data-finish-pick]')];
  const flip = root.querySelector<HTMLElement>('[data-finish-flip]');
  for (const pick of picks) {
    pick.addEventListener('click', () => {
      const finish = pick.dataset['finishPick'] ?? 'paper';
      for (const other of picks) other.setAttribute('aria-pressed', String(other === pick));
      for (const card of document.querySelectorAll<HTMLElement>('[data-wears]')) {
        card.dataset['finish'] = finish;
      }
      for (const name of document.querySelectorAll('[data-finish-name]')) {
        name.textContent = pick.dataset['name'] ?? '';
      }
      root.dataset['finish'] = finish;
      if (stillPage()) return;
      flip?.animate(
        [
          { transform: 'perspective(900px) rotateY(0) scale(1)' },
          { transform: 'perspective(900px) rotateY(180deg) scale(.92)', offset: 0.45 },
          { transform: 'perspective(900px) rotateY(350deg) scale(1.04)', offset: 0.8 },
          { transform: 'perspective(900px) rotateY(360deg) scale(1)' },
        ],
        { duration: 760, easing: 'cubic-bezier(.45,0,.2,1)' },
      );
    });
  }
}

/** The field types out things people avoid, until someone starts typing their own. */
function typeExamples(input: HTMLInputElement): void {
  const examples = lines(input, 'typing');
  const rest = input.placeholder;
  const lead = rest.slice(0, rest.indexOf(' ') + 1);
  if (examples.length === 0 || stillPage()) return;
  let example = 0;
  let shown = 0;
  let step = 1;
  let wait = 0;
  setInterval(() => {
    if (document.activeElement === input || input.value !== '') {
      input.placeholder = rest;
      return;
    }
    if (wait > 0) {
      wait--;
      return;
    }
    const text = examples[example] ?? '';
    shown += step;
    if (shown >= text.length) {
      step = -1;
      wait = 22;
    }
    if (shown <= 0) {
      step = 1;
      example = (example + 1) % examples.length;
      wait = 4;
    }
    input.placeholder = `${lead}${text.slice(0, Math.max(0, shown))}${wait ? '' : '|'}`;
  }, 65);
}

export function startHomePage(): void {
  const each = <E extends HTMLElement>(selector: string, start: (element: E) => void): void => {
    for (const element of document.querySelectorAll<E>(selector)) start(element);
  };
  each('[data-hunt]', scrollTheHunt);
  each('[data-lurk]', growTheLurker);
  each('[data-surfaces]', runTheSurfaces);
  each('[data-table]', waveAtTheTable);
  each('[data-attitudes]', pickAnAttitude);
  each('[data-finishes]', wearAFinish);
  each<HTMLInputElement>('input[data-typing]', typeExamples);
}
