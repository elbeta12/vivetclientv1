// Vivet Client - renderer/animations.js
// Animaciones del panel que necesitan un poco de JS (el resto vive en style.css):
//  - Onda al hacer click en botones.
//  - Foco de luz que sigue al mouse en las tarjetas.
//  - Contadores que "suben" (jugadores en línea, XP) en vez de saltar.
//  - Lista de salas: entrada escalonada la primera vez y destello en las salas nuevas.
//  - Destello cuando cambia "actualizado hace...". Spinner en "Actualizar".
// No toca la lógica de app.js: solo observa el DOM. Se apaga con el modo
// rendimiento y con prefers-reduced-motion. Se carga al final (ver index.html).

(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const off = () => reduced.matches || root.classList.contains('perf-mode');

  // ------------------------------------------------------------ ondas al click
  const RIPPLE = '.primary-btn, .ghost-btn, .nav-btn, .club-chip, .stadium-chip, .res-chip';
  document.addEventListener('pointerdown', (e) => {
    if (off() || e.button !== 0) return;
    const b = e.target.closest && e.target.closest(RIPPLE);
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'vv-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, true);

  // ------------------------------------------------------------ foco de luz en tarjetas
  let raf = 0, lx = 0, ly = 0, lcard = null;
  document.addEventListener('pointermove', (e) => {
    if (off()) return;
    const c = e.target.closest && e.target.closest('.card');
    if (!c) return;
    lcard = c; lx = e.clientX; ly = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!lcard) return;
      const r = lcard.getBoundingClientRect();
      lcard.style.setProperty('--mx', (lx - r.left) + 'px');
      lcard.style.setProperty('--my', (ly - r.top) + 'px');
    });
  }, { passive: true });

  // ------------------------------------------------------------ contadores
  // fmt(n, textoOriginal) -> texto. Se anima del valor anterior al nuevo.
  function counter(el, fmt) {
    if (!el) return;
    let shown = null, anim = 0, internal = false;
    const parse = (t) => { const m = /\d[\d.,\s]*/.exec(t || ''); return m ? Number(m[0].replace(/[^\d]/g, '')) : null; };
    const write = (v) => { internal = true; el.textContent = fmt(v, el.textContent); internal = false; };
    new MutationObserver(() => {
      if (internal) return;
      const target = parse(el.textContent);
      if (target == null) { shown = null; return; }
      if (shown == null || off() || shown === target) { shown = target; return; }
      const from = shown, t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(target - from) * 12);
      cancelAnimationFrame(anim);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const v = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
        shown = v; write(v);
        if (k < 1) anim = requestAnimationFrame(step);
        else { shown = target; write(target); }
      };
      write(from);
      anim = requestAnimationFrame(step);
    }).observe(el, { childList: true, characterData: true, subtree: true });
    shown = parse(el.textContent);
  }
  counter($('#stat-players'), (n) => n.toLocaleString('es'));
  counter($('#comp-xp'), (n) => `${n} XP`);

  // ------------------------------------------------------------ lista de salas
  const list = $('#room-list');
  if (list) {
    const seen = new Map();         // nombre -> último momento en que se vio
    const FRESH_MS = 30000;         // si reaparece antes de esto (filtro, reorden) no cuenta como nueva
    let first = true;
    new MutationObserver(() => {
      if (off()) return;
      const cards = [...list.querySelectorAll('.room-card:not(.room-card-pinned):not(.room-card-direct)')];
      if (!cards.length) return;
      const now = Date.now();
      let i = 0;
      for (const c of cards) {
        const n = (c.querySelector('.room-name')?.textContent || '').trim();
        if (!n) continue;
        const last = seen.get(n);
        if (first) {
          if (i < 12) { c.classList.add('vv-enter'); c.style.animationDelay = (i * 45) + 'ms'; }
          i++;
        } else if (last == null || now - last > FRESH_MS) {
          c.classList.add('vv-new');
        }
        seen.set(n, now);
      }
      first = false;
      if (seen.size > 600) for (const [k, t] of seen) if (now - t > 5 * 60000) seen.delete(k);
    }).observe(list, { childList: true });
  }

  // ------------------------------------------------------------ actualizar / última vez
  const refresh = $('#refresh-btn');
  refresh?.addEventListener('click', () => {
    if (off()) return;
    refresh.classList.add('vv-spin');
    setTimeout(() => refresh.classList.remove('vv-spin'), 1400);
  });
  const lu = $('#last-updated');
  if (lu) {
    let prev = lu.textContent;
    new MutationObserver(() => {
      if (off() || lu.textContent === prev) return;
      prev = lu.textContent;
      lu.classList.remove('vv-flash'); void lu.offsetWidth; lu.classList.add('vv-flash');
    }).observe(lu, { childList: true, characterData: true, subtree: true });
  }
})();