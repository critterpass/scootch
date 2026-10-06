(function () {
  if (customElements.get('scootch-critter')) return;
  const PI = Math.PI;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function hash(a) { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ell(cx, cy, rx, ry, n = 20, wob = 0, ph = 0, rot = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2, k = 1 + wob * (Math.sin(3 * a + ph) * .6 + Math.sin(5 * a - ph * 1.3) * .4);
      let x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      if (rot) { const c = Math.cos(rot), s = Math.sin(rot); [x, y] = [x * c - y * s, x * s + y * c]; }
      pts.push([cx + x, cy + y]);
    }
    return pts;
  }
  function bez(p0, p1, p2, p3, n = 8) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return pts;
  }
  function ribbon(cl, w0, w1, bulge) {
    const A = [], B = [], n = cl.length - 1;
    cl.forEach((p, i) => { const q = cl[Math.min(i + 1, n)], o = cl[Math.max(i - 1, 0)], dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy) || 1, f = i / n, th = w0 + (w1 - w0) * f + (bulge || 0) * Math.sin(PI * f); A.push([p[0] - dy / L * th, p[1] + dx / L * th]); B.unshift([p[0] + dy / L * th, p[1] - dx / L * th]); });
    return A.concat(B);
  }

  class Pen {
    constructor(ctx, frame, seed) { this.c = ctx; this.f = frame; this.n = 0; this.seed = seed; this.ink = '#1C1A17'; }
    r(i) { return hash(this.f * 7919 + this.n * 104729 + i * 31 + this.seed); }
    jit(pts, j) { this.n++; return pts.map((p, i) => [p[0] + (this.r(i * 2) - .5) * 2 * j, p[1] + (this.r(i * 2 + 1) - .5) * 2 * j]); }
    path(pts, closed, keep) {
      const c = this.c; if (!keep) c.beginPath();
      if (pts.length < 3) { c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); return; }
      if (closed) {
        const m0 = mid(pts[pts.length - 1], pts[0]); c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < pts.length; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % pts.length]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
        c.closePath();
      } else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) { const m = mid(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
        const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]);
      }
    }
    fill(pts, color, j = .38) { this.path(this.jit(pts, j), true); this.c.fillStyle = color; this.c.fill(); }
    line(pts, w = 2.8, color, j = .38) { const c = this.c; c.strokeStyle = color || this.ink; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; this.path(this.jit(pts, j), false); c.stroke(); }
    blot(x, y, r, color, j = .12) { this.fill(ell(x, y, r, r, 10), color, j); }
  }

  // riso fill: flat ink, overprinted shade crescent, grain
  function riso(pen, pts, fill, shade, cx, cy, o = {}) {
    const c = pen.c, J = pen.jit(pts, .38);
    pen.path(J, true); c.fillStyle = fill; c.fill();
    if (o.shade === false) return;
    const sd = o.sd || 8;
    c.save(); pen.path(J, true); c.clip();
    c.beginPath(); pen.path(J, true, true); pen.path(J.map(p => [p[0] - sd, p[1] - sd * 1.1]), true, true); c.clip('evenodd');
    c.fillStyle = shade; c.globalAlpha = .9; c.fillRect(cx - 140, cy - 140, 280, 280); c.restore();
    if (o.grain !== false) {
      c.save(); pen.path(J, true); c.clip(); c.fillStyle = shade; c.globalAlpha = .55;
      const n = o.grainN || 120, w = o.gw || 70, h = o.gh || 60;
      for (let i = 0; i < n; i++) { const x = cx + (hash(pen.seed + i * 3) - .25) * w, y = cy + (hash(pen.seed + i * 3 + 1) - .2) * h; c.beginPath(); c.arc(x, y, .55 + hash(i + 9) * .5, 0, PI * 2); c.fill(); }
      c.restore();
    }
  }

  const SK = { body: '#F0562E', shade: '#C63F22', ink: '#1C1A17', white: '#FFFCF7', mouth: '#5A1E14', tongue: '#F49A84', blush: '#FF9A80', hi: '#F98468', fx: '#1C1A17', cloud: '#DED6CA' };
  const SK_PAPER = Object.assign({}, SK, { body: '#FBF8F2', shade: '#E2D8C8', hi: '#FFFFFF', blush: '#F7B5A3', fx: '#FBF8F2', cloud: '#FBF8F2' });
  const SK_DARK = Object.assign({}, SK, { fx: '#F6F3EE', cloud: '#4A443E' });
  const MON = { body: '#3A3430', shade: '#221E1B', spot: '#4F4741', horn: '#EDE6DA', white: '#FFFCF7', ink: '#1C1A17' };

  function emo(m, t) {
    const E = { dy: 0, sx: 1, sy: 1, lean: 0, rot: 0, bounce: 0, eye: 'round', open: 1, tilt: 0, lx: 0, ly: 0, pup: .58, gloss: false, brows: false, bl: [0, 0], br: [0, 0], mouth: 'smile', mw: 1, mx: 0, blush: .7, hl: [1.04, .64], hr: [1.04, .64], fx: null, tip: 0 };
    const S = Math.sin, b0 = S(t * 2) * .014; E.sy += b0; E.sx -= b0 * .6;
    switch (m) {
      case 'waiting': E.lean = S(t * .5) * 2.5; E.open = .6; E.lx = .75; E.ly = -.1; E.mouth = 'flat'; E.mw = .7; E.hr = [1.12, .5 - Math.abs(S(t * 5)) * .14]; E.brows = true; E.bl = E.br = [3, 0]; E.fx = 'dots'; break;
      case 'listening': E.dy = -3 + S(t * 2.4) * 1.2; E.sy += .04; E.sx -= .03; E.open = 1.12; E.pup = .5; E.ly = -.25; E.lx = -.15; E.brows = true; E.bl = E.br = [-6, -.15]; E.mouth = 'o'; E.mw = .8; E.hl = [1.0, -.28]; E.lean = -2; E.fx = 'waves'; break;
      case 'thinking': E.lx = -.6; E.ly = -.65; E.open = .92; E.brows = true; E.bl = [-7, -.25]; E.br = [1, .12]; E.mouth = 'side'; E.mx = .35; E.hr = [.32, .7]; E.rot = -.05; E.fx = 'think'; break;
      case 'bargaining': E.open = 1.06; E.pup = .74; E.gloss = true; E.ly = -.3; E.brows = true; E.bl = E.br = [-3, -.38]; E.mouth = 'pout'; E.mw = .8; E.hl = [-.02, .78]; E.hr = [-.02, .78]; E.sx += S(t * 22) * .005; E.lean = S(t * 1.2) * 1.5; E.blush = 1; break;
      case 'scheming': { E.open = .42; E.tilt = .55; E.lx = S(t * 1.5) > 0 ? .75 : -.25; E.ly = .1; E.brows = true; E.bl = E.br = [3, .45]; E.mouth = 'cat'; E.mx = .3; const p = S(t * 6) * .03; E.hl = [.2, .74 + p]; E.hr = [.2, .74 - p]; E.dy = 1; E.sy -= .02; E.fx = 'glint'; break; }
      case 'working': E.open = .55; E.ly = .8; E.pup = .52; E.brows = true; E.bl = E.br = [1, .16]; E.mouth = 'tongue'; E.mx = .3; E.hl = [.42, .9 + S(t * 16) * .05]; E.hr = [.42, .9 + S(t * 16 + 1.7) * .05]; E.fx = 'laptop'; break;
      case 'stuck': E.open = .98; E.pup = .44; E.lx = S(t * 3.1) * .65; E.brows = true; E.bl = E.br = [-3, -.32]; E.mouth = 'wobble'; E.hl = [.46, .68 + S(t * 9) * .025]; E.hr = [.46, .68 - S(t * 9) * .025]; E.sx += S(t * 30) * .004; E.fx = 'sweat'; break;
      case 'celebrate': { const b = Math.abs(S(t * 5.5)); E.bounce = b; E.dy = -b * 22; const land = Math.pow(1 - b, 6); E.sy = 1 - land * .16 + b * .06; E.sx = 1 + land * .12 - b * .04; E.eye = 'happy'; E.mouth = 'grin'; E.mw = 1.25; E.hl = [1.12 + S(t * 11) * .1, -1.02]; E.hr = [1.12 + S(t * 11 + 1) * .1, -1.02]; E.brows = true; E.bl = E.br = [-6, -.12]; E.blush = 1.1; E.fx = 'confetti'; E.tip = Math.cos(t * 5.5) * 5; break; }
      case 'proud': E.eye = 'sparkle'; E.mouth = 'grin'; E.mw = .9; E.hl = [0, .78]; E.hr = [0, .78]; E.blush = 1.2; E.dy = S(t * 3) * 2 - 2; E.sy += S(t * 6) * .015; E.brows = true; E.bl = E.br = [-5, -.1]; E.fx = 'stars'; break;
      case 'dramatic': E.rot = -.1 + S(t * 1.3) * .03; E.eye = 'squeeze'; E.mouth = 'wail'; E.hr = [.62, -.78]; E.hl = [1.32, -.25 + S(t * 2) * .06]; E.brows = true; E.bl = E.br = [-4, -.42]; E.lean = -3; E.fx = 'tears'; break;
      case 'sulk': E.dy = 4; E.sy = .88; E.sx = 1.08; E.open = .58; E.lx = -.8; E.ly = .35; E.brows = true; E.bl = E.br = [1, .3]; E.mouth = 'pout'; E.hl = [-.42, .72]; E.hr = [-.42, .8]; E.blush = .9; E.rot = .03; E.fx = 'cloud'; break;
      case 'sleepy': E.eye = 'closed'; E.mouth = 'smile'; E.mw = .55; E.dy = S(t * 1.2) * 1.5; E.sy += S(t * 1.2) * .02; E.hl = [1.0, .7]; E.hr = [1.0, .7]; E.rot = S(t * .6) * .03; E.fx = 'zzz'; break;
      case 'nudge': E.eye = 'happy'; E.mouth = 'smile'; E.hr = [1.25, -.5 + S(t * 9) * .12]; E.lean = 3; E.blush = 1; E.fx = 'stars'; break;
      case 'shocked': E.open = 1.2; E.pup = .34; E.mouth = 'o'; E.mw = 1.2; E.brows = true; E.bl = E.br = [-9, -.1]; E.hl = [.55, .2]; E.hr = [.55, .2]; E.dy = -2 + S(t * 40) * .6; E.sy += .05; break;
    }
    if (E.eye === 'round' && (t % 3.7) < .12) E.open = .06;
    return E;
  }

  function bodyPts(cx, cy, rx, ry, lean, ph) {
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * PI * 2; let x = Math.cos(a), y = Math.sin(a);
      if (y > 0) { y *= .8; x *= 1 + .07 * y; } else x *= 1 - .1 * y * y;
      const k = 1 + .012 * Math.sin(3 * a + ph) + .008 * Math.sin(5 * a - ph);
      pts.push([cx + x * rx * k + Math.max(0, -y) * lean * 1.2, cy + y * ry * k]);
    }
    return pts;
  }

  function eye(pen, K, E, x, y, s, r, lid, t) {
    const c = pen.c;
    if (E.eye === 'happy') { pen.line([[x - r * .75, y + r * .25], [x - r * .45, y - r * .3], [x, y - r * .5], [x + r * .45, y - r * .3], [x + r * .75, y + r * .25]], 3.6, K.ink); return; }
    if (E.eye === 'closed') { pen.line([[x - r * .75, y], [x - r * .4, y + r * .35], [x, y + r * .45], [x + r * .4, y + r * .35], [x + r * .75, y]], 3.2, K.ink); pen.line([[x + s * r * .72, y + r * .05], [x + s * r * 1.02, y + r * .3]], 2.2, K.ink); return; }
    if (E.eye === 'squeeze') { pen.line([[x + s * r * .6, y - r * .5], [x - s * r * .5, y], [x + s * r * .6, y + r * .5]], 3.6, K.ink); return; }
    const ew = r * .9, eh = r * 1.08 * Math.max(1, E.open), sc = ell(x, y, ew, eh, 18);
    pen.fill(sc, K.white, .2);
    c.save(); pen.path(sc, true); c.clip();
    if (E.eye === 'sparkle') {
      const st = [], rr = r * .72 * (1 + Math.sin(t * 8) * .08);
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 - PI / 2 + t * .8, q = i % 2 ? rr * .32 : rr; st.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
      pen.fill(st, K.ink, .1);
    } else {
      const pr = r * E.pup, px = x + E.lx * (ew - pr * .75) * .75, py = y + E.ly * (eh - pr * .75) * .75;
      pen.fill(ell(px, py, pr * .92, pr, 14), K.ink, .15);
      pen.blot(px - pr * .34, py - pr * .4, pr * (E.gloss ? .42 : .32), K.white, .06);
      pen.blot(px + pr * .32, py + pr * .34, pr * .15, K.white, .06);
      if (E.gloss) pen.blot(px + pr * .38, py - pr * .52, pr * .14, K.white, .06);
    }
    if (E.open < 1) {
      const ly0 = y - eh + 2 * eh * (1 - E.open), iy = ly0 + E.tilt * eh * .55, oy = ly0 - E.tilt * eh * .55;
      const yl = s === 1 ? iy : oy, yr = s === 1 ? oy : iy;
      c.fillStyle = lid; c.beginPath(); c.moveTo(x - ew - 4, y - eh - 4); c.lineTo(x + ew + 4, y - eh - 4); c.lineTo(x + ew + 4, yr); c.lineTo(x - ew - 4, yl); c.closePath(); c.fill();
      pen.line([[x - ew - 2, yl], [x + ew + 2, yr]], 2.6, K.ink, .2);
    }
    c.restore();
  }

  function mouth(pen, K, E, x, y, t) {
    const w = 9 * E.mw, c = pen.c, I = K.ink;
    switch (E.mouth) {
      case 'smile': pen.line([[x - w, y - 1], [x - w * .5, y + w * .32], [x, y + w * .45], [x + w * .5, y + w * .32], [x + w, y - 1]], 2.8, I); break;
      case 'flat': pen.line([[x - w * .6, y], [x + w * .6, y + .6]], 2.8, I); break;
      case 'side': pen.line([[x - w * .5, y + 1.5], [x + w * .2, y], [x + w * .6, y - 1.5]], 2.8, I); break;
      case 'o': pen.fill(ell(x, y + 2, w * .38, w * .5, 12), K.mouth, .2); break;
      case 'grin': {
        const pts = [[x - w, y - 2], [x - w * .5, y - 1], [x, y - .6], [x + w * .5, y - 1], [x + w, y - 2]];
        for (let i = 1; i < 8; i++) { const a = i / 8 * PI; pts.push([x + Math.cos(a) * w, y - 1.5 + Math.sin(a) * w * 1.05]); }
        pen.fill(pts, K.mouth, .2);
        c.save(); pen.path(pts, true); c.clip(); pen.blot(x + w * .1, y + w * .85, w * .58, K.tongue, .1); c.restore(); break;
      }
      case 'wobble': pen.line([[x - w * .8, y], [x - w * .4, y - 2.2], [x, y + 1], [x + w * .4, y - 2.2], [x + w * .8, y]], 2.6, I); break;
      case 'pout': pen.line([[x - w * .45, y + 2.5], [x, y - 1.5], [x + w * .45, y + 2.5]], 3, I); break;
      case 'cat': pen.line([[x - w * .85, y - 2], [x - w * .45, y + 2.6], [x, y - .2], [x + w * .45, y + 2.6], [x + w * .85, y - 2]], 2.6, I); break;
      case 'tongue': pen.fill(ell(x + w * .38, y + 3.2, 3.6, 4, 10), K.tongue, .15); pen.line([[x - w * .55, y], [x + w * .6, y]], 2.8, I); break;
      case 'wail': pen.fill(ell(x, y + 3, w * .7, w * .58, 12, .22, t * 6), K.mouth, .2); break;
    }
  }

  function star(cx, cy, s) { const st = []; for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 - PI / 2, q = i % 2 ? s * .3 : s; st.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return st; }
  function drop(x, y, s = 1) { return [[x, y - 9 * s], [x + 5 * s, y - 1 * s], [x + 5.5 * s, y + 3 * s], [x + 3 * s, y + 6.5 * s], [x, y + 7.5 * s], [x - 3 * s, y + 6.5 * s], [x - 5.5 * s, y + 3 * s], [x - 5 * s, y - 1 * s]]; }

  function fx(pen, K, E, t, g) {
    const c = pen.c, F = K.fx;
    switch (E.fx) {
      case 'dots': { const n = Math.floor(t * 1.6) % 4; for (let i = 0; i < n; i++) pen.blot(g.cx + 58 + i * 10, g.top + 6, 3, F); break; }
      case 'waves': for (let k = 0; k < 3; k++) { const R = 10 + k * 9, pts = []; for (let i = 0; i <= 6; i++) { const a = PI - .55 + i / 6 * 1.1; pts.push([g.cx - 60 + Math.cos(a) * R, g.cy + Math.sin(a) * R]); } c.globalAlpha = .25 + .75 * ((t * 1.6 - k * .33) % 1 + 1) % 1; pen.line(pts, 2.4, F); c.globalAlpha = 1; } break;
      case 'think': [[-58, 8, 3], [-70, -6, 4.6], [-80, -26, 8]].forEach(([dx, dy, r], i) => { c.globalAlpha = .4 + .6 * ((Math.sin(t * 3 - i) + 1) / 2); pen.fill(ell(g.cx + dx, g.top + dy + 22, r, r, 10), K.cloud); c.globalAlpha = 1; }); break;
      case 'glint': { const s = 4 + Math.abs(Math.sin(t * 4)) * 4; pen.fill(star(g.cx + 52, g.top + 10, s), F, .1); break; }
      case 'sweat': pen.fill(drop(g.cx + 48, g.top + 32 + Math.sin(t * 3) * 2), '#9FC4DE', .2); break;
      case 'stars': [[-66, 16, 0], [64, 4, 1.4], [70, 50, 2.6], [-72, 60, 3.6]].forEach(([dx, dy, ph], i) => { const s = 3 + Math.abs(Math.sin(t * 4 + ph)) * 5; pen.fill(star(g.cx + dx, g.top + dy, s), i % 2 ? K.body : F, .1); }); break;
      case 'zzz': for (let i = 0; i < 3; i++) { const k = ((t * .45 + i / 3) % 1), z = 3 + k * 5, x = g.cx + 46 + k * 22, y = g.top + 18 - k * 34; c.globalAlpha = Math.min(1, (1 - k) * 2); pen.line([[x - z, y - z], [x + z, y - z], [x - z, y + z], [x + z, y + z]], 2.4, F); c.globalAlpha = 1; } break;
      case 'cloud': { const x = g.cx + 4, y = g.top - 2; pen.fill(ell(x, y, 26, 11, 14, .16, 1), K.cloud); for (let i = 0; i < 3; i++) { const yy = y + 15 + ((t * 18 + i * 7) % 16); pen.line([[x - 12 + i * 12, yy], [x - 14 + i * 12, yy + 5]], 2.2, '#9FC4DE'); } break; }
      case 'confetti': for (let i = 0; i < 18; i++) { const x = 100 + (hash(i + 7) * 2 - 1) * 92, sp = 40 + hash(i + 50) * 50, y = ((t * sp + hash(i + 99) * 210) % 210) - 10, rot = t * (2 + hash(i + 3) * 4) + i, dx = Math.cos(rot) * 4, dy = Math.sin(rot) * 4; pen.line([[x - dx, y - dy], [x + dx, y + dy]], 3.2, i % 3 ? SK.body : F, .2); } break;
    }
  }

  const PAL = { paper: '#FBF8F2', grey: '#D6CDBF', stone: '#B8AC97', tan: '#D9B98C', dark: '#3A3430', water: '#8EBBDA', leaf: '#78A57F', gold: '#F2C46B' };
  const lp = (t, sp, off = 0) => (((t * sp + off) % 1) + 1) % 1;
  function rr(x, y, w, h, r = 3) { return [[x + r, y], [x + w - r, y], [x + w, y], [x + w, y + r], [x + w, y + h - r], [x + w, y + h], [x + w - r, y + h], [x + r, y + h], [x, y + h], [x, y + h - r], [x, y + r], [x, y]]; }
  function rot(pts, cx, cy, a) { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); }
  const OL = (pen, pts, w = 1.6, col = '#1C1A17') => pen.line(pts.concat([pts[0], pts[1]]), w, col, .2);
  const FO = (pen, pts, col, w = 1.6) => { pen.fill(pts, col, .25); OL(pen, pts, w); };
  const desk = (pen, g, w = 76) => pen.line([[g.cx - w, g.by], [g.cx + w, g.by]], 2.6, '#1C1A17', .2);
  const alpha = (pen, a, f) => { const c = pen.c, o = c.globalAlpha; c.globalAlpha = o * Math.max(0, Math.min(1, a)); f(); c.globalAlpha = o; };
  function laptop(pen, K, g, lid = PAL.grey, mark) { desk(pen, g); pen.fill([[g.cx - 26, g.by - 2], [g.cx + 26, g.by - 2], [g.cx + 22, g.by - 19], [g.cx - 22, g.by - 19]], lid, .3); if (mark) mark(); else pen.blot(g.cx + 5, g.by - 11, 2.8, K.body); }
  function bubble(pen, x, y, r, a = 1) { alpha(pen, a, () => { const p = ell(x, y, r, r, 12); pen.fill(p, 'rgba(255,255,255,.9)', .15); OL(pen, p, 1.2, 'rgba(28,26,23,.4)'); pen.blot(x - r * .35, y - r * .35, r * .22, '#fff', .05); }); }
  function heart(x, y, s) { const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); p.push([x + hx * s, y + hy * s]); } return p; }
  function glasses(pen, g) { for (const s of [-1, 1]) pen.line(ell(g.fx + s * g.gap, g.ey, 15, 15, 16).concat([ell(g.fx + s * g.gap, g.ey, 15, 15, 16)[0], ell(g.fx + s * g.gap, g.ey, 15, 15, 16)[1]]), 2.4, '#1C1A17', .15); pen.line([[g.fx - g.gap + 15, g.ey - 2], [g.fx, g.ey - 5], [g.fx + g.gap - 15, g.ey - 2]], 2.4, '#1C1A17', .15); }
  function beret(pen, g) { const hx = g.cx - 8, hy = g.cy - g.ry + 3; riso(pen, ell(hx, hy, 32, 11, 18, .05, 0, -.2), '#2C2724', '#171412', hx, hy, { sd: 4, grainN: 50 }); pen.blot(hx + 4, hy - 11, 3.4, '#2C2724'); }
  const steam = (pen, x, y, n = 3, sp = .5) => { for (let i = 0; i < n; i++) { const k = lp(Date.now() / 1000, sp, i / n); alpha(pen, (1 - k) * .8, () => pen.line([[x + i * 7 - 7, y - k * 22], [x + i * 7 - 4, y - 6 - k * 22], [x + i * 7 - 7, y - 12 - k * 22], [x + i * 7 - 4, y - 18 - k * 22]], 1.8, '#9A9084', .2)); } };

  const WORK = {
    email: { p(E) { E.mouth = 'tongue'; }, f(pen, K, g) { laptop(pen, K, g); },
      x(pen, K, g, t) { for (let i = 0; i < 2; i++) { const k = lp(t, .55, i * .5), x = g.cx + 24 + k * 58, y = g.by - 40 - k * 92, an = -.3 + k * .7; alpha(pen, k < .75 ? 1 : (1 - k) / .25, () => { const e = rot(rr(x - 10, y - 7, 20, 14, 2), x, y, an); FO(pen, e, PAL.paper); pen.line(rot([[x - 10, y - 7], [x, y + 1], [x + 10, y - 7]], x, y, an), 1.6, '#1C1A17', .15); }); } } },
    writing: { p(E, t) { E.open = .62; E.ly = .85; E.lx = .35; E.mouth = 'side'; E.mx = .3; E.hl = [.55, .84]; E.hr = [.3 + Math.sin(t * 3.4) * .14, .9 + Math.sin(t * 13) * .03]; E.brows = true; E.bl = E.br = [1, .18]; },
      f(pen, K, g, t) { desk(pen, g); const p = rot(rr(g.cx - 34, g.by - 20, 68, 24, 2), g.cx, g.by - 8, -.05); FO(pen, p, PAL.paper); const n = Math.floor(lp(t, .25) * 4) + 1; for (let i = 0; i < Math.min(3, n); i++) { const y = g.by - 15 + i * 6, L = i === n - 1 ? 40 * lp(t * 4, .25) : 44; const pts = []; for (let k = 0; k <= 8; k++) pts.push([g.cx - 28 + k * L / 8, y + Math.sin(k * 2 + i) * 1.2]); pen.line(pts, 1.4, '#6F6A62', .1); } },
      o(pen, K, g) { const [x, y] = g.hR; pen.line([[x - 2, y - 6], [x + 9, y + 12]], 3.4, '#1C1A17', .1); pen.blot(x + 10, y + 13, 1.6, K.body, .05); } },
    reading: { p(E, t) { E.open = .7; E.ly = .9; E.mouth = 'smile'; E.mw = .5; E.hl = [.62, .86]; E.hr = [.62, .86]; E.dy = Math.sin(t * 1.5) * .6; },
      o(pen, K, g, t) { const cx = g.cx, y = g.by - 2; for (const s of [-1, 1]) pen.fill([[cx, y - 16], [cx + s * 42, y - 20], [cx + s * 44, y + 10], [cx, y + 13]], K.shade, .3); for (const s of [-1, 1]) { const pg = [[cx, y - 14], [cx + s * 38, y - 18], [cx + s * 40, y + 7], [cx, y + 10]]; FO(pen, pg, PAL.paper, 1.2); for (let i = 0; i < 4; i++) pen.line([[cx + s * 8, y - 10 + i * 5], [cx + s * 32, y - 13 + i * 5]], 1.2, '#B5AEA4', .1); }
        const k = lp(t, .3); if (k < .3) { const f = Math.cos(k / .3 * PI); FO(pen, [[cx, y - 14], [cx + 38 * f, y - 18 - 6 * Math.sin(k / .3 * PI)], [cx + 40 * f, y + 7], [cx, y + 10]], '#fff', 1.2); } } },
    studying: { p(E, t) { E.open = .9; E.pup = .5; E.brows = true; E.bl = E.br = [-2, -.3]; E.mouth = 'wobble'; E.ly = .7; E.hl = [1.1, .72]; E.hr = [.3 + Math.sin(t * 2.6) * .16, .9]; },
      b(pen, K, g) { const x = g.cx - g.rx - 30; [[PAL.dark, 0, 34], [K.shade, -3, 32], [PAL.leaf, 2, 30]].forEach(([col, dx, w], i) => FO(pen, rr(x + dx - w / 2, g.by - 11 - i * 11, w, 11, 2), col)); },
      a(pen, K, g) { glasses(pen, g); },
      f(pen, K, g, t) { desk(pen, g); FO(pen, rr(g.cx - 30, g.by - 16, 60, 18, 2), PAL.paper, 1.2); alpha(pen, .55, () => pen.line([[g.cx - 24, g.by - 9], [g.cx - 24 + 44 * lp(t, .4), g.by - 9]], 6, PAL.gold, .1)); },
      o(pen, K, g) { const [x, y] = g.hR; pen.fill(rot(rr(x - 3, y - 12, 7, 20, 2), x, y, .5), PAL.gold, .2); pen.blot(x + 6, y + 9, 2.4, PAL.dark, .1); },
      x(pen, K, g, t) { pen.fill([[g.cx + 54, g.top + 20 + Math.sin(t * 3) * 2 - 9], [g.cx + 59, g.top + 19 + Math.sin(t * 3) * 2], [g.cx + 54, g.top + 27 + Math.sin(t * 3) * 2], [g.cx + 49, g.top + 19 + Math.sin(t * 3) * 2]], PAL.water, .2); } },
    coding: { p(E) { E.open = .5; E.ly = .78; E.mouth = 'flat'; E.brows = true; E.bl = E.br = [2, .22]; },
      a(pen, K, g) { glasses(pen, g); },
      f(pen, K, g) { laptop(pen, K, g, PAL.dark, () => { pen.line([[g.cx - 6, g.by - 14], [g.cx - 10, g.by - 10], [g.cx - 6, g.by - 6]], 1.8, K.body, .1); pen.line([[g.cx + 6, g.by - 14], [g.cx + 10, g.by - 10], [g.cx + 6, g.by - 6]], 1.8, K.body, .1); pen.line([[g.cx + 2, g.by - 15], [g.cx - 2, g.by - 5]], 1.8, K.body, .1); }); },
      x(pen, K, g, t) { for (let i = 0; i < 3; i++) { const k = lp(t, .3, i / 3), x = g.cx - 56 + i * 56 + Math.sin(t + i) * 4, y = g.top + 34 - k * 40, s = i === 1 ? -1 : 1; alpha(pen, Math.sin(k * PI), () => pen.line([[x + 3 * s, y - 7], [x, y - 6], [x + s, y - 1], [x - 2 * s, y], [x + s, y + 1], [x, y + 6], [x + 3 * s, y + 7]], 2, '#1C1A17', .1)); } } },
    calling: { p(E, t) { E.open = .9; E.lx = .5; E.ly = -.2; E.mouth = Math.floor(t * 5) % 2 ? 'o' : 'smile'; E.mw = .7; E.hr = [1.0, -.05]; E.hl = [1.2, .3 + Math.sin(t * 3) * .15]; E.brows = true; E.bl = E.br = [-3, -.1]; E.lean = Math.sin(t * .8) * 2; },
      o(pen, K, g) { const [x, y] = g.hR; pen.fill(rot(rr(x - 6, y - 18, 12, 28, 3), x, y - 4, .25), PAL.dark, .2); },
      x(pen, K, g, t) { const [x, y] = g.hR; for (let k = 0; k < 2; k++) { const R = 14 + k * 8, pts = []; for (let i = 0; i <= 6; i++) { const a = -.6 + i / 6 * 1.2; pts.push([x + 6 + Math.cos(a) * R, y - 8 + Math.sin(a) * R]); } alpha(pen, .3 + .7 * lp(t, 1.6, -k * .3), () => pen.line(pts, 2.2, '#1C1A17', .2)); } } },
    texting: { p(E, t) { E.open = .65; E.ly = .92; E.mouth = 'cat'; E.mx = 0; E.hl = [.24 + Math.sin(t * 14) * .03, .82]; E.hr = [.24 + Math.sin(t * 14 + 1.4) * .03, .82]; },
      o(pen, K, g) { const x = g.cx, y = g.cy + g.ry * .6; pen.fill(rr(x - 12, y, 24, 34, 5), PAL.dark, .2); pen.fill(rr(x - 9, y + 3, 18, 26, 3), '#EDE6DA', .2); },
      x(pen, K, g, t) { for (let i = 0; i < 2; i++) { const k = lp(t, .45, i * .5), x = g.cx + (i ? -58 : 52), y = g.top + 30 - k * 26; alpha(pen, Math.sin(k * PI) * 1.4, () => { FO(pen, rr(x - 15, y - 9, 30, 18, 8), i ? K.body : PAL.paper, 1.4); for (let d = 0; d < 3; d++) pen.blot(x - 7 + d * 7, y, 1.8, i ? '#fff' : '#1C1A17', .05); }); } } },
    money: { p(E, t) { E.open = .85; E.ly = .6; E.lx = -.55; E.mouth = 'wobble'; E.brows = true; E.bl = E.br = [-2, -.3]; E.hl = [1.08, .55]; E.hr = [.55 + (Math.floor(t * 6) % 2) * .06, .58]; },
      o(pen, K, g) { const [x, y] = g.hL; pen.fill(rr(x - 15, y - 24, 30, 38, 4), PAL.grey, .2); OL(pen, rr(x - 15, y - 24, 30, 38, 4), 1.4); pen.fill(rr(x - 11, y - 20, 22, 8, 2), PAL.dark, .1); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) pen.blot(x - 8 + q * 8, y - 5 + r * 7, 2.2, r === 2 && q === 2 ? K.body : PAL.paper, .05); },
      x(pen, K, g, t) { for (let i = 0; i < 3; i++) { const k = lp(t, .3, i / 3), x = 30 + i * 70 + Math.sin(t * 2 + i) * 8, y = -10 + k * 170, an = Math.sin(t * 2 + i) * .5; alpha(pen, k < .8 ? 1 : (1 - k) / .2, () => { const p = rot(rr(x - 5, y - 11, 10, 22, 1), x, y, an); FO(pen, p, PAL.paper, 1.2); pen.line(rot([[x - 3, y - 4], [x + 3, y - 4]], x, y, an), 1, '#B5AEA4'); pen.line(rot([[x - 3, y + 1], [x + 3, y + 1]], x, y, an), 1, '#B5AEA4'); }); } } },
    paperwork: { p(E, t) { const ph = (t * 1.1) % 1, lift = ph < .7 ? (1 - Math.abs(ph / .7 * 2 - 1)) * 22 : 0; E._ph = ph; E.hr = [.72, .74 - lift / 50]; E.hl = [.95, .8]; E.open = ph > .7 ? .35 : .75; E.ly = .8; E.lx = .5; E.mouth = ph > .7 ? 'grin' : 'side'; E.mw = ph > .7 ? .7 : 1; },
      f(pen, K, g, t, E) { desk(pen, g); const x = g.cx + 30; FO(pen, rr(x - 26, g.by - 7, 52, 7, 1), PAL.paper, 1.2); FO(pen, rr(x - 24, g.by - 12, 50, 6, 1), PAL.paper, 1.2); if (E._ph > .7) alpha(pen, 1, () => pen.line(ell(g.hR[0], g.by - 10, 7, 2.5, 12).concat([ell(g.hR[0], g.by - 10, 7, 2.5, 12)[0]]), 2, K.body, .1)); },
      o(pen, K, g, t, E) { const [x, y] = g.hR; pen.blot(x, y - 11, 6, PAL.dark); pen.fill(rr(x - 4, y - 7, 8, 12, 2), PAL.dark, .1); pen.fill(rr(x - 11, y + 5, 22, 8, 2), '#2C2724', .1); pen.fill(rr(x - 10, y + 12, 20, 4, 1), K.body, .1); if (E._ph > .7 && E._ph < .82) for (const s of [-1, 1]) pen.line([[x + s * 16, y + 14], [x + s * 24, y + 10]], 2, '#1C1A17', .1); } },
    research: { p(E, t) { E.open = 1.05; E.pup = .5; E.lx = Math.sin(t * 1.2) * .6; E.ly = .5; E.mouth = 'o'; E.mw = .55; E.hr = [.5 + Math.sin(t * 1.2) * .32, .66]; E.hl = [1.05, .62]; E.brows = true; E.bl = E.br = [-5, -.1]; },
      f(pen, K, g) { desk(pen, g); FO(pen, rot(rr(g.cx - 40, g.by - 14, 40, 15, 2), g.cx - 20, g.by - 7, .06), PAL.paper, 1.2); FO(pen, rot(rr(g.cx + 2, g.by - 15, 40, 16, 2), g.cx + 22, g.by - 7, -.05), PAL.paper, 1.2); },
      o(pen, K, g) { const [x, y] = g.hR; pen.line([[x, y], [x + 10, y + 14]], 4, PAL.dark, .1); const L = ell(x - 6, y - 14, 14, 14, 16); pen.fill(L, 'rgba(190,220,238,.45)', .1); OL(pen, L, 3, PAL.dark); pen.line([[x - 14, y - 20], [x - 10, y - 24]], 2, '#fff', .05); } },
    meeting: { p(E, t) { E.dy = Math.sin(t * 3) * 1.2; E.mouth = Math.floor(t * 3) % 3 === 0 ? 'o' : 'smile'; E.mw = .7; E.open = .95; E.ly = .55; E.hl = [.42, .9]; const w = lp(t, .2) < .22; E.hr = w ? [1.22, -.45 + Math.sin(t * 14) * .1] : [.42, .9]; },
      a(pen, K, g) { const pts = []; for (let i = 0; i <= 12; i++) { const a = PI + i / 12 * PI; pts.push([g.cx + Math.cos(a) * g.rx * .92, g.cy - 4 + Math.sin(a) * g.ry * 1.02]); } pen.line(pts, 4, PAL.dark, .15); for (const s of [-1, 1]) pen.fill(ell(g.cx + s * g.rx * .9, g.cy - 2, 7, 11, 12), PAL.dark, .15); pen.line([[g.cx - g.rx * .9, g.cy + 6], [g.cx - g.rx * .6, g.cy + 22], [g.cx - 16, g.cy + 24]], 2.4, PAL.dark, .15); pen.blot(g.cx - 15, g.cy + 24, 3.4, PAL.dark); },
      f(pen, K, g) { laptop(pen, K, g, PAL.grey, () => pen.blot(g.cx, g.by - 16, 1.8, PAL.dark)); } },
    presenting: { p(E, t) { E.lean = -6; E.lx = .85; E.ly = -.25; E.open = 1; E.mouth = Math.floor(t * 4) % 2 ? 'o' : 'smile'; E.mw = .75; E.hr = [1.25, -.15 + Math.sin(t * 2) * .08]; E.hl = [.6, .72]; E.brows = true; E.bl = E.br = [-5, -.1]; },
      b(pen, K, g, t) { const x = 148, y = 26; pen.line([[x + 10, y + 66], [x + 4, 176]], 2.4, '#1C1A17', .15); pen.line([[x + 40, y + 66], [x + 46, 176]], 2.4, '#1C1A17', .15); FO(pen, rr(x, y, 50, 66, 3), PAL.paper); const k = Math.min(1, lp(t, .2) * 2); [[K.body, 26], [PAL.stone, 18], [PAL.dark, 40]].forEach(([col, h], i) => pen.fill(rr(x + 9 + i * 12, y + 58 - h * k, 8, h * k + .1, 1), col, .1)); },
      o(pen, K, g) { const [x, y] = g.hR; pen.line([[x, y], [x + 30, y - 26]], 2.2, PAL.dark, .1); pen.blot(x + 30, y - 26, 2.4, K.body, .05); } },
    designing: { p(E, t) { E.open = .82; E.lx = -.75; E.ly = -.15; E.mouth = 'cat'; E.hl = [1.18 + Math.sin(t * 5) * .06, -.1 + Math.sin(t * 3) * .14]; E.hr = [1.0, .58]; E.lean = -2; },
      b(pen, K, g, t) { const x = 2, y = 34; pen.line([[x + 12, y + 70], [x + 6, 176]], 2.4, '#1C1A17', .15); pen.line([[x + 36, y + 70], [x + 42, 176]], 2.4, '#1C1A17', .15); FO(pen, rr(x, y, 48, 70, 2), PAL.paper); const cols = [K.body, PAL.gold, PAL.water, PAL.leaf, K.shade, PAL.dark], n = Math.floor(lp(t, .12) * 7); for (let i = 0; i < n; i++) pen.fill(ell(x + 10 + hash(i * 5) * 28, y + 10 + hash(i * 5 + 1) * 50, 6 + hash(i) * 6, 4 + hash(i + 3) * 5, 10, .2, i), cols[i % 6], .3); },
      a(pen, K, g) { beret(pen, g); },
      o(pen, K, g) { const [x, y] = g.hL; pen.line([[x + 4, y + 4], [x - 12, y - 8]], 2.6, PAL.tan, .1); pen.blot(x - 13, y - 9, 2.6, K.body, .1); const [px, py] = g.hR; FO(pen, ell(px + 4, py - 2, 18, 11, 14, .12, 2), PAL.tan, 1.4); [K.body, PAL.water, PAL.leaf, PAL.gold].forEach((col, i) => pen.blot(px - 6 + i * 6, py - 6 + (i % 2) * 5, 2.6, col, .05)); } },
    music: { p(E, t) { E.eye = 'closed'; E.mouth = 'smile'; E.rot = Math.sin(t * 2) * .04; E.dy = -Math.abs(Math.sin(t * 4)) * 2; E.hl = [.55, .86 - Math.abs(Math.sin(t * 6)) * .08]; E.hr = [.55, .86 - Math.abs(Math.sin(t * 6 + 1.5)) * .08]; },
      f(pen, K, g) { desk(pen, g); FO(pen, rr(g.cx - 48, g.by - 16, 96, 16, 2), PAL.paper, 1.4); for (let i = 1; i < 12; i++) pen.line([[g.cx - 48 + i * 8, g.by - 16], [g.cx - 48 + i * 8, g.by - 1]], 1, '#B5AEA4', .05); [1, 2, 4, 5, 6, 8, 9].forEach(i => pen.fill(rr(g.cx - 48 + i * 8 - 2.5, g.by - 16, 5, 9, 1), PAL.dark, .05)); },
      x(pen, K, g, t) { for (let i = 0; i < 2; i++) { const k = lp(t, .4, i * .5), x = g.cx + (i ? -60 : 56) + Math.sin(t * 3 + i) * 5, y = g.top + 40 - k * 40; alpha(pen, Math.sin(k * PI) * 1.3, () => { pen.fill(ell(x, y, 4.5, 3.5, 10, 0, 0, -.4), '#1C1A17', .1); pen.line([[x + 4, y - 1], [x + 4, y - 16], [x + 10, y - 12]], 2, '#1C1A17', .1); }); } } },
    cleaning: { p(E, t) { E.open = .6; E.tilt = .25; E.mouth = 'flat'; E.lx = .7; E.ly = .3; const a = t * 7; E.hr = [1.12 + Math.cos(a) * .1, .4 + Math.sin(a) * .1]; E.hl = [.4, .9]; E.brows = true; E.bl = E.br = [2, .3]; },
      b(pen, K, g) { FO(pen, rr(156, 70, 42, 90, 2), '#E3EEF4', 1.4); pen.line([[177, 70], [177, 160]], 1.2, '#B5AEA4'); pen.line([[156, 115], [198, 115]], 1.2, '#B5AEA4'); },
      o(pen, K, g) { const [x, y] = g.hR; FO(pen, rot(rr(x - 9, y - 6, 18, 12, 3), x, y, .2), PAL.gold, 1.2); for (let i = 0; i < 3; i++) pen.blot(x - 4 + i * 4, y - 1 + (i % 2) * 2, 1, '#C9A04E', .05); },
      x(pen, K, g, t) { const [x, y] = g.hR; for (let i = 0; i < 4; i++) { const k = lp(t, .6, i / 4); bubble(pen, x + 8 + Math.sin(i * 3 + t * 2) * 8, y - 6 - k * 40, 3 + i % 2 * 2, 1 - k); } } },
    dusting: { p(E, t) { const ph = lp(t, .18); E.open = .45; E.mouth = 'o'; E.mw = .5; E.hr = [1.12, -.32 + Math.sin(t * 6) * .2]; E.hl = [.4, .9]; E.lx = .6; E.ly = -.5; if (ph > .86) { E.eye = 'squeeze'; E.mouth = 'wail'; E.dy = -3; } E._ph = ph; },
      o(pen, K, g, t) { const [x, y] = g.hR, a = Math.sin(t * 6) * .3; const tx = x + Math.cos(-1 + a) * 26, ty = y + Math.sin(-1 + a) * 26; pen.line([[x, y], [tx, ty]], 2.6, PAL.tan, .1); for (let i = 0; i < 6; i++) { const b = i / 6 * PI * 2 + t; pen.fill(ell(tx + Math.cos(b) * 5, ty - 4 + Math.sin(b) * 5, 6, 4, 10, 0, 0, b), i % 2 ? PAL.stone : PAL.grey, .3); } },
      x(pen, K, g, t, E) { const [x, y] = g.hR; for (let i = 0; i < 3; i++) { const k = lp(t, .7, i / 3); alpha(pen, (1 - k) * .7, () => pen.fill(ell(x + 20 + i * 8 + k * 10, y - 30 - k * 14, 3 + k * 6, 3 + k * 6, 10), PAL.grey, .2)); } if (E._ph > .86) pen.line([[g.cx - 64, g.cy - 10], [g.cx - 76, g.cy - 14]], 2.2, '#1C1A17'); } },
    laundry: { p(E, t) { const f = (Math.sin(t * 1.6) + 1) / 2; E._f = f; E.mouth = 'smile'; E.open = .75; E.ly = .7; E.hl = [.78 - f * .3, .68]; E.hr = [.78 - f * .3, .68]; },
      b(pen, K, g) { FO(pen, rr(150, 146, 46, 28, 4), PAL.tan); for (let i = 1; i < 4; i++) pen.line([[150 + i * 11.5, 148], [150 + i * 11.5, 172]], 1, '#B08D5E'); pen.fill(rot(rr(160, 132, 9, 18, 4), 164, 141, .5), K.body, .2); },
      o(pen, K, g, t, E) { const w = (1 - E._f * .45), x = g.cx, y = g.cy + g.ry * .7, W = 30 * w; const sh = [[x - W, y - 12], [x - W - 10 * w, y - 4], [x - W - 6 * w, y + 2], [x - W, y - 2], [x - W, y + 20], [x + W, y + 20], [x + W, y - 2], [x + W + 6 * w, y + 2], [x + W + 10 * w, y - 4], [x + W, y - 12], [x + 7, y - 12], [x, y - 7], [x - 7, y - 12]]; FO(pen, sh, PAL.water); } },
    dishes: { p(E, t) { E.open = .7; E.ly = .6; E.mouth = 'smile'; E.hl = [.6, .76]; const a = t * 6; E.hr = [.18 + Math.cos(a) * .12, .72 + Math.sin(a) * .06]; },
      o(pen, K, g, t) { const x = g.cx - 4, y = g.cy + g.ry * .74; FO(pen, ell(x, y, 24, 15, 18), PAL.paper); OL(pen, ell(x, y, 15, 9, 16), 1.2, '#B5AEA4'); const [sx, sy] = g.hR; FO(pen, rr(sx - 7, sy - 5, 14, 10, 3), PAL.gold, 1.2); if (lp(t, .3) > .8) { const s = 6; pen.line([[x - 30 - s, y - 18], [x - 30 + s, y - 18]], 2, '#1C1A17'); pen.line([[x - 30, y - 18 - s], [x - 30, y - 18 + s]], 2, '#1C1A17'); } },
      x(pen, K, g, t) { for (let i = 0; i < 4; i++) { const k = lp(t, .5, i / 4); bubble(pen, g.cx + 20 + Math.sin(i * 2 + t) * 10, g.cy + 20 - k * 60, 3 + (i % 2) * 2, 1 - k); } } },
    cooking: { p(E, t) { E.open = .7; E.ly = .75; E.mouth = 'tongue'; const a = t * 4; E.hr = [.3 + Math.cos(a) * .16, .82 + Math.sin(a) * .04]; E.hl = [1.06, .72]; },
      a(pen, K, g) { const x = g.cx + 2, y = g.cy - g.ry + 6; FO(pen, rr(x - 22, y - 8, 44, 12, 3), PAL.paper); [[-14, -16, 12], [0, -22, 14], [14, -16, 12]].forEach(([dx, dy, r]) => FO(pen, ell(x + dx, y + dy, r, r * .85, 14), PAL.paper)); },
      f(pen, K, g) { desk(pen, g); const x = g.cx, y = g.by; riso(pen, rr(x - 34, y - 28, 68, 28, 6), PAL.dark, '#221E1B', x, y - 14, { sd: 5, grainN: 40 }); pen.fill(ell(x, y - 28, 34, 5, 16), '#2A2622', .2); for (const s of [-1, 1]) pen.line([[x + s * 34, y - 22], [x + s * 42, y - 22]], 4, PAL.dark, .1); },
      o(pen, K, g) { const [x, y] = g.hR; pen.line([[x, y - 4], [x - 4, g.by - 26]], 3, PAL.tan, .1); },
      x(pen, K, g, t) { for (let i = 0; i < 3; i++) { const k = lp(t, .5, i / 3), x = g.cx - 16 + i * 16; alpha(pen, (1 - k) * .8, () => pen.line([[x, g.by - 34 - k * 30], [x + 4, g.by - 40 - k * 30], [x, g.by - 46 - k * 30], [x + 4, g.by - 52 - k * 30]], 2, '#A79D90', .2)); } } },
    groceries: { p(E, t) { E.dy = -Math.abs(Math.sin(t * 6)) * 4; E.lean = Math.sin(t * 3) * 3; E.rot = Math.sin(t * 3) * .03; E.mouth = 'smile'; E.open = .9; E.lx = .3; E.hl = [.62, .72]; E.hr = [.62, .72]; },
      o(pen, K, g) { const x = g.cx, y = g.cy + g.ry * .5; pen.fill(rot(ell(x - 22, y - 8, 24, 5, 12), x - 22, y - 8, -.9), PAL.tan, .2); OL(pen, rot(ell(x - 22, y - 8, 24, 5, 12), x - 22, y - 8, -.9), 1.3); for (const [dx, an] of [[16, .3], [22, .8]]) pen.fill(rot(ell(x + dx, y - 10, 5, 11, 10), x + dx, y - 2, an), PAL.leaf, .2); riso(pen, rr(x - 28, y, 56, 44, 3), '#CDB48B', '#B89A6C', x, y + 22, { sd: 5, grainN: 40 }); pen.line([[x - 28, y + 6], [x + 28, y + 6]], 1.2, '#A88B5E'); } },
    decluttering: { p(E, t) { const k = lp(t, .55); E._k = k; E.open = .85; E.lx = .6; E.ly = .3; E.mouth = 'cat'; E.hl = [1.0, .45 - .55 * Math.max(0, Math.sin(Math.min(1, k / .3) * PI))]; E.hr = [.3, .9]; },
      f(pen, K, g) { desk(pen, g); const x = g.cx + 48, y = g.by; riso(pen, rr(x - 26, y - 30, 52, 30, 2), '#CDB48B', '#B89A6C', x, y - 15, { sd: 4, grainN: 30 }); pen.fill([[x - 26, y - 30], [x - 34, y - 42], [x - 8, y - 36]], '#D9C29B', .2); pen.fill([[x + 26, y - 30], [x + 34, y - 42], [x + 8, y - 36]], '#D9C29B', .2); pen.line([[x - 6, y - 30], [x - 6, y - 18]], 3, '#B89A6C', .1); },
      x(pen, K, g, t, E) { const k = E._k; if (k > .3 && k < .8) { const u = (k - .3) / .5, [sx, sy] = g.hL, ex = g.cx + 48, ey = g.by - 36, x = sx + (ex - sx) * u, y = sy + (ey - sy) * u - Math.sin(u * PI) * 60; pen.fill(rot(rr(x - 4, y - 8, 8, 16, 4), x, y, u * 6), K.body, .2); } } },
    parcel: { p(E, t) { E.open = .6; E.ly = .8; E.mouth = 'tongue'; E.hr = [.95 + lp(t, .5) * .28, .62]; E.hl = [.25, .78]; E._k = lp(t, .5); },
      f(pen, K, g) { desk(pen, g); const x = g.cx - 8, y = g.by; riso(pen, rr(x - 32, y - 34, 64, 34, 2), '#CDB48B', '#B89A6C', x, y - 17, { sd: 4, grainN: 30 }); pen.fill(rr(x - 32, y - 22, 64, 7, 1), PAL.stone, .1); FO(pen, rr(x + 6, y - 13, 20, 11, 1), PAL.paper, 1); },
      o(pen, K, g) { const [x, y] = g.hR; pen.line([[g.cx + 24, g.by - 19], [x - 4, y + 2]], 5, 'rgba(184,172,151,.85)', .1); pen.line(ell(x, y, 7, 7, 12).concat([ell(x, y, 7, 7, 12)[0]]), 3, PAL.dark, .1); } },
    diy: { p(E, t) { const ph = (t * 1.4) % 1, up = ph < .6 ? ph / .6 : 1 - (ph - .6) / .4; E._ph = ph; E._an = -1.6 + up * 1.7; E.hr = [1.02, .5 - up * .7]; E.hl = [.5, .86]; E.open = ph > .58 && ph < .7 ? .25 : .8; E.mouth = 'tongue'; E.lx = .7; E.ly = .55; },
      a(pen, K, g) { const x = g.cx, y = g.cy - g.ry * .55; const dome = []; for (let i = 0; i <= 12; i++) { const a = PI + i / 12 * PI; dome.push([x + Math.cos(a) * g.rx * .8, y + Math.sin(a) * g.ry * .55]); } riso(pen, dome, PAL.gold, '#D9A64A', x, y - 10, { sd: 4, grainN: 30 }); pen.fill(rr(x - g.rx * .95, y - 3, g.rx * 1.9, 6, 3), '#D9A64A', .2); },
      f(pen, K, g) { desk(pen, g); FO(pen, rr(g.cx + 34, g.by - 9, 44, 9, 2), PAL.tan, 1.4); pen.line([[g.cx + 58, g.by - 9], [g.cx + 58, g.by - 18]], 2, PAL.dark, .1); pen.line([[g.cx + 54, g.by - 18], [g.cx + 62, g.by - 18]], 2.4, PAL.dark, .1); },
      o(pen, K, g, t, E) { const [x, y] = g.hR, a = E._an, hx = x + Math.cos(a) * 24, hy = y + Math.sin(a) * 24; pen.line([[x, y], [hx, hy]], 3.4, PAL.tan, .1); pen.fill(rot(rr(hx - 9, hy - 4, 18, 8, 2), hx, hy, a + PI / 2), PAL.dark, .1); },
      x(pen, K, g, t, E) { if (E._ph > .56 && E._ph < .74) { const x = g.cx + 58, y = g.by - 22, s = 4 + (E._ph - .56) * 30; for (let i = 0; i < 4; i++) { const a = -PI / 2 + (i - 1.5) * .5; pen.line([[x + Math.cos(a) * 4, y + Math.sin(a) * 4], [x + Math.cos(a) * (4 + s), y + Math.sin(a) * (4 + s)]], 2, PAL.gold, .1); } } } },
    plants: { p(E, t) { E.open = .9; E.lx = .85; E.ly = .55; E.mouth = 'smile'; E.hr = [1.12, .05]; E.hl = [.5, .85]; },
      b(pen, K, g, t) { const x = 172, y = 176; pen.fill(rr(x - 16, y - 22, 32, 22, 3), K.shade, .2); pen.fill(rr(x - 19, y - 26, 38, 6, 2), K.shade, .2); for (const [an, L] of [[-.5, 22], [0, 30], [.55, 20]]) { const a = an + Math.sin(t * 2 + an) * .08, ex = x + Math.sin(a) * L, ey = y - 26 - Math.cos(a) * L; pen.line([[x, y - 26], [ex, ey]], 2, '#5E8A66', .1); pen.fill(rot(ell(ex, ey, 7, 3.5, 10), ex, ey, a - .6), PAL.leaf, .2); } },
      o(pen, K, g) { const [x, y] = g.hR, a = .45; FO(pen, rot(rr(x - 6, y - 10, 20, 16, 4), x, y, a), PAL.grey); pen.line(rot([[x + 14, y - 4], [x + 28, y - 12]], x, y, a), 3, PAL.stone, .1); },
      x(pen, K, g, t) { const [x, y] = g.hR, sx = x + 24, sy = y + 10; for (let i = 0; i < 4; i++) { const k = lp(t, 1.2, i / 4); alpha(pen, 1 - k * .6, () => pen.fill(ell(sx + k * 14, sy + k * 26, 1.8, 2.6, 8), PAL.water, .1)); } } },
    pets: { p(E, t) { E.eye = 'happy'; E.mouth = 'grin'; E.mw = .8; E.blush = 1.2; E.hr = [1.08 + Math.sin(t * 4) * .12, .72]; E.hl = [.5, .85]; },
      b(pen, K, g, t) { const x = 172, y = 170; for (const s of [-1, 1]) pen.fill([[x + s * 6, y - 22], [x + s * 15, y - 30], [x + s * 15, y - 16]], PAL.stone, .2); pen.fill(rot(ell(x + 16, y - 10, 8, 3, 10), x + 10, y - 10, Math.sin(t * 8) * .5 - .4), PAL.stone, .2); riso(pen, ell(x, y - 12, 18, 14, 16, .1, t), PAL.stone, '#9E9280', x, y - 12, { sd: 4, grainN: 20 }); for (const s of [-1, 1]) pen.line([[x + s * 7 - 3, y - 15], [x + s * 7, y - 17], [x + s * 7 + 3, y - 15]], 1.6, '#1C1A17', .05); pen.blot(x, y - 11, 1.6, '#1C1A17'); },
      o(pen, K, g) { const [x, y] = g.hR; pen.fill(rot(rr(x - 3, y - 2, 6, 16, 2), x, y, -.7), PAL.tan, .1); pen.fill(rot(rr(x - 8, y - 8, 16, 8, 2), x, y, -.7), PAL.dark, .1); },
      x(pen, K, g, t) { for (let i = 0; i < 2; i++) { const k = lp(t, .5, i * .5); alpha(pen, 1 - k, () => pen.fill(heart(170 + i * 12 - 6, 140 - k * 40, .32), K.body, .1)); } } },
    exercise: { p(E, t) { E.dy = -Math.abs(Math.sin(t * 9)) * 6; E.mouth = 'o'; E.mw = .7; E.open = .9; E.brows = true; E.bl = E.br = [-2, -.2]; E.hl = [1.02, .32 + Math.sin(t * 9) * .3]; E.hr = [1.02, .32 - Math.sin(t * 9) * .3]; },
      a(pen, K, g) { const pts = []; for (let i = 0; i <= 10; i++) { const a = PI * 1.12 + i / 10 * PI * .76; pts.push([g.cx + Math.cos(a) * g.rx * .9, g.cy + 6 + Math.sin(a) * g.ry * .78]); } pen.line(pts, 6, PAL.dark, .15); pen.line([[g.cx + g.rx * .7, g.cy - g.ry * .45], [g.cx + g.rx * .95, g.cy - g.ry * .6], [g.cx + g.rx * 1.05, g.cy - g.ry * .4]], 3, PAL.dark, .15); },
      x(pen, K, g, t) { for (let i = 0; i < 2; i++) { const k = lp(t, 1.2, i * .5), s = i ? 1 : -1; alpha(pen, 1 - k, () => pen.fill([[g.cx + s * (60 + k * 20), g.top + 30 - k * 10 - 6], [g.cx + s * (63 + k * 20), g.top + 30 - k * 10], [g.cx + s * (60 + k * 20), g.top + 34 - k * 10], [g.cx + s * (57 + k * 20), g.top + 30 - k * 10]], PAL.water, .1)); } } },
    stretch: { p(E, t) { const s = Math.sin(t * 1.1); E.eye = 'closed'; E.mouth = 'smile'; E.rot = s * .12; E.lean = s * 4; E.sy += .05; E.sx -= .03; E.hl = [.26, -1.18]; E.hr = [.26, -1.18]; },
      b(pen, K, g) { pen.fill(rr(28, 170, 144, 7, 3), PAL.leaf, .2); },
      x(pen, K, g, t) { for (let i = 0; i < 3; i++) { const k = lp(t, .25, i / 3), x = g.cx + (i - 1) * 60, y = g.top + 40 - k * 20, s = 2 + Math.sin(k * PI) * 4; alpha(pen, Math.sin(k * PI), () => { pen.line([[x - s, y], [x + s, y]], 1.8, '#1C1A17'); pen.line([[x, y - s], [x, y + s]], 1.8, '#1C1A17'); }); } } },
    selfcare: { p(E, t) { E.eye = 'closed'; E.mouth = 'smile'; E.mw = .6; E.blush = 1.3; E.hl = [1.0, .72]; E.hr = [.78, .58]; E.dy = Math.sin(t * 1.2); },
      a(pen, K, g, t) { const x = g.cx, y = g.cy - g.ry * .78; FO(pen, ell(x, y, g.rx * .78, 17, 18, .06, 1), PAL.paper); FO(pen, ell(x + 6, y - 14, 16, 10, 14, .1, 2), PAL.paper); pen.line([[x - 20, y - 2], [x + 2, y - 10], [x + 24, y - 4]], 1.2, '#B5AEA4'); for (const s of [-1, 1]) { const cx = g.fx + s * g.gap, cy = g.ey; pen.fill(ell(cx, cy, 11, 11, 14), PAL.leaf, .1); pen.fill(ell(cx, cy, 8, 8, 14), '#C9DDB0', .1); for (let i = 0; i < 4; i++) pen.blot(cx + Math.cos(i * 1.6) * 4, cy + Math.sin(i * 1.6) * 4, .9, '#78A57F', .02); } },
      o(pen, K, g, t) { const [x, y] = g.hR; FO(pen, rr(x - 12, y - 12, 18, 18, 3), PAL.paper); pen.line([[x + 6, y - 8], [x + 11, y - 5], [x + 6, y]], 1.8, '#1C1A17', .1); pen.fill(rr(x - 10, y - 10, 14, 3, 1), K.shade, .05); pen.fill(ell(x + 6, y - 2, 6, 5.4, 12), K.shade, .2); steam(pen, x - 3, y - 16, 2, .6); } },
    trip: { p(E, t) { E.open = 1; E.lx = Math.sin(t * 1.1) * .8; E.ly = .35; E.mouth = 'o'; E.mw = .6; E.brows = true; E.bl = E.br = [-4, -.1]; E.hl = [1.08, .66]; E.hr = [1.08, .66]; },
      o(pen, K, g, t) { const [lx, ly] = g.hL, [rx, ry] = g.hR, y = ly - 6; const m = rot(rr(lx - 6, y, rx - lx + 12, 36, 2), (lx + rx) / 2, y + 18, -.03); pen.fill(m, PAL.paper, .3); OL(pen, m, 1.4); for (let i = 1; i < 4; i++) { const x = lx + (rx - lx) * i / 4; pen.line([[x, y], [x, y + 35]], 1, '#C9C1B4'); } const path = []; for (let i = 0; i <= 10; i++) path.push([lx + 6 + (rx - lx - 12) * i / 10, y + 26 - Math.sin(i / 10 * PI) * 16 + Math.sin(i * 1.7) * 2]); for (let i = 0; i < 10; i += 2) pen.line([path[i], path[i + 1]], 1.8, K.body, .1); const px = path[10][0], py = path[10][1] - 4 - Math.abs(Math.sin(t * 4)) * 4; pen.fill([[px, py + 6], [px - 4, py - 2], [px, py - 6], [px + 4, py - 2]], K.body, .1); pen.blot(px, py - 2, 1.4, '#fff', .02); } },
    rest: { p(E, t) { E.eye = 'closed'; E.mouth = 'smile'; E.mw = .5; E.rot = -.16; E.lean = -6; E.dy = 2; E.sy -= .04 - Math.sin(t * 1.2) * .015; E.hl = [.9, .75]; E.hr = [.6, .86]; E.fx = 'zzz'; },
      b(pen, K, g) { FO(pen, rot(rr(30, 136, 62, 30, 12), 61, 151, -.2), PAL.paper); pen.line([[44, 146], [76, 140]], 1.2, '#C9C1B4'); pen.line([[150, 172], [196, 172]], 2.6, '#1C1A17', .2); const x = 174, y = 171; FO(pen, rr(x - 9, y - 18, 18, 18, 3), PAL.paper); pen.line([[x + 9, y - 14], [x + 14, y - 11], [x + 9, y - 6]], 1.8, '#1C1A17', .1); steam(pen, x, y - 22, 2, .4); } }
  };
  function workPose(WK, t) { const E = emo('working', t); E.fx = null; E.mouth = 'smile'; E.mw = .7; WK.p && WK.p(E, t); return E; }

  function scootch(pen, K, m, t, o = {}) {
    const WK = o.work && WORK[o.work];
    const E = WK ? workPose(WK, t) : emo(m, t), c = pen.c;
    if (o.since != null && o.since < .5) { const u = o.since / .5, k = Math.sin(u * PI * 2) * (1 - u); E.sy -= .13 * k; E.sx += .09 * k; }
    if (o.gaze && !WK && GAZE[m]) { E.lx = E.lx * .25 + o.gaze[0] * .75; E.ly = E.ly * .25 + o.gaze[1] * .75; if (m === 'waiting') { E.open = Math.max(E.open, .82); E.lean = o.gaze[0] * 3; } }
    const base = 172, rx = 58 * E.sx, ry = 50 * E.sy, cx = 100 + E.lean, cy = base - ry * .8 + E.dy - 2, by = base + E.dy;
    const hands = [[-1, E.hl], [1, E.hr]].map(([s, h]) => ({ s, S: [cx + s * rx * .86, cy + ry * .16], H: [cx + s * h[0] * rx, cy + h[1] * ry] }));
    const fxx = cx + E.lx * 4, fy = cy + E.ly * 2.5, ey = fy + ry * .04, gap = rx * .36, r = 13.5;
    const g = { cx, cy, rx, ry, by, base, top: cy - ry - 22, hL: hands[0].H, hR: hands[1].H, fx: fxx, fy, ey, gap };
    pen.fill(ell(100, base + 2, 50 * (1 - E.bounce * .45), 5, 14), 'rgba(28,26,23,.08)', .2);
    if (WK && WK.b) WK.b(pen, K, g, t, E);
    c.save(); c.translate(cx, by); c.rotate(E.rot); c.translate(-cx, -by);
    for (const s of [-1, 1]) pen.fill(ell(cx + s * 22, by - 4, 11, 6.5, 12), K.shade);
    const T = [cx + E.lean * 1.2, cy - ry + 4], tip = Math.sin(t * 2.3) * 1.5 - E.lean * .6 + E.tip;
    if (!o.hat) pen.fill(ribbon(bez([T[0] - 2, T[1] + 6], [T[0] - 1, T[1] - 10], [T[0] + 15 + tip, T[1] - 16 + E.tip * .3], [T[0] + 12 + tip, T[1] - 4], 8), 6, 2.2, 1.5), K.body);
    riso(pen, bodyPts(cx, cy, rx, ry, E.lean * .4, t * .9), K.body, K.shade, cx, cy, { sd: 9 });
    if (o.hat) beret(pen, g);
    c.globalAlpha = .9; pen.line([[cx - rx * .62, cy - ry * .38], [cx - rx * .48, cy - ry * .62], [cx - rx * .3, cy - ry * .76]], 4, K.hi); c.globalAlpha = 1;
    for (const s of [-1, 1]) { const k = E.blush; pen.fill(ell(fxx + s * rx * .6, fy + ry * .34, 7.5 * k, 4.4 * k, 12), K.blush, .2); }
    for (const s of [-1, 1]) eye(pen, K, E, fxx + s * gap, ey, s, r, K.body, t);
    if (E.brows) for (const s of [-1, 1]) {
      const [yo, a] = s === -1 ? E.bl : E.br, x = fxx + s * gap, y0 = ey - r * 1.1 - 7 + yo, L = r * .62;
      pen.line([[x - L, y0 + (s === 1 ? a : -a) * 6], [x, y0 - 1.6], [x + L, y0 + (s === 1 ? -a : a) * 6]], 3.4, K.ink, .25);
    }
    if (E.fx === 'tears') for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const k = ((t * 1.1 + i * .5) % 1); c.globalAlpha = 1 - k * .8; pen.fill(drop(fxx + s * (gap + r * .7) + s * k * 6, ey + 4 + k * 34, .55), '#9FC4DE', .1); c.globalAlpha = 1; }
    mouth(pen, K, E, fxx + E.mx * 14, fy + ry * .44, t);
    if (WK && WK.a) WK.a(pen, K, g, t, E);
    if (E.fx === 'laptop') { pen.line([[cx - 74, by], [cx + 74, by]], 2.6, K.fx === '#FBF8F2' ? '#1C1A17' : K.fx); pen.fill([[cx - 24, by - 2], [cx + 24, by - 2], [cx + 21, by - 17], [cx - 21, by - 17]], '#D6CDBF', .3); pen.blot(cx + 5, by - 10, 2.6, SK.body); }
    if (WK && WK.f) WK.f(pen, K, g, t, E);
    for (const { s, S, H } of hands) {
      const dx = H[0] - S[0], dy = H[1] - S[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * s * 6, ny = dx / L * s * 6;
      pen.fill(ribbon(bez(S, [S[0] + dx * .3 + nx, S[1] + dy * .3 + ny], [S[0] + dx * .7 + nx * .5, S[1] + dy * .7 + ny * .5], H, 8), 4.4, 3.4, .6), K.shade);
      pen.fill(ell(H[0], H[1], 6.2, 5.6, 12), K.shade);
    }
    if (WK && WK.o) WK.o(pen, K, g, t, E);
    fx(pen, K, E, t, { cx, cy, top: cy - ry - 22, base: by });
    if (WK && WK.x) WK.x(pen, K, g, t, E);
    c.restore();
  }
  window.SCOOTCH_WORK = Object.keys(WORK);
  const GAZE = { waiting: 1, listening: 1, thinking: 1, bargaining: 1, proud: 1, nudge: 1, shocked: 1 };
  const PTR = { x: 0, y: 0, t: -1e9 };
  window.addEventListener('pointermove', e => { PTR.x = e.clientX; PTR.y = e.clientY; PTR.t = performance.now(); }, { passive: true });

  const MINKS = [
    { b: '#3A3430', s: '#221E1B' }, { b: '#34506E', s: '#22364C' }, { b: '#4C6A4C', s: '#334833' }, { b: '#5E3B57', s: '#40273B' },
    { b: '#2F6461', s: '#1E4442' }, { b: '#7A4A32', s: '#553220' }, { b: '#C1922F', s: '#9A7020', light: 1 }, { b: '#8C80AE', s: '#6B6090', light: 1 }
  ];
  const KRAFT = { b: '#B8925F', s: '#987443', light: 1 };
  function blobPts(cx, cy, rx, ry, n, o) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2; let x = Math.cos(a), y = Math.sin(a);
      if (y < 0) { x *= 1 - (o.taper || 0) * (-y); y *= 1 + (o.peak || 0) * Math.pow(-y, 3); } else y *= (o.flat || 1);
      pts.push([cx + x * rx, cy + y * ry]);
    }
    return pts;
  }
  const hexP = (x, y, r) => Array.from({ length: 6 }, (_, i) => [x + Math.cos(i / 6 * PI * 2) * r, y + Math.sin(i / 6 * PI * 2) * r]);
  const ARCH = {
    tooth: { w: 84, h: 80, legs: 'none', top: false, body(g) { const { cx, y0, y1, w, h } = g, x0 = cx - w / 2, x1 = cx + w / 2; return [[x0 + 3, y0 + h * .28], [x0 + w * .1, y0 + 5], [cx - w * .24, y0], [cx - 5, y0 + h * .1], [cx + 5, y0 + h * .1], [cx + w * .24, y0], [x1 - w * .1, y0 + 5], [x1 - 3, y0 + h * .28], [x1 - 2, y0 + h * .56], [x1 - w * .16, y0 + h * .78], [cx + w * .3, y1], [cx + w * .12, y1 - 3], [cx + w * .05, y0 + h * .74], [cx - w * .05, y0 + h * .74], [cx - w * .12, y1 - 3], [cx - w * .3, y1], [x0 + w * .16, y0 + h * .78], [x0 + 2, y0 + h * .56]]; }, face: g => [g.cx, g.y0 + g.h * .34], fw: .7,
      deco(pen, g, I) { pen.line([[g.cx - g.w * .32, g.y0 + g.h * .22], [g.cx - g.w * .26, g.y0 + g.h * .12]], 3, 'rgba(255,255,255,.35)'); pen.blot(g.cx + g.w * .26, g.y0 + g.h * .56, 4.5, I.s); } },
    envelope: { w: 94, h: 64, legs: 'stick', body: g => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 6), face: g => [g.cx, g.y0 + g.h * .64], fw: .6,
      deco(pen, g, I) { const x0 = g.cx - g.w / 2, x1 = g.cx + g.w / 2; pen.line([[x0 + 4, g.y0 + 4], [g.cx, g.y0 + g.h * .44], [x1 - 4, g.y0 + 4]], 2.6, I.s); pen.fill(rr(x1 - 22, g.y0 + 8, 14, 16, 1), '#FBF8F2', .2); pen.blot(x1 - 15, g.y0 + 16, 3.4, I.b, .1); } },
    bubble: { w: 92, h: 72, legs: 'none', hover: 1, body: g => rr(g.cx - g.w / 2, g.y0, g.w, g.h * .8, 22), face: g => [g.cx, g.y0 + g.h * .38], fw: .75,
      under(pen, g, I) { const x0 = g.cx - g.w / 2; pen.fill([[x0 + 16, g.y0 + g.h * .7], [x0 + 6, g.y1 + 2], [x0 + 36, g.y0 + g.h * .74]], I.b, .3); },
      deco(pen, g, I, t) { for (let i = 0; i < 3; i++) pen.blot(g.cx + g.w * .5 + 8 + i * 8, g.y0 - 2 - Math.max(0, Math.sin(t * 5 - i)) * 4, 2.4, I.b, .05); } },
    receipt: { w: 62, h: 98, legs: 'stick', eyes: 3, body(g) { const { cx, y0, y1, w } = g, x0 = cx - w / 2, x1 = cx + w / 2, p = [[x0, y0 + 2], [x0 + 2, y0], [x1 - 2, y0], [x1, y0 + 2], [x1, y1 - 6]]; for (let i = 1; i < 7; i++) p.push([x1 - i * w / 6, y1 - (i % 2 ? 0 : 6)]); p.push([x0, y1 - 6]); return p; }, face: g => [g.cx, g.y0 + g.h * .24], fw: .85,
      deco(pen, g, I) { for (let k = 0; k < 4; k++) pen.line([[g.cx - g.w / 2 + 8, g.y0 + g.h * .6 + k * 7], [g.cx + g.w / 2 - 8 - (k % 2) * 12, g.y0 + g.h * .6 + k * 7]], 1.8, I.s); } },
    scroll: { w: 72, h: 92, legs: 'stub', body: g => rr(g.cx - g.w / 2 + 4, g.y0 + 6, g.w - 8, g.h - 12, 2), face: g => [g.cx, g.y0 + g.h * .36], fw: .72,
      deco(pen, g, I) { pen.fill(ell(g.cx, g.y0 + 6, g.w / 2 + 2, 7, 16), I.s); pen.fill(ell(g.cx, g.y1 - 6, g.w / 2 + 2, 7, 16), I.s); for (let k = 0; k < 3; k++) pen.line([[g.cx - g.w * .3, g.y0 + g.h * .66 + k * 6], [g.cx + g.w * .3 - k * 6, g.y0 + g.h * .66 + k * 6]], 1.6, I.s); } },
    slime: { w: 98, h: 72, legs: 'none', body(g, t) { const { cx, y0, w, h } = g, p = []; for (let i = 0; i <= 12; i++) { const a = PI + i / 12 * PI; p.push([cx + Math.cos(a) * w / 2, y0 + h * .58 + Math.sin(a) * h * .58]); } const yb = y0 + h * .92; for (let i = 1; i < 16; i++) { const x = cx + w / 2 - i * w / 16, d = [3, 8, 12].includes(i) ? 7 + Math.sin(t * 2 + i) * 4 : 0; p.push([x, yb + d - (i % 2) * 2]); } return p; }, face: g => [g.cx, g.y0 + g.h * .44], fw: .7,
      deco(pen, g, I, t) { for (let i = 0; i < 2; i++) { const k = lp(t, .35, i * .5); alpha(pen, 1 - k, () => pen.blot(g.cx - 18 + i * 30, g.y0 + 10 - k * 18, 3 + i, 'rgba(255,255,255,.4)', .1)); } } },
    sock: { w: 78, h: 96, legs: 'none', hop: 1, top: false, body(g) { const { cx, y0, y1, w, h } = g, x0 = cx - w * .42; return [[x0, y0], [x0 + w * .56, y0], [x0 + w * .56, y1 - h * .4], [x0 + w * .9, y1 - h * .37], [x0 + w * 1.02, y1 - h * .2], [x0 + w * .94, y1], [x0 + w * .1, y1], [x0, y1 - h * .2]]; }, face: g => [g.cx - g.w * .14, g.y0 + g.h * .36], fw: .5,
      deco(pen, g, I) { const x0 = g.cx - g.w * .42; for (const y of [g.y0 + 8, g.y0 + 18]) pen.line([[x0 + 2, y], [x0 + g.w * .56 - 2, y]], 5, 'rgba(255,255,255,.3)'); pen.blot(x0 + g.w * .1, g.y1 - g.h * .12, 8, I.s); pen.blot(g.cx + g.w * .48, g.y1 - g.h * .12, 8, I.s); } },
    dust: { w: 86, h: 80, legs: 'stub', fuzzy: 1, inks: [0, 7, 6, 1], body(g) { const p = []; for (let i = 0; i < 46; i++) { const a = i / 46 * PI * 2, k = i % 2 ? 1.14 : .93 + hash(g.S + i) * .08; p.push([g.cx + Math.cos(a) * g.w / 2 * k, g.y0 + g.h / 2 + Math.sin(a) * g.h / 2 * k]); } return p; }, face: g => [g.cx, g.y0 + g.h * .44], fw: .7,
      deco(pen, g, I, t) { for (let i = 0; i < 3; i++) { const k = lp(t, .4, i / 3), x = g.cx + g.w * .5 + k * 16, y = g.y0 + 10 + i * 10 - k * 8; alpha(pen, 1 - k, () => pen.line([[x, y], [x + 4, y - 3], [x + 7, y + 1]], 1.6, I.b)); } } },
    phone: { w: 60, h: 100, legs: 'stick', body: g => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 13), face: g => [g.cx, g.y0 + g.h * .4], fw: .8,
      deco(pen, g, I, t, st) { pen.fill(rr(g.cx - g.w / 2 + 6, g.y0 + 10, g.w - 12, g.h - 28, 6), I.s); pen.blot(g.cx, g.y1 - 9, 3.2, 'rgba(255,255,255,.5)'); if (!st.caught) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const R = 10 + k * 7, pts = []; for (let i = 0; i <= 5; i++) { const an = (s > 0 ? 0 : PI) - .55 + i / 5 * 1.1; pts.push([g.cx + s * (g.w / 2 + 2) + Math.cos(an) * R, g.y0 + 18 + Math.sin(an) * R]); } alpha(pen, .3 + .7 * lp(t, 2, -k * .3), () => pen.line(pts, 2, '#1C1A17', .2)); } } },
    weed: { w: 72, h: 86, legs: 'roots', top: false, inks: [2, 4, 6, 0], body: g => blobPts(g.cx, g.y0 + g.h * .6, g.w / 2, g.h * .42, 22, { taper: .35, peak: .45, flat: .92 }), face: g => [g.cx, g.y0 + g.h * .6], fw: .7,
      deco(pen, g, I, t) { [[-.6, 22], [0, 28], [.6, 20]].forEach(([an, L], i) => { const a2 = an + Math.sin(t * 2 + i) * .1, bx = g.cx, by = g.y0 + g.h * .18, ex = bx + Math.sin(a2) * L, ey = by - Math.cos(a2) * L; pen.line([[bx, by], [ex, ey]], 2.2, '#4C6A4C'); pen.fill(rot(ell(ex, ey, 9, 4, 12), ex, ey, a2 - PI / 2 + .5), i === 1 ? '#78A57F' : '#5E8A66', .2); }); } },
    beetle: { w: 94, h: 76, legs: 'six', body: g => ell(g.cx, g.y0 + g.h / 2, g.w / 2, g.h / 2, 24), face: g => [g.cx, g.y0 + g.h * .34], fw: .7,
      deco(pen, g, I, t) { pen.line([[g.cx, g.y0 + g.h * .58], [g.cx, g.y1 - 3]], 2.4, I.s); for (const [dx, dy] of [[-.25, .7], [.27, .68], [-.12, .86], [.14, .88]]) pen.blot(g.cx + dx * g.w, g.y0 + dy * g.h, 4, I.s); for (const s of [-1, 1]) { const a2 = Math.sin(t * 3 + s) * .15, ex = g.cx + s * 18 + Math.sin(s * .5 + a2) * 14, ey = g.y0 - 16; pen.line([[g.cx + s * 8, g.y0 + 4], [g.cx + s * 14, g.y0 - 6], [ex, ey]], 2, I.s); pen.blot(ex, ey, 3, I.s); } } },
    pot: { w: 98, h: 64, legs: 'stub', top: false, body: g => rr(g.cx - g.w / 2 + 6, g.y0 + 12, g.w - 12, g.h - 12, 12), face: g => [g.cx, g.y0 + g.h * .62], fw: .65,
      deco(pen, g, I, t) { pen.fill(rr(g.cx - g.w / 2, g.y0 + 8, g.w, 9, 4), I.s); for (const s of [-1, 1]) pen.line([[g.cx + s * (g.w / 2 - 2), g.y0 + 22], [g.cx + s * (g.w / 2 + 10), g.y0 + 22]], 5, I.s); const ly = g.y0 + 4 - Math.max(0, Math.sin(t * 6)) * 3; pen.fill(ell(g.cx, ly, g.w * .38, 6, 16), I.s); pen.blot(g.cx, ly - 6, 4, I.s); for (let i = 0; i < 2; i++) { const k = lp(t, .5, i * .5); alpha(pen, (1 - k) * .7, () => pen.line([[g.cx - 10 + i * 20, ly - 10 - k * 18], [g.cx - 7 + i * 20, ly - 15 - k * 18], [g.cx - 10 + i * 20, ly - 20 - k * 18]], 1.8, '#A79D90')); } } },
    bolt: { w: 80, h: 80, legs: 'stick', top: false, body: g => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 10), face: g => [g.cx, g.y0 + g.h * .48], fw: .7,
      deco(pen, g, I, t) { pen.fill(rr(g.cx - 4, g.y0 - 10, 8, 12, 1), '#B8AC97'); pen.fill(hexP(g.cx, g.y0 - 14, 10).map(p => rot([p], g.cx, g.y0 - 14, t * .5)[0]), '#C9C1B4', .2); for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = g.cx + x * (g.w / 2 - 9), py = g.y0 + g.h / 2 + y * (g.h / 2 - 9); pen.blot(px, py, 3.6, 'rgba(255,255,255,.45)'); pen.line([[px - 2.4, py], [px + 2.4, py]], 1.2, I.s); } } },
    clock: { w: 88, h: 88, legs: 'stick', top: false, body: g => ell(g.cx, g.y0 + g.h / 2, g.w / 2, g.h / 2, 26), face: g => [g.cx, g.y0 + g.h * .46], fw: .7,
      under(pen, g, I, t) { const rg = Math.sin(t * 30) * 2; for (const s of [-1, 1]) pen.fill(ell(g.cx + s * g.w * .36 + rg, g.y0 + 4, 12, 10, 14, 0, 0, s * .5), I.s); pen.line([[g.cx, g.y0 - 2], [g.cx + rg * 2, g.y0 - 12]], 2.4, I.s); },
      deco(pen, g, I) { for (let i = 0; i < 12; i++) { const a2 = i / 12 * PI * 2, r1 = g.w / 2 - 4, r2 = g.w / 2 - (i % 3 ? 7 : 10); pen.line([[g.cx + Math.cos(a2) * r1, g.y0 + g.h / 2 + Math.sin(a2) * r1], [g.cx + Math.cos(a2) * r2, g.y0 + g.h / 2 + Math.sin(a2) * r2]], 1.8, 'rgba(255,255,255,.55)'); } } },
    kettle: { w: 88, h: 76, legs: 'stub', top: false, body: g => ell(g.cx, g.y1 - g.h * .4, g.w / 2, g.h * .4, 24), face: g => [g.cx, g.y1 - g.h * .42], fw: .7,
      under(pen, g, I) { const p = []; for (let i = 0; i <= 10; i++) { const a2 = PI * 1.12 + i / 10 * PI * .76; p.push([g.cx + Math.cos(a2) * g.w * .3, g.y1 - g.h * .66 + Math.sin(a2) * g.h * .36]); } pen.line(p, 10, I.s); },
      deco(pen, g, I) { pen.line([[g.cx - g.w * .44, g.y1 - g.h * .16], [g.cx + g.w * .44, g.y1 - g.h * .16]], 3, I.s); } },
    splat: { w: 94, h: 80, legs: 'none', body(g, t) { const p = []; for (let i = 0; i < 26; i++) { const a2 = i / 26 * PI * 2, k = .78 + hash(g.S + i * 7) * .4 + (i % 5 === 0 ? .18 : 0); p.push([g.cx + Math.cos(a2) * g.w / 2 * k, g.y0 + g.h / 2 + Math.sin(a2) * g.h / 2 * k * (Math.sin(a2) > 0 ? .85 : 1)]); } return p; }, face: g => [g.cx, g.y0 + g.h * .46], fw: .65,
      deco(pen, g, I, t) { ['#F2C46B', '#8EBBDA', '#78A57F', '#FBF8F2'].forEach((col, i) => pen.blot(g.cx + (hash(g.S + i * 3) - .5) * g.w * .9, g.y0 + g.h * (.62 + hash(g.S + i * 5) * .3), 3 + hash(g.S + i) * 3, col, .2)); for (let i = 0; i < 2; i++) { const x = g.cx - 20 + i * 34, L = 6 + (Math.sin(t * 1.5 + i) + 1) * 5; pen.line([[x, g.y1 - 6], [x, g.y1 - 6 + L]], 5, I.b); pen.blot(x, g.y1 - 6 + L, 3.4, I.b); } } },
    note: { w: 70, h: 98, legs: 'none', hop: 1, top: false, body: g => ell(g.cx - 8, g.y1 - 22, 30, 22, 20, 0, 0, -.3), face: g => [g.cx - 8, g.y1 - 22], fw: .62,
      under(pen, g, I, t) { const x = g.cx + 14; pen.fill(rr(x, g.y0, 8, g.h - 22, 2), I.b); const fl = Math.sin(t * 4) * 4; pen.fill(ribbon(bez([x + 6, g.y0 + 2], [x + 26, g.y0 + 10 + fl], [x + 30, g.y0 + 26 + fl], [x + 18, g.y0 + 40], 8), 5, 2, 2), I.b); } },
    hairball: { w: 90, h: 76, legs: 'stub', fuzzy: 1, top: false, inks: [0, 5, 6, 7], body(g) { const p = []; for (let i = 0; i < 50; i++) { const a2 = i / 50 * PI * 2, k = i % 2 ? 1.12 : .95 + hash(g.S + i) * .06; p.push([g.cx + Math.cos(a2) * g.w / 2 * k, g.y0 + g.h / 2 + Math.sin(a2) * g.h / 2 * k]); } return p; }, face: g => [g.cx, g.y0 + g.h * .44], fw: .7,
      under(pen, g, I) { for (const s of [-1, 1]) pen.fill([[g.cx + s * 14, g.y0 + 6], [g.cx + s * 34, g.y0 - 12], [g.cx + s * 36, g.y0 + 14]], I.b, .3); },
      deco(pen, g, I) { const LC = I.light ? '#1C1A17' : '#FFFCF7'; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) pen.line([[g.cx + s * 20, g.y0 + g.h * .62 + k * 4], [g.cx + s * (40 + k * 2), g.y0 + g.h * .56 + k * 7]], 1.2, LC, .1); } },
    box: { w: 90, h: 74, legs: 'stick', top: false, ink: KRAFT, body: g => rr(g.cx - g.w / 2, g.y0 + 10, g.w, g.h - 10, 2), face: g => [g.cx, g.y0 + g.h * .58], fw: .66,
      under(pen, g, I, t) { const f = Math.sin(t * 3) * .12; for (const s of [-1, 1]) { const x = g.cx + s * g.w / 2, y = g.y0 + 10; pen.fill(rot([[x, y], [g.cx + s * 4, y], [g.cx + s * 10, y - 20], [x + s * 10, y - 16]], x, y, s * f), '#C9A574', .2); } },
      deco(pen, g, I) { pen.fill(rr(g.cx - 6, g.y0 + 10, 12, g.h - 10, 1), 'rgba(184,172,151,.7)'); } },
    pillow: { w: 102, h: 62, legs: 'none', top: false, sleepy: 1, inks: [1, 3, 7, 4], body(g) { const { cx, y0, y1, w } = g, x0 = cx - w / 2, x1 = cx + w / 2, my = (y0 + y1) / 2; return [[x0 - 4, y0 - 4], [cx - w * .25, y0 + 5], [cx + w * .25, y0 + 5], [x1 + 4, y0 - 4], [x1 - 5, my - 10], [x1 - 5, my + 10], [x1 + 4, y1 + 4], [cx + w * .25, y1 - 5], [cx - w * .25, y1 - 5], [x0 - 4, y1 + 4], [x0 + 5, my + 10], [x0 + 5, my - 10]]; }, face: g => [g.cx, g.y0 + g.h * .44], fw: .6,
      deco(pen, g, I) { pen.blot(g.cx, g.y1 - 12, 3, I.s); } }
  };
  const ARCH_KEYS = Object.keys(ARCH);

  function monster(pen, o, m, t) {
    const S = strHash(o.seed || 'task'), R = k => hash(S + k * 101), c = pen.c;
    const nerv = m === 'nervous', caught = m === 'caught', st = { nerv, caught };
    if (!o.type && o.body != null && !o.random) return legacyMonster(pen, o, m, t);
    const type = ARCH[o.type] ? o.type : ARCH_KEYS[Math.floor(R(0) * ARCH_KEYS.length)], A = ARCH[type];
    const list = A.inks ? A.inks.map(i => MINKS[i]) : MINKS, I = A.ink || list[Math.floor(R(11) * list.length)];
    const LC = I.light ? '#1C1A17' : '#FFFCF7';
    const w = A.w * 1.12 * (.9 + R(12) * .2), h = A.h * 1.12 * (.9 + R(13) * .2);
    const legH = { stick: 12, stub: 5, roots: 8, six: 6, none: 0 }[A.legs] || 0;
    const shake = nerv ? Math.sin(t * 40) * 1.6 : 0;
    let bob = caught ? Math.sin(t * 1.2) : Math.sin(t * 2 + R(8) * 6) * 2;
    if (A.hop && !caught) bob = -Math.abs(Math.sin(t * 3 + R(8) * 6)) * 7;
    if (A.hover && !caught) bob = Math.sin(t * 1.8) * 4 - 7;
    const base = 172, cx = 100 + shake, y1 = base - legH + bob + (caught ? 3 : 0), y0 = y1 - h;
    const g = { cx, y0, y1, w, h, S };
    if (!o.noShadow) pen.fill(ell(100, base + 2, w * .46 * (A.hover ? .7 : 1), 5, 14), 'rgba(28,26,23,.08)', .2);
    if (!caught) {
      if (A.legs === 'stick') { const n = 2 + Math.floor(R(4) * 2); for (let i = 0; i < n; i++) { const x = cx - w * .3 + i * (w * .6 / (n - 1)); pen.fill(ribbon([[x, y1 - 4], [x + (i % 2 ? 1.5 : -1.5), (y1 + base) / 2], [x + (i % 2 ? 3 : -3), base - 1]], 3.4, 3), I.s); } }
      if (A.legs === 'stub') for (const s of [-1, 1]) pen.fill(ell(cx + s * w * .24, base - 3, 10, 5.5, 12), I.s);
      if (A.legs === 'roots') for (let i = -1; i <= 1; i++) pen.line([[cx + i * 10, y1 - 4], [cx + i * 14 + Math.sin(t * 2 + i) * 2, y1 + 3], [cx + i * 10 - 4, base], [cx + i * 18, base + 1]], 2.2, I.s);
      if (A.legs === 'six') for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const yy = y0 + h * (.45 + k * .17), sw = Math.sin(t * 8 + k * 2 + s) * 2; pen.line([[cx + s * w * .44, yy], [cx + s * (w * .6 + 4), yy + 4 + sw], [cx + s * (w * .62 + 2), yy + 12]], 2.4, I.s); }
    }
    if (A.under) A.under(pen, g, I, t, st);
    const tops = A.top === false ? 0 : Math.floor(R(15) * 5);
    if (tops === 1) for (const s of [-1, 1]) pen.fill([[cx + s * w * .18, y0 + 6], [cx + s * w * .36, y0 + 8], [cx + s * w * .32, y0 - 14]], '#EDE6DA', .25);
    if (tops === 2) { const tx = cx + Math.sin(t * 2) * 4, ty = y0 - 18; pen.line([[cx, y0 + 4], [cx + 2, y0 - 8], [tx, ty]], 2.2, I.s); pen.blot(tx, ty, 4, I.light ? I.s : '#F2C46B'); }
    if (tops === 3) for (let k = -1; k <= 1; k++) pen.line([[cx + k * 6, y0 + 4], [cx + k * 9, y0 - 8 - (k === 0 ? 4 : 0)]], 3, I.b);
    const body = A.body(g, t);
    riso(pen, body, I.b, I.s, cx, y0 + h / 2, { sd: 8, grainN: 90, gw: w, gh: h });
    if (A.deco) A.deco(pen, g, I, t, st);
    const [fx, fy] = A.face(g), fw = w * (A.fw || .7);
    let n = A.eyes || 1 + Math.floor(R(2) * 3); if (fw < 40 && n > 2) n = 2;
    const er0 = (n === 1 ? 15 : n === 2 ? 11 : 8.5) * Math.min(1.1, fw / 62);
    const mix = n === 2 && R(16) > .62, stalk = n <= 2 && A.top !== false && R(17) > .8;
    const E = { eye: caught ? 'closed' : 'round', open: nerv ? 1.15 : (A.sleepy ? .38 : .55 + R(18) * .25), tilt: nerv ? 0 : (R(19) > .5 ? .35 : -.2), lx: nerv ? Math.sin(t * 9) * .5 : Math.sin(t * .7 + R(9) * 6) * .6, ly: nerv ? -.2 : 0, pup: nerv ? .42 : .5 + R(21) * .12 };
    const K = { ink: '#1C1A17', white: '#FFFCF7' };
    for (let i = 0; i < n; i++) {
      const er = er0 * (mix ? (i === 0 ? 1.25 : .78) : 1), ex = n === 1 ? fx : fx - fw * .32 + i * (fw * .64 / (n - 1));
      let ey = fy - (n === 3 && i === 1 ? er * .7 : 0);
      if (stalk) { const sy = y0 - 12 - i * 3; pen.line([[ex, y0 + 6], [ex + Math.sin(t * 2 + i) * 3, sy]], 2.6, I.s); ey = sy; }
      if (caught) pen.line([[ex - er * .7, ey], [ex, ey + er * .4], [ex + er * .7, ey]], 2.6, stalk ? '#1C1A17' : LC);
      else eye(pen, K, E, ex, ey, i < n / 2 ? -1 : 1, er, I.b, t);
    }
    const my = (stalk ? fy - 4 : fy + er0 * 1.25) + 6, mw = Math.min(fw * .36, 18), mt = caught ? 'smile' : nerv ? 'wobble' : ['smirk', 'grin', 'fang', 'o', 'wave'][Math.floor(R(14) * 5)];
    if (mt === 'smile') pen.line([[fx - mw * .5, my], [fx, my + 4], [fx + mw * .5, my]], 2.6, LC);
    else if (mt === 'wobble') pen.line([[fx - mw, my], [fx - mw * .5, my - 3], [fx, my], [fx + mw * .5, my - 3], [fx + mw, my]], 2.6, LC);
    else if (mt === 'smirk') { pen.line([[fx - mw, my - 1], [fx, my + 3], [fx + mw, my - 6]], 2.6, LC); for (const s of [-.45, .3]) pen.fill([[fx + s * mw - 4, my + 1], [fx + s * mw + 4, my + 1], [fx + s * mw, my + 8]], '#FFFCF7', .2); }
    else if (mt === 'grin') { const p = [[fx - mw, my - 3], [fx + mw, my - 3]]; for (let i = 0; i <= 6; i++) { const a2 = i / 6 * PI; p.push([fx + Math.cos(a2) * mw, my - 3 + Math.sin(a2) * mw * .7]); } pen.fill(p, '#2A1612', .2); const zz = []; for (let i = 0; i <= 6; i++) zz.push([fx - mw * .85 + i * mw * 1.7 / 6, my - 2 + (i % 2 ? 4 : 0)]); pen.line(zz, 1.8, '#FFFCF7', .1); }
    else if (mt === 'fang') { pen.line([[fx - mw * .8, my], [fx + mw * .8, my]], 2.6, LC); for (const s of [-1, 1]) pen.fill([[fx + s * mw * .4 - 3, my], [fx + s * mw * .4 + 3, my], [fx + s * mw * .4, my + 8]], '#FFFCF7', .15); }
    else if (mt === 'o') pen.fill(ell(fx, my + 2, 4.5, 5.5, 12), '#2A1612', .15);
    else pen.line([[fx - mw * .8, my + 1], [fx - mw * .3, my - 2], [fx + mw * .2, my + 2], [fx + mw * .8, my - 1]], 2.6, LC);
    if (nerv) pen.fill(drop(cx + w * .5, y0 + 6 + Math.sin(t * 3) * 2), '#9FC4DE', .2);
    if (caught && !o.quiet) { const k = (t * .6) % 1, zx = cx + w * .45 + k * 10, zy = y0 - 6 - k * 16, z = 6; c.globalAlpha = 1 - k; pen.line([[zx - z, zy - z], [zx + z, zy - z], [zx - z, zy + z], [zx + z, zy + z]], 2.4, o.fx || '#1C1A17'); c.globalAlpha = 1; }
  }

  function legacyMonster(pen, o, m, t) {
    const S = strHash(o.seed || 'task'), R = k => hash(S + k * 101), c = pen.c;
    const type = o.body != null ? +o.body : Math.floor(R(1) * 3), eyesN = o.eyes != null ? +o.eyes : 1 + Math.floor(R(2) * 3);
    const horns = R(3) > .45, legs = 2 + Math.floor(R(4) * 2), teeth = R(5) > .3, rx = 42 + R(6) * 12, ry = 38 + R(7) * 12;
    const nerv = m === 'nervous', caught = m === 'caught', shake = nerv ? Math.sin(t * 40) * 1.6 : 0, bob = caught ? Math.sin(t * 1.2) : Math.sin(t * 2 + R(8) * 6) * 2;
    const base = 172, cx = 100 + shake, legH = caught ? 0 : 10, cy = base - legH - ry * .92 + bob + (caught ? 4 : 0);
    if (!o.noShadow) pen.fill(ell(100, base + 2, rx * .9, 5, 14), 'rgba(28,26,23,.08)', .2);
    if (!caught) for (let i = 0; i < legs; i++) { const x = cx - rx * .45 + i * (rx * .9 / (legs - 1)); pen.fill(ribbon([[x, cy + ry * .6], [x + (i % 2 ? 1.5 : -1.5), (cy + base) / 2 + 10], [x + (i % 2 ? 3 : -3), base - 1]], 3.6, 3.2), MON.shade); }
    if (horns) for (const s of [-1, 1]) pen.fill([[cx + s * rx * .3, cy - ry * .75], [cx + s * rx * .62, cy - ry * .62], [cx + s * rx * .58, cy - ry - 16]], MON.horn);
    let pts;
    if (type === 0) { pts = []; for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2, k = i % 2 ? 1.16 : .95; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? .9 : 1)]); } }
    else if (type === 1) pts = ell(cx, cy, rx, ry, 18, .14, R(9) * 6 + t * .5);
    else { pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2, cc = Math.cos(a), s = Math.sin(a); pts.push([cx + Math.sign(cc) * Math.pow(Math.abs(cc), .45) * rx * .92, cy + Math.sign(s) * Math.pow(Math.abs(s), .45) * ry * .9]); } }
    riso(pen, pts, MON.body, MON.shade, cx, cy, { sd: 10, grainN: 90 });
    for (let i = 0; i < 3; i++) pen.blot(cx + (R(20 + i) - .5) * rx * 1.2, cy + ry * (.25 + R(30 + i) * .4), 3 + R(40 + i) * 3, MON.spot, .2);
    const E = { eye: caught ? 'closed' : 'round', open: nerv ? 1.15 : .55, tilt: nerv ? 0 : .35, lx: nerv ? Math.sin(t * 9) * .5 : Math.sin(t * .7) * .6, ly: nerv ? -.2 : 0, pup: nerv ? .42 : .55 };
    const K = { ink: MON.ink, white: MON.white };
    const er = eyesN === 1 ? 15 : eyesN === 2 ? 11 : 8.5, ey = cy - ry * .22;
    for (let i = 0; i < eyesN; i++) {
      const ex = eyesN === 1 ? cx : cx - rx * .42 + i * (rx * .84 / (eyesN - 1)), yy = ey - (eyesN === 3 && i === 1 ? 7 : 0);
      if (caught) pen.line([[ex - er * .7, yy], [ex, yy + er * .4], [ex + er * .7, yy]], 2.8, MON.white); else eye(pen, K, E, ex, yy, i < eyesN / 2 ? -1 : 1, er, MON.body, t);
    }
    const my = cy + ry * .36, mw = rx * .42, W = MON.white;
    if (caught) pen.line([[cx - mw * .5, my], [cx, my + 4], [cx + mw * .5, my]], 2.8, W);
    else if (nerv) pen.line([[cx - mw, my], [cx - mw * .5, my - 3], [cx, my], [cx + mw * .5, my - 3], [cx + mw, my]], 2.8, W);
    else pen.line([[cx - mw, my - 1], [cx, my + 3], [cx + mw, my - 6]], 2.8, W);
    if (teeth && !caught) for (const s of [-.45, .3]) pen.fill([[cx + s * mw - 4, my + 1], [cx + s * mw + 4, my + 1], [cx + s * mw, my + 8]], W, .2);
    if (nerv) pen.fill(drop(cx + rx * .75, cy - ry * .7 + Math.sin(t * 3) * 2), '#9FC4DE', .2);
    if (caught && !o.quiet) { const k = (t * .6) % 1, zx = cx + rx * .7 + k * 10, zy = cy - ry - 4 - k * 16, z = 6; c.globalAlpha = 1 - k; pen.line([[zx - z, zy - z], [zx + z, zy - z], [zx - z, zy + z], [zx + z, zy + z]], 2.4, o.fx || '#1C1A17'); c.globalAlpha = 1; }
  }

  function world(pen, el, t, W, H) {
    const c = pen.c, n = Math.max(0, parseInt(el.getAttribute('count') || '1')), dark = el.getAttribute('on') === 'dark';
    const wide = Math.min(1, .5 + n / 40), hx = 100, hy = 150, hrx = 64 + wide * 32, hry = 22 + wide * 14;
    riso(pen, ell(hx, hy + 8, hrx, hry, 28, .04, 1), '#E5DCCD', '#D2C6B3', hx, hy, { sd: 6, grainN: 200, gw: 200, gh: 60 });
    const items = [];
    for (let i = 0; i < n; i++) {
      const a = hash(i * 13 + 5) * PI * 2, rr = Math.sqrt(hash(i * 13 + 6)) * .88;
      const x = hx + Math.cos(a) * hrx * rr, y = hy + 6 + Math.sin(a) * hry * rr;
      if (n === 1) { items.push({ i, x: hx + 46, y: hy + 4, k: 0 }); continue; }
      const nd = n <= 8 ? 40 : 26; let xx = x; if (Math.abs(x - hx) < nd && Math.abs(y - (hy + 8)) < 12) xx = hx + (x < hx ? -1 : 1) * nd;
      items.push({ i, x: xx, y, k: hash(i * 7 + 1) });
    }
    items.push({ i: -1, x: hx, y: hy + 10, k: 0 });
    items.sort((p, q) => p.y - q.y);
    const sc = n <= 1 ? .34 : n <= 8 ? .24 : n <= 24 ? .17 : .13;
    for (const it of items) {
      c.save(); c.translate(it.x, it.y);
      if (it.i === -1) { c.scale(sc * 1.5, sc * 1.5); c.translate(-100, -172); scootch(pen, SK, el.getAttribute('mood') || 'proud', t); }
      else if (it.k < .62) { c.scale(sc, sc); c.translate(-100, -172); monster(pen, { seed: 'w' + it.i, noShadow: false, quiet: true, random: 1 }, 'caught', t + it.i); }
      else if (it.k < .78) { pen.line([[0, 0], [0, -26 * sc * 2.4]], 1.6, '#1C1A17', .2); pen.fill([[0, -26 * sc * 2.4], [12 * sc * 2.4, -21 * sc * 2.4], [0, -16 * sc * 2.4]], SK.body, .2); }
      else if (it.k < .9) { const s = sc * 2.4; pen.fill(ell(0, -9 * s, 10 * s, 9 * s, 12, .1, it.i), '#B8AC97', .2); pen.fill(ell(-7 * s, -4 * s, 7 * s, 6 * s, 10, .1, it.i), '#A89C87', .2); }
      else { const s = sc * 2.4; pen.fill([[-9 * s, 0], [9 * s, 0], [9 * s, -12 * s], [-9 * s, -12 * s]], '#3A3430', .2); pen.fill([[-12 * s, -11 * s], [12 * s, -11 * s], [0, -22 * s]], SK.body, .2); pen.blot(0, -5 * s, 2.2 * s, '#F6D9A8', .1); }
      c.restore();
    }
  }


  // ---------- Scootch sound engine: one key (D major pentatonic), one room ----------
  window.ScootchAudio = window.ScootchAudio || (function () {
    let ctx, master, verbIn, NB;
    const init = () => {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.2; comp.attack.value = .003; comp.release.value = .22;
      master = ctx.createGain(); master.gain.value = .85;
      const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 200; warm.gain.value = 2.5;
      const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 7000; air.gain.value = -4;
      master.connect(warm).connect(air).connect(comp).connect(ctx.destination);
      const r = ctx.sampleRate, n = Math.floor(r * 2.2), ir = ctx.createBuffer(2, n, r);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3) * (i < r * .006 ? i / (r * .006) : 1); }
      const verb = ctx.createConvolver(); verb.buffer = ir;
      const pre = ctx.createDelay(); pre.delayTime.value = .02;
      const vlp = ctx.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 5200;
      verbIn = ctx.createGain(); verbIn.gain.value = .3; verbIn.connect(pre).connect(verb).connect(vlp).connect(master);
      return ctx;
    };
    const out = (node, wet = .4) => { node.connect(master); if (wet) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s).connect(verbIn); } };
    const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
    const pan = p => { const n = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (n.pan) n.pan.value = Math.max(-1, Math.min(1, p)); return n; };
    const ROOT = 62, PENT = [0, 2, 4, 7, 9];
    const note = i => ROOT + PENT[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const hap = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
    const nbuf = () => { if (NB) return NB; const n = ctx.sampleRate * 1.5; NB = ctx.createBuffer(1, n, ctx.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return NB; };
    function marimba(t, m, v = .25, p = 0, wet = .45) {
      const f = hz(m), g = ctx.createGain(), P = pan(p); g.connect(P); out(P, wet); const len = 1 + (72 - m) / 40;
      [[1, 1, .7], [3.99, .32, .16], [9.8, .07, .05]].forEach(([mul, amp, dec]) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * mul * 1.006, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + .025); const og = ctx.createGain(); env(og, t, .003, v * amp, dec * len); o.connect(og).connect(g); o.start(t); o.stop(t + dec * len + .1); });
      noise(t, .012, v * .18, 'bandpass', 3800, null, 2, p, 0);
    }
    function bell(t, m, v = .08, p = 0, wet = .9) {
      const f = hz(m), g = ctx.createGain(), P = pan(p); g.connect(P); out(P, wet);
      [[1, 1, 1.8], [2.76, .38, .9], [5.4, .18, .4], [8.93, .07, .2]].forEach(([mul, amp, dec]) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul; const og = ctx.createGain(); env(og, t, .002, v * amp, dec); o.connect(og).connect(g); o.start(t); o.stop(t + dec + .05); });
    }
    function thump(t, v = .5, f0 = 150, f1 = 46, d = .32) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * .55); const g = ctx.createGain(); env(g, t, .003, v, d); o.connect(g); out(g, 0); o.start(t); o.stop(t + d + .05); }
    function noise(t, d, v, type = 'bandpass', f0 = 2000, f1, q = 1, p = 0, wet = .3) { const s = ctx.createBufferSource(); s.buffer = nbuf(); const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d); const g = ctx.createGain(); env(g, t, Math.min(.012, d * .25), v, d); const P = pan(p); s.connect(fl).connect(g).connect(P); out(P, wet); s.start(t, Math.random() * .8); s.stop(t + d + .05); }
    const clap = (t, v = .2) => [0, .009, .019].forEach((o, i) => noise(t + o, i === 2 ? .14 : .03, v, 'bandpass', 1500, null, 1.1, 0, .6));
    const shaker = (t, v = .05, p = 0) => noise(t, .045, v, 'highpass', 7500, null, .7, p, .15);
    function pad(t, ms, d, v = .04, wet = 1.1) { ms.forEach((m, i) => [-5, 5].forEach(det => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = det; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .09 + i * .02); g.gain.exponentialRampToValueAtTime(.0001, t + d); const P = pan(det / 10); o.connect(g).connect(P); out(P, wet); o.start(t); o.stop(t + d + .05); })); }
    function voice(t, f0, f1, d, v = .15, vib = 6, type = 'triangle', p = 0) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * .75);
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib || .01; lg.gain.value = vib ? f0 * .022 : 0; l.connect(lg).connect(o.frequency);
      const f1f = ctx.createBiquadFilter(); f1f.type = 'peaking'; f1f.frequency.value = 900; f1f.Q.value = 2; f1f.gain.value = 8;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
      const g = ctx.createGain(); env(g, t, .014, v, d); const P = pan(p); o.connect(f1f).connect(lp).connect(g).connect(P); out(P, .35); o.start(t); l.start(t); o.stop(t + d + .05); l.stop(t + d + .05);
    }
    const now = () => init().currentTime + .012;
    const A = {
      ctx: init, note, hz, marimba, bell, thump, noise, clap, shaker, pad, voice,
      get master() { init(); return master; }, get verbIn() { init(); return verbIn; },
      chirp(kind) {
        const t = now();
        if (kind === 'task') {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(92, t); o.frequency.linearRampToValueAtTime(128, t + .12); o.frequency.linearRampToValueAtTime(76, t + .34);
          const lf = ctx.createOscillator(), lg = ctx.createGain(); lf.frequency.value = 24; lg.gain.value = 16; lf.connect(lg).connect(o.frequency);
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 7; const g = ctx.createGain(); env(g, t, .02, .11, .34);
          o.connect(lp).connect(g); out(g, .2); o.start(t); lf.start(t); o.stop(t + .42); lf.stop(t + .42); marimba(t + .32, note(-5), .1); hap(14); return;
        }
        voice(t, hz(note(5)), hz(note(7)), .11, .15); voice(t + .12, hz(note(7)), hz(note(9)) * 1.02, .17, .16);
        marimba(t + .27, note(10), .13, .3); bell(t + .31, note(14), .04, -.3); hap([8, 60, 12]);
      },
      burst() {
        const t = now(), b = .07;
        thump(t, .6); noise(t, .32, .2, 'bandpass', 500, 6000, .8, 0, .4);
        [0, 2, 4, 5, 7, 9].forEach((s, i) => marimba(t + i * b, note(5 + s), .23 - i * .01, i % 2 ? .3 : -.3));
        clap(t + b * 4, .18); thump(t + b * 6, .35, 110, 50, .25);
        pad(t + b * 6, [note(5), note(7), note(9), note(12)], 1.9, .035);
        [0, 1, 2].forEach(i => bell(t + b * 6 + .02 + i * .07, note(15 + i * 2), .05, (i - 1) * .5));
        [0, 1, 2, 3].forEach(i => shaker(t + b * (8 + i * 2), .045, i % 2 ? .4 : -.4));
        hap([22, 48, 12, 48, 12, 48, 44]);
      },
      hold() {
        const c = init(); let alive = true, p = 0, nextT = c.currentTime + .02, idxLast = -1, timer;
        const sw = c.createBufferSource(); sw.buffer = nbuf(); sw.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.value = 420; const sg = c.createGain(); sg.gain.value = .0001; sw.connect(bp).connect(sg); out(sg, .5); sw.start();
        const drone = [note(0) - 12, note(0)].map(m => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); return o; }); const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 320; const dg = c.createGain(); dg.gain.value = .0001; drone.forEach(o => { o.connect(dl); o.start(); }); dl.connect(dg); out(dg, .8);
        const step = () => {
          if (!alive) return; const T = c.currentTime, iv = .3 - p * .22;
          while (nextT < T + .07) { const idx = Math.min(14, Math.floor(p * 15)); marimba(nextT, note(idx), .11 + p * .12, idx % 2 ? .25 : -.25, .35); if (idx !== idxLast && idx % 5 === 0 && idx > 0) bell(nextT, note(idx + 10), .035); idxLast = idx; if (p > .45) shaker(nextT + iv / 2, .025 + p * .03, .3); if (p > .75) thump(nextT, .12 + p * .1, 90, 50, .12); hap(Math.round(6 + p * 18)); nextT += iv; }
          sg.gain.setTargetAtTime(.012 + p * p * .14, T, .06); bp.frequency.setTargetAtTime(380 + p * 4200, T, .06); dg.gain.setTargetAtTime(.02 + p * .06, T, .12); dl.frequency.setTargetAtTime(280 + p * 2400, T, .12);
          timer = setTimeout(step, 28);
        };
        step();
        const stop = f => { alive = false; clearTimeout(timer); const T = c.currentTime; [sg, dg].forEach(g => { g.gain.cancelScheduledValues(T); g.gain.setTargetAtTime(.0001, T, f / 3); }); sw.stop(T + f + .15); drone.forEach(o => o.stop(T + f + .15)); };
        return {
          set(v) { p = v; },
          release() { const T = c.currentTime, k = Math.floor(p * 15); stop(.35); if (p > .08) { marimba(T + .02, note(Math.max(0, k - 1)), .1, .2); marimba(T + .15, note(Math.max(0, k - 3)), .08, -.2); voice(T + .05, hz(note(9)), hz(note(5)), .34, .11, 5); } },
          complete() { stop(.06); A.finish(); }
        };
      },
      finish() {
        const t = now();
        thump(t, .75, 120, 38, .7); noise(t, .7, .22, 'lowpass', 9000, 260, .6, 0, .7); clap(t, .16);
        pad(t, [note(0) - 12, note(0), note(2), note(4), note(7)], 3, .045, 1.3);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(note(0) - 24); const g = ctx.createGain(); env(g, t, .02, .22, 2.2); o.connect(g); out(g, 0); o.start(t); o.stop(t + 2.3);
        for (let i = 0; i < 10; i++) bell(t + .1 + i * .052, note(19 - i + (i > 4 ? 6 : 0)), .05 - i * .003, ((i % 3) - 1) * .55);
        [0, 2, 4, 5].forEach((s, i) => marimba(t + .62 + i * .1, note(10 + s), .13, i % 2 ? .3 : -.3));
        voice(t + 1.08, hz(note(10)), hz(note(12)), .24, .12);
        hap([32, 40, 60, 40, 30, 40, 180]);
      },
      aww() { const t = now(); voice(t, hz(note(9)), hz(note(5)), .38, .13, 5); marimba(t + .06, note(4), .07); },
      tick() { const t = now(); noise(t, .02, .07, 'bandpass', 3400, null, 3, 0, .05); marimba(t, note(10), .05, 0, .15); hap(7); },
      listen() { const t = now(); marimba(t, note(5), .09, -.2, .3); marimba(t + .07, note(7), .1, .2, .3); hap(10); },
      send() { const t = now(); noise(t, .3, .11, 'bandpass', 450, 5200, 1, 0, .35); marimba(t + .09, note(7), .13, -.2); marimba(t + .17, note(10), .14, .2); bell(t + .25, note(14), .045); hap([6, 40, 10]); },
      cancel() { const t = now(); marimba(t, note(7), .09, .2); marimba(t + .09, note(4), .08, -.2); hap(10); }
    };
    return A;
  })();

  let AC = null;
  function chirp(kind) {
    if (window.ScootchAudio) { try { return window.ScootchAudio.chirp(kind); } catch (e) { } }
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const now = AC.currentTime, spec = kind === 'task' ? { n: [110, 98, 123], w: 'sawtooth', g: .035 } : { n: [523, 784, 659, 1047], w: 'triangle', g: .13 };
      spec.n.forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(), s = now + i * .075; o.type = spec.w; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * 1.4, s + .09); g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(spec.g, s + .012); g.gain.exponentialRampToValueAtTime(.0001, s + .2); o.connect(g).connect(AC.destination); o.start(s); o.stop(s + .22); });
    } catch (e) { }
  }
  window.ScootchSound = { chirp };

  let SEED = 1;
  const FRAME_MS = 1000 / 30;
  class Critter extends HTMLElement {
    connectedCallback() {
      if (!this.cv) {
        this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%';
        this.cv = document.createElement('canvas'); this.cv.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;touch-action:manipulation';
        this.appendChild(this.cv); this.ctx = this.cv.getContext('2d'); this.seed = (SEED++) * 977; this.vis = true;
        this.t0 = performance.now() / 1000 - hash(this.seed) * 10;
        this.cv.addEventListener('pointerdown', () => { const k = this.getAttribute('kind') || 'scootch'; if (k === 'world') return; this._pop = performance.now() / 1000 + 1.4; this._popMood = k === 'task' ? 'nervous' : 'celebrate'; if (this.getAttribute('sound') !== 'off') chirp(k); });
        this._onPop = e => { const d = e.detail || {}; if (!d.group || d.group !== this.getAttribute('group')) return; this._pop = performance.now() / 1000 + (d.dur || 1.6); this._popMood = this.getAttribute('kind') === 'task' ? (d.task || 'caught') : (d.mood || 'celebrate'); };
        window.addEventListener('scootch-pop', this._onPop);
        this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
        this.io = new IntersectionObserver(e => { this.vis = e[e.length - 1].isIntersecting; }); this.io.observe(this);
      }
      this.resize();
      const loop = () => { this.raf = requestAnimationFrame(loop); if (!this.vis) return; const n = performance.now(); if (n - (this._lf || 0) < FRAME_MS) return; this._lf = n; const r = this.getBoundingClientRect(); if (r.bottom < -40 || r.top > innerHeight + 40 || r.right < -40 || r.left > innerWidth + 40 || r.width < 2) return; this.draw(n / 1000); };
      cancelAnimationFrame(this.raf); loop();
    }
    disconnectedCallback() { cancelAnimationFrame(this.raf); window.removeEventListener('scootch-pop', this._onPop); this.cv = null; this.innerHTML = ''; }
    resize() { if (!this.cv) return; const d = Math.min(2, window.devicePixelRatio || 1); this.cv.width = Math.max(1, Math.round(this.offsetWidth * d)); this.cv.height = Math.max(1, Math.round(this.offsetHeight * d)); this._last = null; }
    draw(now) {
      const a = k => this.getAttribute(k), kind = a('kind') || 'scootch';
      const t = now - this.t0, still = a('still') === 'on', frame = still ? 0 : Math.floor(t * 4) % 3;
      if (kind === 'world') { const key = frame + ':' + a('count') + ':' + this.cv.width; if (key === this._last) return; this._last = key; }
      const ctx = this.ctx, w = this.cv.width, h = this.cv.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
      const s = Math.min(w, h) / 200; ctx.setTransform(s, 0, 0, s, (w - 200 * s) / 2, (h - 200 * s) / 2);
      let mood = a('mood') || (kind === 'task' ? 'idle' : 'waiting'); if (this._pop && now < this._pop) mood = this._popMood || 'celebrate';
      const pen = new Pen(ctx, frame, this.seed);
      if (kind === 'world') return world(pen, this, Math.floor(t * 4) / 4);
      if (kind === 'task') { const sz = parseFloat(a('size') || '1'); ctx.translate(100, 174); ctx.scale(sz, sz); ctx.translate(-100, -174); return monster(pen, { seed: a('seed'), type: a('type'), body: a('body'), eyes: a('eyes'), fx: a('on') === 'dark' ? '#F6F3EE' : '#1C1A17' }, mood, t); }
      const tone = a('tone'), K = tone === 'paper' ? SK_PAPER : a('on') === 'dark' ? SK_DARK : SK;
      let gaze = null;
      if (performance.now() - PTR.t < 3500 && this.offsetWidth > 90) { const r = this.getBoundingClientRect(), dx = PTR.x - (r.left + r.width / 2), dy = PTR.y - (r.top + r.height * .45), d = Math.hypot(dx, dy); if (d < 700) { const k = Math.min(1, d / 160); this._gz = this._gz || [0, 0]; const tx = dx / (d || 1) * k, ty = dy / (d || 1) * k * .8; this._gz[0] += (tx - this._gz[0]) * .18; this._gz[1] += (ty - this._gz[1]) * .18; gaze = this._gz; } }
      if (!gaze && this._gz) { this._gz[0] *= .9; this._gz[1] *= .9; if (Math.abs(this._gz[0]) + Math.abs(this._gz[1]) > .02) gaze = this._gz; }
      const key = mood + '|' + (a('work') || ''); if (key !== this._mk) { if (this._mk) this._mt = now; this._mk = key; }
      scootch(pen, K, mood, t, { since: this._mt ? now - this._mt : null, hat: a('hat') === 'on', work: (this._pop && now < this._pop) ? null : a('work'), gaze });
    }
  }
  customElements.define('scootch-critter', Critter);
})();
