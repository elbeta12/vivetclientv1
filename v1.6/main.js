// Vivet Client - main-v3.js
// Proceso principal de Electron

const { app, BrowserWindow, ipcMain, shell, Menu, webContents, dialog, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const store = new Store({ name: 'vivet-client-config' });
const {
  PERF_WEB_PREFERENCES,
  applyPerformanceSwitches,
  tuneWebContents,
  installNetworkGuards,
} = require('./optimizations-main');
// Ventana de chats + atajo (ver chat-window-main.js)
const chatWin = require('./chat-window-main')({ app, BrowserWindow, ipcMain, screen, store });

// ---------------------------------------------------------------------------
// OPTIMIZACIONES DE RENDIMIENTO (GPU, throttling) -> optimizations-main.js
// ---------------------------------------------------------------------------
applyPerformanceSwitches(app, store);

// DEBUG (temporal) - ERR_SSL_VERSION_OR_CIPHER_MISMATCH suele venir de un
// antivirus/proxy que hace inspección SSL y no soporta QUIC/TLS1.3 bien.
// Forzamos que Chromium ni intente QUIC, para descartarlo como causa.
app.commandLine.appendSwitch('disable-quic');

let mainWindow;
let discordClient = null;

const HAXBALL_ORIGIN = 'https://www.haxball.com';
const HAXBALL_PLAY_URL = 'https://www.haxball.com/play';

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#050608',
    icon: path.join(__dirname, 'assets', 'logo.png'),
    title: 'Vivet Client',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      ...PERF_WEB_PREFERENCES,
    },
  });
  chatWin.attachMain(mainWindow);

  mainWindow.setMenuBarVisibility(false);

  // ---------------------------------------------------------------------
  // F11 = pantalla completa (como cualquier navegador). Esto solo capta la
  // tecla cuando el foco está en la UI de Vivet (sidebar/paneles); cuando
  // el foco está DENTRO del <webview> del juego hace falta el mismo
  // listener en su propio webContents, así que también se engancha más
  // abajo en 'web-contents-created' para los webview.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // ---------------------------------------------------------------------
  // Preload del <webview> del juego (game-preload.js) - CORREGIDO (27/09):
  // antes el bloqueo de teclas se inyectaba recién en 'dom-ready' del
  // webview (ver app.js), y para ese momento Haxball YA había enganchado
  // sus propios listeners de teclado - el suyo corría primero y nuestro
  // bloqueo llegaba tarde (por eso "las demás de patear" seguían andando).
  // will-attach-webview corre en el proceso principal ANTES de que el
  // webview termine de crearse, así que es el único lugar confiable para
  // fijar un preload que se ejecute antes que cualquier script de la
  // propia página de Haxball. contextIsolation en false es a propósito acá
  // (solo para este webview puntual): así game-preload.js comparte el
  // mismo `window` real de la página y puede engancharse a los eventos de
  // teclado de verdad - nodeIntegration se mantiene en false, la página de
  // Haxball en sí nunca tiene acceso a Node.
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.preload = path.join(__dirname, 'renderer', 'game-preload.js');
    webPreferences.contextIsolation = false;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = true; // por si el juego corre en un sub-frame
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Desactivar el estrangulamiento de rendimiento en sub-frames y webviews,
// y engancharles el mismo atajo F11 que el resto de la app (ver el
// listener de arriba en mainWindow.webContents - el <webview> del juego
// tiene su propio webContents separado, así que F11 no le llega solo).
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    tuneWebContents(contents);
    chatWin.attachGame(contents); // atajo de chats también con el foco dentro del juego
    contents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') {
        e.preventDefault();
        if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
      }
    });
  }
});

