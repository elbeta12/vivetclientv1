// Vivet Client - renderer app.js
// Script del proceso de renderer principal de Vivet Client.

const $ = (sel) => document.querySelector(sel);
const appRoot = $('#app-root');
const view = $('#game-view');

const HAXBALL_PLAY_URL = 'https://www.haxball.com/play';

let gameFrameHint = null;

function execInGame(code) {
  let id;
  try {
    id = view.getWebContentsId();
  } catch (_) {
    return Promise.reject(new Error('webview no está listo todavía'));
  }
  return window.vivet.execInWebview(id, code, gameFrameHint);
}

function execInAllFrames(code) {
  let id;
  try {
    id = view.getWebContentsId();
  } catch (_) {
    return Promise.reject(new Error('webview no está listo todavía'));
  }
  return window.vivet.execInWebviewAll(id, code);
}

// CORREGIDO (27/09) - un solo intento de foco justo al entrar a jugar no
// siempre pega: el webview puede todavía estar asentándose, o Haxball
// puede robar el foco un instante después (ej: autofocus del input de
// nickname). Reintentamos con foco "real" (proceso principal, ver
// webview-focus en main.js) unas cuantas veces durante el primer segundo.
function focusGameView() {
  try { view.focus(); } catch (_) {}
  let attempts = 0;
  const maxAttempts = 6;
  const tick = () => {
    attempts++;
    let id;
    try {
      id = view.getWebContentsId();
    } catch (_) {
      id = null;
    }
    if (id != null) {
      const rect = view.getBoundingClientRect();
      window.vivet.focusWebview?.(id, rect.width, rect.height).catch(() => {});
      try { view.focus(); } catch (_) {}
    }
    if (attempts < maxAttempts) setTimeout(tick, 150);
  };
  tick();
}



// ---------------------------------------------------------------------------
// Toasts / Notificaciones cortas
// ---------------------------------------------------------------------------
function showToast(message, kind) {
  const container = $('#toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'ok' ? ' toast-ok' : '');
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, 2400);
}

function copyToClipboard(text, successMessage) {
  if (!text) {
    showToast('No hay nada para copiar todavía');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => showToast(successMessage || 'Copiado al portapapeles', 'ok'))
    .catch(() => showToast('No se pudo copiar'));
}

// Rendimiento (rAF, FPS, GPU, anuncios): todo en optimizations.js
VivetPerf.init({ view, appRoot, execInGame, execInAllFrames, showToast });

// ---------------------------------------------------------------------------
// Chequeo de actualizaciones
// ---------------------------------------------------------------------------
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

const updateBanner = $('#update-banner');
const updateBannerText = $('#update-banner-text');
const updateDownloadBtn = $('#update-download-btn');
let latestUpdateUrl = null;

async function checkForUpdate() {
  if (typeof UPDATE_MANIFEST_URL === 'undefined' || !UPDATE_MANIFEST_URL) return;
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const current = await window.vivet.getAppVersion();
    if (data && data.version && data.url && compareVersions(data.version, current) > 0) {
      latestUpdateUrl = data.url;
      if (updateBannerText) updateBannerText.textContent = `Vivet ${data.version} disponible`;
      if (updateBanner) updateBanner.style.display = '';
    }
  } catch (_) {}
}
updateDownloadBtn?.addEventListener('click', () => {
  if (latestUpdateUrl) window.vivet.openExternal(latestUpdateUrl);
});
checkForUpdate();
setInterval(checkForUpdate, 30 * 60 * 1000);

// ---------------------------------------------------------------------------
// Navegación entre paneles
// ---------------------------------------------------------------------------
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    navBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(btn.dataset.panel).classList.add('active');
  });
});

// ---------------------------------------------------------------------------
// Tema claro/oscuro
// ---------------------------------------------------------------------------
const themeToggle = $('#theme-toggle');
const themeLabel = $('#theme-label');

async function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Oscuro' : 'Claro';
  await window.vivet.setConfig('theme', theme);
}

(async () => {
  const saved = await window.vivet.getConfig('theme', 'dark');
  applyTheme(saved);
})();

themeToggle?.addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

$('#discord-quick-btn')?.addEventListener('click', () => {
  window.vivet.openExternal(DISCORD_INVITE_URL);
});

// ---------------------------------------------------------------------------
// Modo "jugando"
// ---------------------------------------------------------------------------
const copyLinkBtn = $('#copy-link-btn');
const roomNameBadge = $('#room-name-badge');

function updateRoomNameBadge(code, roomName) {
  if (!roomNameBadge) return;
  roomNameBadge.textContent = roomName ? roomName : (code ? `Sala: ${code}` : '');
}

// ---------------------------------------------------------------------------
// Overlay de "entrando a la sala" - ver comentario en index.html/style.css.
// Tapa el webview desde el instante en que se marca "playing" hasta que
// hay señal real de que ya estás DENTRO de la sala (no solo conectando).
// ---------------------------------------------------------------------------
const joinOverlayEl = $('#join-overlay');
const joinOverlayTextEl = $('#join-overlay-text');
const JOIN_OVERLAY_MIN_MS = 350; // piso, para que no titile si ya estaba casi listo
const JOIN_OVERLAY_MAX_MS = 9000; // techo, para no quedar tapado para siempre si algo no matchea
const JOIN_OVERLAY_POLL_MS = 200;
let joinOverlayPollTimer = null;
let joinOverlayHideTimer = null;

function showJoinOverlay(text) {
  if (!joinOverlayEl) return;
  if (joinOverlayTextEl) joinOverlayTextEl.textContent = text || 'Entrando a la sala…';
  clearTimeout(joinOverlayHideTimer);
  joinOverlayEl.classList.add('visible');
  // Fuerza reflow para que la transición de opacity sí corra (si venía de
  // display:none no hay transición sin este truco).
  void joinOverlayEl.offsetWidth;
  joinOverlayEl.classList.add('show');
}

function hideJoinOverlay() {
  clearInterval(joinOverlayPollTimer);
  joinOverlayPollTimer = null;
  if (!joinOverlayEl) return;
  joinOverlayEl.classList.remove('show');
  clearTimeout(joinOverlayHideTimer);
  joinOverlayHideTimer = setTimeout(() => joinOverlayEl.classList.remove('visible'), 200);
}

// Detecta si ya hay UI real de sala/partido en pantalla (no solo el lobby
// ni la pantalla intermedia de "conectando" de Haxball) - usa las mismas
// clases que ya pisa el CSS personalizado en config.js, así que sabemos
// que existen de verdad en la página.
function inGameUiVisibleInPage() {
  try {
    return !!(document.querySelector('.room-view') || document.querySelector('.game-state-view'));
  } catch (e) {
    return false;
  }
}
function buildInGameUiScript() {
  return '(' + inGameUiVisibleInPage.toString() + ')();';
}

