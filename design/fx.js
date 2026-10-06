(function () {
  if (customElements.get('scootch-hold')) return;
  const PI = Math.PI, ACC = '#F0562E', INK = '#1C1A17', MUTED = '#6F6A62', TRACK = '#E7E1D7';
  const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";
  const ROUND = "ui-rounded, 'SF Pro Rounded', 'Nunito', -apple-system, system-ui, sans-serif";
  let AC; const SA = () => window.ScootchAudio; const ac = () => { if (SA()) return SA().ctx(); AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  function tone(f, s, d, type, g, f2) { const a = ac(), o = a.createOscillator(), G = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, s); if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d * .8); G.gain.setValueAtTime(.0001, s); G.gain.exponentialRampToValueAtTime(g, s + .012); G.gain.exponentialRampToValueAtTime(.0001, s + d); o.connect(G).connect(a.destination); o.start(s); o.stop(s + d + .05); }
  function noise(s, d, g, f0 = 800, f1 = 5000) { const a = ac(), b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length); const n = a.createBufferSource(); n.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(f0, s); f.frequency.exponentialRampToValueAtTime(f1, s + d); const G = a.createGain(); G.gain.value = g; n.connect(f).connect(G).connect(a.destination); n.start(s); }
  const SFX = {
    burst() { try { const s = ac().currentTime; noise(s, .3, .18); tone(130, s, .35, 'sine', .25, 260); [523, 659, 784, 1047].forEach((f, i) => tone(f, s + .04 + i * .05, .55, 'triangle', .11)); tone(1568, s + .26, .6, 'sine', .05, 2093); } catch (e) { } buzz([18, 40, 30, 40, 60]); },
    complete() { try { const s = ac().currentTime; noise(s, .55, .2, 400, 6000); tone(98, s, 1, 'sine', .26, 196); [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, s + i * .055, 1.1, 'triangle', .09)); } catch (e) { } buzz([30, 30, 60, 30, 140]); },
    sigh() { try { const s = ac().currentTime; tone(440, s, .35, 'sine', .06, 220); } catch (e) { } }
  };
  window.ScootchSFX = SFX;

  function makeFX(host) {
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    host.appendChild(cv); const ctx = cv.getContext('2d'); let parts = [], rings = [], raf = 0;
    function size() { const d = Math.min(2, devicePixelRatio || 1); cv.width = host.offsetWidth * d; cv.height = host.offsetHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function loop() {
      ctx.clearRect(0, 0, host.offsetWidth, host.offsetHeight); const now = performance.now();
      parts = parts.filter(p => now - p.t0 < p.life); rings = rings.filter(r => now - r.t0 < r.life);
      for (const r of rings) { if (now < r.t0) continue; const k = (now - r.t0) / r.life; ctx.strokeStyle = r.c; ctx.lineWidth = 6 * (1 - k) + .5; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)), 0, PI * 2); ctx.stroke(); }
      for (const p of parts) {
        if (now < p.t0) continue;
        const k = (now - p.t0) / p.life, e = 1 - Math.pow(1 - k, 3), x = p.x + p.vx * e, y = p.y + p.vy * e + p.g * k * k;
        ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + k * p.spin);
        if (p.kind === 0) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-p.len / 2, -2.2, p.len, 4.4, 2.2) : ctx.rect(-p.len / 2, -2.2, p.len, 4.4); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.w, 0, PI * 2); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; raf = (parts.length || rings.length) ? requestAnimationFrame(loop) : 0;
    }
    return {
      fire(x, y, o = {}) {
        size(); const now = performance.now(), n = o.count || 40, cols = o.colors || [ACC, INK, ACC, '#E7DCCB'];
        for (let i = 0; i < n; i++) { const a = Math.random() * PI * 2, sp = (o.speed || 220) * (.4 + Math.random() * .8); parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 60), g: o.gravity ?? 260, t0: now + (o.delay || 0) + Math.random() * 60, life: 900 + Math.random() * 700, c: cols[i % cols.length], w: 2.5 + Math.random() * 2.5, len: 9 + Math.random() * 9, kind: i % 2, rot: Math.random() * 6, spin: (Math.random() - .5) * 10 }); }
        (o.rings || [0]).forEach((d, i) => rings.push({ x, y, r0: o.r0 || 20, r1: (o.ringR || 160) + i * 50, t0: now + (o.delay || 0) + d, life: 700, c: i % 2 ? INK : ACC }));
        if (!raf) raf = requestAnimationFrame(loop);
      }
    };
  }
  function localCenter(host, el) { const h = host.getBoundingClientRect(), r = el.getBoundingClientRect(), sc = h.width / (host.offsetWidth || 1); return [(r.left + r.width / 2 - h.left) / sc, (r.top + r.height / 2 - h.top) / sc]; }
  function overlay(host) { Object.assign(host.style, { position: 'absolute', inset: '0', display: 'block', pointerEvents: 'none' }); }
  const pop = (group, dur, extra) => window.dispatchEvent(new CustomEvent('scootch-pop', { detail: Object.assign({ group, dur }, extra || {}) }));
  const pressable = el => { el.addEventListener('pointerdown', () => { el.style.transform = 'scale(.97)'; el.style.opacity = '.92'; }); const up = () => { el.style.transform = ''; el.style.opacity = ''; }; el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); };

  class SBurst extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1; overlay(this); this.fx = makeFX(this);
      const label = () => this.getAttribute('label') || 'Start';
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;left:24px;right:24px;bottom:' + (this.getAttribute('bottom') || '48') + 'px;display:flex;flex-direction:column;align-items:stretch;gap:12px';
      const b = document.createElement('button'); b.textContent = label();
      b.style.cssText = "pointer-events:auto;border:0;cursor:pointer;background:" + INK + ";color:#fff;font:600 17px " + SANS + ";height:56px;border-radius:28px;transition:transform .14s, opacity .14s;-webkit-tap-highlight-color:transparent;letter-spacing:-.01em";
      pressable(b);
      const sub = document.createElement('span'); sub.textContent = this.getAttribute('sub') || ''; sub.style.cssText = "font:400 15px " + SANS + ";color:" + MUTED + ";text-align:center;min-height:20px";
      b.onclick = () => {
        const [x, y] = localCenter(this, b);
        this.fx.fire(x, y, { count: 56, rings: [0, 90], ringR: 150, speed: 340, lift: 200 });
        this.fx.fire(this.offsetWidth / 2, this.offsetHeight * .3, { count: 34, rings: [40], ringR: 190, speed: 260, lift: 40, delay: 90 });
        if (SA()) SA().burst(); else SFX.burst(); pop(this.getAttribute('group'), 2);
        b.textContent = this.getAttribute('done') || 'Started'; sub.textContent = this.getAttribute('donesub') || '';
        clearTimeout(this._t); this._t = setTimeout(() => { b.textContent = label(); sub.textContent = this.getAttribute('sub') || ''; }, 2600);
      };
      wrap.append(b, sub); this.append(wrap);
    }
  }
  customElements.define('scootch-burst', SBurst);

  class SHold extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1; overlay(this); this.fx = makeFX(this);
      const D = 124, idle = this.getAttribute('caption') || 'Press and hold to finish';
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;left:0;right:0;bottom:44px;display:flex;flex-direction:column;align-items:center;gap:22px';
      const btn = document.createElement('div');
      btn.style.cssText = 'pointer-events:auto;position:relative;width:' + D + 'px;height:' + D + 'px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(28,26,23,.06),0 10px 30px rgba(28,26,23,.10);touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;display:flex;align-items:center;justify-content:center';
      const ring = document.createElement('div'); ring.style.cssText = 'position:absolute;inset:-12px;border-radius:50%;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4.5px))';
      const fill = document.createElement('div'); fill.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:' + ACC + ';transform:scale(0)';
      const lab = document.createElement('span'); lab.textContent = 'Hold'; lab.style.cssText = "position:relative;font:600 19px " + ROUND + ";color:" + INK;
      btn.append(ring, fill, lab);
      const cap = document.createElement('span'); cap.textContent = idle; cap.style.cssText = "font:400 15px " + SANS + ";color:" + MUTED + ";min-height:20px;text-align:center;padding:0 28px";
      wrap.append(btn, cap); this.append(wrap);
      let p = 0, holding = false, last = 0, lastBuzz = 0, locked = false, hum = null;
      const startHum = () => { try { const a = ac(), o1 = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(); o1.type = 'sawtooth'; o2.type = 'sine'; f.type = 'lowpass'; f.Q.value = 5; g.gain.value = .0001; o1.connect(f); o2.connect(f); f.connect(g).connect(a.destination); o1.start(); o2.start(); hum = { o1, o2, f, g, a }; } catch (e) { } };
      const stopHum = () => { if (!hum) return; const { a, g, o1, o2 } = hum, s = a.currentTime; g.gain.cancelScheduledValues(s); g.gain.setValueAtTime(g.gain.value, s); g.gain.exponentialRampToValueAtTime(.0001, s + .25); o1.stop(s + .3); o2.stop(s + .3); hum = null; };
      const tick = now => {
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        if (!locked) p = Math.max(0, Math.min(1, p + (holding ? dt / 1.7 : -dt / .45)));
        const e = p * p * (3 - 2 * p), shake = holding ? Math.sin(now / 22) * e * 1.6 : 0;
        fill.style.transform = 'scale(' + e + ')'; lab.style.color = e > .55 ? '#fff' : INK;
        btn.style.transform = 'translateX(' + shake + 'px) scale(' + (holding ? .96 - e * .02 : 1) + ')';
        ring.style.background = 'conic-gradient(' + ACC + ' ' + (p * 360) + 'deg, ' + TRACK + ' 0)';
        if (this._ctl) this._ctl.set(e);
        if (hum) { const s = hum.a.currentTime; hum.o1.frequency.setTargetAtTime(110 + e * 330, s, .03); hum.o2.frequency.setTargetAtTime(220 + e * 660, s, .03); hum.f.frequency.setTargetAtTime(300 + e * 3000, s, .03); hum.g.gain.setTargetAtTime(holding ? .025 + e * .08 : .0001, s, .04); }
        if (!this._ctl && holding && now - lastBuzz > 190 - 150 * e) { buzz(Math.round(6 + 22 * e)); lastBuzz = now; }
        if (holding && p >= 1 && !locked) complete();
        if (holding || p > 0 || locked) this._raf = requestAnimationFrame(tick); else { this._raf = 0; stopHum(); }
      };
      const run = () => { if (!this._raf) { last = performance.now(); this._raf = requestAnimationFrame(tick); } };
      const complete = () => {
        locked = true; holding = false; if (this._ctl) { this._ctl.complete(); this._ctl = null; } else { stopHum(); SFX.complete(); }
        const [x, y] = localCenter(this, btn);
        this.fx.fire(x, y, { count: 80, rings: [0, 80, 160], ringR: 120, r0: 62, speed: 420, lift: 220 });
        this.fx.fire(this.offsetWidth / 2, this.offsetHeight * .3, { count: 40, rings: [120], ringR: 210, speed: 300, lift: 60, delay: 160 });
        pop(this.getAttribute('group'), 3.2, { task: 'caught' });
        lab.textContent = 'Done'; cap.textContent = this.getAttribute('done') || 'Finished.'; cap.style.color = INK;
        setTimeout(() => { locked = false; p = 0; lab.textContent = 'Hold'; cap.textContent = idle; cap.style.color = MUTED; run(); }, 3400);
      };
      btn.addEventListener('pointerdown', e => { if (locked) return; btn.setPointerCapture && btn.setPointerCapture(e.pointerId); holding = true; cap.textContent = 'Keep holding…'; cap.style.color = INK; if (SA()) { if (!this._ctl) this._ctl = SA().hold(); } else if (!hum) startHum(); run(); });
      const release = () => { if (!holding) return; holding = false; if (!locked) { if (p > .08) { cap.textContent = 'Nearly. Hold until it bursts.'; if (this._ctl) { this._ctl.release(); this._ctl = null; } else SFX.sigh(); } else { if (this._ctl) { this._ctl.release(); this._ctl = null; } cap.textContent = idle; } cap.style.color = MUTED; clearTimeout(this._ct); this._ct = setTimeout(() => { if (!holding && !locked) cap.textContent = idle; }, 1800); } };
      btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release); btn.addEventListener('lostpointercapture', release);
      tick(performance.now());
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
  }
  customElements.define('scootch-hold', SHold);

  class SDump extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1;
      Object.assign(this.style, { display: 'block', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' });
      this.tr = document.createElement('div'); this.tr.style.cssText = "position:absolute;left:0;right:0;top:0;font:500 22px/1.36 " + ROUND + ";color:" + INK + ";transition:opacity .5s;letter-spacing:-.01em";
      this.fin = document.createElement('div'); this.fin.style.cssText = 'position:absolute;left:0;right:0;top:6px;display:flex;flex-direction:column;gap:12px;opacity:0;transform:translateY(14px);transition:opacity .6s, transform .7s cubic-bezier(.2,1.3,.4,1)';
      this.fin.innerHTML = "<span style=\"font:600 13px " + SANS + ";letter-spacing:.02em;color:" + MUTED + "\">TODAY'S ONE THING</span><span style=\"font:700 34px/1.08 " + ROUND + ";letter-spacing:-.02em;color:" + INK + "\">Email the dentist about Thursday.</span><span style=\"font:400 17px/1.4 " + SANS + ";color:" + MUTED + "\">Eleven other things are parked. You won't see them unless you ask.</span>";
      this.append(this.tr, this.fin); this.timers = []; this.run();
    }
    disconnectedCallback() { this.timers.forEach(clearTimeout); this.timers = []; this._init = 0; this.innerHTML = ''; }
    at(ms, f) { this.timers.push(setTimeout(f, ms)); }
    run() {
      const raw = 'ok so taxes are due and I haven’t called mum back and the bathroom is honestly a crime scene and I need to |email the dentist about Thursday| and the car thing and I keep saying I’ll start running and Sam is still waiting on a reply and';
      this.tr.innerHTML = ''; this.tr.style.opacity = 1; this.fin.style.opacity = 0; this.fin.style.transform = 'translateY(14px)';
      const words = []; let chosen;
      raw.split('|').forEach((part, i) => {
        if (i === 1) { chosen = document.createElement('span'); chosen.style.cssText = 'border-radius:7px;padding:1px 5px;margin:0 -5px;transition:background .35s, color .35s;box-decoration-break:clone;-webkit-box-decoration-break:clone'; part.split(' ').forEach(w => { const s = document.createElement('span'); s.textContent = w + ' '; s.style.opacity = 0; chosen.append(s); words.push(s); }); this.tr.append(chosen); }
        else part.trim().split(' ').forEach(w => { const s = document.createElement('span'); s.textContent = w + ' '; s.style.cssText = 'display:inline-block;white-space:pre;opacity:0;transition:opacity .7s, transform .9s cubic-bezier(.5,0,.8,.4), filter .7s'; s.dataset.other = 1; this.tr.append(s); words.push(s); });
      });
      const step = 100; words.forEach((s, i) => this.at(i * step, () => { s.style.opacity = 1; }));
      let T = words.length * step + 500;
      this.at(T, () => { chosen.style.background = ACC; chosen.style.color = '#fff'; });
      T += 900;
      this.at(T, () => this.tr.querySelectorAll('[data-other]').forEach(s => { s.style.transitionDelay = Math.random() * 380 + 'ms'; s.style.opacity = 0; s.style.filter = 'blur(3px)'; s.style.transform = 'translate(' + ((Math.random() - .5) * 40) + 'px,' + (120 + Math.random() * 160) + 'px) rotate(' + ((Math.random() - .5) * 40) + 'deg)'; }));
      T += 1500;
      this.at(T, () => { this.tr.style.opacity = 0; this.fin.style.opacity = 1; this.fin.style.transform = 'translateY(0)'; });
      T += 3800;
      this.at(T, () => { this.timers = []; this.run(); });
    }
  }
  customElements.define('scootch-dump', SDump);

  // Composer: hold to talk, slide to cancel, or switch to typing
  const GLS = 'background:rgba(255,255,255,.58);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);box-shadow:inset 0 1px .5px rgba(255,255,255,.95),inset 0 -.5px .5px rgba(255,255,255,.5),0 0 0 .5px rgba(28,26,23,.16),0 10px 30px -8px rgba(28,26,23,.18)';
  const SPR = 'cubic-bezier(.32,.72,0,1)';
  const waveG = (c, h = 1) => '<div style="display:flex;align-items:center;gap:2.5px;height:20px">' + [6, 12, 18, 12, 6].map(v => '<div style="width:3px;height:' + v * h + 'px;border-radius:2px;background:' + c + '"></div>').join('') + '</div>';
  const kbdG = '<div style="width:24px;height:17px;border-radius:5px;box-shadow:inset 0 0 0 1.8px ' + INK + ';display:grid;grid-template-columns:repeat(4,2.6px);gap:2.4px 2.4px;align-content:center;justify-content:center"><div style="height:2.6px;border-radius:1px;background:' + INK + '"></div><div style="height:2.6px;border-radius:1px;background:' + INK + '"></div><div style="height:2.6px;border-radius:1px;background:' + INK + '"></div><div style="height:2.6px;border-radius:1px;background:' + INK + '"></div><div style="grid-column:span 4;height:2.4px;border-radius:1px;background:' + INK + ';margin:0 3px"></div></div>';
  const upG = '<div style="position:relative;width:14px;height:16px"><div style="position:absolute;left:6px;top:2px;width:2.4px;height:14px;border-radius:1px;background:#fff"></div><div style="position:absolute;left:1.5px;top:1px;width:9px;height:9px;border-left:2.4px solid #fff;border-top:2.4px solid #fff;transform:rotate(45deg);transform-origin:center;box-sizing:border-box;margin-left:.3px"></div></div>';
  SFX.tick = () => { if (SA()) return SA().tick(); try { const s = ac().currentTime; tone(880, s, .07, 'sine', .07); } catch (e) { } buzz(8); };
  SFX.send = () => { if (SA()) return SA().send(); try { const s = ac().currentTime; noise(s, .22, .12, 600, 4000); tone(523, s, .18, 'triangle', .08, 1047); } catch (e) { } buzz([6, 30, 12]); };
  SFX.cancel = () => { if (SA()) return SA().cancel(); try { const s = ac().currentTime; tone(330, s, .16, 'sine', .07, 196); } catch (e) { } buzz(10); };
  class SComposer extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1; overlay(this);
      const E = (css, html) => { const e = document.createElement('div'); e.style.cssText = css; if (html != null) e.innerHTML = html; return e; };
      const group = this.getAttribute('group');
      const say = (mood, dur) => pop(group, dur, { mood });
      const wrap = E('position:absolute;left:14px;right:14px;bottom:' + (this.getAttribute('bottom') || 30) + 'px;display:flex;flex-direction:column;align-items:center;gap:10px');
      const hint = E('pointer-events:none;opacity:0;transform:translateY(10px) scale(.96);transition:opacity .3s, transform .5s ' + SPR + ';' + GLS + ';height:36px;border-radius:18px;padding:0 16px;display:flex;align-items:center;gap:8px;font:500 14px ' + SANS + ';color:' + INK);
      const dock = E('pointer-events:auto;width:100%;box-sizing:border-box;' + GLS + ';border-radius:34px;padding:7px;display:flex;align-items:center;transition:transform .5s ' + SPR);
      const left = E('flex:none;width:54px;height:54px;margin-right:7px;border-radius:27px;background:rgba(28,26,23,.06);position:relative;cursor:pointer;overflow:hidden;transition:width .5s ' + SPR + ', margin .5s ' + SPR + ', opacity .3s, transform .2s');
      const icK = E('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .25s, transform .45s ' + SPR, kbdG);
      const icW = E('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.6);transition:opacity .25s, transform .45s ' + SPR, waveG(INK));
      left.append(icK, icW);
      const stage = E('flex:1;height:54px;position:relative');
      const talk = E('position:absolute;inset:0;border-radius:27px;background:' + INK + ';color:#fff;overflow:hidden;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 6px 16px -4px rgba(28,26,23,.35);transition:background .35s, opacity .3s, transform .45s ' + SPR);
      const lab = E('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:11px;font:600 17px ' + SANS + ';letter-spacing:-.01em;transition:opacity .25s, transform .45s ' + SPR, waveG('#fff') + '<span>Hold to talk</span>');
      const live = E('position:absolute;inset:0;display:flex;align-items:center;gap:12px;padding:0 20px;opacity:0;transform:scale(.94);transition:opacity .25s, transform .45s ' + SPR);
      const barsBox = E('flex:1;display:flex;align-items:center;justify-content:space-between;height:30px');
      const bars = Array.from({ length: 22 }, () => { const b = E('width:3px;height:4px;border-radius:2px;background:#fff;transition:height .08s'); barsBox.append(b); return b; });
      const timer = E('flex:none;font:600 15px ' + SANS + ';font-variant-numeric:tabular-nums;opacity:.9', '0:00');
      const cancelLab = E('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 16px ' + SANS + ';opacity:0;transition:opacity .2s', 'Release to cancel');
      live.append(barsBox, timer); talk.append(lab, live, cancelLab);
      const type = E('position:absolute;inset:0;display:flex;align-items:center;gap:7px;opacity:0;transform:scale(.96);pointer-events:none;transition:opacity .3s, transform .5s ' + SPR);
      const input = document.createElement('input'); input.placeholder = 'Type the one thing…'; input.style.cssText = 'flex:1;min-width:0;height:54px;border:0;outline:none;background:transparent;padding:0 6px;font:500 17px ' + SANS + ';color:' + INK;
      const send = E('flex:none;width:54px;height:54px;border-radius:27px;background:' + INK + ';display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(0);opacity:0;transition:transform .45s ' + SPR + ', opacity .2s', upG);
      type.append(input, send); stage.append(talk, type);
      dock.append(left, stage); wrap.append(hint, dock); this.append(wrap);
      let mode = 'voice', holding = false, t0 = 0, sx = 0, armed = false, raf = 0, amp = 0, hintT;
      const showHint = (html, ms) => { hint.innerHTML = html; hint.style.opacity = 1; hint.style.transform = 'none'; clearTimeout(hintT); if (ms) hintT = setTimeout(hideHint, ms); };
      const hideHint = () => { hint.style.opacity = 0; hint.style.transform = 'translateY(10px) scale(.96)'; };
      const setMode = m => {
        mode = m; const ty = m === 'type';
        icK.style.opacity = ty ? 0 : 1; icK.style.transform = ty ? 'scale(.6)' : 'none';
        icW.style.opacity = ty ? 1 : 0; icW.style.transform = ty ? 'none' : 'scale(.6)';
        talk.style.opacity = ty ? 0 : 1; talk.style.transform = ty ? 'scale(.94)' : 'none'; talk.style.pointerEvents = ty ? 'none' : 'auto';
        type.style.opacity = ty ? 1 : 0; type.style.transform = ty ? 'none' : 'scale(.96)'; type.style.pointerEvents = ty ? 'auto' : 'none';
        if (ty) { setTimeout(() => input.focus({ preventScroll: true }), 120); say('listening', 30); } else { input.blur(); say('waiting', .01); }
      };
      left.addEventListener('pointerdown', () => { left.style.transform = 'scale(.92)'; });
      left.addEventListener('pointerup', () => { left.style.transform = ''; });
      left.addEventListener('pointerleave', () => { left.style.transform = ''; });
      left.addEventListener('click', () => { if (!holding) { SFX.tick(); setMode(mode === 'voice' ? 'type' : 'voice'); } });
      const tick = () => {
        const el = (performance.now() - t0) / 1000; timer.textContent = '0:' + String(Math.floor(el)).padStart(2, '0');
        amp += ((Math.random() < .08 ? Math.random() : .25 + Math.random() * .7) - amp) * .2;
        bars.forEach((b, i) => { const v = armed ? .08 : amp * (.35 + .65 * Math.abs(Math.sin(el * 7 + i * .55))) * (1 - Math.abs(i - 10.5) / 16); b.style.height = Math.max(3, v * 30) + 'px'; });
        raf = requestAnimationFrame(tick);
      };
      const fly = (fromEl, html, wide) => {
        const h = this.getBoundingClientRect(), r = fromEl.getBoundingClientRect(), sc = h.width / (this.offsetWidth || 1);
        const w = wide ? Math.min(260, r.width / sc) : 54, x = (r.left - h.left) / sc + (r.width / sc - w) / 2, y = (r.top - h.top) / sc;
        const o = E('position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:54px;border-radius:27px;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;' + (wide ? GLS + ';font:500 16px ' + SANS + ';color:' + INK + ';padding:0 16px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : 'background:' + ACC + ';box-shadow:0 10px 30px -6px rgba(240,86,46,.6)') + ';transition:transform .8s ' + SPR + ', opacity .6s .25s', html);
        this.append(o); requestAnimationFrame(() => requestAnimationFrame(() => { o.style.transform = 'translateY(-' + (y * .62) + 'px) scale(' + (wide ? .55 : .35) + ')'; o.style.opacity = 0; }));
        setTimeout(() => o.remove(), 1100);
        say('thinking', 1.3); setTimeout(() => say('celebrate', 1.4), 1300);
        showHint('<span style="width:8px;height:8px;border-radius:4px;background:' + ACC + '"></span>Scootch is picking the one thing…', 2400);
      };
      const reset = () => {
        holding = false; armed = false; cancelAnimationFrame(raf);
        talk.style.background = INK; talk.style.transform = ''; lab.style.opacity = 1; lab.style.transform = 'none'; live.style.opacity = 0; live.style.transform = 'scale(.94)'; cancelLab.style.opacity = 0; live.style.translate = '0';
        left.style.width = '54px'; left.style.marginRight = '7px'; left.style.opacity = 1; dock.style.transform = '';
      };
      talk.addEventListener('pointerdown', e => {
        if (mode !== 'voice') return; talk.setPointerCapture && talk.setPointerCapture(e.pointerId);
        holding = true; t0 = performance.now(); sx = e.clientX; armed = false; amp = .3; SFX.tick();
        if (SA()) SA().listen(); talk.style.background = ACC; lab.style.opacity = 0; lab.style.transform = 'scale(.9)'; live.style.opacity = 1; live.style.transform = 'none';
        left.style.width = '0px'; left.style.marginRight = '0px'; left.style.opacity = 0; dock.style.transform = 'scale(1.025)';
        showHint('<span style="font-size:16px;line-height:1">‹</span>Slide left to cancel'); say('listening', 60); raf = requestAnimationFrame(tick);
      });
      talk.addEventListener('pointermove', e => {
        if (!holding) return; const h = this.getBoundingClientRect(), sc = h.width / (this.offsetWidth || 1), dx = Math.min(0, (e.clientX - sx) / sc);
        live.style.translate = (dx * .35) + 'px 0'; const a = dx < -80;
        if (a !== armed) { armed = a; talk.style.background = a ? '#5A5550' : ACC; cancelLab.style.opacity = a ? 1 : 0; live.style.opacity = a ? 0 : 1; if (a) buzz(12); }
      });
      const release = () => {
        if (!holding) return; const held = performance.now() - t0; hideHint();
        if (armed) { SFX.cancel(); reset(); say('nudge', 1.2); showHint('Cancelled. No harm done.', 1400); return; }
        if (held < 450) { reset(); showHint('Hold it down while you talk', 1600); talk.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'ease-out' }); say('waiting', .01); return; }
        SFX.send(); fly(talk, waveG('#fff')); reset();
      };
      talk.addEventListener('pointerup', release); talk.addEventListener('pointercancel', release); talk.addEventListener('lostpointercapture', release);
      input.addEventListener('input', () => { const on = !!input.value.trim(); send.style.transform = on ? 'scale(1)' : 'scale(0)'; send.style.opacity = on ? 1 : 0; if (on) say('thinking', 30); else say('listening', 30); });
      const doSend = () => { const v = input.value.trim(); if (!v) return; SFX.send(); fly(input, v.replace(/</g, '&lt;'), true); input.value = ''; send.style.transform = 'scale(0)'; send.style.opacity = 0; };
      send.addEventListener('click', doSend); input.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });
    }
  }
  customElements.define('scootch-composer', SComposer);

  // The week as a 7-inch record: each finished day adds an instrument
  const INSTR = ['Keys', 'Bassline', 'Marimba', 'Drums', 'Whistle', 'Bells', 'Choir'];
  const CHORDS = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14], [5, 9, 12]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  class SRecord extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1;
      const n = Math.max(1, Math.min(7, parseInt(this.getAttribute('days') || '7'))); this.n = n;
      const size = parseInt(this.getAttribute('size') || '320'), dark = this.getAttribute('on') === 'dark';
      const E = (css, html) => { const e = document.createElement('div'); e.style.cssText = css; if (html != null) e.innerHTML = html; return e; };
      Object.assign(this.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', width: '100%' });
      const deck = E('position:relative;width:' + size + 'px;height:' + size + 'px;flex:none');
      const shadow = E('position:absolute;inset:4%;border-radius:50%;box-shadow:0 24px 40px -14px rgba(28,26,23,.55),0 0 0 .5px rgba(0,0,0,.4)');
      const disc = E('position:absolute;inset:4%;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,#1B1816 0 1.2px,#26221F 1.2px 2.6px);overflow:hidden');
      const segs = []; for (let i = 0; i < 7; i++) segs.push((i < n ? '#F0562E' : '#4A433D') + ' ' + (i / 7 * 360 + 1.5) + 'deg ' + ((i + 1) / 7 * 360 - 1.5) + 'deg', 'transparent ' + ((i + 1) / 7 * 360 - 1.5) + 'deg ' + ((i + 1) / 7 * 360 + 1.5) + 'deg');
      const ring = E('position:absolute;inset:27%;border-radius:50%;background:conic-gradient(' + segs.join(',') + ');-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6.5px))');
      const label = E('position:absolute;inset:31%;border-radius:50%;background:#F0562E;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)');
      const cr = document.createElement('scootch-critter'); cr.setAttribute('kind', 'scootch'); cr.setAttribute('work', 'music'); cr.setAttribute('tone', 'paper'); cr.setAttribute('sound', 'off'); cr.style.cssText = 'width:96%;height:96%;margin-top:8%';
      label.append(cr);
      const hole = E('position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#F6F3EE;box-shadow:inset 0 1px 2px rgba(0,0,0,.4)');
      const spin = E('position:absolute;inset:0'); spin.append(disc, ring, label, hole);
      const sheen = E('position:absolute;inset:4%;border-radius:50%;pointer-events:none;background:conic-gradient(from 20deg,transparent 0 30deg,rgba(255,255,255,.11) 50deg,transparent 75deg 200deg,rgba(255,255,255,.08) 225deg,transparent 250deg);mix-blend-mode:screen');
      const arm = E('position:absolute;right:-2%;top:-1%;width:26%;height:72%;transform-origin:78% 12%;transform:rotate(-18deg);transition:transform .9s cubic-bezier(.32,.72,0,1);pointer-events:none');
      arm.innerHTML = '<div style="position:absolute;right:8%;top:2%;width:34%;aspect-ratio:1;border-radius:50%;background:#D9D2C6;box-shadow:inset 0 0 0 1px rgba(28,26,23,.2),0 4px 10px rgba(0,0,0,.25)"></div><div style="position:absolute;right:21%;top:12%;width:6px;height:78%;border-radius:3px;background:#CFC7BA;box-shadow:0 2px 6px rgba(0,0,0,.25);transform:rotate(14deg);transform-origin:top center"></div><div style="position:absolute;left:28%;bottom:4%;width:22%;height:12%;border-radius:3px;background:#1C1A17;transform:rotate(14deg)"></div>';
      deck.append(shadow, spin, sheen, arm);
      const fg = dark ? '#F6F3EE' : INK, mt = dark ? 'rgba(246,243,238,.6)' : MUTED;
      const ctr = E('display:flex;align-items:center;gap:14px;width:100%');
      const btn = E('flex:none;width:56px;height:56px;border-radius:28px;background:' + (dark ? '#F6F3EE' : INK) + ';display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 6px 16px -4px rgba(28,26,23,.35);transition:transform .2s');
      const ic = E('display:flex;align-items:center;justify-content:center');
      const playI = '<div style="width:0;height:0;border-left:15px solid ' + (dark ? INK : '#fff') + ';border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:4px"></div>';
      const pauseI = '<div style="display:flex;gap:5px"><div style="width:5px;height:18px;border-radius:2px;background:' + (dark ? INK : '#fff') + '"></div><div style="width:5px;height:18px;border-radius:2px;background:' + (dark ? INK : '#fff') + '"></div></div>';
      ic.innerHTML = playI; btn.append(ic);
      const meta = E('flex:1;min-width:0;display:flex;flex-direction:column;gap:3px');
      const ttl = E("font:700 18px/1.2 ui-rounded,'SF Pro Rounded','Nunito',system-ui,sans-serif;color:" + fg + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis', this.getAttribute('track') || 'Your week');
      const now = E('font:500 13px ' + SANS + ';color:' + mt, n === 7 ? '7 bars · full band' : n + ' of 7 bars · ' + INSTR.slice(0, n).join(', ').toLowerCase());
      meta.append(ttl, now);
      const prog = E('display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;width:100%');
      this.bars = Array.from({ length: 7 }, (_, i) => { const b = E('height:5px;border-radius:3px;background:' + (i < n ? (dark ? 'rgba(246,243,238,.18)' : 'rgba(28,26,23,.12)') : 'transparent') + ';' + (i < n ? '' : 'box-shadow:inset 0 0 0 1px ' + (dark ? 'rgba(246,243,238,.15)' : 'rgba(28,26,23,.12)')) + ';overflow:hidden'); const f = E('height:100%;width:0;background:#F0562E;border-radius:3px'); b.append(f); prog.append(b); return f; });
      ctr.append(btn, meta);
      this.append(deck, ctr, prog);
      this.spinA = spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1800, iterations: Infinity }); this.spinA.playbackRate = 0;
      Object.assign(this, { arm, ic, playI, pauseI, nowEl: now, btn });
      btn.addEventListener('pointerdown', () => btn.style.transform = 'scale(.92)');
      btn.addEventListener('pointerup', () => btn.style.transform = '');
      btn.addEventListener('click', () => this.playing ? this.stop() : this.play());
    }
    ramp(to, ms) { const a = this.spinA, from = a.playbackRate, t0 = performance.now(); cancelAnimationFrame(this._rr); const st = () => { const k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); a.playbackRate = from + (to - from) * e; if (k < 1) this._rr = requestAnimationFrame(st); }; st(); }
    play() {
      const a = ac(), step = .11, bar = step * 16, t0 = a.currentTime + .25, n = this.n; this.playing = true; this.ic.innerHTML = this.pauseI; this.ramp(1, 700); buzz(10);
      this.arm.style.transform = 'rotate(4deg)';
      const out = a.createGain(); out.gain.value = .9; if (SA()) { out.connect(SA().master); const ws = a.createGain(); ws.gain.value = .35; out.connect(ws).connect(SA().verbIn); } else out.connect(a.destination); this.out = out;
      const T = (f, s, d, type, g, o = {}) => { const osc = a.createOscillator(), G = a.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, s); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, s + d * .7); if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = f * .012; l.connect(lg).connect(osc.frequency); l.start(s); l.stop(s + d + .05); } if (o.det) osc.detune.value = o.det; G.gain.setValueAtTime(.0001, s); G.gain.exponentialRampToValueAtTime(g, s + (o.att || .01)); G.gain.exponentialRampToValueAtTime(.0001, s + d); osc.connect(G).connect(out); osc.start(s); osc.stop(s + d + .05); };
      const N = (s, d, g, f0, f1) => { const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2); const src = a.createBufferSource(); src.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = f0; f.Q.value = f1; const G = a.createGain(); G.gain.value = g; src.connect(f).connect(G).connect(out); src.start(s); };
      for (let b = 0; b < n; b++) {
        const ch = CHORDS[b], root = 48 + ch[0], bs = t0 + b * bar;
        const lay = d => d <= b;
        for (let k = 0; k < 16; k++) {
          const s = bs + k * step;
          if (lay(0) && [0, 6, 10].includes(k)) ch.forEach(c => T(mtof(60 + c), s, .32, 'triangle', .035));
          if (lay(1) && [0, 3, 8, 11].includes(k)) T(mtof(root - 12), s, .26, 'sine', .2);
          if (lay(2) && k % 2 === 1) T(mtof(72 + ch[(k >> 1) % 3]), s, .16, 'sine', .07);
          if (lay(3)) { if (k === 0 || k === 8) T(150, s, .16, 'sine', .35, { f2: 40 }); if (k === 4 || k === 12) N(s, .14, .5, 1800, .8); if (k % 2 === 0) N(s, .03, .12, 8000, 1.2); }
          if (lay(4) && k % 4 === 2) T(mtof(84 + [0, 2, 4, 7, 9][(b * 3 + k) % 5] + ch[0] % 12), s, .34, 'sine', .05, { vib: 1, att: .04 });
          if (lay(5) && (k === 0 || k === 8)) { T(mtof(96 + ch[1]), s, 1.3, 'sine', .03); T(mtof(96 + ch[1]), s, 1.3, 'sine', .02, { det: 7 }); }
          if (lay(6) && k === 0) ch.forEach(c => { T(mtof(60 + c), s, bar * .98, 'triangle', .018, { att: .35, det: -6 }); T(mtof(60 + c), s, bar * .98, 'triangle', .018, { att: .35, det: 6 }); });
        }
      }
      if (n === 7) { const s = t0 + 7 * bar; [0, 4, 7, 12].forEach(c => T(mtof(60 + c), s, 2.2, 'triangle', .05)); T(mtof(36), s, 2.2, 'sine', .2); N(s, .5, .3, 3000, .5); }
      const start = performance.now() + 250, total = n * bar * 1000; let last = -2;
      const tick = () => {
        const el = performance.now() - start, bi = Math.floor(el / (bar * 1000));
        this.bars.forEach((f, i) => { f.style.width = i < n ? Math.max(0, Math.min(1, (el - i * bar * 1000) / (bar * 1000))) * 100 + '%' : 0; });
        this.arm.style.transform = 'rotate(' + (4 + Math.max(0, Math.min(1, el / total)) * 16) + 'deg)';
        if (bi !== last && bi >= 0 && bi < n) { last = bi; this.nowEl.textContent = 'Now: ' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][bi] + ' · ' + INSTR[bi] + ' joins'; window.dispatchEvent(new CustomEvent('scootch-song-day', { detail: { i: bi } })); }
        if (el < total + (n === 7 ? 1800 : 300) && this.playing) this._raf = requestAnimationFrame(tick); else this.stop(true);
      };
      this._raf = requestAnimationFrame(tick);
    }
    stop(ended) {
      this.playing = false; cancelAnimationFrame(this._raf); this.ic.innerHTML = this.playI; this.ramp(0, 1100);
      if (this.out && !ended) { const a = ac(); this.out.gain.setTargetAtTime(.0001, a.currentTime, .08); }
      this.arm.style.transform = 'rotate(-18deg)'; this.bars.forEach(f => f.style.width = 0);
      this.nowEl.textContent = this.n === 7 ? '7 bars · full band' : this.n + ' of 7 bars · ' + INSTR.slice(0, this.n).join(', ').toLowerCase();
      window.dispatchEvent(new CustomEvent('scootch-song-day', { detail: { i: -1 } }));
    }
    disconnectedCallback() { if (this.playing) this.stop(); }
  }
  customElements.define('scootch-record', SRecord);

  // The week's song: one bar per finished day, playable
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  class SSong extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = 1;
      const n = Math.max(0, Math.min(7, parseInt(this.getAttribute('days') || '7'))), dark = this.getAttribute('on') === 'dark';
      const fg = dark ? '#F6F3EE' : INK, sub = dark ? 'rgba(246,243,238,.6)' : MUTED, track = dark ? 'rgba(246,243,238,.14)' : TRACK;
      Object.assign(this.style, { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' });
      this.notes = DAYS.map((d, i) => Array.from({ length: 8 }, (_, k) => { const h = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; const r = h - Math.floor(h); return (k % 4 === 0 || r > .3) ? Math.floor(r * 8) : -1; }));
      this.cells = [];
      DAYS.forEach((d, i) => {
        const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:12px;height:36px';
        const lab = document.createElement('span'); lab.textContent = d; lab.style.cssText = "width:34px;flex:none;font:600 13px " + SANS + ";color:" + (i < n ? fg : sub);
        const bar = document.createElement('div'); bar.style.cssText = 'flex:1;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;height:100%;align-items:end';
        const rc = [];
        this.notes[i].forEach(v => { const c = document.createElement('div'); const hgt = v < 0 ? 4 : 8 + v * 3.6; c.style.cssText = 'border-radius:3px;height:' + hgt + 'px;transition:transform .12s, background .12s;background:' + (i < n ? (v < 0 ? track : ACC) : 'transparent') + ';' + (i < n ? '' : 'box-shadow:inset 0 0 0 1.5px ' + track + ';height:4px'); bar.append(c); rc.push(c); });
        this.cells.push(rc); row.append(lab, bar); this.append(row);
      });
      this.n = n;
      if (this.getAttribute('controls') !== 'off') {
        const b = document.createElement('button'); b.style.cssText = "margin-top:14px;align-self:stretch;border:0;cursor:pointer;height:50px;border-radius:25px;font:600 17px " + SANS + ";background:" + (dark ? '#F6F3EE' : INK) + ";color:" + (dark ? INK : '#fff') + ";transition:transform .14s, opacity .14s";
        b.textContent = n === 7 ? 'Play your week' : 'Play so far'; pressable(b); b.onclick = () => this.playing ? this.stop(b) : this.play(b); this.append(b); this.btn = b;
      }
    }
    play(b) {
      if (!this.n) return; const a = ac(), spb = .16, t0 = a.currentTime + .05; this.playing = true; b.textContent = 'Stop';
      for (let i = 0; i < this.n; i++) this.notes[i].forEach((v, k) => { const s = t0 + (i * 8 + k) * spb; if (k === 0) tone(110 * Math.pow(2, [0, 5, 3, 7, 0, 5, 7][i] / 12), s, spb * 7, 'sine', .14); if (v >= 0) tone(392 * Math.pow(2, SCALE[v] / 12), s, spb * 1.6, 'triangle', .09); });
      const total = this.n * 8; let idx = -1; const start = performance.now();
      const step = () => { const j = Math.floor((performance.now() - start) / 1000 / spb); if (j !== idx) { if (idx >= 0 && idx < total) this.cells[Math.floor(idx / 8)][idx % 8].style.transform = ''; idx = j; if (j < total) this.cells[Math.floor(j / 8)][j % 8].style.transform = 'scaleY(1.35)'; } if (j < total && this.playing) this._raf = requestAnimationFrame(step); else this.stop(b); };
      this._raf = requestAnimationFrame(step);
    }
    stop(b) { this.playing = false; cancelAnimationFrame(this._raf); this.cells.flat().forEach(c => c.style.transform = ''); b.textContent = this.n === 7 ? 'Play your week' : 'Play so far'; }
  }
  customElements.define('scootch-song', SSong);
})();