app.whenReady().then(() => {
  // Bloqueo de anuncios en la sesión del juego (antes de que cargue nada).
  try { installNetworkGuards(session.fromPartition('persist:haxball'), store); } catch (_) {}
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (discordClient) {
    try { discordClient.destroy(); } catch (_) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------------------------
// IPC: Ejecución de scripts en webview
// ---------------------------------------------------------------------------
function collectFrames(contents) {
  const main = contents.mainFrame;
  if (!main) return [];
  try {
    if (main.framesInSubtree) return Array.from(main.framesInSubtree);
  } catch (_) {}
  return [main];
}

function pickFrame(contents, frameTreeNodeId) {
  const frames = collectFrames(contents);
  if (frameTreeNodeId != null) {
    const match = frames.find((f) => {
      try {
        return f.frameTreeNodeId === frameTreeNodeId;
      } catch (_) {
        return false;
      }
    });
    if (match) return match;
  }
  return frames[frames.length - 1] || contents.mainFrame;
}

ipcMain.handle('webview-exec', async (evt, webContentsId, code, frameTreeNodeId) => {
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return null;
    const frame = pickFrame(wc, frameTreeNodeId);
    if (!frame) return null;
    return await frame.executeJavaScript(code);
  } catch (_) {
    return null;
  }
});

ipcMain.handle('webview-exec-all', async (evt, webContentsId, code) => {
  const wc = webContents.fromId(webContentsId);
  if (!wc) throw new Error('No se encontró el webview');
  const frames = collectFrames(wc);
  const results = [];
  for (const frame of frames) {
    let url = '';
    let frameTreeNodeId = null;
    try { url = frame.url; } catch (_) {}
    try { frameTreeNodeId = frame.frameTreeNodeId; } catch (_) {}
    try {
      const value = await frame.executeJavaScript(code);
      results.push({ url, frameTreeNodeId, ok: true, value });
    } catch (err) {
      results.push({ url, frameTreeNodeId, ok: false, error: String(err && err.message ? err.message : err) });
    }
  }
  return results;
});

// CORREGIDO (27/09) - view.focus() desde el renderer (sobre el elemento
// <webview>) no siempre logra que Chromium le pase el foco de teclado
// real al guest, sobre todo justo después de un loadURL o de confirmar un
// join (el guest todavía se está asentando). contents.focus() llamado acá,
// desde el proceso principal, sobre el webContents real del guest, es la
// forma confiable de hacerlo.
// CORREGIDO (27/09-v2) - contents.focus() (llamado desde acá, en el
// proceso principal) tampoco alcanza siempre: Chromium en varios casos
// solo termina de enrutar el teclado hacia el guest de un <webview>
// después de un evento de INPUT real (un click), no con una llamada a
// focus() sola, sea desde el renderer o desde main. sendInputEvent acá
// simula un click de verdad (mousedown+mouseup) en el centro del webview,
// que para Chromium es indistinguible de un click físico - eso sí fuerza
// la transferencia real de foco de teclado, sin que el usuario tenga que
// tocar nada.
ipcMain.handle('webview-focus', (_evt, webContentsId, width, height) => {
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return false;
    wc.focus();
    const x = Math.max(1, Math.floor((width || 800) / 2));
    const y = Math.max(1, Math.floor((height || 600) / 2));
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
    return true;
  } catch (_) {
    return false;
  }
});

// Foco suave: solo devuelve el teclado al guest si lo perdió. NO simula click
// (a diferencia de webview-focus), así que se puede llamar seguido sin riesgo.
ipcMain.handle('webview-focus-soft', (_evt, webContentsId) => {
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return false;
    if (!wc.isFocused()) wc.focus();
    return true;
  } catch (_) { return false; }
});

ipcMain.handle('open-external', async (_evt, url) => {
  await shell.openExternal(url);
});