function waitOutJoinOverlay() {
  const startedAt = Date.now();
  clearInterval(joinOverlayPollTimer);
  const check = async () => {
    if (!appRoot.classList.contains('playing')) return; // saliste mientras tanto
    const elapsed = Date.now() - startedAt;
    let ready = false;
    try {
      const results = await execInAllFrames(buildInGameUiScript());
      ready = results.some((r) => r.ok && r.value === true);
    } catch (_) {}
    if ((ready && elapsed >= JOIN_OVERLAY_MIN_MS) || elapsed >= JOIN_OVERLAY_MAX_MS) {
      hideJoinOverlay();
      refreshRoomTitleFromPage();
      return;
    }
    joinOverlayPollTimer = setTimeout(check, JOIN_OVERLAY_POLL_MS);
  };
  check();
}

let joinedAt = 0;
let currentRoomName = null;
let currentRoomUrl = null;
let leaveHits = 0;
// Se pone en true mientras el flujo de "Crear sala" tiene el juego real a
// la vista (ver createRoomBtn más abajo) - el diálogo nativo de Haxball
// aparece ENCIMA del lobby, así que sin esto checkLeftRoom pensaría que
// "volviste al lobby" al toque y te sacaría de vuelta al panel de Vivet
// antes de que puedas ni ver el diálogo.
let creatingRoom = false;
// true mientras se reproduce un replay (ver replays.js): el juego queda a la
// vista sin ser una sala, así que hay que frenar la detección de "volviste al
// lobby" y no mostrar el overlay de "entrando a la sala".
let replayMode = false;
const LEAVE_GRACE_MS = 1000;
const LEAVE_CONFIRM_HITS = 1;
const LEAVE_CHECK_INTERVAL_MS = VIVET_PERF.LEAVE_CHECK_INTERVAL_MS;

function setPlaying(isPlaying) {
  const wasPlaying = appRoot.classList.contains('playing');
  appRoot.classList.toggle('playing', isPlaying);
  if (isPlaying === wasPlaying) return;
  if (isPlaying) {
    joinedAt = Date.now();
    leaveHits = 0;
    stopRoomPolling();
    // CORREGIDO (27/09) - antes, apenas se confirmaba el join, se
    // destapaba el webview al toque: eso mostraba, en crudo, tanto el
    // parpadeo negro de #game-wrap asentándose como la propia pantalla de
    // "conectando" nativa de Haxball (que todavía puede tardar un rato
    // más en resolverse). Ahora se tapa con join-overlay (con su propio
    // spinner, sin negro puro) desde este mismo instante, y recién se
    // saca cuando waitOutJoinOverlay detecta UI real de sala/partido.
    // Excepto en el flujo de "Crear sala" (creatingRoom) - ahí el webview
    // se muestra a propósito para que completes vos mismo el diálogo
    // nativo "Create room" de Haxball, así que taparlo sería contraprod.
    if (!creatingRoom && !replayMode) {
      showJoinOverlay();
      waitOutJoinOverlay();
    }
    // CORREGIDO (27/09) - view.focus() (DOM, desde este mismo renderer)
    // no siempre alcanza para que Chromium le pase el foco de teclado real
    // al guest, sobre todo justo acá, con el webview todavía asentándose
    // después del join/navegación. focusGameView() pide el foco "de
    // verdad" desde el proceso principal (ver webview-focus en main.js) y
    // reintenta un par de veces, porque el primer intento puede llegar
    // demasiado pronto.
    focusGameView();
    VivetPerf.injectIntoGame();
  } else {
    hideJoinOverlay();
    startRoomPolling();
  }
}

function currentRoomCode() {
  try {
    return new URL(view.getURL()).searchParams.get('c');
  } catch (_) {
    return null;
  }
}

function handleNavigate() {
  const code = currentRoomCode();
  gameFrameHint = null;
  setPlaying(replayMode ? true : !!code);
  updateDiscordPresence(code, currentRoomName);
  updateRoomNameBadge(code, currentRoomName);
}copyLinkBtn?.addEventListener('click', async () => {
  // CORREGIDO (26/09) - cuando entrás a una sala pública haciendo click en
  // la lista, Haxball no navega la URL (es un SPA), así que ni
  // currentRoomCode() ni buscar "c=" en los frames encontraba nada. Ahora
  // guardamos la URL real de la sala (la que scrapeamos de la lista, o la
  // que usamos para el "Jugar" directo) en currentRoomUrl al entrar, y la
  // usamos primero acá.
  if (currentRoomUrl) {
    copyToClipboard(currentRoomUrl, 'Link de la sala copiado');
    return;
  }

  const code = currentRoomCode();

  // Si hay código en la URL, lo usa. Si no, busca en todos los frames:
  if (code) {
    copyToClipboard(`${HAXBALL_PLAY_URL}?c=${encodeURIComponent(code)}`, 'Link copiado');
    return;
  }

  try {
    const results = await execInAllFrames('location.href');
    const withCode = results.find((r) => r.ok && /[?&]c=/.test(r.value || ''));
    const m = withCode ? withCode.value.match(/[?&]c=([^&]+)/) : null;

    if (m) {
      // CORREGIDO: Se usa m[1] porque es el primer y único grupo de captura ([^&]+)
      copyToClipboard(`${HAXBALL_PLAY_URL}?c=${m[1]}`, 'Link de la sala copiado');
      return;
    }
  } catch (_) {}

  showToast('No se encontró el link. Intentá cuando ya estés en la cancha.');
});

// ---------------------------------------------------------------------------
// Detección automática de retorno al lobby
// ---------------------------------------------------------------------------
function lobbyVisibleInPage() {
  try {
    // Si hay sala o partida en pantalla NO estamos en el lobby: salida
    // inmediata, sin tocar el texto de la página. Antes se leía
    // document.body.innerText (fuerza un layout completo) en todos los
    // frames cada 600ms MIENTRAS jugabas - causa directa de tirones.
    if (document.querySelector('.room-view, .game-state-view')) return false;
    var bodyText = (document.body && document.body.textContent) || '';
    return /[\d,]+\s+players?\s+in\s+[\d,]+\s+rooms?/i.test(bodyText);
  } catch (e) {
    return false;
  }
}

function buildLobbyCheckScript() {
  return '(' + lobbyVisibleInPage.toString() + ')();';
}

let leaveWatchTimer = null;
let leaveCheckInFlight = false;
async function checkLeftRoom() {
  if (!appRoot.classList.contains('playing') || creatingRoom || replayMode) return;
  if (Date.now() - joinedAt < LEAVE_GRACE_MS) return;
  if (leaveCheckInFlight) return;
  leaveCheckInFlight = true;
  try {
    const results = await execInAllFrames(buildLobbyCheckScript());
    const backAtLobby = results.some((r) => r.ok && r.value === true);
    leaveHits = backAtLobby ? leaveHits + 1 : 0;
    if (leaveHits >= LEAVE_CONFIRM_HITS) {
      leaveHits = 0;
      setPlaying(false);
      gameFrameHint = null;
      currentRoomName = null;
      currentRoomUrl = null;
      updateDiscordPresence(null);
      updateRoomNameBadge(null, null);
      // CORREGIDO (27/09) - antes acá se hacía view.loadURL(HAXBALL_PLAY_URL),
      // o sea recargar TODA la página del juego desde cero al salir de una
      // sala. Eso te mandaba de nuevo por todo el handshake de conexión de
      // Haxball (la pantalla de "conectando" que se quedaba viendo) y
      // mientras esa recarga terminaba, la lista de salas no tenía nada
      // fresco para mostrar. Entrar a una sala NO navega la URL (es un
      // SPA - ver el comentario en copyLinkBtn más arriba), así que salir
      // tampoco debería necesitar un reload completo: alcanza con
      // quedarnos en la misma página (ya volvió sola al lobby) y
      // re-scrapear al toque.
      pokeRoomPolling();
    }
  } catch (_) {
  } finally {
    leaveCheckInFlight = false;
  }
}

