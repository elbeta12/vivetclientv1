// Vivet Client - optimizations-main.js
// Optimizaciones del PROCESO PRINCIPAL de Electron: flags de Chromium/GPU y
// throttling. Las del renderer (límite de FPS, contador, anuncios) están en
// renderer/optimizations.js. Ojo: los flags de línea de comandos tienen que
// aplicarse ANTES de app.whenReady(), por eso main.js llama a
// applyPerformanceSwitches() apenas arranca.

// Se mezcla en webPreferences de la ventana principal.
const PERF_WEB_PREFERENCES = {
  backgroundThrottling: false, // mantiene los FPS sin importar el foco
};

function applyPerformanceSwitches(app, store) {
  // Forzar la GPU dedicada de alto rendimiento
  app.commandLine.appendSwitch('force_high_performance_gpu');

  // Rasterización por GPU para reducir la latencia de dibujado en Canvas 2D.
  // 'ignore-gpu-blocklist' y 'enable-oop-rasterization' NO van por defecto:
  // esa combinación es la causa conocida de que el <canvas> de un captcha
  // se pinte como un bloque gris. Quien los necesite (placas viejas / drivers
  // raros) los activa con "Modo GPU agresivo" en el panel de Rendimiento.
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  if (store.get('aggressiveGpu', false)) {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('enable-oop-rasterization');
  }

  // Destrabar el límite de FPS: por defecto Chromium ata requestAnimationFrame
  // a los Hz del monitor. Estos dos flags lo sueltan (el slider de "Límite de
  // FPS" pasa a mandar de verdad, hasta 400). Cuesta más GPU/CPU y puede
  // haber tearing, por eso viene apagado. Se activa en Rendimiento y pide reinicio.
  if (store.get('uncapFps', false)) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
  }

  // Evita bajones de FPS si la app no está enfocada / tapada
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,LazyFrameLoading');
}

// Se llama por cada webContents nuevo (incluye el <webview> del juego).
function tuneWebContents(contents) {
  try {
    contents.setBackgroundThrottling(false);
  } catch (_) {}
}

module.exports = {
  PERF_WEB_PREFERENCES,
  applyPerformanceSwitches,
  tuneWebContents,
};