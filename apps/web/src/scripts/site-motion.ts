/**
 * The motion every page shares: sections arrive as they are scrolled to. With Reduce Motion
 * everything is simply there. Without this script everything is there too: the hidden start is
 * set only on pages where it runs (`html.js`).
 */
export function startSiteMotion(): void {
  const waiting = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const element of waiting) element.classList.add('in');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.classList.add('in');
      }
    },
    { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
  );
  for (const element of waiting) observer.observe(element);

  // A menu left open closes when one of its links is followed to a place on the same page.
  for (const menu of document.querySelectorAll<HTMLDetailsElement>('.nav-menu')) {
    menu.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) menu.open = false;
    });
  }
}
