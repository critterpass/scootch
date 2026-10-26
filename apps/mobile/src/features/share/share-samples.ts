import { carvingFor, DAY_MS, type Carving } from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

import type { ShareSubject } from './share-rules';

/** What a registry capture shows: the brief's own example, its certificate, and a long task. */
export type SampleKind = 'plain' | 'certificate' | 'long';

const DONE_AT = Date.parse('2026-10-26T10:42:00+07:00');

const TASKS: Readonly<Record<Language, Readonly<Record<SampleKind, string>>>> = {
  en: {
    plain: 'Email the dentist',
    certificate: 'File the tax receipts',
    long: 'Call the insurance company about the claim from March and ask them for the reference number and the name of the person handling it',
  },
  vi: {
    plain: 'Gửi email cho nha sĩ',
    certificate: 'Nộp biên lai thuế',
    long: 'Gọi cho công ty bảo hiểm về hồ sơ bồi thường từ tháng Ba, hỏi số tham chiếu và tên người đang phụ trách hồ sơ',
  },
};

/** A month of finishes carved into the desk, one or two a day, with one carved 10. */
export function sampleCarvings(count = 26): Carving[] {
  return Array.from({ length: count }, (_, index) =>
    carvingFor({
      taskId: `sample-${index}`,
      seed: `sample-${index}`,
      comment: index === 11 ? 'ten' : 'good',
      heavy: false,
      at: DONE_AT - (count - index) * DAY_MS,
    }),
  );
}

/** A finish to show on the cards in a registry capture. */
export function sampleSubject(language: Language, kind: SampleKind): ShareSubject {
  const certificate = kind === 'certificate';
  return {
    taskId: `sample-${kind}`,
    task: TASKS[language][kind],
    doneAt: DONE_AT,
    day: '2026-10-26',
    periodMinutes: certificate ? 25 : 11,
    comment: certificate ? 'ten' : 'good',
    giayKhen: certificate,
    waitedDays: certificate ? 23 : 9,
    name: 'Trần Minh Anh',
    carvings: sampleCarvings(),
  };
}
