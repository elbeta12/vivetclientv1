// Vivet Client - renderer/peers.js
// Fotos de los demás: si otro jugador de Vivet eligió foto y la comparte, se
// dibuja dentro de SU círculo en tu juego (igual que tu propia foto).
//  - Tu foto se sube al servidor (PUT /me/avatar) si tenés sesión y "Compartir" activo.
//  - Mientras jugás, un hook dentro de la página anota los nombres que Haxball
//    dibuja sobre los círculos; acá se consultan al servidor (POST /avatars/lookup)
//    y se le devuelven al hook las fotos encontradas.
// Se carga DESPUÉS de friends.js y avatar.js (usa window.vivetApi, execInAllFrames,
// appRoot, replayMode, creatingRoom, currentNickname).

// Se ejecuta DENTRO de la página del juego (se inyecta con .toString()).
// arg = { add: {nick: dataUrl}, me: nick, on: bool }. Devuelve { seen, have } o null.
function peerHookInPage(arg) {
  try {
    if (!/(^|\.)haxball\.com$/.test(location.hostname)) return null;
    var st = window.__vivetPeers || (window.__vivetPeers = {
      on: true, me: '', bmps: {}, names: {}, discs: [], seen: {}, pend: null,
    });
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
          }
        } catch (e) {}
        return nText.apply(this, arguments);
      };

      proto.arc = function (x, y, r, a0, a1) {
        try {
          if (st.on && a1 - a0 > 6 && a1 - a0 < 6.6 && r >= 3 && r <= 60) {
            var p = dev(this, x, y), R = r * p.k, now = performance.now(), found = false;
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
            var now = performance.now();
            if (now - p.t < 16) {
              var best = null, bestD = 1e9;
              for (var nick in st.names) {
                var n = st.names[nick];
                if (now - n.t > KEEP || !st.bmps[nick] || nick === st.me) continue;
                var dd = Math.hypot(n.x - p.dx, n.y - p.dy);
                if (dd < bestD && dd < p.R * 4) { best = nick; bestD = dd; }
              }
              if (best) {
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
                }
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
      if (s.n >= 2 && k !== st.me && !/^\d+$/.test(k)) seen.push(k);
    }
    return { seen: seen.slice(0, 40), have: Object.keys(st.bmps) };
  } catch (e) { return null; }
}

(() => {
  const EP_PUT = '/me/avatar';            // PUT { image } / DELETE
  const EP_LOOKUP = '/avatars/lookup';    // POST { nicks } -> { avatars: { nick: dataUrl } }
  const TICK_MS = 2500, TTL_FOUND = 5 * 60 * 1000, TTL_MISS = 60 * 1000;
  const IMG_OK = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/;

  const $ = (s) => document.querySelector(s);
  const cache = new Map(); // nick -> { img|null, t }
  let see = true, share = true, mine = '', lastPushed = null, busy = false, hookOn = true;

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
    } catch (_) { /* se reintenta en el próximo cambio / sesión */ }
  }

  // ------------------------------------------------------------ fotos de los demás
  async function lookup(names) {
    const now = Date.now();
    const need = names.filter((n) => { const c = cache.get(n); return !c || now - c.t > (c.img ? TTL_FOUND : TTL_MISS); });
    if (!need.length) return;
    let found = {};
    try {
      const r = await api().request('POST', EP_LOOKUP, { nicks: need.slice(0, 30) });
      found = (r && r.avatars) || {};
    } catch (_) { return; }
    for (const n of need.slice(0, 30)) {
      const img = found[n];
      cache.set(n, { img: typeof img === 'string' && img.length < 80000 && IMG_OK.test(img) ? img : null, t: now });
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
          await window.vivet.execInWebview(id, asScript({ ...base, add }), fr.frameTreeNodeId).catch(() => {});
        }
      }
    } catch (_) {
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