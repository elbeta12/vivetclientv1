// Vivet Client - chat-window-main.js
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

const path = require('path');
const { globalShortcut } = require('electron');

module.exports = function initChatWindow({ app, BrowserWindow, ipcMain, screen, store }) {
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
        preload: path.join(__dirname, 'chat-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: true,
      },
    });
    // 'screen-saver' la deja por encima incluso del juego en pantalla completa (F11).
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, 'renderer', 'chat-window.html'));
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
      // se intercepta acá (no hace falta tocar preload.js).
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
};

/* ---------------------------------------------------------------------------
   CAMBIOS EN main.js (4 líneas)

   1) Después de `const store = new Store(...)`:
        const chatWin = require('./chat-window-main')({ app, BrowserWindow, ipcMain, screen, store });

   2) En createWindow(), justo después de `mainWindow = new BrowserWindow({...});`:
        chatWin.attachMain(mainWindow);

   3) En app.on('web-contents-created'), dentro del `if (contents.getType() === 'webview') {`:
        chatWin.attachGame(contents);

   4) Reemplazá el handler de config-set por:
        ipcMain.handle('config-set', (_evt, key, value) => { store.set(key, value); chatWin.onConfig(key); });
   --------------------------------------------------------------------------- */