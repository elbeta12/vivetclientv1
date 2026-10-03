// Vivet Client - config.js
// Config editable a mano. Se carga ANTES que app.js (ver index.html).
// No hay UI para esto a propósito: se edita directo acá y listo.

// -----------------------------------------------------------------------
// Amigos / perfiles (servidor propio, ver server/README.md)
// URL pública del servidor, sin barra final. Vacío = la sección Amigos
// avisa que no está configurada. NUNCA pongas acá el token de Turso.
// -----------------------------------------------------------------------
const FRIENDS_API_URL = 'http://78.154.103.30:9266';

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
    { label: 'ᴠɪᴠᴇᴛ ᴊᴜᴇɢᴀɴ ᴛᴏᴅᴏs ┃ ᴄᴏʟᴏᴍʙɪᴀ', url: 'https://www.haxball.com/play?c=RDSKysTCsaY' },
];

// -----------------------------------------------------------------------
// Comandos rápidos del chat
// Escribís el atajo y apretás Tab, Espacio o Enter: "/ex" pasa a "/extrapolation".
// Formato:  atajo: 'comando_completo'  (sin la barra). Agregá los que quieras.
// -----------------------------------------------------------------------
const CHAT_ALIASES = {
    ex: 'extrapolation',
    av: 'avatar',
    ca: 'clear_avatar',
    col: 'colors',
    hc: 'handicap',
    kr: 'kick_ratelimit',
    cb: 'clear_bans',
    sp: 'set_password',
    cp: 'clear_password',
};


// Pegalo en config.js (por ejemplo debajo de CHAT_ALIASES)

// -----------------------------------------------------------------------
// Chats: atajo para abrir/cerrar la ventana de chats mientras jugás.
// Formato: 'F8', 'Ctrl+Shift+C', 'Alt+C'... Funciona con el foco dentro del juego.
// CHAT_HOTKEY_GLOBAL = true lo registra a nivel sistema (anda aunque Vivet no
// tenga el foco, pero esa tecla deja de funcionar en las demás apps).
// -----------------------------------------------------------------------
const CHAT_HOTKEY = 'F8';
const CHAT_HOTKEY_GLOBAL = false;


// -----------------------------------------------------------------------
// Emblema de usuarios del cliente (lista de jugadores dentro del juego)
// Cada cliente agrega al final de su nick una marca invisible; los que usan
// Vivet Client la detectan y muestran un emblema junto al nombre (el dibujo
// se cambia en el CSS de abajo: .vv-client-name::before). Quien no usa el
// cliente no ve nada. Poné CLIENT_BADGE_ENABLED = false para apagarlo.
// Es cosmético: no verifica nada, cualquiera que copie la marca lo mostraría.
// -----------------------------------------------------------------------
const CLIENT_BADGE_ENABLED = true;
const CLIENT_BADGE_MARK = '\u200C\u2060';


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

/* Animaciones de los diálogos y la sala (solo al aparecer; no afectan al juego) */
@keyframes vv-pop-in {
  from { opacity: 0; transform: translateY(10px) scale(.96); }
  to   { opacity: 1; transform: none; }
}
@keyframes vv-fade-in { from { opacity: 0; } to { opacity: 1; } }
.dialog { animation: vv-pop-in .26s cubic-bezier(.22, 1, .36, 1) both; }
.room-view > .container { animation: vv-pop-in .32s cubic-bezier(.22, 1, .36, 1) both; }
.chatbox-view-contents { animation: vv-fade-in .25s ease both; }
.dialog button, .room-view > .container button { transition: background-color .15s ease, border-color .15s ease, transform .12s ease; }
.dialog button:active:not(:disabled), .room-view > .container button:active:not(:disabled) { transform: scale(.97); }
.room-view .player-list-item { transition: background-color .15s ease; }
.chatbox-view-contents > .autocompletebox > div { transition: background-color .1s ease; }
@media (prefers-reduced-motion: reduce) {
  .dialog, .room-view > .container, .chatbox-view-contents { animation: none !important; }
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
/* --- BAR CONTAINER --- */
.game-state-view .bar-container {
  top: 10px !important;
}

/* --- BAR PRINCIPAL CON RELIEVE Y BISELADO --- */
.game-state-view .bar {
  background: linear-gradient(
    180deg,
    var(--vv-panel-2) 0%,
    rgba(0, 0, 0, 0.15) 100%
  ) !important;
  border: 1px solid var(--vv-border) !important;
  border-radius: var(--vv-r-md) !important;
  padding: 8px 20px !important;

  /* Relieve mediante sombras compuestas (Sombra exterior + Brillo de borde interno) */
  box-shadow: 
    0 8px 16px -4px rgba(0, 0, 0, 0.4),            /* Sombra principal de caída */
    0 4px 6px -2px rgba(0, 0, 0, 0.2),             /* Sombra suave intermedia */
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.25),   /* Bisel metálico superior (Brillo) */
    inset 0 -2px 4px 0 rgba(0, 0, 0, 0.4) !important;/* Bisel de sombra inferior */

  position: relative;
  /* Sin backdrop-filter: desenfocar el canvas del juego en cada cuadro cuesta FPS. */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* --- SCOREBOARD CON EFFECTO DE PANTALLA HUNDIDA (EMBOSSED) --- */
.game-state-view .bar > .scoreboard {
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: var(--vv-r-sm, 6px);
  padding: 4px 12px;
  /* Efecto hundido hacia dentro */
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.6),
    0 1px 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.game-state-view .bar > .scoreboard .score {
  color: var(--vv-accent) !important;
  font-weight: 800 !important;
  /* Relieve del texto mediante texto sombreado y resplandor (Glow) */
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 10px var(--vv-accent);
  letter-spacing: 0.5px;
}

/* --- CRONÓMETRO DIGITAL EN RELIEVE --- */
.game-timer-view {
  color: var(--vv-text) !important;
  font-weight: 700 !important;
  font-feature-settings: "tnum"; /* Números monoespaciados para que no salten */
  font-variant-numeric: tabular-nums;
  text-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.9),
    0 0 6px rgba(255, 255, 255, 0.2);
}

/* --- ANIMACIÓN MEJORADA DE ADVERTENCIA DE TIEMPO --- */
@keyframes time-warn {
  from { color: var(--vv-text); }
  to   { color: var(--vv-danger); }
}

.game-timer-view.warning {
  animation: time-warn 0.8s infinite alternate steps(2, jump-none);
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

/* Chat expandido: solo se agranda el CUADRO (contenedor + su padre), no se
   toca ningún estilo de los mensajes ni del log. La clase vv-chat-open la
   pone/quita chatExpandInPage (app.js) mientras el input está enfocado. */
.vv-chat-open {
  min-height: min(30vh, 320px) !important;
  max-height: 45vh !important;
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
   EMBLEMA DE USUARIOS DEL CLIENTE (lista de jugadores)
   La clase vv-client-name la pone clientBadgeInPage (app.js) a los
   jugadores que usan Vivet Client. Para cambiar el dibujo, editá "content".
   --------------------------------------------------------------------- */
.vv-client-name::before {
  content: "";
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  margin-right: 6px;
  vertical-align: 0.05em;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--vv-accent), var(--vv-accent-2));
  box-shadow: 0 0 6px var(--vv-accent-border);
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