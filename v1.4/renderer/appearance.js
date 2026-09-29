// Vivet Client - renderer/appearance.js
// Fondo del cliente: colores de club + textura de estadio, todo sutil.
// Solo toca variables CSS (--fx-*) y el atributo data-stadium del <html>;
// los estilos que las usan están al final de style.css.
// Se carga después de optimizations.js (ver index.html). No depende de app.js.

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
  const DEFAULTS = { club: 'vivet', custom1: '#17e0e8', custom2: '#0aa8c9', stadium: 'none', strength: 40, btn: '' };
  const BTN_PRESETS = ['#17e0e8', '#3ddc84', '#f5b74b', '#ff5470', '#a78bfa', '#3b82f6', '#f472b6', '#ffffff'];

  const $ = (s) => document.querySelector(s);
  const state = { ...DEFAULTS };

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

  function apply() {
    applyButtons();
    const [c1, c2] = colorsOf(state.club);
    const k = Math.min(100, Math.max(0, Number(state.strength) || 0)) / 100;
    const root = document.documentElement;
    // Con intensidad 100% el brillo llega a ~0.26 de alfa: presente pero nunca invasivo.
    root.style.setProperty('--fx-c1', rgba(c1, 0.26 * k));
    root.style.setProperty('--fx-c2', rgba(c2, 0.20 * k));
    root.style.setProperty('--fx-side', rgba(c1, 0.12 * k));
    root.style.setProperty('--fx-edge', rgba(c1, 0.45 * k));
    root.setAttribute('data-stadium', state.stadium);
  }

  function save() {
    try {
      window.vivet.setConfig('bgClub', state.club);
      window.vivet.setConfig('bgCustom1', state.custom1);
      window.vivet.setConfig('bgCustom2', state.custom2);
      window.vivet.setConfig('bgStadium', state.stadium);
      window.vivet.setConfig('bgStrength', state.strength);
      window.vivet.setConfig('btnColor', state.btn);
    } catch (_) {}
  }

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
      Object.assign(state, DEFAULTS);
      apply(); syncUI(); save();
    });
  }

  async function load() {
    try {
      const g = (k, d) => window.vivet.getConfig(k, d);
      const club = await g('bgClub', DEFAULTS.club);
      const c1 = await g('bgCustom1', DEFAULTS.custom1);
      const c2 = await g('bgCustom2', DEFAULTS.custom2);
      const st = await g('bgStadium', DEFAULTS.stadium);
      const k = await g('bgStrength', DEFAULTS.strength);
      const bt = await g('btnColor', '');
      if (HEX.test(bt)) state.btn = bt;
      if (club === 'custom' || CLUBS.some((x) => x.id === club)) state.club = club;
      if (HEX.test(c1)) state.custom1 = c1;
      if (HEX.test(c2)) state.custom2 = c2;
      if (STADIUMS.includes(st)) state.stadium = st;
      if (Number.isFinite(Number(k))) state.strength = Math.min(100, Math.max(0, Number(k)));
    } catch (_) {}
    apply(); syncUI();
  }

  buildClubChips();
  buildBtnSwatches();
  bind();
  apply(); syncUI(); // valores por defecto al toque, sin esperar al disco
  load();
})();