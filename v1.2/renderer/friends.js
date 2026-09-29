// Vivet Client - renderer/friends.js
// Perfil + amigos + presencia + bloqueos. Habla con el servidor propio
// (FRIENDS_API_URL, ver config.js y server/README.md); el cliente NUNCA
// tiene credenciales de la base de datos, solo un token de sesión.
// Se carga DESPUÉS de app.js: usa sus globales (appRoot, view, joinByUrl,
// currentRoomCode, currentRoomName, replayMode, escapeHtml, showToast...).

(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  const ROOM_CODE = /^[A-Za-z0-9_-]{6,64}$/;
  const HEARTBEAT_MS = 15000;
  const REFRESH_MS = 10000;

  let token = null;
  let me = null;
  let data = { friends: [], incoming: [], outgoing: [], blocked: [] };
  let loginTimer = null;

  const setStatus = (t) => { const el = $('#fr-status'); if (el) el.textContent = t || ''; };
  const panelActive = () => $('#panel-amigos')?.classList.contains('active');

  async function api(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.status === 401 && token) await clearSession();
    if (!res.ok) throw new Error((json && json.error) || `Error ${res.status}`);
    return json;
  }
  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) showToast(okMsg, 'ok'); await refresh(); }
    catch (e) { showToast(e.message || 'No se pudo completar la acción'); }
  };

  // ------------------------------------------------------------ sesión
  async function clearSession() {
    token = null; me = null;
    data = { friends: [], incoming: [], outgoing: [], blocked: [] };
    try { await window.vivet.setConfig('friendsToken', ''); } catch (_) {}
    render();
  }

  async function startLogin() {
    if (!API) return;
    const state = crypto.randomUUID();
    const btn = $('#fr-login-btn');
    btn.disabled = true;
    setStatus('Esperando confirmación en el navegador…');
    window.vivet.openExternal(`${API}/auth/start?state=${state}`);
    clearInterval(loginTimer);
    const until = Date.now() + 3 * 60 * 1000;
    loginTimer = setInterval(async () => {
      if (Date.now() > until) {
        clearInterval(loginTimer); btn.disabled = false;
        return setStatus('Se agotó el tiempo. Probá de nuevo.');
      }
      try {
        const r = await (await fetch(`${API}/auth/poll?state=${state}`)).json();
        if (!r.token) return;
        clearInterval(loginTimer);
        token = r.token;
        await window.vivet.setConfig('friendsToken', token);
        btn.disabled = false;
        setStatus('');
        await loadMe();
        showToast('Discord vinculado', 'ok');
      } catch (_) {}
    }, 2000);
  }

  async function loadMe() {
    me = await api('GET', '/me');
    // Un solo nick para todo. Si el local sigue siendo el "JugadorXXXX" por
    // defecto y el servidor ya tiene uno, se adopta el del servidor; si no,
    // el local manda y se sube al servidor.
    if (typeof currentNickname === 'string' && currentNickname) {
      if (me.haxball_nick && /^Jugador\d{4}$/.test(currentNickname) && typeof applyNickname === 'function') {
        await applyNickname(me.haxball_nick, { announce: false });
      } else if (me.haxball_nick !== currentNickname) {
        try { me = await api('PATCH', '/me', { haxball_nick: currentNickname }); } catch (_) {}
      }
    }
    render();
    await refresh();
    heartbeat();
  }

  // ------------------------------------------------------------ datos
  async function refresh() {
    if (!token) return;
    try { data = await api('GET', '/friends'); } catch (_) { return; }
    renderLists();
    const n = data.incoming.length;
    const badge = $('#fr-badge');
    if (badge) { badge.hidden = n === 0; badge.textContent = String(n); }
  }

  // Haxball es un SPA: al entrar a una sala desde la lista la URL NO cambia.
  // Por eso view.getURL() y la URL de los frames pueden quedarse con el código
  // de una sala ANTERIOR (p. ej. entraste por un link y después por la lista).
  // Mandar ese código hace que al amigo le salga "Room closed". Así que solo
  // se confía en el link con el que se entró (currentRoomUrl, guardado por
  // joinByUrl). Si no hay, no se manda código y el amigo ve "Buscar sala",
  // que entra por nombre.
  const codeFrom = (u) => { try { return new URL(u).searchParams.get('c'); } catch (_) { return null; } };
  let cachedCode = null, cachedFor = null;
  async function resolveRoomCode() {
    const key = `${joinedAt}|${currentRoomUrl || ''}`;
    if (cachedFor !== key) { cachedCode = null; cachedFor = key; }
    if (cachedCode) return cachedCode;
    const c = codeFrom(currentRoomUrl);
    if (c && ROOM_CODE.test(c)) cachedCode = c;
    return cachedCode;
  }

  async function heartbeat() {
    if (!token) return;
    const playing = appRoot.classList.contains('playing') && !replayMode && !creatingRoom;
    let code = null, name = null;
    if (playing) {
      code = await resolveRoomCode();
      name = currentRoomName || null;
    } else { cachedCode = null; cachedFor = null; }
    try { await api('POST', '/presence', { code, name }); } catch (_) {}
  }

  // ------------------------------------------------------------ UI
  const avatar = (u) => `<img class="fr-avatar" alt="" src="${escapeHtml(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;
  const display = (u) => escapeHtml(u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);

  function friendRow(f) {
    const inRoom = !!f.room;
    const canJoin = inRoom && (f.room.code || f.room.name);
    const sub = inRoom
      ? `<span class="fr-dot in-room"></span>Jugando en ${escapeHtml(f.room.name || 'una sala')}`
      : f.online ? '<span class="fr-dot online"></span>En línea' : '<span class="fr-dot"></span>Desconectado';
    const joinBtn = canJoin
      ? `<button class="primary-btn" data-act="join" data-code="${escapeHtml(f.room.code || '')}" data-name="${escapeHtml(f.room.name || '')}">${f.room.code ? 'Unirme' : 'Buscar sala'}</button>`
      : '';
    return `<div class="fr-row ${inRoom ? 'fr-row-live' : ''}">${avatar(f)}
      <div class="fr-row-info"><div class="fr-row-name">${display(f)}</div><div class="fr-row-sub ${inRoom ? 'in-room' : ''}">${sub}</div></div>
      <div class="fr-actions">
        ${joinBtn}
        <button class="ghost-btn secondary-action" data-act="remove" data-id="${f.id}">Quitar</button>
        <button class="ghost-btn secondary-action" data-act="block" data-id="${f.id}">Bloquear</button>
      </div></div>`;
  }
  function simpleRow(u, buttons) {
    return `<div class="fr-row">${avatar(u)}<div class="fr-row-info"><div class="fr-row-name">${display(u)}</div></div><div class="fr-actions">${buttons}</div></div>`;
  }

  function renderLists() {
    const box = $('#fr-lists');
    if (!box) return;
    const rank = (f) => (f.room ? 0 : f.online ? 1 : 2);
    const friends = data.friends.slice().sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username));
    const sect = (title, rows, empty) =>
      `<div class="fr-section-title">${title}</div>` + (rows.length ? rows.join('') : (empty ? `<p class="hint fr-empty">${empty}</p>` : ''));
    let html = sect(`Amigos (${friends.length})`, friends.map(friendRow), 'Todavía no tenés amigos agregados. Compartí tu código.');
    if (data.incoming.length) html += sect('Solicitudes recibidas', data.incoming.map((u) => simpleRow(u,
      `<button class="primary-btn" data-act="accept" data-id="${u.id}">Aceptar</button>
       <button class="ghost-btn secondary-action" data-act="decline" data-id="${u.id}">Rechazar</button>
       <button class="ghost-btn secondary-action" data-act="block" data-id="${u.id}">Bloquear</button>`)));
    if (data.outgoing.length) html += sect('Solicitudes enviadas', data.outgoing.map((u) => simpleRow(u,
      `<button class="ghost-btn secondary-action" data-act="remove" data-id="${u.id}">Cancelar</button>`)));
    if (data.blocked.length) html += sect('Bloqueados', data.blocked.map((u) => simpleRow(u,
      `<button class="ghost-btn secondary-action" data-act="unblock" data-id="${u.id}">Desbloquear</button>`)));
    box.innerHTML = html;
  }

  function render() {
    const login = $('#fr-login'), main = $('#fr-main');
    if (!API) {
      login.hidden = false; main.hidden = true;
      $('#fr-login-btn').hidden = true;
      $('#fr-login-text').textContent = 'La sección Amigos todavía no está configurada: falta FRIENDS_API_URL en config.js (ver server/README.md).';
      return;
    }
    $('#fr-login-btn').hidden = false;
    login.hidden = !!me; main.hidden = !me;
    if (!me) return;
    $('#fr-avatar').src = me.avatar_url || '';
    $('#fr-name').textContent = me.username;
    $('#fr-code').textContent = me.friend_code;
    $('#fr-invisible').checked = !!me.invisible;
    renderLists();
  }

  // ------------------------------------------------------------ eventos
  $('#fr-login-btn')?.addEventListener('click', startLogin);
  $('#fr-logout-btn')?.addEventListener('click', () => act(async () => { await api('POST', '/logout').catch(() => {}); await clearSession(); }));
  $('#fr-copy-code')?.addEventListener('click', () => me && copyToClipboard(me.friend_code, 'Código copiado'));
  // Cuando se guarda el nick en Social, se sube al servidor si hay sesión.
  window.addEventListener('vivet-nick-changed', async (e) => {
    if (!token || !me) return;
    try { me = await api('PATCH', '/me', { haxball_nick: e.detail }); await refresh(); }
    catch (err) { showToast('El nick se guardó local, pero no se pudo subir: ' + (err.message || 'error')); }
  });
  $('#fr-invisible')?.addEventListener('change', (e) =>
    act(async () => { me = await api('PATCH', '/me', { invisible: e.target.checked }); }));
  const addFriend = () => {
    const input = $('#fr-add-input');
    const query = input.value.trim();
    if (!query) return;
    act(async () => {
      const r = await api('POST', '/friends/request', { query });
      input.value = '';
      showToast(r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
    });
  };
  $('#fr-add-btn')?.addEventListener('click', addFriend);
  $('#fr-add-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFriend(); });

  $('#fr-lists')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    switch (b.dataset.act) {
      case 'join': {
        const { code, name } = b.dataset;
        if (appRoot.classList.contains('playing')) { showToast('Salí de tu sala actual para unirte a la de tu amigo'); break; }
        if (code && ROOM_CODE.test(code)) joinByUrl(`https://www.haxball.com/play?c=${encodeURIComponent(code)}`, name || null);
        else if (name) { showToast('Buscando la sala de tu amigo…', 'ok'); joinByName(name, null); }
        break;
      }
      case 'accept': act(() => api('POST', '/friends/respond', { id, accept: true }), 'Solicitud aceptada'); break;
      case 'decline': act(() => api('POST', '/friends/respond', { id, accept: false })); break;
      case 'remove': act(() => api('DELETE', `/friends/${id}`)); break;
      case 'block':
        if (window.confirm('¿Bloquear a este usuario? Se elimina la amistad y no podrá volver a enviarte solicitudes ni ver dónde jugás.'))
          act(() => api('POST', '/block', { id }), 'Usuario bloqueado');
        break;
      case 'unblock': act(() => api('DELETE', `/block/${id}`), 'Usuario desbloqueado'); break;
    }
  });

  document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.addEventListener('click', refresh);
  setInterval(() => { if (token) heartbeat(); }, HEARTBEAT_MS);
  setInterval(() => { if (token && panelActive()) refresh(); }, REFRESH_MS);
  // Al entrar/salir de una sala se avisa enseguida (con un respiro para que
  // el nombre y el link de la sala ya estén disponibles).
  let hbTimer = null;
  new MutationObserver(() => {
    clearTimeout(hbTimer);
    hbTimer = setTimeout(heartbeat, 2500);
  }).observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  // ------------------------------------------------------------ arranque
  render();
  (async () => {
    if (!API) return;
    try { token = (await window.vivet.getConfig('friendsToken', '')) || null; } catch (_) {}
    if (token) { try { await loadMe(); } catch (_) {} }
  })();
})();