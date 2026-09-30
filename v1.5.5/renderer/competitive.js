// Vivet Client - renderer/competitive.js
// Competitivo: XP por tiempo jugado, rangos (desde la DB) y top de jugadores.
// - 1 XP por minuto jugado en una sala (no cuenta replays ni "creando sala").
// - Inactividad: pasado un período de gracia, el XP baja por día. Con sesión
//   lo aplica el servidor; sin sesión se aplica localmente con la misma regla.
// - Los rangos y los parámetros de decaimiento vienen de GET /competitive/ranks
//   (con caché local y valores por defecto si el servidor no responde).
// Se carga DESPUÉS de app.js y friends.js. Usa globales de app.js: appRoot,
// replayMode, creatingRoom, escapeHtml.

(() => {
  const EP_TICK = '/competitive/tick';        // POST { seconds } -> { seconds, last_played_at }
  const EP_ME = '/competitive/me';            // GET -> { seconds, last_played_at }
  const EP_TOP = '/competitive/leaderboard';  // GET -> { top: [...] }
  const EP_RANKS = '/competitive/ranks';      // GET -> { ranks: [{id,name,xp,color}], decay: {grace_days, xp_per_day} }

  const DEFAULT_RANKS = [
    { id: 'bronce',   name: 'Bronce',   xp: 0,     color: '#cd7f32' },
    { id: 'plata',    name: 'Plata',    xp: 300,   color: '#c0c8d4' },
    { id: 'oro',      name: 'Oro',      xp: 900,   color: '#f5b74b' },
    { id: 'platino',  name: 'Platino',  xp: 2000,  color: '#4fd1c5' },
    { id: 'diamante', name: 'Diamante', xp: 4000,  color: '#5eb5ff' },
    { id: 'maestro',  name: 'Maestro',  xp: 8000,  color: '#a78bfa' },
    { id: 'leyenda',  name: 'Leyenda',  xp: 15000, color: '#ff5470' },
  ];
  let RANKS = DEFAULT_RANKS.slice();
  // Mismos valores por defecto que el servidor (tabla comp_config).
  let DECAY = { graceDays: 7, xpPerDay: 15 };
  const DAY_MS = 86400000;

  const TICK_MS = 5000;
  const SAVE_MS = 30000;
  const SYNC_MS = 60000;
  const TOP_REFRESH_MS = 30000;
  const DECAY_CHECK_MS = 60 * 60 * 1000;

  const $ = (s) => document.querySelector(s);
  let seconds = 0;          // tiempo local (se usa sin sesión)
  let dirty = false;
  let serverSeconds = null; // total en el servidor (con sesión)
  let serverLast = null;    // último momento jugado según el servidor (ms)
  let localLast = 0;        // último momento jugado local (ms)
  let localDecayedAt = 0;   // hasta cuándo se aplicó el decaimiento local (ms)
  let pending = 0;          // segundos jugados todavía no enviados
  let sending = false;
  let top = null; // null = sin cargar, [] = vacío, 'error' = falló
  let topError = '';

  const loggedIn = () => !!(window.vivetApi && window.vivetApi.loggedIn());
  const curSeconds = () => (loggedIn() && serverSeconds != null ? serverSeconds + pending : seconds);
  const xpOf = (s) => Math.floor(s / 60);
  function rankOf(xp) {
    let r = RANKS[0];
    for (const k of RANKS) if (xp >= k.xp) r = k;
    return r;
  }
  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  };
  const panelActive = () => $('#panel-competitivo')?.classList.contains('active');
  const esc = (t) => (typeof escapeHtml === 'function' ? escapeHtml(String(t ?? '')) : String(t ?? ''));
  const toMs = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : null; };

  // ------------------------------------------------------------ rangos (DB)
  function setRanks(list) {
    if (!Array.isArray(list)) return false;
    const ok = list
      .filter((r) => r && r.name && Number.isFinite(Number(r.xp)) && /^#[0-9a-f]{6}$/i.test(r.color || ''))
      .map((r) => ({ id: String(r.id || r.name), name: String(r.name), xp: Number(r.xp), color: r.color }))
      .sort((a, b) => a.xp - b.xp);
    if (ok.length < 2 || ok[0].xp !== 0) return false; // tiene que existir un rango base con 0 XP
    RANKS = ok;
    return true;
  }
  function setDecay(d) {
    if (!d) return;
    const g = Number(d.grace_days ?? d.graceDays);
    const x = Number(d.xp_per_day ?? d.xpPerDay);
    if (Number.isFinite(g) && g >= 0) DECAY.graceDays = g;
    if (Number.isFinite(x) && x >= 0) DECAY.xpPerDay = x;
  }
  async function loadRanks() {
    const api = window.vivetApi;
    if (!api || !api.configured) return;
    try {
      const r = await api.request('GET', EP_RANKS);
      if (setRanks(r && r.ranks)) {
        setDecay(r.decay);
        try { window.vivet.setConfig('compRanks', { ranks: RANKS, decay: DECAY }); } catch (_) {}
        renderAll();
      }
    } catch (_) { /* se queda con la caché / valores por defecto */ }
  }

  // ------------------------------------------------------------ decaimiento local
  // Misma regla que el servidor: pasado el período de gracia desde la última
  // vez que jugaste, se descuentan xpPerDay por cada día completo.
  function applyLocalDecay() {
    if (loggedIn() || !localLast || seconds <= 0) return;
    const from = Math.max(localLast + DECAY.graceDays * DAY_MS, localDecayedAt);
    const days = Math.floor((Date.now() - from) / DAY_MS);
    if (days < 1) return;
    seconds = Math.max(0, seconds - days * DECAY.xpPerDay * 60);
    localDecayedAt = from + days * DAY_MS;
    dirty = true;
    try { window.vivet.setConfig('compDecayedAt', localDecayedAt); } catch (_) {}
  }

  function badgeSvg(color) {
    return `<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M12 7l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 15.2 8.8 16.9l.6-3.6-2.6-2.5 3.6-.5L12 7z" fill="${color}"/>
    </svg>`;
  }

  // ------------------------------------------------------------ render
  function renderDecay() {
    let el = $('#comp-decay');
    if (!el) {
      const anchor = $('#comp-next');
      if (!anchor) return;
      el = document.createElement('p');
      el.id = 'comp-decay';
      el.className = 'hint';
      anchor.insertAdjacentElement('afterend', el);
    }
    const last = loggedIn() && serverLast ? serverLast : localLast;
    if (!last || curSeconds() <= 0 || DECAY.xpPerDay <= 0) { el.hidden = true; return; }
    const idle = (Date.now() - last) / DAY_MS;
    const left = Math.ceil(DECAY.graceDays - idle);
    if (left > 2) { el.hidden = true; return; }
    el.hidden = false;
    if (left > 0) {
      el.textContent = `Jugá pronto: tu XP empieza a bajar en ${left} ${left === 1 ? 'día' : 'días'} si no entrás a una sala.`;
      el.style.color = '';
    } else {
      el.textContent = `Por inactividad perdés ${DECAY.xpPerDay} XP por día. Jugá para frenarlo.`;
      el.style.color = 'var(--danger, #ff5470)';
    }
  }

  function renderMe() {
    const cur = curSeconds();
    const xp = xpOf(cur);
    const rank = rankOf(xp);
    const idx = RANKS.indexOf(rank);
    const next = RANKS[idx + 1];

    const badge = $('#comp-rank-badge');
    if (badge) { badge.innerHTML = badgeSvg(rank.color); badge.style.borderColor = rank.color; }
    const name = $('#comp-rank-name');
    if (name) { name.textContent = rank.name; name.style.color = rank.color; }
    const xpEl = $('#comp-xp'); if (xpEl) xpEl.textContent = `${xp} XP`;
    const timeEl = $('#comp-time'); if (timeEl) timeEl.textContent = fmtTime(cur);

    const bar = $('#comp-bar');
    const nextEl = $('#comp-next');
    if (bar) {
      const pct = next ? ((xp - rank.xp) / (next.xp - rank.xp)) * 100 : 100;
      bar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
      bar.style.background = rank.color;
    }
    if (nextEl) {
      nextEl.textContent = next
        ? `${next.xp - xp} XP para ${next.name}`
        : 'Rango máximo alcanzado';
    }
    const note = $('#comp-login-note');
    if (note) note.hidden = loggedIn();
    renderDecay();
  }

  function renderLadder() {
    const box = $('#comp-ladder');
    if (!box) return;
    const xp = xpOf(curSeconds());
    const cur = rankOf(xp);
    box.innerHTML = RANKS.map((r) => {
      const cls = r === cur ? 'current' : xp >= r.xp ? 'done' : '';
      return `<div class="rk-step ${cls}" style="--rk:${r.color}">
        ${badgeSvg(r.color).replace('width="44" height="44"', 'width="22" height="22"')}
        <div><div class="rk-step-name">${esc(r.name)}</div><div class="rk-step-xp">${r.xp} XP</div></div>
      </div>`;
    }).join('');
  }

  function renderTop() {
    const box = $('#comp-lb');
    if (!box) return;
    if (!window.vivetApi || !window.vivetApi.configured) {
      box.innerHTML = '<p class="hint fr-empty">El top no está disponible: falta configurar FRIENDS_API_URL en config.js.</p>';
      return;
    }
    if (top === null) { box.innerHTML = '<p class="hint fr-empty">Cargando…</p>'; return; }
    if (top === 'error') { box.innerHTML = `<p class="hint fr-empty">No se pudo cargar el top (${esc(topError)}). Revisá que el servidor tenga la ruta ${esc(EP_TOP)}.</p>`; return; }
    if (!top.length) { box.innerHTML = '<p class="hint fr-empty">Todavía no hay jugadores en el top.</p>'; return; }
    const myId = window.vivetApi.me()?.id;
    box.innerHTML = top.slice(0, 50).map((u, i) => {
      const s = Number(u.seconds ?? (u.minutes != null ? u.minutes * 60 : (u.xp || 0) * 60)) || 0;
      const r = rankOf(xpOf(s));
      const who = u.haxball_nick ? `${u.haxball_nick} (${u.username})` : (u.username || '?');
      const cls = `fr-row ${i < 3 ? 'comp-top' + (i + 1) : ''} ${myId != null && u.id === myId ? 'comp-me' : ''}`;
      return `<div class="${cls}">
        <div class="comp-pos">${i + 1}</div>
        <img class="fr-avatar" alt="" src="${esc(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />
        <div class="fr-row-info"><div class="fr-row-name">${esc(who)}</div>
          <div class="fr-row-sub" style="color:${r.color}">${esc(r.name)} · ${xpOf(s)} XP</div></div>
        <div class="comp-time">${fmtTime(s)}</div>
      </div>`;
    }).join('');
  }

  function renderAll() { renderMe(); renderLadder(); renderTop(); }

  // ------------------------------------------------------------ datos
  async function save() {
    if (!dirty) return;
    dirty = false;
    try {
      await window.vivet.setConfig('compSeconds', seconds);
      await window.vivet.setConfig('compLastPlayed', localLast);
    } catch (_) { dirty = true; }
  }

  function takeServer(r) {
    const v = Number(r && r.seconds);
    if (Number.isFinite(v)) serverSeconds = v;
    const l = toMs(r && r.last_played_at);
    if (l) serverLast = l;
  }

  // Trae el total del servidor (al iniciar sesión / abrir el panel).
  async function pull() {
    if (!loggedIn()) { serverSeconds = null; serverLast = null; return; }
    try { takeServer(await window.vivetApi.request('GET', EP_ME)); } catch (_) {}
    renderAll();
  }

  // Envía el tiempo jugado. El servidor decide cuánto acredita (solo si estás
  // en una sala y con tope según el tiempo real), así que lo enviado se descarta
  // de `pending` y el total se toma de su respuesta.
  async function sync() {
    if (sending || !loggedIn()) return;
    const n = Math.floor(Math.min(pending, 600));
    if (n < 1) return;
    sending = true;
    try {
      const r = await window.vivetApi.request('POST', EP_TICK, { seconds: n });
      pending = Math.max(0, pending - n);
      takeServer(r);
      if (panelActive()) renderAll(); // con otro panel abierto no hay nada que redibujar
    } catch (_) { /* se reintenta en el próximo ciclo */ }
    finally { sending = false; }
  }

  async function loadTop() {
    const api = window.vivetApi;
    if (!api || !api.configured) { renderTop(); return; }
    try {
      const r = await api.request('GET', EP_TOP);
      top = Array.isArray(r) ? r : (r && Array.isArray(r.top) ? r.top : []);
    } catch (e) { top = 'error'; topError = (e && e.message) || 'error'; console.warn('[competitivo] top:', EP_TOP, e); }
    renderTop();
  }

  // ------------------------------------------------------------ tiempo jugado
  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(30, (now - lastTick) / 1000); // tope por si la PC se durmió
    lastTick = now;
    let playing = false;
    try { playing = appRoot.classList.contains('playing') && !replayMode && !creatingRoom; } catch (_) {}
    if (!playing) return;
    seconds += dt;
    pending += dt;
    localLast = now;
    if (loggedIn()) serverLast = now;
    dirty = true;
    if (panelActive()) renderMe();
  }, TICK_MS);

  setInterval(save, SAVE_MS);
  setInterval(sync, SYNC_MS);
  setInterval(() => { applyLocalDecay(); if (panelActive()) renderMe(); }, DECAY_CHECK_MS);
  setInterval(() => { if (panelActive()) loadTop(); }, TOP_REFRESH_MS);
  window.addEventListener('beforeunload', () => {
    try {
      window.vivet.setConfig('compSeconds', seconds);
      window.vivet.setConfig('compLastPlayed', localLast);
    } catch (_) {}
  });
  window.addEventListener('vivet-session-changed', async () => { pending = 0; serverSeconds = null; serverLast = null; renderAll(); await pull(); loadRanks(); loadTop(); });
  document.querySelector('.nav-btn[data-panel="panel-competitivo"]')?.addEventListener('click', () => {
    applyLocalDecay(); renderAll(); sync().then(pull); loadRanks(); loadTop();
  });

  // ------------------------------------------------------------ arranque
  renderAll();
  (async () => {
    try {
      const cache = await window.vivet.getConfig('compRanks', null);
      if (cache && setRanks(cache.ranks)) setDecay(cache.decay);
      const v = Number(await window.vivet.getConfig('compSeconds', 0));
      if (Number.isFinite(v) && v > seconds) seconds = v;
      const lp = Number(await window.vivet.getConfig('compLastPlayed', 0));
      if (Number.isFinite(lp) && lp > localLast) localLast = lp;
      // Usuario que ya tenía XP y nunca guardó última vez: se cuenta desde hoy (no se le castiga retroactivamente).
      if (!localLast && seconds > 0) { localLast = Date.now(); dirty = true; }
      const da = Number(await window.vivet.getConfig('compDecayedAt', 0));
      if (Number.isFinite(da)) localDecayedAt = da;
    } catch (_) {}
    applyLocalDecay();
    renderAll();
    loadRanks();
    // friends.js carga la sesión de forma asíncrona: se espera a que esté lista.
    for (let i = 0; i < 20 && !loggedIn(); i++) await new Promise((r) => setTimeout(r, 1000));
    pull();
  })();
})();