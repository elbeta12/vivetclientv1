// Vivet Client - renderer/workshop.js
// Pestaña "Workshop": sets de apariencia de la comunidad (colores, formas de botones, fuentes, fondos
// fijos o animados y CSS propio). Se inyecta SOLA en la barra lateral y en el <main>: no hace falta
// tocar index.html salvo agregar <script src="workshop.js"></script> al final.
// Necesita el parche de Apariencia (window.VivetAppearance, ver PARCHE-WORKSHOP.md). Si falta, la pestaña
// avisa y NO rompe nada del cliente. Habla con server/workshop.js.
try {
(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  const main = $('.main');
  const navAp = $('.nav-btn[data-panel="panel-apariencia"]');
  if (!main || !navAp || window.__vivetWorkshopLoaded) return;
  window.__vivetWorkshopLoaded = true;
  const esc = (s) => escapeHtml(String(s ?? ''));
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
  const api = () => window.vivetApi;
  const loggedIn = () => !!(api() && api().loggedIn());
  const req = (m, p, b) => api().request(m, p, b);
  const AP = () => window.VivetAppearance;
  const cfgGet = (k, d) => { try { return window.vivet.getConfig(k, d); } catch (_) { return Promise.resolve(d); } };
  const cfgSet = (k, v) => { try { window.vivet.setConfig(k, v).catch(() => {}); } catch (_) {} };

  // Qué claves del set pertenecen a cada "pieza" (para conservar las tuyas).
  const GROUPS = {
    colors: ['club', 'custom1', 'custom2', 'strength', 'btn', 'stadium'],
    base: ['base'],
    font: ['font'],
    shape: ['radius', 'density', 'cards', 'sidebar', 'btnshape', 'hero', 'scale'],
    bg: ['dim'],
  };
  const KEEP = [['colors', 'Colores'], ['base', 'Fondo base'], ['font', 'Fuente'], ['shape', 'Formas y botones'], ['bg', 'Imagen de fondo'], ['css', 'CSS del set']];
  const SET_KEYS = [...Object.values(GROUPS).flat()];

  // ------------------------------------------------------------ pestaña + panel
  // Si index.html ya trae el botón y la sección, se reutilizan; si no, se crean acá.
  let nav = $('.nav-btn[data-panel="panel-workshop"]');
  if (!nav) {
    nav = document.createElement('button');
    nav.className = 'nav-btn'; nav.type = 'button'; nav.dataset.panel = 'panel-workshop'; nav.textContent = 'Workshop';
    nav.setAttribute('data-i18n-skip', '');
    navAp.after(nav);
  }
  let panel = $('#panel-workshop');
  const panelIsNew = !panel;
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'panel-workshop'; panel.className = 'panel'; panel.setAttribute('data-i18n-skip', '');
  }
  if (!panel.querySelector('#ws-root')) panel.innerHTML = '<div class="panel-header"><h2>Workshop</h2><p class="hint">Sets de apariencia hechos por la comunidad: colores, formas de botones, fuentes, fondos fijos o animados y más. Probalos antes de obtenerlos, publicá los tuyos (gratis o con precio en Vcoins) y apoyá a los creadores con propinas.</p></div><div id="ws-root"></div><div style="height:24px"></div>';
  if (panelIsNew) main.appendChild(panel);
  const root = panel.querySelector('#ws-root');

  // app.js solo conoce los botones que existían al cargar: este se maneja acá.
  nav.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b === nav));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p === panel));
    onOpen();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.nav-btn');
    if (b && b !== nav) nav.classList.remove('active');
  }, true);

  // ------------------------------------------------------------ estilos propios (lo mínimo; el resto reutiliza clases de Mapas)
  const css = document.createElement('style');
  css.textContent = `
  .ws-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 32px 14px}
  .ws-bar .search-box{flex:1 1 180px;min-width:160px}
  .ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin:0 32px 18px}
  .ws-grid .hint{grid-column:1/-1;padding:24px 0}
  .ws-banner{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-color:var(--accent-border)}
  .ws-sp{flex:1}
  .ws-chks{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px}
  .ws-chk{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer}
  .ws-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:700;background:var(--accent-soft);color:var(--accent);vertical-align:middle}
  .ws-earn{margin:0 32px 12px;display:flex;gap:10px;flex-wrap:wrap}
  .ws-modal-body{display:flex;flex-direction:column;gap:12px}
  .ws-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--border);background:var(--bg-elev-3)}
  .ws-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .ws-row input[type=number]{width:110px}
  .ws-chips{display:flex;flex-wrap:wrap;gap:6px}
  .ws-modal-body textarea{width:100%;min-height:120px;resize:vertical;background:var(--bg-elev-3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:10px;font:12px Consolas,monospace;outline:none}
  .ws-modal-body textarea:focus,.ws-modal-body input:focus{border-color:var(--accent)}
  .ws-modal-body input[type=text],.ws-modal-body input[type=number]{background:var(--bg-elev-3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:9px 12px;outline:none;font:inherit}`;
  document.head.appendChild(css);

  // ------------------------------------------------------------ estado
  const S = { tab: 'browse', sort: 'new', q: '', free: false, page: 0, more: false, sets: [], loading: false, err: '', earn: null };
  let active = null;    // { id, name, keep: [], set: { settings, css, bg_url, updated_at } }
  let preview = null;   // { name, set } (prueba temporal, no se guarda)
  let searchT = null;

  // ------------------------------------------------------------ aplicar un set (no toca lo guardado por la persona)
  function overlayOf(set, keep) {
    const o = {}, s = (set && set.settings) || {};
    for (const [g, keys] of Object.entries(GROUPS)) {
      if (keep.includes(g)) continue;
      for (const k of keys) if (s[k] !== undefined) o[k] = s[k];
    }
    if (!keep.includes('bg') && set && set.bg_url) o.image = API + set.bg_url;
    return o;
  }
  function applyCssText(text) {
    let st = document.getElementById('vv-ws-css');
    const bad = !text || /@import|url\s*\(|<|\\/.test(text);
    if (bad) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = 'vv-ws-css'; document.head.appendChild(st); }
    st.textContent = text;
  }
  function applyNow() {
    if (!AP()) return;
    const a = preview ? { set: preview.set, keep: [] } : active;
    if (!a) { AP().overlay(null); applyCssText(''); return; }
    AP().overlay(overlayOf(a.set, a.keep || []));
    applyCssText((a.keep || []).includes('css') ? '' : a.set.css);
  }
  const saveActive = () => cfgSet('wsActive', active);

  function equip(d) {
    active = { id: d.id, name: d.name, keep: active && active.id === d.id ? active.keep : [], set: { settings: d.settings, css: d.css, bg_url: d.bg_url, updated_at: d.updated_at } };
    preview = null; saveActive(); applyNow(); render();
    toast(`Set "${d.name}" activado`, 'ok');
  }
  function unequip() { active = null; preview = null; saveActive(); applyNow(); render(); }

  // ------------------------------------------------------------ datos
  const urlThumb = (s) => `${API}/workshop/sets/${encodeURIComponent(s.id)}/thumb?v=${s.updated_at}`;

  async function loadList(append) {
    if (S.loading || !loggedIn()) return;
    S.loading = true; S.err = '';
    if (!append) { S.page = 0; S.sets = []; paintGrid(); }
    try {
      const p = new URLSearchParams({ sort: S.sort, q: S.q, page: String(S.page) });
      if (S.tab === 'mine') p.set('mine', '1');
      if (S.tab === 'owned') p.set('owned', '1');
      if (S.tab === 'browse' && S.free) p.set('free', '1');
      const r = await req('GET', '/workshop/sets?' + p);
      S.sets = append ? S.sets.concat(r.sets || []) : (r.sets || []);
      S.more = !!r.has_more;
    } catch (e) { S.err = e.message || 'No se pudo cargar el workshop.'; S.more = false; }
    S.loading = false;
    paintGrid();
  }
  async function loadEarnings() {
    S.earn = null;
    if (S.tab !== 'mine' || !loggedIn()) return paintEarn();
    try { S.earn = await req('GET', '/workshop/earnings'); } catch (_) {}
    paintEarn();
  }

  // ------------------------------------------------------------ vistas
  function bannerHtml() {
    if (preview) return `<div class="card ws-banner"><div><b>Probando: ${esc(preview.name)}</b><div class="hint">Es solo una prueba: no se guarda.</div></div><span class="ws-sp"></span><button class="ghost-btn" data-act="stop-preview" type="button">Salir de la prueba</button></div>`;
    if (!active) return '';
    const checks = KEEP.map(([g, l]) => `<label class="ws-chk"><input type="checkbox" data-keep="${g}"${active.keep.includes(g) ? ' checked' : ''} /> ${l}</label>`).join('');
    return `<div class="card ws-banner"><div><b>Set activo: ${esc(active.name)}</b><div class="hint">Marcá lo que querés conservar de tu propia apariencia (el set no lo pisa):</div><div class="ws-chks">${checks}</div></div><span class="ws-sp"></span><button class="ghost-btn" data-act="unequip" type="button">Quitar set</button></div>`;
  }
  function shellHtml() {
    return `<div id="ws-banner">${bannerHtml()}</div>
      <div class="ws-bar">
        <div class="maps-tabs">${[['browse', 'Explorar'], ['owned', 'Mis sets'], ['mine', 'Publicados por mí']].map(([k, l]) => `<button class="maps-tab${S.tab === k ? ' active' : ''}" data-act="tab" data-tab="${k}" type="button">${l}</button>`).join('')}</div>
        <div class="search-box"><input id="ws-q" type="text" placeholder="Buscar set..." value="${esc(S.q)}" autocomplete="off" /></div>
        <select id="ws-sort" class="sort-select"><option value="new">Más nuevos</option><option value="popular">Más usados</option><option value="cheap">Más baratos</option><option value="name">Nombre (A-Z)</option></select>
        <label class="ws-chk"><input id="ws-free" type="checkbox"${S.free ? ' checked' : ''} /> Solo gratis</label>
        <button class="primary-btn" data-act="new" type="button">Publicar set</button>
      </div>
      <div id="ws-earn" class="ws-earn"></div>
      <div id="ws-grid" class="ws-grid"></div>
      <div style="text-align:center;margin-bottom:18px"><button id="ws-more" class="ghost-btn" data-act="more" type="button" hidden>Cargar más</button></div>`;
  }
  function cardHtml(s, i) {
    const tags = [s.price ? `${s.price} V` : 'Gratis', s.bg_type ? s.bg_type.toUpperCase() : '', s.has_css ? 'CSS' : ''].filter(Boolean);
    const act = active && active.id === s.id;
    return `<button class="map-card" type="button" data-i="${i}"><img class="map-thumb" alt="" loading="lazy" src="${esc(urlThumb(s))}" />
      <span class="map-card-body"><span class="map-card-name">${esc(s.name)}${act ? ' <span class="ws-pill">Activo</span>' : ''}</span>
      <span class="map-card-meta">${esc(s.author.username)} · ${esc(tags.join(' · '))} · ${s.installs} usos</span></span></button>`;
  }
  function paintGrid() {
    const g = $('#ws-grid'); if (!g) return;
    if (S.loading && !S.sets.length) g.innerHTML = '<p class="hint">Cargando…</p>';
    else if (S.err) g.innerHTML = `<p class="hint">${esc(S.err)}</p>`;
    else if (!S.sets.length) g.innerHTML = `<p class="hint">${S.tab === 'browse' ? 'Todavía no hay sets. ¡Publicá el primero!' : S.tab === 'owned' ? 'Todavía no obtuviste ningún set.' : 'Todavía no publicaste sets.'}</p>`;
    else g.innerHTML = S.sets.map(cardHtml).join('');
    const m = $('#ws-more'); if (m) m.hidden = !S.more;
  }
  function paintEarn() {
    const el = $('#ws-earn'); if (!el) return;
    const e = S.earn;
    el.innerHTML = e ? `<span class="cl-chip">Ventas: ${e.sales.count} (${e.sales.earned} V netos, ya con el 20% descontado)</span><span class="cl-chip">Propinas: ${e.tips.count} (${e.tips.earned} V)</span>` : '';
  }
  function render() {
    if (!api() || !api().configured) { root.innerHTML = '<div class="card"><p class="hint">El Workshop necesita FRIENDS_API_URL en config.js.</p></div>'; return; }
    if (!AP()) { root.innerHTML = '<div class="card"><h3>Falta un paso</h3><p class="hint">Aplicá el parche de Apariencia (PARCHE-WORKSHOP.md) para activar el Workshop.</p></div>'; return; }
    if (!loggedIn()) { root.innerHTML = '<div class="card"><h3>Conectá tu Discord</h3><p class="hint">Para ver, obtener y publicar sets necesitás tener tu Discord conectado en Social.</p></div>'; return; }
    root.innerHTML = shellHtml();
    const so = $('#ws-sort'); if (so) so.value = S.sort;
    paintGrid(); paintEarn();
  }
  const rerenderBanner = () => { const b = $('#ws-banner'); if (b) b.innerHTML = bannerHtml(); paintGrid(); };

  // ------------------------------------------------------------ ventanas
  function modal(inner) {
    const old = $('#ws-modal'); if (old) old.remove();
    const m = document.createElement('div');
    m.id = 'ws-modal'; m.className = 'map-modal'; m.setAttribute('data-i18n-skip', '');
    m.innerHTML = `<div class="map-modal-box" role="dialog" aria-modal="true">${inner}</div>`;
    m.addEventListener('mousedown', (e) => { if (e.target === m) m.remove(); });
    m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) m.remove(); });
    document.body.appendChild(m);
    return m;
  }
  const chips = (s) => `<div class="ws-chips">${[s.font && `Fuente: ${s.font}`, s.club && `Club: ${s.club}`, s.base && s.base !== 'normal' && `Fondo: ${s.base}`, s.radius && `Esquinas: ${s.radius}`, s.btnshape && s.btnshape !== 'normal' && `Botones: ${s.btnshape}`, s.stadium && s.stadium !== 'none' && `Estadio: ${s.stadium}`]
    .filter(Boolean).map((t) => `<span class="cl-chip">${esc(t)}</span>`).join('')}</div>`;

  async function openDetail(item) {
    const m = modal('<p class="hint">Cargando…</p>');
    let d;
    try { d = await req('GET', '/workshop/sets/' + encodeURIComponent(item.id)); }
    catch (e) { m.remove(); return toast(e.message || 'No se pudo abrir el set'); }
    const own = d.owned || d.mine;
    const isActive = active && active.id === d.id;
    m.querySelector('.map-modal-box').innerHTML = `
      <div class="map-modal-head"><div><h3>${esc(d.name)}</h3><p class="hint">${esc(d.author.username)} · ${d.price ? d.price + ' Vcoins' : 'Gratis'} · ${d.installs} usos</p></div><button class="ghost-btn secondary-action" data-close type="button">Cerrar</button></div>
      <div class="ws-modal-body">
        <img class="ws-img" alt="" src="${esc(urlThumb(d))}" />
        ${d.description ? `<p class="hint">${esc(d.description)}</p>` : ''}
        ${chips(d.settings || {})}
        ${d.bg_url ? '<p class="hint">Incluye fondo de imagen' + (d.bg_type === 'gif' || d.bg_type === 'webp' ? ' (puede ser animado)' : '') + '.</p>' : ''}
        ${d.has_css ? '<p class="hint">Incluye CSS propio.</p>' : ''}
        <div class="map-actions">
          <button class="ghost-btn" data-d="preview" type="button">Probar</button>
          ${own ? (isActive ? '<button class="ghost-btn" data-d="unequip" type="button">Quitar</button>' : '<button class="primary-btn" data-d="equip" type="button">Equipar</button>')
                : `<button class="primary-btn" data-d="buy" type="button">${d.price ? 'Comprar · ' + d.price + ' V' : 'Obtener gratis'}</button>`}
          ${d.mine ? '<button class="ghost-btn" data-d="edit" type="button">Editar</button><button class="ghost-btn secondary-action" data-d="del" type="button">Eliminar</button>'
                   : '<button class="ghost-btn secondary-action" data-d="report" type="button">Reportar</button>'}
        </div>
        ${d.mine ? '' : '<div class="ws-row"><span class="hint">Propina al creador (va entera para él):</span><input id="ws-tip" type="number" min="1" max="5000" value="10" /><button class="ghost-btn" data-d="tip" type="button">Dar propina</button></div>'}
      </div>`;
    m.querySelector('.map-modal-box').addEventListener('click', async (e) => {
      const a = e.target.closest('[data-d]'); if (!a) return;
      const act = a.dataset.d;
      try {
        if (act === 'preview') { preview = { name: d.name, set: { settings: d.settings, css: d.css, bg_url: d.bg_url } }; applyNow(); rerenderBanner(); m.remove(); toast('Probando el set. Podés salir desde la parte de arriba.', 'ok'); }
        else if (act === 'equip') { equip(d); m.remove(); }
        else if (act === 'unequip') { unequip(); m.remove(); }
        else if (act === 'buy') {
          if (d.price && !confirm(`¿Comprar "${d.name}" por ${d.price} Vcoins? El 80% va para el creador.`)) return;
          a.disabled = true;
          await req('POST', `/workshop/sets/${encodeURIComponent(d.id)}/buy`, { price: d.price });
          toast(d.price ? 'Set comprado' : 'Set obtenido', 'ok');
          try { window.vivetShop && window.vivetShop.reload(); } catch (_) {}
          m.remove(); loadList(false);
          d.owned = true; equip(d);
        } else if (act === 'tip') {
          const n = Number(($('#ws-tip') || {}).value);
          if (!Number.isInteger(n) || n < 1) return toast('Poné una cantidad entera de Vcoins');
          await req('POST', `/workshop/sets/${encodeURIComponent(d.id)}/tip`, { amount: n });
          toast('¡Propina enviada, gracias por apoyar!', 'ok');
          try { window.vivetShop && window.vivetShop.reload(); } catch (_) {}
        } else if (act === 'report') {
          if (!confirm('¿Reportar este set por contenido inapropiado o engañoso?')) return;
          await req('POST', `/workshop/sets/${encodeURIComponent(d.id)}/report`, { reason: 'user-report' });
          toast('Reporte enviado', 'ok');
        } else if (act === 'del') {
          if (!confirm('¿Eliminar este set del Workshop? Quienes ya lo tienen lo conservan.')) return;
          await req('DELETE', '/workshop/sets/' + encodeURIComponent(d.id));
          if (active && active.id === d.id) unequip();
          m.remove(); toast('Set eliminado', 'ok'); loadList(false);
        } else if (act === 'edit') { m.remove(); openEditor(d); }
      } catch (err) { toast(err.message || 'No se pudo completar la acción'); a.disabled = false; }
    });
  }

  // ------------------------------------------------------------ editor / publicar
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const rgba = (hex, a) => { const n = parseInt(String(hex).slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  // Miniatura 480x270 dibujada con los colores, la fuente, la forma de botones y el fondo del set.
  async function makeThumb(s, bgSrc) {
    const w = 480, h = 270, [c1, c2] = AP().colors(s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = { normal: '#06070a', amoled: '#000000', navy: '#070b16', graphite: '#0e0f11' }[s.base || 'normal'] || '#06070a';
    g.fillRect(0, 0, w, h);
    let drewBg = false;
    if (bgSrc) {
      try {
        const im = await loadImg(bgSrc); const k = Math.max(w / im.width, h / im.height);
        g.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k);
        g.fillStyle = `rgba(6,7,10,${(s.dim == null ? 55 : s.dim) / 100})`; g.fillRect(0, 0, w, h); drewBg = true;
      } catch (_) {}
    }
    if (!drewBg) {
      [[c1, w, 0, 0.35], [c2, 0, h, 0.28]].forEach(([col, x, y, a]) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, 300); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
    }
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, 96, h);
    for (let i = 0; i < 5; i++) { g.fillStyle = i === 1 ? rgba(s.btn || c1, 0.4) : 'rgba(255,255,255,.1)'; g.fillRect(14, 30 + i * 30, 68, 16); }
    const fonts = window.VivetFonts, fam = fonts && fonts.list[s.font] ? fonts.list[s.font][1] : ({ system: 'Segoe UI', serif: 'Georgia', mono: 'Consolas' }[s.font] || 'Inter');
    try { if (fonts) fonts.load(s.font); await document.fonts.load(`700 30px "${fam}"`); } catch (_) {}
    g.fillStyle = '#eef5fb'; g.font = `700 34px "${fam}", sans-serif`; g.fillText('Vivet Client', 124, 96);
    g.fillStyle = '#93a5b8'; g.font = `500 14px "${fam}", sans-serif`; g.fillText('Así se ve este set', 124, 122);
    const accent = s.btn || c1;
    const shape = s.btnshape || 'normal';
    const rad = shape === 'soft' ? 14 : shape === 'cut' ? 0 : ({ sharp: 3, normal: 9, round: 14, pill: 20 }[s.radius || 'normal']);
    const btn = (x, y, bw, bh, label, filled) => {
      g.save();
      g.beginPath();
      if (shape === 'cut') { const k = 9; g.moveTo(x + k, y); g.lineTo(x + bw, y); g.lineTo(x + bw, y + bh - k); g.lineTo(x + bw - k, y + bh); g.lineTo(x, y + bh); g.lineTo(x, y + k); g.closePath(); }
      else if (g.roundRect) g.roundRect(x, y, bw, bh, rad); else g.rect(x, y, bw, bh);
      if (shape === 'neon') { g.shadowColor = accent; g.shadowBlur = 14; }
      if (filled && shape !== 'outline') { g.fillStyle = accent; g.fill(); }
      else { g.strokeStyle = filled ? accent : 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.stroke(); }
      g.restore();
      g.fillStyle = filled && shape !== 'outline' ? '#04141a' : (filled ? accent : '#eef5fb');
      g.font = `700 14px "${fam}", sans-serif`; g.textAlign = 'center'; g.fillText(label, x + bw / 2, y + bh / 2 + 5); g.textAlign = 'left';
    };
    btn(124, 156, 150, 42, 'Jugar', true);
    btn(290, 156, 110, 42, 'Opciones', false);
    for (const q of [0.82, 0.65, 0.5, 0.35]) {
      const u = c.toDataURL('image/webp', q);
      if (!u.startsWith('data:image/webp')) throw new Error('Tu navegador no pudo generar la vista previa.');
      if (u.length < 120000) return u;
    }
    throw new Error('La vista previa quedó demasiado pesada.');
  }

  function openEditor(ex) {
    const A = AP();
    const d = { settings: ex ? { ...ex.settings } : null, bg: undefined, bgPreview: ex && ex.bg_url ? API + ex.bg_url : '' };
    const m = modal(`
      <div class="map-modal-head"><h3>${ex ? 'Editar set' : 'Publicar set'}</h3><button class="ghost-btn secondary-action" data-close type="button">Cerrar</button></div>
      <div class="ws-modal-body">
        <label class="form-field"><span>Nombre</span><input id="we-name" type="text" maxlength="40" value="${esc(ex ? ex.name : '')}" /></label>
        <label class="form-field"><span>Descripción (opcional)</span><input id="we-desc" type="text" maxlength="200" value="${esc(ex ? ex.description : '')}" /></label>
        <div class="ws-row"><label class="form-field"><span>Precio en Vcoins (0 = gratis)</span><input id="we-price" type="number" min="0" max="50000" value="${ex ? ex.price : 0}" /></label>
          <span class="hint" style="flex:1">Vivet se queda con el 20% de cada venta. Las propinas van enteras para vos.</span></div>
        <div class="card" style="margin:0"><h3>Apariencia del set</h3>
          <p class="hint">Armá tu apariencia en la pestaña Apariencia (colores, fuente, formas, botones, fondo) y tocá el botón para guardarla en el set.</p>
          <div id="we-chips"></div>
          <div class="map-actions" style="margin-top:8px"><button class="ghost-btn" id="we-take" type="button">Tomar mi apariencia actual</button></div></div>
        <div class="card" style="margin:0"><h3>Fondo (opcional)</h3>
          <p class="hint">GIF, WebP animado, PNG o JPEG, máximo 3 MB.</p>
          <div class="ws-row"><button class="ghost-btn" id="we-bgpick" type="button">Elegir fondo</button><button class="ghost-btn secondary-action" id="we-bgclear" type="button">Quitar</button><span class="hint" id="we-bgstat"></span></div>
          <input id="we-bgfile" type="file" accept="image/gif,image/webp,image/png,image/jpeg" hidden /></div>
        <div class="card" style="margin:0"><h3>CSS propio (opcional)</h3>
          <p class="hint">Cambia lo que quieras de la interfaz. No se permiten url(), @import, @font-face ni "\\". Máx. 20 000 caracteres.</p>
          <textarea id="we-css" spellcheck="false" maxlength="20000" placeholder=".card { letter-spacing: .3px; }">${esc(ex ? ex.css : '')}</textarea></div>
        <p class="hint" id="we-err" style="color:var(--danger)"></p>
        <div class="map-actions"><button class="primary-btn" id="we-pub" type="button">${ex ? 'Guardar cambios' : 'Publicar'}</button></div>
      </div>`);
    const paintChips = () => { m.querySelector('#we-chips').innerHTML = d.settings ? chips(d.settings) : '<p class="hint">Todavía no tomaste ninguna apariencia.</p>'; };
    const paintBg = () => {
      m.querySelector('#we-bgstat').textContent = d.bg ? 'Fondo nuevo elegido' : d.bg === null ? 'Sin fondo' : d.bgPreview ? 'Fondo actual conservado' : 'Sin fondo';
    };
    paintChips(); paintBg();
    m.querySelector('#we-take').addEventListener('click', () => {
      const cur = A.get(), o = {};
      SET_KEYS.forEach((k) => { if (cur[k] !== undefined && cur[k] !== '') o[k] = cur[k]; });
      if (cur.club) o.club = cur.club;
      if (cur.btn === '') o.btn = '';
      d.settings = o; paintChips(); toast('Apariencia tomada', 'ok');
    });
    m.querySelector('#we-bgpick').addEventListener('click', () => m.querySelector('#we-bgfile').click());
    m.querySelector('#we-bgclear').addEventListener('click', () => { d.bg = null; paintBg(); });
    m.querySelector('#we-bgfile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (!/^image\/(gif|webp|png|jpeg)$/.test(f.type)) return toast('Tiene que ser GIF, WebP, PNG o JPEG');
      if (f.size > 3 * 1024 * 1024) return toast('El fondo pesa más de 3 MB');
      const fr = new FileReader();
      fr.onload = () => { d.bg = String(fr.result); paintBg(); };
      fr.onerror = () => toast('No se pudo leer el archivo');
      fr.readAsDataURL(f);
    });
    m.querySelector('#we-pub').addEventListener('click', async (e) => {
      const err = m.querySelector('#we-err'); err.textContent = '';
      const name = m.querySelector('#we-name').value.trim();
      if (!name) { err.textContent = 'Poné un nombre al set.'; return; }
      if (!d.settings || !Object.keys(d.settings).length) { err.textContent = 'Tomá tu apariencia actual primero.'; return; }
      e.target.disabled = true;
      try {
        const body = {
          name, description: m.querySelector('#we-desc').value.trim(), price: Number(m.querySelector('#we-price').value) || 0,
          settings: d.settings, css: m.querySelector('#we-css').value,
        };
        if (d.bg !== undefined) body.bg = d.bg;
        body.thumb = await makeThumb(d.settings, d.bg !== undefined ? d.bg : d.bgPreview || null);
        if (ex) await req('PUT', '/workshop/sets/' + encodeURIComponent(ex.id), body);
        else await req('POST', '/workshop/sets', body);
        m.remove(); toast(ex ? 'Set actualizado' : 'Set publicado', 'ok');
        S.tab = 'mine'; render(); loadList(false); loadEarnings();
        if (ex && active && active.id === ex.id) refreshActive();
      } catch (er) { err.textContent = er.message || 'No se pudo publicar.'; e.target.disabled = false; }
    });
  }

  // ------------------------------------------------------------ eventos de la lista
  root.addEventListener('click', (e) => {
    const card = e.target.closest('.map-card');
    if (card) { const s = S.sets[Number(card.dataset.i)]; if (s) openDetail(s); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    switch (a.dataset.act) {
      case 'tab': S.tab = a.dataset.tab; render(); loadList(false); loadEarnings(); break;
      case 'new': openEditor(null); break;
      case 'more': S.page++; loadList(true); break;
      case 'unequip': unequip(); break;
      case 'stop-preview': preview = null; applyNow(); rerenderBanner(); break;
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'ws-sort') { S.sort = t.value; loadList(false); }
    else if (t.id === 'ws-free') { S.free = t.checked; loadList(false); }
    else if (t.dataset && t.dataset.keep && active) {
      active.keep = t.checked ? [...new Set([...active.keep, t.dataset.keep])] : active.keep.filter((g) => g !== t.dataset.keep);
      saveActive(); applyNow();
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'ws-q') return;
    S.q = e.target.value.trim(); clearTimeout(searchT); searchT = setTimeout(() => loadList(false), 300);
  });

  // ------------------------------------------------------------ arranque y ciclo de vida
  function onOpen() { render(); loadList(false); loadEarnings(); }

  // Al abrir el cliente se aplica el set guardado enseguida (sin esperar al servidor) y luego se refresca.
  async function refreshActive() {
    if (!active || !loggedIn()) return;
    try {
      const d = await req('GET', '/workshop/sets/' + encodeURIComponent(active.id));
      if (!(d.owned || d.mine)) return;
      active.name = d.name;
      active.set = { settings: d.settings, css: d.css, bg_url: d.bg_url, updated_at: d.updated_at };
      saveActive(); applyNow();
    } catch (_) { /* sin red: queda la copia guardada */ }
  }
  window.addEventListener('vivet-session-changed', () => { if (panel.classList.contains('active')) onOpen(); refreshActive(); });
  window.addEventListener('vivet-friends-updated', () => {}); // (reservado)

  (async () => {
    const saved = await cfgGet('wsActive', null);
    if (saved && saved.id && saved.set && Array.isArray(saved.keep)) active = saved;
    applyNow();
    render();
  })();
})();
} catch (err) { console.error('[workshop]', err); }