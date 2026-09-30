// Vivet Client - renderer/avatar.js
// Foto de perfil dentro del juego: eliges una foto y se dibuja dentro del
// círculo de TU jugador (el que tiene tu nickname), como el color de la pelota.
// Es solo visual y local: los demás jugadores ven tu círculo normal. La foto se
// recorta a cuadrado, se achica a 128x128 y se guarda en la config ('avatarPhoto').
// El dibujo en sí lo hace VivetPerf (optimizations.js, avatarHookInPage).
// Se carga DESPUÉS de app.js (usa showToast y VivetPerf).

(() => {
  const SIZE = 128;
  const MAX_BYTES = 8 * 1024 * 1024;
  const $ = (s) => document.querySelector(s);
  let data = '';

  function render() {
    const pv = $('#avatar-preview');
    if (pv) {
      pv.style.backgroundImage = data ? `url("${data}")` : '';
      pv.classList.toggle('empty', !data);
    }
    const rm = $('#avatar-remove-btn');
    if (rm) rm.hidden = !data;
  }

  async function prepare(file) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
    let out = c.toDataURL('image/webp', 0.88);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
    return out;
  }

  async function commit(next) {
    data = next;
    render();
    try { await window.vivet.setConfig('avatarPhoto', data); } catch (_) {}
    if (typeof VivetPerf !== 'undefined') VivetPerf.setAvatar(data);
    window.dispatchEvent(new CustomEvent('vivet-avatar-changed', { detail: data }));
  }

  $('#avatar-pick-btn')?.addEventListener('click', () => $('#avatar-file')?.click());
  $('#avatar-remove-btn')?.addEventListener('click', () => {
    commit('');
    showToast('Foto quitada', 'ok');
  });
  $('#avatar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Elegí un archivo de imagen');
    if (file.size > MAX_BYTES) return showToast('La imagen pesa demasiado (máx. 8 MB)');
    try {
      await commit(await prepare(file));
      showToast('Foto guardada. Se ve al entrar a una sala', 'ok');
    } catch (_) {
      showToast('No se pudo leer esa imagen');
    }
  });

  render();
  (async () => {
    try { data = (await window.vivet.getConfig('avatarPhoto', '')) || ''; } catch (_) {}
    render();
    if (data && typeof VivetPerf !== 'undefined') VivetPerf.setAvatar(data);
  })();
})();