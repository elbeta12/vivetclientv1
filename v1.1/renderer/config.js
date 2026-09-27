// Vivet Client - config.js
// Config editable a mano. Se carga ANTES que app.js (ver index.html).
// No hay UI para esto a propósito: se edita directo acá y listo.

// -----------------------------------------------------------------------
// Chequeo de actualizaciones
// -----------------------------------------------------------------------
const UPDATE_MANIFEST_URL = 'https://github.com/elbeta12/vivetclientv1';

// -----------------------------------------------------------------------
// Discord Rich Presence
// -----------------------------------------------------------------------
const DISCORD_CLIENT_ID = '1542644480816058450';
const DISCORD_LARGE_IMAGE_KEY = 'logo';
const DISCORD_INVITE_URL = 'https://discord.gg/r54eJWGVyW';

// -----------------------------------------------------------------------
// Salas ancladas
// -----------------------------------------------------------------------
const PINNED_ROOMS = [
    { label: '💛💫 ᴠɪᴠᴇᴛ ᴊᴜᴇɢᴀɴ ᴛᴏᴅᴏs ┃ ᴄᴏʟᴏᴍʙɪᴀ ┃ 💫💛', url: 'https://www.haxball.com/play?c=RDSKysTCsaY' },
];

// -----------------------------------------------------------------------
// CSS personalizado DENTRO del juego
// -----------------------------------------------------------------------
const CUSTOM_GAME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* =====================================================================
   Tema Vivet para haxball.com/play.
   ===================================================================== */
:root {
  --vv-panel: #0d1016;
  --vv-panel-2: #12161e;
  --vv-panel-3: #171c26;
  --vv-border: #1e2430;
  --vv-text: #eef5fb;
  --vv-text-dim: #93a5b8;
  --vv-accent: #17e0e8;
  --vv-accent-2: #0aa8c9;
  --vv-accent-soft: rgba(23, 224, 232, 0.12);
  --vv-accent-border: rgba(23, 224, 232, 0.35);
  --vv-success: #3ddc84;
  --vv-danger: #ff5470;
  --vv-warn: #f5b74b;
  --vv-shadow: 0 14px 32px rgba(0, 0, 0, 0.45);
  --vv-shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.3);
  --vv-r-lg: 16px;
  --vv-r-md: 10px;
  --vv-r-sm: 8px;
}

/* Tipografía general adentro del juego */
.dialog, .room-view > .container, .chatbox-view-contents,
.settings-view, .stats-view, .game-timer-view, .game-state-view .bar {
  font-family: 'Inter', 'Arial Black', Arial, sans-serif !important;
}

/* Scrollbars finas */
.thin-scrollbar, .subtle-thin-scrollbar {
  scrollbar-color: var(--vv-accent-border) rgba(0, 0, 0, 0.25) !important;
}
.thin-scrollbar::-webkit-scrollbar, .subtle-thin-scrollbar::-webkit-scrollbar {
  background-color: rgba(0, 0, 0, 0.25) !important;
}
.thin-scrollbar::-webkit-scrollbar-thumb, .subtle-thin-scrollbar::-webkit-scrollbar-thumb {
  background: var(--vv-accent-border) !important;
  border-radius: 10px !important;
}

/* ---------------------------------------------------------------------
   MARCADOR
   --------------------------------------------------------------------- */
.game-state-view .bar-container {
  top: 10px !important;
}
.game-state-view .bar {
  background-color: var(--vv-panel-2) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-md) !important;
  box-shadow: var(--vv-shadow-sm) !important;
  padding: 6px 18px !important;
}
.game-state-view .bar > .scoreboard .score {
  color: var(--vv-accent) !important;
  font-weight: 800 !important;
}
.game-timer-view {
  color: var(--vv-text) !important;
  font-weight: 700 !important;
}
@keyframes time-warn {
  from { color: var(--vv-text); }
  to   { color: var(--vv-danger); }
}

/* ---------------------------------------------------------------------
   DIÁLOGOS + SALA
   --------------------------------------------------------------------- */
