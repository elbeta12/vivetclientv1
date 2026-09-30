// Vivet Client - renderer/peers.js
// Fotos de los demás: si otro jugador de Vivet eligió foto y la comparte, se
// dibuja dentro de SU círculo en tu juego (igual que tu propia foto).
//  - Tu foto se sube al servidor (PUT /me/avatar) si tenés sesión y "Compartir" activo.
//  - Mientras jugás, un hook dentro de la página anota los nombres que Haxball
//    dibuja sobre los círculos; acá se consultan al servidor (POST /avatars/lookup)
//    y se le devuelven al hook las fotos encontradas.
// Se carga DESPUÉS de friends.js y avatar.js (usa window.vivetApi, execInAllFrames,
// appRoot, replayMode, creatingRoom, currentNickname).
//
// DIAGNÓSTICO: en DevTools (Ctrl+Shift+I) escribí  vivetPeersDebug(true)  y mirá la
// consola con el filtro "[peers]". Con  vivetPeersDebug(false)  se apaga.

// Se ejecuta DENTRO de la página del juego (se inyecta con .toString()).
// arg = { add: {nick: dataUrl}, me: nick, on: bool }. Devuelve { seen, have, dbg } o null.
function peerHookInPage(arg) {
  try {
    if (!/(^|\.)haxball\.com$/.test(location.hostname)) return null;
    var st = window.__vivetPeers || (window.__vivetPeers = {
      on: true, me: '', bmps: {}, names: {}, discs: [], seen: {}, pend: null,
      dbg: { texts: 0, imgs: 0, arcs: 0, strokes: 0, drawn: 0, noName: 0, notClosest: 0, noBmp: 0 },
    });
    if (!st.cv) st.cv = new WeakMap(); // canvas -> último nombre dibujado en él (etiquetas cacheadas)
    if (st.dbg.imgs === undefined) st.dbg.imgs = 0;
    st.on = arg.on !== false;
    st.me = arg.me || '';
    var add = arg.add || {};
    Object.keys(add).forEach(function (nick) {
      var m = /^data:([^;]+);base64,(.+)$/.exec(add[nick]);
      if (!m) return;
      try {
        var bin = atob(m[2]), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        createImageBitmap(new Blob([u8], { type: m[1] })).then(function (b) { st.bmps[nick] = b; }).catch(function () {});
      } catch (e) {}
    });

    if (!window.__vivetPeersHooked) {
      window.__vivetPeersHooked = true;
      var proto = CanvasRenderingContext2D.prototype;
      var nArc = proto.arc, nStroke = proto.stroke, nText = proto.fillText;
      var TAU = Math.PI * 2, KEEP = 300;
      var dev = function (ctx, x, y) {
        var m = ctx.getTransform();
        return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, k: Math.hypot(m.a, m.b) };
      };

      proto.fillText = function (text, x, y) {
        try {
          if (st.on && typeof text === 'string' && text.length > 1 && text.length < 26) {
            var p = dev(this, x, y), now = performance.now();
            st.names[text] = { x: p.x, y: p.y, t: now };
            var s = st.seen[text] || (st.seen[text] = { n: 0, t: 0 });
            s.n++; s.t = now;
            st.dbg.texts++;
            // Si este canvas es una etiqueta cacheada, más abajo drawImage lo ubica en pantalla.
            st.cv.set(this.canvas, text);
          }
        } catch (e) {}
        return nText.apply(this, arguments);
      };

      // Haxball puede dibujar el nombre UNA vez en un canvas aparte y después pegarlo
      // con drawImage en cada cuadro. Ahí la posición real del nombre es la del drawImage.
      var nDraw = proto.drawImage;
      proto.drawImage = function (src) {
        try {
          if (st.on && src && src !== this.canvas) {
            var nick = st.cv.get(src);
            if (nick) {
              var a = arguments, dx, dy, dw, dh;
              if (a.length >= 9) { dx = a[5]; dy = a[6]; dw = a[7]; dh = a[8]; }
              else { dx = a[1]; dy = a[2]; dw = a.length >= 5 ? a[3] : src.width; dh = a.length >= 5 ? a[4] : src.height; }
              var p = dev(this, dx + dw / 2, dy + dh / 2), now = performance.now();
              st.names[nick] = { x: p.x, y: p.y, t: now };
              var s = st.seen[nick] || (st.seen[nick] = { n: 0, t: 0 });
              s.n++; s.t = now;
              st.dbg.imgs++;
            }
          }
        } catch (e) {}
        return nDraw.apply(this, arguments);
      };

      proto.arc = function (x, y, r, a0, a1) {
        try {
          if (st.on && a1 - a0 > 6 && a1 - a0 < 6.6 && r >= 3 && r <= 60) {
            var p = dev(this, x, y), R = r * p.k, now = performance.now(), found = false;
            st.dbg.arcs++;
            for (var i = 0; i < st.discs.length; i++) {
              var d = st.discs[i];
              if (Math.abs(d.R - R) < 0.5 && Math.hypot(d.x - p.x, d.y - p.y) < R * 0.8) {
                d.x = p.x; d.y = p.y; d.t = now; found = true; break;
              }
            }
            if (!found) st.discs.push({ x: p.x, y: p.y, R: R, t: now });
            if (st.discs.length > 200) st.discs = st.discs.filter(function (d) { return now - d.t < KEEP; });
            st.pend = { ctx: this, x: x, y: y, r: r, dx: p.x, dy: p.y, R: R, t: now };
          }
        } catch (e) {}
        return nArc.apply(this, arguments);
      };

      proto.stroke = function () {
        var ret = nStroke.apply(this, arguments);
        try {
          var p = st.pend;
          if (st.on && p && p.ctx === this) {
            st.pend = null;
            st.dbg.strokes++;
            var now = performance.now();
            if (now - p.t < 16) {
              var best = null, bestD = 1e9, anyName = false;
              for (var nick in st.names) {
                var n = st.names[nick];
                if (now - n.t > KEEP || nick === st.me) continue;
                anyName = true;
                if (!st.bmps[nick]) continue;
                var dd = Math.hypot(n.x - p.dx, n.y - p.dy);
                if (dd < bestD && dd < p.R * 4) { best = nick; bestD = dd; }
              }
              if (!best) {
                if (!anyName) st.dbg.noName++; else st.dbg.noBmp++;
              } else {
                // Este círculo tiene que ser el más cercano a ese nombre (así
                // la pelota o un jugador vecino no se llevan la foto).
                var n2 = st.names[best], mine = Math.hypot(n2.x - p.dx, n2.y - p.dy), ok = true;
                for (var i = 0; i < st.discs.length; i++) {
                  var d = st.discs[i];
                  if (now - d.t > KEEP || (Math.abs(d.x - p.dx) < 0.5 && Math.abs(d.y - p.dy) < 0.5)) continue;
                  if (Math.hypot(n2.x - d.x, n2.y - d.y) < mine - 1) { ok = false; break; }
                }
                if (ok) {
                  this.save();
                  this.beginPath();
                  nArc.call(this, p.x, p.y, Math.max(1, p.r - 1), 0, TAU);
                  this.clip();
                  this.drawImage(st.bmps[best], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
                  this.restore();
                  st.dbg.drawn++;
                } else st.dbg.notClosest++;
              }
            }
          }
        } catch (e) {}
        return ret;
      };
    }

    var t = performance.now(), seen = [];
    for (var k in st.seen) {
      var s = st.seen[k];
      if (t - s.t > 10000) { delete st.seen[k]; continue; }
      // n >= 1: si Haxball cachea el nombre en un canvas aparte, fillText se llama pocas veces.
      if (s.n >= 1 && k !== st.me && !/^\d+$/.test(k)) seen.push(k);
    }
    return {
      seen: seen.slice(0, 40),
      have: Object.keys(st.bmps),
      dbg: st.dbg,
      nameSamples: Object.keys(st.names).slice(0, 8),
    };
  } catch (e) { return null; }
}

