// Vivet Client - optimizations-main.js
// Optimizaciones del PROCESO PRINCIPAL de Electron: flags de Chromium/GPU,
// throttling, bloqueo de anuncios/popups. Las del renderer (límite de FPS,
// contador, anuncios por CSS) están en renderer/optimizations.js. Ojo: los
// flags de línea de comandos tienen que aplicarse ANTES de app.whenReady(),
// por eso main.js llama a applyPerformanceSwitches() apenas arranca.

// Se mezcla en webPreferences de la ventana principal.
const PERF_WEB_PREFERENCES = {
  backgroundThrottling: false, // mantiene los FPS sin importar el foco
};

// Modo de aceleración por GPU (Rendimiento > "Aceleración por GPU"):
//   auto        (por defecto) Chromium decide solo. Es lo más estable.
//   performance fuerza la GPU dedicada + rasterización por GPU (sin zero-copy:
//               agregaba latencia de input).
//               En notebooks con dos GPU o con otras apps usando la GPU esto
//               puede meter delay en todo (copias entre GPUs, competencia).
//   aggressive  performance + ignora la lista de bloqueo de drivers.
//   off         sin aceleración por hardware (todo por CPU).
const GPU_MODES = ['auto', 'performance', 'aggressive', 'off'];
function gpuModeOf(store) {
  const m = store.get('gpuMode', null);
  if (GPU_MODES.includes(m)) return m;
  // Migración: antes existía solo el toggle "Modo GPU agresivo".
  return store.get('aggressiveGpu', false) ? 'aggressive' : 'auto';
}

function applyPerformanceSwitches(app, store) {
  const mode = gpuModeOf(store);

  if (mode === 'off') {
    app.disableHardwareAcceleration();
  } else if (mode === 'performance' || mode === 'aggressive') {
    app.commandLine.appendSwitch('force_high_performance_gpu');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    if (mode === 'aggressive') {
      // Esta combinación es la causa conocida de que el <canvas> de un captcha
      // se pinte como un bloque gris; por eso solo va en modo agresivo.
      app.commandLine.appendSwitch('ignore-gpu-blocklist');
      app.commandLine.appendSwitch('enable-oop-rasterization');
    }
  }

  // Impulso de FPS (Rendimiento > Avanzado): suelta el tope de Chromium a los
  // Hz del monitor, pero el renderer lo vuelve a limitar a Hz + 200 (ver
  // VivetPerf en renderer/optimizations.js), así el rAF no gira a miles de
  // veces por segundo. Antes esto era "Destrabar límite de FPS" sin tope y
  // trababa todo. Sigue sin tocar el vsync de la GPU (con eso el teclado iba
  // con delay). Pide reinicio.
  if (mode !== 'off' && store.get('fpsBoost', false)) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
  }

  // Evita bajones de FPS del juego si la app no está enfocada.
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  // OJO: antes acá también se desactivaba CalculateNativeWinOcclusion. Eso
  // hacía que Vivet siguiera dibujando a full aunque otra ventana lo tapara,
  // y competía por CPU/GPU con las demás apps abiertas. Ahora Chromium sí
  // detecta cuando estás tapado y deja de pintar.
  app.commandLine.appendSwitch('disable-features', 'LazyFrameLoading');
}

// Se llama por cada webContents nuevo (incluye el <webview> del juego).
function tuneWebContents(contents) {
  try {
    contents.setBackgroundThrottling(false);
  } catch (_) {}
  if (contents.getType && contents.getType() === 'webview') guardWebview(contents);
}

// ---------------------------------------------------------------------------
// Popups y navegaciones no deseadas del <webview> del juego
// ---------------------------------------------------------------------------
// Los anuncios de la página abren una ventana nueva con el primer clic (por
// ejemplo al crear una sala por primera vez). El juego real nunca necesita
// abrir ventanas: se niegan todas.
const HAXBALL_HOST = /(^|\.)haxball\.com$/i;
function guardWebview(contents) {
  try {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  } catch (_) {}
  // Un anuncio también puede intentar redirigir la página principal a otro sitio.
  const block = (event, url) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'about:' || HAXBALL_HOST.test(u.hostname)) return;
      event.preventDefault();
    } catch (_) {}
  };
  contents.on('will-navigate', block);
  contents.on('will-redirect', block);
}

// ---------------------------------------------------------------------------
// Bloqueo de anuncios a nivel de red (sesión del juego)
// ---------------------------------------------------------------------------
// Además de ocultarlos por CSS, no se descargan: menos CPU/red/GPU mientras
// el lobby corre por detrás del panel. Siempre activo.
const AD_URL_FILTERS = [
  '*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*',
  '*://*.googletagservices.com/*', '*://adservice.google.com/*', '*://*.2mdn.net/*',
  '*://*.amazon-adsystem.com/*', '*://*.adnxs.com/*', '*://*.rubiconproject.com/*',
  '*://*.pubmatic.com/*', '*://*.openx.net/*', '*://*.criteo.com/*', '*://*.criteo.net/*',
  '*://*.taboola.com/*', '*://*.outbrain.com/*', '*://*.adsafeprotected.com/*',
  '*://*.moatads.com/*', '*://*.casalemedia.com/*', '*://*.smartadserver.com/*',
  '*://*.adform.net/*', '*://*.adsrvr.org/*', '*://*.gumgum.com/*', '*://*.33across.com/*',
  '*://*.sharethrough.com/*', '*://*.media.net/*', '*://*.contextweb.com/*',
  '*://*.lijit.com/*', '*://*.yieldmo.com/*', '*://*.bidswitch.net/*',
  '*://*.onetag-sys.com/*', '*://*.scorecardresearch.com/*',
];

function installNetworkGuards(session) {
  // Siempre activo (sin opción en la UI): los anuncios nunca se descargan.
  session.webRequest.onBeforeRequest({ urls: AD_URL_FILTERS }, (details, callback) => {
    callback({ cancel: true });
  });
}

module.exports = {
  PERF_WEB_PREFERENCES,
  applyPerformanceSwitches,
  tuneWebContents,
  installNetworkGuards,
};