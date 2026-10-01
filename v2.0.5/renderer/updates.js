// Vivet Client - renderer/updates.js
// =======================================================================
//  ✏️  EDITÁ SOLO ESTA LISTA  (la más nueva va ARRIBA)
// =======================================================================
// Cada novedad:
//   version : '0.2.0'
//   date    : 'AAAA-MM-DD'
//   title   : título corto
//   changes : lista de textos. Podés empezar con una etiqueta:
//             [nuevo]  [mejora]  [fix]   (si no ponés ninguna, sale sin etiqueta)
const VIVET_UPDATES = [
  {
    version: '0.2.0',
    date: '2026-10-01',
    title: 'Novedades y grupos de chat',
    changes: [
      '[nuevo] Apartado de Novedades: acá se ven los cambios de cada versión.',
      '[nuevo] Grupos en Chats: creá un grupo con tus amigos para coordinar partidos y equipos.',
      '[nuevo] Podés invitar a todo el grupo a tu sala con un click.',
    ],
  },
];

// =======================================================================
//  ⛔ NO TOCAR DESDE ACÁ (dibuja el panel y el puntito de "hay novedades")
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
        <div class="upd-head"><h3>v${esc(u.version)} · ${esc(u.title)}</h3>${mine}</div>
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