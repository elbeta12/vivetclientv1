const { contextBridge, ipcRenderer } = require('electron');

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

  // Auth de Haxball (solo ID público), ver main.js
  readAuth: () => ipcRenderer.invoke('auth-read'),
  // Migrar tu identidad desde el navegador: la clave va solo hacia main.
  importAuth: (privateKey) => ipcRenderer.invoke('auth-import', privateKey),
  restoreAuth: () => ipcRenderer.invoke('auth-restore'),


  // Replays (.hbr2), ver main.js
  replayList: () => ipcRenderer.invoke('replay-list'),
  replayPick: () => ipcRenderer.invoke('replay-pick'),
  replayRead: (filePath) => ipcRenderer.invoke('replay-read', filePath),

  getConfig: (key, def) => ipcRenderer.invoke('config-get', key, def),
  setConfig: (key, value) => ipcRenderer.invoke('config-set', key, value),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // CORREGIDO (26/09) - esto nunca estaba expuesto acá. app.js llama a
  // `window.vivet.relaunch?.()` después de tocar "Destrabar límite de FPS",
  // pero como la función no existía, el `?.()` simplemente no hacía nada:
  // la app JAMÁS se reiniciaba sola y el flag de Chromium nunca llegaba a
  // aplicarse (por eso el toggle "no servía" / parecía no tener efecto).
  relaunch: () => ipcRenderer.invoke('app-relaunch'),

  discordConnect: (clientId) => ipcRenderer.invoke('discord-connect', clientId),
  discordSetActivity: (activity) => ipcRenderer.invoke('discord-set-activity', activity),
  discordClearActivity: () => ipcRenderer.invoke('discord-clear-activity'),

  version: process.versions.electron,
});