if (!leaveWatchTimer) {
  leaveWatchTimer = setInterval(checkLeftRoom, LEAVE_CHECK_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Explorar salas & Scraper ligero
// ---------------------------------------------------------------------------
const searchInput = $('#search-input');
const sortSelect = $('#sort-select');
const refreshBtn = $('#refresh-btn');
const roomListEl = $('#room-list');
const statPlayersEl = $('#stat-players');
const lastUpdatedEl = $('#last-updated');

let allRoomsCache = [];
let currentRoomsData = { rooms: [], totalPlayers: null, totalRooms: null };
let roomPollTimer = null;

function scrapeRoomsInPage() {
  try {
    var rows = Array.from(document.querySelectorAll('tr'));
    var rooms = [];
    rows.forEach(function (row) {
      var text = (row.innerText || '').trim();
      if (!text) return;
      var m = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      var cells = Array.from(row.querySelectorAll('td, th')).map(function (c) {
        return (c.innerText || '').trim();
      });
      var name = cells[0] || (text.split('\n')[0] || 'Sala');
      var distM = text.match(/(\d+)\s*km/i);
      var link = row.querySelector('a[href*="c="]');
      var url = link ? link.href : null;
      rooms.push({
        name: name,
        players: parseInt(m[1], 10),
        maxPlayers: parseInt(m[2], 10),
        distanceKm: distM ? parseInt(distM[1], 10) : null,
        hasPassword: /(^|[^a-zA-Z])Yes([^a-zA-Z]|$)/.test(text),
        url: url,
      });
    });
    var bodyText = document.body.innerText || '';
    var hm = bodyText.match(/([\d,]+)\s+players?\s+in\s+([\d,]+)\s+rooms?/i);
    return JSON.stringify({
      rooms: rooms,
      totalPlayers: hm ? parseInt(hm[1].replace(/,/g, ''), 10) : null,
      totalRooms: hm ? parseInt(hm[2].replace(/,/g, ''), 10) : null,
    });
  } catch (e) {
    return JSON.stringify({ rooms: [], totalPlayers: null, totalRooms: null, error: String((e && e.message) || e) });
  }
}

function joinRoomInPage(roomName) {
  try {
    var rows = Array.from(document.querySelectorAll('tr'));
    var target = rows.find(function (row) {
      return (row.innerText || '').trim() === roomName.trim();
    });
    if (!target) {
      target = rows.find(function (row) {
        return (row.innerText || '').indexOf(roomName) !== -1;
      });
    }
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      try {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      } catch (_) {}
    });

    var attempts = 0;
    var maxAttempts = 50;
    var intervalMs = 200;
    var triedDblClick = false;
    var timer = setInterval(function () {
      attempts++;
      var btns = Array.from(document.querySelectorAll('button, a'));
      var joinBtn = btns.find(function (b) {
        var t = (b.innerText || b.textContent || '').trim();
        return /^(join\s*room|join|entrar|unirse)$/i.test(t) || /join\s*room/i.test(t);
      });
      if (joinBtn) {
        clearInterval(timer);
        joinBtn.click();
        return;
      }
      if (!triedDblClick && attempts >= 5) {
        triedDblClick = true;
        try {
          target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, intervalMs);

    return true;
  } catch (e) {
    return false;
  }
}

function buildScrapeScript() {
  return '(' + scrapeRoomsInPage.toString() + ')();';
}
function buildJoinScript(roomName) {
  return '(' + joinRoomInPage.toString() + ')(' + JSON.stringify(roomName) + ');';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

const COUNTRY_HINTS = [
  ['VENEZUELA', 'VE'], ['COLOMBIA', 'CO'], ['ARGENTINA', 'AR'], ['MÉXICO', 'MX'],
  ['MEXICO', 'MX'], ['PERÚ', 'PE'], ['PERU', 'PE'], ['CHILE', 'CL'], ['ECUADOR', 'EC'],
  ['ESPAÑA', 'ES'], ['SPAIN', 'ES'], ['BOLIVIA', 'BO'], ['PARAGUAY', 'PY'],
  ['URUGUAY', 'UY'], ['BRASIL', 'BR'], ['BRAZIL', 'BR'], ['GUATEMALA', 'GT'],
  ['HONDURAS', 'HN'], ['DOMINICANA', 'DO'], ['COSTA RICA', 'CR'], ['PANAMÁ', 'PA'],
  ['PANAMA', 'PA'], ['NICARAGUA', 'NI'], ['EL SALVADOR', 'SV'], ['CUBA', 'CU'],
  ['PUERTO RICO', 'PR'], ['USA', 'US'], ['UNITED STATES', 'US'], ['ESTADOS UNIDOS', 'US'],
  ['CANADA', 'CA'], ['CANADÁ', 'CA'], ['ITALIA', 'IT'], ['ITALY', 'IT'], ['FRANCIA', 'FR'],
  ['FRANCE', 'FR'], ['ALEMANIA', 'DE'], ['GERMANY', 'DE'], ['PORTUGAL', 'PT'],
  ['ENGLAND', 'GB'], ['UK', 'GB'], ['REINO UNIDO', 'GB'], ['RUSSIA', 'RU'],
  ['RUSIA', 'RU'], ['TURKEY', 'TR'], ['TURQUIA', 'TR'], ['POLAND', 'PL'],
  ['POLONIA', 'PL'], ['ROMANIA', 'RO'], ['RUMANIA', 'RO'], ['INDONESIA', 'ID'],
  ['PHILIPPINES', 'PH'], ['FILIPINAS', 'PH'], ['INDIA', 'IN'], ['CHINA', 'CN'],
  ['JAPAN', 'JP'], ['JAPÓN', 'JP'], ['KOREA', 'KR'], ['COREA', 'KR'],
  ['VIETNAM', 'VN'], ['THAILAND', 'TH'], ['EGYPT', 'EG'], ['EGIPTO', 'EG'],
  ['MOROCCO', 'MA'], ['MARRUECOS', 'MA'], ['AUSTRALIA', 'AU'], ['NETHERLANDS', 'NL'], ['HOLANDA', 'NL'],
];

function guessCountryCode(name) {
  const upper = name.toUpperCase();
  const hit = COUNTRY_HINTS.find(([needle]) => upper.includes(needle));
  return hit ? hit[1] : 'WW';
}

function countryCodeToDisplay(code) {
  if (!code || code === 'WW') return '🌐';
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const base = 0x1f1e6;
  const chars = [...code].map((c) => String.fromCodePoint(base + (c.charCodeAt(0) - 65)));
  return chars.join('');
}

function resolveRoomUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) return trimmed;
  const code = trimmed.replace(/^\?c=/, '').replace(/^c=/, '');
  return `https://www.haxball.com/play?c=${encodeURIComponent(code)}`;
}

function isDirectJoinInput(value) {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('http')) return true;
  return /^[a-zA-Z0-9_-]{14,}$/.test(v) && /[0-9]/.test(v) && /[a-zA-Z]/.test(v);
}

function matchPinned(pinned, rooms) {
  if (!pinned.match) return null;
  const needle = pinned.match.toUpperCase();
  return rooms.find((r) => r.name.toUpperCase().includes(needle)) || null;
}

function roomCardHtml(r) {
  return `<div class="room-card">
    <div class="room-flag" title="${guessCountryCode(r.name)}">${countryCodeToDisplay(guessCountryCode(r.name))}</div>
    <div class="room-main">
      <div class="room-name">${escapeHtml(r.name)}</div>
      <div class="room-meta">
        <span class="chip">${r.players}/${r.maxPlayers} jugadores</span>
        ${r.hasPassword ? '<span class="chip chip-lock">Con clave</span>' : ''}
        ${r.distanceKm != null ? `<span class="chip">${r.distanceKm} km</span>` : ''}
      </div>
    </div>
    <span class="room-pill room-pill-live">LIVE</span>
    <div class="room-actions">
      ${r.url ? `<button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(r.url)}" title="Copiar link">Copiar</button>` : ''}
      <button class="primary-btn room-join-btn" data-join-name="${escapeHtml(r.name)}" data-join-url="${escapeHtml(r.url || '')}">Jugar</button>
    </div>
  </div>`;
}

function pinnedCardHtml(pinned, live, index) {
  const removeBtn = `<button class="ghost-btn pin-remove-btn" data-unpin-index="${index}" title="Desanclar">Quitar</button>`;
  if (pinned.url) {
    return `<div class="room-card room-card-pinned">
      <div class="room-flag room-flag-text" aria-hidden="true">URL</div>
      <div class="room-main">
        <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
        <div class="room-meta"><span class="chip">Acceso directo por link</span></div>
      </div>
      <span class="room-pill room-pill-direct">DIRECTO</span>
      <div class="room-actions">
        <button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(pinned.url)}" title="Copiar link">Copiar</button>
        <button class="primary-btn room-join-btn" data-join-url="${escapeHtml(pinned.url)}" data-join-label="${escapeHtml(pinned.label)}">Jugar</button>
        ${removeBtn}
      </div>
    </div>`;
  }
  if (live) {
    return `<div class="room-card room-card-pinned">
      <div class="room-flag" title="${guessCountryCode(live.name)}">${countryCodeToDisplay(guessCountryCode(live.name))}</div>
      <div class="room-main">
        <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
        <div class="room-meta">
          <span class="chip">${live.players}/${live.maxPlayers} jugadores</span>
          ${live.distanceKm != null ? `<span class="chip">${live.distanceKm} km</span>` : ''}
        </div>
      </div>
      <span class="room-pill room-pill-live">LIVE</span>
      <div class="room-actions">
        ${live.url ? `<button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(live.url)}" title="Copiar link">Copiar</button>` : ''}
        <button class="primary-btn room-join-btn" data-join-name="${escapeHtml(live.name)}" data-join-url="${escapeHtml(live.url || '')}">Jugar</button>
        ${removeBtn}
      </div>
    </div>`;
  }
  return `<div class="room-card room-card-pinned room-card-offline">
    <div class="room-flag room-flag-text" aria-hidden="true">PIN</div>
    <div class="room-main">
      <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
      <div class="room-meta"><span class="chip">Sin host</span></div>
    </div>
    <span class="room-pill room-pill-offline">OFFLINE</span>
    <div class="room-actions">
      <button class="ghost-btn" disabled>Jugar</button>
      ${removeBtn}
    </div>
  </div>`;
}

function directJoinCardHtml(query) {
  const url = resolveRoomUrl(query);
  return `<div class="room-card room-card-direct">
    <div class="room-flag room-flag-text" aria-hidden="true">URL</div>
    <div class="room-main">
      <div class="room-name">Entrar directo</div>
      <div class="room-meta"><span class="chip">${escapeHtml(query)}</span></div>
    </div>
    <div class="room-actions">
      <button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(url)}" title="Copiar link">Copiar</button>
      <button class="primary-btn room-join-btn" data-join-url="${escapeHtml(url)}">Entrar</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Salas fijadas
