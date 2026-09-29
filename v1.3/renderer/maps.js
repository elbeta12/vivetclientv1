// Vivet Client - renderer/maps.js
// Mapas de Haxball (.hbs) subidos por la comunidad, con vista previa dibujada
// en canvas (sin abrir el juego). Habla con el mismo servidor que Amigos
// (FRIENDS_API_URL). Para subir hace falta haber vinculado Discord en Social:
// se reutiliza el token de sesión guardado en 'friendsToken'.
// Se carga DESPUÉS de app.js/friends.js (index.html). Usa sus globales:
// escapeHtml, showToast.

(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);

  const MAP_MAX_BYTES = 512 * 1024;   // un .hbs normal pesa < 100 KB
  const THUMB_W = 480, THUMB_H = 270;
  const LIB_KEY = 'mapsLibrary';
  const LIB_MAX = 40;

  // Si en un mapa real los arcos salen espejados, cambiá esto a -1.
  const CURVE_SIGN = 1;

  // ------------------------------------------------------------ estado
  let tab = 'community';            // community | saved | mine
  let sort = 'recent';
  let query = '';
  let list = [];                    // resultados de la pestaña activa
  let library = [];                 // guardados localmente
  let me = null;                    // { username } si hay sesión
  let current = null;               // mapa abierto en el detalle
  let upload = null;                // { text, json, name } en el diálogo de subida
  let searchTimer = null;

  // ------------------------------------------------------------ API
  async function token() {
    try { return (await window.vivet.getConfig('friendsToken', '')) || null; } catch (_) { return null; }
  }
  async function api(method, path, body) {
    const t = await token();
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.status === 404 && !json) throw new Error('El servidor todavía no tiene la sección de mapas.');
    if (!res.ok) throw new Error((json && json.error) || `Error ${res.status}`);
    return json;
  }

  // ------------------------------------------------------------ biblioteca local
  async function loadLibrary() {
    try {
      const v = await window.vivet.getConfig(LIB_KEY, []);
      library = Array.isArray(v) ? v : [];
    } catch (_) { library = []; }
  }
  const saveLibrary = () => window.vivet.setConfig(LIB_KEY, library).catch(() => {});
  const isSaved = (id) => library.some((m) => m.id === id);

  // ------------------------------------------------------------ parseo del .hbs
  // Devuelve { ok, json, error }. Solo valida lo mínimo para poder dibujarlo;
  // Haxball es quien decide si el mapa es jugable.
  function parseStadium(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'El archivo está vacío.' };
    if (text.length > MAP_MAX_BYTES) return { ok: false, error: 'El mapa pesa más de 512 KB.' };
    let json, repaired = false;
    try { json = JSON.parse(text); }
    catch (_) {
      // Muchos .hbs a mano traen BOM, comentarios o comas finales: se limpian.
      try {
        let t = text.replace(/^\uFEFF/, '');
        t = t.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, s) => s || '');
        t = t.replace(/("(?:\\.|[^"\\])*")|,(\s*[}\]])/g, (m, s, c) => s || c);
        json = JSON.parse(t);
        repaired = true;
      } catch (_2) {
        return { ok: false, error: 'No es un JSON válido. ¿Es un archivo .hbs de Haxball?' };
      }
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) return { ok: false, error: 'El archivo no tiene forma de mapa de Haxball.' };
    // Antes se exigía vertexes + segments + bg, y muchos mapas válidos no
    // los traen (p. ej. sin paredes dibujadas o sin bg). Basta con que tenga
    // algo de geometría; lo que falte se completa para poder dibujarlo.
    const hasGeometry = ['vertexes', 'segments', 'discs', 'goals', 'planes'].some((k) => Array.isArray(json[k]));
    if (!hasGeometry && !json.bg) return { ok: false, error: 'No parece un mapa de Haxball (no tiene vertexes, segments, discs ni goals).' };
    if (!Array.isArray(json.vertexes)) json.vertexes = [];
    if (!Array.isArray(json.segments)) json.segments = [];
    if (!json.bg || typeof json.bg !== 'object') json.bg = {};
    return { ok: true, json, repaired };
  }

  // ------------------------------------------------------------ dibujo de la cancha
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  function cssColor(c, fallback) {
    if (c === 'transparent') return null;
    if (typeof c === 'string' && /^[0-9a-f]{6}$/i.test(c)) return '#' + c;
    if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.replace('#', ''))) return '#' + c.replace('#', '');
    if (Array.isArray(c) && c.length === 3 && c.every((n) => Number.isFinite(n))) return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    return fallback;
  }

  // Propiedad con herencia por "trait": objeto -> trait -> valor por defecto.
  function prop(json, obj, key, def) {
    if (obj && obj[key] !== undefined) return obj[key];
    const tr = obj && obj.trait && json.traits && json.traits[obj.trait];
    if (tr && tr[key] !== undefined) return tr[key];
    return def;
  }

  function bounds(json) {
    const bg = json.bg || {};
    const w = Math.abs(num(json.width, 0)), h = Math.abs(num(json.height, 0));
    let minX = -Math.max(w, num(bg.width, 0)), maxX = -minX;
    let minY = -Math.max(h, num(bg.height, 0)), maxY = -minY;
    const grow = (x, y, r = 0) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
    };
    // Solo los vértices que dibujan algo definen el encuadre.
    const seg = json.segments || [], vx = json.vertexes || [];
    seg.forEach((s) => {
      if (prop(json, s, 'vis', true) === false) return;
      [vx[s.v0], vx[s.v1]].forEach((v) => v && grow(num(v.x, NaN), num(v.y, NaN)));
    });
    (json.goals || []).forEach((g) => {
      if (Array.isArray(g.p0)) grow(g.p0[0], g.p0[1]);
      if (Array.isArray(g.p1)) grow(g.p1[0], g.p1[1]);
    });
    if (!isFinite(minX) || maxX - minX < 10) { minX = -400; maxX = 400; }
    if (!isFinite(minY) || maxY - minY < 10) { minY = -200; maxY = 200; }
    return { minX, maxX, minY, maxY };
  }

  function strokeSegment(ctx, json, s, a, b, dashed) {
    ctx.beginPath();
    const curve = num(prop(json, s, 'curve', 0), 0) * CURVE_SIGN;
    if (Math.abs(curve) < 0.5) {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    } else {
      const th = curve * Math.PI / 180;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.tan(th / 2);
      const cx = (a.x + b.x) / 2 - dy / (2 * t);
      const cy = (a.y + b.y) / 2 + dx / (2 * t);
      const r = Math.hypot(a.x - cx, a.y - cy);
      const a0 = Math.atan2(a.y - cy, a.x - cx);
      ctx.arc(cx, cy, r, a0, a0 + th, th < 0);
    }
    ctx.setLineDash(dashed ? [6, 6] : []);
    ctx.stroke();
  }

  // Dibuja el mapa completo dentro de `canvas`. opts.invisible = mostrar paredes
  // invisibles (punteadas). Devuelve nada; si algo falla, deja el fondo liso.
  function drawStadium(canvas, json, opts = {}) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const bg = json.bg || {};
    // Haxball: type "grass" / "hockey" / (sin type = "none"). En "none" el
    // color del mapa (bg.color) pinta TODO el fondo; antes se ignoraba y se
    // mostraba siempre verde. Por defecto el color es 718C5A.
    const type = bg.type === 'hockey' ? 'hockey' : bg.type === 'grass' ? 'grass' : 'none';
    const defInside = type === 'hockey' ? '#556E55' : '#718C5A';
    const inside = cssColor(bg.color, defInside) || defInside;
    const outside = type === 'hockey' ? '#3a4a3a' : type === 'grass' ? '#5a7a4a' : inside;
    const lines = type === 'hockey' ? '#E9CC6E' : '#C7E6BD';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = outside; ctx.fillRect(0, 0, W, H);

    try {
      const b = bounds(json);
      const pad = 0.06;
      const bw = (b.maxX - b.minX) * (1 + pad * 2), bh = (b.maxY - b.minY) * (1 + pad * 2);
      const scale = Math.min(W / bw, H / bh);
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      ctx.setTransform(scale, 0, 0, scale, W / 2 - cx * scale, H / 2 - cy * scale);
      const px = 1 / scale;                 // 1 píxel de pantalla en coordenadas del mapa

      // --- cancha (bg)
      const bgW = num(bg.width, 0), bgH = num(bg.height, 0);
      if (bgW > 0 && bgH > 0) {
        const cr = Math.min(num(bg.cornerRadius, 0), bgW, bgH);
        ctx.fillStyle = inside;
        ctx.beginPath();
        if (cr > 0 && ctx.roundRect) ctx.roundRect(-bgW, -bgH, bgW * 2, bgH * 2, cr); else ctx.rect(-bgW, -bgH, bgW * 2, bgH * 2);
        ctx.fill();
        ctx.strokeStyle = lines; ctx.lineWidth = Math.max(3, 2 * px); ctx.setLineDash([]);
        ctx.stroke();
        // línea central y círculo de saque
        ctx.beginPath(); ctx.moveTo(0, -bgH); ctx.lineTo(0, bgH); ctx.stroke();
        const kr = num(bg.kickOffRadius, 0);
        if (kr > 0) { ctx.beginPath(); ctx.arc(0, 0, kr, 0, Math.PI * 2); ctx.stroke(); }
      }

      // --- paredes / líneas
      const vx = json.vertexes;
      (json.segments || []).forEach((s) => {
        const a = vx[s.v0], c = vx[s.v1];
        if (!a || !c) return;
        const vis = prop(json, s, 'vis', true) !== false;
        const color = cssColor(prop(json, s, 'color', '000000'), '#000000');
        if (!vis && !opts.invisible) return;
        if (!color && vis) return;              // "transparent"
        ctx.lineWidth = Math.max(3, 2 * px);
        ctx.lineCap = 'round';
        ctx.strokeStyle = vis ? color : 'rgba(255, 255, 255, 0.45)';
        strokeSegment(ctx, json, s, a, c, !vis);
      });

      // --- arcos
      (json.goals || []).forEach((g) => {
        if (!Array.isArray(g.p0) || !Array.isArray(g.p1)) return;
        ctx.strokeStyle = g.team === 'blue' ? '#5689E5' : '#E56E56';
        ctx.lineWidth = Math.max(4, 3 * px); ctx.lineCap = 'butt'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(g.p0[0], g.p0[1]); ctx.lineTo(g.p1[0], g.p1[1]); ctx.stroke();
      });

      // --- discos del mapa (postes, obstáculos)
      (json.discs || []).forEach((d) => {
        const p = d.pos;
        if (!Array.isArray(p)) return;
        const r = num(prop(json, d, 'radius', 10), 10);
        const fill = cssColor(prop(json, d, 'color', 'FFFFFF'), '#FFFFFF');
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.setLineDash([]); ctx.stroke();
      });

      // --- pelota y jugadores en su posición de saque
      const ball = json.ballPhysics && typeof json.ballPhysics === 'object' ? json.ballPhysics : {};
      if (ball !== 'disc0') {
        const r = num(ball.radius, 10);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = cssColor(ball.color, '#FFFFFF'); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.stroke();
      }
      const pr = num(json.playerPhysics && json.playerPhysics.radius, 15);
      const team = (pts, color) => (Array.isArray(pts) ? pts : []).slice(0, 4).forEach((p) => {
        if (!Array.isArray(p)) return;
        ctx.beginPath(); ctx.arc(p[0], p[1], pr, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.stroke();
      });
      team(json.redSpawnPoints, '#E56E56');
      team(json.blueSpawnPoints, '#5689E5');
    } catch (_) { /* preview incompleta, pero no se rompe la UI */ }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function thumbDataUrl(json) {
    const c = document.createElement('canvas');
    c.width = THUMB_W; c.height = THUMB_H;
    drawStadium(c, json);
    return c.toDataURL('image/webp', 0.8);
  }

  // ------------------------------------------------------------ tarjetas
  const authorName = (m) => (m.author && (m.author.username || m.author)) || 'Local';
  const fmtDate = (v) => { try { return new Date(v).toLocaleDateString(); } catch (_) { return ''; } };

  function cardHtml(m, i) {
    const img = m.local ? `<canvas class="map-thumb" width="${THUMB_W}" height="${THUMB_H}" data-local="${i}"></canvas>`
      : `<img class="map-thumb" alt="" loading="lazy" src="${escapeHtml(API + '/maps/' + encodeURIComponent(m.id) + '/thumb')}" />`;
    const dl = m.local ? 'Guardado' : `${Number(m.downloads) || 0} usos`;
    return `<button class="map-card" type="button" data-i="${i}">
      ${img}
      <span class="map-card-body">
        <span class="map-card-name">${escapeHtml(m.name)}</span>
        <span class="map-card-meta">${escapeHtml(authorName(m))} · ${escapeHtml(dl)}</span>
      </span></button>`;
  }

  function renderGrid(emptyMsg) {
    const grid = $('#maps-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<p class="hint maps-empty">${emptyMsg}</p>`;
      return;
    }
    grid.innerHTML = list.map(cardHtml).join('');
    grid.querySelectorAll('canvas[data-local]').forEach((c) => {
      const m = list[Number(c.dataset.local)];
      const p = parseStadium(m.map);
      if (p.ok) drawStadium(c, p.json);
    });
  }

  function setStatus(t) { const el = $('#maps-status'); if (el) el.textContent = t || ''; }

  async function refresh() {
    if (!$('#panel-mapas')) return;
    if (tab === 'saved') {
      list = library.map((m) => ({ ...m, local: true }))
        .filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase()));
      setStatus('');
      return renderGrid('Todavía no guardaste mapas. Abrí uno de la comunidad y tocá "Guardar".');
    }
    if (!API) {
      list = [];
      setStatus('');
      return renderGrid('Los mapas de la comunidad necesitan FRIENDS_API_URL en config.js.');
    }
    setStatus('Cargando mapas…');
    try {
      const qs = new URLSearchParams({ sort, q: query, mine: tab === 'mine' ? '1' : '0' });
      const r = await api('GET', '/maps?' + qs.toString());
      list = Array.isArray(r.maps) ? r.maps : [];
      setStatus('');
      renderGrid(tab === 'mine' ? 'Todavía no subiste mapas.' : 'No hay mapas que coincidan. Sé la primera persona en subir uno.');
    } catch (e) {
      list = [];
      setStatus('');
      renderGrid(escapeHtml(e.message || 'No se pudieron cargar los mapas.'));
    }
  }

  // ------------------------------------------------------------ detalle
  function openModal(id) { const m = $(id); if (m) m.hidden = false; }
  function closeModal(id) { const m = $(id); if (m) m.hidden = true; }

  function paintDetail() {
    if (!current) return;
    const c = $('#map-detail-canvas');
    drawStadium(c, current.json, { invisible: $('#map-detail-invisible').checked });
  }

  async function openDetail(item) {
    let text = item.map || null;
    if (!text) {
      try { const full = await api('GET', '/maps/' + encodeURIComponent(item.id)); text = full.map; }
      catch (e) { return showToast(e.message || 'No se pudo abrir el mapa'); }
    }
    const p = parseStadium(text);
    if (!p.ok) return showToast(p.error);
    current = { item, text, json: p.json };
    const j = p.json;
    $('#map-detail-name').textContent = item.name || j.name || 'Mapa';
    $('#map-detail-desc').textContent = item.description || '';
    $('#map-detail-meta').textContent =
      `${authorName(item)} · ${num(j.width, 0) * 2 || num(j.bg && j.bg.width, 0) * 2}×${num(j.height, 0) * 2 || num(j.bg && j.bg.height, 0) * 2} · ${(text.length / 1024).toFixed(1)} KB`;
    $('#map-detail-invisible').checked = false;
    $('#map-save-btn').textContent = isSaved(item.id) ? 'Quitar de guardados' : 'Guardar';
    $('#map-delete-btn').hidden = !(me && item.author && item.author.username === me.username && !item.local);
    $('#map-report-btn').hidden = !!item.local;
    openModal('#map-detail');
    paintDetail();
  }

  function downloadCurrent() {
    if (!current) return;
    const safe = (current.item.name || 'mapa').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'mapa';
    const url = URL.createObjectURL(new Blob([current.text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = safe + '.hbs';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (!current.item.local && API) api('POST', `/maps/${encodeURIComponent(current.item.id)}/use`).catch(() => {});
  }

  async function toggleSave() {
    if (!current) return;
    const it = current.item;
    if (isSaved(it.id)) {
      library = library.filter((m) => m.id !== it.id);
      $('#map-save-btn').textContent = 'Guardar';
      showToast('Quitado de guardados', 'ok');
    } else {
      if (library.length >= LIB_MAX) return showToast(`Máximo ${LIB_MAX} mapas guardados`);
      library.unshift({ id: it.id, name: it.name, author: authorName(it), description: it.description || '', map: current.text, savedAt: Date.now() });
      $('#map-save-btn').textContent = 'Quitar de guardados';
      showToast('Guardado en tu PC', 'ok');
      if (!it.local && API) api('POST', `/maps/${encodeURIComponent(it.id)}/use`).catch(() => {});
    }
    await saveLibrary();
    if (tab === 'saved') refresh();
  }

  async function deleteCurrent() {
    if (!current || !window.confirm('¿Eliminar este mapa de la comunidad? No se puede deshacer.')) return;
    try {
      await api('DELETE', '/maps/' + encodeURIComponent(current.item.id));
      closeModal('#map-detail'); showToast('Mapa eliminado', 'ok'); refresh();
    } catch (e) { showToast(e.message || 'No se pudo eliminar'); }
  }

  async function reportCurrent() {
    if (!current || !window.confirm('¿Reportar este mapa por contenido inapropiado o engañoso?')) return;
    try { await api('POST', `/maps/${encodeURIComponent(current.item.id)}/report`, { reason: 'user-report' }); showToast('Reporte enviado', 'ok'); }
    catch (e) { showToast(e.message || 'No se pudo reportar'); }
  }

  // ------------------------------------------------------------ subida
  function resetUpload() {
    upload = null;
    $('#map-upload-form').hidden = true;
    $('#map-upload-error').textContent = '';
    $('#map-upload-name').value = '';
    $('#map-upload-desc').value = '';
    $('#map-upload-file').value = '';
    $('#map-upload-publish').disabled = true;
    $('#map-upload-local').disabled = true;
  }

  function openUpload() {
    resetUpload();
    openModal('#map-upload');
  }

  async function handleFile(file) {
    if (!file) return;
    const err = $('#map-upload-error');
    err.textContent = '';
    if (file.size > MAP_MAX_BYTES) { err.textContent = 'El mapa pesa más de 512 KB.'; return; }
    const text = await file.text();
    const p = parseStadium(text);
    if (!p.ok) { err.textContent = p.error; $('#map-upload-form').hidden = true; return; }
    const name = String(p.json.name || file.name.replace(/\.(hbs|json)$/i, '') || 'Mapa').slice(0, 60);
    upload = { text: p.repaired ? JSON.stringify(p.json) : text, json: p.json };
    $('#map-upload-name').value = name;
    $('#map-upload-form').hidden = false;
    drawStadium($('#map-upload-canvas'), p.json);
    $('#map-upload-publish').disabled = false;
    $('#map-upload-local').disabled = false;
  }

  async function publish() {
    if (!upload) return;
    const name = $('#map-upload-name').value.trim().slice(0, 60);
    if (!name) { $('#map-upload-error').textContent = 'Poné un nombre al mapa.'; return; }
    if (!API) { $('#map-upload-error').textContent = 'Falta FRIENDS_API_URL en config.js.'; return; }
    if (!me) { $('#map-upload-error').textContent = 'Para subir mapas vinculá tu Discord en Social.'; return; }
    const btn = $('#map-upload-publish');
    btn.disabled = true;
    try {
      await api('POST', '/maps', {
        name,
        description: $('#map-upload-desc').value.trim().slice(0, 200),
        map: upload.text,
        thumb: thumbDataUrl(upload.json),
      });
      closeModal('#map-upload');
      showToast('Mapa publicado', 'ok');
      setTab('mine');
    } catch (e) {
      $('#map-upload-error').textContent = e.message || 'No se pudo publicar.';
      btn.disabled = false;
    }
  }

  async function saveUploadLocal() {
    if (!upload) return;
    const name = $('#map-upload-name').value.trim().slice(0, 60) || 'Mapa';
    if (library.length >= LIB_MAX) { $('#map-upload-error').textContent = `Máximo ${LIB_MAX} mapas guardados.`; return; }
    library.unshift({ id: 'local-' + Date.now().toString(36), name, author: 'Local', description: '', map: upload.text, savedAt: Date.now() });
    await saveLibrary();
    closeModal('#map-upload');
    showToast('Guardado en tu PC', 'ok');
    setTab('saved');
  }

  // ------------------------------------------------------------ pestañas y eventos
  function setTab(next) {
    tab = next;
    document.querySelectorAll('.maps-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#maps-sort').hidden = tab === 'saved';
    refresh();
  }

  async function loadMe() {
    me = null;
    if (!API || !(await token())) return;
    try { me = await api('GET', '/me'); } catch (_) {}
  }

  function bind() {
    document.querySelectorAll('.maps-tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('#maps-sort')?.addEventListener('change', (e) => { sort = e.target.value; refresh(); });
    $('#maps-search')?.addEventListener('input', (e) => {
      query = e.target.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refresh, 250);
    });
    $('#maps-upload-btn')?.addEventListener('click', openUpload);
    $('#maps-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.map-card');
      if (card) openDetail(list[Number(card.dataset.i)]);
    });

    // detalle
    $('#map-detail-invisible')?.addEventListener('change', paintDetail);
    $('#map-download-btn')?.addEventListener('click', downloadCurrent);
    $('#map-save-btn')?.addEventListener('click', toggleSave);
    $('#map-delete-btn')?.addEventListener('click', deleteCurrent);
    $('#map-report-btn')?.addEventListener('click', reportCurrent);

    // subida
    const drop = $('#map-drop');
    $('#map-upload-file')?.addEventListener('change', (e) => handleFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop?.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    $('#map-upload-publish')?.addEventListener('click', publish);
    $('#map-upload-local')?.addEventListener('click', saveUploadLocal);

    // cierre de modales (botón, fondo o Escape)
    document.querySelectorAll('.map-modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.map-modal').forEach((m) => { m.hidden = true; });
    });

    document.querySelector('.nav-btn[data-panel="panel-mapas"]')?.addEventListener('click', async () => {
      await loadMe();
      refresh();
    });
  }

  // ------------------------------------------------------------ arranque
  bind();
  (async () => { await loadLibrary(); await loadMe(); })();
})();