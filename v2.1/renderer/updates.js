// Vivet Client - renderer/updates.js
// =======================================================================
//  EDITÁ SOLO ESTA LISTA  (la más nueva va ARRIBA)
// =======================================================================
// Cada novedad:
//   version : '2.1.0'
//   date    : 'AAAA-MM-DD'
//   title   : título corto
//   changes : lista de textos. Podés empezar con una etiqueta:
//             [nuevo]  [mejora]  [fix]   (si no ponés ninguna, sale sin etiqueta)
const VIVET_UPDATES = [
  {
    version: '2.1.0',
    date: '2026-10-01',
    title: 'Rendimiento, Interfaz y Novedades',
    changes: [
      '[nuevo] Novedades: en este apartado vas a ver los cambios de cada versión. Un puntito te avisa cuando hay algo nuevo.',
      '[nuevo] Grupos en Chats: armá un grupo con tus amigos para coordinar partidos y equipos, e invitalos a todos a tu sala con un click.',
      '[nuevo] Perfiles completos: biografía, banner, color, estadísticas y publicaciones. Tocá el nombre de cualquier jugador en el foro, en tus amigos o en la sala para verlo.',
      '[nuevo] Foro: compartí mensajes, fotos y tus mejores clips, y comentá lo que suben los demás.',
      '[nuevo] Música en el lobby: cargá hasta 4 canciones tuyas y escuchalas mientras elegís sala. Se pausan solas cuando entrás a jugar.',
      '[nuevo] Amigos desde la sala: mirá quién más usa Vivet Client en tu sala y mandale una solicitud de amistad sin salir de la partida.',
      '[nuevo] Modo streamer: imagen más limpia y con mejor calidad para transmitir por TikTok, OBS y otras plataformas.',
      '[nuevo] Nicks más largos.',
      '[mejora] Modo claro rediseñado, con más contraste y colores más cómodos para leer.',
      '[mejora] Rangos renovados, ahora actualizados en todo el sistema.',
      '[mejora] Nueva animación de inicio, con letras más nítidas.',
      '[mejora] Interfaz más limpia: se quitaron los emojis y los controles tienen íconos propios.',
      '[mejora] Se quitó el sonido al patear.',
      '[fix] Ahora podés unirte sin problemas a la sala de un amigo.',
      '[fix] Arranque más estable: se acabaron los casos en que el cliente se quedaba cargando, se reiniciaba solo o no abría, incluso al cambiar entre CPU y GPU.',
      '[fix] Tus colores personalizados se ven desde el primer instante al abrir el cliente.',
    ],
  },
];

// =======================================================================
//  NO TOCAR DESDE ACÁ (dibuja el panel y el puntito de "hay novedades")
// =======================================================================
(() => {
  const list = document.getElementById('updates-list');
  const dot = document.getElementById('updates-badge');
  if (!list || typeof VIVET_UPDATES === 'undefined') return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TAGS = { nuevo: 'Nuevo', mejora: 'Mejora', fix: 'Arreglo' };
  const stamp = () => {
    const u = VIVET_UPDATES[0];
    return u ? `${u.version}|${u.date}` : '';
  };

  function fmtDate(d) {
    const t = new Date(`${d}T00:00:00`);
    return isNaN(t) ? esc(d) : t.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function render() {
    let current = '';
    try { current = await window.vivet.getAppVersion(); } catch (_) {}
    if (!VIVET_UPDATES.length) {
      list.innerHTML = '<p class="hint" style="margin:0 32px;">Todavía no hay novedades.</p>';
      return;
    }
    list.innerHTML = VIVET_UPDATES.map((u) => {
      const items = (u.changes || []).map((c) => {
        const m = /^\[(nuevo|mejora|fix)\]\s*/i.exec(c);
        const tag = m ? m[1].toLowerCase() : '';
        const text = m ? c.slice(m[0].length) : c;
        return `<li>${tag ? `<span class="upd-tag upd-${tag}">${TAGS[tag]}</span>` : ''}<span>${esc(text)}</span></li>`;
      }).join('');
      const mine = current && u.version === current ? '<span class="upd-current">Tu versión</span>' : '';
      return `<article class="card upd-card">
        <div class="upd-head"><h3>v${esc(String(u.version).replace(/\.0$/, ''))} · ${esc(u.title)}</h3>${mine}</div>
        <div class="hint upd-date">${fmtDate(u.date)}</div>
        <ul class="upd-list">${items}</ul>
      </article>`;
    }).join('');
  }

  async function refreshDot() {
    if (!dot) return;
    let seen = '';
    try { seen = await window.vivet.getConfig('lastSeenUpdate', ''); } catch (_) {}
    dot.hidden = !stamp() || seen === stamp();
    dot.textContent = '•';
  }

  document.querySelector('.nav-btn[data-panel="panel-novedades"]')?.addEventListener('click', async () => {
    render();
    try { await window.vivet.setConfig('lastSeenUpdate', stamp()); } catch (_) {}
    if (dot) dot.hidden = true;
  });

  render();
  refreshDot();
})();