// Vivet Client - renderer/streamer.js
// Modo streamer: oculta datos personales para transmitir sin filtrar nada.
//  - Difumina: código de amigo, usuario de Discord, avatar, lista de amigos,
//    nickname, campo de agregar amigo y el Auth.
//  - Oculta el nombre de la sala y el botón "Copiar link de la sala".
//  - Discord Rich Presence genérico (sin nombre/código de sala).
// Atajo: Ctrl+Shift+S. Se guarda en la config ('streamerMode').
// Se carga DESPUÉS de app.js (envuelve updateDiscordPresence).

(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const toggle = $('#streamer-toggle');
  let on = false;

  // Presence genérico: nunca sale el nombre ni el código de la sala.
  const tr = (x) => (typeof t === 'function' ? t(x) : x);
  const original = (typeof updateDiscordPresence === 'function') ? updateDiscordPresence : null;
  if (original) {
    updateDiscordPresence = function (code, roomName) {
      if (!on) return original.apply(this, arguments);
      try {
        const playing = $('#app-root')?.classList.contains('playing');
        window.vivet.discordSetActivity({
          details: playing ? tr('Jugando a Haxball') : tr('En el menú principal'),
          state: 'Vivet Client',
          startTimestamp: (typeof joinedAt !== 'undefined' && joinedAt && playing) ? joinedAt : Date.now(),
          largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
        });
      } catch (_) {}
    };
  }

  function refreshPresence() {
    try {
      if (typeof updateDiscordPresence === 'function') {
        updateDiscordPresence(typeof currentRoomCode === 'function' ? currentRoomCode() : null,
          typeof currentRoomName !== 'undefined' ? currentRoomName : null);
      }
    } catch (_) {}
  }

  function set(v, announce) {
    on = !!v;
    root.classList.toggle('streamer', on);
    if (toggle) toggle.checked = on;
    window.vivet.setConfig('streamerMode', on).catch(() => {});
    refreshPresence();
    if (announce) { try { showToast(on ? 'Modo streamer activado' : 'Modo streamer desactivado', 'ok'); } catch (_) {} }
  }

  toggle?.addEventListener('change', () => set(toggle.checked, true));
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); set(!on, true); }
  });

  (async () => {
    try { on = !!(await window.vivet.getConfig('streamerMode', false)); } catch (_) {}
    root.classList.toggle('streamer', on);
    if (toggle) toggle.checked = on;
    if (on) refreshPresence();
  })();
})();