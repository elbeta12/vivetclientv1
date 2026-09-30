// Vivet Client - chat-preload.js
// Preload de la ventana de chats. Solo expone lo justo (nada de Node en la página).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vivetChat', {
  getToken: () => ipcRenderer.invoke('chat-get-token'),
  myRoomUrl: () => ipcRenderer.invoke('chat-my-room'),
  join: (url) => ipcRenderer.invoke('chat-join', url),
  hide: () => ipcRenderer.invoke('chat-window-hide'),
});
