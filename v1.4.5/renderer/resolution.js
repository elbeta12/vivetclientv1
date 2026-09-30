// Vivet Client - renderer/resolution.js
// Resolución del juego (px). El <webview> pasa a medir W x H "lógicos" y se
// escala con CSS para llenar la ventana (estirado, como la resolución
// estirada de los shooters) o para entrar con su proporción (con barras).
// Solo se aplica mientras jugás (.app.playing); en los paneles no cambia nada.
// Estilos: final de style.css (.custom-res). Se carga DESPUÉS de app.js.

(() => {
  const $ = (s) => document.querySelector(s);
  const wrap = $('#game-wrap');
  const appRoot = $('#app-root');
  if (!wrap || !appRoot) return;

  const MIN = 320, MAX = 7680;
  let res = null; // { w, h, stretch } | null = nativa

  const inputW = $('#res-w'), inputH = $('#res-h'), stretchEl = $('#res-stretch');
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };

  function layout() {
    if (!res) { wrap.classList.remove('custom-res'); return; }
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    let sx = W / res.w, sy = H / res.h, tx = 0, ty = 0;
    if (!res.stretch) {
      const s = Math.min(sx, sy);
      sx = sy = s;
      tx = (W - res.w * s) / 2;
      ty = (H - res.h * s) / 2;
    }
    const st = wrap.style;
    st.setProperty('--gv-w', res.w + 'px');
    st.setProperty('--gv-h', res.h + 'px');
    st.setProperty('--gv-sx', sx.toFixed(5));
    st.setProperty('--gv-sy', sy.toFixed(5));
    st.setProperty('--gv-tx', tx.toFixed(2) + 'px');
    st.setProperty('--gv-ty', ty.toFixed(2) + 'px');
    wrap.classList.add('custom-res');
  }

  function syncUI() {
    const cw = Math.round(wrap.clientWidth), ch = Math.round(wrap.clientHeight);
    if (inputW) { inputW.value = res ? res.w : ''; inputW.placeholder = String(cw || 1920); }
    if (inputH) { inputH.value = res ? res.h : ''; inputH.placeholder = String(ch || 1080); }
    if (stretchEl) stretchEl.checked = res ? !!res.stretch : true;
  }

  async function save() {
    try { await window.vivet.setConfig('gameRes', res || ''); } catch (_) {}
  }

  function apply() {
    const w = Math.round(Number(inputW && inputW.value));
    const h = Math.round(Number(inputH && inputH.value));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < MIN || h < MIN || w > MAX || h > MAX) {
      return toast(`Usá valores entre ${MIN} y ${MAX} px`);
    }
    res = { w, h, stretch: stretchEl ? stretchEl.checked : true };
    layout(); syncUI(); save();
    toast(`Resolución ${w} × ${h} aplicada`, 'ok');
  }

  function restore() {
    res = null;
    layout(); syncUI(); save();
    toast('Resolución restaurada', 'ok');
  }

  $('#res-apply-btn')?.addEventListener('click', apply);
  $('#res-reset-btn')?.addEventListener('click', restore);
  [inputW, inputH].forEach((el) => el?.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); }));
  stretchEl?.addEventListener('change', () => { if (res) { res.stretch = stretchEl.checked; layout(); save(); } });

  // Re-calcula al cambiar el tamaño de la ventana y al entrar/salir de jugar.
  try { new ResizeObserver(layout).observe(wrap); } catch (_) { window.addEventListener('resize', layout); }
  new MutationObserver(layout).observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  (async () => {
    try {
      const r = await window.vivet.getConfig('gameRes', '');
      if (r && Number.isFinite(r.w) && Number.isFinite(r.h) && r.w >= MIN && r.h >= MIN) {
        res = { w: Math.round(r.w), h: Math.round(r.h), stretch: r.stretch !== false };
      }
    } catch (_) {}
    layout(); syncUI();
  })();
})();