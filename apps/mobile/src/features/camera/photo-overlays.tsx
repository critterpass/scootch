import { StyleSheet, View } from 'react-native';

import { colors } from '@scootch/tokens';

import { SessionText } from '../session/ui/session-text';

import type { CameraRead } from './camera-read';
import { boxOnScreen, ringAround, type Rect, type Size } from './photo-frame';

// What is drawn over a photo is always tomato and white, whatever the phone's appearance: it sits
// on a picture, not on the page.
const TOMATO = colors.light.tomato;
const ON_TOMATO = colors.light.onTomato;
const SHADE = 'rgba(0,0,0,0.45)';
const WHITE = '#FFFFFF';

function place(rect: Rect) {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function Tag({ rect, text }: { readonly rect: Rect; readonly text: string }) {
  return (
    <View style={[styles.tag, { left: rect.left, top: Math.max(0, rect.top - 34) }]}>
      <SessionText face="chip" color={ON_TOMATO}>
        {text}
      </SessionText>
    </View>
  );
}

export interface PhotoOverlayProps {
  readonly read: CameraRead;
  /** The size the photo is drawn at: the whole screen. */
  readonly screen: Size;
  /** The few words pinned to what was picked: "Start here", "Box 3 only", "This one". */
  readonly tag: string | null;
}

/**
 * What the read found, drawn on the photo: one ring on a desk, the corners of a room with one
 * lit, the numbered boxes of a page, the one row of a screen. Everything else is dimmed, so the
 * photo shows a single place to start. Decoration only: the panel under it says the same in words.
 */
export function PhotoOverlay({ read, screen, tag }: PhotoOverlayProps) {
  if (read.kind === 'desk') {
    const ring = ringAround(boxOnScreen(read.thing.box, read.photo, screen));
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: SHADE }]} />
        {read.others.map((thing) => {
          const dot = boxOnScreen(thing.box, read.photo, screen);
          return (
            <View
              key={thing.id}
              style={[
                styles.dot,
                { left: dot.left + dot.width / 2 - 4, top: dot.top + dot.height / 2 - 4 },
              ]}
            />
          );
        })}
        <View style={[styles.ring, place(ring), { borderRadius: ring.width / 2 }]} />
        {tag ? <Tag rect={ring} text={tag} /> : null}
      </View>
    );
  }

  if (read.kind === 'room') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {read.zones.map((zone) => {
          const rect = boxOnScreen(zone.box, read.photo, screen);
          const lit = zone.letter === read.letter;
          return (
            <View
              key={zone.letter}
              style={[styles.zone, place(rect), lit ? styles.zoneLit : styles.zoneDim]}
            >
              <View style={[styles.letter, { backgroundColor: lit ? TOMATO : SHADE }]}>
                <SessionText face="chip" color={lit ? ON_TOMATO : WHITE}>
                  {zone.letter}
                </SessionText>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (read.kind === 'paper') {
    const picked = boxOnScreen(read.pick.box, read.photo, screen);
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: SHADE }]} />
        {read.boxes.map((box) => {
          const rect = boxOnScreen(box.box, read.photo, screen);
          const lit = box.id === read.pick.id;
          return (
            <View key={box.id} style={[styles.box, place(rect), lit && styles.boxLit]}>
              <View style={[styles.number, { backgroundColor: lit ? TOMATO : SHADE }]}>
                <SessionText face="chip" color={lit ? ON_TOMATO : WHITE}>
                  {String(box.number)}
                </SessionText>
              </View>
            </View>
          );
        })}
        {tag ? <Tag rect={picked} text={tag} /> : null}
      </View>
    );
  }

  if (read.kind === 'screen') {
    const row = boxOnScreen(read.pick, read.photo, screen);
    // The whole row across the screen, not only the words that named it.
    const band = { left: 8, top: row.top - 6, width: screen.width - 16, height: row.height + 12 };
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.shade, { top: 0, height: Math.max(0, band.top) }]} />
        <View style={[styles.shade, { top: band.top + band.height, bottom: 0 }]} />
        <View style={[styles.box, styles.boxLit, place(band)]} />
        {tag ? <Tag rect={band} text={tag} /> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 4, borderColor: TOMATO },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WHITE,
    opacity: 0.7,
  },
  tag: {
    position: 'absolute',
    backgroundColor: TOMATO,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  zone: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  zoneLit: { borderWidth: 4, borderColor: TOMATO },
  zoneDim: { backgroundColor: SHADE },
  letter: {
    position: 'absolute',
    left: 10,
    top: 10,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 6,
  },
  boxLit: { borderWidth: 3, borderColor: TOMATO, backgroundColor: 'rgba(255,255,255,0.12)' },
  number: {
    position: 'absolute',
    left: -12,
    top: -12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shade: { position: 'absolute', left: 0, right: 0, backgroundColor: SHADE },
});
