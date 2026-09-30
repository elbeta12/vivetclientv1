// Vivet Client - renderer/replays.js
// Reproductor de replays (.hbr2). Usa el reproductor oficial de Haxball, que
// NO tiene una URL propia (haxball.com/replay da 404): vive en el botón
// "Replays" de la lista de salas de haxball.com/play. Vivet carga el lobby,
// intercepta el selector de archivos que abre ese botón y le entrega el
// archivo elegido, dejando el juego a la vista con un botón para salir. Se
// carga DESPUÉS de app.js porque usa sus globales (view, appRoot, setPlaying,
// execInAllFrames, ...).

const replayListEl = $('#replay-list');
const replayOpenBtn = $('#replay-open-btn');
const replayRefreshBtn = $('#replay-refresh-btn');
const replayStatusEl = $('#replay-status');
const replayExitBtn = $('#exit-replay-btn');
let replayBusy = false;

function setReplayStatus(text) {
  if (replayStatusEl) replayStatusEl.textContent = text || '';
}

function fmtReplaySize(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function refreshReplayList() {
  if (!replayListEl) return;
  let list = [];
  try { list = await window.vivet.replayList(); } catch (_) {}
  if (!list.length) {
    replayListEl.innerHTML = '<div class="hint">Todavía no hay replays. Tocá "Abrir replay…" para elegir un archivo .hbr2.</div>';
    return;
  }
  replayListEl.innerHTML = list.map((r, i) => `
    <button class="replay-item" data-i="${i}">
      <span class="replay-item-name">${escapeHtml(r.name)}</span>
      <span class="replay-item-meta">${escapeHtml(new Date(r.mtime).toLocaleString())} · ${fmtReplaySize(r.size)}</span>
    </button>`).join('');
  replayListEl.querySelectorAll('.replay-item').forEach((btn) => {
    btn.addEventListener('click', () => playReplay(list[Number(btn.dataset.i)]));
  });
}

// --- se ejecutan DENTRO de la página del juego -----------------------------
// El "Replays" de Haxball es un <div> (no un <button>), así que se busca entre
// cualquier elemento cuyo texto sea exactamente "Replays", quedándose con el
// más interno y visible. Cada función se inyecta por separado (.toString()),
// por eso la búsqueda está repetida en las dos.
function replaysButtonProbeInPage() {
  try {
    var els = document.querySelectorAll('div, button, a, span, li');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (/^\s*replays?\s*$/i.test(el.textContent || '') && !(el.children && el.children.length && /^\s*replays?\s*$/i.test(el.children[0].textContent || ''))) {
        if (!el.getClientRects || el.getClientRects().length > 0) return true;
      }
    }
    return false;
  } catch (e) { return false; }
}
// Toca "Replays". Eso abre un selector de archivos (un <input type=file> que
// se dispara con .click()): en vez de dejar que abra el diálogo del sistema,
// se intercepta ese click y se le entrega el archivo. Si en cambio Haxball
// muestra un <input type=file> en pantalla, se le entrega directo.
function injectReplayInPage(name, b64) {
  try {
    var target = null;
    var els = document.querySelectorAll('div, button, a, span, li');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (/^\s*replays?\s*$/i.test(el.textContent || '') && !(el.children && el.children.length && /^\s*replays?\s*$/i.test(el.children[0].textContent || ''))) {
        if (!el.getClientRects || el.getClientRects().length > 0) { target = el; break; }
      }
    }
    if (!target) return 'no-button';

    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
    var file = new File([bytes], name, { type: 'application/octet-stream' });

    var handled = false;
    function feed(input) {
      if (handled) return;
      handled = true;
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var origClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file' && !handled) { feed(this); return; }
      return origClick.apply(this, arguments);
    };
    function restore() { HTMLInputElement.prototype.click = origClick; }

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      try { target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); } catch (_) {}
    });

    // Por si en vez de abrir el selector muestra un input visible: se reintenta
    // unos segundos y después se restaura el click original.
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (handled) { clearInterval(timer); restore(); return; }
      var input = document.querySelector('input[type=file]');
      if (input) { feed(input); clearInterval(timer); restore(); return; }
      if (tries >= 15) { clearInterval(timer); restore(); }
    }, 200);
    return 'ok';
  } catch (e) {
    return 'error:' + ((e && e.message) || e);
  }
}

function waitForViewLoad(timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      view.removeEventListener('did-stop-loading', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    view.addEventListener('did-stop-loading', finish);
  });
}

async function deliverReplayFile(name, base64) {
  // El lobby tarda en aparecer (handshake + posible pantalla de nickname):
  // reintenta hasta ~15s.
  for (let i = 0; i < 30; i++) {
    try {
      // Si Haxball pide nickname antes de mostrar el lobby, lo completa.
      await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
      const results = await execInAllFrames('(' + replaysButtonProbeInPage.toString() + ')();');
      const hit = results.find((r) => r.ok && r.value === true);
      if (hit) {
        const code = '(' + injectReplayInPage.toString() + ')(' + JSON.stringify(name) + ',' + JSON.stringify(base64) + ');';
        const out = await window.vivet.execInWebview(view.getWebContentsId(), code, hit.frameTreeNodeId);
        return out === 'ok';
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function playReplay(entry) {
  if (!entry || replayBusy) return;
  replayBusy = true;
  setReplayStatus(`Cargando ${entry.name}…`);
  try {
    const file = await window.vivet.replayRead(entry.path);
    if (!file || !file.ok) {
      setReplayStatus('');
      showToast((file && file.error) || 'No se pudo leer el replay');
      return;
    }

    // Modo replay: el juego queda a la vista como al jugar, pero sin
    // chequeos de sala (ver replayMode en app.js).
    replayMode = true;
    joinedAt = Date.now();
    appRoot.classList.add('replay-mode');
    setPlaying(true);
    updateDiscordPresence(null);

    gameFrameHint = null;
    view.loadURL(HAXBALL_PLAY_URL);
    await waitForViewLoad(15000);

    const ok = await deliverReplayFile(file.name, file.base64);
    if (ok) {
      setReplayStatus('');
      focusGameView();
    } else {
      showToast('No se pudo cargar solo: usá el botón Replays de Haxball');
      setReplayStatus('No se encontró el botón "Replays" de Haxball; usalo a mano desde la lista de salas.');
    }
  } catch (err) {
    showToast('No se pudo abrir el replay');
    exitReplay();
  } finally {
    replayBusy = false;
  }
}

function exitReplay() {
  if (!replayMode) return;
  replayMode = false;
  appRoot.classList.remove('replay-mode');
  gameFrameHint = null;
  setPlaying(false); // vuelve a mostrar Vivet y reactiva el sondeo de salas
  updateDiscordPresence(null);
  try { view.loadURL(HAXBALL_PLAY_URL); } catch (_) {}
  setReplayStatus('');
  refreshReplayList();
}

replayOpenBtn?.addEventListener('click', async () => {
  const entry = await window.vivet.replayPick().catch(() => null);
  if (entry) playReplay(entry);
});
replayRefreshBtn?.addEventListener('click', refreshReplayList);
replayExitBtn?.addEventListener('click', exitReplay);
document.querySelector('.nav-btn[data-panel="panel-replays"]')?.addEventListener('click', refreshReplayList);
