// Vivet Client - renderer/chat.js
// Chats con amigos (mensajes directos). Corre en DOS lugares con el mismo código:
//  - Cliente principal: sección "Chats" del panel + botón "💬 Chats" sobre el juego.
//  - Ventana propia de chats (chat-window.html, siempre encima del juego): se abre con
//    ese botón, con "Abrir en ventana" o con el atajo CHAT_HOTKEY (F8). Ver main-process
//    en chat-window-main.js.
// Habla con /chat/* del servidor (server/chat.js) usando window.vivetApi.
// En el cliente principal se carga DESPUÉS de friends.js (ver index.html); en la
// ventana, chat-window.js arma el mismo window.vivetApi.

(() => {
  const WIN = !!window.vivetChat; // true = estamos dentro de la ventana de chats
  const $ = (s) => document.querySelector(s);
  const API = () => window.vivetApi;
  const tr = (x) => (typeof t === 'function' ? t(x) : x);
  const esc = (x) => escapeHtml(String(x ?? ''));

  const POLL_FAST = 3000;    // con el chat a la vista
  const POLL_SLOW = 8000;    // con el chat cerrado (para avisos y contador)
  const POLL_HIDDEN = 20000; // ventana minimizada / en segundo plano
  const PAGE = 50;
  const MAX_CACHE = 300;
  const ROOM_LINK = /https:\/\/www\.haxball\.com\/play\?c=([A-Za-z0-9_-]{6,64})/;
  const HOTKEY = (typeof CHAT_HOTKEY !== 'undefined' && CHAT_HOTKEY) ? String(CHAT_HOTKEY) : 'F8';

  const convos = new Map();  // id amigo -> { unread, last }
  const msgs = new Map();    // id amigo -> { list, more, loaded, loading }
  const views = [];
  const lastToast = new Map();
  const readTimers = {};
  let cursor = null, timer = null, polling = false, winOpen = false; // winOpen: (cliente principal) la ventana de chats está abierta

  // ------------------------------------------------------------ helpers
  const meId = () => { const m = API() && API().me(); return m ? m.id : null; };
  const loggedIn = () => !!(API() && API().loggedIn());
  const playing = () => !WIN && !!(appRoot && appRoot.classList.contains('playing'));
  const friends = () => { try { return (API().friends() || {}).friends || []; } catch (_) { return []; } };
  const friendById = (id) => friends().find((f) => f.id === id);
  const nameOf = (f) => (f.haxball_nick ? `${f.haxball_nick} (${f.username})` : f.username);
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dayLabel = (d) => {
    const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return tr('Hoy');
    if (d.toDateString() === y.toDateString()) return tr('Ayer');
    return d.toLocaleDateString();
  };
  const previewOf = (m) => (ROOM_LINK.test(m.body) ? tr('🎮 Invitación a una sala') : m.body);
  const statusOf = (f) => (f.room ? `${tr('Jugando en')} ${f.room.name || tr('una sala')}` : f.online ? tr('En línea') : tr('Desconectado'));

  function myRoomUrl() {
    try {
      if (WIN) return API().roomUrl();
      if (!playing() || typeof currentRoomUrl === 'undefined' || !currentRoomUrl) return null;
      const c = new URL(currentRoomUrl).searchParams.get('c');
      return c && /^[A-Za-z0-9_-]{6,64}$/.test(c) ? `https://www.haxball.com/play?c=${encodeURIComponent(c)}` : null;
    } catch (_) { return null; }
  }
  // Abre / alterna la ventana de chats (el proceso principal intercepta esta URL).
  const openChatWindow = (toggle) => { try { window.open(`vivet-chat://${toggle ? 'toggle' : 'open'}`); } catch (_) {} };

  const panelVisible = () => (WIN ? !document.hidden : !playing() && !!$('#panel-chats')?.classList.contains('active'));
  const isShowing = () => panelVisible();
  const visibleActive = (id) => views.some((v) => isShowing(v) && v.active === id);

  // ------------------------------------------------------------ estado
  function thread(id) {
    let s = msgs.get(id);
    if (!s) { s = { list: [], more: false, loaded: false, loading: false }; msgs.set(id, s); }
    return s;
  }
  function addMsg(id, m) {
    const s = thread(id);
    if (s.list.some((x) => x.id === m.id)) return false;
    s.list.push(m);
    s.list.sort((a, b) => a.id - b.id);
    if (s.list.length > MAX_CACHE) s.list.splice(0, s.list.length - MAX_CACHE);
    return true;
  }
  function totalUnread() {
    const ids = new Set(friends().map((f) => f.id));
    let n = 0;
    for (const [id, c] of convos) if (ids.has(id)) n += c.unread || 0;
    return n;
  }
  function updateBadges() {
    const n = totalUnread();
    document.querySelectorAll('.ch-badge').forEach((el) => { el.hidden = n === 0; el.textContent = n > 99 ? '99+' : String(n); });
  }
  function resetState() {
    convos.clear(); msgs.clear(); cursor = null;
    views.forEach((v) => { v.active = null; v.renderedFor = null; v.root.classList.remove('ch-open'); });
    updateBadges(); renderAll();
  }

  function markRead(id) {
    const c = convos.get(id);
    if (!c || !c.unread) return;
    c.unread = 0;
    updateBadges(); views.forEach(renderList);
    clearTimeout(readTimers[id]);
    readTimers[id] = setTimeout(() => API().request('POST', `/chat/${id}/read`).catch(() => {}), 400);
  }

  function ingest(m, live) {
    const me = meId();
    const other = m.from === me ? m.to : m.from;
    if (!addMsg(other, m)) return;
    const c = convos.get(other) || { unread: 0, last: null };
    convos.set(other, c);
    if (!c.last || m.id >= c.last.id) c.last = m;
    if (m.from === me || !live) return;
    if (winOpen && !WIN) return; // la ventana de chats lo muestra y lo marca como leído
    if (visibleActive(other)) { markRead(other); return; }
    c.unread = (c.unread || 0) + 1;
    notify(other, m);
  }

  function notify(id, m) {
    const f = friendById(id);
    if (!f) return;
    const now = Date.now();
    if (now - (lastToast.get(id) || 0) < 8000) return;
    lastToast.set(id, now);
    const p = previewOf(m);
    try { showToast(`💬 ${nameOf(f)}: ${p.length > 70 ? p.slice(0, 70) + '…' : p}`, 'ok'); } catch (_) {}
  }

  // ------------------------------------------------------------ red
  async function loadConvos() {
    const r = await API().request('GET', '/chat/conversations');
    convos.clear();
    for (const c of r.conversations || []) convos.set(c.id, { unread: c.unread || 0, last: c.last || null });
    cursor = Number(r.cursor) || 0;
    updateBadges(); renderAll();
  }

  async function pollOnce() {
    if (!loggedIn() || polling || (WIN && document.hidden)) return;
    polling = true;
    try {
      if (cursor == null) { await loadConvos(); return; }
      for (let i = 0, more = true; more && i < 5; i++) {
        const r = await API().request('GET', `/chat/poll?after=${cursor}`);
        const list = r.messages || [];
        more = list.length >= 100;
        list.forEach((m) => ingest(m, true));
        cursor = Math.max(cursor, Number(r.cursor) || cursor);
        if (list.length) { updateBadges(); renderAll(); }
      }
    } finally { polling = false; }
  }

  function schedule() {
    clearTimeout(timer);
    const ms = !loggedIn() ? 4000 : document.hidden ? (WIN ? 4000 : POLL_HIDDEN) : views.some(isShowing) ? POLL_FAST : POLL_SLOW;
    timer = setTimeout(async () => { try { await pollOnce(); } catch (_) {} schedule(); }, ms);
  }
  const pollNow = () => { pollOnce().catch(() => {}); schedule(); };

  async function loadHistory(id, before) {
    const s = thread(id);
    if (s.loading) return;
    s.loading = true;
    try {
      const r = await API().request('GET', `/chat/${id}/messages${before ? `?before=${before}` : ''}`);
      const list = r.messages || [];
      list.forEach((m) => addMsg(id, m));
      s.more = list.length >= PAGE;
      s.loaded = true;
    } catch (e) { showToast((e && e.message) || 'No se pudo cargar el chat'); }
    finally { s.loading = false; }
    views.forEach((v) => { if (v.active === id) renderThread(v, { older: !!before }); });
  }

  async function send(id, text) {
    const body = text.trim().slice(0, 500);
    if (!body) return false;
    try {
      const m = await API().request('POST', `/chat/${id}`, { body });
      ingest(m, false);
      views.forEach((v) => { renderList(v); if (v.active === id) renderThread(v, { bottom: true }); });
      return true;
    } catch (e) { showToast((e && e.message) || 'No se pudo enviar'); return false; }
  }

  // ------------------------------------------------------------ render
  function bodyHtml(body) {
    const m = ROOM_LINK.exec(body);
    if (!m) return esc(body);
    const rest = body.replace(m[0], '').trim();
    const url = `https://www.haxball.com/play?c=${m[1]}`;
    return (rest ? `${esc(rest)}<br>` : '') +
      `<span class="ch-invite">🎮 ${esc(tr('Invitación a una sala'))} <button class="primary-btn" type="button" data-act="join" data-url="${esc(url)}">${esc(tr('Unirme'))}</button></span>`;
  }

  function renderList(v) {
    const box = v.$('.ch-list');
    if (!box) return;
    const q = v.$('.ch-search input').value.trim().toLowerCase();
    const me = meId();
    const rank = (f) => (f.room ? 0 : f.online ? 1 : 2);
    const list = friends().filter((f) => !q || nameOf(f).toLowerCase().includes(q)).sort((a, b) => {
      const ta = (convos.get(a.id)?.last?.created_at) || 0, tb = (convos.get(b.id)?.last?.created_at) || 0;
      return tb - ta || rank(a) - rank(b) || a.username.localeCompare(b.username);
    });
    if (!list.length) {
      box.innerHTML = `<p class="hint ch-empty">${esc(tr(q ? 'Sin resultados.' : 'Todavía no tenés amigos. Agregalos en Social.'))}</p>`;
      return;
    }
    box.innerHTML = list.map((f) => {
      const c = convos.get(f.id);
      const sub = c && c.last ? `${c.last.from === me ? tr('Vos') + ': ' : ''}${previewOf(c.last)}` : statusOf(f);
      const dot = f.room ? 'in-room' : f.online ? 'online' : '';
      const un = c && c.unread ? `<span class="nav-badge">${c.unread > 99 ? '99+' : c.unread}</span>` : '';
      return `<button class="ch-item ${v.active === f.id ? 'active' : ''} ${c && c.unread ? 'unread' : ''}" type="button" data-id="${f.id}">
        <span class="ch-av"><img class="fr-avatar" alt="" src="${esc(f.avatar_url || '')}" onerror="this.removeAttribute('src')" /><i class="fr-dot ${dot}"></i></span>
        <span class="ch-item-info"><span class="ch-item-name">${esc(nameOf(f))}</span><span class="ch-item-sub">${esc(sub)}</span></span>${un}</button>`;
    }).join('');
  }

  function renderThread(v, o = {}) {
    const head = v.$('.ch-head'), box = v.$('.ch-msgs'), row = v.$('.ch-input');
    const id = v.active;
    const f = id != null ? friendById(id) : null;
    if (!f) {
      v.active = null; v.renderedFor = null; v.root.classList.remove('ch-open');
      head.innerHTML = ''; row.hidden = true;
      box.innerHTML = `<p class="hint ch-empty">${esc(tr('Elegí un chat para empezar.'))}</p>`;
      return;
    }
    row.hidden = false;
    const url = myRoomUrl();
    head.innerHTML = `<button class="ghost-btn secondary-action ch-back" type="button" data-act="back">←</button>
      <img class="fr-avatar" alt="" src="${esc(f.avatar_url || '')}" onerror="this.removeAttribute('src')" />
      <div class="ch-head-info"><div class="fr-row-name">${esc(nameOf(f))}</div><div class="fr-row-sub ${f.room ? 'in-room' : ''}">${esc(statusOf(f))}</div></div>
      ${url ? `<button class="ghost-btn secondary-action" type="button" data-act="invite">${esc(tr('Invitar a mi sala'))}</button>` : ''}`;

    const s = thread(id), me = meId();
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    const prevH = box.scrollHeight, prevTop = box.scrollTop;
    let html = s.more ? `<button class="ghost-btn secondary-action ch-more" type="button" data-act="older">${esc(tr('Cargar anteriores'))}</button>` : '';
    if (!s.list.length) html += `<p class="hint ch-empty">${esc(tr(s.loaded ? 'Todavía no hay mensajes. ¡Saludá!' : 'Cargando…'))}</p>`;
    let prev = '';
    for (const m of s.list) {
      const d = new Date(m.created_at), day = d.toDateString();
      if (day !== prev) { html += `<div class="ch-day">${esc(dayLabel(d))}</div>`; prev = day; }
      html += `<div class="ch-msg ${m.from === me ? 'mine' : 'theirs'}"><div class="ch-bubble">${bodyHtml(m.body)}</div><span class="ch-time">${hhmm(m.created_at)}</span></div>`;
    }
    box.innerHTML = html;
    if (o.older) box.scrollTop = box.scrollHeight - prevH + prevTop;
    else if (o.bottom || near || v.renderedFor !== id) box.scrollTop = box.scrollHeight;
    else box.scrollTop = prevTop;
    v.renderedFor = id;
  }

  function renderAll() {
    views.forEach((v) => {
      v.root.classList.toggle('ch-locked', !loggedIn());
      renderList(v);
      renderThread(v);
    });
  }

  async function openThread(v, id) {
    v.active = id; v.renderedFor = null;
    v.root.classList.add('ch-open');
    renderList(v); renderThread(v);
    if (!thread(id).loaded) await loadHistory(id);
    if (v.active === id) markRead(id);
    v.$('.ch-input input')?.focus();
  }

  // ------------------------------------------------------------ vistas
  function createView(root, kind) {
    root.classList.add('ch', kind === 'window' ? 'ch-wide' : 'ch-wide');
    root.innerHTML = `
      <div class="ch-locked-note hint">Conectá tu Discord en Social para chatear con tus amigos.</div>
      <div class="ch-side">
        <div class="ch-search"><input type="text" placeholder="Buscar amigo..." maxlength="40" autocomplete="off" /></div>
        <div class="ch-list"></div>
      </div>
      <div class="ch-main">
        <div class="ch-head"></div>
        <div class="ch-msgs"></div>
        <div class="ch-input"><input type="text" maxlength="500" placeholder="Escribí un mensaje..." autocomplete="off" /><button class="primary-btn" type="button">Enviar</button></div>
      </div>`;
    const v = { kind, root, active: null, renderedFor: null, $: (s) => root.querySelector(s) };
    views.push(v);
    if (kind === 'window') { // ventana angosta: lista O conversación, como un chat de celular
      const fit = () => { const n = root.clientWidth < 560; root.classList.toggle('ch-compact', n); root.classList.toggle('ch-wide', !n); };
      try { new ResizeObserver(fit).observe(root); } catch (_) { window.addEventListener('resize', fit); }
      fit();
    }

    v.$('.ch-search input').addEventListener('input', () => renderList(v));
    v.$('.ch-list').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-item');
      if (b) openThread(v, Number(b.dataset.id));
    });
    v.$('.ch-head').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'back') { v.active = null; v.renderedFor = null; root.classList.remove('ch-open'); renderList(v); renderThread(v); }
      else if (b.dataset.act === 'invite') {
        const url = myRoomUrl();
        if (url && v.active != null) send(v.active, url);
      }
    });
    v.$('.ch-msgs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'older') {
        const first = thread(v.active).list[0];
        if (first) loadHistory(v.active, first.id);
      } else if (b.dataset.act === 'join') {
        const url = b.dataset.url;
        if (!ROOM_LINK.test(url || '')) return;
        if (WIN) {
          window.vivetChat.join(url).then((r) => {
            if (r === 'playing') showToast('Salí de tu sala actual para unirte a esa sala');
            else if (r !== 'ok') showToast('No se pudo entrar a esa sala');
          });
          return;
        }
        if (playing()) { showToast('Salí de tu sala actual para unirte a esa sala'); return; }
        if (typeof joinByUrl === 'function') joinByUrl(url, null);
      }
    });
    const input = v.$('.ch-input input');
    const go = async () => {
      const text = input.value;
      if (!text.trim() || v.active == null) return;
      input.value = '';
      if (!(await send(v.active, text))) input.value = text;
      input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) go(); });
    v.$('.ch-input button').addEventListener('click', go);
    return v;
  }

  // Vista principal: panel (cliente) o ventana de chats
  const rootEl = WIN ? $('#chat-window-root') : $('#chat-panel-root');
  if (rootEl) createView(rootEl, WIN ? 'window' : 'panel');

  if (!WIN) {
    document.querySelector('.nav-btn[data-panel="panel-chats"]')?.addEventListener('click', () => {
      renderAll(); pollNow();
      const v = views[0];
      if (v && v.active != null) markRead(v.active);
    });
    $('#chat-popout-btn')?.addEventListener('click', () => openChatWindow(false));

    // Botón sobre el juego. Va en #app-root; el atajo lo maneja el proceso principal.
    const btn = document.createElement('button');
    btn.id = 'chat-sat-btn';
    btn.className = 'overlay-btn';
    btn.type = 'button';
    btn.title = `Chats (${HOTKEY})`;
    btn.innerHTML = '<span>💬 Chats</span><span class="nav-badge ch-badge" hidden></span>';
    btn.addEventListener('click', () => openChatWindow(true));
    appRoot.appendChild(btn);

    // El atajo vive en config.js; se lo pasamos al proceso principal.
    try {
      window.vivet.setConfig('chatHotkey', HOTKEY);
      window.vivet.setConfig('chatHotkeyGlobal', typeof CHAT_HOTKEY_GLOBAL !== 'undefined' && !!CHAT_HOTKEY_GLOBAL);
    } catch (_) {}

    window.addEventListener('vivet-chat-window', (e) => {
      winOpen = !!e.detail;
      if (!winOpen && loggedIn()) loadConvos().catch(() => {}); // la ventana pudo leer mensajes: se re-sincroniza
    });
    new MutationObserver(() => { views.forEach((v) => { if (v.active != null) renderThread(v); }); schedule(); })
      .observe(appRoot, { attributes: true, attributeFilter: ['class'] });
  }

  // ------------------------------------------------------------ eventos / arranque
  window.addEventListener('vivet-session-changed', () => { resetState(); if (loggedIn()) pollNow(); });
  window.addEventListener('vivet-friends-updated', () => { updateBadges(); renderAll(); });
  window.addEventListener('vivet-room-updated', () => views.forEach((v) => { if (v.active != null) renderThread(v); }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNow(); });

  renderAll();
  schedule();
  // friends.js carga la sesión de forma asíncrona: si ya está lista cuando llegue el evento, se arranca ahí.
  if (loggedIn()) pollNow();
})();