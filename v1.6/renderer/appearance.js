// Vivet Client - renderer/appearance.js
// Personalización del cliente: colores de club, textura de estadio, color de
// botones y (nuevo) temas rápidos, fondo base, imagen de fondo, tipografía,
// tamaño de interfaz, esquinas, densidad, estilo de tarjetas, barra lateral,
// portada de Explorar y exportar/importar tema.
// Solo toca variables CSS / atributos data-* del <html> y un <style> para la
// imagen; los estilos que los usan están al final de style.css.
// Las tarjetas nuevas las inserta este mismo archivo en #panel-apariencia
// (no hace falta tocar index.html). Se carga después de optimizations.js.

(() => {
  const CLUBS = [
    { id: 'vivet',        name: 'Vivet',                c1: '#17e0e8', c2: '#0aa8c9' },
    { id: 'nacional',     name: 'Atlético Nacional',    c1: '#0b8a3e', c2: '#dfe8e2' },
    { id: 'millonarios',  name: 'Millonarios',          c1: '#1d4ed8', c2: '#e8eefc' },
    { id: 'america',      name: 'América de Cali',      c1: '#d7263d', c2: '#f3f3f3' },
    { id: 'cali',         name: 'Deportivo Cali',       c1: '#14a85a', c2: '#f3f3f3' },
    { id: 'junior',       name: 'Junior',               c1: '#e63946', c2: '#f3f3f3' },
    { id: 'dim',          name: 'Independiente Medellín', c1: '#d62839', c2: '#1b3a8a' },
    { id: 'santafe',      name: 'Santa Fe',             c1: '#d62839', c2: '#f3f3f3' },
    { id: 'tolima',       name: 'Tolima',               c1: '#7a1f3d', c2: '#f2c14e' },
    { id: 'boca',         name: 'Boca Juniors',         c1: '#123d8f', c2: '#f2c500' },
    { id: 'river',        name: 'River Plate',          c1: '#e10600', c2: '#f3f3f3' },
    { id: 'madrid',       name: 'Real Madrid',          c1: '#e8ecf5', c2: '#febe10' },
    { id: 'barcelona',    name: 'Barcelona',            c1: '#a50044', c2: '#004d98' },
  ];
  const STADIUMS = ['none', 'cesped', 'cancha', 'reflectores', 'gradas'];
  const BTN_PRESETS = ['#17e0e8', '#3ddc84', '#f5b74b', '#ff5470', '#a78bfa', '#3b82f6', '#f472b6', '#ffffff'];

  // Opciones de "un solo valor entre varios" (se dibujan como botones segmentados).
  const SEGMENTS = [
    { card: 'base', key: 'base', label: 'Fondo base', opts: [['normal', 'Normal'], ['amoled', 'Negro puro'], ['navy', 'Azul noche'], ['graphite', 'Grafito']] },
    { card: 'type', key: 'font', label: 'Tipografía', opts: [['inter', 'Inter'], ['system', 'Sistema'], ['serif', 'Serif'], ['mono', 'Monoespaciada']] },
    { card: 'shape', key: 'radius', label: 'Esquinas', opts: [['sharp', 'Rectas'], ['normal', 'Normales'], ['round', 'Redondeadas'], ['pill', 'Píldora']] },
    { card: 'shape', key: 'density', label: 'Densidad', opts: [['compact', 'Compacta'], ['normal', 'Normal'], ['comfy', 'Cómoda']] },
    { card: 'shape', key: 'cards', label: 'Tarjetas', opts: [['flat', 'Planas'], ['border', 'Con borde'], ['raised', 'Elevadas']] },
    { card: 'shape', key: 'sidebar', label: 'Barra lateral', opts: [['narrow', 'Angosta'], ['normal', 'Normal'], ['wide', 'Ancha']] },
    { card: 'explore', key: 'hero', label: 'Portada de Explorar', opts: [['full', 'Completa'], ['compact', 'Compacta'], ['minimal', 'Mínima']] },
  ];
  const ENUMS = {};
  SEGMENTS.forEach((s) => { ENUMS[s.key] = s.opts.map((o) => o[0]); });

  // Temas rápidos: cambian colores, textura, intensidad y fondo base de una.
  const PRESETS = [
    { id: 'vivet',     name: 'Vivet',      c1: '#17e0e8', c2: '#0aa8c9', club: 'vivet',  btn: '',        stadium: 'none',        strength: 40, base: 'normal' },
    { id: 'medianoche', name: 'Medianoche', c1: '#6366f1', c2: '#22d3ee', club: 'custom', btn: '#818cf8', stadium: 'reflectores', strength: 55, base: 'navy' },
    { id: 'esmeralda', name: 'Esmeralda',  c1: '#10b981', c2: '#065f46', club: 'custom', btn: '#3ddc84', stadium: 'cesped',      strength: 50, base: 'normal' },
    { id: 'atardecer', name: 'Atardecer',  c1: '#fb923c', c2: '#ec4899', club: 'custom', btn: '#fb923c', stadium: 'gradas',      strength: 45, base: 'graphite' },
    { id: 'sakura',    name: 'Sakura',     c1: '#f472b6', c2: '#a78bfa', club: 'custom', btn: '#f472b6', stadium: 'none',        strength: 45, base: 'normal' },
    { id: 'carbon',    name: 'Carbón',     c1: '#e5e7eb', c2: '#6b7280', club: 'custom', btn: '#ffffff', stadium: 'none',        strength: 25, base: 'amoled' },
  ];

  const DEFAULTS = {
    club: 'vivet', custom1: '#17e0e8', custom2: '#0aa8c9', stadium: 'none', strength: 40, btn: '',
    base: 'normal', font: 'inter', scale: 100, radius: 'normal', density: 'normal',
    cards: 'border', sidebar: 'normal', hero: 'full', dim: 55,
  };
  const EXTRA_KEYS = [...Object.keys(ENUMS), 'scale', 'dim'];
  const SHARE_KEYS = ['club', 'custom1', 'custom2', 'stadium', 'strength', 'btn', ...EXTRA_KEYS];

  const $ = (s) => document.querySelector(s);
  const state = { ...DEFAULTS, image: '' };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toast = (m, k) => { try { if (typeof showToast === 'function') showToast(m, k); } catch (_) {} };

  const HEX = /^#[0-9a-f]{6}$/i;
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
  }
  function colorsOf(club) {
    if (club === 'custom') return [state.custom1, state.custom2];
    const c = CLUBS.find((x) => x.id === club) || CLUBS[0];
    return [c.c1, c.c2];
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.round(Math.min(255, Math.max(0, v * (1 + f))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
  }

  // Valida cualquier objeto de ajustes (config guardada o tema importado).
  function sanitize(o) {
    const r = {};
    if (!o || typeof o !== 'object') return r;
    if (typeof o.club === 'string' && (o.club === 'custom' || CLUBS.some((x) => x.id === o.club))) r.club = o.club;
    ['custom1', 'custom2'].forEach((k) => { if (HEX.test(o[k])) r[k] = o[k]; });
    if (STADIUMS.includes(o.stadium)) r.stadium = o.stadium;
    if (o.strength != null && Number.isFinite(Number(o.strength))) r.strength = clamp(Number(o.strength), 0, 100);
    if (o.btn === '' || HEX.test(o.btn)) r.btn = o.btn;
    Object.keys(ENUMS).forEach((k) => { if (ENUMS[k].includes(o[k])) r[k] = o[k]; });
    if (o.scale != null && Number.isFinite(Number(o.scale))) r.scale = clamp(Math.round(Number(o.scale)), 85, 130);
    if (o.dim != null && Number.isFinite(Number(o.dim))) r.dim = clamp(Math.round(Number(o.dim)), 0, 90);
    return r;
  }

  // ------------------------------------------------------------ aplicar
  // Color de botones/acentos: pisa las variables del tema; '' = el del tema.
  function applyButtons() {
    const root = document.documentElement;
    const names = ['--accent', '--accent-2', '--accent-soft', '--accent-border', '--btn-ink'];
    if (!HEX.test(state.btn)) { names.forEach((v) => root.style.removeProperty(v)); return; }
    const n = parseInt(state.btn.slice(1), 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    root.style.setProperty('--accent', state.btn);
    root.style.setProperty('--accent-2', shade(state.btn, -0.25));
    root.style.setProperty('--accent-soft', rgba(state.btn, 0.11));
    root.style.setProperty('--accent-border', rgba(state.btn, 0.32));
    root.style.setProperty('--btn-ink', lum > 0.55 ? '#04141a' : '#ffffff');
  }

  // La imagen va en un <style> propio (no en una variable CSS: una variable
  // con cientos de KB se heredaría a todos los elementos).
  function applyImage() {
    const root = document.documentElement;
    let st = document.getElementById('vv-bgimg');
    if (!state.image) {
      if (st) st.remove();
      root.removeAttribute('data-bgimg');
      return;
    }
    if (!st) { st = document.createElement('style'); st.id = 'vv-bgimg'; document.head.appendChild(st); }
    const css = `:root[data-bgimg] .main{background:` +
      `linear-gradient(color-mix(in srgb,var(--bg) var(--fx-dim,55%),transparent),color-mix(in srgb,var(--bg) var(--fx-dim,55%),transparent)),` +
      `url("${state.image}") center / cover no-repeat,` +
      `var(--fx-stadium,linear-gradient(transparent,transparent)),` +
      `radial-gradient(1100px 520px at 100% -8%,var(--fx-c1),transparent 70%),` +
      `radial-gradient(900px 480px at -8% 108%,var(--fx-c2),transparent 70%),var(--bg);}`;
    if (st.dataset.src !== state.image) { st.textContent = css; st.dataset.src = state.image; }
    root.setAttribute('data-bgimg', '1');
  }

  function apply() {
    applyButtons();
    const [c1, c2] = colorsOf(state.club);
    const k = clamp(Number(state.strength) || 0, 0, 100) / 100;
    const root = document.documentElement;
    // Con intensidad 100% el brillo llega a ~0.26 de alfa: presente pero nunca invasivo.
    root.style.setProperty('--fx-c1', rgba(c1, 0.26 * k));
    root.style.setProperty('--fx-c2', rgba(c2, 0.20 * k));
    root.style.setProperty('--fx-side', rgba(c1, 0.12 * k));
    root.style.setProperty('--fx-edge', rgba(c1, 0.45 * k));
    root.setAttribute('data-stadium', state.stadium);

    // Atributos data-*: solo se ponen si el valor no es el de fábrica.
    const setAttr = (name, val, def) => {
      if (val === def) root.removeAttribute(name); else root.setAttribute(name, val);
    };
    setAttr('data-base', state.base, 'normal');
    setAttr('data-font', state.font, 'inter');
    setAttr('data-radius', state.radius, 'normal');
    setAttr('data-density', state.density, 'normal');
    setAttr('data-cards', state.cards, 'border');
    setAttr('data-sidebar', state.sidebar, 'normal');
    setAttr('data-hero', state.hero, 'full');
    root.style.setProperty('--ui-zoom', String(state.scale / 100));
    setAttr('data-zoomed', '1', state.scale === 100 ? '1' : '');
    root.style.setProperty('--fx-dim', state.dim + '%');
    applyImage();
  }

  // ------------------------------------------------------------ guardar
  function save() {
    try {
      window.vivet.setConfig('bgClub', state.club);
      window.vivet.setConfig('bgCustom1', state.custom1);
      window.vivet.setConfig('bgCustom2', state.custom2);
      window.vivet.setConfig('bgStadium', state.stadium);
      window.vivet.setConfig('bgStrength', state.strength);
      window.vivet.setConfig('btnColor', state.btn);
      const extra = {};
      EXTRA_KEYS.forEach((k) => { extra[k] = state[k]; });
      window.vivet.setConfig('bgExtra', extra);
    } catch (_) {}
  }
  function saveImage() {
    try { window.vivet.setConfig('bgImage', state.image || ''); return true; }
    catch (_) { return false; }
  }

  // ------------------------------------------------------------ UI existente
  function syncUI() {
    document.querySelectorAll('.club-chip').forEach((b) => b.classList.toggle('active', b.dataset.club === state.club));
    document.querySelectorAll('.stadium-chip').forEach((b) => b.classList.toggle('active', b.dataset.stadium === state.stadium));
    const s1 = $('#bg-custom-1'), s2 = $('#bg-custom-2'), r = $('#bg-strength'), l = $('#bg-strength-value');
    if (s1) s1.value = state.custom1;
    if (s2) s2.value = state.custom2;
    if (r) r.value = String(state.strength);
    if (l) l.textContent = `${state.strength}%`;
    const bc = $('#btn-color');
    if (bc && HEX.test(state.btn)) bc.value = state.btn;
    document.querySelectorAll('.btn-swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === state.btn));

    // Controles nuevos
    document.querySelectorAll('.ap-seg-btn').forEach((b) => b.classList.toggle('active', state[b.dataset.key] === b.dataset.v));
    const sc = $('#ap-scale'), scv = $('#ap-scale-value');
    if (sc) sc.value = String(state.scale);
    if (scv) scv.textContent = `${state.scale}%`;
    const dm = $('#ap-dim'), dmv = $('#ap-dim-value');
    if (dm) dm.value = String(state.dim);
    if (dmv) dmv.textContent = `${state.dim}%`;
    const st = $('#ap-img-status');
    if (st) st.textContent = state.image ? `Imagen activa (${Math.round(state.image.length / 1024)} KB)` : 'Sin imagen';
    const clr = $('#ap-img-clear');
    if (clr) clr.disabled = !state.image;
  }

  function buildBtnSwatches() {
    const box = $('#btn-swatches');
    if (!box) return;
    box.innerHTML = BTN_PRESETS.map((c) =>
      `<button type="button" class="btn-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('');
    box.querySelectorAll('.btn-swatch').forEach((b) => b.addEventListener('click', () => {
      state.btn = b.dataset.color; apply(); syncUI(); save();
    }));
  }

  function buildClubChips() {
    const grid = $('#club-grid');
    if (!grid) return;
    const chips = CLUBS.map((c) => `
      <button class="club-chip" data-club="${c.id}" type="button">
        <span class="club-swatch" style="background: linear-gradient(135deg, ${c.c1} 50%, ${c.c2} 50%);"></span>
        <span class="club-chip-name">${c.name}</span>
      </button>`);
    chips.push(`
      <button class="club-chip" data-club="custom" type="button">
        <span class="club-swatch club-swatch-custom"></span>
        <span class="club-chip-name">Personalizado</span>
      </button>`);
    grid.innerHTML = chips.join('');
    grid.querySelectorAll('.club-chip').forEach((b) => b.addEventListener('click', () => {
      state.club = b.dataset.club;
      apply(); syncUI(); save();
    }));
  }

  // ------------------------------------------------------------ UI nueva
  const segRow = (s) =>
    `<div class="ap-row"><span class="ap-label">${s.label}</span><div class="ap-seg">` +
    s.opts.map(([v, t]) => `<button type="button" class="ap-seg-btn" data-key="${s.key}" data-v="${v}">${t}</button>`).join('') +
    `</div></div>`;
  const segs = (card) => SEGMENTS.filter((s) => s.card === card).map(segRow).join('');

  function buildExtraUI() {
    const panel = $('#panel-apariencia');
    if (!panel || $('#ap-presets')) return;
    const anchor = panel.querySelector('.panel-toolbar');
    const html = `
      <div class="fr-section-title">Personalización avanzada</div>
      <div class="card">
        <h3>Temas rápidos</h3>
        <p>Un click cambia colores, textura y fondo a la vez. Después podés ajustar lo que quieras.</p>
        <div id="ap-presets" class="preset-grid"></div>
      </div>
      <div class="card">
        <h3>Fondo base</h3>
        <p>El tono de fondo del cliente. Solo se nota con el tema oscuro.</p>
        ${segs('base')}
      </div>
      <div class="card">
        <h3>Imagen de fondo</h3>
        <p>Poné tu propia imagen detrás del cliente. Se reduce sola para que no pese, y no afecta al juego.</p>
        <div class="btn-color-row">
          <button id="ap-img-pick" class="primary-btn" type="button">Elegir imagen</button>
          <button id="ap-img-clear" class="ghost-btn" type="button">Quitar</button>
          <span id="ap-img-status" class="status"></span>
        </div>
        <input id="ap-img-file" type="file" accept="image/*" hidden />
        <div class="ap-row">
          <span class="ap-label">Oscurecer</span>
          <div class="fps-limit-row ap-range">
            <input type="range" id="ap-dim" min="0" max="90" step="5" value="55" />
            <span id="ap-dim-value" class="fps-limit-value">55%</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Texto</h3>
        <p>Tipografía y tamaño de toda la interfaz del cliente.</p>
        ${segs('type')}
        <div class="ap-row">
          <span class="ap-label">Tamaño de la interfaz</span>
          <div class="fps-limit-row ap-range">
            <input type="range" id="ap-scale" min="85" max="130" step="5" value="100" />
            <span id="ap-scale-value" class="fps-limit-value">100%</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Forma y densidad</h3>
        <p>Qué tan redondeado, compacto y marcado se ve todo.</p>
        ${segs('shape')}
      </div>
      <div class="card">
        <h3>Explorar salas</h3>
        <p>La portada grande se puede reducir para ver más salas sin hacer scroll.</p>
        ${segs('explore')}
      </div>
      <div class="card">
        <h3>Compartir tema</h3>
        <p>Copiá tu configuración para pasársela a alguien, o pegá la de otra persona y aplicala. La imagen de fondo no se incluye.</p>
        <textarea id="ap-theme-code" class="ap-code" rows="3" spellcheck="false" placeholder="Pegá acá un tema y tocá Aplicar tema"></textarea>
        <div class="btn-color-row" style="margin-top:10px">
          <button id="ap-theme-copy" class="ghost-btn" type="button">Copiar mi tema</button>
          <button id="ap-theme-apply" class="primary-btn" type="button">Aplicar tema</button>
        </div>
      </div>`;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    panel.insertBefore(frag, anchor || null);

    // Temas rápidos
    $('#ap-presets').innerHTML = PRESETS.map((p) => `
      <button type="button" class="preset-chip" data-preset="${p.id}">
        <span class="club-swatch" style="background: linear-gradient(135deg, ${p.c1} 50%, ${p.c2} 50%);"></span>
        <span class="club-chip-name">${p.name}</span>
      </button>`).join('');
  }

  // Redimensiona a máx. 1600 px y comprime a JPEG para guardar poco en disco.
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Elegí un archivo de imagen'));
      if (file.size > 20 * 1024 * 1024) return reject(new Error('La imagen pesa demasiado (máx. 20 MB)'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Esa imagen no se pudo abrir'));
        img.onload = () => {
          const k = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k));
          c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function bindExtra() {
    const panel = $('#panel-apariencia');
    if (!panel) return;

    panel.addEventListener('click', (e) => {
      const seg = e.target.closest('.ap-seg-btn');
      if (seg) { state[seg.dataset.key] = seg.dataset.v; apply(); syncUI(); save(); return; }
      const pr = e.target.closest('.preset-chip');
      if (pr) {
        const p = PRESETS.find((x) => x.id === pr.dataset.preset);
        if (!p) return;
        Object.assign(state, sanitize({ club: p.club, custom1: p.c1, custom2: p.c2, btn: p.btn, stadium: p.stadium, strength: p.strength, base: p.base }));
        apply(); syncUI(); save();
      }
    });

    let t = null;
    $('#ap-scale')?.addEventListener('input', (e) => {
      state.scale = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });
    $('#ap-dim')?.addEventListener('input', (e) => {
      state.dim = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });

    $('#ap-img-pick')?.addEventListener('click', () => $('#ap-img-file')?.click());
    $('#ap-img-file')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const st = $('#ap-img-status');
      if (st) st.textContent = 'Procesando…';
      try {
        state.image = await readImage(file);
        apply(); syncUI();
        if (!saveImage()) toast('La imagen se aplicó, pero no se pudo guardar para la próxima vez');
        else toast('Imagen de fondo aplicada', 'ok');
      } catch (err) {
        syncUI();
        toast(err.message || 'No se pudo usar esa imagen');
      }
    });
    $('#ap-img-clear')?.addEventListener('click', () => {
      state.image = '';
      apply(); syncUI(); saveImage();
    });

    $('#ap-theme-copy')?.addEventListener('click', async () => {
      const out = { v: 1 };
      SHARE_KEYS.forEach((k) => { out[k] = state[k]; });
      const text = JSON.stringify(out);
      const box = $('#ap-theme-code');
      if (box) box.value = text;
      try {
        if (typeof copyToClipboard === 'function') copyToClipboard(text, 'Tema copiado');
        else { await navigator.clipboard.writeText(text); toast('Tema copiado', 'ok'); }
      } catch (_) { toast('Copialo a mano desde el cuadro de texto'); }
    });
    $('#ap-theme-apply')?.addEventListener('click', () => {
      const box = $('#ap-theme-code');
      let obj = null;
      try { obj = JSON.parse((box && box.value || '').trim()); } catch (_) {}
      const clean = sanitize(obj);
      if (!Object.keys(clean).length) return toast('Ese texto no es un tema válido');
      Object.assign(state, clean);
      apply(); syncUI(); save();
      toast('Tema aplicado', 'ok');
    });
  }

  function bind() {
    document.querySelectorAll('.stadium-chip').forEach((b) => b.addEventListener('click', () => {
      state.stadium = b.dataset.stadium;
      apply(); syncUI(); save();
    }));
    ['1', '2'].forEach((n) => {
      $('#bg-custom-' + n)?.addEventListener('input', (e) => {
        state['custom' + n] = e.target.value;
        state.club = 'custom';
        apply(); syncUI();
      });
      $('#bg-custom-' + n)?.addEventListener('change', save);
    });
    let t = null;
    $('#bg-strength')?.addEventListener('input', (e) => {
      state.strength = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });
    $('#btn-color')?.addEventListener('input', (e) => { state.btn = e.target.value; apply(); syncUI(); });
    $('#btn-color')?.addEventListener('change', save);
    $('#btn-color-reset')?.addEventListener('click', () => { state.btn = ''; apply(); syncUI(); save(); });
    $('#bg-reset-btn')?.addEventListener('click', () => {
      const hadImage = !!state.image;
      Object.assign(state, DEFAULTS, { image: '' });
      apply(); syncUI(); save();
      if (hadImage) saveImage();
    });
    bindExtra();
  }

  async function load() {
    try {
      const g = (k, d) => window.vivet.getConfig(k, d);
      const merged = {
        club: await g('bgClub', DEFAULTS.club),
        custom1: await g('bgCustom1', DEFAULTS.custom1),
        custom2: await g('bgCustom2', DEFAULTS.custom2),
        stadium: await g('bgStadium', DEFAULTS.stadium),
        strength: await g('bgStrength', DEFAULTS.strength),
        btn: await g('btnColor', ''),
        ...(await g('bgExtra', null) || {}),
      };
      Object.assign(state, sanitize(merged));
      const im = await g('bgImage', '');
      if (typeof im === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(im) && im.length < 8e6) state.image = im;
    } catch (_) {}
    apply(); syncUI();
  }

  buildExtraUI();
  buildClubChips();
  buildBtnSwatches();
  bind();
  apply(); syncUI(); // valores por defecto al toque, sin esperar al disco
  load();
})();