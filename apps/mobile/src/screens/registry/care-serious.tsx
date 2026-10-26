import { lazy } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';

import { useForcedVariant } from './support/forced-variant';
import { standardVariants, type ScreenState } from './support/screen-state';

/** Serious mode: the grey classroom, glasses off, plain company, with be funny offered for a task the screen judged serious. */
export const careSerious: ScreenState = {
  id: 'care-serious',
  design: { board: 'Serious', section: 'The drum, and after', screen: 'Serious' },
  component: lazy(() =>
    Promise.all([
      import('../../features/care/serious-screen'),
      import('../../features/first-day/his-line'),
    ]).then(([screen, line]) => ({
      default: function Serious() {
        const say = line.useHisLine();
        const long = useForcedVariant()?.condition === 'long-text';
        const vi = useLanguage().language === 'vi';
        const task = vi
          ? long
            ? 'Gọi bệnh viện hỏi kết quả xét nghiệm của bố, rồi gọi lại bên bảo hiểm về mấy tờ đơn họ gửi tuần trước'
            : 'Gọi bệnh viện hỏi kết quả của bố'
          : long
            ? 'Call the hospital about Dad’s results, then ring the insurance people back about the forms they sent last week'
            : 'Call the hospital about Dad’s results';
        return (
          <screen.SeriousScreen
            task={task}
            line={say('seriousCompany', 'capture')}
            beFunnyOffered
            onSit={() => undefined}
            onNotNow={() => undefined}
            onBeFunny={() => undefined}
          />
        );
      },
    })),
  ),
  variants: standardVariants(['long-text']),
};
