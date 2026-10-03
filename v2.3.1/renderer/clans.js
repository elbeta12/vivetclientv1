// Vivet Client - renderer/clans.js
// Apartado "Clanes": Mi clan (miembros, chat, solicitudes, ajustes) y Top clanes.
// Se carga DESPUÉS de app.js, chat.js y app2.js (usa window.vivetApi, escapeHtml, showToast,
// joinByUrl, appRoot y window.vivetLang). Habla con server/clans.js.
// Idiomas: ES (el código) y EN. Igual que la Tienda, el panel se traduce acá adentro con T()
// (el panel tiene data-i18n-skip para que el traductor global no lo toque).
(() => {
  const $ = (s) => document.querySelector(s);
  const panel = $('#panel-clanes');
  const root = $('#clan-root');
  if (!panel || !root) return;

  // ------------------------------------------------------------ traducciones (ES -> EN)
  const en = () => !!(window.vivetLang && window.vivetLang() === 'en');
  const EN = {
    // cabecera / menú
    'Clanes': 'Clans',
    'Armá tu clan, sumá XP en equipo, chateá con tus compañeros y escalá en el top de clanes.':
      'Build your clan, earn XP as a team, chat with your teammates and climb the clan leaderboard.',
    'Clanes no disponible': 'Clans unavailable',
    'Falta configurar FRIENDS_API_URL en config.js.': 'FRIENDS_API_URL is not set in config.js.',
    'Conectá tu Discord para usar los clanes': 'Connect your Discord to use clans',
    'Andá a Social y tocá "Conectar con Discord". Después podés crear o unirte a un clan.':
      'Go to Social and tap "Connect with Discord". Then you can create or join a clan.',
    'Mi clan': 'My clan', 'Top clanes': 'Top clans',
    'Cargando…': 'Loading…',
    // clan
    'Anuncio:': 'Announcement:',
    'Nv {n}': 'Lv {n}', '{a}/{b} miembros': '{a}/{b} members', '{n} XP': '{n} XP',
    '{n} XP para el nivel {l}': '{n} XP to level {l}',
    'Abierto': 'Open', 'Con solicitud': 'By request', 'Cerrado': 'Closed',
    'Líder': 'Leader', 'Oficial': 'Officer', 'Miembro': 'Member',
    // miembros
    'Jugando en {s}': 'Playing in {s}', 'una sala': 'a room', 'En línea': 'Online', 'Desconectado': 'Offline',
    'Unirme': 'Join', 'Quitar oficial': 'Remove officer', 'Hacer oficial': 'Make officer',
    'Dar liderazgo': 'Give leadership', 'Expulsar': 'Kick',
    'Invitar jugador': 'Invite player', 'Invitar': 'Invite',
    'Código de amigo (VV-XXXXXX) o usuario de Discord': 'Friend code (VV-XXXXXX) or Discord username',
    'Miembros ({a}/{b})': 'Members ({a}/{b})', ' · {n} jugando ahora': ' · {n} playing now',
    'Miembros': 'Members', 'Chat': 'Chat', 'Solicitudes': 'Requests', 'Solicitudes ({n})': 'Requests ({n})', 'Ajustes': 'Settings',
    'Salir del clan': 'Leave clan',
    // chat
    'Escribí al clan...': 'Write to the clan...', 'Enviar': 'Send', 'Vos': 'You',
    'Todavía no hay mensajes. ¡Saludá al clan!': 'No messages yet. Say hi to the clan!',
    // solicitudes
    'No hay solicitudes pendientes.': 'There are no pending requests.', 'Aceptar': 'Accept', 'Rechazar': 'Decline',
    // ajustes
    'Ajustes del clan': 'Clan settings', 'Descripción (máx. 200)': 'Description (max. 200)',
    'Anuncio para los miembros (máx. 300)': 'Announcement for members (max. 300)',
    'Ingreso': 'Joining', 'Color': 'Color', 'Guardar cambios': 'Save changes', 'Zona peligrosa': 'Danger zone',
    'Disolver el clan expulsa a todos y borra su chat. No se puede deshacer.':
      'Disbanding the clan removes everyone and deletes its chat. This cannot be undone.',
    'Disolver clan': 'Disband clan',
    // sin clan
    'Invitaciones': 'Invitations', 'Te invitó {by} · {a}/{b} miembros': 'Invited by {by} · {a}/{b} members',
    'Crear un clan': 'Create a clan',
    'Sumá XP con tu clan jugando en Vivet y escalá en el top. Podés estar en un solo clan a la vez.':
      'Earn XP with your clan by playing in Vivet and climb the leaderboard. You can only be in one clan at a time.',
    'Nombre (3-24)': 'Name (3-24)', 'Etiqueta (2-5)': 'Tag (2-5)', 'Descripción (opcional)': 'Description (optional)',
    'Cerrado (solo invitación)': 'Closed (invite only)', 'Crear clan': 'Create clan', 'Buscar un clan': 'Find a clan',
    // top
    'Tu clan': 'Your clan', 'Cancelar solicitud': 'Cancel request', 'Aceptar invitación': 'Accept invitation',
    'Lleno': 'Full', 'Solicitar': 'Request', 'Solicitar unirme': 'Request to join',
    'Nv {n} · {a}/{b} miembros · {m}': 'Lv {n} · {a}/{b} members · {m}',
    'No se pudo cargar el top ({e}).': 'Could not load the leaderboard ({e}).',
    'Sin resultados.': 'No results.', 'Todavía no hay clanes. ¡Creá el primero!': 'There are no clans yet. Create the first one!',
    'Buscar clan por nombre o etiqueta...': 'Search clan by name or tag...', 'Actualizar': 'Refresh',
    'Más XP': 'Most XP', 'Más miembros': 'Most members', 'Nuevos': 'Newest', '← Volver al top': '← Back to leaderboard',
    // avisos y confirmaciones
    'No se pudo completar la acción': 'Could not complete the action',
    '¡Te uniste al clan!': 'You joined the clan!',
    'Solicitud enviada. Un oficial tiene que aprobarla.': 'Request sent. An officer has to approve it.',
    'Salí de tu sala actual para unirte a esa sala': 'Leave your current room to join that room',
    '¡Clan creado!': 'Clan created!', 'Invitación enviada': 'Invitation sent',
    '¿Seguro que querés salir del clan?': 'Are you sure you want to leave the clan?', 'Saliste del clan': 'You left the clan',
    '¿Disolver el clan? Se expulsa a todos y se borra el chat. No se puede deshacer.':
      'Disband the clan? Everyone is removed and the chat is deleted. This cannot be undone.',
    'Clan disuelto': 'Clan disbanded', '¿Expulsar a este miembro?': 'Kick this member?',
    '¿Transferir el liderazgo? Vas a quedar como oficial.': 'Transfer leadership? You will become an officer.',
    'Liderazgo transferido': 'Leadership transferred', 'Cambios guardados': 'Changes saved',
    // errores del servidor (server/clans.js y server.js)
    'Ese clan no existe.': 'That clan does not exist.', 'Ese clan ya no existe.': 'That clan no longer exists.',
    'No sos parte de ese clan.': 'You are not part of that clan.', 'No tenés permisos para eso.': 'You do not have permission for that.',
    'Probaste muchas veces. Esperá un rato.': 'You tried too many times. Wait a bit.',
    'Ya estás en un clan. Salí primero para crear otro.': 'You are already in a clan. Leave it first to create another.',
    'El nombre debe tener entre 3 y 24 caracteres (letras, números, espacios, _ . -).':
      'The name must be 3 to 24 characters (letters, numbers, spaces, _ . -).',
    'La etiqueta debe tener entre 2 y 5 letras o números.': 'The tag must be 2 to 5 letters or numbers.',
    'Ya existe un clan con ese nombre.': 'A clan with that name already exists.',
    'Esa etiqueta ya está en uso.': 'That tag is already in use.',
    'Ese nombre o etiqueta ya está en uso.': 'That name or tag is already in use.',
    'Ya estás en un clan.': 'You are already in a clan.',
    'Para cambiar al líder usá "Transferir liderazgo".': 'To change the leader use "Transfer leadership".',
    'Rol inválido.': 'Invalid role.', 'No estás en ningún clan.': 'You are not in any clan.',
    'Sos el líder: transferí el liderazgo antes de salir (o disolvé el clan).':
      'You are the leader: transfer leadership before leaving (or disband the clan).',
    'Ya estás en un clan. Salí primero para unirte a otro.': 'You are already in a clan. Leave it first to join another.',
    'Este clan no acepta miembros nuevos.': 'This clan is not accepting new members.',
    'El clan está lleno.': 'The clan is full.', 'Solicitud no encontrada.': 'Request not found.',
    'Esa persona ya entró a otro clan.': 'That person already joined another clan.',
    'Escribí un código de amigo o usuario de Discord.': 'Enter a friend code or Discord username.',
    'No se encontró a ese usuario.': 'That user was not found.', 'Esa persona ya está en un clan.': 'That person is already in a clan.',
    'Hay demasiadas invitaciones pendientes.': 'There are too many pending invitations.',
    'Invitación no encontrada.': 'Invitation not found.', 'Esa persona no está en el clan.': 'That person is not in the clan.',
    'No podés expulsar a alguien de tu mismo rango o superior.': 'You cannot kick someone of your rank or higher.',
    'Elegí a otro miembro del clan.': 'Pick another clan member.', 'Escribí un mensaje.': 'Write a message.',
    'Más despacio.': 'Slow down.', 'Error del servidor': 'Server error',
    'Demasiadas solicitudes, esperá un momento.': 'Too many requests, wait a moment.',
    'No autenticado': 'Not signed in', 'Sesión vencida': 'Session expired',
  };
  const PAT = [[/^Error (\d+)$/, 'Error $1']];
  const fmtV = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '')) : s);
  function T(s, v) {
    s = String(s);
    if (!en()) return fmtV(s, v);
    let o = EN[s];
    if (o === undefined) for (const [re, rep] of PAT) if (re.test(s)) { o = s.replace(re, rep); break; }
    return fmtV(o === undefined ? s : o, v);
  }

  // ------------------------------------------------------------ utilidades
  const esc = (s) => escapeHtml(String(s ?? ''));
  const toast = (m, k) => { try { showToast(T(m), k); } catch (_) {} };
  const api = () => window.vivetApi;
  const req = (m, p, b) => api().request(m, p, b);
  const loggedIn = () => !!(api() && api().loggedIn());
  const myId = () => (api() && api().me() ? api().me().id : null);
  const panelActive = () => panel.classList.contains('active');

  const ROLE_ES = { leader: 'Líder', officer: 'Oficial', member: 'Miembro' };
  const MODE_ES = { open: 'Abierto', request: 'Con solicitud', closed: 'Cerrado' };
  const roleName = (k) => T(ROLE_ES[k] || '');
  const modeName = (k) => T(MODE_ES[k] || '');
  const col = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#17e0e8');
  const fmt = (n) => Number(n || 0).toLocaleString(en() ? 'en-US' : 'es');
  const who = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);
  const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const avatar = (u) => `<img class="fr-avatar" alt="" src="${esc(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;

  // Nivel del clan según su XP total: Nv 2 = 100 XP, Nv 3 = 400, Nv 4 = 900 ... (cuadrático)
  function level(xp) {
    const l = 1 + Math.floor(Math.sqrt(xp / 100));
    const a = (l - 1) ** 2 * 100, b = l ** 2 * 100;
    return { l, pct: Math.max(0, Math.min(100, Math.round(((xp - a) / (b - a)) * 100))), next: b };
  }

  // ------------------------------------------------------------ estado
  const S = {
    tab: 'mine',        // mine | top | view
    sub: 'members',     // members | chat | requests | settings
    mine: null,         // { clan, invites } | null
    top: null,          // null = sin cargar | [] | 'error'
    topErr: '',
    sort: 'xp',
    q: '',
    view: null,         // detalle de un clan ajeno
    reqs: null,
    msgs: [],
    busy: false,
  };

  async function run(fn) {
    if (S.busy) return;
    S.busy = true;
    try { await fn(); } catch (e) { toast((e && e.message) || 'No se pudo completar la acción'); } finally { S.busy = false; }
  }

  // ------------------------------------------------------------ vistas
  const notReady = () => {
    if (!api() || !api().configured) return `<div class="card"><h3>${esc(T('Clanes no disponible'))}</h3><p>${esc(T('Falta configurar FRIENDS_API_URL en config.js.'))}</p></div>`;
    if (!loggedIn()) return `<div class="card"><h3>${esc(T('Conectá tu Discord para usar los clanes'))}</h3><p>${esc(T('Andá a Social y tocá "Conectar con Discord". Después podés crear o unirte a un clan.'))}</p></div>`;
    return '';
  };

  function headCard(c) {
    const lv = level(c.xp);
    const ann = c.announcement ? `<div class="cl-ann"><b>${esc(T('Anuncio:'))}</b> ${esc(c.announcement)}</div>` : '';
    return `<div class="card cl-head" style="--c:${col(c.color)}">
      <div class="cl-emblem">${esc(c.tag)}</div>
      <div class="cl-head-info">
        <h3>${esc(c.name)}</h3>
        ${c.description ? `<div class="hint">${esc(c.description)}</div>` : ''}
        <div class="cl-chips">
          <span class="cl-chip">${esc(T('Nv {n}', { n: lv.l }))}</span>
          <span class="cl-chip">${esc(T('{a}/{b} miembros', { a: c.members, b: c.max }))}</span>
          <span class="cl-chip">${esc(T('{n} XP', { n: fmt(c.xp) }))}</span>
          <span class="cl-chip">${esc(modeName(c.join_mode))}</span>
        </div>
        <div class="comp-bar-bg"><div class="comp-bar" style="width:${lv.pct}%"></div></div>
        <div class="hint">${esc(T('{n} XP para el nivel {l}', { n: fmt(Math.max(0, lv.next - c.xp)), l: lv.l + 1 }))}</div>
        ${ann}
      </div>
    </div>`;
  }

  function memberRow(m, c, mine) {
    const myRole = c.my_role;
    const rank = { member: 1, officer: 2, leader: 3 };
    const isMe = m.id === myId();
    const inRoom = m.room && (m.room.code || m.room.name);
    const sub = inRoom ? T('Jugando en {s}', { s: m.room.name || T('una sala') }) : m.online ? T('En línea') : (mine ? T('Desconectado') : '');
    const acts = [];
    if (mine && m.room && m.room.code && !isMe) acts.push(`<button class="ghost-btn secondary-action" data-act="joinroom" data-code="${esc(m.room.code)}">${esc(T('Unirme'))}</button>`);
    if (mine && !isMe && myRole === 'leader' && m.role !== 'leader') {
      acts.push(`<button class="ghost-btn secondary-action" data-act="role" data-id="${m.id}" data-role="${m.role === 'officer' ? 'member' : 'officer'}">${esc(T(m.role === 'officer' ? 'Quitar oficial' : 'Hacer oficial'))}</button>`);
      acts.push(`<button class="ghost-btn secondary-action" data-act="transfer" data-id="${m.id}">${esc(T('Dar liderazgo'))}</button>`);
    }
    if (mine && !isMe && rank[myRole] > rank[m.role] && rank[myRole] >= 2) acts.push(`<button class="ghost-btn secondary-action cl-danger" data-act="kick" data-id="${m.id}">${esc(T('Expulsar'))}</button>`);
    return `<div class="fr-row ${inRoom ? 'fr-row-live' : ''}">
      ${avatar(m)}
      <div class="fr-row-info"><div class="fr-row-name">${esc(who(m))} <span class="cl-role cl-role-${m.role}">${esc(roleName(m.role))}</span></div>
        <div class="fr-row-sub ${inRoom ? 'in-room' : ''}">${sub ? esc(sub) + ' · ' : ''}${esc(T('{n} XP', { n: fmt(m.xp) }))}</div></div>
      <div class="cl-row-acts">${acts.join('')}</div>
    </div>`;
  }

  function membersTab(c, mine) {
    const canInvite = mine && (c.my_role === 'leader' || c.my_role === 'officer');
    const live = mine ? c.members_list.filter((m) => m.room).length : 0;
    return `${canInvite ? `<div class="card cl-invite">
        <h3>${esc(T('Invitar jugador'))}</h3>
        <div class="cl-inline"><input id="cl-invite-q" type="text" maxlength="40" placeholder="${esc(T('Código de amigo (VV-XXXXXX) o usuario de Discord'))}" autocomplete="off" />
        <button class="primary-btn" data-act="invite" type="button">${esc(T('Invitar'))}</button></div>
      </div>` : ''}
      <div class="fr-section-title">${esc(T('Miembros ({a}/{b})', { a: c.members, b: c.max }))}${mine ? esc(T(' · {n} jugando ahora', { n: live })) : ''}</div>
      ${c.members_list.map((m) => memberRow(m, c, mine)).join('')}`;
  }

  function chatTab() {
    return `<div class="card cl-chat">
      <div id="cl-msgs" class="cl-msgs"></div>
      <div class="cl-inline"><input id="cl-msg-in" type="text" maxlength="300" placeholder="${esc(T('Escribí al clan...'))}" autocomplete="off" />
      <button class="primary-btn" data-act="send" type="button">${esc(T('Enviar'))}</button></div>
    </div>`;
  }

  function requestsTab() {
    if (S.reqs === null) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
    if (!S.reqs.length) return `<p class="hint fr-empty">${esc(T('No hay solicitudes pendientes.'))}</p>`;
    return S.reqs.map((r) => `<div class="fr-row">
      ${avatar(r)}
      <div class="fr-row-info"><div class="fr-row-name">${esc(who(r))}</div><div class="fr-row-sub">${esc(T('{n} XP', { n: fmt(r.xp) }))}</div></div>
      <div class="cl-row-acts">
        <button class="primary-btn secondary-action" data-act="req" data-id="${r.id}" data-accept="1" type="button">${esc(T('Aceptar'))}</button>
        <button class="ghost-btn secondary-action cl-danger" data-act="req" data-id="${r.id}" data-accept="0" type="button">${esc(T('Rechazar'))}</button>
      </div></div>`).join('');
  }

  function settingsTab(c) {
    const leader = c.my_role === 'leader';
    return `<div class="card cl-settings">
      <h3>${esc(T('Ajustes del clan'))}</h3>
      <label class="form-field"><span>${esc(T('Descripción (máx. 200)'))}</span><input id="cl-set-desc" type="text" maxlength="200" value="${esc(c.description)}" /></label>
      <label class="form-field"><span>${esc(T('Anuncio para los miembros (máx. 300)'))}</span><input id="cl-set-ann" type="text" maxlength="300" value="${esc(c.announcement || '')}" /></label>
      ${leader ? `<div class="cl-inline">
        <label class="form-field" style="flex:1"><span>${esc(T('Ingreso'))}</span>
          <select id="cl-set-mode">${Object.keys(MODE_ES).map((k) => `<option value="${k}" ${c.join_mode === k ? 'selected' : ''}>${esc(modeName(k))}</option>`).join('')}</select></label>
        <label class="form-field"><span>${esc(T('Color'))}</span><input id="cl-set-color" type="color" value="${col(c.color)}" /></label>
      </div>` : ''}
      <div class="cl-inline"><button class="primary-btn" data-act="save" type="button">${esc(T('Guardar cambios'))}</button></div>
    </div>
    ${leader ? `<div class="card"><h3>${esc(T('Zona peligrosa'))}</h3><p class="hint">${esc(T('Disolver el clan expulsa a todos y borra su chat. No se puede deshacer.'))}</p>
      <button class="ghost-btn cl-danger" data-act="disband" type="button">${esc(T('Disolver clan'))}</button></div>` : ''}`;
  }

  function renderMine() {
    const m = S.mine;
    if (!m) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
    const c = m.clan;
    if (!c) {
      const inv = (m.invites || []).length ? `<div class="fr-section-title">${esc(T('Invitaciones'))}</div>` + m.invites.map((i) => `<div class="fr-row">
          <div class="cl-emblem sm" style="--c:${col(i.color)}">${esc(i.tag)}</div>
          <div class="fr-row-info"><div class="fr-row-name">${esc(i.name)}</div><div class="fr-row-sub">${esc(T('Te invitó {by} · {a}/{b} miembros', { by: i.by, a: i.members, b: i.max }))}</div></div>
          <div class="cl-row-acts">
            <button class="primary-btn secondary-action" data-act="inv" data-id="${i.id}" data-accept="1" type="button">${esc(T('Unirme'))}</button>
            <button class="ghost-btn secondary-action cl-danger" data-act="inv" data-id="${i.id}" data-accept="0" type="button">${esc(T('Rechazar'))}</button>
          </div></div>`).join('') : '';
      return `${inv}
        <div class="card cl-create">
          <h3>${esc(T('Crear un clan'))}</h3>
          <p class="hint">${esc(T('Sumá XP con tu clan jugando en Vivet y escalá en el top. Podés estar en un solo clan a la vez.'))}</p>
          <div class="cl-inline">
            <label class="form-field" style="flex:1"><span>${esc(T('Nombre (3-24)'))}</span><input id="cl-new-name" type="text" maxlength="24" autocomplete="off" /></label>
            <label class="form-field" style="width:110px"><span>${esc(T('Etiqueta (2-5)'))}</span><input id="cl-new-tag" type="text" maxlength="5" autocomplete="off" style="text-transform:uppercase" /></label>
          </div>
          <label class="form-field"><span>${esc(T('Descripción (opcional)'))}</span><input id="cl-new-desc" type="text" maxlength="200" autocomplete="off" /></label>
          <div class="cl-inline">
            <label class="form-field" style="flex:1"><span>${esc(T('Ingreso'))}</span>
              <select id="cl-new-mode"><option value="request">${esc(T('Con solicitud'))}</option><option value="open">${esc(T('Abierto'))}</option><option value="closed">${esc(T('Cerrado (solo invitación)'))}</option></select></label>
            <label class="form-field"><span>${esc(T('Color'))}</span><input id="cl-new-color" type="color" value="#17e0e8" /></label>
          </div>
          <div class="cl-inline"><button class="primary-btn" data-act="create" type="button">${esc(T('Crear clan'))}</button>
            <button class="ghost-btn" data-act="tab" data-tab="top" type="button">${esc(T('Buscar un clan'))}</button></div>
        </div>`;
    }
    const isOff = c.my_role === 'leader' || c.my_role === 'officer';
    const subs = [['members', T('Miembros')], ['chat', T('Chat')],
      ...(isOff ? [['requests', c.pending_requests ? T('Solicitudes ({n})', { n: c.pending_requests }) : T('Solicitudes')]] : []),
      ...(isOff ? [['settings', T('Ajustes')]] : [])];
    if (!subs.some(([k]) => k === S.sub)) S.sub = 'members';
    const body = S.sub === 'chat' ? chatTab() : S.sub === 'requests' ? requestsTab() : S.sub === 'settings' ? settingsTab(c) : membersTab(c, true);
    return `${headCard(c)}
      <div class="forum-bar">${subs.map(([k, l]) => `<button class="social-tab ${S.sub === k ? 'on' : ''}" data-act="sub" data-sub="${k}" type="button">${esc(l)}</button>`).join('')}
        <button class="ghost-btn secondary-action cl-danger" data-act="leave" type="button" style="margin-left:auto;">${esc(T('Salir del clan'))}</button></div>
      ${body}`;
  }

  function topRow(c, i) {
    const lv = level(c.xp);
    const cls = i < 3 ? `comp-top${i + 1}` : '';
    let btn = '';
    if (c.state === 'member') btn = `<span class="cl-chip">${esc(T('Tu clan'))}</span>`;
    else if (c.state === 'pending') btn = `<button class="ghost-btn secondary-action" data-act="cancel" data-id="${c.id}" type="button">${esc(T('Cancelar solicitud'))}</button>`;
    else if (c.state === 'invited') btn = `<button class="primary-btn secondary-action" data-act="join" data-id="${c.id}" type="button">${esc(T('Aceptar invitación'))}</button>`;
    else if (c.join_mode === 'closed') btn = `<span class="hint">${esc(T('Cerrado'))}</span>`;
    else if (c.members >= c.max) btn = `<span class="hint">${esc(T('Lleno'))}</span>`;
    else if (loggedIn()) btn = `<button class="primary-btn secondary-action" data-act="join" data-id="${c.id}" type="button">${esc(T(c.join_mode === 'open' ? 'Unirme' : 'Solicitar'))}</button>`;
    return `<div class="fr-row cl-toprow ${cls}" data-act="view" data-id="${c.id}">
      <div class="comp-pos">${i + 1}</div>
      <div class="cl-emblem sm" style="--c:${col(c.color)}">${esc(c.tag)}</div>
      <div class="fr-row-info"><div class="fr-row-name">${esc(c.name)}</div>
        <div class="fr-row-sub">${esc(T('Nv {n} · {a}/{b} miembros · {m}', { n: lv.l, a: c.members, b: c.max, m: modeName(c.join_mode) }))}</div></div>
      <div class="comp-time">${esc(T('{n} XP', { n: fmt(c.xp) }))}</div>
      <div class="cl-row-acts">${btn}</div></div>`;
  }

  function topList() {
    if (S.top === null) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
    if (S.top === 'error') return `<p class="hint fr-empty">${esc(T('No se pudo cargar el top ({e}).', { e: T(S.topErr) }))}</p>`;
    if (!S.top.length) return `<p class="hint fr-empty">${esc(T(S.q ? 'Sin resultados.' : 'Todavía no hay clanes. ¡Creá el primero!'))}</p>`;
    return S.top.map(topRow).join('');
  }

  function renderTop() {
    return `<div class="toolbar" style="margin:0 32px 8px;">
        <div class="search-box"><input id="cl-search" type="text" maxlength="30" placeholder="${esc(T('Buscar clan por nombre o etiqueta...'))}" value="${esc(S.q)}" autocomplete="off" /></div>
        <button class="ghost-btn" data-act="refresh" type="button">${esc(T('Actualizar'))}</button>
      </div>
      <div class="forum-bar">${[['xp', 'Más XP'], ['members', 'Más miembros'], ['new', 'Nuevos']].map(([k, l]) => `<button class="social-tab ${S.sort === k ? 'on' : ''}" data-act="sort" data-sort="${k}" type="button">${esc(T(l))}</button>`).join('')}</div>
      <div id="cl-toplist">${topList()}</div>`;
  }

  function renderView() {
    const c = S.view;
    if (!c) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
    let btn = '';
    if (c.state === 'member') btn = '';
    else if (c.state === 'pending') btn = `<button class="ghost-btn" data-act="cancel" data-id="${c.id}" type="button">${esc(T('Cancelar solicitud'))}</button>`;
    else if (c.state === 'invited') btn = `<button class="primary-btn" data-act="join" data-id="${c.id}" type="button">${esc(T('Aceptar invitación'))}</button>`;
    else if (c.join_mode !== 'closed' && c.members < c.max && loggedIn()) btn = `<button class="primary-btn" data-act="join" data-id="${c.id}" type="button">${esc(T(c.join_mode === 'open' ? 'Unirme' : 'Solicitar unirme'))}</button>`;
    return `<div class="forum-bar"><button class="ghost-btn secondary-action" data-act="back" type="button">${esc(T('← Volver al top'))}</button>
        <span style="margin-left:auto">${btn}</span></div>
      ${headCard(c)}
      ${membersTab(c, false)}`;
  }

  // ------------------------------------------------------------ render
  // Textos fijos del HTML (menú y cabecera del panel): se repintan al cambiar de idioma.
  function paintHead() {
    const set = (id, es) => { const el = document.getElementById(id); if (el) el.textContent = T(es); };
    set('clan-nav-label', 'Clanes');
    set('clan-title', 'Clanes');
    set('clan-hint', 'Armá tu clan, sumá XP en equipo, chateá con tus compañeros y escalá en el top de clanes.');
  }

  function render(force) {
    // No pisar lo que se está escribiendo (los refrescos de fondo no deben borrar los inputs).
    const ae = document.activeElement;
    if (!force && ae && root.contains(ae) && ae.matches('input,textarea,select')) return;
    const nr = notReady();
    const tabs = `<div class="forum-bar" style="margin:0 32px 12px;">
        <button class="social-tab ${S.tab === 'mine' ? 'on' : ''}" data-act="tab" data-tab="mine" type="button">${esc(T('Mi clan'))}</button>
        <button class="social-tab ${S.tab !== 'mine' ? 'on' : ''}" data-act="tab" data-tab="top" type="button">${esc(T('Top clanes'))}</button></div>`;
    // Top clanes se puede mirar sin sesión; Mi clan no.
    let body;
    if (S.tab === 'mine') body = nr || renderMine();
    else if (S.tab === 'view') body = renderView();
    else body = renderTop();
    root.innerHTML = `${tabs}<div class="cl-body">${body}</div>`;
    if (S.tab === 'mine' && S.mine && S.mine.clan && S.sub === 'chat') paintMsgs(true);
  }

  // ------------------------------------------------------------ datos
  async function loadMine(opts = {}) {
    if (!loggedIn()) { S.mine = null; updateBadge(); if (!opts.silent) render(true); return; }
    try {
      const prev = S.mine && S.mine.clan && S.mine.clan.id;
      S.mine = await req('GET', '/clans/mine');
      if ((S.mine.clan && S.mine.clan.id) !== prev) { S.msgs = []; S.reqs = null; S.sub = 'members'; }
    } catch (e) { if (!opts.silent) toast(e.message); }
    updateBadge();
    if (panelActive() && S.tab === 'mine') render(!!opts.force);
  }

  let topTimer = null;
  async function loadTop() {
    try {
      const p = new URLSearchParams({ sort: S.sort, limit: '50' });
      if (S.q) p.set('q', S.q);
      const r = await req('GET', '/clans/top?' + p);
      S.top = r.top || [];
    } catch (e) { S.top = 'error'; S.topErr = e.message || 'error'; }
    const box = $('#cl-toplist');
    if (box) box.innerHTML = topList();
  }

  async function loadView(id) {
    S.tab = 'view'; S.view = null; render(true);
    try { S.view = await req('GET', `/clans/${id}`); } catch (e) { toast(e.message); S.tab = 'top'; }
    render(true);
  }

  async function loadReqs() {
    const c = S.mine && S.mine.clan;
    if (!c || (c.my_role !== 'leader' && c.my_role !== 'officer')) return;
    try { S.reqs = (await req('GET', `/clans/${c.id}/requests`)).requests || []; } catch (_) { S.reqs = []; }
    if (S.sub === 'requests') render(true);
  }

  function updateBadge() {
    const b = $('#clan-badge');
    if (!b) return;
    const m = S.mine;
    const n = m ? (m.invites || []).length + ((m.clan && m.clan.pending_requests) || 0) : 0;
    b.hidden = n === 0;
    b.textContent = n > 99 ? '99+' : String(n);
  }

  // ------------------------------------------------------------ chat
  function paintMsgs(bottom) {
    const box = $('#cl-msgs');
    if (!box) return;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    const me = myId();
    box.innerHTML = S.msgs.length ? S.msgs.map((m) => `<div class="cl-msg ${m.from === me ? 'mine' : ''}"><b>${esc(m.from === me ? T('Vos') : m.name)}</b> <span>${esc(m.body)}</span> <i>${hhmm(m.created_at)}</i></div>`).join('')
      : `<p class="hint fr-empty">${esc(T('Todavía no hay mensajes. ¡Saludá al clan!'))}</p>`;
    if (bottom || near) box.scrollTop = box.scrollHeight;
  }
  async function pollMsgs() {
    const c = S.mine && S.mine.clan;
    if (!c || S.sub !== 'chat' || S.tab !== 'mine' || !panelActive() || document.hidden) return;
    try {
      const last = S.msgs.length ? S.msgs[S.msgs.length - 1].id : 0;
      const r = await req('GET', `/clans/${c.id}/messages${last ? `?after=${last}` : ''}`);
      const fresh = (r.messages || []).filter((m) => !S.msgs.some((x) => x.id === m.id));
      if (fresh.length || !last) { S.msgs = S.msgs.concat(fresh).slice(-200); paintMsgs(false); }
    } catch (_) {}
  }

  // ------------------------------------------------------------ acciones
  const val = (id) => (document.getElementById(id) || {}).value || '';
  const ask = (es) => confirm(T(es));
  const joinRoom = (code) => {
    const url = `https://www.haxball.com/play?c=${encodeURIComponent(code)}`;
    try {
      if (typeof appRoot !== 'undefined' && appRoot && appRoot.classList.contains('playing')) return toast('Salí de tu sala actual para unirte a esa sala');
      if (typeof joinByUrl === 'function') joinByUrl(url, null);
    } catch (_) {}
  };

  async function afterJoin(r) {
    if (r && r.joined) { toast('¡Te uniste al clan!', 'ok'); S.tab = 'mine'; await loadMine({ force: true }); }
    else if (r && r.requested) { toast('Solicitud enviada. Un oficial tiene que aprobarla.', 'ok'); await loadTop(); if (S.tab === 'view') loadView(S.view.id); }
  }

  const ACTIONS = {
    tab: (el) => {
      S.tab = el.dataset.tab; S.view = null; render(true);
      if (S.tab === 'top') loadTop(); else loadMine({ force: true });
    },
    sub: (el) => {
      S.sub = el.dataset.sub; render(true);
      if (S.sub === 'requests') loadReqs();
      if (S.sub === 'chat') pollMsgs();
    },
    back: () => { S.tab = 'top'; S.view = null; render(true); loadTop(); },
    view: (el, ev) => { if (ev.target.closest('button')) return; loadView(el.dataset.id); },
    sort: (el) => { S.sort = el.dataset.sort; S.top = null; render(true); loadTop(); },
    refresh: () => loadTop(),
    create: () => run(async () => {
      await req('POST', '/clans', {
        name: val('cl-new-name'), tag: val('cl-new-tag'), description: val('cl-new-desc'),
        join_mode: val('cl-new-mode'), color: val('cl-new-color'),
      });
      toast('¡Clan creado!', 'ok');
      await loadMine({ force: true });
    }),
    join: (el) => run(async () => afterJoin(await req('POST', `/clans/${el.dataset.id}/join`))),
    cancel: (el) => run(async () => {
      await req('DELETE', `/clans/${el.dataset.id}/join`);
      await loadTop(); if (S.tab === 'view') loadView(S.view.id);
    }),
    inv: (el) => run(async () => {
      const acc = el.dataset.accept === '1';
      await req('POST', `/clans/invites/${el.dataset.id}/respond`, { accept: acc });
      if (acc) toast('¡Te uniste al clan!', 'ok');
      await loadMine({ force: true });
    }),
    invite: () => run(async () => {
      const q = val('cl-invite-q').trim();
      if (!q) return;
      await req('POST', `/clans/${S.mine.clan.id}/invite`, { query: q });
      toast('Invitación enviada', 'ok');
      const i = document.getElementById('cl-invite-q'); if (i) i.value = '';
    }),
    leave: () => run(async () => {
      if (!ask('¿Seguro que querés salir del clan?')) return;
      await req('POST', '/clans/leave');
      toast('Saliste del clan', 'ok');
      await loadMine({ force: true });
    }),
    disband: () => run(async () => {
      if (!ask('¿Disolver el clan? Se expulsa a todos y se borra el chat. No se puede deshacer.')) return;
      await req('DELETE', `/clans/${S.mine.clan.id}`);
      toast('Clan disuelto', 'ok');
      await loadMine({ force: true });
    }),
    kick: (el) => run(async () => {
      if (!ask('¿Expulsar a este miembro?')) return;
      await req('POST', `/clans/${S.mine.clan.id}/members/${el.dataset.id}/kick`);
      await loadMine({ force: true });
    }),
    role: (el) => run(async () => {
      await req('POST', `/clans/${S.mine.clan.id}/members/${el.dataset.id}/role`, { role: el.dataset.role });
      await loadMine({ force: true });
    }),
    transfer: (el) => run(async () => {
      if (!ask('¿Transferir el liderazgo? Vas a quedar como oficial.')) return;
      await req('POST', `/clans/${S.mine.clan.id}/transfer`, { id: Number(el.dataset.id) });
      toast('Liderazgo transferido', 'ok');
      await loadMine({ force: true });
    }),
    req: (el) => run(async () => {
      await req('POST', `/clans/${S.mine.clan.id}/requests/${el.dataset.id}`, { accept: el.dataset.accept === '1' });
      await Promise.all([loadReqs(), loadMine({ force: true })]);
    }),
    save: () => run(async () => {
      const body = { description: val('cl-set-desc'), announcement: val('cl-set-ann') };
      if (S.mine.clan.my_role === 'leader') { body.join_mode = val('cl-set-mode'); body.color = val('cl-set-color'); }
      await req('PATCH', `/clans/${S.mine.clan.id}`, body);
      toast('Cambios guardados', 'ok');
      await loadMine({ force: true });
    }),
    send: () => run(async () => {
      const inp = document.getElementById('cl-msg-in');
      const body = (inp && inp.value || '').trim();
      if (!body) return;
      inp.value = '';
      try { await req('POST', `/clans/${S.mine.clan.id}/messages`, { body }); }
      catch (e) { inp.value = body; throw e; }
      await pollMsgs();
      paintMsgs(true);
      inp.focus();
    }),
    joinroom: (el) => joinRoom(el.dataset.code),
  };

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el, e);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.target.id === 'cl-msg-in') ACTIONS.send();
    else if (e.target.id === 'cl-invite-q') ACTIONS.invite();
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'cl-search') return;
    S.q = e.target.value.trim();
    clearTimeout(topTimer);
    topTimer = setTimeout(loadTop, 300);
  });

  // ------------------------------------------------------------ arranque / eventos
  document.querySelector('.nav-btn[data-panel="panel-clanes"]')?.addEventListener('click', () => {
    render(true);
    if (S.tab === 'top') loadTop(); else loadMine({ force: true });
  });
  window.addEventListener('vivet-session-changed', () => {
    S.mine = null; S.msgs = []; S.reqs = null; S.view = null;
    if (S.tab === 'view') S.tab = 'top';
    render(true);
    if (loggedIn()) loadMine({ silent: true, force: true }); else updateBadge();
  });
  window.addEventListener('vivet-friends-updated', () => { if (panelActive()) render(false); });
  window.addEventListener('vivet-lang-changed', () => { paintHead(); render(true); });

  setInterval(() => { if (!document.hidden && loggedIn()) loadMine({ silent: true }); }, 15000);
  setInterval(pollMsgs, 4000);
  setInterval(() => { if (!document.hidden && panelActive() && S.tab === 'top') loadTop(); }, 60000);

  paintHead();
  render(true);
  if (loggedIn()) loadMine({ silent: true, force: true });
})();