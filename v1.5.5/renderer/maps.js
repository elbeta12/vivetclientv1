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
  // La biblioteca vive en memoria y solo este archivo la modifica, así que se
  // lee del disco UNA vez. Antes cada apertura del selector de mapas volvía a
  // pedir toda la biblioteca (hasta 40 mapas) por IPC: era una gran parte de la lentitud.
  let libraryLoaded = false;
  async function loadLibrary() {
    try {
      const v = await window.vivet.getConfig(LIB_KEY, []);
      library = Array.isArray(v) ? v : [];
    } catch (_) { library = []; }
    libraryLoaded = true;
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

  // Dibuja las miniaturas de mapas guardados en tandas de ~8 ms por cuadro, en
  // vez de parsear y dibujar los 40 de golpe (congelaba la UI al abrir el selector).
  function drawLocalThumbs(grid, items) {
    const canvases = Array.from(grid.querySelectorAll('canvas[data-local]'));
    let k = 0;
    const step = () => {
      const t0 = performance.now();
      while (k < canvases.length && performance.now() - t0 < 8) {
        const c = canvases[k++];
        if (!c.isConnected) continue;
        const m = items[Number(c.dataset.local)];
        if (!m) continue;
        const p = parseStadium(m.map);
        if (p.ok) drawStadium(c, p.json);
      }
      if (k < canvases.length) requestAnimationFrame(step);
    };
    if (canvases.length) requestAnimationFrame(step);
  }

  function renderGrid(emptyMsg) {
    const grid = $('#maps-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<p class="hint maps-empty">${emptyMsg}</p>`;
      return;
    }
    grid.innerHTML = list.map(cardHtml).join('');
    drawLocalThumbs(grid, list);
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
    // Se compara por id (los nombres de Discord pueden repetirse). Si el servidor
    // todavía no manda author.id, el botón queda oculto (el servidor igual valida).
    const mine = !!(me && item.author && item.author.id != null && Number(item.author.id) === Number(me.id));
    $('#map-delete-btn').hidden = !(mine && !item.local);
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

    // mapas dentro de la sala (guardados / comunidad / míos), sin descargar nada
    $('#room-maps-btn')?.addEventListener('click', openRoomMaps);
    document.querySelectorAll('.rm-tab').forEach((b) => b.addEventListener('click', () => setRoomTab(b.dataset.rtab)));
    $('#room-maps-search')?.addEventListener('input', (e) => {
      roomMapsQuery = e.target.value.trim();
      clearTimeout(roomTimer);
      roomTimer = setTimeout(refreshRoomMaps, roomTab === 'saved' ? 0 : 250);
    });
    $('#room-maps-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.map-card');
      const item = card && roomMapsShown[Number(card.dataset.i)];
      if (item) useRoomMap(item);
    });
    $('#map-use-btn')?.addEventListener('click', useCurrentInRoom);
    $('#room-maps-grid')?.addEventListener('pointerover', (e) => {
      const card = e.target.closest('.map-card');
      const item = card && roomMapsShown[Number(card.dataset.i)];
      if (item && !item.local) mapTextOf(item).catch(() => {});
    });

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

  // ------------------------------------------------------------ cargar un mapa guardado en TU sala
  // Se usa desde el botón "Mapas" que flota sobre el juego mientras estás en
  // una sala. Haxball solo deja cambiar el estadio al admin y con el partido
  // parado, y solo lo hace desde su botón "Pick" (abre un selector de archivos).
  // Igual que en replays.js: se toca ese botón, se intercepta el selector de
  // archivos y se le entrega el .hbs guardado. Todo esto corre DENTRO del juego.
  function pickStadiumInPage(name, text) {
    try {
      var visible = function (el) { return !el.getClientRects || el.getClientRects().length > 0; };
      var room = document.querySelector('.room-view');
      if (!room) return document.querySelector('.game-state-view') ? 'in-game' : 'no-room';

      var btn = room.querySelector('[data-hook=stadium-pick], [data-hook=pick-stadium]');
      if (!btn) {
        var nm = room.querySelector('[data-hook=stadium-name]');
        var p = nm;
        for (var i = 0; i < 3 && p && !btn; i++) {
          p = p.parentElement;
          if (!p) break;
          var bs = p.querySelectorAll('button');
          for (var k = 0; k < bs.length && !btn; k++) {
            if (/stadium|pick|elegir|escoger|choose|select|selecc|cambiar/i.test((bs[k].getAttribute('data-hook') || '') + ' ' + (bs[k].textContent || ''))) btn = bs[k];
          }
          if (!btn && bs.length === 1) btn = bs[0];
        }
      }
      if (!btn) return 'no-button';
      if (btn.disabled) {
        var stop = room.querySelector('[data-hook=stop-btn]');
        return stop && !stop.disabled && visible(stop) ? 'in-game' : 'not-host';
      }

      // Estado que lee después el renderer (pickStateInPage).
      var nmBefore = room.querySelector('[data-hook=stadium-name]');
      var S = window.__vivetPick = { state: 'pending', info: '', before: nmBefore ? (nmBefore.textContent || '').trim() : '' };
      var file = new File([text], name + '.hbs', { type: 'application/json' });
      var origClick = HTMLInputElement.prototype.click;
      var fed = false;
      var restore = function () { HTMLInputElement.prototype.click = origClick; };
      var feed = function (input) {
        if (fed) return;
        fed = true;
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        S.state = 'ok';
      };
      // Si Haxball abre el selector con input.click() (creando el <input> al vuelo),
      // se intercepta acá en vez de dejar que abra el diálogo del sistema.
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file' && !fed) { feed(this); return; }
        return origClick.apply(this, arguments);
      };

      // Muchas versiones de Haxball abren primero un MENÚ (estadios de fábrica +
      // una opción "Load"/"Cargar"). Si aparece, se toca esa opción.
      var LOAD = /^\s*(load|load stadium|load a stadium|cargar|cargar mapa|cargar estadio|custom|personalizado|abrir|open|browse|examinar|upload)\s*(\.\.\.|…)?\s*$/i;
      var loadCands = function () {
        var out = [], els = document.querySelectorAll('button, div, a, li, span, p');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.childElementCount > 3) continue; // contenedores grandes: textContent caro y nunca es la opción
          if (!LOAD.test(el.textContent || '') || !visible(el)) continue;
          if (el.children && el.children.length && LOAD.test(el.children[0].textContent || '')) continue; // el más interno
          out.push(el);
        }
        return out;
      };
      var before = loadCands();
      var describe = function () {
        var parts = [], boxes = document.querySelectorAll('.dialog, [class*=menu], [class*=popup], [class*=dropdown], [class*=context], [class*=picker]');
        for (var i = 0; i < boxes.length; i++) {
          if (visible(boxes[i])) parts.push((boxes[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90));
        }
        return parts.join(' | ').slice(0, 220);
      };

      btn.click();

      var tries = 0, clickedLoad = false;
      var timer = setInterval(function () {
        tries++;
        if (fed) { clearInterval(timer); setTimeout(restore, 300); return; }
        var input = document.querySelector('input[type=file]');
        if (input) { feed(input); clearInterval(timer); setTimeout(restore, 300); return; }
        if (!clickedLoad) {
          var now = loadCands().filter(function (el) { return before.indexOf(el) < 0; });
          if (now.length) {
            clickedLoad = true;
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
              try { now[0].dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); } catch (_) {}
            });
          }
        }
        if (tries >= 40) {
          clearInterval(timer);
          restore();
          S.state = 'no-picker';
          S.info = describe();
        }
      }, 100);
      return 'started';
    } catch (e) {
      return 'error:' + ((e && e.message) || e);
    }
  }

  function pickStateInPage() {
    try { return window.__vivetPick ? { state: window.__vivetPick.state, info: window.__vivetPick.info, before: window.__vivetPick.before } : null; }
    catch (e) { return null; }
  }

  // Lee cómo quedó el lobby: nombre del estadio y, si Haxball abrió un
  // diálogo (p. ej. "error al cargar el estadio"), su texto.
  function stadiumStatusInPage() {
    try {
      var nm = document.querySelector('.room-view [data-hook=stadium-name]');
      var dlg = document.querySelector('.dialog');
      return { name: nm ? (nm.textContent || '').trim() : '', dialog: dlg ? (dlg.textContent || '').trim().slice(0, 160) : '' };
    } catch (e) { return { name: '', dialog: '' }; }
  }

  const ROOM_MAP_MSG = {
    'no-room': 'Entrá o creá una sala primero',
    'in-game': 'Pará el partido para cambiar el mapa',
    'not-host': 'Solo el admin de la sala puede cambiar el mapa',
    'no-button': 'No encontré el botón de estadio de Haxball. Cambialo a mano con "Pick"',
    'no-picker': 'Haxball no abrió el selector de mapa. Probá de nuevo',
  };

  // Devuelve 'ok' o el código del fallo ('no-room', 'in-game', 'not-host', ...).
  // opts.silentNoRoom: no avisar si todavía no hay sala (lo usa la cola de "usar en mi sala").
  async function loadMapIntoRoom(entry, opts = {}) {
    const fail = (code, msg) => { if (!(opts.silentNoRoom && code === 'no-room')) showToast(msg); return code; };
    if (!appRoot.classList.contains('playing') || replayMode || creatingRoom) return fail('no-room', 'Entrá o creá una sala primero');
    const p = parseStadium(entry.map);
    if (!p.ok) return fail('bad-map', p.error);
    // Si el archivo necesitó reparación (comentarios, comas finales), se manda limpio.
    const text = p.repaired ? JSON.stringify(p.json) : entry.map;
    const name = String(entry.name || p.json.name || 'mapa').replace(/[^\w\- ]+/g, '').trim() || 'mapa';
    const asScript = (fn, ...args) => '(' + fn.toString() + ')(' + args.map((a) => JSON.stringify(a)).join(',') + ');';
    let out;
    try {
      const results = await execInAllFrames(asScript(pickStadiumInPage, name, text));
      const vals = results.filter((r) => r.ok && typeof r.value === 'string').map((r) => r.value);
      // El frame del juego es el único que no contesta 'no-room'.
      out = vals.find((v) => v !== 'no-room') || 'no-room';
    } catch (_) { out = 'error'; }
    if (out !== 'started') return fail(out, ROOM_MAP_MSG[out] || 'No se pudo cargar el mapa');

    // La inyección es asíncrona (espera el menú / el selector de Haxball): se sondea el resultado.
    let state = null;
    for (let i = 0; i < 90 && !(state && state.state !== 'pending'); i++) {
      await new Promise((r) => setTimeout(r, 80));
      try {
        const results = await execInAllFrames('(' + pickStateInPage.toString() + ')();');
        state = (results.find((r) => r.ok && r.value && r.value.state) || {}).value || state;
      } catch (_) {}
    }
    if (!state || state.state !== 'ok') {
      const extra = state && state.info ? ` (Haxball mostró: ${state.info})` : '';
      return fail('no-picker', ROOM_MAP_MSG['no-picker'] + extra);
    }

    // Antes: espera fija de 900 ms. Ahora se revisa cada 100 ms y se sale apenas
    // cambia el nombre del estadio o Haxball muestra un error (máx. ~1,2 s).
    const ERR = /error|invalid|inv[aá]lid|no se pudo|could not|failed/i;
    const before = (state && state.before) || '';
    let st = null;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const results = await execInAllFrames(asScript(stadiumStatusInPage));
        st = (results.find((r) => r.ok && r.value && (r.value.name || r.value.dialog)) || {}).value || st;
      } catch (_) {}
      if (st && ((st.dialog && ERR.test(st.dialog)) || (st.name && st.name !== before))) break;
    }
    if (st && st.dialog && /error|invalid|inv[aá]lid|no se pudo|could not|failed/i.test(st.dialog)) {
      return fail('rejected', 'Haxball rechazó el mapa: ' + st.dialog);
    }
    showToast(st && st.name ? `Mapa cargado: ${st.name}` : 'Mapa cargado', 'ok');
    try { focusGameView(); } catch (_) {}
    return 'ok';
  }

  // Trae el texto del .hbs de un mapa (guardado, de la comunidad o tuyo) sin
  // guardarlo ni descargarlo: queda solo en memoria hasta entregárselo a Haxball.
  // El texto se guarda en memoria (y se pide apenas pasás el mouse por la
  // tarjeta), así al hacer click el mapa ya está y no hay que esperar al servidor.
  const textCache = new Map();
  async function mapTextOf(item) {
    if (item.map) return item.map;
    if (!textCache.has(item.id)) {
      if (textCache.size >= 30) textCache.delete(textCache.keys().next().value);
      textCache.set(item.id, api('GET', '/maps/' + encodeURIComponent(item.id)).then((f) => f.map));
    }
    try { return await textCache.get(item.id); }
    catch (e) { textCache.delete(item.id); throw e; }
  }

  // ------------------------------------------------------------ "usar en mi sala" desde el detalle
  // Desde el panel no hay sala abierta (el panel se oculta al jugar), así que
  // el mapa queda en cola y se pone solo apenas entrás a tu sala.
  let pendingMap = null;
  let pendingRunning = false;
  const PENDING_TTL = 10 * 60 * 1000;

  async function runPending() {
    if (pendingRunning || !pendingMap) return;
    pendingRunning = true;
    const job = pendingMap;
    try {
      for (let i = 0; i < 60 && pendingMap === job; i++) {
        if (Date.now() - job.at > PENDING_TTL) { pendingMap = null; break; }
        if (!appRoot.classList.contains('playing')) break;   // salió: queda en cola
        if (!creatingRoom && !replayMode) {
          const r = await loadMapIntoRoom(job.entry, { silentNoRoom: true });
          if (r !== 'no-room') { if (pendingMap === job) pendingMap = null; break; }
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    } finally { pendingRunning = false; }
  }
  new MutationObserver(() => { if (pendingMap && appRoot.classList.contains('playing')) runPending(); })
    .observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  function useCurrentInRoom() {
    if (!current) return;
    const entry = { name: current.item.name || current.json.name || 'mapa', map: current.text };
    closeModal('#map-detail');
    if (appRoot.classList.contains('playing') && !replayMode && !creatingRoom) { loadMapIntoRoom(entry); return; }
    pendingMap = { entry, at: Date.now() };
    showToast('Listo: se pondrá apenas entres a tu sala como admin', 'ok');
  }

  // ------------------------------------------------------------ selector dentro de la sala
  let roomTab = 'saved';            // saved | community | mine
  let roomMapsQuery = '';
  let roomMapsShown = [];
  let roomSeq = 0;
  let roomTimer = null;

  function paintRoomGrid(emptyMsg) {
    const grid = $('#room-maps-grid');
    if (!grid) return;
    if (!roomMapsShown.length) { grid.innerHTML = `<p class="hint maps-empty">${emptyMsg}</p>`; return; }
    grid.innerHTML = roomMapsShown.map(cardHtml).join('');
    drawLocalThumbs(grid, roomMapsShown);
  }

  async function refreshRoomMaps() {
    const grid = $('#room-maps-grid');
    if (!grid) return;
    const seq = ++roomSeq;
    const q = roomMapsQuery.toLowerCase();
    if (roomTab === 'saved') {
      roomMapsShown = library.filter((m) => !q || m.name.toLowerCase().includes(q)).map((m) => ({ ...m, local: true }));
      return paintRoomGrid(library.length
        ? 'Ningún mapa coincide con la búsqueda.'
        : 'Todavía no tenés mapas guardados. Mirá la pestaña Comunidad: podés usar cualquiera directo, sin guardarlo.');
    }
    if (!API) { roomMapsShown = []; return paintRoomGrid('Los mapas de la comunidad necesitan FRIENDS_API_URL en config.js.'); }
    grid.innerHTML = '<p class="hint maps-empty">Cargando mapas…</p>';
    try {
      const qs = new URLSearchParams({ sort: 'recent', q: roomMapsQuery, mine: roomTab === 'mine' ? '1' : '0' });
      const r = await api('GET', '/maps?' + qs.toString());
      if (seq !== roomSeq) return;
      roomMapsShown = Array.isArray(r.maps) ? r.maps : [];
      paintRoomGrid(roomTab === 'mine' ? 'Todavía no subiste mapas.' : 'No hay mapas que coincidan.');
    } catch (e) {
      if (seq !== roomSeq) return;
      roomMapsShown = [];
      paintRoomGrid(escapeHtml(e.message || 'No se pudieron cargar los mapas.'));
    }
  }

  function setRoomTab(next) {
    roomTab = next;
    document.querySelectorAll('.rm-tab').forEach((b) => b.classList.toggle('active', b.dataset.rtab === roomTab));
    refreshRoomMaps();
  }

  async function openRoomMaps() {
    if (!libraryLoaded) await loadLibrary();
    roomMapsQuery = '';
    const q = $('#room-maps-search');
    if (q) q.value = '';
    openModal('#room-maps-modal');
    setRoomTab(library.length ? 'saved' : 'community');
  }

  async function useRoomMap(item) {
    closeModal('#room-maps-modal');
    let text;
    try { text = await mapTextOf(item); }
    catch (e) { return showToast(e.message || 'No se pudo traer el mapa'); }
    const r = await loadMapIntoRoom({ name: item.name, map: text });
    if (r === 'ok' && !item.local && API) api('POST', `/maps/${encodeURIComponent(item.id)}/use`).catch(() => {});
  }

  // ------------------------------------------------------------ arranque
  bind();
  (async () => { await loadLibrary(); await loadMe(); })();
})();