// ---------------------------------------------------------------------------
let pinnedRooms = Array.isArray(PINNED_ROOMS) ? PINNED_ROOMS.slice() : [];

async function loadPinnedRooms() {
  try {
    const stored = await window.vivet.getConfig('pinnedRooms', null);
    if (Array.isArray(stored)) pinnedRooms = stored;
  } catch (_) {}
  renderRoomList();
}

function savePinnedRooms() {
  window.vivet.setConfig('pinnedRooms', pinnedRooms).catch(() => {});
}

function addPinnedRoom(label, matchOrLink) {
  const l = label.trim();
  const raw = matchOrLink.trim();
  if (!l || !raw) return;
  if (isDirectJoinInput(raw)) {
    pinnedRooms.push({ label: l, url: resolveRoomUrl(raw) });
  } else {
    pinnedRooms.push({ label: l, match: raw });
  }
  savePinnedRooms();
  renderRoomList();
  showToast(`"${l}" fijada`, 'ok');
}

function removePinnedRoom(index) {
  const removed = pinnedRooms[index];
  pinnedRooms.splice(index, 1);
  savePinnedRooms();
  renderRoomList();
  if (removed) showToast(`"${removed.label}" desanclada`);
}
loadPinnedRooms();

const pinAddBtn = $('#pin-add-btn');
const pinLabelInput = $('#pin-label-input');
const pinMatchInput = $('#pin-match-input');
pinAddBtn?.addEventListener('click', () => {
  addPinnedRoom(pinLabelInput.value, pinMatchInput.value);
  pinLabelInput.value = '';
  pinMatchInput.value = '';
});

