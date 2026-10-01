// Vivet Client - renderer/roommates.js
// Muestra quién más de la sala usa Vivet Client y deja mandarle solicitud de amistad sin salir
// del juego. Usa GET /presence/members (el servidor sabe quién está en tu sala) y
// POST /friends/respond | /friends/request. Se carga después de app.js y profile.js.
(() => {
  const $ = (s) => document.querySelector(s);
  const root = $('#app-root'), btn = $('#rm-btn'), panel = $('#rm-panel'), list = $('#rm-list'), count = $('#rm-count'), closeBtn = $('#rm-close');
  if (!root || !btn || !panel || !list) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
  const api = () => window.vivetApi;
  const loggedIn = () => !!(api() && api().loggedIn());
  const inGame = () => root.classList.contains('playing') && !root.classList.contains('replay-mode') && !root.classList.contains('creating');
  const nameOf = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);

  let members = [];
  let inRoom = false;
  let busy = false;
  let timer = null;

  function actionHtml(m) {
    switch (m.relation) {
      case 'friend': return '<span class="rm-tag">✓ Amigos</span>';
      case 'pending_out': return '<span class="rm-tag">Enviada</span>';
      case 'pending_in': return `<button class="rm-act" type="button" data-act="accept" data-id="${m.id}">Aceptar</button>`;
      default: return `<button class="rm-act" type="button" data-act="add" data-id="${m.id}">Agregar</button>`;
    }
  }

  function render() {
    // Cuenta = gente a la que todavía se le puede mandar o aceptar una solicitud.
    const pending = members.filter((m) => m.relation === 'none' || m.relation === 'pending_in').length;
    count.textContent = pending ? String(pending) : '';
    if (!loggedIn()) {
      list.innerHTML = '<p class="rm-empty">Conectá tu Discord en Social para ver a los demás jugadores con Vivet.</p>';
    } else if (!inRoom) {
      list.innerHTML = '<p class="rm-empty">Todavía no se detecta tu sala. Probá en unos segundos.</p>';
    } else if (!members.length) {
      list.innerHTML = '<p class="rm-empty">No hay más jugadores con Vivet Client en esta sala ahora mismo.</p>';
    } else {
      list.innerHTML = members.map((m) => `
        <div class="rm-row" data-id="${m.id}">
          <img class="rm-av" alt="" src="${esc(m.avatar_url || '')}" onerror="this.removeAttribute('src')" />
          <span class="rm-name" data-act="profile" data-id="${m.id}" title="Ver perfil">${esc(nameOf(m))}</span>
          ${actionHtml(m)}
        </div>`).join('');
    }
  }

  async function refresh() {
    if (busy || !loggedIn() || !inGame()) return;
    busy = true;
    try {
      const r = await api().request('GET', '/presence/members');
      inRoom = !!r.in_room;
      members = r.members || [];
    } catch (_) { /* el servidor viejo no tiene el endpoint: se queda la lista vacía */ }
    busy = false;
    render();
  }

  function startPolling() {
    stopPolling();
    refresh();
    // El latido de presencia sube la sala unos segundos después de entrar: se consulta seguido
    // al principio y más espaciado después. No consulta si no estás jugando o no hay sesión.
    let n = 0;
    timer = setInterval(() => { n++; if (inGame()) refresh(); }, 15000);
  }
  function stopPolling() { if (timer) clearInterval(timer); timer = null; }

  function setOpen(open) {
    panel.hidden = !open;
    if (open) { render(); refresh(); }
  }
  btn.addEventListener('click', () => setOpen(panel.hidden));
  closeBtn?.addEventListener('click', () => setOpen(false));

  list.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const id = Number(t.dataset.id);
    if (t.dataset.act === 'profile') { if (window.vivetProfile) window.vivetProfile.open(id); return; }
    t.disabled = true;
    try {
      if (t.dataset.act === 'add') {
        const r = await api().request('POST', '/friends/request', { id });
        toast(r && r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
      } else if (t.dataset.act === 'accept') {
        await api().request('POST', '/friends/respond', { id, accept: true });
        toast('Solicitud aceptada', 'ok');
      }
      await refresh();
    } catch (err) { toast(err.message || 'No se pudo completar la acción'); t.disabled = false; }
  });

  // Solo se consulta mientras estás dentro de una sala.
  let was = inGame();
  const sync = () => {
    const g = inGame();
    if (g === was) return;
    was = g;
    if (g) { members = []; inRoom = false; startPolling(); } else { stopPolling(); setOpen(false); members = []; count.textContent = ''; }
  };
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('vivet-session-changed', () => { if (inGame()) startPolling(); else render(); });
  if (was) startPolling();
  render();
})();