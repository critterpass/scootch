import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { fonts as typefaces } from '@phusclass/tokens';

/** The ShareSheet board's inks: the sheet is light paper in both appearances. */
export const SHEET = '#FFFDF8';
export const INK = '#1C1A18';
export const MUTED = '#8A7F74';
export const CHIP = 'rgba(28,26,24,0.06)';

/** The three targets' marks: a story frame, a tray with an arrow, three dots. */
export function ActionGlyph({ kind }: { readonly kind: 'story' | 'save' | 'share' }): ReactElement {
  if (kind === 'story') return <View style={styles.storyGlyph} />;
  if (kind === 'save') {
    return (
      <View style={styles.saveGlyph}>
        <View style={styles.saveStem} />
        <View style={styles.saveTray} />
      </View>
    );
  }
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={styles.dot} />
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  page: { flex: 1, backgroundColor: SHEET },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(30,22,14,0.36)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: SHEET,
    boxShadow: '0 -10px 30px rgba(40,30,20,0.12)',
  },
  grabber: {
    alignSelf: 'center',
    marginTop: 10,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(28,26,24,0.16)',
  },
  content: { paddingHorizontal: 22, paddingTop: 12, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: {
    flex: 1,
    fontFamily: typefaces.body,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: INK,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CHIP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { color: INK, fontFamily: typefaces.body, paddingVertical: 24 },
  previewWrap: { alignItems: 'center' },
  preview: { borderRadius: 10, overflow: 'hidden', boxShadow: '0 18px 40px rgba(40,30,20,0.16)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    justifyContent: 'center',
  },
  chipLabel: { fontFamily: typefaces.body, fontWeight: '700' },
  hideRow: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(60,40,20,0.06)',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tapeIcon: {
    width: 30,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
    transform: [{ rotate: '-6deg' }],
  },
  hideWords: { flex: 1 },
  hideTitle: { fontFamily: typefaces.body, fontWeight: '600', color: INK },
  hideDetail: { fontFamily: typefaces.body, color: MUTED },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionsStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  action: { alignItems: 'center', gap: 6, minWidth: 72 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: typefaces.body, color: '#3E3933', textAlign: 'center' },
  status: { fontFamily: typefaces.body, color: MUTED, textAlign: 'center' },
  storyGlyph: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF' },
  saveGlyph: { alignItems: 'center', gap: 3 },
  saveStem: { width: 2, height: 13, borderRadius: 1, backgroundColor: INK },
  saveTray: { width: 18, height: 2, borderRadius: 1, backgroundColor: INK },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: INK },
});
