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