function markUpdatedNow() {
  if (!lastUpdatedEl) return;
  const now = new Date();
  lastUpdatedEl.textContent = `actualizado ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function renderRoomList() {
  const query = searchInput.value;
  const parts = [];

  if (isDirectJoinInput(query)) {
    parts.push(directJoinCardHtml(query.trim()));
  }

  pinnedRooms.forEach((pinned, index) => {
    const live = pinned.url ? null : matchPinned(pinned, allRoomsCache);
    parts.push(pinnedCardHtml(pinned, live, index));
  });

  let list = allRoomsCache.slice();
  const q = query.trim().toLowerCase();
  if (q && !isDirectJoinInput(query)) {
    list = list.filter((r) => r.name.toLowerCase().includes(q));
  }
  const sortBy = sortSelect.value;
  list.sort((a, b) => {
    if (sortBy === 'distance') return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.players - a.players;
  });

  if (list.length) {
    parts.push(...list.map(roomCardHtml));
  } else if (!pinnedRooms.length && !isDirectJoinInput(query)) {
    parts.push(`<div class="room-list-empty">${
      allRoomsCache.length ? 'Sin resultados para esa búsqueda.' : 'Cargando salas en vivo…'
    }</div>`);
  }

  roomListEl.innerHTML = parts.join('');

  // NOTA: un botón "Jugar" de sala pública puede tener a la vez
  // data-join-name (para el auto-click de Vivet dentro del juego) y
  // data-join-url (la URL real, scrapeada de la lista, para poder copiar
  // el link después) - por eso data-join-name tiene prioridad acá, si no
  // los dos listeners se dispararían juntos.
  roomListEl.querySelectorAll('[data-join-name]').forEach((btn) => {
    btn.addEventListener('click', () => joinByName(btn.dataset.joinName, btn.dataset.joinUrl || null));
  });
  roomListEl.querySelectorAll('[data-join-url]:not([data-join-name])').forEach((btn) => {
    btn.addEventListener('click', () => joinByUrl(btn.dataset.joinUrl, btn.dataset.joinLabel));
  });
  roomListEl.querySelectorAll('[data-unpin-index]').forEach((btn) => {
    btn.addEventListener('click', () => removePinnedRoom(Number(btn.dataset.unpinIndex)));
  });
  roomListEl.querySelectorAll('[data-copy-url]').forEach((btn) => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.copyUrl, 'Link de la sala copiado'));
  });
  roomListEl.querySelectorAll('[data-copy-name]').forEach((btn) => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.copyName, 'Nombre de la sala copiado'));
  });

  if (statPlayersEl) {
    if (currentRoomsData.totalPlayers != null) {
      statPlayersEl.textContent = currentRoomsData.totalPlayers.toLocaleString('es');
    } else if (allRoomsCache.length) {
      statPlayersEl.textContent = String(allRoomsCache.reduce((sum, r) => sum + r.players, 0));
    } else {
      statPlayersEl.textContent = '—';
    }
  }
}

const JOIN_CONFIRM_TIMEOUT_MS = 6000;
const JOIN_CONFIRM_INTERVAL_MS = 250;
const JOIN_LATE_WATCH_MS = 15000;

function waitForJoinConfirm(timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = async () => {
      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      try {
        // Si Haxball te pide nickname justo en este momento, lo cerramos
        // solos en cada vuelta - si no, se queda trabado atrás (invisible,
        // porque el juego todavía está tapado por el panel de Vivet acá)
        // y el proceso entero se siente lento hasta que expira el timeout.
        await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
        const results = await execInAllFrames(buildLobbyCheckScript());
        const stillLobby = results.some((r) => r.ok && r.value === true);
        if (!stillLobby) {
          resolve(true);
          return;
        }
      } catch (_) {}
      setTimeout(check, JOIN_CONFIRM_INTERVAL_MS);
    };
    check();
  });
}

async function joinByName(name, url) {
  currentRoomName = name || null;
  currentRoomUrl = url || null;
  await execInGame(buildJoinScript(name)).catch(() => {});
  joinedAt = Date.now();

  let confirmed = await waitForJoinConfirm(JOIN_CONFIRM_TIMEOUT_MS);
  if (!confirmed) {
    confirmed = await waitForJoinConfirm(JOIN_LATE_WATCH_MS);
  }

  if (confirmed) {
    setPlaying(true);
    updateDiscordPresence(currentRoomCode(), currentRoomName);
    updateRoomNameBadge(currentRoomCode(), currentRoomName);
  } else {
    currentRoomName = null;
    currentRoomUrl = null;
    showToast('No se pudo entrar a esa sala automáticamente. Probá de nuevo.');
  }
}

function joinByUrl(url, name) {
  currentRoomName = name || null;
  currentRoomUrl = url || null;
  joinedAt = Date.now();
  view.loadURL(url);
}

// ---------------------------------------------------------------------------
// Crear sala (te lleva a la pantalla nativa "Create room" de Haxball -
// no completa nada, lo llenás vos ahí mismo)
// ---------------------------------------------------------------------------
const createRoomBtn = $('#create-room-btn');
const createRoomStatusEl = $('#create-room-status');

// Haxball no tiene un botón separado que "abra" un diálogo de crear sala -
// el formulario (nombre/máx. jugadores/contraseña/pública + botón
// "Create Room") ya está en la pantalla principal, pero parece quedar sin
// activarse hasta que hay alguna interacción real con la página (lo mismo
// que "despierta" la lista de salas al tocar "Jugar" en una fila). Con esto
// simulamos esa misma interacción genérica.
function wakeUpLobbyInPage() {
  try {
    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return 'ok';
  } catch (e) {
    return 'error:' + String((e && e.message) || e);
  }
}

function buildWakeUpLobbyScript() {
  return '(' + wakeUpLobbyInPage.toString() + ')();';
}

// CORREGIDO (27/09) - wakeUpLobbyInPage sola te deja mirando la lista de
// salas de siempre (el "click genérico" despierta la página, pero no te
// lleva a donde está el formulario de crear sala si ese formulario vive en
// otra pestaña/sección del lobby). Esto intenta, además: 1) clickear una
// pestaña/botón de "crear sala" si existe como algo separado de la lista,
// y 2) si hay un botón "Create room" en algún lado de la página, scrollear
// hasta ahí y poner el foco en el primer input de texto del formulario
// (el nombre de la sala), para que aterrices ahí en vez del tope de la
// lista. Es heurístico - busca por texto, no por clases puntuales, porque
// no tenemos forma de inspeccionar el DOM real de haxball.com/play desde
// acá. Si no encuentra nada, no rompe nada (falla en silencio).
function focusCreateRoomInPage() {
  try {
    var clickables = Array.from(document.querySelectorAll('a, button, [role="tab"], li, div'));
    var createTab = clickables.find(function (t) {
      var text = (t.innerText || t.textContent || '').trim();
      return /^(create\s*room|new\s*room|crear\s*sala|nueva\s*sala|create)$/i.test(text) && text.length < 30;
    });
    if (createTab) {
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
        try {
          createTab.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      });
    }

    var createBtn = Array.from(document.querySelectorAll('button, input[type=submit], a')).find(function (b) {
      var t = (b.innerText || b.value || b.textContent || '').trim();
      return /^create\s*room$/i.test(t);
    });
    if (createBtn) {
      createBtn.scrollIntoView({ block: 'center' });
      var container = createBtn.closest('form') || createBtn.closest('div') || createBtn.parentElement;
      var nameInput = container ? container.querySelector('input[type=text], input:not([type])') : null;
      if (nameInput) {
        nameInput.scrollIntoView({ block: 'center' });
        nameInput.focus();
      }
      return true;
    }
    return !!createTab;
  } catch (e) {
    return false;
  }
}

function buildFocusCreateRoomScript() {
  return '(' + focusCreateRoomInPage.toString() + ')();';
}

createRoomBtn?.addEventListener('click', async () => {
  if (!createRoomStatusEl) return;

  createRoomBtn.disabled = true;
  createRoomStatusEl.textContent = 'Abriendo Haxball...';

  // Mostramos el juego real (donde va a aparecer el diálogo nativo "Create
  // room" de Haxball) para que lo completes vos mismo ahí. creatingRoom
  // frena la detección de "volviste al lobby" mientras tanto - el diálogo
  // de Haxball queda encima del lobby, así que sin esto Vivet pensaría que
  // saliste al toque y te devolvería a su panel antes de que puedas ni ver
  // el diálogo.
  creatingRoom = true;
  setPlaying(true);
  createRoomStatusEl.textContent = 'Completá el formulario de Haxball ahí adentro.';

  try {
    await execInAllFrames(buildWakeUpLobbyScript()).catch(() => {});
    // Un par de intentos con delay, por si la pestaña/formulario de crear
    // sala tarda un toque en aparecer después de "despertar" la página.
    for (let i = 0; i < 3; i++) {
      await execInAllFrames(buildFocusCreateRoomScript()).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    }

    // Esperamos (hasta 2 minutos, porque acá lo completa una persona a
    // mano) a que Haxball confirme que se creó la sala.
    const confirmed = await waitForJoinConfirm(120000);
    creatingRoom = false;

    if (confirmed) {
      joinedAt = Date.now();
      currentRoomName = null; // no sabemos el nombre real que puso adentro
      updateDiscordPresence(currentRoomCode(), null);
      updateRoomNameBadge(currentRoomCode(), null);
      createRoomStatusEl.textContent = 'Sala creada.';
      showToast('Sala creada', 'ok');
    } else {
      setPlaying(false);
      createRoomStatusEl.textContent = 'No detectamos que se haya creado la sala. Si la cancelaste no pasa nada, probá de nuevo.';
    }
  } catch (err) {
    createRoomStatusEl.textContent = 'Error inesperado: ' + String((err && err.message) || err);
    creatingRoom = false;
    setPlaying(false);
  } finally {
    createRoomBtn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Nickname Auto-Dismiss
// ---------------------------------------------------------------------------
let currentNickname = null;
const nicknameInput = $('#nickname-input');
const nicknameSaveBtn = $('#nickname-save-btn');

async function loadNickname() {
  let saved = null;
  try {
    saved = await window.vivet.getConfig('nickname', null);
  } catch (_) {}
  if (!saved) {
    saved = 'Jugador' + Math.floor(1000 + Math.random() * 9000);
    window.vivet.setConfig('nickname', saved).catch(() => {});
  }
  currentNickname = saved;
  if (nicknameInput) nicknameInput.value = saved;
}
loadNickname();

nicknameSaveBtn?.addEventListener('click', async () => {
  const val = (nicknameInput?.value || '').trim();
  if (!val) {
    showToast('Escribí un nickname primero');
    return;
  }
  currentNickname = val;
  await window.vivet.setConfig('nickname', val).catch(() => {});
  showToast('Nickname guardado', 'ok');
});

function dismissNicknamePromptInPage(nickname) {
  try {
    var bodyText = document.body.innerText || '';
    if (!/choose\s*nickname/i.test(bodyText)) return 'no-prompt';
    var inputs = Array.from(document.querySelectorAll('input'));
    var input = inputs.find(function (i) {
      var type = (i.type || 'text').toLowerCase();
      return type === 'text' || type === '';
    }) || inputs[0];
    if (!input) return 'no-input';

    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, nickname);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    var clickable = Array.from(document.querySelectorAll('button, a, div, span, input[type="button"], input[type="submit"]'));
    var okBtn = clickable.find(function (b) {
      var t = (b.innerText || b.value || b.textContent || '').trim();
      return /^ok$/i.test(t);
    });
    if (okBtn) {
      okBtn.click();
      return 'clicked';
    }

    ['keydown', 'keyup'].forEach(function (type) {
      input.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true,
      }));
    });
    return 'enter';
  } catch (e) {
    return 'error:' + String((e && e.message) || e);
  }
}

function buildDismissNicknameScript(nickname) {
  return '(' + dismissNicknamePromptInPage.toString() + ')(' + JSON.stringify(nickname) + ');';
}

// ---------------------------------------------------------------------------
// Polling de Salas
// ---------------------------------------------------------------------------
let lastScrapeDebug = [];

async function pollRoomsOnce() {
  try {
    await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
    const results = await execInAllFrames(buildScrapeScript());
    lastScrapeDebug = results;
    let best = null;
    let bestCount = -1;
    let bestFrame = null;
    for (const r of results) {
      if (!r.ok) continue;
      try {
        const data = JSON.parse(r.value);
        const count = (data.rooms || []).length;
        if (count > bestCount) {
          bestCount = count;
          best = data;
          bestFrame = r.frameTreeNodeId;
        }
      } catch (_) {}
    }
    if (best && bestCount > 0) {
      allRoomsCache = best.rooms || [];
      currentRoomsData = best;
      gameFrameHint = bestFrame;
      markUpdatedNow();
      if (!hasScrapedRoomsOnce) {
        hasScrapedRoomsOnce = true;
        if (roomPollTimer) {
          clearInterval(roomPollTimer);
          roomPollTimer = setInterval(pollRoomsOnce, ROOM_POLL_INTERVAL_MS);
        }
      }
    }
  } catch (_) {}
  renderRoomList();
}

const ROOM_POLL_INTERVAL_MS = 6000;
const ROOM_POLL_FAST_INTERVAL_MS = 1500;
let hasScrapedRoomsOnce = false;

function startRoomPolling() {
  if (roomPollTimer) return;
  const interval = hasScrapedRoomsOnce ? ROOM_POLL_INTERVAL_MS : ROOM_POLL_FAST_INTERVAL_MS;
  pollRoomsOnce();
  roomPollTimer = setInterval(pollRoomsOnce, interval);
}

function stopRoomPolling() {
  if (roomPollTimer) {
    clearInterval(roomPollTimer);
    roomPollTimer = null;
  }
}

function pokeRoomPolling() {
  pollRoomsOnce();
}
startRoomPolling();

searchInput.addEventListener('input', renderRoomList);
sortSelect.addEventListener('change', renderRoomList);
refreshBtn.addEventListener('click', () => pollRoomsOnce());
searchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const direct = isDirectJoinInput(searchInput.value) ? resolveRoomUrl(searchInput.value) : null;
  if (direct) joinByUrl(direct);
});


// ---------------------------------------------------------------------------
// Eventos del webview del juego
// (las inyecciones de rendimiento - rAF, FPS, ads - están en optimizations.js)
// ---------------------------------------------------------------------------
view.addEventListener('dom-ready', () => {
  VivetPerf.injectIntoGame();
  applyCountryOverride();
  applyCustomGameCssSetting();
  handleNavigate();
  pokeRoomPolling();
  if (appRoot.classList.contains('playing')) focusGameView();
});
view.addEventListener('did-navigate', handleNavigate);
view.addEventListener('did-navigate-in-page', handleNavigate);
view.addEventListener('did-frame-navigate', () => {
  VivetPerf.injectIntoGame();
  applyCustomGameCssSetting();
});

// ---------------------------------------------------------------------------
// Mi cuenta / Auth de Haxball (solo ID público)
// ---------------------------------------------------------------------------
// Un solo botón: la primera vez lee y muestra el ID público, la siguiente lo
// oculta (y borra del DOM). La clave privada solo viaja hacia main.js al
// importar y nunca vuelve al renderer. Ver main.js (auth-read / auth-import).
const authToggleBtn = $('#auth-refresh-btn');
const authGuessesEl = $('#auth-guesses');
const authKeyInput = $('#auth-key-input');
const authApplyBtn = $('#auth-apply-btn');
const authRestoreBtn = $('#auth-restore-btn');
let authVisible = false;
let authBusy = false;

function showAuthResult(publicId) {
  authVisible = true;
  if (authToggleBtn) authToggleBtn.textContent = 'Ocultar Auth';
  authGuessesEl.innerHTML = `
    <div class="auth-box">
      <h3>ID público <span>Tu Auth</span></h3>
      <p>${escapeHtml(publicId)}</p>
      <button class="auth-copy-item" data-value="${escapeHtml(publicId)}">Copiar Auth</button>
    </div>`;
  authGuessesEl.querySelector('.auth-copy-item').addEventListener('click', (e) => {
    copyToClipboard(e.target.dataset.value, 'Auth copiado');
  });
}

function setAuthBusy(busy) {
  authBusy = busy;
  [authToggleBtn, authApplyBtn, authRestoreBtn].forEach((b) => { if (b) b.disabled = busy; });
}

async function runAuthAction(label, action, okMessage) {
  if (authBusy) return null;
  setAuthBusy(true);
  if (authGuessesEl) authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(label)}</div>`;
  try {
    const res = await action();
    if (authRestoreBtn) authRestoreBtn.style.display = res && res.hasBackup ? '' : 'none';
    if (!res || !res.ok) {
      const msg = (res && res.error) || 'Error desconocido';
      authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(msg)}</div>`;
      authVisible = false;
      if (authToggleBtn) authToggleBtn.textContent = 'Ver mi Auth';
      return null;
    }
    showAuthResult(res.publicId);
    if (okMessage) showToast(okMessage, 'ok');
    return res;
  } catch (err) {
    authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(String((err && err.message) || err))}</div>`;
    return null;
  } finally {
    setAuthBusy(false);
  }
}

