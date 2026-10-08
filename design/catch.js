(function () {
  if (customElements.get('scootch-catch')) return;
  const PI = Math.PI, INK = '#1C1A17', ACC = '#F0562E', MUTED = '#6F6A62', PAPER = '#F6F3EE';
  const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";
  const ROUND = "ui-rounded, 'SF Pro Rounded', 'Nunito', -apple-system, system-ui, sans-serif";
  const GLS = 'background:rgba(255,255,255,.58);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);box-shadow:inset 0 1px .5px rgba(255,255,255,.95),inset 0 -.5px .5px rgba(255,255,255,.5),0 0 0 .5px rgba(28,26,23,.16),0 10px 30px -8px rgba(28,26,23,.18)';
  const E = (css, html, tag) => { const e = document.createElement(tag || 'div'); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t * t, inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const back = t => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  const NS = 'http://www.w3.org/2000/svg';
  function critter(attrs) { const c = document.createElement('scootch-critter'); for (const k in attrs) if (attrs[k] != null) c.setAttribute(k, attrs[k]); return c; }
  function inPoly([x, y], pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }

  function fxLayer(host) {
    const cv = E('position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:20', null, 'canvas'); host.append(cv);
    const ctx = cv.getContext('2d'); let parts = [], raf = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = host.offsetWidth * d; cv.height = host.offsetHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const loop = () => {
      ctx.clearRect(0, 0, host.offsetWidth, host.offsetHeight); const now = performance.now();
      parts = parts.filter(p => now - p.t0 < p.life);
      for (const p of parts) {
        if (now < p.t0) continue;
        const k = (now - p.t0) / p.life, e = 1 - Math.pow(1 - k, 3), x = p.x + p.vx * e, y = p.y + p.vy * e + p.g * k * k;
        ctx.globalAlpha = k > .6 ? (1 - k) / .4 : 1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + k * p.spin);
        if (p.kind === 'puff') { ctx.beginPath(); ctx.arc(0, 0, p.w * (1 + k * 1.6), 0, PI * 2); ctx.fill(); }
        else if (p.kind === 'bit') { ctx.fillRect(-p.len / 2, -2.2, p.len, 4.4); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.w, 0, PI * 2); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; raf = parts.length ? requestAnimationFrame(loop) : 0;
    };
    return {
      burst(x, y, o = {}) {
        size(); const now = performance.now(), n = o.n || 30, cols = o.colors || [ACC, INK, ACC, '#E7DCCB'];
        for (let i = 0; i < n; i++) {
          const a = o.angle != null ? o.angle + (Math.random() - .5) * (o.spread || 1) : Math.random() * PI * 2, sp = (o.speed || 200) * (.4 + Math.random() * .8);
          parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0), g: o.g != null ? o.g : 240, t0: now + (o.delay || 0) + Math.random() * 50, life: (o.life || 900) + Math.random() * 400, c: cols[i % cols.length], w: o.w || (2.5 + Math.random() * 3), len: 8 + Math.random() * 9, kind: o.kind || (i % 2 ? 'bit' : 'dot'), rot: Math.random() * 6, spin: (Math.random() - .5) * 10 });
        }
        if (!raf) raf = requestAnimationFrame(loop);
      }
    };
  }

  function mkMon(h, size = 240) {
    const w = E('position:absolute;left:0;top:0;width:' + size + 'px;height:' + size + 'px;pointer-events:none;will-change:transform;transform-origin:120px 209px');
    const c = critter({ kind: 'task', seed: h.getAttribute('seed') || 'dentist', type: h.getAttribute('type') || 'tooth', mood: 'idle', sound: 'off', still: h.getAttribute('still') });
    w.append(c); h.mon = w; h.monC = c; return w;
  }
  const stampEl = (x, y) => E('position:absolute;left:' + x + 'px;top:' + y + 'px;z-index:8;background:' + ACC + ';color:#fff;font:800 15px/1 ' + SANS + ';letter-spacing:.08em;padding:10px 13px;border-radius:8px;box-shadow:0 0 0 3px ' + PAPER + ',0 6px 14px -4px rgba(28,26,23,.4);opacity:0;pointer-events:none', 'CAUGHT');
  const thwack = el => el.animate([{ opacity: 0, transform: 'rotate(30deg) scale(2.4)' }, { opacity: 1, transform: 'rotate(6deg) scale(.9)', offset: .5 }, { transform: 'rotate(9deg) scale(1.06)', offset: .75 }, { opacity: 1, transform: 'rotate(9deg) scale(1)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  const cancelAll = (...els) => els.forEach(el => el && el.getAnimations().forEach(a => a.cancel()));

  function mkBinder(h, top = 120) {
    h.binder = E('position:absolute;right:22px;top:' + top + 'px;width:50px;height:62px;z-index:5;pointer-events:none');
    h.binder.append(E('position:absolute;inset:0;border-radius:8px;background:#3A3430;transform:rotate(9deg)'), E('position:absolute;inset:0;border-radius:8px;background:' + INK + ';padding:4px;box-sizing:border-box', '<div style="width:100%;height:100%;border-radius:5px;background-color:#F3E6D3;background-image:radial-gradient(rgba(240,86,46,.3) 1.2px,transparent 1.4px);background-size:7px 7px"></div>'));
    h.count = E('position:absolute;right:-10px;bottom:-8px;min-width:28px;height:24px;border-radius:12px;background:' + ACC + ';color:#fff;font:700 12px ' + SANS + ';display:flex;align-items:center;justify-content:center;padding:0 6px;box-sizing:border-box;box-shadow:0 0 0 2.5px ' + PAPER + ';font-variant-numeric:tabular-nums', '41');
    h.binder.append(h.count); h.bxy = [393 - 22 - 25, top + 31]; return h.binder;
  }
  function bumpBinder(h) { h.count.textContent = '42'; h.binder.animate([{ transform: 'scale(1.3) rotate(-6deg)' }, { transform: 'scale(.94)', offset: .5 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' }); h.sfx((a, t) => a.marimba(t, a.note(12), .12)); }
  function flyTo(h, el, c0, o, done, ms = 720) {
    h.tw(ms, k => { const e = inOut(k), cx = lerp(c0[0], h.bxy[0], e), cy = lerp(c0[1], h.bxy[1], e) - Math.sin(k * PI) * 110, sc = lerp(1, .1, e); el.style.transform = 'translate(' + (cx - o[0]) + 'px,' + (cy - o[1]) + 'px) rotate(' + (k * -24) + 'deg) scale(' + sc + ')'; }, null, () => { el.style.opacity = 0; bumpBinder(h); done && done(); });
  }

  /* ---------- 1a · The jar: it lowers while you work; pull it down to slam ---------- */
  const JAR = {
    cap: 'bottom',
    build(h) {
      const F = 560; h.F = F;
      const floor = E('position:absolute;left:24px;right:24px;top:' + F + 'px;height:2px;border-radius:1px;background:rgba(28,26,23,.10)');
      h.jsh = E('position:absolute;left:96px;top:' + (F - 10) + 'px;width:200px;height:20px;border-radius:50%;background:rgba(28,26,23,.14)');
      const m = mkMon(h); m.style.left = '76px'; m.style.top = (F - 209) + 'px';
      h.grp = E('position:absolute;left:96px;top:0;width:200px;height:250px;z-index:4;will-change:transform;transform-origin:100px 125px;pointer-events:none');
      const body = E('position:absolute;left:8px;right:8px;top:0;height:228px;box-sizing:border-box;border:3px solid ' + INK + ';border-radius:46px 46px 30px 30px;background:rgba(142,187,218,.16)');
      body.append(E('position:absolute;left:18px;top:28px;width:13px;height:118px;border-radius:7px;background:rgba(255,255,255,.85)'), E('position:absolute;left:18px;top:156px;width:13px;height:18px;border-radius:7px;background:rgba(255,255,255,.85)'));
      const rim = E('position:absolute;left:0;right:0;bottom:0;height:28px;box-sizing:border-box;border:3px solid ' + INK + ';border-radius:9px;background:rgba(246,243,238,.75);display:flex;flex-direction:column;justify-content:center;gap:5px;padding:0 12px');
      rim.append(E('height:2px;border-radius:1px;background:rgba(28,26,23,.3)'), E('height:2px;border-radius:1px;background:rgba(28,26,23,.3)'));
      h.card = E('position:absolute;left:-16px;top:247px;width:232px;height:12px;border-radius:4px;background-color:' + ACC + ';background-image:radial-gradient(rgba(28,26,23,.25) 1.4px,transparent 1.6px);background-size:8px 8px;box-shadow:0 0 0 2px ' + INK + ';opacity:0;transform:translateX(420px)');
      h.grp.append(body, rim, h.card);
      h.stamp = stampEl(226, 336);
      h.stage.append(floor, h.jsh, m, h.grp, h.stamp);
    },
    setJar(h, y, rot = 0) { h.jy = y; h.grp.style.transform = 'translateY(' + y + 'px) rotate(' + rot + 'deg)'; const k = clamp((y + 180) / 490); h.jsh.style.opacity = .2 + k * .8; h.jsh.style.transform = 'scale(' + (.4 + k * .6) + ')'; },
    render(h, p) {
      JAR.setJar(h, lerp(-180, 130, 1 - Math.pow(1 - p, 2)));
      h.mood(p < .45 ? 'idle' : 'nervous');
      h.mon.style.transform = 'scale(' + (1 + .04 * p) + ',' + (1 - .07 * p) + ')';
      if (p >= 1) h.say('Pull the jar down.', 'Drag down on it. Hard as you like.');
      else h.say(p < .45 ? 'The jar is coming down.' : 'He’s spotted the jar.', 'Every minute you work, it drops a little.');
    },
    tick(h, t) { if (h.state === 'ready' && !h.drag) JAR.setJar(h, 130 + Math.max(0, Math.sin(t * 3)) * 12); },
    down(h, x, y) {
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.notYet(); h.sfx(a => a.cancel()); } return false; }
      h.y0 = y; h.sfx((a, t) => a.marimba(t, a.note(3), .08)); return true;
    },
    move(h, x, y) {
      const dy = Math.max(0, y - h.y0), r = dy < 120 ? dy : 120 + (dy - 120) * .35, jy = Math.min(300, 130 + r), k = (jy - 130) / 170;
      JAR.setJar(h, jy); h.mon.style.transform = 'translateX(' + (Math.sin(performance.now() / 22) * k * 3) + 'px) scale(' + (1.04 + k * .05) + ',' + (.93 - k * .08) + ')';
    },
    up(h) {
      if (h.state !== 'ready') return;
      if (h.jy > 205) return JAR.slam(h);
      const from = h.jy; h.tw(480, k => JAR.setJar(h, lerp(from, 130, k)), back);
      h.mon.style.transform = 'scale(1.04,.93)'; h.say('Almost.', 'Pull it all the way down.', true); h.sfx(a => a.aww());
    },
    slam(h) {
      h.state = 'busy'; const from = h.jy;
      h.tw(110, k => JAR.setJar(h, lerp(from, 310, k)), k => k * k, () => {
        h.sfx((a, t) => { a.thump(t, .85, 150, 40, .45); a.noise(t, .25, .22, 'lowpass', 3000, 300, .7, 0, .3); a.marimba(t + .02, a.note(0), .12); });
        buzz([30, 30, 20]); h.shake(9);
        const puff = { n: 12, kind: 'puff', colors: ['#E2D9CA', '#D8CCB8'], spread: .7, speed: 90, g: -50, w: 6, life: 700 };
        h.fx.burst(98, h.F - 4, Object.assign({ angle: PI }, puff)); h.fx.burst(294, h.F - 4, Object.assign({ angle: 0 }, puff));
        h.mood('nervous'); h.mon.style.transform = '';
        h.mon.animate([{ transform: 'scale(1.1,.78)' }, { transform: 'scale(.95,1.08)', offset: .4 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
        h.say('Got him under there.', 'Hang on…');
        h.at(620, () => { h.card.style.opacity = 1; h.sfx(a => a.send()); h.card.animate([{ transform: 'translateX(420px)' }, { transform: 'translateX(-8px)', offset: .8 }, { transform: 'translateX(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); h.say('The card-under-the-glass trick.', 'Works on spiders. Works on monsters.'); });
        h.at(1350, () => {
          h.mood('caught'); h.mon.style.transformOrigin = '120px 150px';
          h.mon.animate([{ transform: 'none' }, { transform: 'translateY(-80px) rotate(180deg) scale(.92)', offset: .5 }, { transform: 'rotate(360deg)' }], { duration: 780, easing: 'ease-in-out' });
          h.sfx((a, t) => a.noise(t, .4, .1, 'bandpass', 600, 3000, 1, 0, .4));
          h.tw(780, k => JAR.setJar(h, 310 - Math.sin(k * PI) * 80, back(k) * 180), null, () => {
            h.sfx((a, t) => a.thump(t, .5, 120, 50, .25)); thwack(h.stamp);
            h.win('Got him.', 'Caught in 9 minutes. He’d lurked for 214 days.');
          });
        });
      });
    },
    reset(h) { cancelAll(h.card, h.stamp, h.mon, h.grp); h.card.style.opacity = 0; h.mon.style.transformOrigin = '120px 209px'; }
  };

  /* ---------- 1b · The reel: work winds him closer; three turns lands him ---------- */
  const KX = 196, KY = 712, TURN = PI * 2, NEED = TURN * 3;
  const REEL = {
    cap: 'top',
    build(h) {
      const HZ = 250;
      const field = E('position:absolute;left:0;right:0;top:' + HZ + 'px;bottom:0;background:#EFE8DC');
      const hz = E('position:absolute;left:0;right:0;top:' + HZ + 'px;height:2px;background:rgba(28,26,23,.10)');
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '393'); svg.setAttribute('height', '852'); svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:3;overflow:visible';
      const rod = document.createElementNS(NS, 'path'); rod.setAttribute('d', 'M410 880 L336 604'); rod.setAttribute('stroke', INK); rod.setAttribute('stroke-width', '7'); rod.setAttribute('stroke-linecap', 'round');
      h.line = document.createElementNS(NS, 'path'); h.line.setAttribute('fill', 'none'); h.line.setAttribute('stroke', INK); h.line.setAttribute('stroke-width', '1.8');
      svg.append(h.line, rod);
      const bBack = E('position:absolute;left:14px;top:668px;width:116px;height:20px;border-radius:50%;background:#8E8370;z-index:1'); bBack.append(E('position:absolute;left:8px;right:8px;top:4px;bottom:4px;border-radius:50%;background:#8EBBDA'));
      const m = mkMon(h); m.style.zIndex = 2;
      h.bucket = E('position:absolute;left:14px;top:676px;width:116px;height:92px;z-index:4;transform-origin:50% 100%');
      h.bucket.append(E('position:absolute;left:0;right:0;top:0;bottom:0;background:#B8AC97;clip-path:polygon(0 0,100% 0,86% 100%,14% 100%)'), E('position:absolute;left:12px;right:12px;top:36px;height:3px;border-radius:2px;background:rgba(28,26,23,.18)'));
      h.knob = E('position:absolute;left:' + (KX - 64) + 'px;top:' + (KY - 64) + 'px;width:128px;height:128px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(28,26,23,.06),0 10px 30px rgba(28,26,23,.12);z-index:5');
      const M = 'radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4.5px))';
      h.kring = E('position:absolute;inset:-12px;border-radius:50%;-webkit-mask:' + M + ';mask:' + M + ';background:#E7E1D7');
      h.arm = E('position:absolute;inset:0');
      h.arm.append(E('position:absolute;left:50%;top:30px;width:6px;height:36px;margin-left:-3px;border-radius:3px;background:#E7E1D7'), E('position:absolute;left:50%;top:12px;width:32px;height:32px;margin-left:-16px;border-radius:50%;background:' + ACC + ';box-shadow:inset 0 -3px 0 rgba(0,0,0,.15),0 3px 8px rgba(240,86,46,.4)'));
      h.knob.append(h.kring, h.arm, E('position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:' + INK));
      h.turns = E('position:absolute;left:0;right:0;top:' + (KY + 82) + 'px;text-align:center;font:600 13px ' + SANS + ';color:' + MUTED + ';z-index:5;font-variant-numeric:tabular-nums');
      h.stamp = stampEl(150, 600);
      h.stage.append(field, hz, bBack, m, h.bucket, svg, h.knob, h.turns, h.stamp);
      h.d = 0; h.acc = 0; h.ten = 0; h.jolt = 0;
    },
    pos(h, d, t) { return { s: lerp(.36, 1.02, d), fy: lerp(268, 560, d), x: 196 + Math.sin(t * 1.3) * 70 * (1 - d) + h.jolt }; },
    drawLine(h, hx, hy, t) { const tx = 336, ty = 604, sag = lerp(70, 3, h.ten), cx = (tx + hx) / 2 + Math.sin(t * 40) * h.ten * 2.5, cy = (ty + hy) / 2 + sag; h.line.setAttribute('d', 'M' + tx + ' ' + ty + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + hx.toFixed(1) + ' ' + hy.toFixed(1)); },
    place(h, t) { const { s, fy, x } = REEL.pos(h, h.d, t); h.mon.style.transform = 'translate(' + (x - 120) + 'px,' + (fy - 209) + 'px) scale(' + s + ')'; REEL.drawLine(h, x, fy - 128 * s, t); },
    knobUI(h) { const k = clamp(h.acc / NEED); h.kring.style.background = 'conic-gradient(' + ACC + ' ' + (k * 360) + 'deg,#E7E1D7 0)'; h.turns.textContent = h.state === 'ready' ? Math.min(3, Math.floor(h.acc / TURN)) + ' of 3 turns' : ''; },
    render(h, p) {
      h.d = .7 * easeOut(p); h.ten = p * .4; h.acc = 0; h.arm.style.transform = ''; REEL.knobUI(h);
      h.mood(h.d < .42 ? 'idle' : 'nervous');
      if (p >= 1) h.say('Wind him in.', 'Turn the reel. Three full turns.');
      else h.say('Reeling him in while you work.', Math.round(p * 70) + '% of the way · ' + (p < .6 ? 'he hasn’t noticed' : 'he’s noticed'));
    },
    tick(h, t, dt) {
      if (h.state === 'busy' || h.state === 'caught') return;
      if (h.state === 'ready') {
        if (!h.drag && h.acc > 0) { h.acc = Math.max(0, h.acc - dt * 1.4); REEL.knobUI(h); }
        h.d = .7 + .3 * clamp(h.acc / NEED); h.ten += ((h.drag ? .9 : .45) - h.ten) * .08;
      }
      h.jolt *= .86; REEL.place(h, t);
    },
    down(h, x, y) {
      if (Math.hypot(x - KX, y - KY) > 96) return false;
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.knob.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 360 }); h.notYet(); h.sfx(a => a.cancel()); } return false; }
      h.last = Math.atan2(y - KY, x - KX); return true;
    },
    move(h, x, y) {
      if (h.state !== 'ready') return;
      const a = Math.atan2(y - KY, x - KX), da = ((a - h.last + 3 * PI) % TURN) - PI; h.last = a;
      h.arm.style.transform = 'rotate(' + (a + PI / 2) + 'rad)';
      if (da <= 0) return;
      const prev = h.acc; h.acc += da; const step = PI / 3;
      if (Math.floor(h.acc / step) > Math.floor(prev / step)) {
        const i = Math.floor(h.acc / step); h.sfx((au, t) => { au.marimba(t, au.note(i), .1 + i * .008, i % 2 ? .3 : -.3); au.noise(t, .02, .06, 'bandpass', 3400, null, 3, 0, .05); }); buzz(6 + i);
        h.jolt = (Math.random() - .5) * 14; h.ten = 1;
        if (i % 6 === 0) h.say(['', 'He’s fighting it.', 'One more turn!'][i / 6] || 'Keep winding.', 'Don’t let go. He slips back if you stop.');
      }
      REEL.knobUI(h);
      if (h.acc >= NEED) REEL.yank(h);
    },
    up(h) { if (h.state === 'ready' && h.acc > .3) h.say('Don’t stop now!', 'He’s pulling back out.'); },
    yank(h) {
      h.state = 'busy'; h.drag = false; h.turns.textContent = '';
      h.sfx((a, t) => { a.noise(t, .3, .2, 'bandpass', 500, 5000, 1, 0, .3); a.voice(t, a.hz(a.note(7)), a.hz(a.note(12)), .25, .13); }); buzz([20, 30, 40]);
      h.mood('nervous'); h.say('Hup!', '');
      const st = REEL.pos(h, 1, 0), x0 = st.x, y0 = st.fy, s0 = st.s, x1 = 72, y1 = 760, s1 = .5;
      h.mon.style.transformOrigin = '120px 150px';
      h.tw(760, k => {
        const e = inOut(k), x = lerp(x0, x1, e), fy = lerp(y0, y1, e) - Math.sin(k * PI) * 280, s = lerp(s0, s1, e) * (1 + Math.sin(k * PI) * .25);
        h.mon.style.transform = 'translate(' + (x - 120) + 'px,' + (fy - 150 - 59 * s) + 'px) rotate(' + (k * 360) + 'deg) scale(' + s + ')';
        h.ten = 1; REEL.drawLine(h, x, fy - 128 * s, 0); h.line.style.opacity = 1 - clamp((k - .3) * 3);
      }, null, () => {
        h.fx.burst(72, 680, { n: 28, colors: ['#8EBBDA', '#BFD9EA', '#FFFFFF'], angle: -PI / 2, spread: 1.5, speed: 260, g: 560, kind: 'dot' });
        h.sfx((a, t) => { a.thump(t, .6, 120, 45, .3); a.noise(t, .35, .2, 'bandpass', 1200, 400, .8, 0, .4); }); buzz([30, 20, 30]);
        h.bucket.animate([{ transform: 'scale(1.14,.84)' }, { transform: 'scale(.95,1.06)', offset: .45 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
        h.mood('caught'); h.at(260, () => thwack(h.stamp));
        h.win('Landed.', 'Nine minutes, start to finish. Into the bucket.');
      });
    },
    reset(h) { cancelAll(h.mon, h.bucket, h.stamp, h.knob); h.line.style.opacity = 1; h.mon.style.transformOrigin = '120px 209px'; h.acc = 0; h.jolt = 0; }
  };

  /* ---------- 1c · The lasso: he runs laps until the work wears him out ---------- */
  function rope(ctx, pts, closed, tail) {
    if (pts.length < 2) return;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); if (closed) ctx.closePath();
      if (tail) { ctx.moveTo(tail[0][0], tail[0][1]); ctx.quadraticCurveTo(tail[1][0], tail[1][1], tail[2][0], tail[2][1]); }
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.setLineDash([]); ctx.stroke();
    path(); ctx.strokeStyle = '#D9B98C'; ctx.lineWidth = 5; ctx.stroke();
    path(); ctx.strokeStyle = '#A88552'; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
  }
  const LASSO = {
    cap: 'bottom',
    build(h) {
      h.F = 560;
      const floor = E('position:absolute;left:24px;right:24px;top:' + h.F + 'px;height:2px;border-radius:1px;background:rgba(28,26,23,.10)');
      h.msh = E('position:absolute;left:0;top:' + (h.F - 8) + 'px;width:110px;height:16px;border-radius:50%;background:rgba(28,26,23,.12)');
      const m = mkMon(h);
      h.pips = E('position:absolute;left:0;top:0;display:flex;gap:5px;z-index:4;transition:opacity .3s');
      h.pip = Array.from({ length: 5 }, () => { const d = E('width:9px;height:9px;border-radius:5px;background:' + ACC + ';transition:background .3s'); h.pips.append(d); return d; });
      h.cv = E('position:absolute;left:0;top:0;width:393px;height:852px;pointer-events:none;z-index:6', null, 'canvas');
      const d = Math.min(2, devicePixelRatio || 1); h.cv.width = 393 * d; h.cv.height = 852 * d; h.cx2 = h.cv.getContext('2d'); h.cx2.setTransform(d, 0, 0, d, 0, 0);
      mkBinder(h);
      h.stage.append(floor, h.msh, m, h.pips, h.binder, h.cv);
      h.ph = 0; h.dodge = 0; h.mx = 196; h.my = h.F - 62;
    },
    clear(h) { h.cx2.clearRect(0, 0, 393, 852); },
    render(h, p) {
      h.mood(p < .6 ? 'idle' : p < 1 ? 'nervous' : 'caught');
      const n = Math.ceil(5 * (1 - p)); h.pip.forEach((d, i) => d.style.background = i < n ? ACC : 'rgba(28,26,23,.12)'); h.pips.style.opacity = p >= 1 ? 0 : 1;
      if (p >= 1) h.say('He’s worn out. Lasso him.', 'Draw a loop all the way round him.');
      else if (p < .6) h.say('Molar is running laps.', 'He tires out while you do the real thing.');
      else h.say('He’s flagging.', 'Keep going. Nearly worn out.');
    },
    tick(h, t, dt) {
      if (h.state === 'busy' || h.state === 'caught') return;
      const p = h.p, sp = lerp(2.6, .3, p), amp = lerp(115, 0, clamp(p * 1.05)), hop = lerp(30, 0, p);
      h.ph += sp * dt;
      const x = 196 + Math.sin(h.ph) * amp + h.dodge, y = -Math.abs(Math.sin(h.ph * 2.2)) * hop, dir = Math.cos(h.ph) >= 0 ? 1 : -1;
      h.mx = x; h.my = h.F - 62 + y;
      h.mon.style.transform = 'translate(' + (x - 120) + 'px,' + (h.F - 209 + y) + 'px) scaleX(' + (amp > 8 ? dir : 1) + ')';
      h.msh.style.transform = 'translateX(' + (x - 55) + 'px) scale(' + (1 + y / 90) + ')';
      h.pips.style.transform = 'translate(' + (x - 33) + 'px,' + (h.F - 178 + y) + 'px)';
    },
    down(h, x, y) { if (h.state === 'busy' || h.state === 'caught') return false; h.tok = (h.tok || 0) + 1; h.pts = [[x, y]]; LASSO.clear(h); h.sfx((a, t) => a.noise(t, .12, .05, 'highpass', 4000, null, .7, 0, .1)); return true; },
    move(h, x, y) { const l = h.pts[h.pts.length - 1]; if (Math.hypot(x - l[0], y - l[1]) < 4) return; h.pts.push([x, y]); LASSO.clear(h); rope(h.cx2, h.pts, false); },
    up(h) {
      const P = h.pts; if (!P || P.length < 8) { LASSO.clear(h); return; }
      const closed = Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 110, inside = closed && inPoly([h.mx, h.my], P);
      if (inside && h.state === 'ready') return LASSO.cinch(h);
      LASSO.fall(h);
      if (inside) {
        const D = h.mx > 196 ? -140 : 140; h.sfx(a => a.cancel()); h.mood('nervous');
        h.tw(380, k => h.dodge = lerp(0, D, k), back, () => h.tw(1500, k => h.dodge = lerp(D, 0, k), inOut, () => h.mood(h.p < .6 ? 'idle' : 'nervous')));
        h.say('Too lively!', 'He only tires out while you do the real thing.', true);
      } else h.say('Missed.', closed ? 'Loop round him, not next to him.' : 'Close the loop all the way round.', true);
    },
    fall(h) {
      const src = h.pts.map(p => p.slice()), tok = h.tok;
      h.tw(600, k => { if (tok !== h.tok) return; LASSO.clear(h); h.cx2.globalAlpha = 1 - k; rope(h.cx2, src.map(([x, y]) => [x, y + k * k * 220]), false); h.cx2.globalAlpha = 1; }, null, () => { if (tok === h.tok) LASSO.clear(h); });
    },
    cinch(h) {
      h.state = 'busy'; const c = [h.mx, h.F - 62], src = h.pts.map(p => [p[0] - c[0], p[1] - c[1]]);
      const tgt = src.map(([dx, dy]) => { const a = Math.atan2(dy, dx); return [Math.cos(a) * 72, Math.sin(a) * 60]; });
      let cur = src;
      const tail = (cx, cy, s, slack) => [[cx + 72 * s, cy], [cx + 72 * s + 60, cy + slack], [430, 720]];
      const draw = (cx, cy, s, slack) => { LASSO.clear(h); rope(h.cx2, cur.map(([x, y]) => [cx + x * s, cy + y * s]), true, tail(cx, cy, s, slack)); };
      h.sfx((a, t) => a.noise(t, .35, .14, 'bandpass', 600, 4200, 1, 0, .3));
      h.tw(420, k => { cur = src.map((p, i) => [lerp(p[0], tgt[i][0], k), lerp(p[1], tgt[i][1], k)]); draw(c[0], c[1], 1, 90 * (1 - k) + 20); }, back, () => {
        h.sfx((a, t) => { a.thump(t, .55, 140, 50, .25); a.marimba(t, a.note(5), .12); }); buzz([20, 20, 30]);
        h.mood('nervous'); h.mon.animate([{ transform: h.mon.style.transform + ' scale(1.08,.84)' }, { transform: h.mon.style.transform }], { duration: 360, easing: 'ease-out' });
        h.say('Yeehaw.', 'Reeling him into the binder…');
        h.mon.style.transformOrigin = '120px 147px';
        h.at(650, () => {
          const tx = h.bxy[0], ty = h.bxy[1]; h.sfx((a, t) => a.noise(t, .5, .12, 'bandpass', 400, 5000, 1, 0, .4));
          h.tw(700, k => {
            const e = inOut(k), cx = lerp(c[0], tx, e), cy = lerp(c[1], ty, e) - Math.sin(k * PI) * 120, s = lerp(1, .12, e);
            h.mon.style.transform = 'translate(' + (cx - 120) + 'px,' + (cy - 147) + 'px) rotate(' + (k * -30) + 'deg) scale(' + s + ')';
            h.msh.style.opacity = 1 - k; draw(cx, cy, s, 20);
          }, null, () => {
            LASSO.clear(h); h.mon.style.opacity = 0; bumpBinder(h);
            h.win('Lassoed.', h.N + ' is card No. 042. Nine minutes flat.');
          });
        });
      });
    },
    reset(h) { cancelAll(h.mon, h.binder); LASSO.clear(h); h.tok = (h.tok || 0) + 1; h.mon.style.opacity = 1; h.msh.style.opacity = 1; h.mon.style.transformOrigin = '120px 209px'; h.count.textContent = '41'; h.dodge = 0; }
  };

  /* ---------- 1d · The sticker: the cut line closes as you work; peel and stick ---------- */
  const STICK = {
    cap: 'top',
    build(h) {
      const sheet = E('position:absolute;left:36px;top:176px;width:321px;height:272px;border-radius:20px;background:#ECE4D7;box-shadow:inset 0 0 0 1px rgba(28,26,23,.06)');
      sheet.append(E('position:absolute;left:14px;bottom:10px;font:600 11px ' + SANS + ';letter-spacing:.06em;color:' + MUTED, 'NO. 041'));
      const S = { x: 98, y: 206, w: 196, h: 222 }; S.cx = S.x + S.w / 2; S.cy = S.y + S.h / 2; h.S = S;
      const R = 'border-radius:30px';
      const hole = E('position:absolute;left:' + S.x + 'px;top:' + S.y + 'px;width:' + S.w + 'px;height:' + S.h + 'px;' + R + ';background:#E0D6C5');
      h.cut = E('position:absolute;left:' + (S.x - 9) + 'px;top:' + (S.y - 9) + 'px;width:' + (S.w + 18) + 'px;height:' + (S.h + 18) + 'px;box-sizing:border-box;border-radius:38px;border:2.5px dashed ' + INK);
      const book = E('position:absolute;left:20px;right:20px;top:468px;height:330px;border-radius:26px;background:#fff;box-shadow:0 0 0 .5px rgba(28,26,23,.06),0 10px 30px -14px rgba(28,26,23,.2)');
      book.append(E('position:absolute;left:20px;top:16px;font:700 16px ' + ROUND + ';color:' + INK, 'October'));
      h.bcount = E('position:absolute;right:20px;top:19px;font:500 12px ' + SANS + ';color:' + MUTED, '5 of 6'); book.append(h.bcount);
      const minis = [['sock', 'sock'], ['beetle', 'beetle'], ['envelope', 'letter'], ['slime', 'slime'], null, ['clock', 'clock']], kids = [];
      minis.forEach((mn, i) => {
        const col = i % 3, row = Math.floor(i / 3), cx = 38 + col * 109 + 49.5, cy = 516 + row * 136 + 63;
        if (!mn) { h.slotXY = [cx, cy]; h.slotEl = E('position:absolute;left:' + (cx - 44) + 'px;top:' + (cy - 50) + 'px;width:88px;height:100px;box-sizing:border-box;border-radius:16px;border:2px dashed rgba(28,26,23,.25);display:flex;align-items:center;justify-content:center;font:600 12px ' + SANS + ';color:' + MUTED + ';transition:border-color .2s, transform .3s cubic-bezier(.32,.72,0,1)', '041'); kids.push(h.slotEl); return; }
        const st = E('position:absolute;left:' + (cx - 44) + 'px;top:' + (cy - 50) + 'px;width:88px;height:100px;border-radius:16px;background:#fff;box-shadow:0 0 0 1px rgba(28,26,23,.06),0 4px 10px -4px rgba(28,26,23,.25);overflow:hidden;transform:rotate(' + [-4, 3, -2, 4, 0, -3][i] + 'deg)');
        const w = E('position:absolute;left:-6px;top:0;width:100px;height:100px'); w.append(critter({ kind: 'task', seed: mn[1], type: mn[0], mood: 'caught', sound: 'off', still: h.getAttribute('still') })); st.append(w); kids.push(st);
      });
      h.stk = E('position:absolute;left:' + S.x + 'px;top:' + S.y + 'px;width:' + S.w + 'px;height:' + S.h + 'px;z-index:6;will-change:transform;transition:box-shadow .25s');
      h.stkIn = E('position:absolute;inset:0;' + R + ';background:#fff;box-shadow:0 1px 0 rgba(28,26,23,.08);overflow:hidden');
      const m = mkMon(h, 214); m.style.left = '-9px'; m.style.top = '8px'; m.style.transformOrigin = '107px 186px'; h.stkIn.append(m);
      h.peel = E('position:absolute;right:0;top:0;width:46px;height:46px;border-radius:0 30px 0 14px;background:linear-gradient(225deg,#E0D6C5 0 50%,#F1ECE3 50%);box-shadow:-3px 3px 7px rgba(28,26,23,.14);transform-origin:100% 0;transform:scale(0);pointer-events:none');
      h.stkIn.append(h.peel); h.stk.append(h.stkIn);
      h.stamp = stampEl(250, 600);
      h.stage.append(sheet, hole, h.cut, book, ...kids, h.stk, h.stamp);
      h.c = [S.cx, S.cy]; h.r = 0; h.s = 1; h.peelOn = false; h.lifted = false;
    },
    apply(h) { h.stk.style.transform = 'translate(' + (h.c[0] - h.S.cx) + 'px,' + (h.c[1] - h.S.cy) + 'px) rotate(' + h.r + 'deg) scale(' + h.s + ')'; },
    render(h, p) {
      const M = 'conic-gradient(#000 ' + (p * 360) + 'deg,transparent 0)'; h.cut.style.webkitMask = M; h.cut.style.mask = M; h.cut.style.borderColor = p >= 1 ? ACC : INK;
      h.mood(p < .5 ? 'idle' : 'nervous'); h.mon.style.transform = 'scaleY(' + (1 - .05 * p) + ')';
      const on = p >= 1; if (on !== h.peelOn) { h.peelOn = on; cancelAll(h.peel); h.peel.animate([{ transform: on ? 'scale(0)' : 'scale(1)' }, { transform: on ? 'scale(1)' : 'scale(0)' }], { duration: on ? 480 : 200, easing: on ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-in', fill: 'forwards' }); }
      if (on) h.say('Peel him off.', 'Drag him into the empty spot in your book.');
      else h.say('Cutting him out.', 'The line closes a little more every minute.');
    },
    tick(h) {
      if (!h.lifted) return;
      const tx = h.ptr[0] - h.o[0], ty = h.ptr[1] - h.o[1], px = h.c[0];
      h.c[0] += (tx - h.c[0]) * .35; h.c[1] += (ty - h.c[1]) * .35;
      h.r += (clamp((h.c[0] - px) * 1.5, -20, 20) - h.r) * .2; h.s += (.5 - h.s) * .22; STICK.apply(h);
    },
    near(h) { return Math.hypot(h.c[0] - h.slotXY[0], h.c[1] - h.slotXY[1]) < 95; },
    down(h, x, y) {
      const S = h.S; if (x < S.x || x > S.x + S.w || y < S.y || y > S.y + S.h) return false;
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.stkIn.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: 360 }); h.notYet(); h.sfx(a => a.cancel()); } return false; }
      h.lifted = true; h.ptr = [x, y]; h.o = [(x - S.cx) * .5, (y - S.cy) * .5];
      h.stk.style.boxShadow = 'none'; h.stkIn.style.boxShadow = '0 26px 34px -12px rgba(28,26,23,.4),0 0 0 1px rgba(28,26,23,.05)';
      cancelAll(h.peel); h.peel.style.transform = 'scale(0)'; h.mood('nervous');
      h.sfx((a, t) => { a.noise(t, .28, .12, 'highpass', 2500, 6000, .8, 0, .2); a.marimba(t + .05, a.note(7), .08); }); buzz(12);
      h.say('Rrrrip.', 'Now into the empty spot.'); return true;
    },
    move(h, x, y) { h.ptr = [x, y]; const n = STICK.near(h); h.slotEl.style.borderColor = n ? ACC : 'rgba(28,26,23,.25)'; h.slotEl.style.transform = n ? 'scale(1.06)' : ''; },
    up(h) {
      if (!h.lifted) return; h.lifted = false; h.slotEl.style.transform = ''; h.slotEl.style.borderColor = 'rgba(28,26,23,.25)';
      const c0 = h.c.slice(), r0 = h.r, s0 = h.s;
      if (STICK.near(h)) {
        h.state = 'busy';
        return h.tw(220, k => { h.c = [lerp(c0[0], h.slotXY[0], k), lerp(c0[1], h.slotXY[1], k)]; h.r = lerp(r0, -3, k); h.s = lerp(s0, .45, k); STICK.apply(h); }, easeOut, () => {
          h.stkIn.style.boxShadow = '0 0 0 1px rgba(28,26,23,.06),0 4px 10px -4px rgba(28,26,23,.25)'; h.slotEl.style.opacity = 0;
          h.stkIn.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(.9)', offset: .45 }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
          h.sfx((a, t) => { a.thump(t, .5, 180, 60, .2); a.noise(t, .05, .18, 'bandpass', 1400, null, 1, 0, .2); }); buzz([24, 30, 12]);
          h.fx.burst(h.slotXY[0], h.slotXY[1], { n: 18, speed: 150, g: 40, life: 600 }); h.mood('caught'); h.bcount.textContent = '6 of 6 · page full';
          h.at(200, () => thwack(h.stamp));
          h.win('Stuck.', 'October’s page is full. ' + h.N + ' took nine minutes.');
        });
      }
      h.tw(480, k => { h.c = [lerp(c0[0], h.S.cx, k), lerp(c0[1], h.S.cy, k)]; h.r = lerp(r0, 0, k); h.s = lerp(s0, 1, k); STICK.apply(h); }, back, () => {
        h.stkIn.style.boxShadow = '0 1px 0 rgba(28,26,23,.08)'; if (h.state === 'ready') { h.peel.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }); h.mood('nervous'); }
      });
      h.say('Not there.', 'Pop him in the empty spot.', true); h.sfx(a => a.aww());
    },
    reset(h) { cancelAll(h.stkIn, h.stamp, h.peel); h.lifted = false; h.c = [h.S.cx, h.S.cy]; h.r = 0; h.s = 1; STICK.apply(h); h.stkIn.style.boxShadow = '0 1px 0 rgba(28,26,23,.08)'; h.slotEl.style.opacity = 1; h.bcount.textContent = '5 of 6'; h.peelOn = false; h.peel.style.transform = 'scale(0)'; }
  };

  /* ---------- 2b · The bubble: it forms round him as you work; flick it up ---------- */
  const BUB = {
    cap: 'bottom',
    build(h) {
      h.F = 560;
      const floor = E('position:absolute;left:24px;right:24px;top:' + h.F + 'px;height:2px;border-radius:1px;background:rgba(28,26,23,.10)');
      mkBinder(h);
      h.g = E('position:absolute;left:0;top:0;width:300px;height:300px;transform-origin:150px 150px;z-index:3;pointer-events:none;will-change:transform');
      const m = mkMon(h); m.style.left = '30px'; m.style.top = '3px';
      h.bub = E('position:absolute;left:10px;top:10px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle at 30% 26%,rgba(255,255,255,.95) 0 5%,rgba(255,255,255,0) 6.5%),radial-gradient(circle at 70% 76%,rgba(255,255,255,.55) 0 3%,rgba(255,255,255,0) 4%),radial-gradient(circle,rgba(142,187,218,0) 58%,rgba(142,187,218,.22) 78%,rgba(240,86,46,.16) 90%,rgba(255,255,255,.75) 100%);box-shadow:0 0 0 1.5px rgba(28,26,23,.22)');
      h.g.append(m, h.bub);
      h.gsh = E('position:absolute;left:96px;top:' + (h.F - 9) + 'px;width:200px;height:18px;border-radius:50%;background:rgba(28,26,23,.12)');
      h.stage.append(floor, h.gsh, h.g, h.binder);
      h.c = [196, 498]; h.bs = .12; h.off = 0; h.sx = 1; h.sy = 1;
    },
    apply(h, t) { const bob = h.state === 'ready' && !h.drag ? Math.sin(t * 2) * 5 : 0; h.g.style.transform = 'translate(' + (h.c[0] - 150) + 'px,' + (h.c[1] - 150 + h.off + bob) + 'px) scale(' + h.sx + ',' + h.sy + ')'; h.bub.style.transform = 'scale(' + (h.bs * (1 + Math.sin(t * 3) * .015)) + ',' + (h.bs * (1 + Math.cos(t * 3) * .015)) + ')'; },
    render(h, p) {
      h.c = [196, 498 - 70 * p * p]; h.bs = lerp(.12, 1, p); h.bub.style.opacity = Math.min(1, .25 + p * 2); h.gsh.style.transform = 'scale(' + (1 - p * .35) + ')';
      h.mood(p < .5 ? 'idle' : 'nervous');
      if (p >= 1) h.say('Flick him up.', 'Swipe up and let the bubble float off.');
      else h.say('', p < .5 ? 'A bubble is slowly forming round him.' : 'The bubble’s nearly closed. He’s getting light.');
    },
    tick(h, t) { if (h.state === 'busy' || h.state === 'caught') return; BUB.apply(h, t); },
    down(h, x, y) {
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.bub.animate([{ opacity: 1 }, { opacity: .4 }, { opacity: 1 }], { duration: 300 }); h.notYet(); h.sfx(a => a.cancel()); } return false; }
      h.y0 = y; h.sfx((a, t) => a.marimba(t, a.note(7), .07)); return true;
    },
    move(h, x, y) { const dy = Math.min(0, y - h.y0), k = Math.min(1, -dy / 220); h.off = dy * .45; h.sx = 1 - k * .1; h.sy = 1 + k * .14; },
    up(h, x, y) {
      if (h.state !== 'ready') return;
      if (y - h.y0 < -70) return BUB.launch(h);
      const o0 = h.off, sx0 = h.sx, sy0 = h.sy; h.tw(500, k => { h.off = lerp(o0, 0, k); h.sx = lerp(sx0, 1, k); h.sy = lerp(sy0, 1, k); }, back);
      h.say('Bit more.', 'Flick it upward, quick.', true);
    },
    launch(h) {
      h.state = 'busy'; h.mood('nervous'); h.say('Up he goes.', '', true); buzz(14);
      h.sfx((a, t) => { a.noise(t, .6, .1, 'bandpass', 500, 4000, 1, 0, .5); a.bell(t + .1, a.note(14), .05); a.bell(t + .3, a.note(16), .04); });
      const c0 = [h.c[0], h.c[1] + h.off], s0 = h.sx;
      h.tw(1150, k => { const e = inOut(k), cx = lerp(c0[0], h.bxy[0], e) + Math.sin(k * PI * 3) * 28 * (1 - k), cy = lerp(c0[1], h.bxy[1], e) - Math.sin(k * PI) * 40, sc = lerp(s0, .14, e), w = Math.sin(k * 20) * .03; h.g.style.transform = 'translate(' + (cx - 150) + 'px,' + (cy - 150) + 'px) scale(' + (sc * (1 + w)) + ',' + (sc * (1 - w)) + ')'; h.gsh.style.opacity = 1 - k; }, null, () => {
        h.g.style.opacity = 0; h.fx.burst(h.bxy[0], h.bxy[1], { n: 22, colors: ['#BFD9EA', '#FFFFFF', '#F7C9BA'], speed: 160, g: 60, kind: 'dot', life: 600 });
        h.sfx((a, t) => a.noise(t, .04, .3, 'bandpass', 2400, null, 1.2, 0, .3)); buzz([10, 20, 30]); bumpBinder(h);
        h.win('Pop. Got him.', h.N + ' floated into the binder. Nine minutes.');
      });
    },
    reset(h) { cancelAll(h.bub, h.binder); h.g.style.opacity = 1; h.gsh.style.opacity = 1; h.off = 0; h.sx = 1; h.sy = 1; h.count.textContent = '41'; }
  };

  /* ---------- 2c · The net: he flits about until the work grounds him; swipe to swoop ---------- */
  const NET = {
    cap: 'bottom',
    build(h) {
      h.F = 560;
      const floor = E('position:absolute;left:24px;right:24px;top:' + h.F + 'px;height:2px;border-radius:1px;background:rgba(28,26,23,.10)');
      h.msh = E('position:absolute;left:0;top:' + (h.F - 8) + 'px;width:110px;height:16px;border-radius:50%;background:rgba(28,26,23,.12)');
      const m = mkMon(h);
      h.cv = E('position:absolute;left:0;top:0;width:393px;height:852px;pointer-events:none;z-index:8', null, 'canvas');
      const d = Math.min(2, devicePixelRatio || 1); h.cv.width = 393 * d; h.cv.height = 852 * d; h.cx2 = h.cv.getContext('2d'); h.cx2.setTransform(d, 0, 0, d, 0, 0);
      h.net = E('position:absolute;left:0;top:0;width:150px;height:300px;transform-origin:75px 30px;z-index:7;pointer-events:none;will-change:transform');
      h.net.append(
        E('position:absolute;left:14px;top:28px;width:122px;height:122px;border-radius:0 0 61px 61px;background-color:rgba(255,255,255,.35);background-image:repeating-linear-gradient(45deg,rgba(28,26,23,.42) 0 1.5px,transparent 1.5px 10px),repeating-linear-gradient(-45deg,rgba(28,26,23,.42) 0 1.5px,transparent 1.5px 10px)'),
        E('position:absolute;left:136px;top:26px;width:8px;height:250px;border-radius:4px;background:#C9A574;transform-origin:4px 4px;transform:rotate(-28deg)'),
        E('position:absolute;left:5px;top:0;width:140px;height:60px;border-radius:50%;box-sizing:border-box;border:5px solid ' + INK));
      h.stamp = stampEl(236, 340);
      h.stage.append(floor, h.msh, m, h.net, h.cv, h.stamp);
      h.ph = 0; h.dodgeY = 0; h.swoop = false; h.nt = { x: 316, y: 630, r: -10, s: 1 }; NET.applyNet(h);
    },
    applyNet(h) { const n = h.nt; h.net.style.transform = 'translate(' + (n.x - 75) + 'px,' + (n.y - 30) + 'px) rotate(' + n.r + 'deg) scale(' + n.s + ')'; },
    render(h, p) {
      h.mood(p < .55 ? 'idle' : p < 1 ? 'nervous' : 'caught');
      if (p >= 1) h.say('Swoop him up.', 'One quick swipe right across him.');
      else h.say('', p < .55 ? 'He’s flitting about. He slows down while you work.' : 'He’s getting dozy. Nearly grounded.');
    },
    tick(h, t, dt) {
      if (h.state === 'busy' || h.state === 'caught') return;
      const p = h.p, amp = lerp(110, 0, clamp(p * 1.05)); h.ph += lerp(2.2, .3, p) * dt;
      const air = lerp(150, 0, easeOut(p)), x = 196 + Math.sin(h.ph) * amp, fy = h.F - air + Math.sin(h.ph * 2.3) * 14 * (1 - p) + h.dodgeY;
      h.mx = x; h.my = fy - 62; h.mon.style.transform = 'translate(' + (x - 120) + 'px,' + (fy - 209) + 'px)';
      h.msh.style.transform = 'translateX(' + (x - 55) + 'px) scale(' + (1 - (h.F - fy) / 300) + ')';
      if (!h.swoop) { h.nt.r = -10 + Math.sin(t * 1.5) * 3; NET.applyNet(h); }
    },
    trail(h, a) { const c = h.cx2, P = h.full.slice(-14); c.clearRect(0, 0, 393, 852); c.lineCap = 'round'; c.strokeStyle = INK; for (let i = 1; i < P.length; i++) { const k = i / P.length; c.globalAlpha = a * k * .45; c.lineWidth = 2 + k * 14; c.beginPath(); c.moveTo(P[i - 1][0], P[i - 1][1]); c.lineTo(P[i][0], P[i][1]); c.stroke(); } c.globalAlpha = 1; },
    down(h, x, y) { if (h.state === 'busy' || h.state === 'caught') return false; h.full = [[x, y, performance.now()]]; h.tok = (h.tok || 0) + 1; return true; },
    move(h, x, y) { h.full.push([x, y, performance.now()]); NET.trail(h, 1); },
    up(h) {
      const P = h.full || [], tok = h.tok;
      h.tw(260, k => { if (tok === h.tok) NET.trail(h, 1 - k); }, null, () => { if (tok === h.tok) h.cx2.clearRect(0, 0, 393, 852); });
      if (P.length < 3) return;
      const L = P.reduce((s, p, i) => i ? s + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0, 0), dt = Math.max(1, P[P.length - 1][2] - P[0][2]);
      const fast = L > 110 && L / dt > .5, near = P.some(p => Math.hypot(p[0] - h.mx, p[1] - h.my) < 85);
      if (near && fast && h.state === 'ready') return NET.swoop(h, P[P.length - 1][0] > P[0][0] ? 1 : -1);
      if (near && h.state !== 'ready') { h.tw(300, k => h.dodgeY = -120 * Math.sin(k * PI), null); h.say('Too quick for you.', 'He only slows down while you do the real thing.', true); h.sfx(a => a.cancel()); }
      else if (h.state === 'ready') h.say(near ? 'Faster!' : 'Missed.', near ? 'One quick flick across him.' : 'Swipe right through him.', true);
    },
    swoop(h, dir) {
      h.state = 'busy'; h.swoop = true; const n0 = Object.assign({}, h.nt), tx = h.mx, ty = h.F - 6;
      h.sfx((a, t) => a.noise(t, .25, .2, 'bandpass', 700, 4500, 1, 0, .3)); buzz(10);
      h.tw(320, k => { const e = easeOut(k); h.nt = { x: lerp(n0.x, tx, e), y: lerp(n0.y, ty, e) - Math.sin(k * PI) * 170, r: lerp(n0.r, dir > 0 ? 180 : -180, e), s: lerp(1, 1.3, e) }; NET.applyNet(h); }, null, () => {
        h.sfx((a, t) => { a.thump(t, .7, 140, 45, .35); a.marimba(t, a.note(2), .12); }); buzz([30, 30, 20]); h.shake(7);
        const puff = { n: 10, kind: 'puff', colors: ['#E2D9CA', '#D8CCB8'], spread: .7, speed: 80, g: -50, w: 6, life: 650 };
        h.fx.burst(tx - 90, h.F - 4, Object.assign({ angle: PI }, puff)); h.fx.burst(tx + 90, h.F - 4, Object.assign({ angle: 0 }, puff));
        h.mood('nervous'); const b = h.mon.style.transform; h.mon.animate([{ transform: b }, { transform: b + ' translateX(-6px) rotate(-6deg)' }, { transform: b + ' translateX(6px) rotate(6deg)' }, { transform: b }], { duration: 300, iterations: 3 });
        h.at(900, () => { h.mood('caught'); thwack(h.stamp); h.win('Netted.', h.N + ' is all yours. Nine minutes.'); });
      });
    },
    reset(h) { cancelAll(h.mon, h.stamp); h.swoop = false; h.nt = { x: 316, y: 630, r: -10, s: 1 }; NET.applyNet(h); h.dodgeY = 0; h.cx2.clearRect(0, 0, 393, 852); }
  };

  /* ---------- 2d · The vacuum: it charges while you work; hold to slurp ---------- */
  const VAC = {
    cap: 'top',
    build(h) {
      h.F = 520;
      const floor = E('position:absolute;left:24px;right:24px;top:' + h.F + 'px;height:2px;border-radius:1px;background:rgba(28,26,23,.10)');
      const m = mkMon(h); m.style.left = '30px'; m.style.top = (h.F - 209) + 'px'; m.style.transformOrigin = '60px 209px'; m.style.zIndex = 3;
      h.cv = E('position:absolute;left:0;top:0;width:393px;height:852px;pointer-events:none;z-index:4', null, 'canvas');
      const d = Math.min(2, devicePixelRatio || 1); h.cv.width = 393 * d; h.cv.height = 852 * d; h.cx2 = h.cv.getContext('2d'); h.cx2.setTransform(d, 0, 0, d, 0, 0);
      h.vac = E('position:absolute;left:215px;top:400px;width:176px;height:150px;z-index:5');
      const noz = E('position:absolute;left:0;top:44px;width:72px;height:62px;background:' + INK + ';clip-path:polygon(0 0,100% 28%,100% 72%,0 100%)');
      const neck = E('position:absolute;left:68px;top:63px;width:22px;height:24px;background:#3A3430');
      h.body = E('position:absolute;left:86px;top:0;width:90px;height:150px;border-radius:28px;background:' + ACC + ';box-shadow:inset 0 -6px 0 rgba(0,0,0,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;transform-origin:30% 50%');
      h.vlab = E('font:700 15px ' + ROUND + ';color:#fff;letter-spacing:.01em', 'Charging');
      const bat = E('display:flex;flex-direction:column-reverse;gap:4px;padding:4px;border-radius:8px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.75)');
      h.cells = Array.from({ length: 4 }, () => { const c = E('width:26px;height:10px;border-radius:3px;background:rgba(255,255,255,.25);transition:background .3s'); bat.append(c); return c; });
      h.body.append(h.vlab, bat); h.vac.append(noz, neck, h.body);
      h.stamp = stampEl(200, 320);
      h.stage.append(floor, m, h.cv, h.vac, h.stamp); h.hp = 0; h.holding = false;
    },
    render(h, p) {
      const n = Math.floor(p * 4 + 1e-6); h.cells.forEach((c, i) => c.style.background = i < n ? '#fff' : 'rgba(255,255,255,.25)');
      h.vlab.textContent = p >= 1 ? 'Hold' : 'Charging'; h.mood(p < .5 ? 'idle' : 'nervous');
      if (p >= 1) h.say('Hold the vacuum.', 'Keep holding until he’s gone.');
      else h.say('', 'The vacuum charges while you work. ' + Math.round(p * 100) + '%');
    },
    tick(h, t, dt) {
      if (h.state === 'busy' || h.state === 'caught') return;
      if (h.holding) h.hp = Math.min(1, h.hp + dt / 1.8); else if (h.hp > 0) h.hp = Math.max(0, h.hp - dt * 2.5);
      const e = h.hp, j = h.holding ? Math.sin(t * 60) * e * 2 : 0; if (h.ctl) h.ctl.set(e);
      h.mon.style.transform = 'translate(' + (e * 34 + j) + 'px,0) skewX(' + (-e * 12) + 'deg) scale(' + (1 + e * .3) + ',' + (1 - e * .14) + ')';
      h.vac.style.transform = h.holding ? 'translate(' + (Math.sin(t * 70) * 1.5) + 'px,' + (Math.cos(t * 63) * 1.2) + 'px)' : '';
      const c = h.cx2; c.clearRect(0, 0, 393, 852);
      if (e > .02) { c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 2; for (let i = 0; i < 7; i++) { const k = ((t * 2.4 + i / 7) % 1), x = lerp(120, 214, k), y = 475 + Math.sin(i * 2.1) * 46 * (1 - k); c.globalAlpha = e * Math.sin(k * PI) * .6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y + (475 - y) * .12); c.stroke(); } c.globalAlpha = 1; }
      if (h.hp >= 1 && h.holding) VAC.slurp(h);
    },
    down(h, x, y) {
      if (x < 215 || y < 390 || y > 560) return false;
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.vac.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], { duration: 360 }); h.notYet(); h.sfx(a => a.cancel()); } return false; }
      h.holding = true; if (h.getAttribute('sound') !== 'off' && window.ScootchAudio) { try { h.ctl = window.ScootchAudio.hold(); } catch (er) { } }
      h.say('Keep holding…', 'He’s clinging on.', true); return true;
    },
    up(h) { if (!h.holding) return; h.holding = false; if (h.ctl) { h.ctl.release(); h.ctl = null; } if (h.state === 'ready') h.say('Keep holding!', 'He grabs on again if you let go.', true); },
    slurp(h) {
      h.state = 'busy'; h.holding = false; let quiet = false; if (h.ctl) { h.ctl.complete(); h.ctl = null; quiet = true; }
      h.cx2.clearRect(0, 0, 393, 852); h.vac.style.transform = ''; h.mon.style.transformOrigin = '120px 150px';
      h.tw(240, k => { h.mon.style.transform = 'translate(' + (k * 66) + 'px,' + (k * 10) + 'px) scale(' + (1 - k) + ',' + (1 - k * .7) + ')'; }, easeIn, () => {
        h.mon.style.opacity = 0; h.sfx((a, t) => { a.thump(t, .5, 90, 40, .3); a.voice(t + .1, 130, 80, .25, .12, 0, 'sawtooth'); }); buzz([20, 40, 20]);
        h.body.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18,.9)', offset: .3 }, { transform: 'scale(.96,1.05)', offset: .6 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
        h.vlab.textContent = 'Full'; h.at(250, () => thwack(h.stamp));
        h.win('Slurped.', h.N + ' is in the bag. Nine minutes.', quiet);
      });
    },
    reset(h) { cancelAll(h.mon, h.stamp, h.body, h.vac); if (h.ctl) { h.ctl.release(); h.ctl = null; } h.holding = false; h.hp = 0; h.mon.style.opacity = 1; h.mon.style.transformOrigin = '60px 209px'; h.cx2.clearRect(0, 0, 393, 852); }
  };

  /* ---------- 2e · The envelope: he gets addressed as you work; fold, seal, send ---------- */
  const ENV = {
    cap: 'bottom',
    build(h) {
      mkBinder(h);
      const W = 230, H = 156; h.EC = [196, 410]; h.EW = [W, H];
      h.env = E('position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:3;transform-origin:' + W / 2 + 'px ' + H / 2 + 'px');
      const bk = E('position:absolute;inset:0;border-radius:6px;background:#E9E0D1;box-shadow:0 0 0 2px ' + INK + ',0 20px 30px -18px rgba(28,26,23,.4)');
      h.lines = [70, 54, 38].map((w, i) => { const l = E('position:absolute;left:16px;top:' + (102 + i * 12) + 'px;height:4px;border-radius:2px;background:rgba(28,26,23,.4);width:0'); l.dataset.w = w; bk.append(l); return l; });
      h.pstamp = E('position:absolute;right:12px;top:12px;width:30px;height:36px;border-radius:3px;background:' + ACC + ';box-shadow:inset 0 0 0 3px #E9E0D1,inset 0 0 0 4px rgba(255,255,255,.6);opacity:0;transition:opacity .4s'); bk.append(h.pstamp);
      const m = mkMon(h, 150); m.style.left = '40px'; m.style.top = '8px'; m.style.transformOrigin = '75px 130px';
      const fl = (clip, origin, col) => { const w = E('position:absolute;inset:0;transform-origin:' + origin + ';filter:drop-shadow(0 0 1.2px rgba(28,26,23,.75))'); w.append(E('position:absolute;inset:0;background:' + col + ';clip-path:polygon(' + clip + ')')); return w; };
      h.flaps = [fl('0 0,54% 52%,0 100%', '0 50%', '#F3ECE0'), fl('100% 0,46% 52%,100% 100%', '100% 50%', '#F3ECE0'), fl('0 100%,50% 42%,100% 100%', '50% 100%', '#EFE7DA'), fl('0 0,100% 0,50% 62%', '50% 0', '#F8F2E8')];
      h.open = [['Y', -168], ['Y', 168], ['X', 168], ['X', -168]];
      h.seal = E('position:absolute;left:' + (W / 2 - 19) + 'px;top:' + (H * .62 - 26) + 'px;width:38px;height:38px;border-radius:50%;background:' + ACC + ';box-shadow:inset 0 0 0 4px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.2);opacity:0;display:flex;align-items:center;justify-content:center;font:800 16px ' + ROUND + ';color:#fff', 's');
      h.env.append(bk, m, ...h.flaps, h.seal);
      h.stage.append(h.env, h.binder); h.fold = 0; ENV.home(h); ENV.setOpen(h);
    },
    home(h) { h.env.style.transform = 'translate(' + (h.EC[0] - h.EW[0] / 2) + 'px,' + (h.EC[1] - h.EW[1] / 2) + 'px)'; h.env.style.opacity = 1; },
    setOpen(h) { h.flaps.forEach((f, i) => f.style.transform = 'perspective(800px) rotate' + h.open[i][0] + '(' + h.open[i][1] + 'deg)'); },
    render(h, p) {
      if (h.fold === 0) ENV.setOpen(h);
      h.lines.forEach((l, i) => l.style.width = (+l.dataset.w * clamp(p * 3.3 - i)) + 'px'); h.pstamp.style.opacity = p >= 1 ? 1 : 0;
      if (h.fold === 0) h.mood(p < .5 ? 'idle' : 'nervous');
      if (p >= 1) { if (h.fold === 0) h.say('Fold him in.', 'Tap to fold each flap, then seal it.'); }
      else h.say('', 'His envelope is being addressed to your binder.');
    },
    down(h) {
      if (h.state !== 'ready') { if (h.state !== 'busy' && h.state !== 'caught') { h.notYet(); h.sfx(a => a.cancel()); h.mon.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' }); } return false; }
      const i = h.fold;
      if (i < 4) {
        h.fold++; const f = h.flaps[i], ax = h.open[i][0], a0 = h.open[i][1];
        h.tw(420, k => f.style.transform = 'perspective(800px) rotate' + ax + '(' + (a0 * (1 - k)) + 'deg)', back);
        h.sfx((a, t) => { a.noise(t, .12, .14, 'bandpass', 2200, 900, .8, 0, .2); a.marimba(t + .03, a.note(4 + i * 2), .1); }); buzz(10);
        h.mood(i === 3 ? 'caught' : 'nervous');
        h.say(['Three more.', 'Two more.', 'Last flap.', 'Now seal it.'][i], ['', '', 'He’s going quiet in there.', 'Tap once more.'][i], true);
        return false;
      }
      h.state = 'busy'; h.seal.animate([{ opacity: 0, transform: 'scale(2.2) rotate(-30deg)' }, { opacity: 1, transform: 'scale(.9) rotate(-8deg)', offset: .6 }, { opacity: 1, transform: 'scale(1) rotate(-10deg)' }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
      h.sfx((a, t) => a.thump(t + .2, .6, 160, 50, .25)); h.at(200, () => { buzz([24, 20]); h.shake(4); });
      h.say('Sealed.', '', true);
      h.at(650, () => { h.sfx(a => a.send()); flyTo(h, h.env, h.EC, [h.EW[0] / 2, h.EW[1] / 2], () => h.win('Signed, sealed, delivered.', h.N + ' is in the binder. Nine minutes.')); });
      return false;
    },
    reset(h) { cancelAll(h.seal, h.mon, h.binder); h.fold = 0; ENV.setOpen(h); ENV.home(h); h.count.textContent = '41'; }
  };
  const CONCEPTS = { jar: JAR, reel: REEL, lasso: LASSO, sticker: STICK, bubble: BUB, net: NET, vacuum: VAC, envelope: ENV };
  const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
  const PANEL = 'background:rgba(250,247,242,.96);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);box-shadow:inset 0 1px .5px rgba(255,255,255,.95),0 0 0 .5px rgba(28,26,23,.12),0 24px 50px -20px rgba(28,26,23,.35)';

  class Catch extends HTMLElement {
    static get observedAttributes() { return ['progress', 'concept', 'task', 'seed', 'type', 'name']; }
    connectedCallback() {
      if (!this._lis) {
        this._lis = 1;
        this.addEventListener('pointerdown', e => this._down(e));
        this.addEventListener('pointermove', e => this._move(e));
        const up = e => this._up(e); this.addEventListener('pointerup', up); this.addEventListener('pointercancel', up);
      }
      if (!this._init) this.build();
      this.loop();
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); if (this.ctl) { try { this.ctl.release(); } catch (e) { } this.ctl = null; } }
    attributeChangedCallback(n) {
      if (!this._init) return;
      if (n === 'progress') return this.setP(parseFloat(this.getAttribute('progress') || '0'));
      if (this._rb) return; this._rb = 1;
      queueMicrotask(() => { this._rb = 0; if (this.ctl) { try { this.ctl.release(); } catch (e) { } this.ctl = null; } this.build(); if (this.isConnected) this.loop(); });
    }
    build() {
      this._init = 1; this.gen = (this.gen || 0) + 1; this.innerHTML = '';
      Object.assign(this.style, { position: 'absolute', inset: '0', display: 'block', overflow: 'hidden', touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none', cursor: 'default' });
      this.C = CONCEPTS[this.getAttribute('concept')] || JAR; this.state = 'during'; this.p = 0; this.drag = false; this._loaded = false;
      this._H = this._S = this._m = null; this._hold = 0;
      this.T = this.getAttribute('task') || 'Email the dentist'; this.N = this.getAttribute('name') || 'Molar';
      this.go = 'Go ' + lc(this.T) + '.'; this.ask = 'Did you ' + lc(this.T) + '?';
      this.stage = E('position:absolute;inset:0'); this.append(this.stage);
      this.chrome(); this.C.build(this); this.overlays(); this.fx = fxLayer(this);
      this.setP(parseFloat(this.getAttribute('progress') || '0')); this._loaded = true;
    }
    loop() {
      cancelAnimationFrame(this._raf); let lt = performance.now();
      const f = () => { this._raf = requestAnimationFrame(f); const n = performance.now(), dt = Math.min(.05, (n - lt) / 1000); lt = n; const r = this.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return; this.C.tick && this.C.tick(this, n / 1000, dt); };
      f();
    }
    chrome() {
      const top = E('position:absolute;left:14px;right:16px;top:60px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none');
      const sw = E('width:48px;height:48px;flex:none;margin:-4px 0'); this.sc = critter({ kind: 'scootch', mood: 'working', sound: 'off', still: this.getAttribute('still') }); sw.append(this.sc);
      const pill = E(GLS + ';height:40px;border-radius:20px;padding:0 14px;display:flex;align-items:center;gap:8px;font:600 14px ' + SANS + ';color:' + INK + ';flex:1;min-width:0;white-space:nowrap;overflow:hidden', '<span style="width:8px;height:8px;border-radius:4px;background:' + ACC + ';flex:none"></span><span style="overflow:hidden;text-overflow:ellipsis"></span>');
      pill.lastChild.textContent = this.T;
      this.timer = E(GLS + ';height:40px;border-radius:20px;padding:0 14px;display:flex;align-items:center;font:600 14px ' + SANS + ';font-variant-numeric:tabular-nums;color:' + INK + ';flex:none;transition:background .3s,color .3s', '10:00');
      this.timer.addEventListener('pointerdown', e => e.stopPropagation());
      this.timer.addEventListener('click', () => { if (this.state === 'waiting') this.confirmYes(); });
      top.append(sw, pill, this.timer);
      this.cap = E('position:absolute;left:28px;right:28px;' + (this.C.cap === 'top' ? 'top:118px' : 'bottom:44px') + ';display:flex;flex-direction:column;gap:5px;align-items:center;text-align:center;z-index:10;pointer-events:none');
      this.capH = E('font:700 22px/1.15 ' + ROUND + ';letter-spacing:-.02em;color:' + INK + ';text-wrap:balance');
      this.capS = E('font:400 15px/1.35 ' + SANS + ';color:' + MUTED + ';min-height:20px;text-wrap:pretty');
      this.cap.append(this.capH, this.capS); this.append(top, this.cap);
    }
    overlays() {
      const stop = el => el.addEventListener('pointerdown', e => e.stopPropagation());
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      this.coach = E('position:absolute;left:14px;right:14px;top:150px;z-index:25;' + PANEL + ';border-radius:34px;padding:22px 22px 18px;display:flex;flex-direction:column;gap:16px;transition:opacity .35s, transform .5s cubic-bezier(.32,.72,0,1)');
      stop(this.coach);
      const step = (n, a, b) => '<div style="display:flex;gap:12px;align-items:flex-start"><span style="flex:none;width:28px;height:28px;border-radius:14px;background:' + (n === 1 ? ACC : INK) + ';color:#fff;font:700 14px ' + ROUND + ';display:flex;align-items:center;justify-content:center">' + n + '</span><div style="display:flex;flex-direction:column;gap:3px"><span style="font:700 17px/1.2 ' + ROUND + ';color:' + INK + '">' + a + '</span><span style="font:400 14px/1.35 ' + SANS + ';color:' + MUTED + '">' + b + '</span></div></div>';
      this.coach.innerHTML = '<span style="font:600 12px ' + SANS + ';letter-spacing:.06em;color:' + MUTED + '">HOW CATCHING WORKS</span>' +
        step(1, 'Do the real thing.', esc(this.T) + '. Put the phone down while you do it.') +
        step(2, 'The trap sets itself.', 'Every minute you spend on it makes ' + esc(this.N) + ' easier to catch.') +
        step(3, 'Say you’re done. Then catch him.', 'He can’t be caught early. That’s the deal.');
      const go = E('margin-top:2px;height:52px;border-radius:26px;background:' + INK + ';color:#fff;display:flex;align-items:center;justify-content:center;font:600 17px ' + SANS + ';cursor:pointer', 'Start 10 minutes');
      go.addEventListener('click', () => { this.sfx(a => a.burst()); window.dispatchEvent(new CustomEvent('scootch-catch-start', { detail: { uid: this.getAttribute('uid') } })); });
      this.coach.append(go);
      this.dim = E('position:absolute;inset:0;z-index:24;background:rgba(28,26,23,.28);opacity:0;transition:opacity .3s;pointer-events:none');
      this.sheet = E('position:absolute;left:8px;right:8px;bottom:8px;z-index:26;' + PANEL + ';border-radius:44px;padding:12px 20px 22px;display:flex;flex-direction:column;align-items:center;gap:10px;transform:translateY(115%);transition:transform .55s cubic-bezier(.32,.72,0,1)');
      stop(this.sheet);
      const sw = E('width:130px;height:130px;margin:-6px 0 -10px'); sw.append(critter({ kind: 'scootch', mood: 'nudge', sound: 'off', still: this.getAttribute('still') }));
      const q = E('font:700 24px/1.15 ' + ROUND + ';letter-spacing:-.02em;color:' + INK + ';text-align:center;text-wrap:balance'); q.textContent = 'Time. ' + this.ask;
      const sub = E('font:400 15px/1.35 ' + SANS + ';color:' + MUTED + ';text-align:center;text-wrap:pretty', 'Be honest. He only stays caught if you really did it.');
      const yes = E('align-self:stretch;margin-top:6px;height:56px;border-radius:28px;background:' + INK + ';color:#fff;display:flex;align-items:center;justify-content:center;font:600 17px ' + SANS + ';cursor:pointer', 'Yes, it’s done');
      const no = E('align-self:stretch;height:48px;border-radius:24px;display:flex;align-items:center;justify-content:center;font:600 16px ' + SANS + ';color:' + INK + ';cursor:pointer', 'Not yet');
      yes.addEventListener('click', () => this.confirmYes()); no.addEventListener('click', () => this.confirmNo());
      this.sheet.append(E('width:36px;height:5px;border-radius:3px;background:rgba(28,26,23,.2)'), sw, q, sub, yes, no);
      this.append(this.dim, this.coach, this.sheet);
    }
    showSheet(on) { this.sheet.style.transform = on ? 'none' : 'translateY(115%)'; this.dim.style.opacity = on ? 1 : 0; this.dim.style.pointerEvents = on ? 'auto' : 'none'; }
    confirmYes() {
      this.showSheet(false); this.state = 'ready'; this.sc.setAttribute('mood', 'nudge'); this._hold = 0;
      this.sfx((a, t) => { a.marimba(t, a.note(7), .12); a.marimba(t + .08, a.note(10), .12); a.bell(t + .16, a.note(14), .05); }); buzz([8, 40, 12]);
      this.setTimer(); this.C.render(this, this.p);
    }
    confirmNo() {
      this.showSheet(false); this.state = 'waiting'; this.sc.setAttribute('mood', 'working'); this.setTimer();
      this.say('No rush. Go finish it.', 'Tap “I did it” up top when it’s done.', true); this._hold = performance.now() + 1e9;
    }
    setTimer() {
      const p = this.p, rem = Math.round(600 * (1 - p)), st = this.state;
      this.timer.textContent = st === 'waiting' ? 'I did it' : st === 'confirm' ? 'Time’s up' : st === 'ready' ? 'Done ✓' : Math.floor(rem / 60) + ':' + String(rem % 60).padStart(2, '0');
      const hot = st === 'waiting' || st === 'confirm' || st === 'ready';
      this.timer.style.background = hot ? ACC : 'rgba(255,255,255,.58)'; this.timer.style.color = hot ? '#fff' : INK;
      this.timer.style.pointerEvents = st === 'waiting' ? 'auto' : 'none'; this.timer.style.cursor = st === 'waiting' ? 'pointer' : 'default';
    }
    say(H, S, raw) {
      const now = performance.now();
      if (raw) this._hold = now + 1800; else { if (now < this._hold) return; if (this.state === 'during') H = this.go; }
      if (this._H === H && this._S === S) return; this._H = H; this._S = S; this.capH.textContent = H; this.capS.textContent = S || '';
    }
    notYet() { this.say('Not yet.', this.T + ' first. Then he’s yours.', true); }
    mood(m) { if (this._m !== m) { this._m = m; this.monC.setAttribute('mood', m); } }
    sfx(f) { if (this.getAttribute('sound') === 'off') return; try { const a = window.ScootchAudio; if (!a) return; const t = a.ctx().currentTime + .012; f(a, t); } catch (e) { } }
    tw(ms, f, ease, done) { const g = this.gen, t0 = performance.now(); const st = () => { if (g !== this.gen) return; const k = Math.min(1, (performance.now() - t0) / ms); f(ease ? ease(k) : k); if (k < 1) requestAnimationFrame(st); else if (done) done(); }; requestAnimationFrame(st); }
    at(ms, f) { const g = this.gen; setTimeout(() => { if (g === this.gen) f(); }, ms); }
    shake(a) { this.stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + (-a * .6) + 'px,' + a + 'px)' }, { transform: 'translate(' + (a * .5) + 'px,' + (-a * .5) + 'px)' }, { transform: 'translate(' + (-a * .3) + 'px,' + (a * .3) + 'px)' }, { transform: 'translate(0,0)' }], { duration: 300, easing: 'ease-out' }); }
    local(e) { const r = this.getBoundingClientRect(), sc = r.width / (this.offsetWidth || 1); return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc]; }
    win(H, S, quiet) {
      this.state = 'caught'; this.sc.setAttribute('mood', 'celebrate'); if (!quiet) this.sfx(a => a.finish()); buzz([32, 40, 60, 40, 180]);
      this.fx.burst(196, 340, { n: 70, speed: 380, lift: 160 }); this.say(H, S, true); this.timer.textContent = 'Caught';
    }
    reset() { this.gen++; this.state = 'during'; this.drag = false; this._hold = 0; this.showSheet(false); this.C.reset(this); }
    setP(p) {
      p = clamp(isNaN(p) ? 0 : p); const prev = this.p; this.p = p;
      if (p < 1 && this.state !== 'during') { if (this.state === 'caught' || this.state === 'busy') this.reset(); else { this.state = 'during'; this._hold = 0; this.showSheet(false); } }
      if (this.state === 'caught' || this.state === 'busy') return;
      if (p >= 1 && this.state === 'during') {
        this.state = 'confirm'; this.sc.setAttribute('mood', 'nudge'); this.showSheet(true);
        if (this._loaded && prev < 1) this.sfx((a, t) => { a.bell(t, a.note(12), .06); a.bell(t + .12, a.note(14), .06); });
      } else if (p < 1) this.sc.setAttribute('mood', 'working');
      this.setTimer(); this.C.render(this, p);
      const c = this.state === 'during' && p <= .001; this.coach.style.opacity = c ? 1 : 0; this.coach.style.transform = c ? 'none' : 'translateY(14px) scale(.98)'; this.coach.style.pointerEvents = c ? 'auto' : 'none';
    }
    _down(e) { if (!this.C.down) return; const [x, y] = this.local(e); if (this.C.down(this, x, y, e) === false) return; this.drag = true; try { this.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); e.stopPropagation(); }
    _move(e) { if (!this.drag) return; const [x, y] = this.local(e); this.C.move && this.C.move(this, x, y); e.preventDefault(); e.stopPropagation(); }
    _up(e) { if (!this.drag) return; this.drag = false; const [x, y] = this.local(e); this.C.up && this.C.up(this, x, y); }
  }
  customElements.define('scootch-catch', Catch);
})();