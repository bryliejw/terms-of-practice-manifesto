/* Terms of Practice — manifesto runtime */
(async function () {
  'use strict';
  const { $, $$, clamp, lerp } = TOP;
  let HEADER = 84;
  const readHeader = () => { HEADER = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 84; };
  const mqSmall = window.matchMedia('(max-width: 599.98px)');
  const behavior = () => (TOP.reduced ? 'auto' : 'smooth');

  let data;
  try { data = await TOP.data(); } catch (e) { console.error('Could not load data', e); return; }

  /* ================= sections, header bar, section menu ================= */
  const S = $$('.sec').map((el) => ({ el, n: el.dataset.n, title: el.dataset.title, top: 0, h: 0, p: 0 }));
  const segsEl = $('#segs');
  const pctEl = $('#pct');
  const totop = $('#totop');
  const mbtn = $('#secmenu-btn');
  const menu = $('#secmenu');
  const mN = $('#secmenu-n');
  const mT = $('#secmenu-t');
  let current = -1;
  let docMax = 1;

  const goTo = (el) => el.scrollIntoView({ behavior: behavior(), block: 'start' });

  S.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg';
    b.dataset.cur = 'go';
    b.setAttribute('aria-label', `${s.n} ${s.title}`);
    const lab = `<span>${s.n}</span><span class="t">${s.title}</span>`;
    b.innerHTML = `<span class="seg-fill"></span><span class="seg-lab" aria-hidden="true">${lab}</span><span class="seg-lab-ink" aria-hidden="true">${lab}</span>`;
    b.addEventListener('click', () => goTo(s.el));
    s.seg = b;
    segsEl.appendChild(b);

    const li = document.createElement('li');
    li.setAttribute('role', 'none');
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'secmenu-item';
    item.setAttribute('role', 'menuitem');
    item.dataset.cur = 'go';
    item.innerHTML = `<span class="n">${s.n}</span><span class="t">${s.title}</span><span class="st"></span>`;
    item.addEventListener('click', () => { closeMenu(false); goTo(s.el); });
    s.item = item;
    li.appendChild(item);
    menu.appendChild(li);
  });

  function menuStatus() {
    S.forEach((s, i) => {
      const st = s.p >= 0.999 ? 'Read' : i === current ? 'Reading' : '';
      s.item.querySelector('.st').textContent = st;
      s.item.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
  }
  function openMenu() {
    menuStatus();
    menu.hidden = false;
    mbtn.setAttribute('aria-expanded', 'true');
    (S[Math.max(0, current)].item).focus();
  }
  function closeMenu(refocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    mbtn.setAttribute('aria-expanded', 'false');
    if (refocus) mbtn.focus();
  }
  mbtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  menu.addEventListener('keydown', (e) => {
    const items = S.map((s) => s.item);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    else if (e.key === 'Tab') { closeMenu(false); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !mbtn.contains(e.target)) closeMenu(false);
  });

  function measure() {
    readHeader();
    S.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + window.scrollY;
      s.h = r.height;
      s.seg.style.setProperty('--g', Math.max(1, Math.round(s.h)));
    });
    docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    measureScene();
  }

  function setCurrent(i) {
    if (i === current) return;
    current = i;
    S.forEach((s, k) => {
      if (k === i) s.seg.setAttribute('aria-current', 'true');
      else s.seg.removeAttribute('aria-current');
    });
    mN.textContent = S[i].n;
    mN.classList.toggle('is-signal', S[i].n === '04');
    mT.textContent = S[i].title;
    mbtn.setAttribute('aria-label', `Section ${S[i].n} ${S[i].title}. Open section menu`);
    totop.hidden = i !== S.length - 1;
    if (!menu.hidden) menuStatus();
  }

  /* ================= position bar ================= */
  const SENT_A = 'We won’t make the big changes straight away,';
  const SENT_B = 'but we don’t have to conform and suppress all of our values to secure our authority in the field.';
  const WORDS_B = SENT_B.split(' ');
  const pbar = $('#pbar');
  const pbS = $('#pbar-s');
  const pbN = $('#pb-n');
  $('#pb-t').textContent = String(WORDS_B.length);
  pbS.innerHTML = `<span class="pb-first">${SENT_A}</span> ` + WORDS_B.map((w, i) => `<span class="pb-w" data-i="${i}">${w}</span>`).join(' ');
  const pbFirst = $('.pb-first', pbS);
  const pbWords = $$('.pb-w', pbS);
  let revealed = -1;

  function revealBar(line) {
    const a = S[0].top, b = S[4].top;
    const r = TOP.reduced ? 1 : clamp((line - a) / Math.max(1, b - a));
    const n = Math.min(WORDS_B.length, Math.floor(r * WORDS_B.length + 1e-6));
    if (n === revealed) return;
    revealed = n;
    pbWords.forEach((w, i) => w.classList.toggle('is-out', i < n));
    pbN.textContent = String(n);
  }

  /* ================= statement scene (05) ================= */
  const stEl = $('#st');
  const statement = $('#statement');
  stEl.innerHTML =
    `<span class="st-first"><span class="st-vis"></span><span class="st-caret"></span><span class="st-ghost">${SENT_A}</span></span> ` +
    WORDS_B.map((w, i) => `<span class="st-w" style="--i:${i}">${w}</span>`).join(' ');
  const stVis = $('.st-vis', stEl);
  const stGhost = $('.st-ghost', stEl);
  const stCaret = $('.st-caret', stEl);
  const stWords = $$('.st-w', stEl);
  const flyLayer = $('#flylayer');
  const flies = WORDS_B.map((w) => {
    const f = document.createElement('span');
    f.className = 'fly';
    f.hidden = true;
    f.textContent = w;
    flyLayer.appendChild(f);
    return f;
  });
  let stFs = 84, barFs = 23, lastK = -1, sceneDist = 1;

  function measureScene() {
    stFs = parseFloat(getComputedStyle(statement).fontSize) || 84;
    barFs = parseFloat(getComputedStyle(pbS).fontSize) || 23;
    flies.forEach((f) => { f.style.fontSize = stFs + 'px'; });
    const stage = window.innerHeight - HEADER;
    sceneDist = Math.max(1, S[4].h - stage);
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function renderScene() {
    const raw = (window.scrollY - (S[4].top - HEADER)) / sceneDist;
    const p = TOP.reduced ? 1 : clamp(raw);
    const n1 = SENT_A.length;

    // 0–30%: first clause leaves the bar character by character and is typed into the statement
    const k = Math.round(clamp(p / 0.3) * n1);
    if (k !== lastK) {
      lastK = k;
      stVis.textContent = SENT_A.slice(0, k);
      stGhost.textContent = SENT_A.slice(k);
      pbFirst.textContent = SENT_A.slice(0, n1 - k);
    }
    stCaret.classList.toggle('is-on', p > 0 && p < 0.3);

    // 30–100%: the second clause flies from the bar into place
    const q = clamp((p - 0.3) / 0.7);
    const N = WORDS_B.length;
    const vh = window.innerHeight;
    const barTop = pbar.getBoundingClientRect().top;
    const reads = [];
    for (let i = 0; i < N; i++) {
      const t = TOP.reduced ? 1 : clamp((q - (i / N) * 0.72) / 0.28);
      reads.push({ t, sr: t > 0 && t < 1 ? pbWords[i].getBoundingClientRect() : null, dr: t > 0 && t < 1 ? stWords[i].getBoundingClientRect() : null });
    }
    let landed = 0;
    reads.forEach(({ t, sr, dr }, i) => {
      const src = pbWords[i], dst = stWords[i], f = flies[i];
      if (t <= 0) { src.classList.remove('is-flying'); dst.classList.remove('is-landed'); f.hidden = true; return; }
      if (t >= 1) { src.classList.add('is-flying'); dst.classList.add('is-landed'); f.hidden = true; landed++; return; }
      src.classList.add('is-flying');
      dst.classList.remove('is-landed');
      f.hidden = false;
      const e = ease(t);
      const cx = lerp(sr.left + sr.width / 2, dr.left + dr.width / 2, e);
      const cy = lerp(sr.top + sr.height / 2, dr.top + dr.height / 2, e) - Math.sin(Math.PI * t) * 0.12 * vh;
      const sc = lerp(barFs / stFs, 1, e);
      const dirn = i % 2 ? 1 : -1;
      const rot = Math.sin(Math.PI * t) * 9 * dirn * (0.55 + 0.45 * (((i * 7) % 5) / 4));
      f.style.transform = `translate(${(cx - dr.width / 2).toFixed(1)}px, ${(cy - dr.height / 2).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      f.classList.toggle('is-ink', cy > barTop);
    });
    const done = landed === N;
    statement.classList.toggle('is-lit', done);
    const gone = TOP.reduced ? raw >= -0.02 : done || raw > 1;
    pbar.classList.toggle('is-gone', gone);
  }

  /* ================= scroll loop ================= */
  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    const f = clamp(y / docMax);
    const line = y + vh * f;
    let cur = 0;
    S.forEach((s, i) => {
      s.p = clamp((line - s.top) / Math.max(1, s.h));
      if (line >= s.top) cur = i;
      s.seg.style.setProperty('--p', s.p.toFixed(4));
      s.seg.classList.toggle('is-filling', s.p > 0 && s.p < 1);
    });
    pctEl.textContent = String(Math.round(f * 100)).padStart(3, '0') + '%';
    setCurrent(cur);
    revealBar(line);
    renderScene();
    tuckBar(y);
  }

  /* small screens: tuck the position bar while reading down, bring it back on the way up
     and whenever the 05 scene is near, since the scene needs its words */
  let lastY = window.scrollY, tucked = false;
  function tuckBar(y) {
    const dy = y - lastY;
    lastY = y;
    const sceneNear = (y - (S[4].top - HEADER)) / sceneDist > -0.6;
    if (!mqSmall.matches || sceneNear || y < 40) tucked = false;
    else if (dy > 6) tucked = true;
    else if (dy < -6) tucked = false;
    pbar.classList.toggle('is-tucked', tucked);
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); placeNote(); onScroll(); });
  const ro = new ResizeObserver(() => { measure(); onScroll(); });
  ro.observe($('#main'));

  totop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: behavior() }); $('#main').focus?.(); });

  /* ================= retitling headlines ================= */
  const rtRoot = $('#rt');
  const note = $('.rt-note', rtRoot);
  function placeNote() {
    if (TOP.narrow) { note.style.left = ''; note.style.top = ''; return; }
    const rr = rtRoot.getBoundingClientRect();
    const wr = $('.rt-word', rtRoot).getBoundingClientRect();
    const nw = note.offsetWidth;
    let left = wr.right - rr.left + 40;
    let top = wr.top - rr.top + wr.height * 0.22;
    if (left + nw > rr.width) {
      const range = document.createRange();
      range.selectNodeContents($('.rt-line', rtRoot));
      const r1 = range.getBoundingClientRect();
      left = r1.right - rr.left + 40;
      top = r1.top - rr.top + r1.height * 0.22;
      if (left + nw > rr.width) left = Math.max(0, rr.width - nw);
    }
    note.style.left = Math.round(left) + 'px';
    note.style.top = Math.round(top) + 'px';
  }
  const rt1 = new TOP.Retitler(rtRoot, data.titles, { noteEl: $('.rt-note-text', rtRoot), onSettle: placeNote });
  const rt2 = new TOP.Retitler($('#rt2'), data.consentTitles);

  function cycler(rt, trigger) {
    let timer = 0, inView = false;
    const schedule = () => {
      clearTimeout(timer);
      if (!inView) return;
      timer = setTimeout(async () => { await rt.next(); schedule(); }, rt.index === 0 ? 14000 : 6500);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!inView) { inView = true; schedule(); } }
      else { inView = false; clearTimeout(timer); rt.reset(); }
    }).observe(trigger);
    trigger.addEventListener('click', async () => {
      if (rt.busy) return;
      clearTimeout(timer);
      await rt.next();
      schedule();
    });
  }
  cycler(rt1, $('#s01-h'));
  cycler(rt2, $('#s03-h'));

  /* inline triggers are spans with role="button" so they wrap like text; give them button keys */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement) || t.tagName === 'BUTTON' || t.getAttribute('role') !== 'button') return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
  });

  /* ================= term swaps ================= */
  const swaps = {};
  $$('.swap').forEach((b) => {
    const key = b.dataset.swap;
    const d = data.swaps[key];
    if (!d) return;
    b.type = 'button';
    b.dataset.cur = 'swap';
    b.setAttribute('aria-pressed', 'false');
    const r = document.createElement('span');
    r.className = 'swap-r';
    r.hidden = true;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'swap-chip';
    chip.hidden = true;
    chip.dataset.cur = 'go';
    chip.textContent = d.term === 'case' ? 'The case →' : `Term ${d.term} →`;
    chip.addEventListener('click', () => { if (d.term === 'case') goTo(S[2].el); else openTerm(d.term, true); });
    b.after(r, chip);
    b.addEventListener('click', () => setSwap(key, b.getAttribute('aria-pressed') !== 'true'));
    (swaps[key] = swaps[key] || []).push({ b, r, chip, cancel: () => {}, timer: 0 });
  });
  function setSwap(key, on) {
    const d = data.swaps[key];
    (swaps[key] || []).forEach((m) => {
      m.b.setAttribute('aria-pressed', String(on));
      clearTimeout(m.timer);
      m.cancel();
      if (on) {
        m.r.hidden = false;
        const typeMs = 18, delay = 320;
        m.cancel = TOP.typeInto(m.r, d.r, typeMs, delay);
        m.timer = setTimeout(() => { m.chip.hidden = false; }, TOP.reduced ? 0 : delay + d.r.length * typeMs + 750);
      } else {
        m.r.hidden = true;
        m.r.textContent = '';
        m.chip.hidden = true;
      }
    });
  }
  function resetSwapsIn(sec) {
    const keys = new Set($$('.swap[aria-pressed="true"]', sec).map((b) => b.dataset.swap));
    keys.forEach((k) => {
      const stillVisible = (swaps[k] || []).some((m) => visible.has(m.b.closest('.sec')));
      if (!stillVisible) setSwap(k, false);
    });
  }

  /* ================= notes and definitions ================= */
  const pop = $('#notepop');
  const popL = $('#notepop-l'), popT = $('#notepop-t'), popS = $('#notepop-s');
  let popTrig = null, pinned = false, hideT = 0;
  pop.tabIndex = -1;

  $$('.def, .fn').forEach((t) => {
    const n = data.notes[t.dataset.note];
    if (!n) return;
    t.type = 'button';
    t.dataset.cur = 'note';
    t.setAttribute('aria-expanded', 'false');
    t.setAttribute('aria-controls', 'notepop');
    if (t.classList.contains('fn')) t.setAttribute('aria-label', `Note ${t.textContent.trim()}`);
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !pinned) showNote(t, false); });
    t.addEventListener('pointerleave', () => { if (!pinned) hideSoon(); });
    t.addEventListener('focus', () => { if (!pinned) showNote(t, false); });
    t.addEventListener('blur', () => { if (!pinned) hideSoon(); });
    t.addEventListener('click', (e) => {
      if (pinned && popTrig === t) { hideNote(); return; }
      showNote(t, true);
      if (e.detail === 0) pop.focus({ preventScroll: true });
    });
  });
  pop.addEventListener('pointerenter', () => clearTimeout(hideT));
  pop.addEventListener('pointerleave', () => { if (!pinned) hideSoon(); });
  pop.addEventListener('focusin', () => clearTimeout(hideT));

  function showNote(t, pin) {
    clearTimeout(hideT);
    const n = data.notes[t.dataset.note];
    if (popTrig && popTrig !== t) popTrig.setAttribute('aria-expanded', 'false');
    popTrig = t;
    pinned = pin;
    t.setAttribute('aria-expanded', 'true');
    popL.textContent = n.label;
    popT.textContent = n.text;
    popS.textContent = '';
    if (n.source) {
      if (n.url) {
        const a = document.createElement('a');
        a.href = n.url; a.target = '_blank'; a.rel = 'noopener'; a.dataset.cur = 'ext';
        a.textContent = n.source + ' ↗';
        popS.append('Source: ', a);
      } else popS.textContent = 'Source: ' + n.source;
    }
    pop.classList.toggle('is-pinned', pin);
    pop.hidden = false;
    const r = t.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = clamp(r.left, 16, window.innerWidth - pw - 16);
    let top = r.bottom + 8;
    const floor = window.innerHeight - (pbar.classList.contains('is-gone') ? 16 : pbar.offsetHeight + 12);
    if (top + ph > floor && r.top - ph - 8 > HEADER + 8) top = r.top - ph - 8;
    pop.style.left = Math.round(left + window.scrollX) + 'px';
    pop.style.top = Math.round(top + window.scrollY) + 'px';
    TOP.refreshCursor();
  }
  function hideNote(refocus) {
    clearTimeout(hideT);
    if (pop.hidden) return;
    const t = popTrig;
    pop.hidden = true;
    pinned = false;
    if (t) t.setAttribute('aria-expanded', 'false');
    if (refocus && t) t.focus({ preventScroll: true });
    popTrig = null;
  }
  const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(() => hideNote(false), 220); };
  document.addEventListener('pointerdown', (e) => {
    if (pop.hidden) return;
    if (pop.contains(e.target) || (popTrig && popTrig.contains(e.target))) return;
    hideNote(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); hideNote(pinned); }
  });

  /* ================= process track ================= */
  const track = $('#ptrack');
  const cardBtns = $$('.pc-b', track);
  const typeCancels = new Map();
  function setCard(b, on) {
    b.setAttribute('aria-pressed', String(on));
    const hon = $('.pc-hon', b);
    (typeCancels.get(b) || (() => {}))();
    if (on) {
      hon.innerHTML = '<span></span>';
      typeCancels.set(b, TOP.typeInto(hon.firstChild, hon.dataset.text, 20, 320));
    } else hon.textContent = '';
  }
  let drag = null, dragMoved = false;
  cardBtns.forEach((b) => b.addEventListener('click', (e) => {
    if (dragMoved) { e.preventDefault(); return; }
    setCard(b, b.getAttribute('aria-pressed') !== 'true');
  }));
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, sl: track.scrollLeft };
    dragMoved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; track.classList.add('is-dragging'); }
    if (dragMoved) track.scrollLeft = drag.sl - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    if (dragMoved) {
      track.classList.remove('is-dragging');
      setTimeout(() => { dragMoved = false; }, 0);
    }
  });
  track.addEventListener('dragstart', (e) => e.preventDefault());
  const arrows = $$('.ptrack-arrow');
  arrows.forEach((a) => a.addEventListener('click', () => {
    track.scrollBy({ left: Number(a.dataset.dir) * 356, behavior: behavior() });
  }));
  const updateArrows = () => {
    arrows[0].disabled = track.scrollLeft < 4;
    arrows[1].disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
  };
  track.addEventListener('scroll', updateArrows, { passive: true });
  updateArrows();
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = cardBtns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, cardBtns.length - 1);
    cardBtns[j].focus();
  });
  // reveal the whole row together: cards off to the side never intersect the viewport on their own
  const pcs = $$('.pc', track);
  pcs.forEach((el, i) => { el.classList.add('rise'); el.style.setProperty('--i', i); el.style.setProperty('--stagger', '80ms'); });
  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { pcs.forEach((el) => el.classList.add('in')); io.disconnect(); }
  }, { threshold: 0.12 }).observe(track);

  /* ================= consent case: say it honestly ================= */
  const honest = $('#honest');
  const tog = $('#honest-toggle');
  const hons = $$('.hon', honest).map((h) => {
    const r = document.createElement('span');
    r.className = 'hon-r';
    h.after(r);
    return { h, r, cancel: () => {} };
  });
  function setHonest(on) {
    tog.setAttribute('aria-pressed', String(on));
    honest.classList.toggle('is-honest', on);
    $('#honest-state').textContent = on ? 'Said honestly' : 'Industry wording';
    hons.forEach((o, i) => {
      o.cancel();
      if (on) {
        o.r.innerHTML = '<span></span>';
        o.cancel = TOP.typeInto(o.r.firstChild, o.h.dataset.honest, 20, 360 + i * 140);
      } else o.r.textContent = '';
    });
  }
  tog.addEventListener('click', () => setHonest(tog.getAttribute('aria-pressed') !== 'true'));
  TOP.rise($$('.cond-card'), 110);

  /* ================= six terms: tiles and clauses ================= */
  const tiles = $$('.tile');
  let openN = null;
  function openTerm(n, scroll) {
    tiles.forEach((t) => {
      const tn = t.id.slice(5);
      const c = $('#clause-' + tn);
      const on = tn === n;
      t.setAttribute('aria-expanded', String(on));
      if (on) {
        if (c.hidden) {
          c.hidden = false;
          c.classList.remove('is-in');
          void c.offsetWidth;
          c.classList.add('is-in');
        }
      } else {
        c.hidden = true;
        c.classList.remove('is-in');
      }
    });
    openN = n;
    measure();
    if (n && scroll) requestAnimationFrame(() => $('#term-' + n).scrollIntoView({ behavior: behavior(), block: 'start' }));
  }
  tiles.forEach((t) => t.addEventListener('click', () => {
    const n = t.id.slice(5);
    openTerm(openN === n ? null : n, false);
  }));
  $$('.cl-x').forEach((x) => x.addEventListener('click', () => {
    const n = x.closest('.clause').id.slice(7);
    openTerm(null);
    $('#term-' + n).focus({ preventScroll: true });
  }));
  $$('.term-chip').forEach((c) => c.addEventListener('click', () => openTerm(c.dataset.term, true)));
  document.addEventListener('pointerdown', (e) => {
    if (!openN) return;
    const tile = $('#term-' + openN), clause = $('#clause-' + openN);
    const t = e.target;
    if (tile.contains(t) || clause.contains(t) || t.closest('.swap-chip, .term-chip, .notepop')) return;
    if (t.closest('#s04')) openTerm(null);
  });

  /* ================= six moves ================= */
  const cards = $$('.mc');
  const roles = $$('.role');
  const turnAll = $('#turn-all');
  const RISK = { L: ['Low', 1], M: ['Medium', 2], H: ['High', 3] };
  let role = 1;
  function renderRisk() {
    cards.forEach((c) => {
      const [name, k] = RISK[c.dataset.risk.split(' ')[role]];
      $$('.mc-cells i', c).forEach((i, j) => i.classList.toggle('on', j < k));
      $('.mc-rl', c).textContent = `Risk · ${name}`;
    });
  }
  function setRole(i) {
    role = i;
    roles.forEach((r, k) => r.setAttribute('aria-pressed', String(k === i)));
    renderRisk();
  }
  function flip(c, on) {
    c.setAttribute('aria-pressed', String(on));
    $('.mc-f', c).setAttribute('aria-hidden', String(on));
    $('.mc-b', c).setAttribute('aria-hidden', String(!on));
  }
  function syncTurnAll() {
    const all = cards.every((c) => c.getAttribute('aria-pressed') === 'true');
    turnAll.textContent = all ? 'Turn all back' : 'Turn all over';
    turnAll.setAttribute('aria-pressed', String(all));
  }
  cards.forEach((c) => {
    $('.mc-f', c).setAttribute('aria-hidden', 'false');
    c.addEventListener('click', () => { flip(c, c.getAttribute('aria-pressed') !== 'true'); syncTurnAll(); });
  });
  roles.forEach((r, i) => r.addEventListener('click', () => setRole(i)));
  turnAll.addEventListener('click', () => {
    const all = cards.every((c) => c.getAttribute('aria-pressed') === 'true');
    cards.forEach((c) => flip(c, !all));
    syncTurnAll();
  });
  renderRisk();
  TOP.rise(cards, 90);

  /* ================= resets when a section leaves view ================= */
  const visible = new Set();
  const resetters = {
    s01: (sec) => resetSwapsIn(sec),
    s02: (sec) => { resetSwapsIn(sec); cardBtns.forEach((b) => setCard(b, false)); track.scrollLeft = 0; },
    s03: (sec) => { resetSwapsIn(sec); setHonest(false); },
    s04: (sec) => { openTerm(null); resetSwapsIn(sec); },
    s06: () => { setRole(1); cards.forEach((c) => flip(c, false)); syncTurnAll(); },
  };
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const sec = e.target;
      if (e.isIntersecting) visible.add(sec);
      else {
        const was = visible.delete(sec);
        if (was && resetters[sec.id]) resetters[sec.id](sec);
        if (popTrig && sec.contains(popTrig)) hideNote(false);
      }
    });
  });
  S.forEach((s) => sectionIO.observe(s.el));

  /* ================= start ================= */
  measure();
  update();
  placeNote();
  const fromHash = () => {
    const m = location.hash.match(/^#term-(0[1-6])$/);
    if (!m) return;
    openTerm(m[1], false);
    requestAnimationFrame(() => $('#term-' + m[1]).scrollIntoView({ block: 'start' }));
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);
  try {
    await document.fonts.ready;
    measure(); placeNote(); update();
    if (/^#term-/.test(location.hash)) fromHash();
  } catch (e) { /* fonts API unavailable */ }
})();