authApplyBtn?.addEventListener('click', async () => {
  const key = (authKeyInput?.value || '').trim();
  if (!key) { showToast('Pegá primero tu clave privada (empieza con "idkey.")'); return; }
  const res = await runAuthAction('Importando...', () => window.vivet.importAuth(key), 'Auth importado');
  if (res) {
    authKeyInput.value = '';
    try { view.reload(); } catch (_) {} // el juego lee la clave al cargar
  }
});

authRestoreBtn?.addEventListener('click', async () => {
  const res = await runAuthAction('Restaurando...', () => window.vivet.restoreAuth(), 'Auth anterior restaurado');
  if (res) { try { view.reload(); } catch (_) {} }
});

function hideAuth() {
  authVisible = false;
  if (authGuessesEl) authGuessesEl.innerHTML = '';
  if (authToggleBtn) authToggleBtn.textContent = 'Ver mi Auth';
}

authToggleBtn?.addEventListener('click', () => {
  if (authBusy) return;
  if (authVisible) { hideAuth(); return; }
  runAuthAction('Leyendo...', () => window.vivet.readAuth());
});

// Al salir del panel "Mi cuenta" el Auth se vuelve a ocultar solo.
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.panel !== 'panel-cuenta' && authVisible) hideAuth();
  });
});

