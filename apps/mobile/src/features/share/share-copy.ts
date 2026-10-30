import { t, type Language } from '@phusclass/i18n';
import { createChooser, type Moment as VoiceMoment } from '@phusclass/voice/class';

import type { ShareSubject } from './share-rules';

/** Marks where the task's words sit in a line, so the card can tape over them. */
export const TAPE_START = '';
export const TAPE_END = '';

/** The site printed on every card. */
export const SITE = 'todo.phusclass.com';

/** Every word on the four cards, in one language. His words come from the voice pack. */
export type CardCopy = {
  readonly language: Language;
  readonly brand: string;
  /** The handwritten word on the white-out. */
  readonly tape: string;
  readonly paper: {
    readonly heading: string;
    readonly gradeLabel: string;
    readonly noteLabel: string;
    readonly nameLabel: string;
    readonly name: string | null;
    readonly taskLabel: string;
    readonly task: string;
    readonly workLabel: string;
    readonly work: readonly string[];
    /** His comment in red; `null` for the circled 10 (it has no words) and for a tick. */
    readonly comment: string | null;
    /** The circled 10, drawn. */
    readonly ten: boolean;
  };
  readonly certificate: {
    readonly kicker: string;
    readonly title: string;
    readonly awarded: string;
    readonly name: string | null;
    readonly reason: string;
    readonly task: string;
    readonly date: string;
    readonly seal: string;
  };
  readonly note: {
    readonly heading: string;
    readonly klass: string;
    readonly from: string;
    /** His note, in his hand. */
    readonly body: string;
    readonly teacher: string;
    readonly parent: string;
  };
  readonly desk: {
    readonly title: string;
    readonly footer: string;
  };
};

const COMMENT_MOMENTS = {
  fine: 'commentFine',
  good: 'commentGood',
  'good work': 'commentGoodWork',
} as const satisfies Record<string, VoiceMoment>;

/** The task as written inside a sentence: its own words, without a closing full stop. */
function inSentence(task: string): string {
  return task.trim().replace(/[.!?…。]+$/u, '');
}

/** The task, or a strip of white-out over it. */
function taskWords(task: string, hide: boolean): string {
  return hide ? `${TAPE_START}${task}${TAPE_END}` : task;
}

/** "nine days", "23 ngày": small numbers written out, as a teacher writes them. */
export function waitedWords(days: number, language: Language): string {
  const words = t(language, 'share.numberWords').split(',');
  const number = days < words.length ? (words[days] ?? String(days)) : String(days);
  return t(language, 'share.days', { count: days, number });
}

function dateWords(at: number, language: Language, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', options).format(at);
}

/**
 * The words of every card for one finish. `hide` puts white-out over the task wherever it is
 * written. The note home is his, from the voice pack, chosen by the task so a card reads the same
 * every time it is made.
 */
export function cardCopy(subject: ShareSubject, language: Language, hide: boolean): CardCopy {
  const say = createChooser(language);
  const seed = subject.taskId;
  const task = inSentence(subject.task);
  const waited = subject.waitedDays >= 1;

  const comment =
    subject.comment === null || subject.comment === 'ten'
      ? null
      : (say.say(COMMENT_MOMENTS[subject.comment], seed)?.text ?? null);

  const work = [
    waited
      ? t(language, 'share.paper.waited', { count: subject.waitedDays })
      : t(language, 'share.paper.sameDay'),
    subject.periodMinutes === null
      ? t(language, 'share.paper.ticked')
      : t(language, 'share.paper.took', { count: Math.max(1, Math.round(subject.periodMinutes)) }),
  ];

  const name = subject.name ?? t(language, 'share.noName');
  const done = say.say('shareNoteDone', seed, { name, task: taskWords(task, hide) })?.text ?? '';
  const after = waited
    ? say.say('shareNoteWaited', seed, { waited: waitedWords(subject.waitedDays, language) })
    : say.say('shareNoteSameDay', seed);

  return {
    language,
    brand: t(language, 'brand.name'),
    tape: t(language, 'share.tape'),
    paper: {
      heading: t(language, 'share.paper.heading'),
      gradeLabel: t(language, 'share.paper.grade'),
      noteLabel: t(language, 'share.paper.note'),
      nameLabel: t(language, 'share.paper.name'),
      name: subject.name,
      taskLabel: t(language, 'share.paper.task'),
      task: taskWords(task, hide),
      workLabel: t(language, 'share.paper.work'),
      work,
      comment,
      ten: subject.comment === 'ten',
    },
    certificate: {
      kicker: t(language, 'share.certificate.kicker', {
        year: dateWords(subject.doneAt, language, { year: 'numeric' }),
      }),
      title: t(language, 'share.certificate.title'),
      awarded: t(language, 'share.certificate.awarded'),
      name: subject.name,
      reason: waited
        ? t(language, 'share.certificate.for', {
            waited: waitedWords(subject.waitedDays, language),
          })
        : t(language, 'share.certificate.forSameDay'),
      task: taskWords(task, hide),
      date: dateWords(subject.doneAt, language, { day: 'numeric', month: 'long', year: 'numeric' }),
      seal: t(language, 'share.certificate.seal'),
    },
    note: {
      heading: t(language, 'share.note.heading'),
      klass: t(language, 'share.note.class'),
      from: t(language, 'share.note.from'),
      body: [done, after?.text ?? ''].filter((line) => line !== '').join(' '),
      teacher: t(language, 'share.note.teacher'),
      parent: t(language, 'share.note.parent'),
    },
    desk: {
      title:
        subject.name === null
          ? t(language, 'share.desk.titleNoName')
          : t(language, 'share.desk.title', { name: subject.name }),
      footer: t(language, 'share.desk.footer', {
        month: dateWords(subject.doneAt, language, { month: 'long', year: 'numeric' }),
      }).toLocaleUpperCase(language),
    },
  };
}
