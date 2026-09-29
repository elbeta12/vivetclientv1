// Vivet Client - renderer/optimizations.js
// TODO lo relacionado con rendimiento del lado del renderer vive acá:
//   - limitador de FPS (override de requestAnimationFrame dentro del juego)
//   - contador de FPS y slider de límite
//   - toggle "Modo GPU agresivo"
//   - ocultar publicidad del juego
//   - intervalos de sondeo (qué tan seguido se le pregunta cosas al juego)
// Se carga ANTES que app.js (ver index.html). app.js llama a
// VivetPerf.init({...}) una vez y a VivetPerf.injectIntoGame() cuando el
// webview está listo. Los flags de Chromium/GPU del proceso principal están
// en ../optimizations-main.js.

const VIVET_PERF = {
  // Cada cuántos ms se revisa si saliste de la sala / cuál es su nombre.
  // Cada chequeo es un IPC + ejecutar JS en TODOS los frames del webview,
  // así que cuanto más espaciado, menos le roba al juego.
  LEAVE_CHECK_INTERVAL_MS: 1000,
  TITLE_REFRESH_INTERVAL_MS: 15000,
  FPS_BADGE_INTERVAL_MS: 1000,
  FPS_LIMIT_MIN: 30,
  FPS_LIMIT_MAX: 600,
  FPS_LIMIT_DEFAULT: 300,
};

// ---------------------------------------------------------------------------
// Ocultar publicidad (se inyecta dentro de la página del juego)
// ---------------------------------------------------------------------------
function hideAdsInPage() {
  try {
    var id = 'vivet-hide-ads';
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = [
      'ins.adsbygoogle { display: none !important; }',
      'iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="googleadservices"] { display: none !important; }',
      'iframe[title="Advertisement" i], iframe[aria-label="Advertisement" i] { display: none !important; }',
      '[id^="google_ads_"], [id^="div-gpt-ad"], [id*="gpt-ad"], #ad-container, .ad-container, #ezmob-footer { display: none !important; }',
      '[class*="ad-slot" i], [class*="ad_slot" i], [id*="ad-slot" i], [class*="advert" i], [id*="advert" i], [class*="banner_ad" i], [class*="banner-ad" i] { display: none !important; }',
      'iframe[width="300"][height="250"], iframe[width="160"][height="600"],',
      'iframe[width="120"][height="600"], iframe[width="300"][height="600"],',
      'iframe[width="728"][height="90"], iframe[width="320"][height="50"],',
      'iframe[width="970"][height="250"] { display: none !important; }',
      '[id*="right" i][id*="ad" i], [class*="right" i][class*="ad" i],',
      '[id*="side" i][id*="ad" i], [class*="side" i][class*="ad" i] { display: none !important; }',
    ].join('\n');
    return true;
  } catch (e) {
    return false;
  }
}



// ---------------------------------------------------------------------------
// Limitador de FPS (se inyecta dentro de la página del juego)
// ---------------------------------------------------------------------------
// CORREGIDO - causa de los bajones de FPS: el limitador anterior comparaba
// `now - lastTime >= 1000 / limite` y reseteaba lastTime = now. Cuando el
// límite es (casi) igual a los Hz del monitor - justo lo que sugiere el
// panel ("depende de tus Hz") - el timestamp de rAF tiene un jitter de
// décimas de ms, así que cada tanto `now - lastTime` daba 6.9ms contra un
// intervalo de 6.94ms y ese cuadro se SALTEABA: el juego caía a la mitad de
// FPS en ráfagas. Ahora:
//   - se usa un acumulador (lastTime += interval) con 0.5ms de tolerancia,
//     así el promedio es exacto y el jitter no saltea cuadros;
//   - si el límite es >= al refresco real, no se saltea nada;
//   - cancelAnimationFrame funciona (antes cancelar podía matar el loop);
//   - no se aloca un array nuevo (slice) por cuadro.
function overrideRafInPage(initialFps) {
  // Solo en páginas de haxball.com (no en captchas ni anuncios de terceros).
  if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
  if (window.__vivetRafOverridden) {
    window.__vivetFpsLimit = initialFps || window.__vivetFpsLimit || 300;
    return;
  }
  window.__vivetRafOverridden = true;
  window.__vivetFpsLimit = initialFps || 300;
  window.__vivetDelivered = 0;

  var nativeRAF = window.requestAnimationFrame.bind(window);
  window.__vivetNativeRAF = nativeRAF;

  var queue = [];
  var nextId = 0;
  var lastTime = 0;

  window.requestAnimationFrame = function (cb) {
    var id = ++nextId;
    queue.push({ id: id, cb: cb });
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === id) { queue[i].cb = null; return; }
    }
  };

  function loop(now) {
    var interval = 1000 / (window.__vivetFpsLimit || 300);
    var elapsed = now - lastTime;
    if (elapsed >= interval - 0.5) {
      lastTime = elapsed > interval * 2 ? now : lastTime + interval;
      var run = queue;
      queue = [];
      for (var i = 0; i < run.length; i++) {
        var entry = run[i];
        if (!entry.cb) continue;
        try { entry.cb(now); } catch (e) { console.error(e); }
      }
      window.__vivetDelivered++;
    }
    nativeRAF(loop);
  }
  nativeRAF(loop);
}

