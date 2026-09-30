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
    if (!st.frame) { st.frame = 0; st.stamp = 0; st.lastArc = 0; }
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

      // Cuenta los cuadros de render para no confundir dos discos pegados con uno solo.
      var nRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        return nRaf.call(window, function (ts) { st.raf = true; st.frame++; return cb(ts); });
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
            var p = dev(this, x, y), R = r * p.k, now = performance.now();
            if (!st.raf && now - st.lastArc > 2) st.frame++; // sin rAF: se estima el cuadro por el tiempo
            st.lastArc = now;
            st.dbg.arcs++;
            var dsc = null, bd = 1e9;
            for (var i = 0; i < st.discs.length; i++) {
              var d = st.discs[i];
              if (now - d.t > KEEP || Math.abs(d.R - R) > 0.5) continue;
              var dist = Math.hypot(d.x - p.x, d.y - p.y);
              if (d.f === st.frame) {
                // ya dibujado en este cuadro: solo es el mismo si está en el mismo lugar
                if (dist < 0.5) { dsc = d; bd = -1; break; }
                continue;
              }
              if (dist < R * 1.5 && dist < bd) { dsc = d; bd = dist; }
            }
            if (dsc) { dsc.x = p.x; dsc.y = p.y; dsc.t = now; dsc.f = st.frame; }
            else { dsc = { x: p.x, y: p.y, R: R, t: now, f: st.frame, mk: 0 }; st.discs.push(dsc); }
            if (st.discs.length > 200) st.discs = st.discs.filter(function (d) { return now - d.t < KEEP; });
            st.pend = { ctx: this, x: x, y: y, r: r, dx: p.x, dy: p.y, R: R, t: now, d: dsc };
          }
        } catch (e) {}
        return nArc.apply(this, arguments);
      };

      // Aprende dónde dibuja Haxball el nombre respecto de su disco (en unidades de radio),
      // midiéndolo con jugadores que están solos (un disco con un solo nombre cerca).
      var learn = function (ds, now) {
        if (st.learnF === st.frame) return;
        st.learnF = st.frame;
        var fresh = [], i, j;
        for (var nick in st.names) if (now - st.names[nick].t < KEEP) fresh.push(nick);
        var dn = [], nd = [];
        for (j = 0; j < ds.length; j++) dn.push([]);
        for (i = 0; i < fresh.length; i++) nd.push([]);
        for (i = 0; i < fresh.length; i++) {
          var n = st.names[fresh[i]];
          for (j = 0; j < ds.length; j++) {
            var dist = Math.hypot(n.x - ds[j].x, n.y - ds[j].y);
            if (dist >= ds[j].R * 4) continue;
            if (fresh[i].length <= 2 && dist < ds[j].R) continue;
            dn[j].push(i); nd[i].push(j);
          }
        }
        if (!st.samples) st.samples = [];
        for (i = 0; i < fresh.length; i++) {
          if (nd[i].length !== 1 || dn[nd[i][0]].length !== 1) continue;
          var d = ds[nd[i][0]], n2 = st.names[fresh[i]];
          st.samples.push({ x: (n2.x - d.x) / d.R, y: (n2.y - d.y) / d.R });
        }
        // Votación: el desplazamiento real se repite en cada jugador (cada nombre con SU disco),
        // mientras que los emparejamientos falsos (vecinos, pelota) caen cada uno en un lugar distinto.
        if (fresh.length >= 2) {
          var bins = {}, bestK = null, bestC = 0;
          for (i = 0; i < fresh.length; i++) {
            var nm = st.names[fresh[i]];
            for (var q = 0; q < nd[i].length; q++) {
              var dd = ds[nd[i][q]];
              var ox = (nm.x - dd.x) / dd.R, oy = (nm.y - dd.y) / dd.R;
              var key = Math.round(ox * 3) + ',' + Math.round(oy * 3);
              var b = bins[key] || (bins[key] = { c: 0, x: 0, y: 0 });
              b.c++; b.x += ox; b.y += oy;
              if (b.c > bestC) { bestC = b.c; bestK = key; }
            }
          }
          if (bestK && bestC >= 2) st.samples.push({ x: bins[bestK].x / bestC, y: bins[bestK].y / bestC });
        }
        while (st.samples.length > 25) st.samples.shift();
        if (st.samples.length >= 6) {
          var med = function (k) {
            var a = st.samples.map(function (q) { return q[k]; }).sort(function (u, v) { return u - v; });
            return a[a.length >> 1];
          };
          st.off = { x: med('x'), y: med('y') };
          st.dbg.off = { x: +st.off.x.toFixed(2), y: +st.off.y.toFixed(2), n: st.samples.length };
        }
      };

      proto.stroke = function () {
        var ret = nStroke.apply(this, arguments);
        try {
          var p = st.pend;
          if (st.on && p && p.ctx === this) {
            st.pend = null;
            st.dbg.strokes++;
            var now = performance.now();
            if (now - p.t < 100) {
              // Asignación global disco <-> nombre: los pares se ordenan por distancia y cada
              // nombre (y cada disco) se usa una sola vez. Así, con jugadores pegados, un disco
              // sin nombre (el tuyo) no le roba el nombre a su vecino.
              var ds = [];
              for (var i = 0; i < st.discs.length; i++) if (now - st.discs[i].t < 100) ds.push(st.discs[i]);
              learn(ds, now);
              var off = st.off, pairs = [], t0 = 0;
              for (var nick in st.names) {
                var n = st.names[nick];
                if (now - n.t > KEEP) continue;
                for (var j = 0; j < ds.length; j++) {
                  var dist = Math.hypot(n.x - ds[j].x, n.y - ds[j].y);
                  if (dist >= ds[j].R * 4) continue;
                  if (nick.length <= 2 && dist < ds[j].R) continue; // texto del avatar de Haxball
                  // Nivel 0: el nombre cae donde se espera para ESTE disco (desplazamiento aprendido).
                  // Nivel 1: solo por cercanía, y únicamente para lo que el nivel 0 no reclamó.
                  var tier = 1, score = dist;
                  if (off) {
                    var e = Math.hypot(n.x - (ds[j].x + off.x * ds[j].R), n.y - (ds[j].y + off.y * ds[j].R));
                    if (e < ds[j].R) { tier = 0; score = e; t0++; }
                  }
                  pairs.push({ d: ds[j], nick: nick, dist: score, tier: tier });
                }
              }
              if (off) {
                // Si el desplazamiento aprendido no encaja con nada durante un buen rato, estaba mal.
                if (!t0 && ds.length && pairs.length) st.miss = (st.miss || 0) + 1; else st.miss = 0;
                if (st.miss > 200) { st.samples = []; st.off = null; st.miss = 0; st.dbg.resets = (st.dbg.resets || 0) + 1; }
              }
              pairs.sort(function (a, b) { return (a.tier - b.tier) || (a.dist - b.dist); });
              var stamp = ++st.stamp, usedN = {}, got = null, gotD = 0;
              for (var k = 0; k < pairs.length; k++) {
                var pr = pairs[k];
                if (pr.d.mk === stamp || usedN[pr.nick]) continue;
                pr.d.mk = stamp; usedN[pr.nick] = 1;
                if (pr.d === p.d) { got = pr.nick; gotD = pr.dist; break; }
              }
              if (got) {
                var nn = st.names[got];
                st.dbg.lastNear = { nick: got, dx: Math.round(nn.x - p.dx), dy: Math.round(nn.y - p.dy), R: Math.round(p.R), me: got === st.me, bmp: !!st.bmps[got] };
              }
              if (!got) st.dbg.noName++;
              else if (got === st.me || !st.bmps[got]) st.dbg.noBmp++;
              else {
                this.save();
                this.beginPath();
                nArc.call(this, p.x, p.y, Math.max(1, p.r - 1), 0, TAU);
                this.clip();
                this.drawImage(st.bmps[got], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
                this.restore();
                st.dbg.drawn++;
                st.dbg.lastPick = { nick: got, d: Math.round(gotD), R: Math.round(p.R), discs: ds.length };
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