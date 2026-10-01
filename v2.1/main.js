// Vivet Client - main.js
// Proceso principal de Electron. Un solo archivo, por secciones (en este orden):
//   A. Rendimiento: GPU, throttling, popups, anuncios   (antes: optimizations-main.js)
//   B. Ventana de chats + atajo                         (antes: chat-window-main.js)
//   C. Arranque y ventana principal
//   D. IPC: webview, auth, replays, config, Discord

const { app, BrowserWindow, ipcMain, shell, Menu, webContents, dialog, session, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
// Config a prueba de archivo corrupto: si el JSON quedó roto (por ejemplo porque el cliente se cerró
// justo mientras guardaba), antes electron-store tiraba error acá y el cliente NO abría nunca más.
// Ahora se descarta/respalda el archivo roto y se arranca con la config de fábrica.
const store = (() => {
  const opts = { name: 'vivet-client-config', clearInvalidConfig: true };
  try { return new Store(opts); } catch (_) {
    try {
      const p = path.join(app.getPath('userData'), 'vivet-client-config.json');
      fs.renameSync(p, p + '.roto-' + Date.now());
    } catch (_) {}
    return new Store(opts);
  }
})();

// Log de arranque: %APPDATA%\vivet-client\vivet-boot.log  (para diagnosticar cuelgues sin consola)
const BOOT_LOG = path.join(app.getPath('userData'), 'vivet-boot.log');
try { if (fs.existsSync(BOOT_LOG) && fs.statSync(BOOT_LOG).size > 150 * 1024) fs.writeFileSync(BOOT_LOG, ''); } catch (_) {}
function bootLog(msg) {
  try { fs.appendFileSync(BOOT_LOG, new Date().toISOString() + '  ' + msg + '\n'); } catch (_) {}
}
// Migración única: antes el modo por defecto era 'auto' y en algunas PCs la GPU congelaba la
// ventana al abrir. Se pasa a CPU una vez; después se puede volver a cambiar desde Rendimiento.
if (!store.get('cpuDefaultV1', false)) {
  store.set('gpuMode', 'off');
  store.set('fpsBoost', false);
  store.set('bootFails', 0);
  store.set('cpuDefaultV1', true);
}
bootLog('---- inicio v' + app.getVersion() + ' electron ' + process.versions.electron + ' gpuMode=' + store.get('gpuMode', 'auto') + ' fpsBoost=' + store.get('fpsBoost', false) + ' bootFails=' + store.get('bootFails', 0));
app.on('child-process-gone', (_e, d) => bootLog('child-process-gone: ' + JSON.stringify(d)));
app.on('gpu-info-update', () => { try { bootLog('gpu-info-update: ' + JSON.stringify(app.getGPUFeatureStatus())); } catch (_) {} });

// =============================================================================
// A. RENDIMIENTO (GPU, throttling, popups, anuncios)
// =============================================================================
// Optimizaciones del PROCESO PRINCIPAL de Electron: flags de Chromium/GPU,
// throttling, bloqueo de anuncios/popups. Las del renderer (límite de FPS,
// contador, anuncios por CSS) están en renderer/optimizations.js. Ojo: los
// flags de línea de comandos tienen que aplicarse ANTES de app.whenReady(),
// por eso main.js llama a applyPerformanceSwitches() apenas arranca.

// Se mezcla en webPreferences de la ventana principal.
const PERF_WEB_PREFERENCES = {
  backgroundThrottling: false, // mantiene los FPS sin importar el foco
};

// Modo de aceleración por GPU (Rendimiento > "Aceleración por GPU"):
//   off         (por defecto) sin aceleración por hardware: lo más estable.
//   auto        Chromium decide solo (en algunas PCs se congela al abrir).
//   performance fuerza la GPU dedicada + rasterización por GPU (sin zero-copy:
//               agregaba latencia de input).
//               En notebooks con dos GPU o con otras apps usando la GPU esto
//               puede meter delay en todo (copias entre GPUs, competencia).
//   aggressive  performance + ignora la lista de bloqueo de drivers.
//   off         sin aceleración por hardware (todo por CPU).
const GPU_MODES = ['auto', 'compat', 'performance', 'aggressive', 'off'];
function gpuModeOf(store) {
  // Forzar por línea de comandos (solo esa ejecución):  Vivet.exe --cpu   |   --gpu
  if (process.argv.includes('--cpu')) return 'off';
  if (process.argv.includes('--gpu')) return 'auto';
  const m = store.get('gpuMode', null);
  if (GPU_MODES.includes(m)) return m;
  if (store.get('aggressiveGpu', false)) return 'aggressive';
  // Por defecto: CPU (sin aceleración por GPU). Es estable en todas las PCs y Haxball (2D) no la necesita.
  return 'off';
}

// true cuando esta ejecución arrancó con el tope de FPS de Chromium suelto (Impulso de FPS + GPU).
// La interfaz lo usa para no animar la pantalla de carga a miles de cuadros por segundo.
let BOOST_ACTIVE = false;

function applyPerformanceSwitches(app, store) {
  const mode = gpuModeOf(store);

  if (mode === 'off') {
    app.disableHardwareAcceleration();
  } else if (mode === 'compat') {
    // Compatibilidad: la GPU sigue dibujando el juego (canvas/WebGL) pero la composición de
    // la ventana va por software. Evita los congelamientos de ventana en ciertos drivers.
    app.commandLine.appendSwitch('disable-gpu-compositing');
  } else if (mode === 'performance' || mode === 'aggressive') {
    app.commandLine.appendSwitch('force_high_performance_gpu');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    if (mode === 'aggressive') {
      // Esta combinación es la causa conocida de que el <canvas> de un captcha
      // se pinte como un bloque gris; por eso solo va en modo agresivo.
      app.commandLine.appendSwitch('ignore-gpu-blocklist');
      app.commandLine.appendSwitch('enable-oop-rasterization');
    }
  }

  // Impulso de FPS (Rendimiento > Avanzado): suelta el tope de Chromium a los
  // Hz del monitor, pero el renderer lo vuelve a limitar a Hz + 200 (ver
  // VivetPerf en renderer/optimizations.js), así el rAF no gira a miles de
  // veces por segundo. Antes esto era "Destrabar límite de FPS" sin tope y
  // trababa todo. Sigue sin tocar el vsync de la GPU (con eso el teclado iba
  // con delay). Pide reinicio.
  if (mode !== 'off' && store.get('fpsBoost', false)) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    BOOST_ACTIVE = true;
  }

  // Evita bajones de FPS del juego si la app no está enfocada.
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  // OJO: antes acá también se desactivaba CalculateNativeWinOcclusion. Eso
  // hacía que Vivet siguiera dibujando a full aunque otra ventana lo tapara,
  // y competía por CPU/GPU con las demás apps abiertas. Ahora Chromium sí
  // detecta cuando estás tapado y deja de pintar.
  app.commandLine.appendSwitch('disable-features', 'LazyFrameLoading');
}

