// Vivet Client - renderer/ranking-stats.js
// Stats INDIVIDUALES: partidas, victorias, goles y asistencias propias, y su ranking ("Top por stats" en Competitivo).
// Se carga DESPUÉS de app.js (usa appRoot, execInAllFrames, replayMode, currentNickname, withClientMark, escapeHtml).
//
// Cómo mide (todo dentro de la página del juego, solo LEE el DOM, no toca nada):
//  - Partida: arranca cuando aparece el marcador (.game-state-view .scoreboard .score) y termina cuando
//    desaparece estando todavía en la sala (.room-view). Si salís de la sala a mitad de partida no cuenta.
//  - Tu equipo: se busca tu nick en la lista de jugadores (.player-list-item) y se mira en qué columna está.
//    Se recuerda el último equipo visto. Si no se logra detectar, la partida cuenta como "jugada" sin victoria/derrota.
//  - Goles y asistencias PROPIOS: Haxball no dice quién metió el gol. Solo se suman si la sala lo anuncia en el
//    chat (los bots de las salas: "Gol de TuNick", "Gol de X, asistencia TuNick", "Goal by ...", etc.).
//    En salas sin anuncios quedan en 0: no se inventa nada.
// El servidor valida y guarda (ver servidor/stats.js).

(() => {
  const EP_SEND = '/competitive/stats';
  const EP_ME = '/competitive/stats/me';
  const EP_TOP = '/competitive/stats/top';
  const POLL_MS = 2500;
  const TOP_REFRESH_MS = 45000;
  const MAX_PENDING = 20;

  const $ = (s) => document.querySelector(s);
  const esc = (t) => (typeof escapeHtml === 'function' ? escapeHtml(String(t ?? '')) : String(t ?? ''));
  const api = () => window.vivetApi;
  const loggedIn = () => !!(api() && api().loggedIn());
  const panelActive = () => !!$('#panel-competitivo')?.classList.contains('active');

  // ---------------------------------------------------------------------------
  // Colector: se inyecta en la página del juego. Es idempotente (instala una sola vez) y cada llamada
  // devuelve las partidas terminadas desde la anterior + una lectura del estado para el diagnóstico.
  // ---------------------------------------------------------------------------
  function collector(names, minSecs) {
    try {
      if (!/(^|\.)haxball\.com$/.test(location.hostname)) return null;
      var st = window.__vvStats;
      if (!st) {
        st = window.__vvStats = { active: false, r: 0, b: 0, start: 0, goals: 0, assists: 0, team: null,
          queue: [], seen: new WeakSet(), ann: 0, noScore: 0, names: [], minSecs: 90 };

        var isWord = function (c) { return !!c && /[A-Za-z0-9_\u00C0-\u024F]/.test(c); };
        // Posición de mi nick dentro de un texto (con límites de palabra), o -1.
        var findMe = function (txt) {
          var best = -1;
          for (var i = 0; i < st.names.length; i++) {
            var n = st.names[i], from = 0;
            while (true) {
              var p = txt.indexOf(n, from);
              if (p < 0) break;
              if (!isWord(txt.charAt(p - 1)) && !isWord(txt.charAt(p + n.length))) { if (best < 0 || p < best) best = p; break; }
              from = p + 1;
            }
          }
          return best;
        };
        var scores = function () {
          var r = document.querySelector('[data-hook=red-score]'), b = document.querySelector('[data-hook=blue-score]');
          if (!r || !b) {
            var sc = document.querySelectorAll('.game-state-view .scoreboard .score');
            if (sc.length >= 2) { r = sc[0]; b = sc[1]; }
          }
          if (!r || !b) return null;
          var rn = parseInt(r.textContent, 10), bn = parseInt(b.textContent, 10);
          return isNaN(rn) || isNaN(bn) ? null : [rn, bn];
        };
        var hintOf = function (el) {
          var s = ((el.getAttribute && el.getAttribute('data-hook')) || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
          var toks = s.toLowerCase().split(/[\s_]+/);
          for (var i = 0; i < toks.length; i++) {
            var t = toks[i];
            if (t === 'red' || t === 'red-list' || t === 'redlist' || t === 'red-team') return 'red';
            if (t === 'blue' || t === 'blue-list' || t === 'bluelist' || t === 'blue-team') return 'blue';
            if (t === 'spec' || t === 'spectators' || t === 'spec-list' || t === 'specs') return 'spec';
          }
          return null;
        };
        var teamOf = function () {
          var items = document.querySelectorAll('.player-list-item');
          for (var i = 0; i < items.length; i++) {
            if (findMe(items[i].textContent || '') < 0) continue;
            var el = items[i];
            for (var k = 0; k < 6 && el && el !== document.body; k++, el = el.parentElement) {
              var h = hintOf(el);
              if (h) return h;
            }
          }
          return null;
        };
        // Anuncios de la sala ("Gol de X", "Gol de X, asistencia Y"): solo suman si el que aparece soy yo.
        var parseChat = function (text) {
          var low = text.toLowerCase();
          if (!/gol|goal|\u26BD/.test(low)) return;
          var pos = findMe(text);
          if (pos < 0) return;
          var ai = low.search(/asist|assist|\uD83C\uDD70|ayud/);
          if (ai < 0 || pos < ai) st.goals++; else st.assists++;
        };
        var begin = function (s, now) { st.active = true; st.start = now; st.r = s[0]; st.b = s[1]; st.goals = 0; st.assists = 0; st.noScore = 0; };
        var finish = function (ok, now) {
          var secs = Math.round((now - st.start) / 1000);
          st.active = false;
          if (!ok || secs < st.minSecs) return;
          var team = st.team, rec;
          if (team === 'red' || team === 'blue') {
            var gf = team === 'red' ? st.r : st.b, ga = team === 'red' ? st.b : st.r;
            rec = { result: gf > ga ? 'win' : gf < ga ? 'loss' : 'draw', gf: gf, ga: ga };
          } else rec = { result: 'unknown', gf: 0, ga: 0 };
          rec.goals = st.goals; rec.assists = st.assists; rec.secs = secs;
          st.queue.push(rec);
        };
        var tick = function () {
          try {
            var now = Date.now(), s = scores(), tm = teamOf();
            if (tm) st.team = tm;
            var ps = document.querySelectorAll('.chatbox-view-contents p.announcement');
            st.ann = ps.length;
            for (var i = 0; i < ps.length; i++) {
              if (st.seen.has(ps[i])) continue;
              st.seen.add(ps[i]);
              if (st.active) parseChat(ps[i].textContent || '');
            }
            if (s) {
              st.noScore = 0;
              if (!st.active) begin(s, now);
              else if (s[0] + s[1] < st.r + st.b) { finish(true, now); begin(s, now); } // el marcador se reinició: nueva partida
              else { st.r = s[0]; st.b = s[1]; }
            } else if (st.active) {
              if (!st.noScore) st.noScore = now;
              if (now - st.noScore > 1500) finish(!!document.querySelector('.room-view'), st.noScore);
            }
          } catch (e) {}
        };
        setInterval(tick, 500);
      }
      st.names = names || [];
      if (minSecs > 0) st.minSecs = minSecs;
      return JSON.stringify({
        queue: st.queue.splice(0), active: st.active, r: st.r, b: st.b, team: st.team,
        goals: st.goals, assists: st.assists, ann: st.ann,
      });
    } catch (e) { return null; }
  }
  const COLLECT = (names) => `(${collector.toString()})(${JSON.stringify(names)}, 0)`;

  // ---------------------------------------------------------------------------
  // Envío (con reintentos: si no hay sesión o falla la red, las partidas esperan en disco)
  // ---------------------------------------------------------------------------
  let pending = [];   // [{ rec, tries }]
  let flushing = false;
  let lastRead = null;
  const savePending = () => { try { window.vivet.setConfig('statsPending', pending); } catch (_) {} };

  async function flush() {
    if (flushing || !loggedIn() || !pending.length) return;
    flushing = true;
    let sent = false;
    try {
      while (pending.length) {
        const it = pending[0];
        try { await api().request('POST', EP_SEND, it.rec); pending.shift(); sent = true; }
        catch (_) { it.tries = (it.tries || 0) + 1; if (it.tries >= 5) pending.shift(); else break; }
      }
    } finally { flushing = false; savePending(); }
    if (sent) { loadMine(); if (panelActive()) loadTop(); }
  }

  async function poll() {
    if (!appRoot.classList.contains('playing') || (typeof replayMode !== 'undefined' && replayMode)) { lastRead = null; return; }
    const nick = typeof currentNickname === 'string' ? currentNickname : '';
    const marked = typeof withClientMark === 'function' ? withClientMark(nick) : nick;
    const names = [...new Set([marked, nick].filter((n) => n && n.length >= 2))];
    if (!names.length) return;
    let results;
    try { results = await execInAllFrames(COLLECT(names)); } catch (_) { return; }
    for (const r of results || []) {
      if (!r || !r.ok || !r.value) continue;
      let d; try { d = JSON.parse(r.value); } catch (_) { continue; }
      lastRead = d;
      for (const rec of d.queue || []) {
        pending.push({ rec, tries: 0 });
        if (pending.length > MAX_PENDING) pending.shift();
      }
    }
    if (pending.length) { savePending(); flush(); }
    renderDiag();
  }

  // ---------------------------------------------------------------------------
  // Interfaz (se agrega dentro de Competitivo, debajo del top por XP)
  // ---------------------------------------------------------------------------
  const TABS = [['wins', 'Victorias'], ['goals', 'Goles'], ['assists', 'Asistencias'], ['matches', 'Partidos'], ['winrate', '% victorias']];
  let by = 'wins';
  let mine = null;     // null = sin cargar
  let top = null;      // null = cargando, 'error' = falló
  let topInfo = { min_decided: 0 };
  let topError = '';

  function buildUI() {
    const anchor = $('#comp-lb');
    if (!anchor || $('#cs-root')) return;
    anchor.insertAdjacentHTML('afterend', `
      <div id="cs-root">
        <div class="fr-section-title">Mis stats</div>
        <div class="card" id="cs-me"></div>
        <div class="fr-section-title">Top por stats</div>
        <div class="ap-row" style="margin:0 32px 10px"><div class="ap-seg" id="cs-tabs">${
          TABS.map(([k, t]) => `<button type="button" class="ap-seg-btn" data-by="${k}">${t}</button>`).join('')
        }</div></div>
        <p id="cs-note" class="hint" style="margin:0 32px 10px"></p>
        <div id="cs-lb"></div>
      </div>`);
    $('#cs-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.ap-seg-btn');
      if (!b) return;
      by = b.dataset.by; top = null; syncTabs(); renderTop(); loadTop();
    });
    syncTabs();
  }
  const syncTabs = () => document.querySelectorAll('#cs-tabs .ap-seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.by === by));

  function renderMe() {
    const box = $('#cs-me');
    if (!box) return;
    if (!loggedIn()) { box.innerHTML = '<p class="hint" style="margin:0">Conectá tu Discord en Social para llevar tus stats y entrar al top.</p>'; return; }
    const m = mine || { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, goals_for: 0, goals_against: 0 };
    const decided = m.wins + m.draws + m.losses;
    const wr = decided ? Math.round((m.wins / decided) * 100) + '%' : '—';
    const cell = (n, l) => `<div><div style="font-size:22px;font-weight:800">${esc(n)}</div><div class="hint" style="margin:0">${l}</div></div>`;
    box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:14px">
      ${cell(m.matches, 'Partidos')}${cell(m.wins, 'Victorias')}${cell(m.draws, 'Empates')}${cell(m.losses, 'Derrotas')}
      ${cell(wr, '% victorias')}${cell(m.goals, 'Goles (propios)')}${cell(m.assists, 'Asistencias')}</div>
      <p id="cs-diag" class="hint" style="margin:12px 0 0"></p>`;
    renderDiag();
  }

  // Lo que el cliente está viendo en la partida actual: sirve para comprobar que la detección funciona en tu sala.
  function renderDiag() {
    const el = $('#cs-diag');
    if (!el) return;
    if (!lastRead || !appRoot.classList.contains('playing')) { el.textContent = 'Las stats se suman solas mientras jugás en una sala.'; return; }
    const t = lastRead.team === 'red' ? 'rojo' : lastRead.team === 'blue' ? 'azul' : lastRead.team === 'spec' ? 'espectador' : 'sin detectar';
    el.textContent = `Ahora: equipo ${t} · ${lastRead.active ? `partida en curso ${lastRead.r}–${lastRead.b}` : 'sin partida'} · ` +
      `tus goles ${lastRead.goals}, asistencias ${lastRead.assists} · anuncios de la sala vistos: ${lastRead.ann}`;
  }

  function renderTop() {
    const box = $('#cs-lb'), note = $('#cs-note');
    if (!box) return;
    if (note) note.textContent = by === 'winrate' ? `Entran los jugadores con al menos ${topInfo.min_decided || 10} partidas con resultado.` :
      (by === 'goals' || by === 'assists') ? 'Goles y asistencias se cuentan solo en salas que los anuncian en el chat.' : '';
    if (!api() || !api().configured) { box.innerHTML = '<p class="hint fr-empty">El top no está disponible: falta configurar FRIENDS_API_URL en config.js.</p>'; return; }
    if (top === null) { box.innerHTML = '<p class="hint fr-empty">Cargando…</p>'; return; }
    if (top === 'error') { box.innerHTML = `<p class="hint fr-empty">No se pudo cargar el top (${esc(topError)}). Revisá que el servidor tenga la ruta ${esc(EP_TOP)}.</p>`; return; }
    if (!top.length) { box.innerHTML = '<p class="hint fr-empty">Todavía no hay jugadores en este top.</p>'; return; }
    const myId = api().me()?.id;
    box.innerHTML = top.map((u, i) => {
      const who = u.haxball_nick ? `${u.haxball_nick} (${u.username})` : (u.username || '?');
      const cls = `fr-row ${i < 3 ? 'comp-top' + (i + 1) : ''} ${myId != null && u.id === myId ? 'comp-me' : ''}`;
      const val = by === 'winrate' ? Math.round(u.value * 100) + '%' : u.value;
      return `<div class="${cls}">
        <div class="comp-pos">${i + 1}</div>
        <img class="fr-avatar" alt="" src="${esc(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />
        <div class="fr-row-info"><div class="fr-row-name">${esc(who)}</div>
          <div class="fr-row-sub">${u.matches} partidos · ${u.wins}V ${u.draws}E ${u.losses}D · ${u.goals} goles · ${u.assists} asist.</div></div>
        <div class="comp-time">${esc(val)}</div>
      </div>`;
    }).join('');
  }

  async function loadMine() {
    if (!loggedIn()) { mine = null; renderMe(); return; }
    try { mine = await api().request('GET', EP_ME); } catch (_) {}
    renderMe();
  }
  async function loadTop() {
    if (!api() || !api().configured) { renderTop(); return; }
    const asked = by;
    try {
      const r = await api().request('GET', `${EP_TOP}?by=${asked}&limit=50`);
      if (asked !== by) return; // cambiaste de pestaña mientras cargaba
      top = (r && r.top) || []; topInfo = r || {};
    } catch (e) { if (asked !== by) return; top = 'error'; topError = (e && e.message) || ''; }
    renderTop();
  }

  buildUI();
  renderMe(); renderTop();
  document.querySelector('.nav-btn[data-panel="panel-competitivo"]')?.addEventListener('click', () => { loadMine(); loadTop(); });
  window.addEventListener('vivet-session-changed', () => { mine = null; renderMe(); loadMine(); flush(); if (panelActive()) loadTop(); });
  setInterval(() => { if (panelActive()) loadTop(); }, TOP_REFRESH_MS);
  setInterval(poll, POLL_MS);
  (async () => {
    try { const p = await window.vivet.getConfig('statsPending', []); if (Array.isArray(p)) pending = p.filter((x) => x && x.rec).slice(-MAX_PENDING); } catch (_) {}
    loadMine(); flush();
  })();

  // Para probar el colector desde las herramientas de desarrollo o en tests.
  window.VivetStats = { collector, poll, flush, pending: () => pending.slice() };
})();