// Cuenta cuadros reales entregados al juego por segundo. Usa el rAF NATIVO
// (capturado antes del override) para no pasar por el limitador.
function fpsProbeInPage() {
  if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
  if (window.__vivetFpsStarted) return;
  window.__vivetFpsStarted = true;
  window.__vivetFps = 0;
  var nativeRAF = (window.__vivetNativeRAF || window.requestAnimationFrame).bind(window);
  var frames = 0;
  var lastDelivered = 0;
  var last = performance.now();
  function tick(now) {
    frames++;
    if (now - last >= 1000) {
      if (window.__vivetRafOverridden) {
        var d = window.__vivetDelivered || 0;
        window.__vivetFps = d - lastDelivered;
        lastDelivered = d;
      } else {
        window.__vivetFps = frames;
      }
      frames = 0;
      last = now;
    }
    nativeRAF(tick);
  }
  nativeRAF(tick);
}

function setFpsLimitInPage(value) {
  window.__vivetFpsLimit = value;
}

// Baja/restaura la resolución de render del juego. Haxball dimensiona su
// canvas usando devicePixelRatio, así que se lo escala y se fuerza un resize.
function setRenderScaleInPage(scale) {
  try {
    if (window.__vivetRealDpr === undefined) window.__vivetRealDpr = window.devicePixelRatio || 1;
    window.__vivetRenderScale = scale;
    if (!window.__vivetDprPatched) {
      window.__vivetDprPatched = true;
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: function () { return window.__vivetRealDpr * (window.__vivetRenderScale || 1); },
      });
    }
    window.dispatchEvent(new Event('resize'));
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// API que usa app.js
// ---------------------------------------------------------------------------
const VivetPerf = (() => {
  let ctx = null;
  let fpsLimitValue = VIVET_PERF.FPS_LIMIT_DEFAULT;
  let badgeBusy = false;
  let renderScale = 1;

  const asScript = (fn, arg) =>
    '(' + fn.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ');';

  function applyAdsSetting() {
    if (!ctx) return;
    ctx.execInAllFrames(asScript(hideAdsInPage)).catch(() => {});
  }

  // Idempotente: todo se protege con flags dentro de la página, así que se
  // puede llamar en dom-ready, en cada navegación de frame y al entrar a
  // jugar sin duplicar nada. El orden importa: el probe se engancha al rAF
  // nativo ANTES de que el override lo reemplace.
  // CORREGIDO (28/09) - "a veces no sirve el contador de FPS": el probe y el
  // limitador se inyectaban con execInGame, o sea en UN solo frame elegido por
  // gameFrameHint. Ese hint se pone en null en cada navegación (entrar por
  // link, salir/entrar de salas), y con null se apuntaba al último frame que
  // podía no ser el del juego -> el contador leía 0 o nada. Ahora se inyecta
  // en TODOS los frames de haxball.com (es idempotente y se protege con flags)
  // y se reintenta unas veces porque el frame del juego puede no existir aún
  // cuando llega dom-ready / did-frame-navigate.
  let retryPending = false;
  async function injectAll() {
    if (!ctx) return;
    try {
      await ctx.execInAllFrames(asScript(fpsProbeInPage));
      await ctx.execInAllFrames(asScript(overrideRafInPage, fpsLimitValue));
    } catch (_) {}
  }
  function injectIntoGame() {
    if (!ctx) return;
    injectAll();
    if (!retryPending) {
      retryPending = true;
      [700, 2000, 4500].forEach((ms) => setTimeout(injectAll, ms));
      setTimeout(() => { retryPending = false; }, 5000);
    }
    if (renderScale !== 1) applyRenderScale();
    applyAdsSetting();
  }

  const clampFps = (v) =>
    Math.min(VIVET_PERF.FPS_LIMIT_MAX, Math.max(VIVET_PERF.FPS_LIMIT_MIN, Number(v) || VIVET_PERF.FPS_LIMIT_DEFAULT));

  async function initFpsLimit() {
    const input = document.querySelector('#fps-limit-input');
    const label = document.querySelector('#fps-limit-value');
    try {
      fpsLimitValue = clampFps(await window.vivet.getConfig('fpsLimit', VIVET_PERF.FPS_LIMIT_DEFAULT));
    } catch (_) {
      fpsLimitValue = VIVET_PERF.FPS_LIMIT_DEFAULT;
    }
    if (input) input.value = String(fpsLimitValue);
    if (label) label.textContent = `${fpsLimitValue} FPS`;

    let saveTimer = null;
    input?.addEventListener('input', () => {
      fpsLimitValue = clampFps(input.value);
      if (label) label.textContent = `${fpsLimitValue} FPS`;
      // Aplica al toque en el frame que ya tiene el override corriendo.
      ctx.execInAllFrames(asScript(setFpsLimitInPage, fpsLimitValue)).catch(() => {});
      // Guardar en disco solo cuando el slider se queda quieto.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => window.vivet.setConfig('fpsLimit', fpsLimitValue).catch(() => {}), 300);
    });
  }

  function initFpsBadge() {
    const badge = document.querySelector('#fps-badge');
    const toggle = document.querySelector('#fps-toggle');
    setInterval(async () => {
      const playing = ctx.appRoot.classList.contains('playing');
      if (!playing || (toggle && !toggle.checked)) {
        if (badge && badge.style.display !== 'none') badge.style.display = 'none';
        return;
      }
      if (badgeBusy) return;
      badgeBusy = true;
      try {
        // Se lee de todos los frames y se toma el mayor; -1 = ese frame no
        // tiene el probe (todavía no se inyectó o el frame se recargó).
        const results = await ctx.execInAllFrames(
          "typeof window.__vivetFps === 'number' ? window.__vivetFps : -1"
        );
        const fps = results.reduce((m, r) => (r.ok && Number(r.value) > m ? Number(r.value) : m), -1);
        if (fps < 0) injectAll();
        if (badge) {
          badge.textContent = fps < 0 ? 'FPS: --' : `FPS: ${fps}`;
          badge.style.display = '';
        }
      } catch (_) {
      } finally {
        badgeBusy = false;
      }
    }, VIVET_PERF.FPS_BADGE_INTERVAL_MS);
  }

  // Antes este toggle existía en el HTML pero no tenía ningún handler: ni
  // guardaba ni leía nada. Ahora persiste 'aggressiveGpu' (lo lee
  // optimizations-main.js al arrancar) y ofrece reiniciar.
  async function initAggressiveGpuToggle() {
    const el = document.querySelector('#aggressive-gpu-toggle');
    if (!el) return;
    try {
      el.checked = !!(await window.vivet.getConfig('aggressiveGpu', false));
    } catch (_) {}
    el.addEventListener('change', async () => {
      try { await window.vivet.setConfig('aggressiveGpu', el.checked); } catch (_) {}
      if (window.confirm('El Modo GPU agresivo necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
        window.vivet.relaunch?.();
      } else {
        ctx.showToast('Se aplicará la próxima vez que abras Vivet', 'ok');
      }
    });
  }

  async function initUncapFpsToggle() {
    const el = document.querySelector('#uncap-fps-toggle');
    if (!el) return;
    try { el.checked = !!(await window.vivet.getConfig('uncapFps', false)); } catch (_) {}
    el.addEventListener('change', async () => {
      try { await window.vivet.setConfig('uncapFps', el.checked); } catch (_) {}
      if (window.confirm('Destrabar el límite de FPS necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
        window.vivet.relaunch?.();
      } else {
        ctx.showToast('Se aplicará la próxima vez que abras Vivet', 'ok');
      }
    });
  }

  const applyRenderScale = () => {
    if (!ctx) return;
    ctx.execInAllFrames(asScript(setRenderScaleInPage, renderScale)).catch(() => {});
  };

  // Calidad de render: escala devicePixelRatio dentro del juego.
  async function initRenderScale() {
    const sel = document.querySelector('#render-scale-select');
    try {
      renderScale = Number(await window.vivet.getConfig('renderScale', 1)) || 1;
    } catch (_) { renderScale = 1; }
    if (![0.35, 0.5, 0.75, 1].includes(renderScale)) renderScale = 1;
    if (renderScale !== 1) applyRenderScale();
    if (sel) {
      if (![...sel.options].some((o) => Number(o.value) === renderScale)) renderScale = 1;
      sel.value = String(renderScale);
      sel.addEventListener('change', () => {
        renderScale = Number(sel.value) || 1;
        applyRenderScale();
        window.vivet.setConfig('renderScale', renderScale).catch(() => {});
      });
    }
  }

  function init(context) {
    ctx = context;
    initRenderScale();
    initFpsLimit();
    initFpsBadge();
    initAggressiveGpuToggle();
    initUncapFpsToggle();
  }

  return { init, injectIntoGame, applyAdsSetting };
})();