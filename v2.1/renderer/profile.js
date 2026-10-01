// Vivet Client - renderer/profile.js
// Perfiles extendidos: ventana de perfil (bio, banner, estadísticas, publicaciones) y su edición en Social.
// Se carga DESPUÉS de app.js y forum.js (usa window.vivetApi, escapeHtml, showToast y FRIENDS_API_URL).
// Expone window.vivetProfile.open(userId) para abrir el perfil de cualquiera.
(() => {
  const $ = (s) => document.querySelector(s);
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const esc = (s) => escapeHtml(String(s ?? ''));
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
  const api = () => window.vivetApi;
  const loggedIn = () => !!(api() && api().loggedIn());
  const req = (method, path, body) => api().request(method, path, body);
  const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const BANNER_MAX_BYTES = 140 * 1024;

  // ------------------------------------------------------------ utilidades
  const nameOf = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);
  const hours = (sec) => {
    const h = Math.floor((Number(sec) || 0) / 3600);
    return h >= 1 ? `${h} h` : `${Math.floor((Number(sec) || 0) / 60)} min`;
  };
  const since = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—');
  const ago = (ts) => {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'ahora';
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
    if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
    return new Date(ts).toLocaleDateString();
  };
  const safeColor = (c) => (COLOR_RE.test(c || '') ? c : '');

  // Banner recortado a 3:1 (900x300) y comprimido hasta ~140 KB.
  async function compressBanner(file) {
    const bmp = await createImageBitmap(file);
    let w = 900;
    for (let tries = 0; tries < 5; tries++) {
      const h = Math.round(w / 3);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const k = Math.max(w / bmp.width, h / bmp.height); // "cover"
      const dw = bmp.width * k, dh = bmp.height * k;
      c.getContext('2d').drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
      for (const q of [0.85, 0.72, 0.58, 0.45]) {
        const url = c.toDataURL('image/webp', q);
        if (!url.startsWith('data:image/webp')) throw new Error('webp no disponible');
        if ((url.length - url.indexOf(',') - 1) * 0.75 <= BANNER_MAX_BYTES) return url;
      }
      w = Math.round(w * 0.8);
    }
    throw new Error('too big');
  }

  // ============================================================ ventana de perfil
  const modal = document.createElement('div');
  modal.className = 'map-modal pf-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="pf-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(modal);
  const box = modal.querySelector('.pf-box');
  let currentId = 0;

  const close = () => { modal.hidden = true; box.innerHTML = ''; currentId = 0; };
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  function clipLine(u) {
    let host = 'link';
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (_) {}
    return `<div class="pf-clip"><span>${esc(host)}</span><button class="primary-btn" type="button" data-act="open-clip" data-url="${esc(u)}">Ver clip</button></div>`;
  }
  function miniPost(p) {
    const body = p.body ? `<div class="fo-text">${esc(p.body.length > 240 ? p.body.slice(0, 240) + '…' : p.body)}</div>` : '';
    const img = p.has_image ? `<img class="pf-post-img" alt="" loading="lazy" src="${esc(API)}/forum/posts/${esc(p.id)}/image" />` : '';
    return `<div class="pf-post">${body}${img}${p.clip_url ? clipLine(p.clip_url) : ''}
      <div class="hint">${ago(p.created_at)} · ${p.likes} me gusta · ${p.comments} comentarios</div></div>`;
  }

  function actionsHtml(p) {
    switch (p.relation) {
      case 'self': return '<button class="primary-btn" type="button" data-act="edit">Editar mi perfil</button>';
      case 'friend': return '<span class="pf-tag">Amigos</span>';
      case 'pending_out': return '<span class="pf-tag">Solicitud enviada</span>';
      case 'pending_in': return '<button class="primary-btn" type="button" data-act="accept">Aceptar solicitud</button>';
      default: return '<button class="primary-btn" type="button" data-act="add">Agregar amigo</button>';
    }
  }

  function draw(p) {
    const color = safeColor(p.color);
    const bannerStyle = p.banner
      ? `background-image:url('${esc(API + p.banner)}')`
      : (color ? `background:linear-gradient(135deg, ${color}, ${color}66)` : '');
    const online = p.online === null ? '' : `<span class="pf-dot ${p.online ? 'on' : ''}" title="${p.online ? 'En línea' : 'Desconectado'}"></span>`;
    box.style.setProperty('--pf-color', color || 'var(--accent)');
    box.innerHTML = `
      <button class="pf-close ghost-btn icon-only" type="button" data-act="close" aria-label="Cerrar">✕</button>
      <div class="pf-banner ${p.banner || color ? '' : 'empty'}" style="${bannerStyle}"></div>
      <div class="pf-head">
        <img class="pf-avatar" alt="" src="${esc(p.avatar_url || '')}" onerror="this.removeAttribute('src')" />
        <div class="pf-ident">
          <div class="pf-name">${online}${esc(nameOf(p))}</div>
          <div class="hint">Miembro desde ${esc(since(p.member_since))}</div>
        </div>
        <div class="pf-actions">${actionsHtml(p)}</div>
      </div>
      ${p.bio ? `<div class="pf-bio">${esc(p.bio)}</div>` : '<div class="pf-bio pf-bio-empty">Sin biografía todavía.</div>'}
      <div class="pf-stats">
        <div><b>${p.stats.posts}</b><span>Publicaciones</span></div>
        <div><b>${p.stats.likes}</b><span>Me gusta</span></div>
        <div><b>${esc(hours(p.stats.seconds))}</b><span>Tiempo jugado</span></div>
      </div>
      <div class="fr-section-title pf-section">Últimas publicaciones</div>
      <div id="pf-posts"><p class="hint">Cargando…</p></div>`;
  }

  async function loadPosts(id) {
    const el = box.querySelector('#pf-posts');
    if (!el) return;
    try {
      const r = await req('GET', `/forum/posts?user=${encodeURIComponent(id)}`);
      if (id !== currentId) return;
      const list = (r.posts || []).slice(0, 5);
      el.innerHTML = list.length ? list.map(miniPost).join('') : '<p class="hint">Todavía no publicó nada en el foro.</p>';
    } catch (_) {
      if (id === currentId && el) el.innerHTML = '<p class="hint">No se pudieron cargar las publicaciones.</p>';
    }
  }

  async function open(id) {
    id = Number(id);
    if (!Number.isInteger(id) || id < 1) return;
    if (!loggedIn()) return toast('Conectá tu Discord en Social para ver perfiles');
    currentId = id;
    modal.hidden = false;
    box.innerHTML = '<p class="hint" style="padding:28px;">Cargando perfil…</p>';
    try {
      const p = await req('GET', `/users/${encodeURIComponent(id)}/profile`);
      if (id !== currentId) return;
      draw(p);
      loadPosts(id);
    } catch (e) {
      close();
      toast(e.message || 'No se pudo abrir el perfil');
    }
  }
  window.vivetProfile = { open };

  box.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    try {
      if (act === 'close') close();
      else if (act === 'open-clip') {
        const u = t.dataset.url || '';
        if (/^https:\/\//i.test(u)) window.vivet.openExternal(u);
      } else if (act === 'edit') {
        close();
        document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.click();
        setTimeout(() => $('#profile-edit-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else if (act === 'add') {
        t.disabled = true;
        const r = await req('POST', '/friends/request', { id: currentId });
        toast(r && r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
        open(currentId);
      } else if (act === 'accept') {
        t.disabled = true;
        await req('POST', '/friends/respond', { id: currentId, accept: true });
        toast('Solicitud aceptada', 'ok');
        open(currentId);
      }
    } catch (err) { toast(err.message || 'No se pudo completar la acción'); t.disabled = false; }
  });

  // Click en la foto o el nombre de un amigo (Social) -> abre su perfil.
  $('#fr-lists')?.addEventListener('click', (e) => {
    if (!e.target.closest('.fr-avatar, .fr-row-name')) return;
    const row = e.target.closest('.fr-row');
    const idEl = row && row.querySelector('[data-id]');
    if (idEl) open(idEl.dataset.id);
  });

  // ============================================================ edición (Social)
  const bioEl = $('#pe-bio'), bioCount = $('#pe-bio-count'), colorEl = $('#pe-color'), colorClear = $('#pe-color-clear');
  const bannerBox = $('#pe-banner'), bannerPick = $('#pe-banner-pick'), bannerRemove = $('#pe-banner-remove'), bannerFile = $('#pe-banner-file');
  const saveBtn = $('#pe-save'), viewBtn = $('#pe-view');
  if (!bioEl) return;

  let mineState = { bio: '', color: '', banner: null };
  let colorSet = false;

  function paintEdit() {
    bioEl.value = mineState.bio;
    bioCount.textContent = `${bioEl.value.length}/200`;
    colorSet = !!safeColor(mineState.color);
    colorEl.value = colorSet ? mineState.color : '#17e0e8';
    bannerBox.classList.toggle('empty', !mineState.banner);
    bannerBox.style.backgroundImage = mineState.banner ? `url('${API + mineState.banner}')` : '';
    bannerRemove.hidden = !mineState.banner;
  }
  async function loadMine() {
    if (!loggedIn()) return;
    try { mineState = await req('GET', '/me/profile'); paintEdit(); } catch (_) {}
  }

  bioEl.addEventListener('input', () => { bioCount.textContent = `${bioEl.value.length}/200`; });
  colorEl.addEventListener('input', () => { colorSet = true; });
  colorClear?.addEventListener('click', () => { colorSet = false; colorEl.value = '#17e0e8'; });

  bannerPick.addEventListener('click', () => bannerFile.click());
  bannerFile.addEventListener('change', async () => {
    const f = bannerFile.files && bannerFile.files[0];
    bannerFile.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) return toast('Elegí una imagen');
    bannerPick.disabled = true;
    try {
      const image = await compressBanner(f);
      mineState = await req('PUT', '/me/banner', { image });
      paintEdit();
      toast('Banner actualizado', 'ok');
    } catch (e) { toast(e && e.message && !/too big|webp/.test(e.message) ? e.message : 'No se pudo usar esa imagen. Probá con otra.'); }
    bannerPick.disabled = false;
  });
  bannerRemove.addEventListener('click', async () => {
    try { mineState = await req('DELETE', '/me/banner'); paintEdit(); toast('Banner quitado', 'ok'); }
    catch (e) { toast(e.message || 'No se pudo quitar el banner'); }
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      mineState = await req('PATCH', '/me/profile', { bio: bioEl.value.trim(), color: colorSet ? colorEl.value : '' });
      paintEdit();
      toast('Perfil guardado', 'ok');
    } catch (e) { toast(e.message || 'No se pudo guardar el perfil'); }
    saveBtn.disabled = false;
  });
  viewBtn.addEventListener('click', () => { const me = api() && api().me(); if (me) open(me.id); });

  window.addEventListener('vivet-session-changed', loadMine);
  document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.addEventListener('click', loadMine);
  loadMine();
})();