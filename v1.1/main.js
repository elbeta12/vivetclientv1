// Vivet Client - main-v3.js
// Proceso principal de Electron optimizado para Máximo Rendimiento y FPS Altos (>100 FPS)

const { app, BrowserWindow, ipcMain, shell, Menu, webContents } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store({ name: 'vivet-client-config' });

// ---------------------------------------------------------------------------
// 1) OPTIMIZACIONES DE RENDIMIENTO GRAFICO Y GPU
// ---------------------------------------------------------------------------
// Forzar el uso de la GPU dedicada de alto rendimiento
app.commandLine.appendSwitch('force_high_performance_gpu');

// Habilitar rasterización por GPU para reducir latencia de dibujado en Canvas 2D.
// CORREGIDO (27/09): sacamos 'ignore-gpu-blocklist' y 'enable-oop-rasterization'
// del set por defecto. Esa combinación es la causa conocida de que un
// <canvas> dentro de un iframe (típicamente el widget de un captcha -
// hCaptcha/reCAPTCHA/Turnstile arman su UI con canvas) se pinte como un
// bloque gris sólido y quede sin interacción. A la vez, para algunas placas
// más viejas/con drivers raros esos dos flags son justo lo que hace falta
// para que Chromium no rehúse acelerar por GPU - por eso ahora es un
// toggle ("Modo GPU agresivo" en el panel de Rendimiento) en vez de venir
// siempre prendido: quien lo necesite lo prende a su cuenta y riesgo, sabe
// que puede romper el captcha, y el resto de la gente queda con el modo
// seguro por defecto.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
if (store.get('aggressiveGpu', false)) {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-oop-rasterization');
}

// Optimizar procesamiento en segundo plano (Evita bajones de FPS si la app no está enfocada)
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,LazyFrameLoading');

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
      backgroundThrottling: false, // Mantiene los FPS máximos sin importar el foco
    },
  });

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
    try {
      contents.setBackgroundThrottling(false);
    } catch (_) {}
    contents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') {
        e.preventDefault();
        if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
      }
    });
  }
});

app.whenReady().then(() => {
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

ipcMain.handle('config-get', (_evt, key, def) => store.get(key, def));
ipcMain.handle('config-set', (_evt, key, value) => store.set(key, value));

ipcMain.handle('get-app-version', () => app.getVersion());

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