// ---------------------------------------------------------------------------
// Mi país (bandera/ubicación que Haxball muestra de vos)
// ---------------------------------------------------------------------------
// Haxball guarda su ubicación en localStorage.geo como {lat, lon, code}. Se
// pisa ese valor en el webview y se recarga el juego. Sin selección
// ("Automático") se borra la clave y Haxball vuelve a detectarla solo.
const COUNTRIES = [
  ['ar', 'Argentina', -34.6, -58.4], ['bo', 'Bolivia', -16.5, -68.1], ['br', 'Brasil', -15.8, -47.9],
  ['cl', 'Chile', -33.4, -70.6], ['co', 'Colombia', 4.7, -74.1], ['cr', 'Costa Rica', 9.9, -84.1],
  ['cu', 'Cuba', 23.1, -82.4], ['do', 'República Dominicana', 18.5, -69.9], ['ec', 'Ecuador', -0.2, -78.5],
  ['sv', 'El Salvador', 13.7, -89.2], ['gt', 'Guatemala', 14.6, -90.5], ['hn', 'Honduras', 14.1, -87.2],
  ['mx', 'México', 19.4, -99.1], ['ni', 'Nicaragua', 12.1, -86.3], ['pa', 'Panamá', 9.0, -79.5],
  ['py', 'Paraguay', -25.3, -57.6], ['pe', 'Perú', -12.0, -77.0], ['pr', 'Puerto Rico', 18.5, -66.1],
  ['uy', 'Uruguay', -34.9, -56.2], ['ve', 'Venezuela', 10.5, -66.9],
  ['es', 'España', 40.4, -3.7], ['pt', 'Portugal', 38.7, -9.1], ['fr', 'Francia', 48.9, 2.35],
  ['de', 'Alemania', 52.5, 13.4], ['it', 'Italia', 41.9, 12.5], ['gb', 'Reino Unido', 51.5, -0.12],
  ['nl', 'Países Bajos', 52.4, 4.9], ['pl', 'Polonia', 52.2, 21.0], ['ro', 'Rumania', 44.4, 26.1],
  ['gr', 'Grecia', 37.98, 23.7], ['tr', 'Turquía', 39.9, 32.9], ['ua', 'Ucrania', 50.45, 30.5],
  ['ru', 'Rusia', 55.75, 37.6], ['us', 'Estados Unidos', 38.9, -77.0], ['ca', 'Canadá', 45.4, -75.7],
  ['ma', 'Marruecos', 34.0, -6.8], ['il', 'Israel', 31.8, 35.2], ['jp', 'Japón', 35.7, 139.7],
  ['kr', 'Corea del Sur', 37.6, 127.0],
];
const countrySelect = $('#country-select');
const countryApplyBtn = $('#country-apply-btn');

function applyGeoInPage(geo) {
  try {
    if (geo) localStorage.setItem('geo', JSON.stringify(geo));
    else localStorage.removeItem('geo');
    return true;
  } catch (e) {
    return false;
  }
}
function geoForCode(code) {
  const c = COUNTRIES.find((x) => x[0] === code);
  return c ? { lat: c[2], lon: c[3], code: c[0] } : null;
}
async function applyCountryOverride() {
  let code = '';
  try { code = await window.vivet.getConfig('countryCode', ''); } catch (_) {}
  if (!code) return; // Automático: no tocamos nada
  execInAllFrames('(' + applyGeoInPage.toString() + ')(' + JSON.stringify(geoForCode(code)) + ');').catch(() => {});
}