// Se llama por cada webContents nuevo (incluye el <webview> del juego).
function tuneWebContents(contents) {
  try {
    contents.setBackgroundThrottling(false);
  } catch (_) {}
  if (contents.getType && contents.getType() === 'webview') guardWebview(contents);
}

// ---------------------------------------------------------------------------
// Popups y navegaciones no deseadas del <webview> del juego
// ---------------------------------------------------------------------------
// Los anuncios de la página abren una ventana nueva con el primer clic (por
// ejemplo al crear una sala por primera vez). El juego real nunca necesita
// abrir ventanas: se niegan todas.
const HAXBALL_HOST = /(^|\.)haxball\.com$/i;
function guardWebview(contents) {
  try {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  } catch (_) {}
  // Un anuncio también puede intentar redirigir la página principal a otro sitio.
  const block = (event, url) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'about:' || HAXBALL_HOST.test(u.hostname)) return;
      event.preventDefault();
    } catch (_) {}
  };
  contents.on('will-navigate', block);
  contents.on('will-redirect', block);
}

// ---------------------------------------------------------------------------
// Bloqueo de anuncios a nivel de red (sesión del juego)
// ---------------------------------------------------------------------------
// Además de ocultarlos por CSS, no se descargan: menos CPU/red/GPU mientras
// el lobby corre por detrás del panel. Siempre activo.
const AD_URL_FILTERS = [
  '*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*',
  '*://*.googletagservices.com/*', '*://adservice.google.com/*', '*://*.2mdn.net/*',
  '*://*.amazon-adsystem.com/*', '*://*.adnxs.com/*', '*://*.rubiconproject.com/*',
  '*://*.pubmatic.com/*', '*://*.openx.net/*', '*://*.criteo.com/*', '*://*.criteo.net/*',
  '*://*.taboola.com/*', '*://*.outbrain.com/*', '*://*.adsafeprotected.com/*',
  '*://*.moatads.com/*', '*://*.casalemedia.com/*', '*://*.smartadserver.com/*',
  '*://*.adform.net/*', '*://*.adsrvr.org/*', '*://*.gumgum.com/*', '*://*.33across.com/*',
  '*://*.sharethrough.com/*', '*://*.media.net/*', '*://*.contextweb.com/*',
  '*://*.lijit.com/*', '*://*.yieldmo.com/*', '*://*.bidswitch.net/*',
  '*://*.onetag-sys.com/*', '*://*.scorecardresearch.com/*',
];

