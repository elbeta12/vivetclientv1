// Vivet Client - renderer/app2.js
// Reúne en un solo archivo los módulos de la interfaz que antes estaban sueltos:
//   forum.js, profile.js, updates.js, music.js, roommates.js, ui-organize.js
// Se carga DESPUÉS de app.js y chat.js. El orden de las secciones importa (profile usa el foro,
// ui-organize va al final). Cada sección va en su propio try/catch: si una falla, las demás siguen.
// chat.js NO se incluye acá porque también lo usa chat-window.html.

// ======================================================================
// Foro  (antes: forum.js)
// ======================================================================
try {
  // Vivet Client - renderer/forum.js
  // Foro dentro de Social: publicaciones con texto, foto y/o clip (link), me gusta y comentarios.
  // Se carga DESPUÉS de app.js (usa window.vivetApi, escapeHtml, showToast y FRIENDS_API_URL).
  (() => {
    const $ = (s) => document.querySelector(s);
    const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (method, path, body) => api().request(method, path, body);

    const heartSvg = (on) => `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.7 2.7 5 6.3 5c2.1 0 3.6 1.1 4.4 2.6h2.6C14.1 6.1 15.6 5 17.7 5c3.6 0 5.3 3.7 3.9 6.8C19.5 16.4 12 21 12 21z"/></svg>`;
    const IMG_MAX_BYTES = 140 * 1024; // el server acepta hasta 150 KB
    const IMG_MAX_SIDE = 960;

    const panel = $('#panel-foro');
    const loginBox = $('#forum-login-hint'), mainBox = $('#forum-main');
    const listEl = $('#forum-list'), moreBtn = $('#forum-more');
    const textEl = $('#forum-text'), clipEl = $('#forum-clip'), fileEl = $('#forum-img-file');
    const imgBtn = $('#forum-img-btn'), prevEl = $('#forum-img-preview'), postBtn = $('#forum-post-btn');
    const countEl = $('#forum-count');
    if (!panel || !listEl || !textEl) return;

    let image = ''; // data URL de la foto elegida
    let mine = false;
    let posts = [];
    let more = false;
    let loading = false;
    const openComments = new Map(); // id de publicación -> { list: [], loaded }

    // ------------------------------------------------------------ utilidades
    function ago(ts) {
      const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return 'ahora';
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
      if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
      return new Date(ts).toLocaleDateString();
    }
    const nameOf = (a) => esc(a.haxball_nick ? `${a.haxball_nick} (${a.username})` : a.username);
    const avatarOf = (a) => `<img class="fr-avatar fo-avatar fo-link" data-act="profile" data-uid="${esc(a.id)}" alt="" src="${esc(a.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;

    function youtubeId(u) {
      try {
        const x = new URL(u);
        const h = x.hostname.replace(/^www\.|^m\./, '');
        if (h === 'youtu.be') return x.pathname.slice(1).split('/')[0] || '';
        if (h === 'youtube.com') {
          if (x.pathname === '/watch') return x.searchParams.get('v') || '';
          const m = /^\/(shorts|embed|live)\/([\w-]{6,20})/.exec(x.pathname);
          if (m) return m[2];
        }
      } catch (_) {}
      return '';
    }
    const isVideoFile = (u) => {
      try {
        const x = new URL(u);
        return /(^|\.)(cdn\.discordapp\.com|media\.discordapp\.net)$/.test(x.hostname) && /\.(mp4|webm|mov)$/i.test(x.pathname);
      } catch (_) { return false; }
    };
    function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return 'link'; } }

    function clipHtml(u) {
      if (!u) return '';
      if (isVideoFile(u)) {
        return `<video class="fo-video" controls preload="metadata" src="${esc(u)}"></video>`;
      }
      const yt = youtubeId(u);
      const thumb = yt ? `<img class="fo-clip-thumb" alt="" loading="lazy" src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" onerror="this.remove()" />` : '';
      return `<div class="fo-clip">${thumb}<div class="fo-clip-info"><span class="fo-clip-tag">Clip</span><span class="fo-clip-host">${esc(hostOf(u))}</span></div><button class="primary-btn fo-clip-open" type="button" data-act="open-clip" data-url="${esc(u)}">Ver clip</button></div>`;
    }

    // ------------------------------------------------------------ render
    function commentsHtml(p) {
      const st = openComments.get(p.id);
      if (!st) return '';
      const items = st.list.map((c) => `
        <div class="fo-comment" data-cid="${esc(c.id)}">
          ${avatarOf(c.author)}
          <div class="fo-comment-body">
            <div class="fo-comment-head"><b class="fo-link" data-act="profile" data-uid="${esc(c.author.id)}">${nameOf(c.author)}</b> <span>${ago(c.created_at)}</span></div>
            <div class="fo-text">${esc(c.body)}</div>
          </div>
          ${c.can_delete ? `<button class="ghost-btn secondary-action" type="button" data-act="del-comment" data-cid="${esc(c.id)}">Borrar</button>` : ''}
        </div>`).join('');
      const empty = st.loaded && !st.list.length ? '<p class="hint" style="margin:6px 0;">Todavía no hay comentarios.</p>' : '';
      const load = st.loaded ? '' : '<p class="hint" style="margin:6px 0;">Cargando…</p>';
      return `<div class="fo-comments">${load}${empty}${items}
        <div class="fo-comment-form">
          <input type="text" maxlength="300" placeholder="Escribí un comentario…" data-role="comment-input" />
          <button class="primary-btn" type="button" data-act="send-comment">Enviar</button>
        </div></div>`;
    }

    function postHtml(p) {
      const body = p.body ? `<div class="fo-text">${esc(p.body)}</div>` : '';
      const img = p.has_image ? `<img class="fo-image" alt="" loading="lazy" data-act="zoom" src="${esc(API)}/forum/posts/${esc(p.id)}/image" />` : '';
      return `<article class="card fo-post" data-id="${esc(p.id)}">
        <div class="fo-head">${avatarOf(p.author)}
          <div class="fo-head-info"><div class="fo-name fo-link" data-act="profile" data-uid="${esc(p.author.id)}">${nameOf(p.author)}</div><div class="hint">${ago(p.created_at)}</div></div>
          ${p.mine ? '<button class="ghost-btn secondary-action" type="button" data-act="del-post">Eliminar</button>'
            : '<button class="ghost-btn secondary-action" type="button" data-act="report">Reportar</button>'}
        </div>
        ${body}${img}${clipHtml(p.clip_url)}
        <div class="fo-actions">
          <button class="fo-act ${p.liked ? 'on' : ''}" type="button" data-act="like">${heartSvg(p.liked)} <span>${p.likes}</span></button>
          <button class="fo-act" type="button" data-act="toggle-comments">Comentarios <span>${p.comments}</span></button>
        </div>
        ${commentsHtml(p)}
      </article>`;
    }

    function render() {
      if (!posts.length) {
        listEl.innerHTML = `<p class="hint" style="margin:8px 32px;">${loading ? 'Cargando…' : (mine ? 'Todavía no publicaste nada.' : 'Todavía no hay publicaciones. ¡Sé el primero!')}</p>`;
      } else {
        // No se pisa lo que estás escribiendo en un comentario al volver a dibujar.
        const keep = {};
        listEl.querySelectorAll('.fo-post').forEach((a) => {
          const i = a.querySelector('[data-role="comment-input"]');
          if (i && i.value) keep[a.dataset.id] = i.value;
        });
        listEl.innerHTML = posts.map(postHtml).join('');
        for (const id in keep) {
          const i = listEl.querySelector(`.fo-post[data-id="${CSS.escape(id)}"] [data-role="comment-input"]`);
          if (i) i.value = keep[id];
        }
      }
      if (moreBtn) moreBtn.hidden = !more;
    }

    // ------------------------------------------------------------ datos
    async function load(append) {
      if (loading || !loggedIn()) return;
      loading = true;
      if (!append) render();
      try {
        const before = append && posts.length ? `&before=${encodeURIComponent(posts[posts.length - 1].id)}` : '';
        const r = await req('GET', `/forum/posts?mine=${mine ? 1 : 0}${before}`);
        posts = append ? posts.concat(r.posts || []) : (r.posts || []);
        more = !!r.more;
      } catch (e) {
        toast(e.message || 'No se pudo cargar el foro');
      }
      loading = false;
      render();
    }

    async function loadComments(id) {
      const st = openComments.get(id);
      if (!st) return;
      try {
        const r = await req('GET', `/forum/posts/${encodeURIComponent(id)}/comments`);
        st.list = r.comments || [];
        const p = posts.find((x) => x.id === id);
        if (p) p.comments = st.list.length;
      } catch (e) { toast(e.message || 'No se pudieron cargar los comentarios'); }
      st.loaded = true;
      render();
    }

    // ------------------------------------------------------------ componer
    function setPreview() {
      if (!prevEl) return;
      prevEl.hidden = !image;
      prevEl.innerHTML = image ? `<img alt="" src="${esc(image)}" /><button class="ghost-btn secondary-action" type="button" id="forum-img-remove">Quitar foto</button>` : '';
      $('#forum-img-remove')?.addEventListener('click', () => { image = ''; if (fileEl) fileEl.value = ''; setPreview(); });
    }

    // Reduce la foto a 960 px como máximo y la comprime hasta que entre en ~140 KB.
    async function compress(file) {
      const bmp = await createImageBitmap(file);
      let side = IMG_MAX_SIDE;
      for (let tries = 0; tries < 6; tries++) {
        const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bmp.width * k));
        c.height = Math.max(1, Math.round(bmp.height * k));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        for (const q of [0.85, 0.72, 0.58, 0.45]) {
          const url = c.toDataURL('image/webp', q);
          if (!url.startsWith('data:image/webp')) throw new Error('webp no disponible');
          if ((url.length - url.indexOf(',') - 1) * 0.75 <= IMG_MAX_BYTES) return url;
        }
        side = Math.round(side * 0.75);
      }
      throw new Error('too big');
    }

    imgBtn?.addEventListener('click', () => fileEl && fileEl.click());
    fileEl?.addEventListener('change', async () => {
      const f = fileEl.files && fileEl.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { fileEl.value = ''; return toast('Elegí una imagen'); }
      try { image = await compress(f); setPreview(); }
      catch (_) { image = ''; fileEl.value = ''; setPreview(); toast('No se pudo usar esa foto. Probá con otra.'); }
    });

    postBtn?.addEventListener('click', async () => {
      if (!loggedIn()) return;
      const body = textEl.value.trim(), clipUrl = (clipEl?.value || '').trim();
      if (!body && !image && !clipUrl) return toast('Escribí algo o agregá una foto o un clip');
      postBtn.disabled = true;
      try {
        await req('POST', '/forum/posts', { body, clip_url: clipUrl, image: image || undefined });
        textEl.value = ''; if (clipEl) clipEl.value = ''; image = ''; if (fileEl) fileEl.value = '';
        setPreview(); updateCount();
        toast('Publicado', 'ok');
        mine = false; syncFilter();
        await load(false);
      } catch (e) { toast(e.message || 'No se pudo publicar'); }
      postBtn.disabled = false;
    });

    function updateCount() { if (countEl) countEl.textContent = `${textEl.value.length}/1000`; }
    textEl.addEventListener('input', updateCount);

    // ------------------------------------------------------------ acciones sobre publicaciones
    listEl.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const art = t.closest('.fo-post');
      const id = art && art.dataset.id;
      const act = t.dataset.act;
      try {
        if (act === 'profile') {
          if (window.vivetProfile) window.vivetProfile.open(t.dataset.uid);
        } else if (act === 'open-clip') {
          const u = t.dataset.url || '';
          if (/^https:\/\//i.test(u)) window.vivet.openExternal(u);
        } else if (act === 'zoom') {
          t.classList.toggle('zoomed');
        } else if (act === 'like') {
          const r = await req('POST', `/forum/posts/${encodeURIComponent(id)}/like`);
          const p = posts.find((x) => x.id === id);
          if (p) { p.liked = r.liked; p.likes = r.likes; render(); }
        } else if (act === 'toggle-comments') {
          if (openComments.has(id)) { openComments.delete(id); render(); }
          else { openComments.set(id, { list: [], loaded: false }); render(); loadComments(id); }
        } else if (act === 'send-comment') {
          const input = art.querySelector('[data-role="comment-input"]');
          const body = (input.value || '').trim();
          if (!body) return;
          t.disabled = true;
          try { await req('POST', `/forum/posts/${encodeURIComponent(id)}/comments`, { body }); input.value = ''; await loadComments(id); }
          finally { t.disabled = false; }
        } else if (act === 'del-comment') {
          if (!confirm('¿Borrar este comentario?')) return;
          await req('DELETE', `/forum/comments/${encodeURIComponent(t.dataset.cid)}`);
          await loadComments(id);
        } else if (act === 'del-post') {
          if (!confirm('¿Eliminar esta publicación?')) return;
          await req('DELETE', `/forum/posts/${encodeURIComponent(id)}`);
          posts = posts.filter((x) => x.id !== id); openComments.delete(id); render();
          toast('Publicación eliminada', 'ok');
        } else if (act === 'report') {
          if (!confirm('¿Reportar esta publicación?')) return;
          await req('POST', `/forum/posts/${encodeURIComponent(id)}/report`, { reason: 'user-report' });
          toast('Reporte enviado', 'ok');
        }
      } catch (err) { toast(err.message || 'No se pudo completar la acción'); }
    });

    listEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('[data-role="comment-input"]')) {
        e.preventDefault();
        e.target.closest('.fo-post')?.querySelector('[data-act="send-comment"]')?.click();
      }
    });

    moreBtn?.addEventListener('click', () => load(true));
    $('#forum-refresh')?.addEventListener('click', () => { openComments.clear(); load(false); });

    // Filtro "Todo" / "Mis publicaciones"
    const fAll = $('#forum-f-all'), fMine = $('#forum-f-mine');
    function syncFilter() { fAll?.classList.toggle('on', !mine); fMine?.classList.toggle('on', mine); }
    fAll?.addEventListener('click', () => { if (mine) { mine = false; syncFilter(); load(false); } });
    fMine?.addEventListener('click', () => { if (!mine) { mine = true; syncFilter(); load(false); } });

    // ------------------------------------------------------------ panel Foro
    function forumActive() { return panel.classList.contains('active'); }
    document.querySelector('.nav-btn[data-panel="panel-foro"]')?.addEventListener('click', () => refreshState(true));

    function refreshState(fetchNow) {
      const ok = loggedIn();
      if (loginBox) loginBox.hidden = ok;
      if (mainBox) mainBox.hidden = !ok;
      if (!ok) { posts = []; openComments.clear(); return; }
      if (fetchNow) load(false);
    }
    window.addEventListener('vivet-session-changed', () => refreshState(forumActive()));

    // Mientras mirás el foro se actualiza solo cada minuto (sin pisar lo que estás escribiendo).
    setInterval(() => {
      if (document.hidden || !forumActive() || !loggedIn() || !forumActive()) return;
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#panel-foro')) return;
      const keepOpen = new Set(openComments.keys());
      load(false).then(() => keepOpen.forEach((id) => { if (openComments.has(id)) loadComments(id); }));
    }, 60000);

    setPreview(); updateCount(); syncFilter();
  })();
} catch (err) { console.error("[app2] forum.js:", err); }

