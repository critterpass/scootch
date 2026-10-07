import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';

const entries: string[] = [];
const listeners = new Set<() => void>();
let snapshot = '';
const started = Date.now();

export function trace(message: string): void {
  const line = `${((Date.now() - started) / 1000).toFixed(1)} ${message}`;
  console.warn(`SCOOTCHTRACE ${line}`);
  entries.push(line);
  if (entries.length > 9) entries.shift();
  snapshot = entries.join('\n');
  listeners.forEach((listener) => listener());
}

export function TraceOverlay() {
  const text = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
  useEffect(() => {
    let beats = 0;
    const timer = setInterval(() => {
      beats += 1;
      if (beats % 5 === 0) trace(`beat ${beats}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Text pointerEvents="none" style={styles.overlay}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 60,
    left: 4,
    fontSize: 9,
    color: '#d00',
    backgroundColor: '#ffffffaa',
  },
});
