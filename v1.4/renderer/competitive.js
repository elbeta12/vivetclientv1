// Vivet Client - renderer/competitive.js
// Competitivo: XP por tiempo jugado en el cliente -> rangos (Bronce, Plata,
// Oro...) + top de jugadores. El tiempo cuenta solo mientras estás dentro de
// una sala (no en replays ni creando sala). Todo se puede ajustar en las
// constantes de abajo. Sin sesión de Discord el progreso se guarda local;
// con sesión, el servidor lleva el total oficial y arma el top
// (ver "Servidor" al final de este archivo).
// Se carga DESPUÉS de friends.js: usa window.vivetApi y los globales de app.js
// (appRoot, replayMode, creatingRoom, escapeHtml).

(() => {
  // ---------------------------------------------------------------- config
  const XP_PER_MINUTE = 1;        // XP ganado por minuto jugado
  const TICK_MS = 5000;           // cada cuánto se mide el tiempo
  const LOCAL_SAVE_S = 30;        // cada cuántos s se guarda en disco
  const SERVER_SYNC_S = 60;       // cada cuántos s se informa al servidor
  const LB_REFRESH_MS = 30000;    // refresco del top con el panel abierto
  const LB_LIMIT = 50;
  const RANKS = [
    { id: 'bronce',   name: 'Bronce',   xp: 0,     color: '#cd7f32' },
    { id: 'plata',    name: 'Plata',    xp: 300,   color: '#c0c8d4' },
    { id: 'oro',      name: 'Oro',      xp: 1200,  color: '#f5b74b' },
    { id: 'platino',  name: 'Platino',  xp: 3000,  color: '#5eead4' },
    { id: 'diamante', name: 'Diamante', xp: 6000,  color: '#60a5fa' },
    { id: 'maestro',  name: 'Maestro',  xp: 12000, color: '#c084fc' },
    { id: 'leyenda',  name: 'Leyenda',  xp: 24000, color: '#ff5470' },
  ];

  // ---------------------------------------------------------------- estado
  const $ = (s) => document.querySelector(s);
  const isPlaying = () => appRoot.classList.contains('playing') && !replayMode && !creatingRoom;
  const apiReady = () => !!(window.vivetApi && window.vivetApi.configured);
  const loggedIn = () => !!(window.vivetApi && window.vivetApi.loggedIn());

  let localSeconds = 0;     // total local (sin sesión)
  let unsavedS = 0;         // segundos aún no guardados en disco
  let serverSeconds = null; // total oficial (con sesión); null = desconocido
  let pendingS = 0;         // segundos aún no informados al servidor
  let lastTick = Date.now();
  let syncing = false;
  let lb = [];
  let lbMsg = '';

  const xpOf = (s) => Math.floor((s / 60) * XP_PER_MINUTE);
  function rankOf(xp) {
    let i = 0;
    RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    return { rank: RANKS[i], next: RANKS[i + 1] || null };
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  }
  const badge = (color, size) =>
    `<svg class="rk-badge" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">` +
    `<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M12 7.5l1.4 3 3.3.4-2.4 2.3.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.4-2.3 3.3-.4z" fill="${color}"/></svg>`;

  const totalSeconds = () => (loggedIn() && serverSeconds != null ? serverSeconds + pendingS : localSeconds);

  // ---------------------------------------------------------------- tiempo
  async function saveLocal() {
    unsavedS = 0;
    try { await window.vivet.setConfig('compSeconds', Math.floor(localSeconds)); } catch (_) {}
  }

  async function syncServer() {
    if (syncing || !loggedIn() || pendingS < SERVER_SYNC_S) return;
    syncing = true;
    const send = Math.floor(pendingS);
    try {
      const r = await window.vivetApi.request('POST', '/competitive/tick', { seconds: send });
      pendingS -= send;
      if (r && Number.isFinite(Number(r.seconds))) serverSeconds = Number(r.seconds);
    } catch (_) {
      pendingS = Math.min(pendingS, 600); // sin conexión: se reintenta, con tope
    } finally { syncing = false; }
  }

  function tick() {
    const now = Date.now();
    // Tope de 10 s por medición: si la PC se durmió, ese rato no cuenta.
    const dt = Math.min(TICK_MS * 2, now - lastTick) / 1000;
    lastTick = now;
    if (!isPlaying()) return;
    localSeconds += dt;
    unsavedS += dt;
    if (unsavedS >= LOCAL_SAVE_S) saveLocal();
    if (loggedIn()) { pendingS += dt; syncServer(); }
    if ($('#panel-competitivo')?.classList.contains('active')) renderMe();
  }

  // ---------------------------------------------------------------- UI
  function renderLadder() {
    const box = $('#comp-ladder');
    if (!box) return;
    box.innerHTML = RANKS.map((r) =>
      `<div class="rk-step" data-rank="${r.id}" style="--rk:${r.color}">${badge(r.color, 26)}` +
      `<span class="rk-step-name">${r.name}</span><span class="rk-step-xp">${r.xp.toLocaleString()} XP</span></div>`).join('');
  }

  function renderMe() {
    const secs = totalSeconds();
    const xp = xpOf(secs);
    const { rank, next } = rankOf(xp);
    const set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
    const b = $('#comp-rank-badge');
    if (b && b.dataset.rank !== rank.id) { b.dataset.rank = rank.id; b.innerHTML = badge(rank.color, 64); }
    const nameEl = $('#comp-rank-name');
    if (nameEl) { nameEl.textContent = rank.name; nameEl.style.color = rank.color; }
    set('#comp-xp', `${xp.toLocaleString()} XP`);
    set('#comp-time', fmtTime(secs));
    const pct = next ? Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
    const bar = $('#comp-bar');
    if (bar) { bar.style.width = pct.toFixed(1) + '%'; bar.style.background = rank.color; }
    const nx = $('#comp-next');
    if (nx) nx.innerHTML = next
      ? `${(next.xp - xp).toLocaleString()} XP para <span style="color:${next.color};font-weight:700">${next.name}</span>`
      : 'Rango máximo alcanzado';
    document.querySelectorAll('#comp-ladder .rk-step').forEach((el) => {
      const i = RANKS.findIndex((r) => r.id === el.dataset.rank);
      el.classList.toggle('current', RANKS[i].id === rank.id);
      el.classList.toggle('done', RANKS[i].xp < rank.xp);
    });
    const note = $('#comp-login-note');
    if (note) note.hidden = loggedIn() || !apiReady();
  }

  function renderBoard() {
    const box = $('#comp-lb');
    if (!box) return;
    if (!lb.length) { box.innerHTML = `<p class="hint fr-empty">${escapeHtml(lbMsg || 'Todavía no hay jugadores en el top.')}</p>`; return; }
    const myId = window.vivetApi?.me()?.id;
    box.innerHTML = lb.map((u, i) => {
      const xp = xpOf(u.seconds || 0);
      const { rank } = rankOf(xp);
      const name = escapeHtml(u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);
      return `<div class="fr-row comp-row ${u.id === myId ? 'comp-me' : ''} ${i < 3 ? 'comp-top' + (i + 1) : ''}">
        <div class="comp-pos">${i + 1}</div>
        <img class="fr-avatar" alt="" src="${escapeHtml(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />
        <div class="fr-row-info"><div class="fr-row-name">${name}</div>
          <div class="fr-row-sub"><span style="color:${rank.color};font-weight:700">${rank.name}</span> · ${xp.toLocaleString()} XP</div></div>
        <div class="comp-time">${fmtTime(u.seconds || 0)}</div></div>`;
    }).join('');
  }

  async function loadBoard() {
    if (!apiReady()) { lb = []; lbMsg = 'El top necesita el servidor configurado (FRIENDS_API_URL en config.js).'; return renderBoard(); }
    try {
      const r = await window.vivetApi.request('GET', `/competitive/leaderboard?limit=${LB_LIMIT}`);
      lb = Array.isArray(r && r.top) ? r.top : [];
      lbMsg = '';
    } catch (e) {
      lbMsg = 'No se pudo cargar el top: ' + ((e && e.message) || 'error');
    }
    renderBoard();
  }

  async function loadMine() {
    if (!loggedIn()) { serverSeconds = null; return renderMe(); }
    try {
      const r = await window.vivetApi.request('GET', '/competitive/me');
      if (r && Number.isFinite(Number(r.seconds))) serverSeconds = Number(r.seconds);
    } catch (_) {}
    renderMe();
  }

  function open() { renderMe(); loadMine(); loadBoard(); }

  // ---------------------------------------------------------------- arranque
  document.querySelector('.nav-btn[data-panel="panel-competitivo"]')?.addEventListener('click', open);
  window.addEventListener('vivet-session-changed', () => { pendingS = 0; loadMine(); loadBoard(); });
  window.addEventListener('beforeunload', () => { if (unsavedS > 0) saveLocal(); });
  setInterval(tick, TICK_MS);
  setInterval(() => { if ($('#panel-competitivo')?.classList.contains('active')) loadBoard(); }, LB_REFRESH_MS);

  renderLadder();
  renderMe();
  (async () => {
    try { localSeconds = Number(await window.vivet.getConfig('compSeconds', 0)) || 0; } catch (_) {}
    renderMe();
  })();
})();

// ---------------------------------------------------------------------------
// Servidor (lo que tiene que exponer FRIENDS_API_URL, con el token de sesión):
//   POST /competitive/tick        { seconds }  -> { seconds }  (total del usuario)
//        Sumar `seconds` al total, pero con tope por usuario según el tiempo
//        real transcurrido desde el tick anterior (p. ej. máx. 75 s por cada
//        60 s reales), así no se puede inflar el tiempo a mano.
//   GET  /competitive/me          -> { seconds }
//   GET  /competitive/leaderboard?limit=50
//        -> { top: [{ id, username, haxball_nick, avatar_url, seconds }] }
//        ordenado por seconds desc; sin invisibles ni bloqueados si querés.
// El XP y el rango se calculan acá en el cliente a partir de `seconds`.
// ---------------------------------------------------------------------------