(function () {
  if (window.ScootchWebFX) return;
  const NOISE = 'url("data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>") + '")';
  const SPR = 'cubic-bezier(.32,.72,0,1)', BNC = 'cubic-bezier(.34,1.56,.64,1)';
  function grain() { document.querySelectorAll('[data-grain]').forEach(g => { if (!g._g) { g.style.backgroundImage = NOISE; g.style.backgroundSize = '180px 180px'; g._g = 1; } }); }
  function burst(host, n) {
    if (!host) return; const r = host.getBoundingClientRect(); const cols = ['#F0562E', '#FFD66B', '#7FB7FF', '#F49AC1', '#1C1A17'];
    for (let i = 0; i < (n || 22); i++) { const p = document.createElement('div'); const a = i / (n || 22) * Math.PI * 2, d = 120 + (i * 37 % 90); p.style.cssText = 'position:fixed;z-index:999;pointer-events:none;left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px;width:' + (i % 3 ? 7 : 11) + 'px;height:' + (i % 3 ? 12 : 6) + 'px;border-radius:2px;background:' + cols[i % 5];
      document.body.appendChild(p); p.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + Math.cos(a) * d * .8 + 'px),calc(-50% + ' + Math.sin(a) * d * .7 + 'px)) rotate(' + i * 40 + 'deg)', opacity: 1, offset: .3 }, { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px),calc(-50% + ' + (Math.sin(a) * d * .7 + 90) + 'px)) rotate(' + i * 80 + 'deg) scale(.7)', opacity: 0 }], { duration: 1500, delay: i * 8, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => p.remove(); }
  }
  function init(opts) {
    opts = opts || {}; const C = []; const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || opts.still;
    const down = e => { const b = e.target.closest && e.target.closest('[data-press]'); if (!b || RM) return; b._p = 1; b.animate([{ scale: 1 }, { scale: .95 }], { duration: 140, easing: 'ease-out', fill: 'forwards' }); C._pb = b; };
    const up = () => { const b = C._pb; if (!b) return; C._pb = null; b.animate([{ scale: .95 }, { scale: 1.03, offset: .55 }, { scale: 1 }], { duration: 420, easing: SPR, fill: 'forwards' }); };
    document.addEventListener('pointerdown', down); document.addEventListener('pointerup', up);
    C.push(() => { document.removeEventListener('pointerdown', down); document.removeEventListener('pointerup', up); });
    grain();
    const prog = () => { const f = document.querySelector('[data-prog-fill]'), r = document.querySelector('[data-prog-run]'); if (!f) return; const h = document.documentElement, p = Math.max(0, Math.min(1, scrollY / Math.max(1, h.scrollHeight - innerHeight))); f.style.width = (p * 100) + '%'; if (r) r.style.left = (p * 100) + '%'; };
    addEventListener('scroll', prog, { passive: true }); prog(); C.push(() => removeEventListener('scroll', prog));
    if (RM) return () => C.forEach(f => f());
    document.querySelectorAll('[data-marker]').forEach(m => m.animate([{ transform: 'rotate(-1.2deg) scaleX(0)' }, { transform: 'rotate(-1.2deg) scaleX(1)' }], { duration: 700, delay: 750, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' }));
    document.querySelectorAll('[data-rise]').forEach((w, i) => w.animate([{ transform: 'translateY(110%) rotate(6deg)' }, { transform: 'none' }], { duration: 900, delay: 120 + i * 90, easing: SPR, fill: 'backwards' }));
    const rev = [...document.querySelectorAll('[data-reveal], section h2')];
    rev.forEach(el => { el.style.opacity = 0; });
    const show = el => { if (el._shown) return; el._shown = 1; el.style.opacity = 1; if (el.dataset.reveal === 'stagger') [...el.children].forEach((c, k) => c.animate([{ opacity: 0, transform: 'translateY(36px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 900, delay: k * 90, easing: SPR, fill: 'backwards' })); else el.animate([{ opacity: 0, transform: 'translateY(30px)', clipPath: 'inset(0 0 35% 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }], { duration: 950, easing: SPR }); };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: .1 });
    rev.forEach(el => io.observe(el)); C.push(() => io.disconnect());
    const t1 = setTimeout(() => rev.forEach(show), 6000); C.push(() => clearTimeout(t1));
    const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; cio.unobserve(e.target); const el = e.target, n = +el.dataset.count, t0 = performance.now(); const st = () => { const p = Math.min(1, (performance.now() - t0) / 1400); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(st); }; st(); }), { threshold: .5 });
    document.querySelectorAll('[data-count]').forEach(c => cio.observe(c)); C.push(() => cio.disconnect());
    document.querySelectorAll('[data-bars] [data-bar]').forEach((b, i) => { b.style.transformOrigin = 'bottom'; });
    const bio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; bio.unobserve(e.target); [...e.target.querySelectorAll('[data-bar]')].forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.06)', offset: .7 }, { transform: 'scaleY(1)' }], { duration: 900, delay: i * 80, easing: SPR, fill: 'backwards' })); }), { threshold: .4 });
    document.querySelectorAll('[data-bars]').forEach(b => bio.observe(b)); C.push(() => bio.disconnect());
    document.querySelectorAll('[data-anim="bob"]').forEach((b, k) => b.animate([{ transform: 'translateY(0) rotate(-3deg)' }, { transform: 'translateY(-16px) rotate(3deg)' }], { duration: 2400 + k * 500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    document.querySelectorAll('[data-anim="peek"]').forEach((p, i) => p.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }], { duration: 1600 + i * 300, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    document.querySelectorAll('[data-anim="ghost"]').forEach((p, i) => p.animate([{ transform: 'translate(0,0) rotate(-4deg)' }, { transform: 'translate(10px,-18px) rotate(4deg)' }, { transform: 'translate(-8px,-6px) rotate(-2deg)' }, { transform: 'translate(0,0) rotate(-4deg)' }], { duration: 4200 + i * 400, iterations: Infinity, easing: 'ease-in-out' }));
    document.querySelectorAll('[data-chrome]').forEach(c => c.animate([{ backgroundPosition: '0 0%' }, { backgroundPosition: '0 100%' }], { duration: 4200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    document.querySelectorAll('[data-aurora]').forEach(a => [...a.children].forEach((b, k) => b.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + (k % 2 ? -60 : 70) + 'px,' + (k ? 70 : 40) + 'px) scale(1.2)' }], { duration: 7000 + k * 1800, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })));
    document.querySelectorAll('[data-track]').forEach(tr => { const a = tr.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: +(tr.dataset.track) > 1 ? +tr.dataset.track : 46000, iterations: Infinity }); const host = tr.parentNode; host.addEventListener('pointerenter', () => a.updatePlaybackRate(.2)); host.addEventListener('pointerleave', () => a.updatePlaybackRate(1)); });
    const P = { x: -1, y: -1, t: 0 };
    const mv = e => { P.x = e.clientX; P.y = e.clientY; P.t = performance.now(); document.querySelectorAll('[data-magnet]').forEach(m => { const r = m.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy); m.style.translate = d < 130 ? (dx * .22).toFixed(1) + 'px ' + (dy * .3).toFixed(1) + 'px' : '0 0'; m.style.transition = 'translate .35s ' + BNC + ',background .2s'; }); };
    addEventListener('pointermove', mv, { passive: true }); C.push(() => removeEventListener('pointermove', mv));
    let tilts = [], shims = [], frame = 0, raf;
    const scan = () => { tilts = [...document.querySelectorAll('[data-tilt]')]; tilts.forEach(el => { if (el._rx == null) { el._rx = 0; el._ry = 0; } el._holo = el.querySelector('[data-holo]'); el._glare = el.querySelector('[data-glare]'); }); shims = [...document.querySelectorAll('[data-shimmer]')]; grain(); };
    const tick = () => { const now = performance.now(), T = now / 1000; if (frame++ % 60 === 0) scan();
      tilts.forEach((el, i) => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; let tx, ty, hov = false;
        if (now - P.t < 1500 && P.x > r.left - 50 && P.x < r.right + 50 && P.y > r.top - 50 && P.y < r.bottom + 50) { const nx = (P.x - r.left) / r.width - .5, ny = (P.y - r.top) / r.height - .5; tx = -ny * 22; ty = nx * 26; hov = true; } else { tx = Math.sin(T * .9 + i) * 5; ty = Math.sin(T * .6 + i * 2) * 9; }
        el._rx += (tx - el._rx) * .12; el._ry += (ty - el._ry) * .12;
        el.style.transform = (el.dataset.base || '') + ' rotateX(' + el._rx.toFixed(2) + 'deg) rotateY(' + el._ry.toFixed(2) + 'deg)' + (hov ? ' scale(1.03)' : '');
        const px = 50 + el._ry * 2.6, py = 50 - el._rx * 2.6;
        if (el._holo) el._holo.style.backgroundPosition = px + '% ' + py + '%';
        if (el._glare) el._glare.style.background = 'radial-gradient(circle at ' + px + '% ' + (py - 20) + '%,rgba(255,255,255,.75),transparent 50%)';
      });
      shims.forEach((s, i) => { s.style.backgroundPosition = (50 + Math.sin(T * .8 + i) * 45) + '% ' + (50 + Math.cos(T * .5 + i) * 30) + '%'; });
      raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); C.push(() => cancelAnimationFrame(raf));
    return () => C.forEach(f => f());
  }
  window.ScootchWebFX = { init, burst, grain, SPR, BNC };
})();
