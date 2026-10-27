import { useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { goBack } from '../../ui/motion/go-back';
import { lineFor } from '../desk/his-line';
import { useStudentName } from '../desk/use-student-name';

import { legalLink, PRESELECTED_PLAN, type PlanId } from './products';
import { shownPlan, stageOf, type ReceiptStage } from './receipt-model';
import { ReceiptView } from './receipt-view';
import { useTuition } from './tuition-provider';

const SCHOLARSHIP = '/tuition/scholarship' as Href;

/**
 * The receipt, on the store: it opens on what the store says (unstamped, in its free week, paid,
 * or on a scholarship), the school year picked first. Buying moves it to its stamp (or closes it,
 * where the store has not yet said what was bought), Ask to Buy to waiting, a failure to "Try
 * again"; closing the store's sheet changes nothing and says nothing.
 */
export function ReceiptScreen() {
  const t = useT();
  const router = useRouter();
  const { language } = useLanguage();
  const tuition = useTuition();
  const name = useStudentName();
  const [picked, setPicked] = useState<PlanId>(PRESELECTED_PLAN);
  const [outcome, setOutcome] = useState<ReceiptStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { loadOfferings } = tuition;

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  const stage: ReceiptStage =
    outcome === 'pending' || outcome === 'failed' ? outcome : stageOf(tuition.customer);
  const plan = shownPlan(tuition.customer, picked);
  const winBack = tuition.offerings?.plans[plan]?.winBack ?? null;
  const line = useMemo(
    () =>
      stage === 'offer' && winBack !== null
        ? (lineFor(language, 'winBack', winBack.id)?.text ?? null)
        : null,
    [stage, winBack, language],
  );
  const close = () => goBack(router, '/');

  const buy = async () => {
    setBusy(true);
    const result = await tuition.purchase(plan, winBack?.id);
    setBusy(false);
    if (result.kind === 'pending') setOutcome('pending');
    else if (result.kind === 'failed') setOutcome('failed');
    else if (result.kind === 'purchased') {
      setOutcome(null);
      // Paid, the receipt takes its stamp. Where the store has not yet said what was bought, the
      // receipt does not stay on offer under the store's "You're all set": it closes.
      if (stageOf(result.customer) === 'offer') close();
    }
  };

  return (
    <ReceiptView
      stage={stage}
      plan={plan}
      offerings={tuition.offerings}
      customer={tuition.customer}
      now={Date.now()}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      name={name}
      available={tuition.available}
      busy={busy}
      line={line}
      message={message}
      onPick={(next) => {
        setMessage(null);
        setPicked(next);
      }}
      onPrimary={() => {
        if (stage === 'offer' || stage === 'failed') void buy();
        else close();
      }}
      onClose={close}
      onRestore={() => {
        setBusy(true);
        void tuition.restore().then((found) => {
          setBusy(false);
          setOutcome(null);
          if (found !== null && stageOf(found) === 'offer') {
            setMessage(t('tuition.restoreNone'));
            AccessibilityInfo.announceForAccessibility(t('tuition.restoreNone'));
          }
        });
      }}
      onManage={() => void tuition.manage()}
      onScholarship={() => router.push(SCHOLARSHIP)}
      onLink={(page) => void WebBrowser.openBrowserAsync(legalLink(page, language))}
    />
  );
}
