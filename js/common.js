/* Terms of Practice — shared runtime: data, cursor, retitling headline, helpers */
(function () {
  'use strict';

  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqNarrow = window.matchMedia('(max-width: 859.98px)');

  const TOP = (window.TOP = {
    get reduced() { return mqReduced.matches; },
    get fine() { return mqFine.matches; },
    get narrow() { return mqNarrow.matches; },
    mqNarrow,
  });

  /* ---------- helpers ---------- */
  TOP.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  TOP.lerp = (a, b, t) => a + (b - a) * t;
  TOP.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  TOP.$ = (s, r = document) => r.querySelector(s);
  TOP.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  TOP.store = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  let dataPromise;
  TOP.data = function () {
    if (!dataPromise) {
      dataPromise = fetch('data/manifesto.json', { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error('data ' + r.status);
        return r.json();
      });
    }
    return dataPromise;
  };

  /* Type text into an element one character at a time. Returns a cancel fn. */
  TOP.typeInto = function (el, text, ms = 28, delay = 0) {
    let i = 0, timer, cancelled = false;
    if (TOP.reduced) { el.textContent = text; return () => {}; }
    el.textContent = '';
    const step = () => {
      if (cancelled) return;
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) timer = setTimeout(step, ms);
    };
    timer = setTimeout(step, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  };

  /* Observe elements entering view and add .in with a stagger index. */
  TOP.rise = function (els, stagger) {
    if (!els.length) return;
    els.forEach((el, i) => { el.classList.add('rise'); el.style.setProperty('--i', i); if (stagger) el.style.setProperty('--stagger', stagger + 'ms'); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  };

  /* ---------- retitling headline ----------
     root contains .rt-word, .rt-caret; words are {word, note}.
     select 750ms, delete 55ms/char, retype 120ms/char. */
  class Retitler {
    constructor(root, variants, opts = {}) {
      this.root = root;
      this.word = root.querySelector('.rt-word');
      this.noteEl = opts.noteEl || null;
      this.variants = variants;
      this.index = 0;
      this.busy = false;
      this.token = 0;
      this.onSettle = opts.onSettle || (() => {});
      this.render(0);
    }
    text(i) { const v = this.variants[i]; return typeof v === 'string' ? v : v.word; }
    note(i) { const v = this.variants[i]; return typeof v === 'string' ? '' : v.note; }
    render(i) {
      this.index = i;
      this.word.textContent = this.text(i);
      if (this.noteEl) this.noteEl.textContent = this.note(i);
    }
    reset() {
      this.token += 1;
      this.busy = false;
      this.root.classList.remove('is-busy', 'is-moving');
      this.word.classList.remove('is-sel', 'is-typing');
      this.render(0);
      this.onSettle(0);
    }
    next() { return this.to((this.index + 1) % this.variants.length); }
    async to(i) {
      if (this.busy || i === this.index) return false;
      const tok = ++this.token;
      const alive = () => tok === this.token;
      if (TOP.reduced) { this.render(i); this.onSettle(i); return true; }
      this.busy = true;
      this.root.classList.add('is-busy');
      this.word.classList.add('is-sel');
      await TOP.sleep(750); if (!alive()) return false;
      this.root.classList.add('is-moving');
      let cur = this.text(this.index);
      while (cur.length) {
        cur = cur.slice(0, -1);
        this.word.textContent = cur;
        await TOP.sleep(55); if (!alive()) return false;
      }
      this.word.classList.remove('is-sel');
      this.word.classList.add('is-typing');
      const target = this.text(i);
      for (let k = 1; k <= target.length; k++) {
        this.word.textContent = target.slice(0, k);
        await TOP.sleep(120); if (!alive()) return false;
      }
      this.word.classList.remove('is-typing');
      this.render(i);
      this.root.classList.remove('is-moving');
      await TOP.sleep(260); if (!alive()) return false;
      this.root.classList.remove('is-busy');
      this.busy = false;
      this.onSettle(i);
      return true;
    }
  }
  TOP.Retitler = Retitler;

  /* ---------- caret cursor ---------- */
  const BADGES = { swap: '⇄', note: 'i', go: '→', drag: '↔', ext: '↗', top: '↑', read: '+' };

  function parseRGBA(str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum({ r, g, b }) {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function surfaceIsDark(el) {
    let n = el;
    while (n && n.nodeType === 1) {
      const c = parseRGBA(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.99) return lum(c) < 0.5;
      n = n.parentElement;
    }
    return false;
  }

  function initCursor() {
    if (!TOP.fine) return;
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor-caret"></span><span class="cursor-badge"></span>';
    document.body.appendChild(cur);
    const badge = cur.querySelector('.cursor-badge');
    let x = -100, y = -100, raf = 0, lastTarget = null, started = false;

    const paint = () => { raf = 0; cur.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    const assess = (t) => {
      const dark = surfaceIsDark(t);
      cur.style.setProperty('--cur', dark ? '#FFFFFF' : '#0B0B0C');
      cur.style.setProperty('--cur-inv', dark ? '#0B0B0C' : '#FFFFFF');
      const act = t.closest && t.closest('[data-cur]');
      if (act && !act.disabled) {
        cur.classList.add('is-act');
        badge.textContent = BADGES[act.dataset.cur] || '→';
      } else {
        cur.classList.remove('is-act');
      }
    };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!started) { started = true; document.documentElement.classList.add('cursor-on'); }
      x = e.clientX; y = e.clientY;
      cur.classList.remove('is-out');
      if (e.target !== lastTarget) { lastTarget = e.target; assess(e.target); }
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    // surfaces move under a still pointer while scrolling
    let st = 0;
    window.addEventListener('scroll', () => {
      if (!started) return;
      clearTimeout(st);
      st = setTimeout(() => { const t = document.elementFromPoint(x, y); if (t) { lastTarget = t; assess(t); } }, 60);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-out'));
    document.documentElement.addEventListener('mouseleave', () => cur.classList.add('is-out'));
    TOP.refreshCursor = () => { if (!started) return; const t = document.elementFromPoint(x, y); if (t) { lastTarget = t; assess(t); } };
  }
  TOP.refreshCursor = () => {};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCursor);
  else initCursor();
})();
