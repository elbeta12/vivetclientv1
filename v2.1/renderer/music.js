// Vivet Client - renderer/music.js
// Música del lobby: hasta 4 canciones del propio usuario (archivos locales, no se sube nada).
// Los archivos se guardan en IndexedDB del renderer. Se pausa sola al entrar a jugar
// (clase "playing" en #app-root) y vuelve cuando salís al lobby.
(() => {
  const $ = (s) => document.querySelector(s);
  const MAX = 4;
  const root = $('#app-root');
  const el = { card: $('#mu-player'), title: $('#mu-title'), sub: $('#mu-sub'), cover: $('#mu-cover'),
    cur: $('#mu-cur'), dur: $('#mu-dur'), seek: $('#mu-seek'), vol: $('#mu-vol'), play: $('#mu-play'),
    prev: $('#mu-prev'), next: $('#mu-next'), shuf: $('#mu-shuffle'), loop: $('#mu-loop'),
    add: $('#mu-add'), file: $('#mu-file'), list: $('#mu-list'), count: $('#mu-count'), auto: $('#mu-autoplay') };
  if (!root || !el.card || !el.list) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const paint = (input) => input.style.setProperty('--p', `${(input.value / input.max) * 100}%`);

  // ---------------- almacenamiento (IndexedDB) ----------------
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('vivet-music', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('tracks', mode);
      const out = fn(t.objectStore('tracks'));
      t.oncomplete = () => res(out && out.result);
      t.onerror = () => rej(t.error);
    });
  };
  const dbAll = () => tx('readonly', (s) => s.getAll());
  const dbPut = (rec) => tx('readwrite', (s) => s.add(rec));
  const dbDel = (id) => tx('readwrite', (s) => s.delete(id));

  // ---------------- estado ----------------
  const audio = new Audio();
  audio.preload = 'auto';
  let tracks = [];            // { id, name, blob }
  let idx = -1;
  let url = '';
  let shuffle = !!rd('vivet_music_shuffle', false);
  let loop = rd('vivet_music_loop', true) !== false;
  let resumeAfterGame = false;
  audio.volume = Math.min(1, Math.max(0, Number(rd('vivet_music_vol', 0.4))));

  const cleanName = (n) => n.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || 'Canción';

  function render() {
    el.count.textContent = `${tracks.length}/${MAX}`;
    el.add.disabled = tracks.length >= MAX;
    el.list.innerHTML = tracks.length ? tracks.map((t, i) => `
      <div class="mu-row ${i === idx ? 'cur' : ''}" data-i="${i}">
        <span class="mu-n">${i === idx && !audio.paused ? '♪' : i + 1}</span>
        <span class="mu-name">${esc(cleanName(t.name))}</span>
        <button class="mu-del" type="button" data-del="${t.id}" title="Quitar">✕</button>
      </div>`).join('') : '<p class="hint" style="margin:6px 0;">Todavía no agregaste canciones.</p>';
    const t = tracks[idx];
    el.title.textContent = t ? cleanName(t.name) : 'Sin canciones';
    el.sub.textContent = t ? `Canción ${idx + 1} de ${tracks.length}` : 'Agregá tus temas para empezar';
    el.play.innerHTML = audio.paused
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    el.card.classList.toggle('playing', !audio.paused);
    el.shuf.classList.toggle('on', shuffle);
    el.loop.classList.toggle('on', loop);
  }

  function select(i, autoplay) {
    if (!tracks.length) { idx = -1; audio.removeAttribute('src'); render(); return; }
    idx = ((i % tracks.length) + tracks.length) % tracks.length;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(tracks[idx].blob);
    audio.src = url;
    wr('vivet_music_last', tracks[idx].id);
    if (autoplay) audio.play().catch(() => {});
    render();
  }

  function step(dir) {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) {
      let n; do { n = Math.floor(Math.random() * tracks.length); } while (n === idx);
      return select(n, true);
    }
    select(idx + dir, true);
  }

  // ---------------- eventos del reproductor ----------------
  el.play.addEventListener('click', () => {
    if (!tracks.length) return el.file.click();
    if (idx < 0) select(0, true);
    else if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  el.prev.addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); });
  el.next.addEventListener('click', () => step(1));
  el.shuf.addEventListener('click', () => { shuffle = !shuffle; wr('vivet_music_shuffle', shuffle); render(); });
  el.loop.addEventListener('click', () => { loop = !loop; wr('vivet_music_loop', loop); render(); });
  el.vol.addEventListener('input', () => { audio.volume = el.vol.value / 100; wr('vivet_music_vol', audio.volume); paint(el.vol); });
  el.seek.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (el.seek.value / 1000) * audio.duration;
    paint(el.seek);
  });
  audio.addEventListener('timeupdate', () => {
    if (document.activeElement !== el.seek && audio.duration) el.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    paint(el.seek);
    el.cur.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => { el.dur.textContent = fmt(audio.duration); });
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => {
    if (!loop && idx === tracks.length - 1 && !shuffle) { audio.pause(); return; }
    step(1);
  });
  audio.addEventListener('error', () => { if (tracks.length > 1) step(1); });

  // ---------------- lista ----------------
  el.add.addEventListener('click', () => el.file.click());
  el.file.addEventListener('change', async () => {
    const files = Array.from(el.file.files || []);
    el.file.value = '';
    for (const f of files) {
      if (tracks.length >= MAX) { toast(`Máximo ${MAX} canciones`); break; }
      if (!/^audio\//.test(f.type) && !/\.(mp3|ogg|wav|m4a|flac|aac|opus)$/i.test(f.name)) { toast(`"${f.name}" no es un audio`); continue; }
      try {
        const id = await dbPut({ name: f.name, blob: f });
        tracks.push({ id, name: f.name, blob: f });
      } catch (_) { toast('No se pudo guardar la canción'); }
    }
    if (idx < 0 && tracks.length) select(0, true); else render();
  });
  el.list.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const id = Number(del.dataset.del);
      const curTrack = tracks[idx];
      const wasCur = !!curTrack && curTrack.id === id;
      try { await dbDel(id); } catch (_) {}
      tracks = tracks.filter((t) => t.id !== id);
      if (wasCur) { audio.pause(); select(Math.min(idx, tracks.length - 1), false); }
      else { idx = tracks.indexOf(curTrack); render(); }
      return;
    }
    const row = e.target.closest('.mu-row');
    if (!row) return;
    const i = Number(row.dataset.i);
    if (i === idx) el.play.click(); else select(i, true);
  });
  el.auto.checked = !!rd('vivet_music_auto', false);
  el.auto.addEventListener('change', () => wr('vivet_music_auto', el.auto.checked));

  // ---------------- pausar al jugar ----------------
  const isPlayingGame = () => root.classList.contains('playing') || root.classList.contains('replay-mode') || root.classList.contains('creating');
  let wasGame = isPlayingGame();
  new MutationObserver(() => {
    const g = isPlayingGame();
    if (g === wasGame) return;
    wasGame = g;
    if (g) { resumeAfterGame = !audio.paused; audio.pause(); }
    else if (resumeAfterGame) { resumeAfterGame = false; audio.play().catch(() => {}); }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  // ---------------- arranque ----------------
  el.vol.value = Math.round(audio.volume * 100); paint(el.vol); paint(el.seek);
  (async () => {
    try { tracks = await dbAll(); } catch (_) { tracks = []; }
    const last = rd('vivet_music_last', null);
    const start = Math.max(0, tracks.findIndex((t) => t.id === last));
    if (tracks.length) select(start, false); else render();
    if (tracks.length && el.auto.checked && !isPlayingGame()) audio.play().catch(() => {});
  })();
})();