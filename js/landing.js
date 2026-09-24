/* Terms of Practice — landing: word field, popup, counter, retitling headline */
(async function () {
  'use strict';
  const { $, $$, clamp } = TOP;

  let data;
  try { data = await TOP.data(); } catch (e) { console.error('Could not load data', e); return; }
  try { await document.fonts.ready; } catch (e) { /* fonts API unavailable */ }

  const words = data.words;
  const byId = Object.fromEntries(words.map((w) => [w.id, w]));
  const terms = Object.fromEntries(data.terms.map((t) => [t.n, t]));

  /* ---------- read state ---------- */
  const read = new Set(TOP.store.get('top-read', []).filter((id) => byId[id]));
  const cellsEl = $('#cells');
  const countEl = $('#count');
  $('#total').textContent = String(words.length);
  words.forEach((w) => {
    const li = document.createElement('li');
    li.dataset.id = w.id;
    if (read.has(w.id)) li.classList.add('is-read');
    cellsEl.appendChild(li);
  });
  const renderCount = () => { countEl.textContent = String(read.size).padStart(2, '0'); };
  renderCount();

  function markRead(id) {
    if (read.has(id)) return;
    read.add(id);
    TOP.store.set('top-read', Array.from(read));
    $$(`.w[data-id="${id}"]`).forEach((b) => b.classList.add('is-read'));
    const cell = cellsEl.querySelector(`[data-id="${id}"]`);
    if (cell) cell.classList.add('is-read');
    const w = byId[id];
    const f = $(`.w[data-id="${id}"][data-focus]`);
    if (f) f.setAttribute('aria-label', label(w, true));
    renderCount();
  }
  const label = (w, isRead) => `${w.word}. Term ${w.term}, weight ${w.weight} of 5${isRead ? ', read' : ''}`;

  /* ---------- word field ---------- */
  // m = mono (weight 3), b = Archivo 38px (weight 4), c = Archivo 60px (weight 5)
  const ORDER = 'm b m c m b m m b c m b m m c b m m'.split(' ');
  const WEIGHT = { m: 3, b: 4, c: 5 };
  const field = $('#field');
  const rowsEl = $('#rows');
  const sheet = $('#sheet');
  let rows = [];
  let popOpen = false;

  function makeWord(w, focusable) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'w' + (w.renamed ? ' is-renamed' : '') + (read.has(w.id) ? ' is-read' : '');
    b.dataset.id = w.id;
    b.dataset.cur = 'read';
    b.innerHTML = `<span class="w-t">${w.word}</span><span class="w-n" aria-hidden="true">${w.term}</span>`;
    if (focusable) {
      b.dataset.focus = '';
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-label', label(w, read.has(w.id)));
    } else {
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
    }
    return b;
  }

  function build() {
    const keepX = rows.map((o) => o.x);
    rowsEl.textContent = '';
    rows = [];
    const seen = new Set();
    const typeCount = { m: 0, b: 0, c: 0 };
    const fh = field.clientHeight;
    const vw = field.clientWidth;
    let total = 0;
    for (let r = 0; r < 64 && (r < ORDER.length || total < fh); r++) {
      const t = ORDER[r % ORDER.length];
      const k = typeCount[t]++;
      const list = words.filter((w) => w.weight === WEIGHT[t]);
      const rot = (k * 3) % list.length;
      const set = list.slice(rot).concat(list.slice(0, rot));

      const row = document.createElement('div');
      row.className = 'row row-' + t;
      const track = document.createElement('div');
      track.className = 'track';
      row.appendChild(track);
      rowsEl.appendChild(row);

      const addSet = (first) => set.forEach((w) => {
        const f = first && !seen.has(w.id);
        if (f) seen.add(w.id);
        track.appendChild(makeWord(w, f));
      });
      addSet(true);
      const setW = track.getBoundingClientRect().width || 1;
      const reps = Math.max(1, Math.ceil((vw + 60) / setW));
      for (let i = 1; i < reps; i++) addSet(false);
      for (let i = 0; i < reps; i++) addSet(false);
      const half = track.getBoundingClientRect().width / 2;
      const dur = 70 + ((r * 37 + 11) % 11) * 10; // 70–170s per loop
      const o = {
        row, track, half,
        speed: half / dur,
        dir: r % 2 ? -1 : 1,
        x: keepX[r] != null ? keepX[r] % half : ((r * 211) % 97) / 97 * half,
        hover: false, focus: false,
      };
      rows.push(o);
      paintRow(o);
      bindRow(o);
      total += row.offsetHeight;
    }
  }

  const paintRow = (o) => { o.track.style.transform = `translate3d(${-o.x.toFixed(2)}px,0,0)`; };

  function bindRow(o) {
    o.row.addEventListener('pointerover', (e) => { if (e.target.closest('.w')) o.hover = true; });
    o.row.addEventListener('pointerleave', () => { o.hover = false; });
    o.row.addEventListener('focusin', (e) => {
      o.focus = true;
      const b = e.target.closest('.w');
      if (b) bringIntoView(o, b);
    });
    o.row.addEventListener('focusout', () => { o.focus = false; });
  }

  /* move the row so a word sits in clear view (right of the sheet when they share a band) */
  function bringIntoView(o, b) {
    const fr = field.getBoundingClientRect();
    const rr = o.row.getBoundingClientRect();
    let targetX = 24;
    if (!TOP.narrow) {
      const sr = sheet.getBoundingClientRect();
      if (rr.bottom > sr.top && rr.top < sr.bottom) targetX = sr.right - fr.left + 24;
    }
    if (targetX + b.offsetWidth > fr.width - 16) targetX = Math.max(16, fr.width - b.offsetWidth - 16);
    let x = (b.offsetLeft - targetX) % o.half;
    if (x < 0) x += o.half;
    o.x = x;
    paintRow(o);
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!TOP.reduced && !popOpen && !document.hidden) {
      for (const o of rows) {
        if (o.hover || o.focus) continue;
        o.x += o.dir * o.speed * dt;
        if (o.x >= o.half) o.x -= o.half;
        else if (o.x < 0) o.x += o.half;
        paintRow(o);
      }
    }
    requestAnimationFrame(tick);
  }

  build();
  requestAnimationFrame(tick);

  let lastW = field.clientWidth, lastH = field.clientHeight, rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const w = field.clientWidth, h = field.clientHeight;
      if (Math.abs(w - lastW) > 40 || h > lastH + 20) { lastW = w; lastH = h; closePop(false); build(); }
    }, 200);
  });

  /* ---------- popup ---------- */
  const pop = $('#wpop');
  const el = {
    link: $('#wpop-link'), x: $('#wpop-x'), kind: $('#wpop-kind'), term: $('#wpop-term'),
    rep: $('#wpop-rep'), why: $('#wpop-why'), cells: $$('#wpop-cells i'), wn: $('#wpop-wn'),
    honest: $('#wpop-honest'), src: $('#wpop-src'),
  };
  let opener = null, cancelType = () => {};
  pop.tabIndex = -1;

  function openPop(id, anchor, viaKey) {
    const w = byId[id];
    if (!w) return;
    const t = terms[w.term];
    if (opener) opener.classList.remove('is-open');
    opener = anchor;
    anchor.classList.add('is-open');
    markRead(id);

    el.link.textContent = `Term ${w.term} · ${t.short} →`;
    el.link.href = `manifesto.html#term-${w.term}`;
    el.kind.textContent = w.renamed ? 'Already renamed' : 'Industry term';
    pop.classList.toggle('is-renamed', w.renamed);
    el.term.textContent = w.word;
    el.why.textContent = w.why;
    el.cells.forEach((c, i) => c.classList.toggle('on', i < w.weight));
    el.wn.textContent = `${w.weight} / 5`;
    el.honest.textContent = w.honest;
    el.src.textContent = w.source + ' ↗';
    el.src.href = w.url;
    cancelType();
    cancelType = TOP.typeInto(el.rep, w.replacement, 26, 450);

    pop.hidden = false;
    pop.classList.remove('is-in', 'is-shown');
    void pop.offsetWidth;
    pop.classList.add(TOP.reduced ? 'is-shown' : 'is-in');
    popOpen = true;
    place(anchor);
    if (viaKey || TOP.narrow) pop.focus({ preventScroll: true });
    TOP.refreshCursor();
  }

  function place(anchor) {
    if (TOP.narrow) { pop.style.left = ''; pop.style.top = ''; return; }
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const top0 = $('.lnav').getBoundingClientRect().bottom + 8;
    const bottom0 = $('.counter').getBoundingClientRect().top - 8;
    let left = r.right + 12;
    let top = r.top;
    let side = true;
    if (left + pw > vw - 16) left = r.left - pw - 12;
    if (left < 16) { side = false; left = clamp(r.left, 16, vw - pw - 16); }
    if (side) {
      if (top + ph > bottom0) top = r.bottom - ph;
      if (top + ph > bottom0) top = bottom0 - ph;
    } else {
      top = r.bottom + 8;
      if (top + ph > bottom0) top = r.top - ph - 8;
    }
    top = Math.max(top0, Math.min(top, bottom0 - ph));
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }

  function closePop(restore = true) {
    if (!popOpen) return;
    popOpen = false;
    cancelType();
    pop.hidden = true;
    pop.classList.remove('is-in', 'is-shown');
    if (opener) {
      opener.classList.remove('is-open');
      if (restore) {
        const f = opener.hasAttribute('data-focus') ? opener : $(`.w[data-id="${opener.dataset.id}"][data-focus]`);
        if (f && document.activeElement && pop.contains(document.activeElement)) f.focus({ preventScroll: true });
      }
    }
    opener = null;
  }

  // words move: remember the word under pointerdown in case pointerup lands on a neighbour
  let downWord = null;
  rowsEl.addEventListener('pointerdown', (e) => { downWord = e.target.closest('.w'); });
  rowsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.w') || downWord;
    downWord = null;
    if (!b) return;
    if (opener === b && popOpen) { closePop(); return; }
    openPop(b.dataset.id, b, e.detail === 0);
  });
  el.x.addEventListener('click', () => closePop());
  document.addEventListener('pointerdown', (e) => {
    if (!popOpen) return;
    if (pop.contains(e.target) || e.target.closest('.w')) return;
    closePop(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popOpen) { e.preventDefault(); closePop(); }
  });

  /* arriving from the manifesto with a word in the hash */
  function openFromHash() {
    const m = location.hash.match(/^#w-([a-z-]+)$/);
    if (!m || !byId[m[1]]) return;
    const b = $(`.w[data-id="${m[1]}"][data-focus]`);
    if (!b) return;
    const o = rows.find((r) => r.row.contains(b));
    if (o) bringIntoView(o, b);
    requestAnimationFrame(() => openPop(m[1], b, false));
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* ---------- retitling headline (landing) ----------
     Desktop: holds on Practice; changes only while hovered, selected, or once after 20s idle.
     Mobile: static. */
  const rtRoot = $('#rt');
  const rt = new TOP.Retitler(rtRoot, data.titles, { noteEl: $('.rt-note-text', rtRoot) });
  const title = $('.sheet-title');
  let hovered = false, hoverT = 0, backT = 0, idleT = 0;
  const hold = (i) => (i === 0 ? 8000 : 4500);
  const active = () => !TOP.narrow && !TOP.reduced;

  function armIdle() {
    clearTimeout(idleT);
    if (!active()) return;
    idleT = setTimeout(async () => {
      if (hovered || rt.busy) { armIdle(); return; }
      await rt.next();
      armIdle();
      clearTimeout(backT);
      backT = setTimeout(returnHome, 6000);
    }, 20000);
  }
  async function returnHome() {
    if (hovered) return;
    if (rt.busy) { backT = setTimeout(returnHome, 400); return; }
    if (rt.index !== 0) { await rt.to(0); armIdle(); }
  }
  async function cycle() {
    if (!hovered || !active()) return;
    await rt.next();
    armIdle();
    if (hovered) hoverT = setTimeout(cycle, hold(rt.index));
    else { clearTimeout(backT); backT = setTimeout(returnHome, 3000); }
  }
  title.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !active()) return;
    hovered = true;
    clearTimeout(hoverT); clearTimeout(backT);
    if (!rt.busy) hoverT = setTimeout(cycle, rt.index === 0 ? 2500 : hold(rt.index));
  });
  title.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    hovered = false;
    clearTimeout(hoverT);
    clearTimeout(backT);
    if (rt.index !== 0 || rt.busy) backT = setTimeout(returnHome, 3000);
  });
  title.addEventListener('click', async () => {
    if (!active() || rt.busy) return;
    clearTimeout(hoverT); clearTimeout(backT);
    await rt.next();
    armIdle();
    if (hovered) hoverT = setTimeout(cycle, hold(rt.index));
    else backT = setTimeout(returnHome, 6000);
  });
  TOP.mqNarrow.addEventListener('change', () => { if (TOP.narrow) { clearTimeout(hoverT); clearTimeout(backT); clearTimeout(idleT); rt.reset(); } else armIdle(); });
  armIdle();
})();