// ======================================================================
// Perfiles  (antes: profile.js)
// ======================================================================
try {
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
        try { window.vivetShop && window.vivetShop.decorate(box, id); } catch (_) {} // marco/efecto/texto/mascota de la Tienda
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
          window.vivetUI?.tab('panel-amigos', 'profile');
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
} catch (err) { console.error("[app2] profile.js:", err); }

// ======================================================================
// Novedades (la lista VIVET_UPDATES se edita acá)  (antes: updates.js)
// ======================================================================
try {
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
      version: '2.3.1',
      date: '2026-10-02',
      title: 'Tienda, mascotas y actualizaciones automáticas',
      changes: [
        '[nuevo] Tienda: canjeá tu XP por mascotas, auras y marcos para personalizar tu perfil.',
        '[nuevo] Mascotas: ahora te dan un multiplicador de XP mientras jugás.',
        '[nuevo] Elegí tu nick la primera vez que abrís el cliente, al instalarlo por primera vez.',
        '[nuevo] Actualizaciones automáticas: cuando salga una versión nueva vas a ver un aviso dentro del cliente para descargarla e instalarla con un click.',
        '[mejora] Auras y marcos rediseñados, con mucho más detalle y animaciones.',
        '[mejora] Interfaz más limpia: se eliminó un botón de enlace que ya no hacía falta.',
        '[fix] El instalador ahora incluye correctamente el sistema de actualizaciones.',
      ],
    },
    {
      version: '2.2.0',
      date: '2026-10-01',
      title: 'Más fluidez, menos desorden',
      changes: [
        '[nuevo] Instaladores separados: uno para Windows 10 y 11 (64 bits) y otro para Windows antiguos (32 bits).',
        '[nuevo] Mini reproductor de música en las salas y en la interfaz, para controlar tus canciones sin salir de lo que estás haciendo.',
        '[nuevo] La música también suena dentro del juego, con tu biblioteca ilimitada, y podés controlarla desde la partida.',
        '[nuevo] Traducciones.',
        '[nuevo] Anti AFK: ya no se puede farmear XP dejando el cliente abierto sin jugar.',
        '[mejora] Mejor rendimiento: más fluidez y más FPS.',
        '[mejora] Interfaz reorganizada: lobby, botones y paneles ahora están ordenados en pestañas.',
        '[mejora] Las notificaciones de mensajes de un grupo ya no aparecen en el chat de los demás.',
        '[fix] El cliente ya no se queda cargando en azul sin mostrar los estilos al abrirlo.',
        '[fix] El cliente ya no se queda pegado durante una partida.',
      ],
    },
    {
      version: '2.1.0',
      date: '2026-10-01',
      title: 'Rendimiento, Interfaz y Novedades',
      changes: [
        // ... (dejá acá la lista de la 2.1.0 tal cual la tenés)
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
} catch (err) { console.error("[app2] updates.js:", err); }

// ======================================================================
// Música del lobby y reproductor flotante en el juego  (antes: music.js)
// ======================================================================
try {
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#app-root');
    const mk = (p) => ({
      title: $(`#${p}-title`), sub: $(`#${p}-sub`), cur: $(`#${p}-cur`), dur: $(`#${p}-dur`), seek: $(`#${p}-seek`),
      vol: $(`#${p}-vol`), play: $(`#${p}-play`), prev: $(`#${p}-prev`), next: $(`#${p}-next`),
      shuf: $(`#${p}-shuffle`), loop: $(`#${p}-loop`), cover: $(`#${p}-cover`),
    });
    const lobby = mk('mu');
    const mini = mk('mm');
    const bar = mk('mb');
    const el = { card: $('#mu-player'), count: $('#mu-count'), add: $('#mu-add'), addFolder: $('#mu-add-folder'),
      file: $('#mu-file'), folder: $('#mu-folder'), list: $('#mu-list'), filter: $('#mu-filter'),
      auto: $('#mu-autoplay'), ingame: $('#mu-ingame'),
      panel: $('#mu-mini'), btn: $('#mu-mini-btn'), close: $('#mm-close'), mlist: $('#mm-list'),
      bar: $('#mb-bar'), barClose: $('#mb-close') };
    if (!root || !el.card || !el.list) return;
    // La versión flotante es opcional: si falta en el HTML, se ignora.
    const views = [lobby, mini.play ? mini : null, bar.play ? bar : null].filter(Boolean);

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
    const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
    const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
    const paint = (input) => { if (input) input.style.setProperty('--p', `${(input.value / input.max) * 100}%`); };

    // ---------------- almacenamiento (IndexedDB) ----------------
    let dbp = null;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('vivet-music', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction('tracks', mode);
        const out = fn(t.objectStore('tracks'));
        t.oncomplete = () => res(out && out.result);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    };
    const dbAll = () => tx('readonly', (s) => s.getAll());
    const dbPut = (rec) => tx('readwrite', (s) => s.add(rec));
    const dbDel = (id) => tx('readwrite', (s) => s.delete(id));

    // ---------------- estado ----------------
    const audio = new Audio();
    audio.preload = 'auto';
    let tracks = [];            // { id, name, blob } - sin límite de cantidad
    let idx = -1;
    let url = '';
    let shuffle = !!rd('vivet_music_shuffle', false);
    let loop = rd('vivet_music_loop', true) !== false;
    let inGameMusic = !!rd('vivet_music_ingame', false);   // seguir sonando dentro del juego (opcional)
    let resumeAfterGame = false;
    audio.volume = Math.min(1, Math.max(0, Number(rd('vivet_music_vol', 0.4))));

    const cleanName = (n) => n.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || 'Canción';
    const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
    const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

    // ---------------- título / artista / portada (ID3 de los mp3; si no, "Artista - Título" del nombre) ----------------
    let coverUrl = '';
    let metaTok = 0;
    let started = false;          // ya se reprodujo algo en esta sesión (el mini del lobby recién aparece ahí)
    let barDismissed = false;
    function setCover(blob) {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
      coverUrl = blob ? URL.createObjectURL(blob) : '';
    }
    const decodeText = (b, enc) => {
      if (!b || !b.length) return '';
      let label = 'iso-8859-1', bytes = b;
      if (enc === 1) {
        if (b[0] === 0xFE && b[1] === 0xFF) { label = 'utf-16be'; bytes = b.subarray(2); }
        else if (b[0] === 0xFF && b[1] === 0xFE) { label = 'utf-16le'; bytes = b.subarray(2); }
        else label = 'utf-16le';
      } else if (enc === 2) label = 'utf-16be';
      else if (enc === 3) label = 'utf-8';
      try { return new TextDecoder(label).decode(bytes).split('\0')[0].trim(); } catch (_) { return ''; }
    };
    function readApic(body) {
      const enc = body[0]; let i = 1;
      while (i < body.length && body[i] !== 0) i++;
      const mime = String.fromCharCode(...body.subarray(1, i)); i += 2;   // mime + 0, tipo de imagen
      if (enc === 1 || enc === 2) { while (i + 1 < body.length && !(body[i] === 0 && body[i + 1] === 0)) i += 2; i += 2; }
      else { while (i < body.length && body[i] !== 0) i++; i++; }
      const data = body.subarray(i);
      if (data.length < 200) return null;
      const type = data[0] === 0x89 ? 'image/png' : (/^image\/(png|jpe?g|webp|gif)$/i.test(mime) ? mime : 'image/jpeg');
      return new Blob([data], { type });
    }
    async function readMeta(track) {
      if (track.meta) return track.meta;
      const base = cleanName(track.name);
      let title = base, artist = '', cover = null;
      const g = base.match(/^(.{1,60}?)\s+[-–—]\s+(.+)$/);
      if (g) { artist = g[1].trim(); title = g[2].trim(); }
      try {
        const head = new Uint8Array(await track.blob.slice(0, 10).arrayBuffer());
        if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33 && (head[3] === 3 || head[3] === 4)) {
          const ver = head[3];
          const sync = (a, o) => ((a[o] & 127) << 21) | ((a[o + 1] & 127) << 14) | ((a[o + 2] & 127) << 7) | (a[o + 3] & 127);
          const size = sync(head, 6);
          const buf = new Uint8Array(await track.blob.slice(10, 10 + Math.min(size, 8 * 1024 * 1024)).arrayBuffer());
          const dv = new DataView(buf.buffer);
          let p = 0;
          if (head[5] & 0x40) p = ver === 4 ? sync(buf, 0) : dv.getUint32(0) + 4;   // cabecera extendida
          while (p + 10 <= buf.length) {
            const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
            if (!/^[A-Z0-9]{4}$/.test(id)) break;
            const fs = ver === 4 ? sync(buf, p + 4) : dv.getUint32(p + 4);
            if (fs <= 0 || p + 10 + fs > buf.length) break;
            const body = buf.subarray(p + 10, p + 10 + fs);
            p += 10 + fs;
            if (id === 'TIT2') title = decodeText(body.subarray(1), body[0]) || title;
            else if (id === 'TPE1') artist = decodeText(body.subarray(1), body[0]) || artist;
            else if (id === 'APIC' && !cover) cover = readApic(body);
          }
        }
      } catch (_) {}
      track.meta = { title: title.slice(0, 80), artist: artist.slice(0, 60), cover };
      return track.meta;
    }

    // "mu-tab" = estás en la pestaña Música (ahí no hace falta el mini del lobby). Se marca con JS
    // y no con :has() en el CSS, que recalcula estilos de todo el .app en cada cambio del DOM.
    const musicPanel = $('#panel-musica');
    const syncMusicTab = () => document.documentElement.classList.toggle('mu-tab', !!musicPanel && musicPanel.classList.contains('active'));
    if (musicPanel) { new MutationObserver(syncMusicTab).observe(musicPanel, { attributes: true, attributeFilter: ['class'] }); syncMusicTab(); }

    function updateBar() {
      if (!el.bar) return;
      const show = tracks.length > 0 && started && !barDismissed;
      el.bar.hidden = !show;
      document.documentElement.classList.toggle('mu-bar-on', show);
    }

    function rows(filterText, withDel) {
      const q = (filterText || '').trim().toLowerCase();
      const html = tracks.map((t, i) => ({ t, i }))
        .filter(({ t }) => !q || cleanName(t.name).toLowerCase().includes(q))
        .map(({ t, i }) => `
        <div class="mu-row ${i === idx ? 'cur' : ''}" data-i="${i}">
          <span class="mu-n">${i === idx && !audio.paused ? '♪' : i + 1}</span>
          <span class="mu-name">${esc(cleanName(t.name))}</span>
          ${withDel ? `<button class="mu-del" type="button" data-del="${t.id}" title="Quitar">✕</button>` : ''}
        </div>`).join('');
      if (html) return html;
      return `<p class="hint" style="margin:6px 0;">${tracks.length ? 'Ninguna canción coincide.' : 'Todavía no agregaste canciones.'}</p>`;
    }

    function render() {
      el.count.textContent = `${tracks.length} ${tracks.length === 1 ? 'canción' : 'canciones'}`;
      el.list.innerHTML = rows(el.filter && el.filter.value, true);
      if (el.mlist) {
        el.mlist.innerHTML = rows('', false);
        if (el.panel && !el.panel.hidden) { const c = el.mlist.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' }); }
      }
      const t = tracks[idx];
      for (const v of views) {
        const m = t && t.meta;
        v.title.textContent = t ? (m ? m.title : cleanName(t.name)) : 'Sin canciones';
        v.sub.textContent = t ? (m && m.artist ? m.artist : `Canción ${idx + 1} de ${tracks.length}`) : 'Agregá tus temas para empezar';
        if (v.cover) {
          v.cover.style.backgroundImage = coverUrl ? `url("${coverUrl}")` : '';
          v.cover.classList.toggle('has-img', !!coverUrl);
        }
        v.play.innerHTML = audio.paused ? PLAY_SVG : PAUSE_SVG;
        v.shuf.classList.toggle('on', shuffle);
        v.loop.classList.toggle('on', loop);
      }
      el.card.classList.toggle('playing', !audio.paused);
      if (el.panel) el.panel.classList.toggle('playing', !audio.paused);
      if (el.btn) el.btn.classList.toggle('on', !audio.paused);
      updateBar();
    }

    function select(i, autoplay) {
      if (!tracks.length) { idx = -1; audio.removeAttribute('src'); setCover(null); render(); return; }
      idx = ((i % tracks.length) + tracks.length) % tracks.length;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(tracks[idx].blob);
      audio.src = url;
      wr('vivet_music_last', tracks[idx].id);
      if (autoplay) audio.play().catch(() => {});
      const tr = tracks[idx]; const tok = ++metaTok;
      setCover(null);
      readMeta(tr).then((m) => { if (tok !== metaTok) return; setCover(m.cover); render(); });
      render();
    }

    function step(dir) {
      if (!tracks.length) return;
      if (shuffle && tracks.length > 1) {
        let n; do { n = Math.floor(Math.random() * tracks.length); } while (n === idx);
        return select(n, true);
      }
      select(idx + dir, true);
    }

    // ---------------- controles (lobby y reproductor flotante comparten todo) ----------------
    const togglePlay = () => {
      if (!tracks.length) return el.file.click();
      if (idx < 0) select(0, true);
      else if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    };
    for (const v of views) {
      v.play.addEventListener('click', togglePlay);
      v.prev.addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); });
      v.next.addEventListener('click', () => step(1));
      v.shuf.addEventListener('click', () => { shuffle = !shuffle; wr('vivet_music_shuffle', shuffle); render(); });
      v.loop.addEventListener('click', () => { loop = !loop; wr('vivet_music_loop', loop); render(); });
      v.vol.addEventListener('input', () => {
        audio.volume = v.vol.value / 100; wr('vivet_music_vol', audio.volume);
        views.forEach((o) => { o.vol.value = v.vol.value; paint(o.vol); });
      });
      v.seek.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (v.seek.value / 1000) * audio.duration;
        paint(v.seek);
      });
    }
    audio.addEventListener('timeupdate', () => {
      for (const v of views) {
        if (document.activeElement !== v.seek && audio.duration) v.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
        paint(v.seek);
        v.cur.textContent = fmt(audio.currentTime);
      }
    });
    audio.addEventListener('loadedmetadata', () => { for (const v of views) v.dur.textContent = fmt(audio.duration); });
    audio.addEventListener('play', () => { started = true; barDismissed = false; render(); });
    audio.addEventListener('pause', render);
    audio.addEventListener('ended', () => {
      if (!loop && idx === tracks.length - 1 && !shuffle) { audio.pause(); return; }
      step(1);
    });
    audio.addEventListener('error', () => { if (tracks.length > 1) step(1); });

    // ---------------- lista: agregar (archivos o carpeta), sin límite ----------------
    const isAudio = (f) => /^audio\//.test(f.type) || /\.(mp3|ogg|wav|m4a|flac|aac|opus|wma)$/i.test(f.name);
    async function addFiles(fileList, sortByName) {
      let files = Array.from(fileList || []);
      if (!files.length) return;
      const audioFiles = files.filter(isAudio);
      if (files.length - audioFiles.length > 0 && !sortByName) toast(`${files.length - audioFiles.length} archivo(s) no son audio y se omitieron`);
      files = audioFiles.filter((f) => !tracks.some((t) => t.name === f.name && t.blob.size === f.size));
      if (sortByName) files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      let added = 0, failed = 0;
      for (const f of files) {
        try {
          const id = await dbPut({ name: f.name, blob: f });
          tracks.push({ id, name: f.name, blob: f });
          added++;
          if (added % 25 === 0) render();
        } catch (_) { failed++; }
      }
      if (failed) toast(`No se pudieron guardar ${failed} canción(es). Revisá el espacio en disco.`);
      else if (added) toast(added === 1 ? 'Canción agregada' : `${added} canciones agregadas`, 'ok');
      else if (audioFiles.length) toast('Esas canciones ya estaban en tu lista');
      else toast('No se encontraron archivos de audio');
      if (idx < 0 && tracks.length) select(0, true); else render();
    }
    el.add.addEventListener('click', () => el.file.click());
    el.addFolder?.addEventListener('click', () => el.folder && el.folder.click());
    el.file.addEventListener('change', async () => { const f = el.file.files; const list = Array.from(f || []); el.file.value = ''; await addFiles(list, false); });
    el.folder?.addEventListener('change', async () => { const f = el.folder.files; const list = Array.from(f || []); el.folder.value = ''; await addFiles(list, true); });
    el.filter?.addEventListener('input', render);

    const onListClick = async (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        const id = Number(del.dataset.del);
        const curTrack = tracks[idx];
        const wasCur = !!curTrack && curTrack.id === id;
        try { await dbDel(id); } catch (_) {}
        tracks = tracks.filter((t) => t.id !== id);
        if (wasCur) { audio.pause(); select(Math.min(idx, tracks.length - 1), false); }
        else { idx = tracks.indexOf(curTrack); render(); }
        return;
      }
      const row = e.target.closest('.mu-row');
      if (!row) return;
      const i = Number(row.dataset.i);
      if (i === idx) togglePlay(); else select(i, true);
    };
    el.list.addEventListener('click', onListClick);
    el.mlist?.addEventListener('click', onListClick);

    el.auto.checked = !!rd('vivet_music_auto', false);
    el.auto.addEventListener('change', () => wr('vivet_music_auto', el.auto.checked));

    // ---------------- reproductor flotante dentro del juego ----------------
    const setMiniOpen = (open) => {
      if (!el.panel) return;
      el.panel.hidden = !open;
      if (el.btn) el.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) render();
    };
    el.btn?.addEventListener('click', () => setMiniOpen(el.panel.hidden));
    el.close?.addEventListener('click', () => setMiniOpen(false));
    // La X del mini del lobby corta la música y lo esconde hasta que vuelvas a dar play.
    el.barClose?.addEventListener('click', () => { barDismissed = true; audio.pause(); updateBar(); });

    // ---------------- al jugar: pausar, o seguir sonando si el usuario lo activó ----------------
    const isPlayingGame = () => root.classList.contains('playing') || root.classList.contains('replay-mode') || root.classList.contains('creating');
    const applyInGame = () => document.documentElement.classList.toggle('mu-ingame', inGameMusic);
    if (el.ingame) {
      el.ingame.checked = inGameMusic;
      el.ingame.addEventListener('change', () => {
        inGameMusic = el.ingame.checked;
        wr('vivet_music_ingame', inGameMusic);
        applyInGame();
        if (!isPlayingGame()) return;
        if (inGameMusic) { if (resumeAfterGame) { resumeAfterGame = false; audio.play().catch(() => {}); } }
        else { resumeAfterGame = !audio.paused; audio.pause(); setMiniOpen(false); }
      });
    }
    applyInGame();
    let wasGame = isPlayingGame();
    new MutationObserver(() => {
      const g = isPlayingGame();
      if (g === wasGame) return;
      wasGame = g;
      if (g) {
        if (!inGameMusic) { resumeAfterGame = !audio.paused; audio.pause(); }
      } else {
        setMiniOpen(false);
        if (resumeAfterGame) { resumeAfterGame = false; audio.play().catch(() => {}); }
      }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // ---------------- arranque ----------------
    for (const v of views) { v.vol.value = Math.round(audio.volume * 100); paint(v.vol); paint(v.seek); }
    (async () => {
      try { tracks = await dbAll(); } catch (_) { tracks = []; }
      const last = rd('vivet_music_last', null);
      const start = Math.max(0, tracks.findIndex((t) => t.id === last));
      if (tracks.length) select(start, false); else render();
      if (tracks.length && el.auto.checked && !isPlayingGame()) audio.play().catch(() => {});
    })();
  })();
} catch (err) { console.error("[app2] music.js:", err); }