// CORREGIDO (28/09) - un error -113 (ERR_SSL_VERSION_OR_CIPHER_MISMATCH)
// puede venir de un estado de red corrupto guardado en la sesión de esta
// partition (persist:haxball) - caché QUIC/Alt-Svc, HSTS, resolver DNS -
// y no necesariamente de un antivirus/VPN real (un usuario lo reportó acá
// mientras el mismo sitio cargaba bien en su navegador normal, con la
// misma PC y sin VPN/inspección SSL, lo que descarta un bloqueo de red
// del sistema). Un reload de la página no alcanza porque ese estado vive
// en la sesión, no en la página - así que antes de pedirle al usuario que
// borre la carpeta de datos a mano, lo intentamos limpiar nosotros y
// reintentar (ver did-fail-load en renderer/app.js).
ipcMain.handle('webview-reset-network', async (_evt, webContentsId) => {
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return { ok: false, error: 'webview no encontrado' };
    const ses = wc.session;
    try { await ses.clearCache(); } catch (_) {}
    try { await ses.clearHostResolverCache(); } catch (_) {}
    try { await ses.clearAuthCache(); } catch (_) {}
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// ---------------------------------------------------------------------------
// Auth de Haxball (solo ID público)
// ---------------------------------------------------------------------------
// Se abre una ventana OCULTA en la misma sesión que el juego (persist:haxball)
// sobre haxball.com/playerauth: esa página crea la identidad si todavía no
// existe y muestra el ID público (43 caracteres). Solo se extrae el ID
// público hacia la interfaz: la clave privada nunca se devuelve al renderer.
// Para MIGRAR tu identidad desde el navegador se importa tu clave privada
// (auth-import): el ID público sale de ella, así que queda el mismo.
const AUTH_PAGE_URL = 'https://www.haxball.com/playerauth';
const AUTH_KEY_RE = /^idkey\.[A-Za-z0-9_.\-]{20,2000}$/;

// Se ejecuta DENTRO de la página de auth (va por .toString()).
function authPageRead() {
  var chunks = [];
  try { chunks.push(document.body ? document.body.innerText : ''); } catch (_) {}
  try {
    document.querySelectorAll('input, textarea').forEach(function (el) { chunks.push(el.value || ''); });
  } catch (_) {}
  var tokens = chunks.join(' ').split(/\s+/);
  for (var i = 0; i < tokens.length; i++) {
    if (/^[A-Za-z0-9_-]{43}$/.test(tokens[i])) return tokens[i];
  }
  return null;
}

// Se ejecutan DENTRO de la página de auth (van por .toString()).
function authPageGetKey() {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      var v = localStorage.getItem(k);
      if (typeof v === 'string' && v.indexOf('idkey.') === 0) return { name: k, value: v };
    }
  } catch (_) {}
  return null;
}
function authPageSetKey(key) {
  try {
    var name = 'player_auth_key';
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      var v = localStorage.getItem(k);
      if (typeof v === 'string' && v.indexOf('idkey.') === 0) { name = k; break; }
    }
    localStorage.setItem(name, key);
    return localStorage.getItem(name) === key;
  } catch (_) {
    return false;
  }
}

