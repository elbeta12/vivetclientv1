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
  FPS_LIMIT_MAX: 800,
  FPS_LIMIT_DEFAULT: 800,
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

  // El límite se respeta siempre (el máximo del slider es 800 FPS reales).
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

  // El loop corre con el rAF nativo. Si Chromium no está limitado a los Hz del
  // monitor ("Impulso de FPS"), el rAF nativo dispara miles de veces
  // por segundo y este loop se quedaba girando en el hilo principal aunque
  // saltease casi todos los cuadros: eso le quita tiempo a los eventos de
  // teclado y el delay aparece con los minutos. Por eso, si falta bastante
  // para el próximo cuadro, se duerme con un timer y recién ahí se pide el rAF.
  function schedule(now) {
    var wait = (lastTime + 1000 / (window.__vivetFpsLimit || 300)) - now;
    if (wait > 3) setTimeout(function () { nativeRAF(loop); }, wait - 2.5);
    else nativeRAF(loop);
  }
  function loop(now) {
    var interval = 1000 / (window.__vivetFpsLimit || 300);
    var elapsed = now - lastTime;
    if (elapsed >= interval - 0.5) {
      lastTime = elapsed > interval * 2 ? now : lastTime + interval;
      window.__vivetFrame = (window.__vivetFrame || 0) + 1;
      var run = queue;
      queue = [];
      for (var i = 0; i < run.length; i++) {
        var entry = run[i];
        if (!entry.cb) continue;
        try { entry.cb(now); } catch (e) { console.error(e); }
      }
      window.__vivetDelivered++;
    }
    schedule(now);
  }
  nativeRAF(loop);
}

