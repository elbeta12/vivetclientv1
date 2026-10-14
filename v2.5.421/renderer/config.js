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
// Color de TUS mensajes en el chat del juego ('' = desactivado)
// -----------------------------------------------------------------------
const CHAT_OWN_COLOR = '#17e0e8';


// -----------------------------------------------------------------------
// Competitivo: anti-AFK (el XP solo suma si de verdad estás jugando)
// COMP_AFK_MINUTES: minutos sin tocar una tecla en el juego antes de pausar el XP.
// COMP_AFK_MIN_KEYS: pulsaciones mínimas (con al menos 2 teclas distintas) dentro de
//   esos minutos. Evita que una sola tecla de vez en cuando alcance para farmear XP.
// COMP_AFK_ROBOT_CHECK: pausa el XP si las pulsaciones tienen un ritmo perfecto de macro.
// -----------------------------------------------------------------------
const COMP_AFK_MINUTES = 2;
const COMP_AFK_MIN_KEYS = 3;
const COMP_AFK_ROBOT_CHECK = true;


// -----------------------------------------------------------------------
// Sala con el juego PARADO (cuando se ve "Start game"): en vez de la cancha de fondo,
// se muestra un fondo gris liso con el logo de Vivet a la izquierda.
// Solo aplica con el juego parado: durante un partido (aunque abras el menú con Esc) se ve el juego normal.
// STOP_BG_COLOR: color del fondo (cualquier color CSS: '#2b2f37', 'rgb(40,44,52)'...)
// STOP_BG_LOGO:  false = solo el fondo gris, sin logo
// STOP_BG_SELECTOR: elemento de Haxball que indica "estoy en el lobby de la sala"
// -----------------------------------------------------------------------
const STOP_BG_ENABLED = true;
const STOP_BG_COLOR = '#2b2f37';
const STOP_BG_LOGO = true;
const STOP_BG_SELECTOR = '.room-view';


// -----------------------------------------------------------------------
// Animación al hacer un gol (estrella fugaz + texto, dentro del juego)
// -----------------------------------------------------------------------
const GOAL_ANIM_ENABLED = true;
const GOAL_ANIM_TEXT = '¡GOL!';
// Sonido sintetizado (whoosh + campanita) al hacer gol:
const GOAL_ANIM_SOUND = false;
// Oculta el cartel original "Red/Blue Scores!" del juego:
const GOAL_HIDE_NATIVE = true;
// Solo para diagnóstico: tras cada gol muestra en pantalla qué textos/imágenes dibuja el juego (clic para cerrar).
const GOAL_DEBUG = false;


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
  color: var(--vv-accent) !important;   /* respaldo si Haxball cambia los data-hook */
  font-weight: 800 !important;
  font-variant-numeric: tabular-nums;   /* los números no "bailan" al cambiar */
  min-width: 1.1ch;
  text-align: center;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 10px var(--vv-accent);
  letter-spacing: 0.5px;
}
/* Cada puntaje con el color de SU equipo (rojo / azul) */
.game-state-view [data-hook=red-score] {
  color: var(--vv-red) !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 12px var(--vv-red-glow);
}
.game-state-view [data-hook=blue-score] {
  color: var(--vv-blue) !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 12px var(--vv-blue-glow);
}
/* Separador del marcador más apagado, para que destaquen los números */
.game-state-view .bar > .scoreboard { color: var(--vv-text-dim); }
/* Iconos de equipo con un borde fino para que se vean sobre cualquier fondo */
.game-state-view .bar .teamicon {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22), 0 2px 6px rgba(0, 0, 0, 0.5);
}
/* La barra no se selecciona por accidente al clickear rápido */
.game-state-view .bar { user-select: none; -webkit-user-select: none; }

/* Al hacer gol, el puntaje del equipo que anotó "salta" (sincronizado con la
   animación de gol: usa el #vv-goal que crea goalAnimInPage). */
