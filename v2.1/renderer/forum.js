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