async function withAuthWindow(fn) {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { partition: 'persist:haxball', contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL(AUTH_PAGE_URL);
    return await fn(win);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
const runJs = (win, fn, arg) =>
  win.webContents.executeJavaScript(`(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`);

async function readPublicId(win) {
  // La página puede tardar en generar/pintar la identidad: reintenta un rato.
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const id = await runJs(win, authPageRead);
    if (id) return id;
  }
  return null;
}

async function importAuthKey(key) {
  if (!AUTH_KEY_RE.test(key)) {
    return { ok: false, error: 'La clave no tiene el formato de Haxball (tiene que empezar con "idkey.").' };
  }
  return withAuthWindow(async (win) => {
    const current = await runJs(win, authPageGetKey);
    if (current && current.value !== key) store.set('authBackup', current.value);
    if (!(await runJs(win, authPageSetKey, key))) {
      return { ok: false, error: 'No se pudo escribir en el almacenamiento de Haxball.' };
    }
    await win.loadURL(AUTH_PAGE_URL); // recarga: Haxball toma la clave y calcula el ID público
    const after = await runJs(win, authPageGetKey);
    if (!after || after.value !== key) {
      return { ok: false, error: 'Haxball no aceptó esa clave (la reemplazó al validarla). Revisá que esté completa.' };
    }
    const publicId = await readPublicId(win);
    if (!publicId) return { ok: false, error: 'La clave se guardó pero no se pudo leer el ID público resultante.' };
    return { ok: true, publicId, hasBackup: !!store.get('authBackup') };
  });
}

ipcMain.handle('auth-read', async () => {
  try {
    return await withAuthWindow(async (win) => {
      const publicId = await readPublicId(win);
      if (!publicId) return { ok: false, error: 'No se pudo leer el ID público. Probá de nuevo en unos segundos.' };
      return { ok: true, publicId, hasBackup: !!store.get('authBackup') };
    });
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('auth-import', async (_evt, key) => {
  try {
    return await importAuthKey(String(key || '').trim());
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('auth-restore', async () => {
  const backup = store.get('authBackup');
  if (!backup) return { ok: false, error: 'No hay un auth anterior guardado.' };
  try {
    return await importAuthKey(backup);
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// ---------------------------------------------------------------------------
// Reproductor de replays (.hbr2)
// ---------------------------------------------------------------------------
// El renderer nunca lee rutas arbitrarias: solo puede pedir archivos que
// pasaron antes por el diálogo de abrir, por la lista de recientes o por el
// escaneo de Descargas (allowedReplayPaths).
const REPLAY_EXT_RE = /\.hbr2?$/i;
const REPLAY_MAX_BYTES = 30 * 1024 * 1024;
const allowedReplayPaths = new Set();

function replayEntry(filePath) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return null;
    allowedReplayPaths.add(filePath);
    return { path: filePath, name: path.basename(filePath), size: st.size, mtime: st.mtimeMs };
  } catch (_) {
    return null;
  }
}

function pushRecentReplay(filePath) {
  const recents = (store.get('recentReplays', []) || []).filter((p) => p !== filePath);
  recents.unshift(filePath);
  store.set('recentReplays', recents.slice(0, 20));
}

ipcMain.handle('replay-list', () => {
  const found = new Map();
  for (const p of store.get('recentReplays', []) || []) {
    const e = replayEntry(p);
    if (e) found.set(p, e);
  }
  try {
    const dir = app.getPath('downloads');
    for (const name of fs.readdirSync(dir)) {
      if (!REPLAY_EXT_RE.test(name)) continue;
      const p = path.join(dir, name);
      if (!found.has(p)) {
        const e = replayEntry(p);
        if (e) found.set(p, e);
      }
    }
  } catch (_) {}
  return Array.from(found.values()).sort((a, b) => b.mtime - a.mtime).slice(0, 25);
});

ipcMain.handle('replay-pick', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir replay de Haxball',
    properties: ['openFile'],
    filters: [{ name: 'Replays de Haxball', extensions: ['hbr2', 'hbr'] }],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const entry = replayEntry(res.filePaths[0]);
  if (entry) pushRecentReplay(entry.path);
  return entry;
});

ipcMain.handle('replay-read', async (_evt, filePath) => {
  try {
    if (!allowedReplayPaths.has(filePath) || !REPLAY_EXT_RE.test(filePath)) {
      return { ok: false, error: 'Archivo no permitido.' };
    }
    const st = fs.statSync(filePath);
    if (st.size > REPLAY_MAX_BYTES) return { ok: false, error: 'El replay es demasiado grande (máx. 30 MB).' };
    const buf = await fs.promises.readFile(filePath);
    pushRecentReplay(filePath);
    return { ok: true, name: path.basename(filePath), base64: buf.toString('base64') };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('config-get', (_evt, key, def) => store.get(key, def));
ipcMain.handle('config-set', (_evt, key, value) => { store.set(key, value); chatWin.onConfig(key); });

ipcMain.handle('get-app-version', () => app.getVersion());

// Hz del monitor donde está la ventana (para el tope del Impulso de FPS).
ipcMain.handle('display-hz', (evt) => {
  try {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const d = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
    return Number(d.displayFrequency) || 60;
  } catch (_) { return 60; }
});

ipcMain.handle('app-relaunch', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('discord-connect', async (evt, clientId) => {
  try {
    const { Client } = require('@xhayper/discord-rpc');
    if (discordClient) {
      try { discordClient.destroy(); } catch (_) {}
    }
    discordClient = new Client({ clientId });
    await discordClient.login();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('discord-set-activity', async (_evt, activity) => {
  if (!discordClient) return { ok: false, error: 'No conectado a Discord' };
  try {
    await discordClient.user?.setActivity({
      state: activity.state,
      details: activity.details,
      startTimestamp: activity.startTimestamp ? new Date(activity.startTimestamp) : Date.now(),
      largeImageKey: activity.largeImageKey || undefined,
      largeImageText: 'Vivet Client',
      instance: false,
      buttons: activity.buttons || undefined,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('discord-clear-activity', async () => {
  if (!discordClient) return { ok: false };
  try {
    await discordClient.user?.clearActivity();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

module.exports = { HAXBALL_ORIGIN, HAXBALL_PLAY_URL };