// ---------------------------------------------------------------------------
// Foto de perfil dentro del círculo del jugador (se inyecta en la página del juego)
// ---------------------------------------------------------------------------
// Haxball NO dibuja tu propio nick: en su lugar traza un halo blanco translúcido
// (arc de radio 25, alpha 0.3) en la posición de TU disco y justo después dibuja
// todos los discos con arc() + fill() + stroke(). Entonces: se detecta el halo,
// se toma el primer arc completo con el mismo centro (tu disco) y, cuando termina
// su stroke(), se pinta la foto recortada en círculo encima. Solo cambia lo que ve
// este cliente. Idempotente: volver a llamarla solo actualiza la foto.
// (El parámetro nick ya no se usa; queda por compatibilidad con VivetPerf.)
function avatarHookInPage(dataUrl, nick) {
  try {
    if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
    var st = window.__vivetAvatar || (window.__vivetAvatar = { bmp: null, src: '', halo: null, pend: null });
    if (!dataUrl) {
      st.bmp = null; st.src = ''; st.halo = null; st.pend = null;
    } else if (st.src !== dataUrl) {
      st.src = dataUrl; st.bmp = null;
      var m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (m) {
        // Blob en vez de <img src=data:...>: no depende de la CSP de la página.
        var bin = atob(m[2]);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        createImageBitmap(new Blob([u8], { type: m[1] })).then(function (b) {
          if (st.src === dataUrl) st.bmp = b;
        }).catch(function () {});
      }
    }
    if (window.__vivetAvatarHooked) return;
    window.__vivetAvatarHooked = true;

    var proto = CanvasRenderingContext2D.prototype;
    var nativeArc = proto.arc;
    var nativeStroke = proto.stroke;
    var TAU = Math.PI * 2;

    proto.arc = function (x, y, r, a0, a1) {
      if (st.bmp && a1 - a0 > 6 && a1 - a0 < 6.6) { // círculo completo
        if (r === 25 && Math.abs(this.globalAlpha - 0.3) < 0.02 && /^(#fff(fff)?|white)$/i.test(String(this.strokeStyle))) {
          // Halo del jugador actual.
          st.halo = { ctx: this, x: x, y: y, t: performance.now() };
          st.pend = null;
        } else if (st.halo && st.halo.ctx === this && r >= 3 && r <= 60
          && Math.abs(x - st.halo.x) < 0.5 && Math.abs(y - st.halo.y) < 0.5
          && performance.now() - st.halo.t < 60) {
          // Disco del jugador actual: se pinta cuando termine su stroke().
          st.pend = { ctx: this, x: x, y: y, r: r, t: performance.now() };
          st.halo = null;
        }
      }
      return nativeArc.apply(this, arguments);
    };

    proto.stroke = function () {
      var ret = nativeStroke.apply(this, arguments);
      var p = st.pend;
      if (p && p.ctx === this) {
        st.pend = null;
        if (st.bmp && performance.now() - p.t < 16) {
          try {
            this.save();
            this.beginPath();
            nativeArc.call(this, p.x, p.y, Math.max(1, p.r - 1), 0, TAU);
            this.clip();
            this.drawImage(st.bmp, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            this.restore();
          } catch (e) {}
        }
      }
      return ret;
    };
  } catch (e) {}
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
  // Antes del override se cuentan cuadros con el rAF nativo; una vez que el
  // limitador está activo se lee su contador con un timer de 1s (así no hay
  // un segundo rAF girando a miles de Hz cuando el límite está destrabado).
  function tick() {
    if (window.__vivetRafOverridden) return;
    frames++;
    nativeRAF(tick);
  }
  nativeRAF(tick);
  setInterval(function () {
    var now = performance.now();
    if (window.__vivetRafOverridden) {
      var d = window.__vivetDelivered || 0;
      window.__vivetFps = Math.round((d - lastDelivered) * 1000 / Math.max(1, now - last));
      lastDelivered = d;
    } else {
      window.__vivetFps = Math.round(frames * 1000 / Math.max(1, now - last));
    }
    frames = 0;
    last = now;
  }, 1000);
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
  let fpsBoost = false;
  let avatarData = '';
  let avatarInjected = false;
  let displayHz = 60;
  let badgeBusy = false;
  let badgeFrame = null;
  let badgeTick = 0;
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
      await ctx.execInAllFrames(asScript(overrideRafInPage, effectiveFps()));
      if (avatarData || avatarInjected) {
        // El nick se lee ahora: es el que tenías al entrar a la sala.
        const nick = typeof currentNickname === 'string' ? currentNickname : '';
        await ctx.execInAllFrames('(' + avatarHookInPage.toString() + ')(' + JSON.stringify(avatarData) + ',' + JSON.stringify(nick) + ');');
        avatarInjected = !!avatarData;
      }
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

  // Con el Impulso de FPS activo el tope real es Hz del monitor + 200 (o el
  // slider, si es menor). Sin impulso, Chromium ya limita a los Hz.
  const effectiveFps = () =>
    fpsBoost ? Math.min(fpsLimitValue, Math.round(displayHz) + 200) : fpsLimitValue;
  const fpsLabel = () => `${fpsLimitValue} FPS`;

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
    if (label) label.textContent = fpsLabel();

    let saveTimer = null;
    input?.addEventListener('input', () => {
      fpsLimitValue = clampFps(input.value);
      if (label) label.textContent = fpsLabel();
      // Aplica al toque en el frame que ya tiene el override corriendo.
      ctx.execInAllFrames(asScript(setFpsLimitInPage, effectiveFps())).catch(() => {});
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
        // Cada segundo se pregunta SOLO al frame del juego (ya identificado);
        // cada 10 ticks, o si ese frame falla, se revisan todos. Así no se
        // ejecuta JS en todos los frames (anuncios incluidos) todos los segundos.
        const CODE = "typeof window.__vivetFps === 'number' ? window.__vivetFps : -1";
        let fps = -1;
        badgeTick++;
        if (badgeFrame != null && badgeTick % 10 !== 0) {
          try {
            const v = Number(await window.vivet.execInWebview(ctx.view.getWebContentsId(), CODE, badgeFrame));
            if (Number.isFinite(v)) fps = v;
          } catch (_) { badgeFrame = null; }
        }
        if (fps < 0) {
          const results = await ctx.execInAllFrames(CODE);
          let best = null;
          for (const r of results) {
            if (r.ok && Number(r.value) > fps) { fps = Number(r.value); best = r.frameTreeNodeId; }
          }
          badgeFrame = fps >= 0 ? best : null;
        }
        if (fps < 0) injectAll();
        if (badge) {
          const txt = fps < 0 ? 'FPS: --' : `FPS: ${fps}`;
          if (badge.textContent !== txt) badge.textContent = txt;
          if (badge.style.display !== '') badge.style.display = '';
        }
      } catch (_) {
      } finally {
        badgeBusy = false;
      }
    }, VIVET_PERF.FPS_BADGE_INTERVAL_MS);
  }

  // Modo de aceleración por GPU. Lo lee optimizations-main.js al arrancar
  // ('gpuMode'; si no existe, migra el viejo 'aggressiveGpu'), por eso pide reinicio.
  async function initGpuMode() {
    const sel = document.querySelector('#gpu-mode-select');
    if (!sel) return;
    const MODES = ['auto', 'performance', 'aggressive', 'off'];
    let mode = 'auto';
    try {
      const saved = await window.vivet.getConfig('gpuMode', null);
      if (MODES.includes(saved)) mode = saved;
      else if (await window.vivet.getConfig('aggressiveGpu', false)) mode = 'aggressive';
    } catch (_) {}
    sel.value = mode;
    sel.addEventListener('change', async () => {
      try { await window.vivet.setConfig('gpuMode', sel.value); } catch (_) {}
      if (window.confirm('Cambiar la aceleración por GPU necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
        window.vivet.relaunch?.();
      } else {
        ctx.showToast('Se aplicará la próxima vez que abras Vivet', 'ok');
      }
    });
  }

  // Impulso de FPS: sube el techo a Hz del monitor + 200. Lo lee
  // optimizations-main.js al arrancar ('fpsBoost'), por eso pide reinicio.
  async function initFpsBoostToggle() {
    const el = document.querySelector('#fps-boost-toggle');
    try { displayHz = Number(await window.vivet.displayHz()) || 60; } catch (_) {}
    try { fpsBoost = !!(await window.vivet.getConfig('fpsBoost', false)); } catch (_) {}
    injectAll(); // reaplica el tope ya con Hz + boost conocidos
    if (!el) return;
    el.checked = fpsBoost;
    el.addEventListener('change', async () => {
      try { await window.vivet.setConfig('fpsBoost', el.checked); } catch (_) {}
      if (window.confirm('El Impulso de FPS necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
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

  // Modo rendimiento del PANEL (la interfaz de Vivet, no el juego): pone
  // .perf-mode en <html> y el CSS (final de style.css) apaga animaciones,
  // degradados fijos y sombras. Se aplica al instante, sin reiniciar.
  async function initPanelPerfMode() {
    const el = document.querySelector('#panel-perf-toggle');
    const apply = (on) => document.documentElement.classList.toggle('perf-mode', !!on);
    let on = false;
    try { on = !!(await window.vivet.getConfig('panelPerf', false)); } catch (_) {}
    apply(on);
    if (!el) return;
    el.checked = on;
    el.addEventListener('change', () => {
      apply(el.checked);
      window.vivet.setConfig('panelPerf', el.checked).catch(() => {});
      ctx.showToast(el.checked ? 'Modo rendimiento activado' : 'Modo rendimiento desactivado', 'ok');
    });
  }

  // Deja todo el rendimiento en valores seguros y reinicia (los flags de GPU y
  // "destrabar FPS" solo se aplican al arrancar).
  function initPerfReset() {
    const btn = document.querySelector('#perf-reset-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!window.confirm('Se van a restablecer todas las opciones de rendimiento y se reiniciará Vivet. ¿Continuar?')) return;
      const defaults = {
        gpuMode: 'auto',
        aggressiveGpu: false,
        fpsBoost: false,
        uncapFps: false, // viejo, por si quedó guardado
        fpsLimit: VIVET_PERF.FPS_LIMIT_DEFAULT,
        renderScale: 1,
        panelPerf: false,
      };
      for (const [k, v] of Object.entries(defaults)) {
        try { await window.vivet.setConfig(k, v); } catch (_) {}
      }
      window.vivet.relaunch?.();
    });
  }

  function init(context) {
    ctx = context;
    initPerfReset();
    initPanelPerfMode();
    initRenderScale();
    initFpsLimit();
    initFpsBadge();
    initGpuMode();
    initFpsBoostToggle();
  }

  // Foto de perfil dentro del juego (ver avatar.js). '' = sin foto.
  function setAvatar(dataUrl) {
    avatarData = dataUrl || '';
    injectAll();
  }

  return { init, injectIntoGame, applyAdsSetting, setAvatar };
})();