// ======================================================================
// Jugadores Vivet en la sala  (antes: roommates.js)
// ======================================================================
try {
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
} catch (err) { console.error("[app2] roommates.js:", err); }

// ======================================================================
// Aviso de actualización (cuadro abajo a la derecha; la lógica está en main.js, sección E)
// ======================================================================
try {
  (() => {
    const api = window.vivet && window.vivet.update;
    if (!api) return;
    const css = document.createElement('style');
    css.textContent = `
    #upd-box{position:fixed;right:18px;bottom:18px;width:310px;z-index:3000;box-sizing:border-box;padding:14px 14px 12px;border-radius:14px;
      background:var(--bg-elev,#10141b);color:var(--text,#eef5fb);border:1px solid var(--accent-border,rgba(23,224,232,.35));
      box-shadow:0 12px 34px rgba(0,0,0,.45);font:13px/1.4 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .22s,transform .22s}
    #upd-box.show{opacity:1;transform:none;pointer-events:auto}
    #upd-box .ub-top{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    #upd-box .ub-dot{width:8px;height:8px;border-radius:50%;background:var(--accent,#17e0e8);box-shadow:0 0 8px var(--accent,#17e0e8)}
    #upd-box .ub-title{font-weight:700;flex:1}
    #upd-box .ub-x{background:none;border:0;color:inherit;opacity:.5;cursor:pointer;font-size:15px;padding:0 2px}
    #upd-box .ub-x:hover{opacity:1}
    #upd-box .ub-sub{opacity:.75;font-size:12.5px}
    #upd-box .ub-notes{opacity:.6;font-size:11.5px;margin-top:6px;max-height:48px;overflow:hidden;white-space:pre-line}
    #upd-box .ub-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:10px;overflow:hidden}
    #upd-box .ub-bar i{display:block;height:100%;width:0;background:var(--accent,#17e0e8);transition:width .2s}
    #upd-box .ub-acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
    #upd-box .ub-acts button{font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:9px;cursor:pointer;color:inherit;background:transparent;border:1px solid var(--border,rgba(255,255,255,.14))}
    #upd-box .ub-acts button.p{background:var(--accent,#17e0e8);color:#021016;border-color:transparent}
    #upd-box .ub-acts button.l{border:0;opacity:.55;font-weight:500;margin-right:auto;padding-left:0}
    #upd-box .ub-acts button:hover{filter:brightness(1.12)}`;
    document.head.appendChild(css);
    const box = document.createElement('div');
    box.id = 'upd-box';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);

    let dismissed = ''; // "Más tarde" oculta el aviso de esa versión hasta el próximo chequeo o reinicio
    let cur = {};
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mbs = (n) => (n / 1048576).toFixed(1) + ' MB/s';

    function render(s) {
      cur = s;
      if (!s.visible || s.status === 'idle' || s.status === 'checking' || (s.status === 'available' && dismissed === s.version)) { box.classList.remove('show'); return; }
      let title = '', body = '', acts = '', extra = '';
      if (s.status === 'available') {
        title = 'Nueva actualización';
        body = '<b>Vivet Client v' + esc(s.version) + '</b> ya está disponible.<div class="ub-sub">Tenés la v' + esc(s.current) + '.</div>';
        if (s.notes) extra = '<div class="ub-notes">' + esc(s.notes) + '</div>';
        acts = '<button class="l" data-a="skip">Omitir</button><button data-a="later">Más tarde</button><button class="p" data-a="download">Descargar</button>';
      } else if (s.status === 'downloading') {
        title = 'Descargando v' + esc(s.version);
        body = s.percent + '%' + (s.speed ? ' · ' + mbs(s.speed) : '');
        extra = '<div class="ub-bar"><i style="width:' + s.percent + '%"></i></div>';
      } else if (s.status === 'downloaded') {
        title = 'Lista para instalar';
        body = 'v' + esc(s.version) + ' descargada.<div class="ub-sub">Se instala al reiniciar o al cerrar el cliente.</div>';
        acts = '<button data-a="later">Después</button><button class="p" data-a="install">Reiniciar e instalar</button>';
      } else if (s.status === 'none') {
        title = 'Todo al día'; body = 'Ya tenés la última versión (v' + esc(s.current) + ').';
      } else if (s.status === 'error') {
        title = 'No se pudo actualizar'; body = esc(s.message);
        acts = '<button data-a="later">Cerrar</button><button class="p" data-a="check">Reintentar</button>';
      }
      box.innerHTML = '<div class="ub-top"><span class="ub-dot"></span><span class="ub-title">' + title + '</span><button class="ub-x" data-a="later" title="Cerrar">✕</button></div>' +
        '<div>' + body + '</div>' + extra + (acts ? '<div class="ub-acts">' + acts + '</div>' : '');
      box.classList.add('show');
    }

    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'download') api.download();
      else if (a === 'install') api.install();
      else if (a === 'skip') api.skip();
      else if (a === 'check') window.vivet.checkForUpdates();
      else if (a === 'later') { if (cur.status === 'available') dismissed = cur.version; box.classList.remove('show'); api.later(); }
    });
    api.onState(render);
    api.getState().then(render).catch(() => {});
  })();
} catch (err) { console.error("[app2] aviso de actualización:", err); }