@keyframes vv-score-pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.6); }
  100% { transform: scale(1); }
}
html:has(#vv-goal.vv-goal-red) .game-state-view [data-hook=red-score],
html:has(#vv-goal.vv-goal-blue) .game-state-view [data-hook=blue-score] {
  animation: vv-score-pop .9s .55s cubic-bezier(.2, 1.4, .4, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  html:has(#vv-goal) .game-state-view [data-hook=red-score],
  html:has(#vv-goal) .game-state-view [data-hook=blue-score] { animation: none; }
}

/* --- CRONÓMETRO DIGITAL EN RELIEVE --- */
.game-timer-view {
  color: var(--vv-text) !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
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
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 10px var(--vv-danger);
}
@media (prefers-reduced-motion: reduce) {
  .game-timer-view.warning { animation: none; color: var(--vv-danger); }
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

${CHAT_OWN_COLOR ? `.vv-own-msg { color: ${CHAT_OWN_COLOR} !important; }` : ''}

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

/* Legibilidad de los mensajes sobre el campo (no cambia colores, solo contraste y aire) */
.chatbox-view-contents p {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  line-height: 1.35;
  padding-top: 1px;
  padding-bottom: 1px;
  overflow-wrap: anywhere;
}
/* Anuncios de la sala (si Haxball los marca con la clase "announcement") */
.chatbox-view-contents p.announcement {
  font-weight: 600;
  border-left: 2px solid var(--vv-accent-border);
  padding-left: 6px;
}

/* Chat expandido: solo se agranda el CUADRO (contenedor + su padre), no se
   toca ningún estilo de los mensajes ni del log. La clase vv-chat-open la
   pone/quita chatExpandInPage (app.js) mientras el input está enfocado. */
.vv-chat-open {
  min-height: min(30vh, 320px) !important;
  max-height: 45vh !important;
}

/* ---------------------------------------------------------------------
   ANIMACIÓN DE GOL: estrellas fugaces, rayos, ondas, confeti, letras que
   rebotan, viñeta y temblor. La crea goalAnimInPage (app.js) al subir el
   marcador. Solo usa transform/opacity. Se apaga con GOAL_ANIM_ENABLED=false.
   --------------------------------------------------------------------- */
.vv-goal {
  position: absolute; inset: 0; z-index: 3; pointer-events: none; overflow: hidden;
  contain: layout paint style; /* aísla la animación: no fuerza re-layout del resto de la página */
  --c: #e56e56; --c2: #ffd6cc;
}
.vv-gs, .vv-cf, .vv-gt, .vv-gl, .vv-rays, .vv-ring, .vv-sp { will-change: transform, opacity; }
/* Rendimiento en PCs flojas: descomentá para dejar solo ~28 de los 44 confetis */
/* .vv-cf:nth-child(n+52) { display: none; } */
.vv-goal-blue { --c: #5689e5; --c2: #d3e2ff; }
.vv-gflash {
  position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(circle at 50% 44%, var(--c) 0, transparent 55%);
  animation: vv-gflash .9s .6s ease-out forwards;
}
@keyframes vv-gflash { 0% { opacity: 0; } 25% { opacity: .4; } 100% { opacity: 0; } }
.vv-gvig {
  position: absolute; inset: 0; opacity: 0; box-shadow: inset 0 0 18vw 2vw var(--c);
  animation: vv-gvig 1.3s .55s ease-out forwards;
}
@keyframes vv-gvig { 0% { opacity: 0; } 20% { opacity: .85; } 100% { opacity: 0; } }
.vv-rays {
  position: absolute; left: 50%; top: 44%; width: 120vmax; height: 120vmax; opacity: 0;
  background: repeating-conic-gradient(from 0deg, var(--c) 0 5deg, transparent 5deg 15deg);
  -webkit-mask-image: radial-gradient(circle, #000 0, transparent 45%);
  mask-image: radial-gradient(circle, #000 0, transparent 45%);
  animation: vv-grays 2.3s .55s ease-out forwards;
}
@keyframes vv-grays {
  0%   { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(.4); }
  18%  { opacity: .32; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(55deg) scale(1.1); }
}
.vv-ring {
  position: absolute; left: 50%; top: 44%; width: 100px; height: 100px; margin: -50px 0 0 -50px;
  border-radius: 50%; border: 2px solid var(--c2); opacity: 0;
  box-shadow: 0 0 18px var(--c), inset 0 0 18px var(--c);
  animation: vv-gring 1s var(--dl, .6s) ease-out forwards;
}
@keyframes vv-gring { 0% { opacity: .95; transform: scale(.1); } 100% { opacity: 0; transform: scale(16); } }
.vv-gs {
  position: absolute; top: 0; left: 0; width: 170px; height: 3px; border-radius: 3px; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--c) 55%, #fff);
  filter: drop-shadow(0 0 6px var(--c2));
  animation: vv-gstar .75s cubic-bezier(.35,.1,.65,1) forwards;
}
.vv-gs::after {
  content: ""; position: absolute; right: -4px; top: -4px; width: 11px; height: 11px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 12px 4px var(--c2), 0 0 26px 8px var(--c);
}
.vv-gs2 { width: 110px; top: 5vw; animation-delay: .1s; animation-duration: .8s; }
.vv-gs3 { width: 80px; top: -3vw; left: 14vw; animation-delay: .2s; animation-duration: .85s; }
@keyframes vv-gstar {
  0%   { opacity: 0; transform: translate(-18vw, -9vw) rotate(28.6deg); }
  12%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { opacity: 0; transform: translate(46vw, 25vw) rotate(28.6deg); }
}
.vv-gt {
  position: absolute; left: 50%; top: 44%; white-space: nowrap; display: flex;
  font: 900 clamp(40px, 9vw, 120px) "Inter", "Arial Black", "Arial Bold", Gadget, sans-serif;
  letter-spacing: .04em; color: #fff;
  -webkit-text-stroke: 2px rgba(0, 0, 0, .28);
  paint-order: stroke fill;
  text-shadow: 0 0 14px var(--c), 0 0 42px var(--c), 0 4px 0 rgba(0,0,0,.35);
  animation: vv-gtout 1.8s .65s both;
}
@keyframes vv-gtout {
  0%, 78% { opacity: 1; transform: translate(-50%, -50%); }
  100%    { opacity: 0; transform: translate(-50%, -60%); }
}
.vv-gl { display: inline-block; animation: vv-gletter .6s calc(.65s + var(--i) * .07s) cubic-bezier(.2,1.5,.4,1) both; }
@keyframes vv-gletter {
  0%   { opacity: 0; transform: translateY(70px) scale(.3) rotate(-14deg); }
  60%  { opacity: 1; transform: translateY(-14px) scale(1.25) rotate(4deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}
.vv-gsub {
  position: absolute; left: 50%; top: calc(44% + clamp(30px, 6.5vw, 85px)); white-space: nowrap;
  font: 800 clamp(14px, 2vw, 26px) "Inter", "Open Sans", sans-serif; letter-spacing: .18em; color: var(--c2);
  text-shadow: 0 0 10px var(--c), 0 2px 0 rgba(0,0,0,.4);
  animation: vv-gsub 1.7s 1s both;
}
@keyframes vv-gsub {
  0%   { opacity: 0; transform: translate(-50%, 10px) scale(.8); }
  15%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
  80%  { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -8px); }
}
.vv-sp {
  position: absolute; left: 50%; top: 44%; width: 12px; height: 12px; opacity: 0; background: var(--c2);
  clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: vv-gsp .95s .65s ease-out forwards;
}
@keyframes vv-gsp {
  0%   { opacity: 1; transform: translate(-50%, -50%) rotate(var(--a)) translateX(0) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--a)) translateX(var(--d)) scale(.2); }
}
.vv-cf {
  position: absolute; top: 0; left: var(--x); width: 9px; height: 15px; opacity: 0; border-radius: 2px;
  animation: vv-gcf var(--du, 2s) var(--dl, .6s) cubic-bezier(.3,.2,.5,1) forwards;
}
.vv-cf0 { background: var(--c); }
.vv-cf1 { background: var(--c2); }
.vv-cf2 { background: #fff; }
.vv-cf3 { background: #ffd54a; }
@keyframes vv-gcf {
  0%   { opacity: 1; transform: translate(0, -8vh) rotate(0deg); }
  85%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--w), 108vh) rotate(var(--r)); }
}
.game-state-view.vv-shake { animation: vv-gshake .5s .6s linear; }
@keyframes vv-gshake {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-4px, 2px); } 30% { transform: translate(4px, -3px); }
  45% { transform: translate(-3px, -2px); } 60% { transform: translate(2px, 3px); }
  80% { transform: translate(-1px, 1px); }
}
@media (prefers-reduced-motion: reduce) {
  .vv-gs, .vv-sp, .vv-cf, .vv-rays, .vv-ring { display: none; }
  .game-state-view.vv-shake { animation: none; }
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
  font-variant-numeric: tabular-nums;   /* ping/FPS sin saltitos */
  opacity: .8;
  transition: opacity .15s ease;
}
.stats-view:hover { opacity: 1; }

/* Sin recuadro de foco sobre el campo de juego al hacer clic */
.game-view canvas, canvas { outline: none !important; }

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