import { StyleSheet, View } from 'react-native';

import { noTaskLine } from '@scootch/voice';

import { useLanguage, useT } from '../../../i18n/i18n-provider';
import { AfterScreen, type AfterShown } from '../after-screen';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;
const ATTITUDE = 'cheeky';
// A capture has no photos: two flat colours stand in, a cluttered brown and a cleared sand.
const BEFORE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGPoKw4FIgYIBQAmWgVZsnbjoQAAAABJRU5ErkJggg==';
const AFTER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGO4eXwFEDFAKABAsgkhxTz7cgAAAABJRU5ErkJggg==';

function Shown({ shown }: { readonly shown: AfterShown }) {
  const { language } = useLanguage();
  return (
    <AfterScreen
      shown={shown}
      attitude={ATTITUDE}
      viewfinder={<View style={[StyleSheet.absoluteFill, styles.desk]} />}
      askLine={noTaskLine(language, ATTITUDE, 'cameraAfterAsk')}
      cardLine={noTaskLine(language, ATTITUDE, 'cameraAfter')}
      onShutter={nothing}
      onSkip={nothing}
      onKeep={nothing}
      onShare={nothing}
      onDone={nothing}
    />
  );
}

/** After a caught session that began with a photo: the ask for one more of the same spot. */
export function AfterAsk() {
  return <Shown shown={{ kind: 'asking' }} />;
}

function Card({ gone, notice }: { readonly gone: number | null; readonly notice: boolean }) {
  const t = useT();
  const { language } = useLanguage();
  const day = new Intl.DateTimeFormat(language, { weekday: 'long' }).format(
    Date.parse('2026-10-06T09:00:00.000Z'),
  );
  return (
    <Shown
      shown={{
        kind: 'card',
        beforeUri: BEFORE,
        afterUri: AFTER,
        title: t('camera.after.title.desk', { day }),
        minutes: 10,
        gone,
        notice: notice ? t('camera.after.kept') : null,
      }}
    />
  );
}

/** The two photos to drag between, with the minutes and what is gone. */
export function AfterCard() {
  return <Card gone={3} notice={false} />;
}

/** The card when the phone finds no fewer things: the minutes stand alone. */
export function AfterCardMinutesOnly() {
  return <Card gone={null} notice={false} />;
}

/** The card after "Keep private": one plain line says where it went. */
export function AfterCardKept() {
  return <Card gone={3} notice />;
}

const styles = StyleSheet.create({
  desk: { backgroundColor: '#B79A78' },
});