.dialog, .room-view > .container {
  background-color: var(--vv-panel) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-lg) !important;
  box-shadow: var(--vv-shadow) !important;
}
.dialog > h1, .room-view > .container > h1 {
  border-bottom-color: var(--vv-accent) !important;
  color: var(--vv-text) !important;
}
.dialog button, .room-view > .container button {
  background-color: var(--vv-panel-3) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-sm) !important;
  color: var(--vv-text) !important;
  transition: background-color .15s ease, border-color .15s ease;
}
.dialog button:hover, .room-view > .container button:hover {
  background-color: var(--vv-accent-soft) !important;
  border-color: var(--vv-accent-border) !important;
}
.dialog button:active, .room-view > .container button:active {
  background-color: var(--vv-accent-border) !important;
}
.dialog button:disabled, .room-view > .container button:disabled {
  background-color: var(--vv-panel-2) !important;
  color: var(--vv-text-dim) !important;
}
.dialog input:not([type=range]), .room-view > .container input:not([type=range]),
.dialog select, .room-view > .container select {
  background-color: var(--vv-panel-2) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-sm) !important;
  color: var(--vv-text) !important;
}
.dialog input:focus:not([type=range]), .room-view > .container input:focus:not([type=range]) {
  border-color: var(--vv-accent) !important;
}
.dialog .label-input, .room-view > .container .label-input {
  background-color: var(--vv-panel-2) !important;
  border: 1px solid var(--vv-border) !important;
}

/* Empezar / parar partido */
.room-view button[data-hook=start-btn] {
  background-color: var(--vv-success) !important;
  border-color: var(--vv-success) !important;
  color: #06120c !important;
}
.room-view button[data-hook=stop-btn] {
  background-color: var(--vv-danger) !important;
  border-color: var(--vv-danger) !important;
  color: #200008 !important;
}

/* Lista de jugadores */
.room-view .player-list-view .list {
  background-color: var(--vv-panel) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-sm) !important;
}
.room-view .player-list-item:hover {
  background-color: var(--vv-panel-3) !important;
  border-radius: 6px !important;
}
.room-view > .container > .settings [data-hook=stadium-name].custom {
  color: var(--vv-warn) !important;
}

/* ---------------------------------------------------------------------
   CHAT (Colores de mensajes dejados por defecto según la sala/Haxball)
   --------------------------------------------------------------------- */
.chatbox-view-contents {
  background-color: rgba(13, 16, 22, var(--chat-opacity, 0.92)) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-md) var(--vv-r-md) 0 0 !important;
  box-shadow: var(--vv-shadow-sm) !important;
}

.chatbox-view-contents > .input input[type=text] {
  background-color: var(--vv-panel-2) !important;
  border-radius: var(--vv-r-sm) !important;
  color: var(--vv-text) !important;
}
.chatbox-view-contents > .input input[type=text]:focus {
  border: 1px solid var(--vv-accent) !important;
  padding: 0 7px !important;
}
.chatbox-view-contents > .input button {
  background-color: var(--vv-accent) !important;
  color: #04181a !important;
  border-radius: var(--vv-r-sm) !important;
}
.chatbox-view-contents > .input button:hover {
  background-color: var(--vv-accent-2) !important;
}
.chatbox-view-contents > .autocompletebox {
  background-color: var(--vv-panel-2) !important;
  color: var(--vv-text) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-sm) !important;
}
.chatbox-view-contents > .autocompletebox > div:hover {
  background-color: var(--vv-accent-soft) !important;
}
.chatbox-view-contents > .autocompletebox > div.selected {
  background-color: var(--vv-accent-border) !important;
}

/* ---------------------------------------------------------------------
   AJUSTES
   --------------------------------------------------------------------- */
.settings-view .tabs .selected {
  background-color: var(--vv-accent) !important;
  color: #04181a !important;
}
.settings-view .section .toggle:hover {
  background-color: var(--vv-panel-3) !important;
}
.settings-view .section select {
  background-color: var(--vv-panel-2) !important;
}
.settings-view .section select:hover {
  background-color: var(--vv-panel-3) !important;
}
.settings-view .section .inputrow:nth-child(odd) {
  background-color: var(--vv-panel-2) !important;
}
.settings-view .section .inputrow > :not(:first-child) {
  background-color: var(--vv-panel-3) !important;
  border-radius: var(--vv-r-sm) !important;
}
.settings-view .section .inputrow > :not(:first-child):hover {
  background-color: var(--vv-accent-soft) !important;
}

/* ---------------------------------------------------------------------
   PING / FPS
   --------------------------------------------------------------------- */
.stats-view {
  background-color: var(--vv-panel) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-sm) !important;
  box-shadow: var(--vv-shadow-sm) !important;
  color: var(--vv-text) !important;
  text-shadow: none !important;
}

/* ---------------------------------------------------------------------
   VOLUMEN
   --------------------------------------------------------------------- */
.sound-button-container .sound-slider {
  background-color: var(--vv-panel) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-md) !important;
  box-shadow: var(--vv-shadow-sm) !important;
}
.sound-button-container .sound-slider-bar-bg {
  background-color: var(--vv-panel-3) !important;
}
.sound-button-container .sound-slider-bar {
  background-color: var(--vv-accent) !important;
}
`;