// ======================================================================
// Primer inicio: elegir nickname (se muestra solo en instalaciones nuevas)
// ======================================================================
try {
  (() => {
    let shown = false;
    function ask(suggested) {
      if (shown) return; shown = true;
      const css = document.createElement('style');
      css.textContent = `
      #fr-nick{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(3,6,10,.72);backdrop-filter:blur(4px)}
      #fr-nick .fn-card{width:360px;max-width:92vw;box-sizing:border-box;padding:22px;border-radius:16px;background:var(--bg-elev,#10141b);color:var(--text,#eef5fb);
        border:1px solid var(--accent-border,rgba(23,224,232,.35));box-shadow:0 18px 50px rgba(0,0,0,.55);font:13px/1.45 Inter,system-ui,sans-serif}
      #fr-nick h2{margin:0 0 4px;font-size:18px}
      #fr-nick p{margin:0 0 14px;opacity:.75}
      #fr-nick input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;font:inherit;font-size:14px;color:inherit;background:var(--bg-elev-2,#0b0e14);border:1px solid var(--border,rgba(255,255,255,.14));outline:none}
      #fr-nick input:focus{border-color:var(--accent,#17e0e8)}
      #fr-nick .fn-err{color:#ff7b7b;font-size:12px;min-height:16px;margin-top:6px}
      #fr-nick button{width:100%;margin-top:6px;padding:10px;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;background:var(--accent,#17e0e8);color:#021016}
      #fr-nick button:hover{filter:brightness(1.1)}`;
      document.head.appendChild(css);
      const el = document.createElement('div');
      el.id = 'fr-nick';
      el.innerHTML = '<div class="fn-card"><h2>¡Bienvenido a Vivet!</h2><p>Elegí tu nickname. Es el nombre con el que vas a entrar a las salas y el que ven tus amigos. Lo podés cambiar después en Social.</p>' +
        '<input id="fn-input" type="text" maxlength="25" autocomplete="off" spellcheck="false" /><div class="fn-err" id="fn-err"></div><button id="fn-ok" type="button">Empezar</button></div>';
      document.body.appendChild(el);
      const input = el.querySelector('#fn-input'), err = el.querySelector('#fn-err');
      input.value = suggested || '';
      setTimeout(() => { input.focus(); input.select(); }, 60);
      const done = async () => {
        const val = input.value.trim();
        if (!val) { err.textContent = 'Escribí un nickname para continuar'; return; }
        try { await applyNickname(val, { announce: false }); } catch (_) {}
        el.remove(); css.remove();
        try { showToast('¡Listo, ' + val + '!', 'ok'); } catch (_) {}
      };
      el.querySelector('#fn-ok').addEventListener('click', done);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    }
    if (window.__vivetFirstRun) ask(typeof currentNickname !== 'undefined' ? currentNickname : '');
    window.addEventListener('vivet-first-run', (e) => ask(e.detail));
  })();
} catch (err) { console.error("[app2] primer inicio:", err); }

