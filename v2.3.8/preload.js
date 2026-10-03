const { contextBridge, ipcRenderer } = require('electron');

// Ventana de chats (renderer/chat-window.html): expone SOLO lo justo para chatear.
// chat.js usa window.vivetChat para saber que está en esa ventana, así que en el
// cliente principal no se expone. (antes: chat-preload.js)
if (/chat-window\.html$/.test(location.pathname)) {
  contextBridge.exposeInMainWorld('vivetChat', {
    getToken: () => ipcRenderer.invoke('chat-get-token'),
    myRoomUrl: () => ipcRenderer.invoke('chat-my-room'),
    join: (url) => ipcRenderer.invoke('chat-join', url),
    hide: () => ipcRenderer.invoke('chat-window-hide'),
  });
} else {
  contextBridge.exposeInMainWorld('vivet', {
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    // Ver comentario junto al handler en main.js - limpia caché/DNS/auth de
    // la sesión del webview del juego, usado cuando el handshake TLS falla
    // de forma persistente (ver did-fail-load en app.js).
    resetGameNetwork: (webContentsId) => ipcRenderer.invoke('webview-reset-network', webContentsId),

    // Ejecuta código JS dentro del <webview>, en UN frame (frameTreeNodeId
    // opcional para apuntar a un frame ya identificado).
    execInWebview: (webContentsId, code, frameTreeNodeId) =>
      ipcRenderer.invoke('webview-exec', webContentsId, code, frameTreeNodeId),
    // Ejecuta el mismo código en TODOS los frames del webview y devuelve un
    // resultado por cada uno - usado para encontrar el frame correcto (salas)
    // y para el panel de Diagnóstico.
    execInWebviewAll: (webContentsId, code) => ipcRenderer.invoke('webview-exec-all', webContentsId, code),
    // Foco "real" del webContents del guest, hecho desde el proceso
    // principal. view.focus() (DOM, desde el renderer) no siempre logra que
    // Chromium le pase el foco de teclado de verdad al guest - esto sí.
    focusWebview: (webContentsId, width, height) => ipcRenderer.invoke('webview-focus', webContentsId, width, height),

    // Foco suave (sin click simulado): ver webview-focus-soft en main.js
    focusWebviewSoft: (webContentsId) => ipcRenderer.invoke('webview-focus-soft', webContentsId),

    // Auth de Haxball (solo ID público), ver main.js
    readAuth: () => ipcRenderer.invoke('auth-read'),
    // Migrar tu identidad desde el navegador: la clave va solo hacia main.
    importAuth: (privateKey) => ipcRenderer.invoke('auth-import', privateKey),
    restoreAuth: () => ipcRenderer.invoke('auth-restore'),


    // Replays (.hbr2), ver main.js
    replayList: () => ipcRenderer.invoke('replay-list'),
    replayPick: () => ipcRenderer.invoke('replay-pick'),
    replayRead: (filePath) => ipcRenderer.invoke('replay-read', filePath),

    // Imagen de fondo (archivo propio, no la config), ver main.js
    bgImageGet: () => ipcRenderer.invoke('bg-image-get'),
    bgImageSet: (dataUrl) => ipcRenderer.invoke('bg-image-set', dataUrl),

    getConfig: (key, def) => ipcRenderer.invoke('config-get', key, def),
    setConfig: (key, value) => ipcRenderer.invoke('config-set', key, value),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    // Anti-AFK: ms desde la última tecla apretada en el juego (null si ninguna todavía)
    gameInputAge: () => ipcRenderer.invoke('game-input-age'),
    // CORREGIDO (26/09) - esto nunca estaba expuesto acá. app.js llama a
    // `window.vivet.relaunch?.()` después de tocar "Destrabar límite de FPS",
    // pero como la función no existía, el `?.()` simplemente no hacía nada:
    // la app JAMÁS se reiniciaba sola y el flag de Chromium nunca llegaba a
    // aplicarse (por eso el toggle "no servía" / parecía no tener efecto).
    relaunch: () => ipcRenderer.invoke('app-relaunch'),

    // Hz del monitor (proceso principal), ver 'display-hz' en main.js
    displayHz: () => ipcRenderer.invoke('display-hz'),

    discordConnect: (clientId) => ipcRenderer.invoke('discord-connect', clientId),
    discordSetActivity: (activity) => ipcRenderer.invoke('discord-set-activity', activity),
    discordClearActivity: () => ipcRenderer.invoke('discord-clear-activity'),

    // Actualizaciones: ver sección E de main.js y "Aviso de actualización" en app2.js
    checkForUpdates: () => ipcRenderer.invoke('update-check'),
    update: {
      getState: () => ipcRenderer.invoke('update-get-state'),
      onState: (cb) => ipcRenderer.on('update-state', (_e, st) => cb(st)),
      download: () => ipcRenderer.invoke('update-download'),
      install: () => ipcRenderer.invoke('update-install'),
      later: () => ipcRenderer.invoke('update-later'),
      skip: () => ipcRenderer.invoke('update-skip'),
    },

    version: process.versions.electron,
  });
}