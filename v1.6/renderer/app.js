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

// Si el teclado queda en la capa de Vivet (host) en vez de en el webview del
// juego, las teclas llegan con delay o no llegan. Estos avisos devuelven el
// foco al juego sin simular clicks: al volver a la ventana, al soltar el mouse
// sobre el área del juego y cuando una tecla cae en el documento de Vivet
// mientras se juega (fuera de inputs).
(() => {
  let last = 0;
  const softFocus = () => {
    if (!appRoot.classList.contains('playing')) return;
    const now = Date.now();
    if (now - last < 150) return;
    last = now;
    try {
      const id = view.getWebContentsId();
      if (id != null) window.vivet.focusWebviewSoft?.(id).catch(() => {});
    } catch (_) {}
  };
  const editable = (t) => !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
  window.addEventListener('focus', softFocus);
  document.addEventListener('pointerup', (e) => {
    if (e.target.closest && e.target.closest('.game-wrap')) softFocus();
  }, true);
  document.addEventListener('keydown', (e) => { if (!editable(e.target)) softFocus(); }, true);
})();



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
    // "Crear sala" no es un panel para leer: lleva directo al diálogo de Haxball.
    if (btn.dataset.panel === 'panel-crear' && typeof startCreateRoom === 'function') startCreateRoom();
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
const JOIN_OVERLAY_MAX_MS = 12000; // techo, para no quedar tapado para siempre si algo no matchea
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
    if (document.querySelector('.room-view') || document.querySelector('.game-state-view')) return true;
    // CORREGIDO (28/09) - al entrar por link, si Haxball muestra algo que
    // necesita que lo veas (captcha, clave de sala, "Room closed"...) el
    // overlay lo tapaba hasta el techo de tiempo y parecía que "no mostraba
    // nada". Esos casos cuentan como "ya hay algo para mostrar". El pedido
    // de nickname NO cuenta: ese lo completa Vivet solo.
    var txt = (document.body && document.body.innerText) || '';
    if (/choose\s*nickname/i.test(txt)) return false;
    if (document.querySelector('iframe[src*="recaptcha"], iframe[title*="recaptcha" i], .g-recaptcha')) return true;
    if (document.querySelector('.dialog') && /password|captcha|robot|closed|full|banned|kicked|error|failed/i.test(txt)) return true;
    return false;
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
      // CORREGIDO (28/09) - entrando por link nadie completaba el "Choose
      // nickname" (el sondeo de salas se frena al pasar a "playing"), así que
      // la pantalla quedaba tapada hasta el timeout. Se completa acá también.
      await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
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
let leaveTick = 0;
async function checkLeftRoom() {
  if (!appRoot.classList.contains('playing') || creatingRoom || replayMode) return;
  if (Date.now() - joinedAt < LEAVE_GRACE_MS) return;
  if (leaveCheckInFlight) return;
  leaveCheckInFlight = true;
  try {
    // Optimización: normalmente alcanza con preguntarle al frame del juego (ya
    // identificado en gameFrameHint). Cada 5 chequeos, o si no hay frame / falla,
    // se revisan todos (mismo criterio que el contador de FPS).
    let backAtLobby;
    leaveTick++;
    if (gameFrameHint != null && leaveTick % 5 !== 0) {
      try { backAtLobby = (await execInGame(buildLobbyCheckScript())) === true; } catch (_) { backAtLobby = undefined; }
    }
    if (backAtLobby === undefined) {
      const results = await execInAllFrames(buildLobbyCheckScript());
      backAtLobby = results.some((r) => r.ok && r.value === true);
    }
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
      // País: Haxball marca la bandera de cada sala con una clase tipo "f-co"
      // (o con una <img> cuyo nombre de archivo es el código).
      var country = null;
      var flagEls = row.querySelectorAll('[class*="flag"], [class*="f-"]');
      for (var fi = 0; fi < flagEls.length && !country; fi++) {
        var cm = String(flagEls[fi].className || '').match(/(?:^|\s)f-([a-z]{2})(?:\s|$)/i);
        if (cm) country = cm[1].toLowerCase();
      }
      if (!country) {
        var flagImg = row.querySelector('img');
        var im = flagImg && String(flagImg.src || '').match(/\/([a-z]{2})\.(?:png|gif|svg|webp)/i);
        if (im) country = im[1].toLowerCase();
      }
      rooms.push({
        country: country,
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

// Haxball NO actualiza su lista de salas solo: hay que tocar su botón "Refresh".
// Antes Vivet solo releía el DOM viejo, por eso las salas nuevas no salían ni
// apretando "Actualizar". Se toca ese botón en el lobby y se espera a que cargue.
function clickLobbyRefreshInPage() {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return false;
    var b = document.querySelector('button[data-hook="refresh"]');
    if (!b) {
      var all = document.querySelectorAll('button');
      for (var i = 0; i < all.length; i++) {
        if (/^\s*refresh\s*$/i.test(all[i].textContent || '')) { b = all[i]; break; }
      }
    }
    if (!b || b.disabled) return false;
    b.click();
    return true;
  } catch (e) { return false; }
}
let lastLobbyRefresh = 0;
async function refreshLobbyList(force) {
  const now = Date.now();
  if (!force && now - lastLobbyRefresh < 4000) return;
  try {
    const r = await execInAllFrames('(' + clickLobbyRefreshInPage.toString() + ')();');
    if (r.some((x) => x.ok && x.value === true)) {
      lastLobbyRefresh = now;
      await new Promise((res) => setTimeout(res, 900)); // deja que Haxball termine de cargar la lista
    }
  } catch (_) {}
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

// País de una sala: primero el que Haxball marca en la lista, si no, se intenta
// adivinar por el nombre. En Windows los emojis de bandera no se ven (salen
// como letras), así que la bandera se dibuja con una imagen.
function roomCountry(r) {
  const c = r && r.country ? String(r.country).toLowerCase() : '';
  if (/^[a-z]{2}$/.test(c)) return c;
  const g = guessCountryCode((r && r.name) || '');
  return g === 'WW' ? '' : g.toLowerCase();
}
function countryName(code) {
  try {
    return new Intl.DisplayNames([window.vivetLang && window.vivetLang() === 'en' ? 'en' : 'es'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase();
  } catch (_) { return code.toUpperCase(); }
}
function flagBoxHtml(code) {
  if (!code) return '<div class="room-flag" title="Global">🌐</div>';
  return `<div class="room-flag has-flag" title="${escapeHtml(countryName(code))}"><img class="flag-img" alt="" src="https://flagcdn.com/w40/${code}.png" onerror="this.remove()" /><span class="flag-code">${code.toUpperCase()}</span></div>`;
}
function countryBadgeHtml(code) {
  if (!code) return '';
  return `<span class="chip chip-country"><img class="flag-img-sm" alt="" src="https://flagcdn.com/w20/${code}.png" onerror="this.remove()" />${escapeHtml(countryName(code))}</span>`;
}

// Favoritos: una sala favorita es una sala fijada por nombre (misma lista que
// "Fijar sala"), así que aparece arriba y se guarda en 'pinnedRooms'.
function isFavRoom(r) {
  const n = String((r && r.name) || '').toUpperCase();
  return pinnedRooms.some((p) => !p.url && p.match && n.includes(String(p.match).toUpperCase()));
}
function toggleFavRoom(name) {
  const n = String(name || '').toUpperCase();
  const hits = pinnedRooms.filter((p) => !p.url && p.match && n.includes(String(p.match).toUpperCase()));
  if (hits.length) {
    pinnedRooms = pinnedRooms.filter((p) => !hits.includes(p));
    showToast('Quitada de favoritos');
  } else {
    pinnedRooms.push({ label: name, match: name });
    showToast('Agregada a favoritos', 'ok');
  }
  savePinnedRooms();
  renderRoomList();
}

function roomCardHtml(r) {
  const cc = roomCountry(r);
  const fav = isFavRoom(r);
  return `<div class="room-card">
    ${flagBoxHtml(cc)}
    <div class="room-main">
      <div class="room-name">${escapeHtml(r.name)}</div>
      <div class="room-meta">
        ${countryBadgeHtml(cc)}
        <span class="chip">${r.players}/${r.maxPlayers} jugadores</span>
        ${r.hasPassword ? '<span class="chip chip-lock">Con clave</span>' : ''}
        ${r.distanceKm != null ? `<span class="chip">${r.distanceKm} km</span>` : ''}
      </div>
    </div>
    <span class="room-pill room-pill-live">LIVE</span>
    <div class="room-actions">
      <button class="ghost-btn fav-btn ${fav ? 'active' : ''}" data-fav-name="${escapeHtml(r.name)}" title="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${fav ? '★' : '☆'}</button>
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
    const lcc = roomCountry(live);
    return `<div class="room-card room-card-pinned">
      ${flagBoxHtml(lcc)}
      <div class="room-main">
        <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
        <div class="room-meta">
          ${countryBadgeHtml(lcc)}
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

// Un solo listener para toda la lista (antes se enganchaba uno por botón en
// cada render). NOTA: un botón "Jugar" de sala pública puede tener a la vez
// data-join-name (auto-click de Vivet dentro del juego) y data-join-url (la URL
// real, para poder copiar el link); data-join-name tiene prioridad, si no los
// dos se dispararían juntos.
var lastRoomListHtml = null;
roomListEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-join-name],[data-join-url],[data-fav-name],[data-unpin-index],[data-copy-url],[data-copy-name]');
  if (!el || !roomListEl.contains(el)) return;
  const d = el.dataset;
  if (d.joinName !== undefined) joinByName(d.joinName, d.joinUrl || null);
  else if (d.joinUrl !== undefined) joinByUrl(d.joinUrl, d.joinLabel);
  if (d.favName !== undefined) toggleFavRoom(d.favName);
  if (d.unpinIndex !== undefined) removePinnedRoom(Number(d.unpinIndex));
  if (d.copyUrl !== undefined) copyToClipboard(d.copyUrl, 'Link de la sala copiado');
  if (d.copyName !== undefined) copyToClipboard(d.copyName, 'Nombre de la sala copiado');
});

function renderRoomList() {
  const query = searchInput.value;
  const parts = [];

  if (isDirectJoinInput(query)) {
    parts.push(directJoinCardHtml(query.trim()));
  }

  const shownAsPinned = new Set();
  pinnedRooms.forEach((pinned, index) => {
    const live = pinned.url ? null : matchPinned(pinned, allRoomsCache);
    if (live) shownAsPinned.add(live);
    parts.push(pinnedCardHtml(pinned, live, index));
  });

  let list = allRoomsCache.filter((r) => !shownAsPinned.has(r));
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

  // Si nada cambió desde el sondeo anterior no se toca el DOM: reconstruir
  // cientos de filas cada 6 s era una de las causas del lag al scrollear.
  const html = parts.join('');
  if (html !== lastRoomListHtml) {
    lastRoomListHtml = html;
    roomListEl.innerHTML = html;
  }

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

let joinWaitToken = 0;
function waitForJoinConfirm(timeoutMs) {
  const startedAt = Date.now();
  const myToken = joinWaitToken;
  return new Promise((resolve) => {
    const check = async () => {
      if (myToken !== joinWaitToken || Date.now() - startedAt >= timeoutMs) {
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
  gameFrameHint = null;
  seedNicknameInGame();
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

// REESCRITO (28/09-v3) - Vivet YA NO intenta clickear nada por su cuenta en
// "Crear sala" (adivinar el DOM de Haxball hacía que la crease sola con los
// datos por defecto, o que te dejara en la lista sin abrir nada). Ahora:
//   1) se muestra el lobby real de Haxball con un aviso arriba;
//   2) el botón "Create room" de Haxball lo tocás vos, y llenás todo a mano;
//   3) el botón "← Volver a Vivet" está siempre visible mientras tanto;
//   4) la sala se da por creada SOLO cuando aparece la UI real de sala.
function inRoomInPage() {
  try { return !!document.querySelector('.room-view, .game-state-view'); } catch (e) { return false; }
}

// Abre el diálogo "Create room" de Haxball tocando SOLO el botón del lobby.
// Nunca toca botones que estén dentro de un .dialog (ahí vive el "Create"
// que confirma), así que no puede crear la sala con los datos por defecto:
// los datos los llenás vos en el diálogo ya abierto.
// Devuelve: 'open' (diálogo ya abierto), 'clicked', 'busy' (hay otro
// diálogo, p. ej. nickname) o 'no-button' (este frame no es el lobby).
function openCreateDialogInPage() {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return 'in-room';
    var visible = function (el) { return !el.getClientRects || el.getClientRects().length > 0; };
    var RX = /^\s*create\s*room\s*$/i;
    // OJO: la propia lista de salas es un .dialog (h1 "Room list"), así que no
    // se puede excluir "todo lo que esté en un .dialog". Se distingue por el
    // título: el diálogo de crear tiene h1 "Create room".
    var isCreateDlg = function (d) {
      var h = d.querySelector('h1');
      return !!h && RX.test(h.textContent || '') && visible(d);
    };
    var dialogs = Array.prototype.slice.call(document.querySelectorAll('.dialog'));
    if (dialogs.some(isCreateDlg)) return 'open';
    if (/choose\s*nickname/i.test(document.body.innerText || '')) return 'busy';
    var btn = document.querySelector('button[data-hook=create]');
    if (!btn || !visible(btn) || (btn.closest('.dialog') && isCreateDlg(btn.closest('.dialog')))) {
      var cands = Array.prototype.slice.call(document.querySelectorAll('button, [role=button], div, a'));
      btn = cands.find(function (el) {
        if (!RX.test(el.textContent || '') || !visible(el)) return false;
        if (el.children.length && RX.test(el.children[0].textContent || '')) return false;
        var d = el.closest('.dialog');
        return !(d && isCreateDlg(d));
      });
    }
    if (!btn) return 'no-button';
    btn.click();
    return 'clicked';
  } catch (e) { return 'error:' + String((e && e.message) || e); }
}

// Vigila el botón "Cancel" (y Escape) del diálogo nativo "Create room" de Haxball.
// Sin esto, cancelar te dejaba en la lista de salas de Haxball en vez de volver a Vivet.
// Devuelve 'cancelled' | 'watching' | 'none'.
function watchCreateCancelInPage() {
  try {
    if (window.__vivetCreateCancelled === true) return 'cancelled';
    var RX = /^\s*create\s*room\s*$/i;
    var dlgs = document.querySelectorAll('.dialog');
    for (var i = 0; i < dlgs.length; i++) {
      var d = dlgs[i];
      var h = d.querySelector('h1');
      if (!h || !RX.test(h.textContent || '')) continue;
      if (!d.__vvCancelHooked) {
        d.__vvCancelHooked = true;
        d.addEventListener('click', function (e) {
          var b = e.target && e.target.closest ? e.target.closest('button') : null;
          if (b && (b.getAttribute('data-hook') === 'cancel' || /^\s*(cancel|cancelar)\s*$/i.test(b.textContent || ''))) {
            window.__vivetCreateCancelled = true;
          }
        }, true);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && document.contains(d)) window.__vivetCreateCancelled = true;
        }, true);
      }
      return 'watching';
    }
    return 'none';
  } catch (e) { return 'error'; }
}

function waitForRoomCreated(token, timeoutMs) {
  const startedAt = Date.now();
  let dialogOpened = false, clicks = 0, lastClickAt = 0;
  return new Promise((resolve) => {
    const check = async () => {
      if (token !== joinWaitToken || Date.now() - startedAt >= timeoutMs) { resolve(false); return; }
      try {
        // Si Haxball pide "Choose nickname" al crear, se completa solo.
        await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
        // Llevar directo al diálogo "Create room" (una sola vez, con reintentos
        // mientras el lobby termina de cargar).
        if (!dialogOpened && clicks < 8 && Date.now() - lastClickAt > 1500) {
          if (clicks === 0) await execInAllFrames(buildWakeUpLobbyScript()).catch(() => {});
          const opened = await execInAllFrames('(' + openCreateDialogInPage.toString() + ')();').catch(() => []);
          if (opened.some((r) => r.ok && r.value === 'open')) dialogOpened = true;
          else if (opened.some((r) => r.ok && r.value === 'clicked')) { clicks++; lastClickAt = Date.now(); }
        }
        // Si tocó "Cancel" en el diálogo de Haxball, se corta y se vuelve a Vivet.
        if (dialogOpened || clicks > 0) {
          const w = await execInAllFrames('(' + watchCreateCancelInPage.toString() + ')();').catch(() => []);
          if (w.some((r) => r.ok && r.value === 'cancelled')) { resolve('cancelled'); return; }
        }
        const results = await execInAllFrames('(' + inRoomInPage.toString() + ')();');
        if (results.some((r) => r.ok && r.value === true)) { resolve(true); return; }
      } catch (_) {}
      setTimeout(check, 500);
    };
    check();
  });
}

async function startCreateRoom() {
  if (!createRoomBtn || creatingRoom || createRoomBtn.disabled) return;
  createRoomBtn.disabled = true;
  joinWaitToken++;
  const token = joinWaitToken;

  // creatingRoom frena la detección de "volviste al lobby" (checkLeftRoom) y
  // el overlay de "entrando a la sala" mientras vos completás el formulario.
  creatingRoom = true;
  appRoot.classList.add('creating');
  setPlaying(true);
  if (createRoomStatusEl) createRoomStatusEl.textContent = '';
  execInAllFrames('window.__vivetCreateCancelled = false;').catch(() => {});

  try {
    const created = await waitForRoomCreated(token, 15 * 60 * 1000);
    if (token !== joinWaitToken) return; // cancelaste con "Volver a Vivet"
    if (created === 'cancelled') { // tocó "Cancel" en el diálogo de Haxball
      joinWaitToken++;
      creatingRoom = false;
      appRoot.classList.remove('creating');
      reloadGameFresh(); // vuelve a Vivet, igual que "← Volver a Vivet"
      return;
    }
    creatingRoom = false;
    if (created) {
      joinedAt = Date.now();
      currentRoomName = null;
      updateDiscordPresence(currentRoomCode(), null);
      updateRoomNameBadge(currentRoomCode(), null);
      showToast('Sala creada', 'ok');
    } else {
      setPlaying(false);
    }
  } catch (err) {
    creatingRoom = false;
    setPlaying(false);
  } finally {
    if (token === joinWaitToken) appRoot.classList.remove('creating');
    createRoomBtn.disabled = false;
  }
}
createRoomBtn?.addEventListener('click', startCreateRoom);

// Botón "Volver a Vivet" mientras se está creando la sala: antes no había
// forma de salir de ahí (el sidebar queda oculto en modo jugando).
$('#exit-create-btn')?.addEventListener('click', () => {
  joinWaitToken++; // corta la espera de confirmación
  creatingRoom = false;
  appRoot.classList.remove('creating');
  if (createRoomStatusEl) createRoomStatusEl.textContent = '';
  reloadGameFresh(); // vuelve al lobby limpio y muestra el panel de Vivet
});


// ---------------------------------------------------------------------------
// Emblema de usuarios del cliente
// Cada Vivet Client agrega una marca INVISIBLE (2 caracteres de ancho cero) al
// final del nick que manda al juego. Quien no usa el cliente no ve nada; quien
// sí lo usa ve un emblema junto al nombre en la lista de jugadores (el script
// clientBadgeInPage + el CSS .vv-client-name de config.js). La marca se puede
// cambiar o apagar en config.js (CLIENT_BADGE_MARK / CLIENT_BADGE_ENABLED).
// OJO: es cosmético, no una verificación: alguien que copie la marca también
// mostraría el emblema.
// ---------------------------------------------------------------------------
function clientMark() {
  const on = typeof CLIENT_BADGE_ENABLED === 'undefined' ? true : !!CLIENT_BADGE_ENABLED;
  const m = typeof CLIENT_BADGE_MARK === 'string' ? CLIENT_BADGE_MARK : '\u200C\u2060';
  return on ? m : '';
}
// Haxball corta los nombres a 25 caracteres: si el nick no deja lugar para la
// marca, se manda sin ella (no se recorta el nick del usuario).
function withClientMark(nick) {
  const m = clientMark();
  if (!m || !nick || nick.endsWith(m)) return nick;
  if (nick.length + m.length > 25) return nick;
  return nick + m;
}

function clientBadgeInPage(mark) {
  try {
    var st = window.__vivetBadge || (window.__vivetBadge = { mark: '', hooked: false, t: null });
    st.mark = mark || '';
    function scan() {
      st.t = null;
      if (!st.mark) return;
      var items = document.querySelectorAll('.player-list-item');
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var el = it.querySelector('[data-hook=name]') || it.querySelector('.name') || it;
        var has = (el.textContent || '').indexOf(st.mark) >= 0;
        var on = el.classList.contains('vv-client-name');
        if (has && !on) el.classList.add('vv-client-name');
        else if (!has && on) el.classList.remove('vv-client-name');
      }
    }
    function later() { if (!st.t) st.t = setTimeout(scan, 200); }
    if (!st.hooked) {
      st.hooked = true;
      // Solo childList/characterData: poner la clase (atributo) no dispara un bucle.
      new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
    later();
    return true;
  } catch (e) {
    return false;
  }
}

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

// Aplica un nick nuevo en todos lados: config local, memoria, input,
// localStorage de Haxball (para la próxima vez) y Social (servidor).
async function applyNickname(val, { announce = true } = {}) {
  currentNickname = val;
  if (nicknameInput) nicknameInput.value = val;
  await window.vivet.setConfig('nickname', val).catch(() => {});
  try {
    execInAllFrames(
      "try{localStorage.setItem('player_name'," + JSON.stringify(withClientMark(val)) + ")}catch(e){}"
    ).catch(() => {});
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('vivet-nick-changed', { detail: val }));
  if (announce) showToast('Nickname guardado. Se aplica al entrar a la próxima sala', 'ok');
}

nicknameSaveBtn?.addEventListener('click', () => {
  const val = (nicknameInput?.value || '').trim();
  if (!val) { showToast('Escribí un nickname primero'); return; }
  applyNickname(val);
});
nicknameInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') nicknameSaveBtn?.click(); });

function dismissNicknamePromptInPage(nickname) {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return 'in-room';
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
  return '(' + dismissNicknamePromptInPage.toString() + ')(' + JSON.stringify(withClientMark(nickname)) + ');';
}

// CORREGIDO (28/09) - "a veces me pide el nombre": el único momento en que se
// completaba solo era durante el sondeo de salas / la confirmación de join.
// Entrando por link, recargando o reconectando, el prompt aparecía con el
// sondeo ya frenado y quedaba esperando. Ahora, mientras se está entrando a
// jugar (primeros 30 s), se vigila y se completa en cualquier caso.
setInterval(() => {
  if (!appRoot.classList.contains('playing') || replayMode) return;
  if (Date.now() - joinedAt > 30000) return;
  execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
}, 1200);

// Deja el nick ya cargado en el localStorage de Haxball, así el prompt (si
// aparece) sale con tu nombre puesto.
function seedNicknameInGame() {
  if (!currentNickname) return;
  execInAllFrames(
    "try{localStorage.setItem('player_name'," + JSON.stringify(withClientMark(currentNickname)) + ")}catch(e){}"
  ).catch(() => {});
}

// ---------------------------------------------------------------------------
// Polling de Salas
// ---------------------------------------------------------------------------
let lastScrapeDebug = [];

const explorarVisible = () => !!document.querySelector('#panel-explorar.active');
let roomListDirty = false;

async function pollRoomsOnce(force) {
  // Ventana minimizada / oculta: no se le pregunta nada al juego.
  if (document.hidden) return;
  if (appRoot.classList.contains('playing')) return;
  try {
    await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
    await refreshLobbyList(force === true);
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
  // Con otro panel abierto la lista no se ve: se marca para dibujarla al volver.
  if (explorarVisible()) renderRoomList(); else roomListDirty = true;
}
document.querySelector('.nav-btn[data-panel="panel-explorar"]')?.addEventListener('click', () => {
  if (roomListDirty) { roomListDirty = false; renderRoomList(); }
});

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
  pollRoomsOnce(true);
}
startRoomPolling();

searchInput.addEventListener('input', renderRoomList);
window.addEventListener('vivet-lang-changed', renderRoomList);
sortSelect.addEventListener('change', renderRoomList);
refreshBtn.addEventListener('click', () => pollRoomsOnce(true));
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
  seedNicknameInGame();
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
  seedNicknameInGame();
  VivetPerf.injectIntoGame();
  applyCustomGameCssSetting();
});

// ---------------------------------------------------------------------------
// Auth de Haxball (solo ID público)
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
    reloadGameFresh(); // el juego lee la clave al cargar
  }
});

authRestoreBtn?.addEventListener('click', async () => {
  const res = await runAuthAction('Restaurando...', () => window.vivet.restoreAuth(), 'Auth anterior restaurado');
  if (res) reloadGameFresh();
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

// Al salir del panel "Auth" el Auth se vuelve a ocultar solo.
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
// Recarga el juego DESDE EL LOBBY. view.reload() vuelve a cargar la URL actual,
// y si esa URL tiene ?c=CODIGO (entraste por link) te vuelve a meter en la sala
// y muestra "Entrando a la sala…" sin que hayas pedido nada. Acá se limpia el
// estado de sala y se carga la URL base.
function reloadGameFresh() {
  currentRoomName = null;
  currentRoomUrl = null;
  gameFrameHint = null;
  if (!replayMode) setPlaying(false);
  updateDiscordPresence(null);
  updateRoomNameBadge(null, null);
  try { view.loadURL(HAXBALL_PLAY_URL); } catch (_) {}
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
  reloadGameFresh();
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
    buttons.push({ label: t('Unirse al Discord'), url: DISCORD_INVITE_URL });
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
      details: t('Viendo un replay'),
      state: t('Reproductor de replays'),
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
    });
    return;
  }
  // MUESTRA EL NOMBRE DE LA SALA EN EL ESTADO
  const label = roomName ? t(`Sala: ${roomName}`) : (code ? t(`Código: ${code}`) : t('Conectando…'));

  window.vivet.discordSetActivity(
    playing ? {
      details: t('Jugando'),
      state: label,
      // Usamos joinedAt para que el tiempo no se reinicie a 00:00 cada vez
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
      buttons: buttons.length ? buttons : undefined,
    } : {
      details: t('En el menú principal'),
      state: t('Buscando sala'),
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

// Chat expandido (28/09): al enfocar el input del chat se le pone la clase
// vv-chat-open al contenedor (el CSS está en config.js) y se baja el log hasta
// el último mensaje; al soltar el foco se quita. No toca nada más, así el
// comportamiento normal de Haxball al mandar con Enter queda intacto.
// F9 dentro del juego copia al portapapeles el HTML del chat (recortado):
// sirve para ajustar los selectores si Haxball cambia su DOM.
function chatExpandInPage() {
  try {
    if (window.__vivetChatInit) return true;
    window.__vivetChatInit = true;
    var OPEN = 'vv-chat-open';
    var box = function () { return document.querySelector('.chatbox-view-contents'); };
    var isChatInput = function (t) {
      return !!(t && t.tagName === 'INPUT' && t.closest && t.closest('.chatbox-view-contents'));
    };
    function scrollLog(b) {
      for (var i = 0; i < b.children.length; i++) {
        var k = b.children[i];
        if (k.classList.contains('input') || k.classList.contains('autocompletebox')) continue;
        k.scrollTop = k.scrollHeight;
      }
    }
    document.addEventListener('focusin', function (e) {
      if (!isChatInput(e.target)) return;
      var b = box();
      if (!b) return;
      b.classList.add(OPEN);
      if (b.parentElement) b.parentElement.classList.add(OPEN);
      setTimeout(function () { scrollLog(b); }, 60);
    }, true);
    document.addEventListener('focusout', function (e) {
      if (!isChatInput(e.target)) return;
      var b = box();
      if (b) { b.classList.remove(OPEN); if (b.parentElement) b.parentElement.classList.remove(OPEN); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'F9') return;
      var b = box();
      var root = (b && b.parentElement) || b;
      var html = root ? root.cloneNode(true) : null;
      if (html) {
        var ps = html.querySelectorAll('p');
        for (var i = 3; i < ps.length; i++) ps[i].remove();
      }
      var out = html ? html.outerHTML.slice(0, 8000) : 'no se encontro el chat';
      try { navigator.clipboard.writeText(out); } catch (_) {}
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Comandos rápidos del chat: "/ex" + Tab, Espacio o Enter -> "/extrapolation".
// Los atajos se editan en config.js (CHAT_ALIASES). Además, con Tab se completa
// cualquier comienzo único de un comando (ej: "/col" -> "/colors").
function chatAliasesInPage(aliases) {
  try {
    var st = window.__vivetAlias || (window.__vivetAlias = { map: {}, hooked: false });
    st.map = aliases || {};
    if (st.hooked) return true;
    st.hooked = true;
    var COMMANDS = ['avatar', 'clear_avatar', 'clear_bans', 'clear_password', 'colors',
      'extrapolation', 'handicap', 'kick_ratelimit', 'restore', 'set_password', 'store'];
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'INPUT' || !t.closest || !t.closest('.chatbox-view-contents')) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      var k = e.key;
      if (k !== 'Tab' && k !== ' ' && k !== 'Enter') return;
      if (t.selectionStart !== t.value.length) return;
      var m = /^\/([A-Za-z_]+)$/.exec(t.value);
      if (!m) return;
      var word = m[1].toLowerCase(), full = null;
      if (COMMANDS.indexOf(word) < 0) {
        if (Object.prototype.hasOwnProperty.call(st.map, word)) full = st.map[word];
        else if (k === 'Tab') {
          var hits = COMMANDS.filter(function (c) { return c.indexOf(word) === 0; });
          if (hits.length === 1) full = hits[0];
        }
      }
      if (!full) return;
      t.value = '/' + full + (k === 'Enter' ? '' : ' ');
      t.dispatchEvent(new Event('input', { bubbles: true }));
      if (k !== 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    return true;
  } catch (e) {
    return false;
  }
}

function applyCustomGameCssSetting() {
  execInAllFrames('(' + chatExpandInPage.toString() + ')();').catch(() => {});
  const aliases = (typeof CHAT_ALIASES !== 'undefined' && CHAT_ALIASES) ? CHAT_ALIASES : {};
  execInAllFrames('(' + chatAliasesInPage.toString() + ')(' + JSON.stringify(aliases) + ');').catch(() => {});
  execInAllFrames('(' + clientBadgeInPage.toString() + ')(' + JSON.stringify(clientMark()) + ');').catch(() => {});
  if (typeof CUSTOM_GAME_CSS === 'undefined' || !CUSTOM_GAME_CSS || !CUSTOM_GAME_CSS.trim()) return;
  execInAllFrames(buildCustomGameCssScript(CUSTOM_GAME_CSS)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Animación de arranque (28/09): logo + barra, y después el sidebar/paneles
// entran con un fade. Dura mínimo ~1.5 s; si algo demora, se saca igual a los 4 s.
// ---------------------------------------------------------------------------
(function bootSplash() {
  const splash = $('#splash');
  if (!splash) { appRoot.classList.add('intro'); return; }
  const t0 = performance.now();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, 1500 - (performance.now() - t0));
    setTimeout(() => {
      splash.classList.add('hide');
      appRoot.classList.add('intro');
      setTimeout(() => splash.remove(), 700);
    }, wait);
  };
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
  setTimeout(finish, 4000);
})();