// ======================================================================
// Tienda (Vcoins, marcos, efectos, textos y mascotas)  -  el servidor es shop.js
// ======================================================================
try {
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#shop-root');
    if (!root) return;
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (m, p, b) => api().request(m, p, b);
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const en = () => !!(window.vivetLang && window.vivetLang() === 'en');
    const ID_RE = /^[a-z0-9_]{1,32}$/;
    // La tienda se traduce acá adentro (con T), no con el diccionario global de app.js.
    root.setAttribute('data-i18n-skip', '');

    // ------------------------------------------------------------ traducciones (ES -> EN)
    // Todo lo que dibuja la tienda pasa por T(). Los textos del catálogo y de los logros vienen del
    // servidor en español: se traducen por id (ITEM_EN / ACH_EN). Los errores del servidor, por EN / PAT.
    const EN = {
      // paneles y pestañas
      'Tienda': 'Shop',
      'Ganás Vcoins jugando en salas, con logros, códigos y eventos. Gastalas en marcos, efectos, mascotas, consumibles, mejoras y tu propio clan.':
        'Earn Vcoins by playing in rooms, with achievements, codes and events. Spend them on frames, effects, pets, consumables, upgrades and your own clan.',
      'La tienda no está configurada en este cliente.': 'The shop is not configured in this client.',
      'Conectá tu Discord en Social para usar la Tienda y ganar Vcoins.': 'Connect your Discord in Social to use the Shop and earn Vcoins.',
      'Ofertas': 'Deals', 'Marcos': 'Frames', 'Efectos': 'Effects', 'Textos': 'Titles', 'Mascotas': 'Pets',
      'Consumibles': 'Consumables', 'Mejoras': 'Upgrades', 'Especiales': 'Specials', 'Logros': 'Achievements',
      // cabecera
      'Tu nombre': 'Your name', 'Vcoins': 'Vcoins', 'Código promocional': 'Promo code', 'Canjear': 'Redeem',
      'Escribí un código primero': 'Enter a code first',
      '+{n} Vcoins': '+{n} Vcoins',
      '¡Bienvenido! Ganaste {n} Vcoins': 'Welcome! You earned {n} Vcoins',
      'Escudo activo: {t}': 'Shield active: {t}',
      'XP x{m} activo: {t}': 'XP x{m} active: {t}',
      'Tu XP: x{m}': 'Your XP: x{m}',
      'Jugando en una sala ganás 1 Vcoin cada {m} min (máx. {c} por día). También podés canjear códigos promocionales, completar logros y ganar premios en eventos.':
        'Playing in a room you earn 1 Vcoin every {m} min (max. {c} per day). You can also redeem promo codes, complete achievements and win prizes in events.',
      'No hay objetos en esta categoría todavía.': 'There are no items in this category yet.',
      // tarjetas
      'Te faltan Vcoins': 'Not enough Vcoins', 'Comprar': 'Buy', 'Mejorar': 'Upgrade', 'Máximo': 'Maxed',
      'Puesto': 'Equipped', 'Quitar': 'Remove', 'Tuyo': 'Owned', 'Ponerme': 'Equip',
      '🔒 Se desbloquea con rango {r}': '🔒 Unlocked with {r} rank',
      'Hoy': 'Today', 'Semana': 'Week',
      '¡Comprado! Ya podés ponértelo': 'Purchased! You can equip it now',
      '¡Listo! Consumible activado': 'Done! Consumable activated',
      '¡Mejora comprada!': 'Upgrade purchased!',
      'No se pudo completar la acción': 'Could not complete the action',
      'Sin comprar': 'Not purchased',
      'Tenés +{n} espacios para mapas': 'You have +{n} map slots',
      'Tenés +{n} salas ancladas': 'You have +{n} pinned rooms',
      'Banner HD activo': 'HD banner active',
      'Nivel {a}/{b}': 'Level {a}/{b}',
      // mascotas
      'Cómo funcionan las mascotas': 'How pets work',
      'Con una mascota <b>puesta</b> ganás <b>más XP competitivo</b> mientras jugás en una sala (el bonus de cada una está en su tarjeta).':
        'With a pet <b>equipped</b> you earn <b>more competitive XP</b> while playing in a room (each pet\'s bonus is on its card).',
      'Solo una puesta a la vez. Si no la tenés puesta, no da bonus ni gana nivel.':
        'Only one equipped at a time. If it is not equipped, it gives no bonus and gains no levels.',
      'Suben de nivel con tus horas jugadas <b>con ella puesta</b> (2 h, 6 h, 15 h, 30 h y 60 h). Cada nivel suma +20% al bonus base, hasta duplicarlo en el nivel 6.':
        'They level up with the hours you play <b>with them equipped</b> (2 h, 6 h, 15 h, 30 h and 60 h). Each level adds +20% to the base bonus, up to doubling it at level 6.',
      'Se suma al boost "XP x2" si lo tenés activo. Las Vcoins por jugar no cambian: solo se multiplica el XP.':
        'It stacks with the "XP x2" boost if you have it active. Vcoins earned by playing do not change: only XP is multiplied.',
      'Tu multiplicador de XP actual: <b>x{m}</b>.': 'Your current XP multiplier: <b>x{m}</b>.',
      '+{n}% XP': '+{n}% XP',
      'Sube hasta +{n}% (nivel {l}) jugando con ella puesta.': 'Rises to +{n}% (level {l}) by playing with it equipped.',
      'Nivel {a}/{b} · +{n}% XP': 'Level {a}/{b} · +{n}% XP',
      '{a} / {b} para el nivel {l}': '{a} / {b} to level {l}',
      'Nivel máximo · {a} jugadas': 'Max level · {a} played',
      // consumibles / mejoras
      '<b>Escudo:</b> congela el decaimiento de XP por inactividad. Los días se acumulan (máx. 30). <b>Boost:</b> duplica tu XP y se suma al bonus de tu mascota (máx. 24 h acumuladas).':
        '<b>Shield:</b> freezes XP decay from inactivity. Days stack (max. 30). <b>Boost:</b> doubles your XP and stacks with your pet bonus (max. 24 h stacked).',
      'Mejoras permanentes: se compran una vez (o por niveles) y quedan en tu cuenta para siempre.':
        'Permanent upgrades: bought once (or by levels) and kept on your account forever.',
      // ofertas
      'Oferta de la semana': 'Deal of the week', 'Ofertas del día': "Today's deals",
      'termina en {t}': 'ends in {t}', 'No hay ofertas por ahora.': 'No deals right now.',
      'Cambian solas: 3 objetos con -25% cada día y 1 con -40% cada semana.': 'They rotate automatically: 3 items at -25% every day and 1 at -40% every week.',
      // código de amigo
      'Tu código actual: <b>{c}</b>': 'Your current code: <b>{c}</b>',
      'Cambiar': 'Change', 'Escribí el código que querés': 'Enter the code you want',
      'Código cambiado a {c}': 'Code changed to {c}',
      // clan
      'Clan': 'Clan', 'Creá tu clan: comprás el tag una vez y lo usan tus amigos gratis. Cada persona puede estar en un clan.':
        'Create your clan: buy the tag once and your friends use it for free. Each person can be in one clan.',
      'Tag (3-4 letras)': 'Tag (3-4 letters)', 'Crear clan': 'Create clan',
      'Escribí el tag del clan': 'Enter the clan tag',
      'Invitaciones recibidas': 'Invitations received', '{u} te invitó a [{t}]': '{u} invited you to [{t}]',
      'Aceptar': 'Accept', 'Rechazar': 'Decline',
      'Tu clan': 'Your clan', 'Miembros ({a}/{b})': 'Members ({a}/{b})', 'Dueño': 'Owner',
      'Sacar': 'Kick', 'Invitaciones pendientes': 'Pending invitations',
      'Invitar a un amigo': 'Invite a friend', 'Elegí un amigo…': 'Pick a friend…', 'Invitar': 'Invite',
      'Elegí un amigo primero': 'Pick a friend first', 'Invitación enviada': 'Invitation sent',
      'Salir del clan': 'Leave clan', 'Disolver clan': 'Disband clan',
      '¿Disolver el clan? El tag queda libre y no hay reembolso.': 'Disband the clan? The tag is freed and there is no refund.',
      '¿Salir del clan?': 'Leave the clan?', '¿Sacar a este miembro?': 'Kick this member?',
      'Ya no tenés amigos para invitar.': 'You have no more friends to invite.',
      '¡Clan creado!': 'Clan created!', 'Te uniste al clan': 'You joined the clan',
      // logros
      'Reclamar': 'Claim', 'Reclamado': 'Claimed', '+{n} V': '+{n} V',
      '¡Logro reclamado! +{n} Vcoins': 'Achievement claimed! +{n} Vcoins',
      'Cargando…': 'Loading…',
      // errores del servidor (shop.js / server.js)
      'No te alcanzan las Vcoins.': 'You do not have enough Vcoins.',
      'Ese objeto no existe.': 'That item does not exist.',
      'Este objeto se compra desde su propia sección.': 'This item is bought from its own section.',
      'Este objeto no está a la venta.': 'This item is not for sale.',
      'Ya tenés este objeto.': 'You already own this item.',
      'Ya tenés el máximo de esta mejora.': 'You already have the maximum of this upgrade.',
      'Objeto inválido.': 'Invalid item.', 'Categoría inválida.': 'Invalid category.',
      'Todavía no tenés este objeto.': 'You do not own this item yet.',
      'El código debe tener de 3 a 8 letras o números.': 'The code must be 3 to 8 letters or numbers.',
      'Ese código está reservado.': 'That code is reserved.', 'Ya tenés ese código.': 'You already have that code.',
      'Ese código ya está en uso.': 'That code is already in use.',
      'Ese logro no existe.': 'That achievement does not exist.',
      'Todavía no cumpliste este logro.': 'You have not completed this achievement yet.',
      'Ya reclamaste este logro.': 'You already claimed this achievement.',
      'El tag debe tener 3 o 4 letras o números.': 'The tag must be 3 or 4 letters or numbers.',
      'Ese tag está reservado.': 'That tag is reserved.', 'Ya sos dueño de un clan.': 'You already own a clan.',
      'Ese tag ya está en uso.': 'That tag is already in use.',
      'Solo el dueño del clan puede invitar.': 'Only the clan owner can invite.',
      'id inválido.': 'Invalid id.', 'id inválido': 'Invalid id',
      'Solo podés invitar a tus amigos.': 'You can only invite your friends.',
      'Ya está en tu clan.': 'They are already in your clan.',
      'Tenés demasiadas invitaciones pendientes.': 'You have too many pending invitations.',
      'Esa invitación no existe.': 'That invitation does not exist.',
      'Sos dueño de un clan: disolvelo antes de unirte a otro.': 'You own a clan: disband it before joining another.',
      'Ese clan ya no existe.': 'That clan no longer exists.', 'Ese clan está lleno.': 'That clan is full.',
      'El dueño no puede irse: disolvé el clan.': 'The owner cannot leave: disband the clan.',
      'Solo el dueño puede sacar miembros.': 'Only the owner can kick members.',
      'No sos dueño de ningún clan.': 'You do not own any clan.',
      'Demasiados intentos. Probá de nuevo en un rato.': 'Too many attempts. Try again in a while.',
      'Escribí un código.': 'Enter a code.', 'Ese código no existe.': 'That code does not exist.',
      'Ese código ya venció.': 'That code has expired.', 'Ese código ya se agotó.': 'That code has run out.',
      'Ya canjeaste este código.': 'You already redeemed this code.',
      'Demasiadas solicitudes, esperá un momento.': 'Too many requests, wait a moment.',
      'Error del servidor': 'Server error', 'No autenticado': 'Not signed in', 'Sesión vencida': 'Session expired',
      'No se pudo cargar la tienda': 'Could not load the shop',
    };
    const RANK_NAMES = {
      bronce: ['Bronce', 'Bronze'], plata: ['Plata', 'Silver'], oro: ['Oro', 'Gold'], platino: ['Platino', 'Platinum'],
      diamante: ['Diamante', 'Diamond'], maestro: ['Maestro', 'Master'], leyenda: ['Leyenda', 'Legend'],
    };
    const rankName = (id) => { const r = RANK_NAMES[id]; return r ? r[en() ? 1 : 0] : String(id || ''); };
    const rankByEs = (es) => { const k = Object.keys(RANK_NAMES).find((x) => RANK_NAMES[x][0] === es); return k ? RANK_NAMES[k][1] : es; };
    const PAT = [
      [/^Se desbloquea al llegar a rango (.+)\.$/, (_, r) => 'Unlocked by reaching ' + rankByEs(r) + ' rank.'],
      [/^Tu escudo ya cubre bastante \(máximo (\d+) días acumulados\)\.$/, 'Your shield already covers a lot (max. $1 days stacked).'],
      [/^Ya tenés mucho boost acumulado \(máximo (\d+) horas\)\.$/, 'You already have a lot of boost stacked (max. $1 hours).'],
      [/^Tu clan está lleno \(máximo (\d+)\)\.$/, 'Your clan is full (max. $1).'],
    ];
    const fmt = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '')) : s);
    function T(s, v) {
      s = String(s);
      if (!en()) return fmt(s, v);
      let o = EN[s];
      if (o === undefined) for (const [re, rep] of PAT) if (re.test(s)) { o = s.replace(re, rep); break; }
      return fmt(o === undefined ? s : o, v);
    }
    // Objetos del catálogo: [nombre EN, descripción EN]
    const ITEM_EN = {
      f_gold: ['Golden Frame', 'A golden ring around your photo.'],
      f_ice: ['Ice Frame', 'Icy blue with a cold glow.'],
      f_neon: ['Neon Frame', 'A double neon ring that glows.'],
      f_fire: ['Fire Frame', 'A ring burning red and orange.'],
      f_rainbow: ['Rainbow Frame', 'Changes color nonstop.'],
      f_rank_oro: ['Gold Rank Frame', 'Unlocked by reaching Gold rank.'],
      f_rank_diamante: ['Diamond Rank Frame', 'Unlocked by reaching Diamond rank.'],
      f_rank_leyenda: ['Legend Rank Frame', 'Unlocked by reaching Legend rank.'],
      e_glow: ['Aura', 'Your profile glows with your color.'],
      e_name: ['Gradient Name', 'Your name shifts color in motion.'],
      e_aurora: ['Aurora', 'Lights moving across your banner.'],
      e_sparkle: ['Sparkles', 'Sparks twinkling all over your profile.'],
      t_crack: ['Crack', 'For those who crush it.'],
      t_goleador: ['Top Scorer', 'The one who always scores.'],
      t_mvp: ['MVP', 'The most valuable.'],
      t_leyenda: ['Legend', 'A title for the few.'],
      t_vip: ['VIP', 'Golden and exclusive.'],
      p_ball: ['Ball', "The one that can't be missing."],
      p_cat: ['Kitten', 'Sleeps on your profile.'],
      p_dog: ['Puppy', 'Loyal and cheerful.'],
      p_ghost: ['Ghost', 'Floats by your side.'],
      p_dragon: ['Dragon', 'The rarest in the shop.'],
      c_shield3: ['Shield 3 days', 'Freezes your XP decay for 3 days.'],
      c_shield7: ['Shield 7 days', 'Freezes your XP decay for 7 days.'],
      c_shield14: ['Shield 14 days', 'Freezes your XP decay for 14 days.'],
      c_boost1: ['XP x2 (1 hour)', 'Doubles your XP for 1 hour. Stacks with your pet bonus.'],
      c_boost3: ['XP x2 (3 hours)', 'Doubles your XP for 3 hours. Stacks with your pet bonus.'],
      u_maps: ['More maps', '+10 slots for uploading maps (up to 3 times).'],
      u_banner: ['HD Banner', 'Allows a heavier profile banner.'],
      u_pins: ['More pinned rooms', '+3 pinned rooms (up to 2 times).'],
      x_friendcode: ['Custom friend code', 'Change VV-ABC123 to whatever you want (e.g. VV-BETA). It is unique.'],
      x_clan: ['Clan tag', 'Create a 3-4 letter clan and invite your friends to use it.'],
    };
    const TITLE_EN = { GOLEADOR: 'TOP SCORER', LEYENDA: 'LEGEND' };
    const ACH_EN = {
      nick: ['With a name of your own', 'Set your Haxball nick on your profile.'],
      avatar: ['Visible face', 'Upload your profile picture.'],
      friend1: ['First friend', 'Add your first friend.'],
      friend5: ['Sociable', 'Reach 5 friends.'],
      play1: ['Warming up', 'Play 1 hour in total.'],
      play10: ['Regular', 'Play 10 hours in total.'],
      play50: ['Veteran', 'Play 50 hours in total.'],
      map1: ['Map maker', 'Upload your first map.'],
      map5: ['Architect', 'Upload 5 maps.'],
      buy1: ['First purchase', 'Buy your first item in the shop.'],
    };
    const itemName = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][0] : i.name);
    const itemDesc = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][1] : i.desc);
    const titleText = (c) => { const x = c.text || c.name; return en() ? (TITLE_EN[x] || (ITEM_EN[c.id] && !c.text ? ITEM_EN[c.id][0] : x)) : x; };

    const TABS = [['deals', 'Ofertas'], ['frame', 'Marcos'], ['effect', 'Efectos'], ['title', 'Textos'], ['pet', 'Mascotas'],
      ['consumable', 'Consumibles'], ['perk', 'Mejoras'], ['special', 'Especiales'], ['ach', 'Logros']];
    const EQUIP = ['frame', 'effect', 'title', 'pet'];
    const S = {
      balance: 0, catalog: [], owned: new Set(), equipped: {}, earn: null, deals: null, tab: 'frame', busy: false,
      pets: {}, xpMult: 1, shield: 0, boost: null, perks: {}, extra: {},
      ach: null, clan: null, friends: [], code: '', fc: '', ctag: '', inv: '',
    };
    // Mismos valores que PET_LEVELS / PET_STEP de shop.js (si los cambiás allá, cambialos acá).
    const PET_LEVELS = [0, 7200, 21600, 54000, 108000, 216000], PET_STEP = 0.2;

    // ------------------------------------------------------------ estilos de los objetos (se ven en el perfil y en la vista previa)
    const css = document.createElement('style');
    css.textContent = `
    /* ===== Marcos y auras: anillos con degradado cónico animado (se ven en el perfil y en la tienda) ===== */
    @property --cos-a{syntax:'<angle>';inherits:false;initial-value:0deg}
    @keyframes cos-spin{to{--cos-a:360deg}}
    /* Base común: el anillo es el borde de la foto (degradado en border-box) + anillo exterior + brillo */
    [class*="cos-f_"]{border:4px solid transparent !important;background-origin:border-box !important}
    /* --- Dorado: metal pulido con reflejo que gira --- */
    .cos-f_gold{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fff6c2,#f5c542 14%,#a8780f 28%,#f5c542 42%,#fff6c2 50%,#f5c542 64%,#a8780f 78%,#f5c542 92%,#fff6c2) border-box !important;
      outline:2px solid #f5c54299 !important;outline-offset:3px;animation:cos-spin 7s linear infinite,cos-p-gold 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-gold{from{box-shadow:0 0 10px #f5c54255}to{box-shadow:0 0 26px #f5c542cc,0 0 4px #fff6c2}}
    /* --- Hielo: cristal con aro punteado y brillo frío --- */
    .cos-f_ice{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ffffff,#8fe3ff 20%,#3d8fc4 40%,#d9f7ff 55%,#8fe3ff 75%,#ffffff) border-box !important;
      outline:2px dashed #bff3ffaa !important;outline-offset:4px;animation:cos-spin 11s linear infinite,cos-p-ice 3.2s ease-in-out infinite alternate}
    @keyframes cos-p-ice{from{box-shadow:0 0 8px #8fe3ff55,inset 0 0 6px #8fe3ff44}to{box-shadow:0 0 24px #8fe3ffcc,0 0 2px #fff,inset 0 0 10px #8fe3ff77}}
    /* --- Neón: dos tubos de luz (cian y magenta) girando en sentidos distintos --- */
    .cos-f_neon{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#17e0e8,#17e0e8 20%,#04141a 30%,#ff3df0 50%,#ff3df0 70%,#04141a 80%,#17e0e8) border-box !important;
      outline:2px solid #ff3df0 !important;outline-offset:3px;animation:cos-spin 2.6s linear infinite,cos-p-neon 1.4s ease-in-out infinite alternate}
    @keyframes cos-p-neon{from{box-shadow:0 0 8px #17e0e8aa,0 0 14px #ff3df066}to{box-shadow:0 0 18px #17e0e8,0 0 34px #ff3df0aa}}
    /* --- Fuego: llamas que giran y parpadean --- */
    .cos-f_fire{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#c21500,#ff3b1a 12%,#ffb02b 25%,#ffec7a 33%,#ff7a18 45%,#c21500 58%,#ff3b1a 70%,#ffb02b 82%,#ff7a18 92%,#c21500) border-box !important;
      outline:2px solid #ff7a1888 !important;outline-offset:3px;animation:cos-spin 2.4s linear infinite,cos-p-fire 1.1s steps(6,jump-none) infinite alternate}
    @keyframes cos-p-fire{0%{box-shadow:0 0 10px #ff3b1a99}30%{box-shadow:0 0 22px #ff9b1acc,0 -6px 14px #ffec7a66}60%{box-shadow:0 0 14px #ff3b1abb}100%{box-shadow:0 0 26px #ffb02bcc,0 -8px 16px #ff7a1888}}
    /* --- Arcoíris: espectro completo que gira, con brillo que cambia de color --- */
    .cos-f_rainbow{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ff3b3b,#ffb02b,#f6ff4a,#4cff6a,#2bd6ff,#5b6bff,#ff3df0,#ff3b3b) border-box !important;
      outline:1px solid #ffffffaa !important;outline-offset:3px;animation:cos-spin 3.5s linear infinite,cos-p-rb 5s linear infinite}
    @keyframes cos-p-rb{0%{box-shadow:0 0 16px #ff3b3b}17%{box-shadow:0 0 16px #ffb02b}33%{box-shadow:0 0 16px #4cff6a}50%{box-shadow:0 0 16px #2bd6ff}67%{box-shadow:0 0 16px #5b6bff}83%{box-shadow:0 0 16px #ff3df0}100%{box-shadow:0 0 16px #ff3b3b}}
    /* --- Rango Oro: borde acuñado como una moneda + aro exterior --- */
    .cos-f_rank_oro{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        repeating-conic-gradient(from var(--cos-a),#f5c542 0 9deg,#8a5e08 9deg 18deg) border-box !important;
      outline:none !important;animation:cos-spin 14s linear infinite,cos-p-oro 3s ease-in-out infinite alternate}
    @keyframes cos-p-oro{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #f5c542,0 0 14px 4px #f5c54266}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #ffe27a,0 0 26px 5px #f5c542aa}}
    /* --- Rango Diamante: facetas de cristal con doble aro --- */
    .cos-f_rank_diamante{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#eaffff 0 8%,#5eb5ff 0 17%,#1d6fb8 0 25%,#bfe9ff 0 33%,#5eb5ff 0 42%,#eaffff 0 50%,#1d6fb8 0 58%,#bfe9ff 0 67%,#5eb5ff 0 75%,#eaffff 0 83%,#1d6fb8 0 92%,#bfe9ff 0 100%) border-box !important;
      outline:none !important;animation:cos-spin 10s linear infinite,cos-p-dia 2.4s ease-in-out infinite alternate}
    @keyframes cos-p-dia{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 4px #5eb5ff,0 0 0 7px var(--bg-elev-2),0 0 0 8px #bfe9ff88,0 0 16px 6px #5eb5ff55}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 4px #eaffff,0 0 0 7px var(--bg-elev-2),0 0 0 8px #5eb5ffcc,0 0 28px 8px #5eb5ffaa}}
    /* --- Rango Leyenda: corona de fuego violeta y carmesí, doble aro pulsante --- */
    .cos-f_rank_leyenda{border-width:5px !important;background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ff5470,#ffd45e 16%,#a78bfa 33%,#ff5470 50%,#ffd45e 66%,#a78bfa 83%,#ff5470) border-box !important;
      outline:none !important;animation:cos-spin 3s linear infinite,cos-p-ley 1.6s ease-in-out infinite alternate}
    @keyframes cos-p-ley{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #ff5470,0 0 0 8px var(--bg-elev-2),0 0 0 9px #a78bfa88,0 0 18px 6px #ff547066}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #ffd45e,0 0 0 8px var(--bg-elev-2),0 0 0 9px #ff5470cc,0 0 34px 10px #a78bfaaa}}

    /* ===== Efectos del perfil (van sobre toda la ventana .pf-box) ===== */
    /* --- Aura: respira, con un anillo de luz que recorre el borde y un resplandor que cae desde arriba --- */
    .cos-e_glow{position:relative;animation:cos-aura 3.4s ease-in-out infinite alternate}
    @keyframes cos-aura{from{box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 16px var(--pf-color,var(--accent)),0 0 40px var(--pf-color,var(--accent))}
      to{box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 28px var(--pf-color,var(--accent)),0 0 84px var(--pf-color,var(--accent))}}
    .cos-e_glow::before{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;padding:2px;box-sizing:border-box;
      background:conic-gradient(from var(--cos-a),var(--pf-color,var(--accent)) 0,transparent 22%,transparent 50%,var(--pf-color,var(--accent)) 64%,transparent 86%,var(--pf-color,var(--accent)) 100%);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:cos-spin 6s linear infinite}
    .cos-e_glow::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;mix-blend-mode:screen;
      background:radial-gradient(120% 55% at 50% -8%,var(--pf-color,var(--accent)) 0,transparent 70%);animation:cos-breathe 3.4s ease-in-out infinite alternate}
    @keyframes cos-breathe{from{opacity:.12}to{opacity:.38}}
    /* --- Nombre en degradé: colores en movimiento con halo --- */
    .cos-e_name .pf-name,.cos-e_name .fx-name{background:linear-gradient(90deg,#17e0e8,#a78bfa,#ff5470,#ffc12b,#3ddc84,#17e0e8);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
      filter:drop-shadow(0 0 6px #a78bfa88);animation:cos-name 5s linear infinite}
    @keyframes cos-name{to{background-position:300% 0}}
    /* --- Aurora: cortinas de luz que ondulan sobre el banner --- */
    .cos-e_aurora .pf-banner,.cos-e_aurora .fx-banner{position:relative;overflow:hidden}
    .cos-e_aurora .pf-banner::before,.cos-e_aurora .fx-banner::before{content:"";position:absolute;inset:-30% -10%;pointer-events:none;mix-blend-mode:screen;filter:blur(10px);
      background:radial-gradient(40% 70% at 18% 85%,#17e0e8cc,transparent 70%),radial-gradient(35% 60% at 52% 92%,#a78bfacc,transparent 70%),radial-gradient(40% 70% at 86% 82%,#3ddc84cc,transparent 70%);
      animation:cos-curtain 7s ease-in-out infinite alternate}
    @keyframes cos-curtain{from{transform:translateX(-7%) skewX(-7deg)}to{transform:translateX(7%) skewX(7deg)}}
    .cos-e_aurora .pf-banner::after,.cos-e_aurora .fx-banner::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:.5;
      background:linear-gradient(115deg,transparent 10%,#17e0e866 30%,#a78bfa66 50%,#ff547066 70%,transparent 90%);background-size:250% 100%;animation:cos-aur 6s ease-in-out infinite alternate}
    @keyframes cos-aur{from{background-position:0 0}to{background-position:100% 0}}
    /* --- Destellos: dos capas de estrellas que titilan en fases distintas --- */
    .cos-e_sparkle{position:relative}
    .cos-e_sparkle::before,.cos-e_sparkle::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none}
    .cos-e_sparkle::before{background-image:radial-gradient(2px 2px at 12% 22%,#fff,transparent),radial-gradient(2.5px 2.5px at 78% 14%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 60%,#fff,transparent),radial-gradient(2px 2px at 88% 70%,#fff,transparent),radial-gradient(1.5px 1.5px at 24% 86%,#fff,transparent),radial-gradient(2px 2px at 60% 36%,#fff,transparent),radial-gradient(2.5px 2.5px at 94% 40%,#bff3ff,transparent);animation:cos-tw 2.2s ease-in-out infinite alternate}
    .cos-e_sparkle::after{background-image:radial-gradient(2px 2px at 30% 12%,#ffe27a,transparent),radial-gradient(1.5px 1.5px at 66% 78%,#fff,transparent),radial-gradient(2.5px 2.5px at 8% 54%,#fff,transparent),radial-gradient(2px 2px at 52% 92%,#ffe27a,transparent),radial-gradient(1.5px 1.5px at 84% 26%,#fff,transparent),radial-gradient(2px 2px at 46% 40%,#bff3ff,transparent);animation:cos-tw 3s ease-in-out -1.2s infinite alternate}
    @keyframes cos-tw{from{opacity:.1}to{opacity:.95}}
    @media (prefers-reduced-motion:reduce){[class*="cos-f_"],[class*="cos-e_"],[class*="cos-e_"]::before,[class*="cos-e_"]::after,[class*="cos-e_"] .pf-banner::before,[class*="cos-e_"] .pf-banner::after{animation:none !important}}
    /* Textos, mascotas y clan */
    .cos-trow{display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap}
    .cos-title{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#04141a;background:var(--accent)}
    .cos-clan{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:800;letter-spacing:.06em;border:1px solid var(--accent);color:var(--accent)}
    .cos-t_crack{background:linear-gradient(135deg,#17e0e8,#0aa8c9)}
    .cos-t_goleador{background:linear-gradient(135deg,#ff7a18,#ff3b1a);color:#fff}
    .cos-t_mvp{background:linear-gradient(135deg,#a78bfa,#6d4df2);color:#fff}
    .cos-t_leyenda{background:linear-gradient(135deg,#ff5470,#b8183a);color:#fff}
    .cos-t_vip{background:linear-gradient(135deg,#ffe27a,#f5b74b,#c98a12);box-shadow:0 0 12px #f5b74b88}
    .cos-pet{display:inline-block;font-size:20px;line-height:1;animation:cos-bob 1.6s ease-in-out infinite}
    @keyframes cos-bob{50%{transform:translateY(-3px) rotate(-5deg)}}
    /* Panel Tienda */
    .shop-top{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
    .shop-bal{font-size:30px;font-weight:800;color:var(--accent)}
    .shop-bal small{font-size:13px;font-weight:600;opacity:.7;margin-left:6px}
    .shop-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
    .shop-chip{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--accent-soft);color:var(--accent)}
    .shop-redeem{display:flex;gap:8px;margin-left:auto}
    .shop-redeem input,.shop-input{padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elev-2);color:inherit;font:inherit}
    .shop-redeem input{width:190px;text-transform:uppercase}
    .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin:14px 32px 0}
    .shop-sec{margin:18px 32px 0;font-weight:800;font-size:14px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
    .shop-sec small{font-weight:600;opacity:.65;font-size:12px}
    .shop-card{display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:14px;background:var(--bg-elev);border:1px solid var(--border)}
    .shop-card.on{border-color:var(--accent)}
    .shop-card.wide{margin:14px 32px 0}
    .shop-prev{height:96px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--bg-elev-2);overflow:hidden}
    .shop-av{width:58px;height:58px;border-radius:50%;object-fit:cover;background:var(--bg-elev-3);border:3px solid var(--bg-elev-2)}
    .shop-fx{width:88%;border-radius:10px;background:var(--bg-elev);overflow:hidden;position:relative}
    .shop-fx .fx-banner{height:34px;background:linear-gradient(135deg,var(--accent),var(--accent-soft))}
    .shop-fx .fx-name{padding:7px 10px;font-weight:800;font-size:13px}
    .shop-pet{font-size:40px}
    .shop-name{font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .shop-desc{font-size:12px;opacity:.65;flex:1}
    .shop-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
    .shop-price{font-weight:800;color:var(--accent)}
    .shop-old{opacity:.5;font-weight:600;margin-right:4px}
    .shop-deal{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:#ff5470;color:#fff}
    .shop-tag{font-size:11px;font-weight:700;opacity:.7}
    .shop-lock{opacity:1;color:var(--accent)}
    .shop-earn{margin:14px 32px 0}
    .shop-note{margin:14px 32px 0;padding:14px 16px;border-radius:14px;background:var(--bg-elev);border:1px solid var(--accent);font-size:13px;line-height:1.55}
    .shop-note b{color:var(--accent)}
    .shop-note ul{margin:6px 0 0 18px;padding:0}
    .shop-petxp{font-size:12px;font-weight:700;color:var(--accent)}
    .shop-petlvl{font-size:11.5px;opacity:.8}
    .shop-bar{height:6px;border-radius:99px;background:var(--bg-elev-3);overflow:hidden}
    .shop-bar>i{display:block;height:100%;background:var(--accent)}
    .shop-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .shop-pre{font-weight:800;opacity:.7}
    .shop-list{display:flex;flex-direction:column;gap:6px;margin-top:6px}
    .shop-li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--bg-elev-2)}
    .shop-li>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
    .shop-ach{display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:12px;background:var(--bg-elev);border:1px solid var(--border)}
    .shop-ach.ready{border-color:var(--accent)}
    .shop-achs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin:14px 32px 0}`;
    document.head.appendChild(css);

    // ------------------------------------------------------------ cabecera / menú (se traducen acá)
    const panel = $('#panel-tienda');
    const hd = panel && panel.querySelector('.panel-header');
    const nav = document.querySelector('.nav-btn[data-panel="panel-tienda"]');
    if (hd) hd.setAttribute('data-i18n-skip', '');
    if (nav) nav.setAttribute('data-i18n-skip', '');
    function paintHead() {
      if (hd) {
        const h2 = hd.querySelector('h2'), hint = hd.querySelector('.hint');
        if (h2) h2.textContent = T('Tienda');
        if (hint) hint.textContent = T('Ganás Vcoins jugando en salas, con logros, códigos y eventos. Gastalas en marcos, efectos, mascotas, consumibles, mejoras y tu propio clan.');
      }
      if (nav) { const tn = Array.from(nav.childNodes).find((n) => n.nodeType === 3); if (tn) tn.nodeValue = T('Tienda') + ' '; }
    }

    // ------------------------------------------------------------ estado / datos
    const badge = $('#shop-coins');
    function setBadge() {
      if (!badge) return;
      badge.hidden = !loggedIn();
      badge.textContent = String(S.balance);
    }
    const byId = (id) => S.catalog.find((i) => i.id === id);
    function apply(r) {
      if (!r) return;
      if (typeof r.balance === 'number') S.balance = r.balance;
      if (Array.isArray(r.catalog)) S.catalog = r.catalog.filter((i) => i && ID_RE.test(i.id));
      if (Array.isArray(r.owned)) S.owned = new Set(r.owned);
      if (r.equipped) S.equipped = r.equipped;
      if (r.earn) S.earn = r.earn;
      if (r.deals) S.deals = r.deals;
      if (r.pets) S.pets = r.pets;
      if (typeof r.xp_mult === 'number') S.xpMult = r.xp_mult;
      if ('shield_until' in r) S.shield = Number(r.shield_until) || 0;
      if ('boost' in r) S.boost = r.boost || null;
      if (r.perks) S.perks = r.perks;
      if (r.extra) S.extra = r.extra;
      if (Array.isArray(r.achievements)) S.ach = r.achievements;
    }
    async function load(silent) {
      if (!loggedIn()) { S.balance = 0; setBadge(); render(); return; }
      try {
        const r = await req('GET', '/shop');
        apply(r);
        if (r.welcome) toast(T('¡Bienvenido! Ganaste {n} Vcoins', { n: r.welcome }), 'ok');
      } catch (e) { if (!silent) toast(T(e.message || 'No se pudo cargar la tienda')); }
      setBadge(); render();
      refreshAch(); // para el puntito de la pestaña Logros
      if (S.tab === 'special') loadSpecial();
    }
    function refreshAch() {
      if (!loggedIn()) return;
      req('GET', '/shop/achievements').then((r) => { if (r && Array.isArray(r.achievements)) { S.ach = r.achievements; render(); } }).catch(() => {});
    }
    async function loadSpecial() {
      if (!loggedIn()) return;
      try {
        const [c, f] = await Promise.all([req('GET', '/shop/clan'), req('GET', '/friends').catch(() => null)]);
        S.clan = c; S.friends = f && Array.isArray(f.friends) ? f.friends : [];
      } catch (_) {}
      render();
    }

    // ------------------------------------------------------------ helpers de dibujo
    const fmtH = (sec) => { const h = sec / 3600; return (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10) + ' h'; };
    const left = (ts) => {
      const m = Math.max(0, Math.floor((ts - Date.now()) / 60000));
      const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
      return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`;
    };
    const EMOJI = { shield: '🛡️', boost: '⚡', maps: '🗺️', banner: '🖼️', pins: '📌', friendcode: '🔖', clan: '👥' };

    function preview(i) {
      const me = api() && api().me && api().me();
      if (i.cat === 'frame') return `<img class="shop-av cos-${i.id}" alt="" src="${esc((me && me.avatar_url) || '')}" onerror="this.removeAttribute('src')" />`;
      if (i.cat === 'effect') return `<div class="shop-fx cos-${i.id}"><div class="fx-banner"></div><div class="fx-name">${esc(T('Tu nombre'))}</div></div>`;
      if (i.cat === 'title') return `<span class="cos-title cos-${i.id}">${esc(titleText(i))}</span>`;
      if (i.cat === 'pet') return `<span class="shop-pet cos-pet">${esc(i.emoji || '❔')}</span>`;
      const k = i.kind || i.perk || i.action;
      return `<span class="shop-pet">${EMOJI[k] || '🎁'}</span>`;
    }
    function petInfo(i) {
      const base = Math.round((i.xp - 1) * 100);
      const maxL = PET_LEVELS.length;
      const top = Math.round((i.xp - 1) * (1 + PET_STEP * (maxL - 1)) * 100);
      const p = S.pets[i.id];
      if (!p) return `<div class="shop-petxp">${esc(T('+{n}% XP', { n: base }))}</div><div class="shop-petlvl">${esc(T('Sube hasta +{n}% (nivel {l}) jugando con ella puesta.', { n: top, l: maxL }))}</div>`;
      const pct = p.next_at ? Math.min(100, Math.round((p.seconds / p.next_at) * 100)) : 100;
      const next = p.next_at ? T('{a} / {b} para el nivel {l}', { a: fmtH(p.seconds), b: fmtH(p.next_at), l: p.level + 1 }) : T('Nivel máximo · {a} jugadas', { a: fmtH(p.seconds) });
      return `<div class="shop-petxp">${esc(T('Nivel {a}/{b} · +{n}% XP', { a: p.level, b: p.max_level, n: Math.round(p.bonus * 100) }))}</div>` +
        `<div class="shop-bar"><i style="width:${pct}%"></i></div><div class="shop-petlvl">${esc(next)}</div>`;
    }
    function perkInfo(i) {
      const lvl = S.perks[i.perk] || 0;
      let line = T('Sin comprar');
      if (lvl > 0) line = i.perk === 'maps' ? T('Tenés +{n} espacios para mapas', { n: lvl * i.amount })
        : i.perk === 'pins' ? T('Tenés +{n} salas ancladas', { n: lvl * i.amount }) : T('Banner HD activo');
      return `<div class="shop-petxp">${esc(T('Nivel {a}/{b}', { a: lvl, b: i.max }))}</div><div class="shop-petlvl">${esc(line)}</div>`;
    }
    const priceHtml = (i) => (i.original ? `<s class="shop-old">${i.original}</s>${i.price} V` : `${i.price} V`);
    function footFor(i) {
      const owned = S.owned.has(i.id), worn = S.equipped[i.cat] === i.id;
      const buy = (label) => `<span class="shop-price">${priceHtml(i)}</span><button class="primary-btn" type="button" data-act="buy" data-id="${esc(i.id)}"${S.balance < i.price ? ` disabled title="${esc(T('Te faltan Vcoins'))}"` : ''}>${esc(T(label))}</button>`;
      if (i.cat === 'perk') { const lvl = S.perks[i.perk] || 0; return lvl >= i.max ? `<span class="shop-tag">${esc(T('Máximo'))}</span>` : buy(lvl ? 'Mejorar' : 'Comprar'); }
      if (i.cat === 'consumable') return buy('Comprar');
      // Objetos que se ganan por rango (price null): no se compran.
      if (!owned && i.price == null) return `<span class="shop-tag shop-lock">${esc(T('🔒 Se desbloquea con rango {r}', { r: rankName(i.rank) }))}</span>`;
      if (!owned) return buy('Comprar');
      if (worn) return `<span class="shop-tag">${esc(T('Puesto'))}</span><button class="ghost-btn" type="button" data-act="unequip" data-cat="${esc(i.cat)}">${esc(T('Quitar'))}</button>`;
      return `<span class="shop-tag">${esc(T('Tuyo'))}</span><button class="primary-btn" type="button" data-act="equip" data-cat="${esc(i.cat)}" data-id="${esc(i.id)}">${esc(T('Ponerme'))}</button>`;
    }
    function cardHtml(i) {
      const worn = S.equipped[i.cat] === i.id;
      const deal = i.deal && i.original
        ? `<span class="shop-deal">${esc(T(i.deal === 'weekly' ? 'Semana' : 'Hoy'))} −${Math.round((1 - i.price / i.original) * 100)}%</span>` : '';
      const extra = i.cat === 'pet' && i.xp ? petInfo(i) : i.cat === 'perk' ? perkInfo(i) : '';
      return `<div class="shop-card${worn ? ' on' : ''}"><div class="shop-prev">${preview(i)}</div><div class="shop-name">${esc(itemName(i))}${deal}</div>` +
        `<div class="shop-desc">${esc(itemDesc(i))}</div>${extra}<div class="shop-foot">${footFor(i)}</div></div>`;
    }

    // ------------------------------------------------------------ secciones
    function topHtml() {
      const chips = [];
      if (S.shield > Date.now()) chips.push(`🛡️ ${T('Escudo activo: {t}', { t: left(S.shield) })}`);
      if (S.boost && S.boost.until > Date.now()) chips.push(`⚡ ${T('XP x{m} activo: {t}', { m: S.boost.mult, t: left(S.boost.until) })}`);
      chips.push(`✨ ${T('Tu XP: x{m}', { m: S.xpMult.toFixed(2) })}`);
      return `<div class="card shop-top"><div><div class="shop-bal">${S.balance}<small>${esc(T('Vcoins'))}</small></div>` +
        `<div class="shop-chips">${chips.map((c) => `<span class="shop-chip">${esc(c)}</span>`).join('')}</div></div>` +
        `<div class="shop-redeem"><input id="shop-code" type="text" maxlength="40" value="${esc(S.code)}" placeholder="${esc(T('Código promocional'))}" autocomplete="off" spellcheck="false" />` +
        `<button class="primary-btn" type="button" data-act="redeem">${esc(T('Canjear'))}</button></div></div>`;
    }
    function tabsHtml() {
      const ready = S.ach && S.ach.some((a) => a.ready);
      return `<div class="ui-tabs" role="tablist">${TABS.map(([c, l]) =>
        `<button type="button" class="ui-tab${c === S.tab ? ' active' : ''}" data-act="tab" data-cat="${c}">${esc(T(l))}${c === 'ach' && ready ? ' •' : ''}</button>`).join('')}</div>`;
    }
    function dealsHtml() {
      const d = S.deals;
      const weekly = d && byId(d.weekly), daily = d ? d.daily.map(byId).filter(Boolean) : [];
      if (!weekly && !daily.length) return `<p class="hint shop-earn">${esc(T('No hay ofertas por ahora.'))}</p>`;
      return `<div class="shop-sec">${esc(T('Oferta de la semana'))}<small>${esc(T('termina en {t}', { t: left(d.weekly_ends_at) }))}</small></div>` +
        `<div class="shop-grid">${weekly ? cardHtml(weekly) : ''}</div>` +
        `<div class="shop-sec">${esc(T('Ofertas del día'))}<small>${esc(T('termina en {t}', { t: left(d.daily_ends_at) }))}</small></div>` +
        `<div class="shop-grid">${daily.map(cardHtml).join('')}</div>` +
        `<p class="hint shop-earn">${esc(T('Cambian solas: 3 objetos con -25% cada día y 1 con -40% cada semana.'))}</p>`;
    }
    function itemsHtml() {
      const items = S.catalog.filter((i) => i.cat === S.tab);
      let note = '';
      if (S.tab === 'pet') {
        note = `<div class="shop-note"><b>${esc(T('Cómo funcionan las mascotas'))}</b><ul>` +
          [T('Con una mascota <b>puesta</b> ganás <b>más XP competitivo</b> mientras jugás en una sala (el bonus de cada una está en su tarjeta).'),
            T('Solo una puesta a la vez. Si no la tenés puesta, no da bonus ni gana nivel.'),
            T('Suben de nivel con tus horas jugadas <b>con ella puesta</b> (2 h, 6 h, 15 h, 30 h y 60 h). Cada nivel suma +20% al bonus base, hasta duplicarlo en el nivel 6.'),
            T('Se suma al boost "XP x2" si lo tenés activo. Las Vcoins por jugar no cambian: solo se multiplica el XP.'),
            T('Tu multiplicador de XP actual: <b>x{m}</b>.', { m: S.xpMult.toFixed(2) })].map((x) => `<li>${x}</li>`).join('') + '</ul></div>';
      } else if (S.tab === 'consumable') {
        note = `<div class="shop-note">${T('<b>Escudo:</b> congela el decaimiento de XP por inactividad. Los días se acumulan (máx. 30). <b>Boost:</b> duplica tu XP y se suma al bonus de tu mascota (máx. 24 h acumuladas).')}</div>`;
      } else if (S.tab === 'perk') {
        note = `<div class="shop-note">${esc(T('Mejoras permanentes: se compran una vez (o por niveles) y quedan en tu cuenta para siempre.'))}</div>`;
      }
      return note + `<div class="shop-grid">${items.length ? items.map(cardHtml).join('') : `<p class="hint">${esc(T('No hay objetos en esta categoría todavía.'))}</p>`}</div>`;
    }
    function specialHtml() {
      const fcItem = byId('x_friendcode'), clanItem = byId('x_clan');
      const me = api() && api().me && api().me();
      let html = '';
      if (fcItem) {
        const can = S.balance >= fcItem.price;
        html += `<div class="shop-card wide"><div class="shop-name">${EMOJI.friendcode} ${esc(itemName(fcItem))}</div><div class="shop-desc">${esc(itemDesc(fcItem))}</div>` +
          `<div class="shop-desc">${T('Tu código actual: <b>{c}</b>', { c: esc((me && me.friend_code) || '—') })}</div>` +
          `<div class="shop-row"><span class="shop-pre">VV-</span><input id="shop-fc" class="shop-input" type="text" maxlength="8" value="${esc(S.fc)}" placeholder="BETA" autocomplete="off" spellcheck="false" style="width:130px;text-transform:uppercase" />` +
          `<span class="shop-price">${priceHtml(fcItem)}</span><button class="primary-btn" type="button" data-act="friendcode"${can ? '' : ` disabled title="${esc(T('Te faltan Vcoins'))}"`}>${esc(T('Cambiar'))}</button></div></div>`;
      }
      html += clanHtml(clanItem);
      return html;
    }
    function clanHtml(item) {
      const c = S.clan;
      if (!c) return `<div class="shop-card wide"><div class="shop-name">${EMOJI.clan} ${esc(T('Clan'))}</div><p class="hint">${esc(T('Cargando…'))}</p></div>`;
      let h = `<div class="shop-card wide"><div class="shop-name">${EMOJI.clan} ${esc(item ? itemName(item) : T('Clan'))}</div>`;
      if (c.invites && c.invites.length) {
        h += `<div class="shop-desc">${esc(T('Invitaciones recibidas'))}</div><div class="shop-list">` + c.invites.map((v) =>
          `<div class="shop-li"><span>${esc(T('{u} te invitó a [{t}]', { u: v.from, t: v.tag }))}</span>` +
          `<button class="primary-btn" type="button" data-act="clan-accept" data-tag="${esc(v.tag)}">${esc(T('Aceptar'))}</button>` +
          `<button class="ghost-btn" type="button" data-act="clan-decline" data-tag="${esc(v.tag)}">${esc(T('Rechazar'))}</button></div>`).join('') + '</div>';
      }
      if (!c.clan) {
        const can = S.balance >= c.price;
        h += `<div class="shop-desc">${esc(T('Creá tu clan: comprás el tag una vez y lo usan tus amigos gratis. Cada persona puede estar en un clan.'))}</div>` +
          `<div class="shop-row"><input id="shop-ctag" class="shop-input" type="text" maxlength="4" value="${esc(S.ctag)}" placeholder="${esc(T('Tag (3-4 letras)'))}" autocomplete="off" spellcheck="false" style="width:150px;text-transform:uppercase" />` +
          `<span class="shop-price">${c.price} V</span><button class="primary-btn" type="button" data-act="clan-create"${can ? '' : ` disabled title="${esc(T('Te faltan Vcoins'))}"`}>${esc(T('Crear clan'))}</button></div>`;
      } else {
        const k = c.clan;
        h += `<div class="shop-sec" style="margin:8px 0 0"><span class="cos-clan">[${esc(k.tag)}]</span>${esc(T('Tu clan'))}<small>${esc(T('Miembros ({a}/{b})', { a: k.members.length, b: c.max_members }))}</small></div>` +
          '<div class="shop-list">' + k.members.map((m) =>
            `<div class="shop-li"><span>${esc(m.username)}${m.haxball_nick ? ` <small style="opacity:.6">(${esc(m.haxball_nick)})</small>` : ''}${m.owner ? ` · 👑 ${esc(T('Dueño'))}` : ''}</span>` +
            (k.is_owner && !m.owner ? `<button class="ghost-btn" type="button" data-act="clan-kick" data-id="${Number(m.id)}">${esc(T('Sacar'))}</button>` : '') + '</div>').join('') + '</div>';
        if (k.is_owner) {
          const inClan = new Set(k.members.map((m) => m.id)), pend = new Set((k.pending || []).map((p) => p.id));
          const cand = S.friends.filter((f) => !inClan.has(f.id) && !pend.has(f.id));
          if (k.pending && k.pending.length) h += `<div class="shop-desc" style="margin-top:8px">${esc(T('Invitaciones pendientes'))}: ${k.pending.map((p) => esc(p.username)).join(', ')}</div>`;
          h += `<div class="shop-desc" style="margin-top:8px">${esc(T('Invitar a un amigo'))}</div>` + (cand.length
            ? `<div class="shop-row"><select id="shop-inv" class="shop-input"><option value="">${esc(T('Elegí un amigo…'))}</option>` +
              cand.map((f) => `<option value="${Number(f.id)}"${String(S.inv) === String(f.id) ? ' selected' : ''}>${esc(f.username)}</option>`).join('') +
              `</select><button class="primary-btn" type="button" data-act="clan-invite">${esc(T('Invitar'))}</button></div>`
            : `<p class="hint">${esc(T('Ya no tenés amigos para invitar.'))}</p>`);
          h += `<div class="shop-row"><button class="ghost-btn" type="button" data-act="clan-disband">${esc(T('Disolver clan'))}</button></div>`;
        } else h += `<div class="shop-row"><button class="ghost-btn" type="button" data-act="clan-leave">${esc(T('Salir del clan'))}</button></div>`;
      }
      return h + '</div>';
    }
    function achHtml() {
      if (!S.ach) return `<p class="hint shop-earn">${esc(T('Cargando…'))}</p>`;
      return `<div class="shop-achs">${S.ach.map((a) => {
        const nm = en() && ACH_EN[a.id] ? ACH_EN[a.id] : [a.name, a.desc];
        const time = a.need >= 3600;
        const pct = Math.min(100, Math.round((a.progress / a.need) * 100));
        const prog = time ? `${fmtH(a.progress)} / ${fmtH(a.need)}` : `${a.progress} / ${a.need}`;
        const foot = a.claimed ? `<span class="shop-tag">✓ ${esc(T('Reclamado'))}</span>`
          : `<span class="shop-price">${esc(T('+{n} V', { n: a.coins }))}</span>` + (a.ready ? `<button class="primary-btn" type="button" data-act="claim" data-id="${esc(a.id)}">${esc(T('Reclamar'))}</button>` : `<span class="shop-tag">${prog}</span>`);
        return `<div class="shop-ach${a.ready ? ' ready' : ''}"><div class="shop-name">${esc(nm[0])}</div><div class="shop-desc">${esc(nm[1])}</div>` +
          `<div class="shop-bar"><i style="width:${a.claimed ? 100 : pct}%"></i></div><div class="shop-foot">${foot}</div></div>`;
      }).join('')}</div>`;
    }

    function render() {
      if (!api() || !api().configured) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('La tienda no está configurada en este cliente.'))}</p></div>`; return; }
      if (!loggedIn()) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('Conectá tu Discord en Social para usar la Tienda y ganar Vcoins.'))}</p></div>`; return; }
      const a = document.activeElement;
      const keep = a && root.contains(a) && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null;
      const earn = S.earn ? T('Jugando en una sala ganás 1 Vcoin cada {m} min (máx. {c} por día). También podés canjear códigos promocionales, completar logros y ganar premios en eventos.',
        { m: Math.round(S.earn.per_coin_seconds / 60), c: S.earn.daily_cap }) : '';
      const body = S.tab === 'deals' ? dealsHtml() : S.tab === 'special' ? specialHtml() : S.tab === 'ach' ? achHtml() : itemsHtml();
      root.innerHTML = topHtml() + tabsHtml() + body + (earn ? `<p class="hint shop-earn">${esc(earn)}</p>` : '');
      if (keep) {
        const n = document.getElementById(keep.id);
        if (n) { n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (_) {} }
      }
    }

    // ------------------------------------------------------------ acciones
    const clanCall = async (path, body) => {
      const r = await req('POST', '/shop/clan/' + path, body || {});
      S.clan = { clan: r.clan, invites: r.invites, price: r.price, max_members: r.max_members };
      if (typeof r.balance === 'number') S.balance = r.balance;
      return r;
    };
    async function doAct(act, t) {
      if (act === 'buy') {
        const r = await req('POST', '/shop/buy', { item_id: t.dataset.id }); apply(r);
        const it = byId(t.dataset.id);
        toast(T(it && it.cat === 'consumable' ? '¡Listo! Consumible activado' : it && it.cat === 'perk' ? '¡Mejora comprada!' : '¡Comprado! Ya podés ponértelo'), 'ok');
        refreshAch();
      } else if (act === 'equip') {
        apply(await req('POST', '/shop/equip', { cat: t.dataset.cat, item_id: t.dataset.id }));
      } else if (act === 'unequip') {
        apply(await req('POST', '/shop/equip', { cat: t.dataset.cat, item_id: null }));
      } else if (act === 'redeem') {
        const code = (S.code || '').trim();
        if (!code) { toast(T('Escribí un código primero')); return; }
        const r = await req('POST', '/shop/redeem', { code }); apply(r); S.code = '';
        toast(T('+{n} Vcoins', { n: r.gained }), 'ok');
      } else if (act === 'friendcode') {
        const code = (S.fc || '').trim();
        if (!code) { toast(T('Escribí el código que querés')); return; }
        const r = await req('POST', '/shop/friendcode', { code }); apply(r); S.fc = '';
        const me = api().me && api().me();
        if (me) me.friend_code = r.friend_code;
        const el = document.getElementById('fr-code'); if (el) el.textContent = r.friend_code;
        toast(T('Código cambiado a {c}', { c: r.friend_code }), 'ok');
      } else if (act === 'claim') {
        const r = await req('POST', '/shop/achievements/claim', { id: t.dataset.id }); apply(r);
        toast(T('¡Logro reclamado! +{n} Vcoins', { n: r.gained }), 'ok');
      } else if (act === 'clan-create') {
        const tag = (S.ctag || '').trim().toUpperCase();
        if (!tag) { toast(T('Escribí el tag del clan')); return; }
        await clanCall('create', { tag }); S.ctag = ''; toast(T('¡Clan creado!'), 'ok');
      } else if (act === 'clan-invite') {
        const id = Number((root.querySelector('#shop-inv') || {}).value);
        if (!id) { toast(T('Elegí un amigo primero')); return; }
        await clanCall('invite', { id }); S.inv = ''; toast(T('Invitación enviada'), 'ok');
      } else if (act === 'clan-accept' || act === 'clan-decline') {
        await clanCall('respond', { tag: t.dataset.tag, accept: act === 'clan-accept' });
        if (act === 'clan-accept') toast(T('Te uniste al clan'), 'ok');
      } else if (act === 'clan-leave') {
        if (confirm(T('¿Salir del clan?'))) await clanCall('leave');
      } else if (act === 'clan-kick') {
        if (confirm(T('¿Sacar a este miembro?'))) await clanCall('kick', { id: Number(t.dataset.id) });
      } else if (act === 'clan-disband') {
        if (confirm(T('¿Disolver el clan? El tag queda libre y no hay reembolso.'))) await clanCall('disband');
      }
    }
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || S.busy) return;
      const act = t.dataset.act;
      if (act === 'tab') {
        S.tab = t.dataset.cat; render();
        if (S.tab === 'special') loadSpecial(); else if (S.tab === 'ach') refreshAch();
        return;
      }
      S.busy = true; t.disabled = true;
      try { await doAct(act, t); } catch (err) { toast(T((err && err.message) || 'No se pudo completar la acción')); }
      S.busy = false; setBadge(); render();
    });
    root.addEventListener('input', (e) => {
      const id = e.target.id;
      if (id === 'shop-code') S.code = e.target.value;
      else if (id === 'shop-fc') S.fc = e.target.value;
      else if (id === 'shop-ctag') S.ctag = e.target.value;
    });
    root.addEventListener('change', (e) => { if (e.target.id === 'shop-inv') S.inv = e.target.value; });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const map = { 'shop-code': 'redeem', 'shop-fc': 'friendcode', 'shop-ctag': 'clan-create' };
      const act = map[e.target.id];
      const b = act && root.querySelector(`[data-act="${act}"]`);
      if (b) b.click();
    });

    // ------------------------------------------------------------ objetos puestos en el perfil de cualquiera
    async function decorate(box, id) {
      if (!box || !loggedIn() || !Number.isInteger(Number(id))) return;
      let c = null;
      try { const r = await req('GET', '/shop/cosmetics?ids=' + encodeURIComponent(id)); c = r && r.users && r.users[id]; } catch (_) { return; }
      if (!c || !box.isConnected) return;
      const av = box.querySelector('.pf-avatar');
      const ident = box.querySelector('.pf-ident');
      if (!av || !ident) return; // se cerró o se redibujó mientras tanto
      if (c.frame && ID_RE.test(c.frame.id)) av.classList.add('cos-' + c.frame.id);
      if (c.effect && ID_RE.test(c.effect.id)) box.classList.add('cos-' + c.effect.id);
      if ((c.pet || c.title || c.clan) && !ident.querySelector('.cos-trow')) {
        const row = document.createElement('div');
        row.className = 'cos-trow';
        const petName = c.pet ? (en() && ITEM_EN[c.pet.id] ? ITEM_EN[c.pet.id][0] : c.pet.name) : '';
        row.innerHTML = (c.clan ? `<span class="cos-clan">[${esc(c.clan)}]</span>` : '') +
          (c.pet && c.pet.emoji ? `<span class="cos-pet" title="${esc(petName)}${c.pet.level ? ' · ' + esc(T('Nivel {a}/{b}', { a: Number(c.pet.level), b: PET_LEVELS.length })) : ''}">${esc(c.pet.emoji)}</span>` : '') +
          (c.title && ID_RE.test(c.title.id) ? `<span class="cos-title cos-${c.title.id}">${esc(titleText(c.title))}</span>` : '');
        const nameEl = ident.querySelector('.pf-name');
        if (nameEl) nameEl.after(row); else ident.prepend(row);
      }
    }
    window.vivetShop = { decorate, reload: () => load(true) };

    window.addEventListener('vivet-session-changed', () => load(true));
    window.addEventListener('vivet-lang-changed', () => { paintHead(); render(); });
    nav && nav.addEventListener('click', () => load(false));
    setInterval(() => { if (!document.hidden && loggedIn()) load(true); }, 5 * 60 * 1000); // refresca el saldo (Vcoins por jugar)
    // Cuentas regresivas (escudo, boost, ofertas): se redibuja cada minuto con el panel a la vista.
    setInterval(() => { if (!document.hidden && !S.busy && loggedIn() && root.offsetParent !== null) render(); }, 60 * 1000);
    paintHead();
    render();
    load(true);
  })();
} catch (err) { console.error("[app2] tienda:", err); }

// ======================================================================
// Pestañas y orden de la interfaz  (antes: ui-organize.js)
// ======================================================================
try {
  // Vivet Client - renderer/ui-organize.js
  // Ordena paneles largos en pestañas (Apariencia, Social, Rendimiento) sin mover nada del DOM:
  // solo marca cada tarjeta con data-grp y oculta las que no son de la pestaña activa (clase .grp-off).
  // Los ids y listeners de app.js siguen intactos. Se carga AL FINAL (después de app.js).
  (() => {
    const $ = (s) => document.querySelector(s);
    const KEY = 'vivet_ui_tabs';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    const controllers = {};

    function makeTabs(panelId, defs, fallback) {
      const panel = document.getElementById(panelId);
      const header = panel && panel.querySelector('.panel-header');
      if (!panel || !header || controllers[panelId]) return controllers[panelId];
      const bar = document.createElement('div');
      bar.className = 'ui-tabs';
      bar.setAttribute('role', 'tablist');
      bar.innerHTML = defs.map((d) => `<button type="button" class="ui-tab" role="tab" data-tab="${d.id}">${d.label}</button>`).join('');
      header.after(bar);
      const btns = Array.from(bar.querySelectorAll('.ui-tab'));
      let current = defs.some((d) => d.id === saved[panelId]) ? saved[panelId] : fallback;

      function show(id) {
        if (!defs.some((d) => d.id === id)) return;
        current = id;
        panel.querySelectorAll('[data-grp]').forEach((el) => el.classList.toggle('grp-off', el.dataset.grp !== id));
        btns.forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        saved[panelId] = id;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {}
      }
      bar.addEventListener('click', (e) => { const b = e.target.closest('.ui-tab'); if (b) show(b.dataset.tab); });
      controllers[panelId] = { show, refresh: () => show(current) };
      controllers[panelId].refresh();
      return controllers[panelId];
    }

    // ------------------------------------------------------------ Apariencia
    // Las tarjetas de "Personalización avanzada" las inserta app.js después de cargar: se espera a que existan.
    const AP_RULES = [
      ['themes', ['#ap-presets', '#ap-theme-code']],
      ['colors', ['#club-grid', '#btn-swatches', '.stadium-grid', '#bg-strength', '[data-key="base"]']],
      ['stream', ['#streamer-toggle', '#stream-boost-toggle']],
    ];
    function tagAppearance() {
      const panel = $('#panel-apariencia');
      if (!panel || !$('#ap-presets')) return false;
      Array.from(panel.children).forEach((el) => {
        if (el.classList.contains('fr-section-title')) { el.dataset.grp = '_'; return; } // los títulos sueltos sobran con pestañas
        if (!el.classList.contains('card')) return;
        const rule = AP_RULES.find(([, sels]) => sels.some((s) => el.querySelector(s)));
        el.dataset.grp = rule ? rule[0] : 'interface';
      });
      makeTabs('panel-apariencia', [
        { id: 'themes', label: 'Temas' }, { id: 'colors', label: 'Colores' },
        { id: 'interface', label: 'Fondo e interfaz' }, { id: 'stream', label: 'Transmisión' },
      ], 'themes');
      return true;
    }
    const apPanel = $('#panel-apariencia');
    if (apPanel && !tagAppearance()) {
      const mo = new MutationObserver(() => { if (tagAppearance()) mo.disconnect(); });
      mo.observe(apPanel, { childList: true });
    }

    // ------------------------------------------------------------ Rendimiento (agrupa por título de sección)
    (function perf() {
      const panel = $('#panel-rendimiento');
      if (!panel) return;
      const MAP = [['Mientras', 'game'], ['Pantalla', 'game'], ['Avanzado', 'adv'], ['Interfaz', 'adv'], ['Ayuda', 'help']];
      let grp = 'game';
      Array.from(panel.children).forEach((el) => {
        if (el.classList.contains('panel-header')) return;
        if (el.classList.contains('fr-section-title')) {
          const hit = MAP.find(([k]) => el.textContent.trim().startsWith(k));
          if (hit) grp = hit[1];
        }
        el.dataset.grp = grp;
      });
      makeTabs('panel-rendimiento', [{ id: 'game', label: 'Juego' }, { id: 'adv', label: 'Avanzado' }, { id: 'help', label: 'Ayuda' }], 'game');
    })();

    // ------------------------------------------------------------ Social (las tarjetas ya traen data-grp en index.html)
    makeTabs('panel-amigos', [{ id: 'friends', label: 'Amigos' }, { id: 'profile', label: 'Mi perfil' }], 'friends');

    window.vivetUI = { tab: (panelId, id) => controllers[panelId] && controllers[panelId].show(id) };
  })();
} catch (err) { console.error("[app2] ui-organize.js:", err); }