function installNetworkGuards(session) {
  // Siempre activo (sin opción en la UI): los anuncios nunca se descargan.
  session.webRequest.onBeforeRequest({ urls: AD_URL_FILTERS }, (details, callback) => {
    callback({ cancel: true });
  });
}

// =============================================================================
// B. VENTANA DE CHATS + ATAJO
// =============================================================================
// Proceso principal: ventana propia de chats (siempre encima del juego, como el
// satélite de Lunar Client) + atajo de teclado.
//  - El atajo (CHAT_HOTKEY en config.js, por defecto F8) se engancha con
//    before-input-event en la UI de Vivet, en el <webview> del juego y en la
//    propia ventana de chats: funciona aunque el foco esté DENTRO del juego.
//  - Opcional: CHAT_HOTKEY_GLOBAL = true lo registra a nivel sistema (anda aunque
//    Vivet no tenga el foco; ojo que le quita esa tecla a las demás apps).
//  - Atajo: cerrada -> abre y enfoca | abierta con foco -> cierra y devuelve el foco
//    al juego | abierta sin foco -> la enfoca.
// Se inicializa desde main.js (ver los cambios al final de este archivo).

function initChatWindow({ app, BrowserWindow, ipcMain, screen, store }) {
  let mainWindow = null;
  let game = null;          // webContents del <webview> del juego
  let win = null;           // ventana de chats
  let quitting = false;
  let hk = null;            // atajo parseado
  let hkGlobal = false;
  let registered = null;    // acelerador registrado como global
  let lastHk = 0;
  let mainWasFocused = false;
  let saveT = null;

  const CHAT_URL_RE = /^https:\/\/www\.haxball\.com\/play\?c=[A-Za-z0-9_-]{6,64}$/;

  // ------------------------------------------------------------ atajo
  function parseHotkey(s) {
    if (typeof s !== 'string' || !s.trim()) return null;
    const parts = s.split('+').map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return null;
    const key = parts.pop().toLowerCase();
    const mods = parts.map((m) => m.toLowerCase());
    const has = (...n) => mods.some((m) => n.includes(m));
    return {
      accel: s.trim(),
      key,
      ctrl: has('ctrl', 'control', 'commandorcontrol', 'cmdorctrl'),
      shift: has('shift'),
      alt: has('alt'),
    };
  }
  const matches = (input) => !!hk && input.type === 'keyDown' && !input.isAutoRepeat && !input.meta &&
    String(input.key).toLowerCase() === hk.key && !!input.control === hk.ctrl && !!input.shift === hk.shift && !!input.alt === hk.alt;

  function loadHotkeys() {
    hk = parseHotkey(store.get('chatHotkey', 'F8')) || parseHotkey('F8');
    hkGlobal = !!store.get('chatHotkeyGlobal', false);
    try { if (registered) globalShortcut.unregister(registered); } catch (_) {}
    registered = null;
    if (hkGlobal && hk) {
      try { if (globalShortcut.register(hk.accel, onHotkey)) registered = hk.accel; } catch (_) {}
    }
  }

  // Se engancha a cualquier webContents (UI, juego, ventana de chats).
  function hook(contents) {
    contents.on('before-input-event', (e, input) => {
      if (!matches(input)) return;
      e.preventDefault();
      onHotkey();
    });
  }

  function onHotkey() {
    const n = Date.now();
    if (n - lastHk < 200) return;
    lastHk = n;
    const w = ensure();
    if (w.isVisible() && w.isFocused()) hideChat(); else showChat();
  }

  // ------------------------------------------------------------ ventana
  function onScreen(b) {
    return screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y < a.y + a.height - 40 && b.y + b.height > a.y;
    });
  }

  function ensure() {
    if (win && !win.isDestroyed()) return win;
    const saved = store.get('chatWinBounds', null);
    const b = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && onScreen(saved) ? saved : null;
    win = new BrowserWindow({
      width: (b && b.width) || (saved && saved.width) || 400,
      height: (b && b.height) || (saved && saved.height) || 580,
      ...(b ? { x: b.x, y: b.y } : {}),
      minWidth: 300,
      minHeight: 360,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#0d1016',
      title: 'Vivet Chats',
      icon: path.join(__dirname, 'assets', 'logo.png'),
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'), // expone vivetChat solo en chat-window.html
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: true,
      },
    });
    // 'screen-saver' la deja por encima incluso del juego en pantalla completa (F11).
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setMenuBarVisibility(false);
    const chatFile = path.join(__dirname, 'renderer', 'chat-window.html');
    const chatFail = (why) => {
      try {
        const html = '<body style="margin:0;background:#0d1016;color:#eef5fb;font:13px system-ui;padding:18px">' +
          '<b>No se pudo cargar la ventana de chats.</b><p style="color:#93a5b8">' + String(why).replace(/[<>&]/g, '') +
          '</p><p style="color:#93a5b8">Archivo esperado:<br>' + chatFile.replace(/[<>&]/g, '') + '</p></body>';
        if (win && !win.isDestroyed()) win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      } catch (_) {}
    };
    if (!fs.existsSync(chatFile)) chatFail('Falta renderer/chat-window.html en la app.');
    else win.loadFile(chatFile).catch((e) => chatFail(e && e.message ? e.message : e));
    let chatRetried = false;
    win.webContents.on('did-fail-load', (_e, code, desc, _url, isMain) => {
      if (!isMain || code === -3) return;
      if (!chatRetried) { chatRetried = true; setTimeout(() => { try { win.loadFile(chatFile).catch(() => {}); } catch (_) {} }, 400); }
      else chatFail(desc + ' (' + code + ')');
    });
    // Si el renderer de chats se cae (pasa a veces con la ventana oculta), se recarga solo.
    win.webContents.on('render-process-gone', () => {
      try { if (win && !win.isDestroyed()) win.loadFile(chatFile).catch(() => {}); } catch (_) {}
    });
    hook(win.webContents);

    const saveBounds = () => {
      clearTimeout(saveT);
      saveT = setTimeout(() => { try { if (win && !win.isDestroyed() && !win.isMinimized()) store.set('chatWinBounds', win.getBounds()); } catch (_) {} }, 400);
    };
    win.on('resize', saveBounds);
    win.on('move', saveBounds);
    win.on('show', () => tellMain(true));
    win.on('hide', () => tellMain(false));
    win.on('close', (e) => { if (!quitting) { e.preventDefault(); hideChat(); } });
    win.on('closed', () => { win = null; });
    return win;
  }

  function tellMain(open) {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('vivet-chat-window',{detail:${open ? 'true' : 'false'}}))`).catch(() => {});
      }
    } catch (_) {}
  }

  function mainHasFocus() {
    try {
      return !!((mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) || (game && !game.isDestroyed() && game.isFocused()));
    } catch (_) { return false; }
  }

  function showChat() {
    const w = ensure();
    if (!w.isVisible()) mainWasFocused = mainHasFocus();
    if (w.isMinimized()) w.restore();
    w.show();
    w.focus();
    w.moveTop();
  }

  function hideChat() {
    if (!win || win.isDestroyed()) return;
    win.hide();
    if (mainWasFocused && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      try { if (game && !game.isDestroyed()) game.focus(); } catch (_) {}
    }
  }

  // ------------------------------------------------------------ IPC
  ipcMain.handle('chat-window-hide', () => { hideChat(); return true; });
  ipcMain.handle('chat-get-token', () => String(store.get('friendsToken', '') || ''));

  ipcMain.handle('chat-my-room', async () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return null;
      const v = await mainWindow.webContents.executeJavaScript(
        `(function(){try{if(!appRoot.classList.contains('playing')||typeof currentRoomUrl==='undefined'||!currentRoomUrl)return null;return String(currentRoomUrl);}catch(e){return null;}})()`);
      return typeof v === 'string' ? v : null;
    } catch (_) { return null; }
  });

  ipcMain.handle('chat-join', async (_evt, url) => {
    try {
      if (typeof url !== 'string' || !CHAT_URL_RE.test(url)) return 'invalid';
      if (!mainWindow || mainWindow.isDestroyed()) return 'error';
      const r = await mainWindow.webContents.executeJavaScript(
        `(function(){try{if(appRoot.classList.contains('playing'))return 'playing';joinByUrl(${JSON.stringify(url)},null);return 'ok';}catch(e){return 'error';}})()`);
      if (r === 'ok') {
        hideChat();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      return r;
    } catch (_) { return 'error'; }
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (_) {} });
  if (app.isReady()) loadHotkeys(); else app.whenReady().then(loadHotkeys);

  // ------------------------------------------------------------ enganches para main.js
  return {
    attachMain(w) {
      mainWindow = w;
      quitting = false;
      hook(w.webContents);
      // El renderer abre la ventana con window.open('vivet-chat://open' | '://toggle'):
      // se intercepta acá.
      w.webContents.setWindowOpenHandler(({ url }) => {
        if (/^vivet-chat:\/\//.test(url)) {
          if (/toggle/.test(url)) onHotkey(); else showChat();
          return { action: 'deny' };
        }
        return { action: 'allow' };
      });
      // Si se cierra la ventana principal, la de chats (oculta) no tiene que mantener viva la app.
      w.on('closed', () => {
        quitting = true;
        mainWindow = null;
        if (win && !win.isDestroyed()) win.destroy();
        win = null;
      });
    },
    attachGame(contents) { game = contents; hook(contents); },
    onConfig(key) { if (key === 'chatHotkey' || key === 'chatHotkeyGlobal') loadHotkeys(); },
  };
}
const chatWin = initChatWindow({ app, BrowserWindow, ipcMain, screen, store });

// =============================================================================
// C. ARRANQUE Y VENTANA PRINCIPAL
// =============================================================================
// Los flags de GPU/Chromium se aplican mas abajo (applyPerformanceSwitches), justo despues del
// bloqueo de instancia y de la guardia de arranque, siempre antes de app.whenReady().

// DEBUG (temporal) - ERR_SSL_VERSION_OR_CIPHER_MISMATCH suele venir de un
// antivirus/proxy que hace inspección SSL y no soporta QUIC/TLS1.3 bien.
// Forzamos que Chromium ni intente QUIC, para descartarlo como causa.
// (se quitó 'disable-quic': era solo para debug y podía perjudicar la conexión con Haxball)

let mainWindow;
let discordClient = null;

// Instancia única: sin esto, un segundo Vivet (o uno que quedó colgado e invisible en segundo plano)
// comparte la misma carpeta de datos y Chromium falla con la caché / localStorage / IndexedDB
// bloqueados -> pantalla de carga eterna o ventana que "no abre". Ahora el 2.º intento solo
// trae al frente la ventana que ya existe (y si estaba oculta o colgada, la muestra y la recarga).
// Cuando el cliente se reinicia solo (cambio CPU/GPU, límite de FPS, watchdog) la instancia nueva
// puede arrancar ANTES de que la vieja termine de soltar el bloqueo: entonces se creía "segunda
// instancia" y se cerraba sola -> el cliente "se reiniciaba" y no volvía a abrir. Se suelta el bloqueo
// antes de relanzar y, además, la instancia relanzada reintenta unos segundos antes de rendirse.
const RELAUNCHED = process.argv.includes('--relaunched');
function relaunchApp() {
  try { app.releaseSingleInstanceLock(); } catch (_) {}
  app.relaunch({ args: process.argv.slice(1).filter((a) => a !== '--relaunched').concat('--relaunched') });
  app.exit(0);
}
let gotLock = app.requestSingleInstanceLock();
if (!gotLock && RELAUNCHED) {
  for (let i = 0; i < 16 && !gotLock; i++) {
    try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250); } catch (_) {}
    gotLock = app.requestSingleInstanceLock();
  }
}
if (!gotLock) {
  bootLog('segunda instancia: se cierra y se avisa a la primera');
  app.exit(0);
} else {
  app.on('second-instance', () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      const wasHidden = !mainWindow.isVisible();
      mainWindow.show();
      mainWindow.focus();
      if (wasHidden) { bootLog('second-instance con ventana oculta -> recarga'); mainWindow.reload(); }
    } catch (_) {}
  });
}

// ---------------------------------------------------------------------------
// Guardia anti-bucle de arranque
// ---------------------------------------------------------------------------
// Si activaste una opcion de rendimiento que en tu PC congela el cliente (Impulso de FPS, GPU
// "Alto rendimiento"/"Agresivo"...) y lo cerrabas antes de que el watchdog actuara, la opcion quedaba
// guardada y TODOS los arranques siguientes se congelaban: "ya ni abre". Ahora cada arranque se anota
// como "sin terminar" hasta que la interfaz confirma que cargo. Con 2 arranques seguidos sin terminar,
// el rendimiento vuelve a valores seguros antes de aplicar ningun flag.
// (Se hace solo en la instancia que tiene el bloqueo: una segunda instancia no cuenta.)
if (gotLock) {
  const pending = Number(store.get('bootPending', 0)) || 0;
  if (pending >= 2) {
    bootLog('guardia: ' + pending + ' arranques seguidos sin terminar -> rendimiento a valores seguros (CPU, sin Impulso de FPS)');
    store.set('gpuMode', 'off');
    store.set('fpsBoost', false);
    store.set('bootFails', 0);
    store.set('bootPending', 1);
  } else {
    store.set('bootPending', pending + 1);
  }
}
// Flags de GPU/Chromium: tienen que aplicarse antes de app.whenReady().
applyPerformanceSwitches(app, store);

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
    show: false, // se muestra recién cuando la interfaz dibujó el primer cuadro (ver ready-to-show)
    icon: path.join(__dirname, 'assets', 'logo.png'),
    title: 'Vivet Client',
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      ...PERF_WEB_PREFERENCES,
    },
  });
  chatWin.attachMain(mainWindow);
  // La ventana se muestra por la primera de estas vías que ocurra: ready-to-show, did-finish-load
  // o un temporizador de 2,5 s. Antes dependía solo de ready-to-show, que en algunas PCs (CPU/GPU,
  // ventana "ocluida") nunca llegaba y la ventana quedaba invisible. El fondo (#050608) es el mismo
  // del splash, así que no hay parpadeo.
  let shownOnce = false;
  const showOnce = (why) => {
    if (shownOnce || !mainWindow || mainWindow.isDestroyed()) return;
    shownOnce = true;
    bootLog('mostrar ventana (' + why + ')');
    try { mainWindow.show(); } catch (_) {}
  };
  mainWindow.once('ready-to-show', () => { bootLog('ready-to-show'); showOnce('ready-to-show'); });
  mainWindow.webContents.once('did-finish-load', () => showOnce('did-finish-load'));
  setTimeout(() => showOnce('timeout 2.5s'), 2500);
  mainWindow.on('unresponsive', () => bootLog('ventana NO responde'));
  mainWindow.on('responsive', () => bootLog('ventana volvió a responder'));
  mainWindow.webContents.on('render-process-gone', (_e, d) => bootLog('render-process-gone: ' + JSON.stringify(d)));
  mainWindow.webContents.on('did-finish-load', () => bootLog('did-finish-load'));
  mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) bootLog('renderer ' + (level === 3 ? 'ERROR' : 'warn') + ': ' + String(message).slice(0, 200) + ' (' + String(source).split('/').pop() + ':' + line + ')');
  });

  mainWindow.setMenuBarVisibility(false);

  // ---------------------------------------------------------------------
  // F11 = pantalla completa (como cualquier navegador). Esto solo capta la
  // tecla cuando el foco está en la UI de Vivet (sidebar/paneles); cuando
  // el foco está DENTRO del <webview> del juego hace falta el mismo
  // listener en su propio webContents, así que también se engancha más
  // abajo en 'web-contents-created' para los webview.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.key === 'Enter' && input.alt))) {
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

  // Anti-cuelgue del arranque: si la interfaz no carga o el renderer se cae, se recarga sola
  // (antes a veces quedaba para siempre en la pantalla de carga).
  const indexFile = path.join(__dirname, 'renderer', 'index.html');
  // ?boost=1 avisa a la interfaz que el tope de FPS esta suelto (ver index.html).
  const loadOpts = BOOST_ACTIVE ? { query: { boost: '1' } } : {};
  let loadRetries = 0;
  mainWindow.webContents.on('did-fail-load', (_e, code, _desc, _url, isMain) => {
    if (!isMain || code === -3 || loadRetries >= 3) return;
    loadRetries++;
    setTimeout(() => { try { mainWindow.loadFile(indexFile, loadOpts).catch(() => {}); } catch (_) {} }, 600);
  });
  let goneAt = [];
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    if (details && details.reason === 'clean-exit') return;
    const now = Date.now();
    goneAt = goneAt.filter((t) => now - t < 60000).concat(now);
    bootLog('render-process-gone #' + goneAt.length + ' en 60 s: ' + (details && details.reason));
    if (goneAt.length > 3) return; // evita el bucle de recargas si se cae siempre
    setTimeout(() => { try { mainWindow.show(); mainWindow.reload(); } catch (_) {} }, 400);
  });
  mainWindow.webContents.on('did-finish-load', () => { loadRetries = 0; });
  // Seguro independiente de la página: a los 5 s del arranque se saca la pantalla de carga
  // desde acá, aunque el script de la interfaz no haya llegado a correr.
  mainWindow.webContents.on('dom-ready', () => {
    setTimeout(() => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.executeJavaScript(
          "(function(){var s=document.getElementById('splash');if(!s)return;s.classList.add('hide');var a=document.getElementById('app-root');if(a)a.classList.add('intro');setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},800);if(window.__vivetLoadGame)window.__vivetLoadGame()})()"
        ).catch(() => {});
      } catch (_) {}
    }, 5000);
  });

  mainWindow.loadFile(indexFile, loadOpts);
  startBootWatchdog();
}

// ---------------------------------------------------------------------------
// Watchdog de arranque (anti "se queda congelado al abrir")
// ---------------------------------------------------------------------------
// ANTES: a los 5 s recargaba la ventana si la pantalla de carga seguía visible. En PCs lentas
// (antivirus escaneando, modo CPU, primer arranque) la carga normal tarda más que eso, así que
// el cliente se recargaba SOLO una y otra vez ("se queda cargando y se reinicia"), o pasaba a modo CPU
// y se relanzaba sin necesidad.
// AHORA (a los 12 s): se le pregunta a la interfaz si ya sacó la pantalla de carga.
//   - ya salió                -> todo OK.
//   - responde pero sigue ahí -> está viva, solo lenta: se saca la pantalla de carga a la fuerza
//                                (sin recargar, sin tocar la config y sin contar como fallo).
//   - NO responde (colgada)   -> con GPU activada pasa a modo CPU y reinicia (una vez);
//                                ya en CPU recarga (máx. 2 veces) y la muestra igual.
const FORCE_HIDE_SPLASH_JS =
  "(function(){var s=document.getElementById('splash');if(s){s.classList.add('hide');setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},800);}" +
  "var a=document.getElementById('app-root');if(a)a.classList.add('intro');if(window.__vivetLoadGame)window.__vivetLoadGame();return true;})()";
const SPLASH_STATE_JS = "(function(){var s=document.getElementById('splash');return !s||s.classList.contains('hide');})()";
function startBootWatchdog() {
  // Sondeo: se pregunta cada 1,5 s (desde los 3 s) y el arranque se da por bueno en cuanto la
  // interfaz sacó la pantalla de carga. Así el aviso "arranque sin terminar" dura lo mínimo (si
  // cerrás el cliente justo al abrir, se cuenta para la guardia) y las PCs rápidas no esperan 12 s.
  // A los 12 s sin respuesta se aplica la logica de fallo de siempre.
  const t0 = Date.now();
  let done = false;
  const ask = () => Promise.race([
    mainWindow.webContents.executeJavaScript(SPLASH_STATE_JS, true),
    new Promise((r) => setTimeout(() => r('timeout'), 3000)),
  ]).catch(() => 'timeout');
  const markOk = (why) => {
    if (done) return;
    done = true;
    bootLog('arranque OK (' + why + ')');
    store.set('bootFails', 0);
    store.set('bootPending', 0);
    try { if (!mainWindow.isVisible()) mainWindow.show(); } catch (_) {}
  };
  const poll = async () => {
    if (done || !mainWindow || mainWindow.isDestroyed()) return;
    const state = await ask();
    if (done || !mainWindow || mainWindow.isDestroyed()) return;
    if (state === true) return markOk(Math.round((Date.now() - t0) / 100) / 10 + ' s');
    if (Date.now() - t0 < 12000) { setTimeout(poll, 1500); return; }
    done = true;
    try { if (!mainWindow.isVisible()) mainWindow.show(); } catch (_) {}
    if (state === false) {
      bootLog('arranque lento: la interfaz responde pero seguía la pantalla de carga -> se fuerza (sin recargar)');
      try { await mainWindow.webContents.executeJavaScript(FORCE_HIDE_SPLASH_JS, true); } catch (_) {}
      store.set('bootFails', 0);
      store.set('bootPending', 0);
      return;
    }
    const fails = (Number(store.get('bootFails', 0)) || 0) + 1;
    store.set('bootFails', fails);
    const mode = gpuModeOf(store);
    bootLog('arranque FALLÓ: la interfaz no responde (#' + fails + ', gpuMode=' + mode + ', fpsBoost=' + store.get('fpsBoost', false) + ')');
    if (mode !== 'off' || store.get('fpsBoost', false)) {
      store.set('gpuMode', 'off');
      store.set('fpsBoost', false);
      store.set('bootPending', 0);
      bootLog('-> pasando a modo CPU sin Impulso de FPS y reiniciando');
      relaunchApp();
    } else if (fails <= 2) {
      try { mainWindow.show(); mainWindow.reload(); } catch (_) {}
      startBootWatchdog();
    } else {
      store.set('bootFails', 0);
      store.set('bootPending', 0);
      try { mainWindow.show(); } catch (_) {}
    }
  };
  setTimeout(poll, 3000);
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

// =============================================================================
// D. IPC: webview, auth, replays, config, Discord
// =============================================================================
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
  // Solo http(s): el foro muestra links de otros usuarios, no se abre cualquier protocolo.
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
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

// Cada store.get() relee y parsea TODO el JSON del disco (con fondo de imagen, mapas guardados, etc. pesa).
// Al arrancar la interfaz pide ~35 valores seguidos: en PCs lentas eso sumaba segundos. Se lee una vez
// y se invalida en cada escritura.
let cfgCache = null;
try { store.onDidAnyChange(() => { cfgCache = null; }); } catch (_) {}
ipcMain.handle('config-get', (_evt, key, def) => {
  if (typeof key !== 'string' || key.includes('.')) return store.get(key, def);
  if (!cfgCache) { try { cfgCache = store.store || {}; } catch (_) { return store.get(key, def); } }
  return Object.prototype.hasOwnProperty.call(cfgCache, key) && cfgCache[key] !== undefined ? cfgCache[key] : def;
});
ipcMain.handle('config-set', (_evt, key, value) => { store.set(key, value); cfgCache = null; chatWin.onConfig(key); });

ipcMain.handle('get-app-version', () => app.getVersion());

// Hz del monitor donde está la ventana (para el tope del Impulso de FPS).
ipcMain.handle('display-hz', (evt) => {
  try {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const d = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
    return Number(d.displayFrequency) || 60;
  } catch (_) { return 60; }
});

ipcMain.handle('app-relaunch', () => { relaunchApp(); });

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