(() => {
  const EP_PUT = '/me/avatar';            // PUT { image } / DELETE
  const EP_LOOKUP = '/avatars/lookup';    // POST { nicks } -> { avatars: { nick: dataUrl } }
  const TICK_MS = 2500, TTL_FOUND = 5 * 60 * 1000, TTL_MISS = 60 * 1000, TTL_ERROR = 20 * 1000;
  const IMG_OK = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/;

  const $ = (s) => document.querySelector(s);
  const cache = new Map(); // nick -> { img|null, t, err? }
  let see = true, share = true, mine = '', lastPushed = null, busy = false, hookOn = true;
  let debug = false;
  const log = (...a) => { if (debug) console.log('[peers]', ...a); };
  window.vivetPeersDebug = (v = true) => { debug = !!v; return `peers debug ${debug ? 'ON' : 'OFF'}`; };

  const api = () => window.vivetApi;
  const loggedIn = () => !!(api() && api().loggedIn());
  const playing = () => {
    try { return appRoot.classList.contains('playing') && !replayMode && !creatingRoom; } catch (_) { return false; }
  };
  const asScript = (arg) => '(' + peerHookInPage.toString() + ')(' + JSON.stringify(arg) + ');';
  const myNick = () => (typeof currentNickname === 'string' ? currentNickname : '');

  // ------------------------------------------------------------ mi foto -> servidor
  async function pushMine() {
    if (!loggedIn()) return;
    const want = share && mine ? mine : '';
    if (lastPushed === want) return;
    try {
      if (want) await api().request('PUT', EP_PUT, { image: want });
      else await api().request('DELETE', EP_PUT);
      lastPushed = want;
      log('mi foto', want ? 'subida al servidor' : 'quitada del servidor');
    } catch (e) {
      // Se reintenta en el próximo cambio / sesión. Se deja a la vista: antes este error era invisible.
      console.warn('[peers] no se pudo subir tu foto:', e && e.message);
    }
  }

  // ------------------------------------------------------------ fotos de los demás
  async function lookup(names) {
    const now = Date.now();
    const need = names.filter((n) => {
      const c = cache.get(n);
      if (!c) return true;
      return now - c.t > (c.err ? TTL_ERROR : c.img ? TTL_FOUND : TTL_MISS);
    }).slice(0, 30);
    if (!need.length) return;
    let found = {};
    try {
      const r = await api().request('POST', EP_LOOKUP, { nicks: need });
      found = (r && r.avatars) || {};
      log('lookup', need, '->', Object.keys(found));
    } catch (e) {
      console.warn('[peers] lookup falló (¿servidor sin /avatars/lookup o sesión vencida?):', e && e.message);
      // Se recuerda el fallo un rato para no martillar al servidor cada 2,5 s.
      for (const n of need) cache.set(n, { img: null, t: now, err: true });
      return;
    }
    for (const n of need) {
      const img = found[n];
      const ok = typeof img === 'string' && img.length < 80000 && IMG_OK.test(img);
      if (typeof img === 'string' && !ok) console.warn('[peers] foto de', n, 'descartada (formato o tamaño inválido)');
      cache.set(n, { img: ok ? img : null, t: now });
    }
    if (cache.size > 300) for (const k of [...cache.keys()].slice(0, 100)) cache.delete(k);
  }

  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const on = see && playing();
      if (!on && !hookOn) return;
      const base = { me: myNick(), on };
      const probe = await execInAllFrames(asScript({ ...base, add: {} }));
      hookOn = on;
      if (debug) {
        log('on=', on, 'sesion=', loggedIn(), 'yo=', base.me);
        log('frames=', probe.map((r) => ({ ok: r.ok, v: r.value && { seen: r.value.seen, have: r.value.have, dbg: r.value.dbg, samples: r.value.nameSamples }, e: r.error })));
      }
      if (!on || !loggedIn()) return;
      const frames = probe.filter((r) => r.ok && r.value && Array.isArray(r.value.seen));
      const names = [...new Set(frames.flatMap((r) => r.value.seen))];
      await lookup(names);
      const id = view.getWebContentsId();
      for (const fr of frames) {
        const have = new Set(fr.value.have);
        const add = {};
        for (const [n, c] of cache) if (c.img && !have.has(n) && names.includes(n)) add[n] = c.img;
        if (Object.keys(add).length) {
          log('inyectando fotos de', Object.keys(add));
          await window.vivet.execInWebview(id, asScript({ ...base, add }), fr.frameTreeNodeId)
            .catch((e) => console.warn('[peers] no se pudo inyectar la foto:', e && e.message));
        }
      }
    } catch (e) {
      console.warn('[peers] tick falló:', e && e.message);
    } finally { busy = false; }
  }

  // ------------------------------------------------------------ UI
  function bindToggle(sel, key, get, set) {
    const el = $(sel);
    if (!el) return;
    el.checked = get();
    el.addEventListener('change', () => {
      set(el.checked);
      window.vivet.setConfig(key, el.checked).catch(() => {});
    });
  }

  window.addEventListener('vivet-avatar-changed', (e) => { mine = (e.detail || ''); pushMine(); });
  window.addEventListener('vivet-session-changed', () => { lastPushed = null; cache.clear(); pushMine(); });

  (async () => {
    try {
      see = (await window.vivet.getConfig('peerPhotos', true)) !== false;
      share = (await window.vivet.getConfig('sharePhoto', true)) !== false;
      mine = (await window.vivet.getConfig('avatarPhoto', '')) || '';
    } catch (_) {}
    bindToggle('#peer-photos-toggle', 'peerPhotos', () => see, (v) => { see = v; if (!v) tick(); });
    bindToggle('#share-photo-toggle', 'sharePhoto', () => share, (v) => { share = v; pushMine(); });
    for (let i = 0; i < 20 && !loggedIn(); i++) await new Promise((r) => setTimeout(r, 1000));
    pushMine();
    setInterval(tick, TICK_MS);
  })();
})();