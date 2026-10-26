import { chalkReply } from '../lib/chalk-reply';

/**
 * The home page's chalkboard. The task is written in chalk, then his line appears beside him. A
 * heavy task gets the plain line and his calm face; a crisis hides him and shows the way to a
 * helpline. Nothing typed leaves the page.
 */
export function startTryBoard(board: HTMLElement): void {
  const language = board.dataset['language'] === 'vi' ? 'vi' : 'en';
  const form = board.querySelector<HTMLFormElement>('[data-try-form]');
  const input = form?.querySelector<HTMLInputElement>('input');
  const task = board.querySelector<HTMLElement>('[data-try-task]');
  const reply = board.querySelector<HTMLElement>('[data-try-reply]');
  const line = board.querySelector<HTMLElement>('[data-try-line]');
  const care = board.querySelector<HTMLElement>('[data-try-care]');
  const words = { empty: board.dataset['empty'], plain: board.dataset['plain'] };
  if (!form || !input || !task || !reply || !line || !care) return;
  let turn = 0;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    const answer = chalkReply(text, language, turn);
    turn += 1;

    task.textContent = answer.kind === 'empty' ? '' : text;
    task.classList.remove('written');
    void task.offsetWidth;
    task.classList.add('written');

    care.hidden = answer.kind !== 'crisis';
    reply.hidden = answer.kind === 'crisis';
    board.classList.toggle('try-quiet', answer.kind === 'crisis' || answer.kind === 'plain');
    if (answer.kind === 'crisis') return;
    line.textContent =
      answer.kind === 'line'
        ? answer.line
        : answer.kind === 'empty'
          ? (words.empty ?? '')
          : (words.plain ?? '');
    line.classList.remove('popped');
    void line.offsetWidth;
    line.classList.add('popped');
  });
}
