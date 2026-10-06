/** The most the card leans, in degrees. */
const lean = 12;

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Tilts a card towards the pointer on a desktop, and with the phone's own motion after one tap
 * to allow it. With Reduce Motion the card stays still and nothing listens.
 */
export function startCardTilt(card: HTMLElement, allow: HTMLElement | null): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.dataset['tilt'] = 'off';
    return;
  }
  card.dataset['tilt'] = 'on';
  const tilt = (x: number, y: number): void => {
    card.style.transform = `rotateY(${clamp(x) * lean}deg) rotateX(${-clamp(y) * lean}deg)`;
    // The sheen follows the lean.
    card.style.setProperty('--sheen', `${50 + clamp(x) * 40}%`);
  };

  card.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const box = card.getBoundingClientRect();
    tilt(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      ((event.clientY - box.top) / box.height) * 2 - 1,
    );
  });
  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });

  // Phones: device motion, after one tap. iOS asks its own question at that tap.
  if (!allow || !window.matchMedia('(pointer: coarse)').matches) return;
  if (typeof DeviceOrientationEvent === 'undefined') return;
  allow.hidden = false;
  allow.addEventListener('click', () => {
    void (async () => {
      const ask = (DeviceOrientationEvent as unknown as MotionPermission).requestPermission;
      if (ask && (await ask().catch(() => 'denied')) !== 'granted') return;
      allow.hidden = true;
      window.addEventListener('deviceorientation', (event) => {
        // Held upright at about 45 degrees is the card at rest.
        tilt((event.gamma ?? 0) / 30, ((event.beta ?? 45) - 45) / 30);
      });
    })();
  });
}