if (countrySelect) {
  countrySelect.innerHTML = '<option value="">Automático (por IP)</option>' +
    COUNTRIES.map((c) => `<option value="${c[0]}">${escapeHtml(c[1])}</option>`).join('');
  window.vivet.getConfig('countryCode', '').then((v) => { countrySelect.value = v || ''; }).catch(() => {});
}
countryApplyBtn?.addEventListener('click', async () => {
  const code = countrySelect?.value || '';
  await window.vivet.setConfig('countryCode', code).catch(() => {});
  try {
    await execInAllFrames('(' + applyGeoInPage.toString() + ')(' + JSON.stringify(geoForCode(code)) + ');');
  } catch (_) {}
  showToast(code ? 'País aplicado, recargando el juego…' : 'País automático, recargando el juego…', 'ok');
  try { view.reload(); } catch (_) {}
});

// ---------------------------------------------------------------------------
// Discord Rich Presence - CORREGIDO
// ---------------------------------------------------------------------------

$('#discord-join-btn')?.addEventListener('click', () => {
  window.vivet.openExternal(DISCORD_INVITE_URL);
});

// El panel de Discord se eliminó: si no existe el elemento de estado, se usa
// un objeto suelto para que la conexión de Rich Presence siga funcionando.
const discordStatus = $('#discord-status') || { textContent: '', className: '' };
let discordConnected = false;
let discordRetryTimer = null;

async function connectDiscord() {
  if (!discordStatus) return;
  
  if (!DISCORD_CLIENT_ID) {
    discordStatus.textContent = 'Sin Client ID (configuralo en renderer/config.js)';
    discordStatus.className = 'status';
    return;
  }

  discordStatus.textContent = 'Conectando...';
  discordStatus.className = 'status';
  
  const res = await window.vivet.discordConnect(DISCORD_CLIENT_ID);
  
  if (res.ok) {
    discordConnected = true;
    discordStatus.textContent = 'Conectado';
    discordStatus.className = 'status ok';
    updateDiscordPresence(currentRoomCode(), currentRoomName);
  } else {
    discordConnected = false;
    discordStatus.textContent = 'Error: ' + res.error;
    discordStatus.className = 'status err';
  }

  // CORREGIDO: El timer de reintento ahora se inicializa correctamente de forma segura
  if (!discordRetryTimer) {
    discordRetryTimer = setInterval(() => {
      if (!discordConnected && DISCORD_CLIENT_ID) {
        connectDiscord();
      }
    }, 20000);
  }
}

function updateDiscordPresence(code, roomName) {
  if (!DISCORD_CLIENT_ID) return;
  
  const buttons = [];
  if (DISCORD_INVITE_URL && !DISCORD_INVITE_URL.includes('TU_INVITE_AQUI')) {
    buttons.push({ label: 'Unirse al Discord', url: DISCORD_INVITE_URL });
  }

  // CORREGIDO (27/09) - esto decidía "Jugando" vs "En el menú" mirando
  // solo `code` (el ?c= de la URL). Pero al entrar a una sala pública
  // haciendo click en la lista (el flujo más común, ver joinByName) Haxball
  // nunca navega la URL - es un SPA - así que `code` se quedaba en null
  // aunque estuvieras jugando de verdad, y el Rich Presence se quedaba
  // trabado en "Buscando sala" para siempre, sin mostrar nunca la sala. El
  // estado real de "estás jugando" ya lo sabe Vivet por su cuenta (la
  // clase .playing en appRoot), así que ahora se usa eso en vez de code.
  const playing = appRoot.classList.contains('playing');
  if (replayMode) {
    window.vivet.discordSetActivity({
      details: 'Viendo un replay',
      state: 'Reproductor de replays',
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
    });
    return;
  }
  // MUESTRA EL NOMBRE DE LA SALA EN EL ESTADO
  const label = roomName ? `Sala: ${roomName}` : (code ? `Código: ${code}` : 'Conectando…');

  window.vivet.discordSetActivity(
    playing ? {
      details: 'Jugando',
      state: label,
      // Usamos joinedAt para que el tiempo no se reinicie a 00:00 cada vez
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
      buttons: buttons.length ? buttons : undefined,
    } : {
      details: 'En el menú principal',
      state: 'Buscando sala',
      startTimestamp: Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
      buttons: buttons.length ? buttons : undefined,
    }
  );
}

// ---------------------------------------------------------------------------
// Nombre real de la sala, leído de la propia página (fallback / verificación)
// ---------------------------------------------------------------------------
// El <h1> dentro de .room-view > .container es el título que Haxball
// muestra de la sala en la que estás - lo sabemos porque config.js ya le
// pisa estilos a propósito (".room-view > .container > h1"). Lo usamos
// como fuente de verdad del nombre real, en vez de depender solo de lo que
// Vivet scrapeó de la lista antes de entrar (que puede fallar si entraste
// por una sala fijada sin nombre real, por link directo, o si el host
// cambió el nombre después).
function roomTitleInPage() {
  try {
    var h1 = document.querySelector('.room-view > .container > h1');
    var text = h1 ? (h1.textContent || '').trim() : '';
    return text || null;
  } catch (e) {
    return null;
  }
}
function buildRoomTitleScript() {
  return '(' + roomTitleInPage.toString() + ')();';
}

async function refreshRoomTitleFromPage() {
  if (!appRoot.classList.contains('playing')) return;
  try {
    const results = await execInAllFrames(buildRoomTitleScript());
    const found = results.find((r) => r.ok && r.value);
    if (found && found.value && found.value !== currentRoomName) {
      currentRoomName = found.value;
      updateRoomNameBadge(currentRoomCode(), currentRoomName);
      updateDiscordPresence(currentRoomCode(), currentRoomName);
    }
  } catch (_) {}
}
// Revisión periódica mientras estás jugando, por si el título tarda en
// aparecer o cambia (ej: el host renombra la sala).
setInterval(refreshRoomTitleFromPage, VIVET_PERF.TITLE_REFRESH_INTERVAL_MS);

// Iniciar la conexión inicial
connectDiscord();


// ---------------------------------------------------------------------------
// CSS Personalizado dentro del juego (la ocultación de publicidad vive en optimizations.js)
// ---------------------------------------------------------------------------
function applyCustomGameCssInPage(cssText) {
  try {
    var id = 'vivet-custom-game-css';
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText || '';
    return true;
  } catch (e) {
    return false;
  }
}

function buildCustomGameCssScript(cssText) {
  return '(' + applyCustomGameCssInPage.toString() + ')(' + JSON.stringify(cssText || '') + ');';
}

function applyCustomGameCssSetting() {
  if (typeof CUSTOM_GAME_CSS === 'undefined' || !CUSTOM_GAME_CSS || !CUSTOM_GAME_CSS.trim()) return;
  execInAllFrames(buildCustomGameCssScript(CUSTOM_GAME_CSS)).catch(() => {});
}