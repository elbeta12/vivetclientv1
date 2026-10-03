window.vivetChat&&(()=>{const t=("undefined"!=typeof FRIENDS_API_URL&&FRIENDS_API_URL?FRIENDS_API_URL:"").replace(/\/+$/,"");let e="",n=null,a={friends:[],incoming:[],outgoing:[],blocked:[]},o=null;async function i(a,o,i){const s=await fetch(t+o,{method:a,headers:{"Content-Type":"application/json",...e?{Authorization:"Bearer "+e}:{}},body:i?JSON.stringify(i):void 0});let c=null;try{c=await s.json()}catch(t){}if(401===s.status&&(n=null),!s.ok)throw new Error(c&&c.error||`Error ${s.status}`);return c}async function s(){try{a=await i("GET","/friends"),window.dispatchEvent(new Event("vivet-friends-updated"))}catch(t){}}window.escapeHtml=t=>String(t??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[t])),window.showToast=(t,e)=>{const n=document.getElementById("cw-toasts");if(!n)return;const a=document.createElement("div");a.className="cw-toast "+(e||""),a.textContent=t,n.appendChild(a),setTimeout(()=>a.remove(),3500)},window.vivetApi={configured:!!t,request:i,loggedIn:()=>!(!e||!n),me:()=>n,friends:()=>a,roomUrl:()=>o};const c=async()=>{await async function(){if(document.hidden)return;let t="";try{t=await window.vivetChat.getToken()||""}catch(t){}if(t!==e||t&&!n){if(e=t,n=null,a={friends:[],incoming:[],outgoing:[],blocked:[]},t)try{n=await i("GET","/me")}catch(t){}n&&await s(),window.dispatchEvent(new Event("vivet-session-changed"))}}(),window.vivetApi.loggedIn()&&!document.hidden&&async function(){let t=null;try{t=await window.vivetChat.myRoomUrl()}catch(t){}t!==o&&(o=t,window.dispatchEvent(new Event("vivet-room-updated")))}()};setInterval(c,4e3),setInterval(()=>{!document.hidden&&window.vivetApi.loggedIn()&&s()},1e4),document.addEventListener("visibilitychange",()=>{document.hidden||(c(),s())}),window.addEventListener("keydown",t=>{"Escape"===t.key&&(t.preventDefault(),window.vivetChat.hide())}),c()})(),(()=>{const e=!!window.vivetChat,n=t=>document.querySelector(t),a=()=>window.vivetApi,o=e=>"function"==typeof t?t(e):e,i=t=>escapeHtml(String(t??"")),s=/https:\/\/www\.haxball\.com\/play\?c=([A-Za-z0-9_-]{6,64})/,c="undefined"!=typeof CHAT_HOTKEY&&CHAT_HOTKEY?String(CHAT_HOTKEY):"F8",r=new Map,l=new Map,d=[],u=new Map,h={};let v=null,p=null,m=!1,f=!1;const w=()=>{const t=a()&&a().me();return t?t.id:null},g=()=>!(!a()||!a().loggedIn()),y=()=>!e&&!(!appRoot||!appRoot.classList.contains("playing")),b=()=>{try{const t=(a().friends()||{}).friends||[];return window.vivetGroups?t.concat(window.vivetGroups.items()):t}catch(t){return[]}},$=t=>b().find(e=>e.id===t),E=t=>t.haxball_nick?`${t.haxball_nick} (${t.username})`:t.username,L=t=>String(t).padStart(2,"0"),T=t=>{const e=new Date(t);return`${L(e.getHours())}:${L(e.getMinutes())}`},H=t=>{const e=new Date,n=new Date;return n.setDate(e.getDate()-1),t.toDateString()===e.toDateString()?o("Hoy"):t.toDateString()===n.toDateString()?o("Ayer"):t.toLocaleDateString()},S=t=>window.vivetGroups&&window.vivetGroups.isMarker(t.body)?o("Mensaje de grupo"):s.test(t.body)?o("Invitación a una sala"):t.body,C=t=>t.group?t.sub:t.room?`${o("Jugando en")} ${t.room.name||o("una sala")}`:t.online?o("En línea"):o("Desconectado");function k(){try{if(e)return a().roomUrl();if(!y()||"undefined"==typeof currentRoomUrl||!currentRoomUrl)return null;const t=new URL(currentRoomUrl).searchParams.get("c");return t&&/^[A-Za-z0-9_-]{6,64}$/.test(t)?`https://www.haxball.com/play?c=${encodeURIComponent(t)}`:null}catch(t){return null}}const _=t=>{try{window.open("vivet-chat://"+(t?"toggle":"open"))}catch(t){}},A=()=>e?!document.hidden:!y()&&!!n("#panel-chats")?.classList.contains("active");function D(t){let e=l.get(t);return e||(e={list:[],more:!1,loaded:!1,loading:!1},l.set(t,e)),e}function I(t,e,GL){if(window.vivetGroups&&"string"==typeof e.body&&window.vivetGroups.ingest(e,!!GL))return!1;const n=D(t);return!n.list.some(t=>t.id===e.id)&&(n.list.push(e),n.list.sort((t,e)=>t.id-e.id),n.list.length>300&&n.list.splice(0,n.list.length-300),!0)}function R(){const t=function(){const t=new Set(b().map(t=>t.id));let e=0;for(const[n,a]of r)t.has(n)&&(e+=a.unread||0);return e}();document.querySelectorAll(".ch-badge").forEach(e=>{e.hidden=0===t,e.textContent=t>99?"99+":String(t)})}function M(t){const e=r.get(t);e&&e.unread&&(e.unread=0,R(),d.forEach(B),"string"==typeof t?window.vivetGroups&&window.vivetGroups.read(t):(clearTimeout(h[t]),h[t]=setTimeout(()=>a().request("POST",`/chat/${t}/read`).catch(()=>{}),400)))}
function GH(){const VG=window.vivetGroups;if(!VG)return;for(const g of VG.items()){const n=D(g.id);VG.messages(g.id).forEach(m=>{n.list.some(x=>x.id===m.id)||n.list.push(m)}),n.list.sort((x,y)=>x.id-y.id),n.loaded=!0,n.more=!1;r.set(g.id,{unread:VG.unread(g.id),last:n.list[n.list.length-1]||null})}}
function GP(gid,msg,live){const VG=window.vivetGroups;if(!VG)return;const cv=D(gid);if(cv.list.some(x=>x.id===msg.id))return;cv.list.push(msg),cv.list.sort((x,y)=>x.id-y.id),cv.list.length>300&&cv.list.splice(0,cv.list.length-300),cv.loaded=!0;const ent=r.get(gid)||{unread:0,last:null};if(r.set(gid,ent),(!ent.last||msg.id>=ent.last.id)&&(ent.last=msg),msg.from!==w())if(live&&d.some(x=>A()&&x.active===gid))VG.read(gid),ent.unread=0;else ent.unread=VG.unread(gid);R(),d.forEach(B),d.forEach(x=>{x.active===gid&&z(x)})}
window.__vvBridge={push:GP,refresh:()=>{GH(),R(),P()},rehydrate:()=>{GH(),R(),P()},open:gid=>{D(gid).loaded=!0,d.forEach(x=>{x.active=gid,x.renderedFor=null,x.root.classList.add("ch-open"),B(x),z(x)})}};
function U(t,n){const a=w(),o=t.from===a?t.to:t.from;if(!I(o,t,n))return;const i=r.get(o)||{unread:0,last:null};var s;r.set(o,i),(!i.last||t.id>=i.last.id)&&(i.last=t),t.from!==a&&n&&(f&&!e||(s=o,d.some(t=>A()&&t.active===s)?M(o):(i.unread=(i.unread||0)+1,function(t,e){const n=$(t);if(!n)return;const a=Date.now();if(a-(u.get(t)||0)<8e3)return;u.set(t,a);const o=S(e);try{showToast(`${E(n)}: ${o.length>70?o.slice(0,70)+"…":o}`,"ok")}catch(t){}}(o,t))))}async function x(){const t=await a().request("GET","/chat/conversations");r.clear();for(const e of t.conversations||[]){const gm=!!(e.last&&"string"==typeof e.last.body&&window.vivetGroups&&window.vivetGroups.isMarker(e.last.body));r.set(e.id,{unread:gm?0:e.unread||0,last:gm?null:e.last||null})}v=Number(t.cursor)||0,GH(),window.vivetGroups&&window.vivetGroups.sync(t.conversations||[]),R(),P()}async function F(){if(!(!g()||m||e&&document.hidden)){m=!0;try{if(null==v)return void await x();for(let t=0,e=!0;e&&t<5;t++){const t=await a().request("GET",`/chat/poll?after=${v}`),n=t.messages||[];e=n.length>=100,n.forEach(t=>U(t,!0)),v=Math.max(v,Number(t.cursor)||v),n.length&&(R(),P())}}finally{m=!1}}}function N(){clearTimeout(p);const t=g()?document.hidden?e?4e3:2e4:d.some(A)?3e3:8e3:4e3;p=setTimeout(async()=>{try{await F()}catch(t){}N()},t)}const O=()=>{F().catch(()=>{}),N()};async function q(t,e){if("string"==typeof t){const n=D(t);return n.loaded=!0,n.more=!1,void d.forEach(e=>{e.active===t&&z(e)})}const n=D(t);if(!n.loading){n.loading=!0;try{const o=(await a().request("GET",`/chat/${t}/messages${e?`?before=${e}`:""}`)).messages||[];o.forEach(e=>I(t,e)),n.more=o.length>=50,n.loaded=!0}catch(t){showToast(t&&t.message||"No se pudo cargar el chat")}finally{n.loading=!1}d.forEach(n=>{n.active===t&&z(n,{older:!!e})})}}async function j(t,e){const n=e.trim().slice(0,500);if(!n)return!1;if("string"==typeof t){try{await window.vivetGroups.send(t,n.slice(0,400))}catch(e){return showToast(e&&e.message||"No se pudo enviar"),!1}return d.forEach(e=>{B(e),e.active===t&&z(e,{bottom:!0})}),!0}try{return U(await a().request("POST",`/chat/${t}`,{body:n}),!1),d.forEach(e=>{B(e),e.active===t&&z(e,{bottom:!0})}),!0}catch(t){return showToast(t&&t.message||"No se pudo enviar"),!1}}function G(t){const e=s.exec(t);if(!e)return i(t);const n=t.replace(e[0],"").trim(),a=`https://www.haxball.com/play?c=${e[1]}`;return(n?`${i(n)}<br>`:"")+`<span class="ch-invite">${i(o("Invitación a una sala"))} <button class="primary-btn" type="button" data-act="join" data-url="${i(a)}">${i(o("Unirme"))}</button></span>`}function B(t){const e=t.$(".ch-list");if(!e)return;const n=t.$(".ch-search input").value.trim().toLowerCase(),a=w(),s=t=>t.room?0:t.online?1:2,c=b().filter(t=>!n||E(t).toLowerCase().includes(n)).sort((t,e)=>{const n=r.get(t.id)?.last?.created_at||0;return(r.get(e.id)?.last?.created_at||0)-n||s(t)-s(e)||t.username.localeCompare(e.username)});c.length?e.innerHTML=c.map(e=>{const n=r.get(e.id),s=n&&n.last?`${n.last.from===a?o("Vos")+": ":""}${S(n.last)}`:C(e),c=e.room?"in-room":e.online?"online":"",l=n&&n.unread?`<span class="nav-badge">${n.unread>99?"99+":n.unread}</span>`:"";return`<button class="ch-item ${t.active===e.id?"active":""} ${n&&n.unread?"unread":""}" type="button" data-id="${e.id}">\n        <span class="ch-av"><img class="fr-avatar" alt="" src="${i(e.avatar_url||"")}" onerror="this.removeAttribute('src')" /><i class="fr-dot ${c}"></i></span>\n        <span class="ch-item-info"><span class="ch-item-name">${i(E(e))}</span><span class="ch-item-sub">${i(s)}</span></span>${l}</button>`}).join(""):e.innerHTML=`<p class="hint ch-empty">${i(o(n?"Sin resultados.":"Todavía no tenés amigos. Agregalos en Social."))}</p>`}function z(t,e={}){const n=t.$(".ch-head"),a=t.$(".ch-msgs"),s=t.$(".ch-input"),c=t.active,r=null!=c?$(c):null;if(!r)return t.active=null,t.renderedFor=null,t.root.classList.remove("ch-open"),n.innerHTML="",s.hidden=!0,void(a.innerHTML=`<p class="hint ch-empty">${i(o("Elegí un chat para empezar."))}</p>`);s.hidden=!1;const l=k();n.innerHTML=`<button class="ghost-btn secondary-action ch-back" type="button" data-act="back">←</button>\n      <img class="fr-avatar" alt="" src="${i(r.avatar_url||"")}" onerror="this.removeAttribute('src')" />\n      <div class="ch-head-info"><div class="fr-row-name">${i(E(r))}</div><div class="fr-row-sub ${r.room?"in-room":""}">${i(C(r))}</div></div>\n      ${r.group?`<button class="ghost-btn secondary-action" type="button" data-act="gmanage">${i(o("Miembros"))}</button>`:""}${l?`<button class="ghost-btn secondary-action" type="button" data-act="invite">${i(o("Invitar a mi sala"))}</button>`:""}`;const d=D(c),u=w(),h=a.scrollHeight-a.scrollTop-a.clientHeight<60,v=a.scrollHeight,p=a.scrollTop;let m=d.more?`<button class="ghost-btn secondary-action ch-more" type="button" data-act="older">${i(o("Cargar anteriores"))}</button>`:"";d.list.length||(m+=`<p class="hint ch-empty">${i(o(d.loaded?"Todavía no hay mensajes. ¡Saludá!":"Cargando…"))}</p>`);let f="";for(const t of d.list){const e=new Date(t.created_at),n=e.toDateString();n!==f&&(m+=`<div class="ch-day">${i(H(e))}</div>`,f=n),m+=`<div class="ch-msg ${t.from===u?"mine":"theirs"}"><div class="ch-bubble">${r.group&&t.from!==u?`<b class="ch-sender">${i(window.vivetGroups.name(t.from))}</b>`:""}${G(t.body)}</div><span class="ch-time">${T(t.created_at)}</span></div>`}a.innerHTML=m,e.older?a.scrollTop=a.scrollHeight-v+p:e.bottom||h||t.renderedFor!==c?a.scrollTop=a.scrollHeight:a.scrollTop=p,t.renderedFor=c}function P(){d.forEach(t=>{t.root.classList.toggle("ch-locked",!g()),B(t),z(t)})}const K=n(e?"#chat-window-root":"#chat-panel-root");if(K&&function(t,n){t.classList.add("ch","ch-wide"),t.innerHTML='\n      <div class="ch-locked-note hint">Conectá tu Discord en Social para chatear con tus amigos.</div>\n      <div class="ch-side">\n        <div class="ch-search"><input type="text" placeholder="Buscar amigo..." maxlength="40" autocomplete="off" /><button class="ghost-btn gr-new" type="button" title="Crear grupo">＋ Grupo</button></div>\n        <div class="ch-list"></div>\n      </div>\n      <div class="ch-main">\n        <div class="ch-head"></div>\n        <div class="ch-msgs"></div>\n        <div class="ch-input"><input type="text" maxlength="500" placeholder="Escribí un mensaje..." autocomplete="off" /><button class="primary-btn" type="button">Enviar</button></div>\n      </div>';const a={kind:n,root:t,active:null,renderedFor:null,$:e=>t.querySelector(e)};if(d.push(a),"window"===n){const e=()=>{const e=t.clientWidth<560;t.classList.toggle("ch-compact",e),t.classList.toggle("ch-wide",!e)};try{new ResizeObserver(e).observe(t)}catch(t){window.addEventListener("resize",e)}e()}a.$(".ch-search input").addEventListener("input",()=>B(a)),a.$(".ch-list").addEventListener("click",t=>{const e=t.target.closest(".ch-item");e&&async function(t,e){t.active=e,t.renderedFor=null,t.root.classList.add("ch-open"),B(t),z(t),D(e).loaded||await q(e),t.active===e&&M(e),t.$(".ch-input input")?.focus()}(a,(/^g_/.test(e.dataset.id)?e.dataset.id:Number(e.dataset.id)))}),a.$(".ch-head").addEventListener("click",e=>{const n=e.target.closest("button[data-act]");if(n)if("back"===n.dataset.act)a.active=null,a.renderedFor=null,t.classList.remove("ch-open"),B(a),z(a);else if("gmanage"===n.dataset.act){window.vivetGroups&&window.vivetGroups.manage(a.active)}else if("invite"===n.dataset.act){const t=k();t&&null!=a.active&&j(a.active,t)}}),a.$(".ch-msgs").addEventListener("click",t=>{const n=t.target.closest("button[data-act]");if(n)if("older"===n.dataset.act){const t=D(a.active).list[0];t&&q(a.active,t.id)}else if("join"===n.dataset.act){const t=n.dataset.url;if(!s.test(t||""))return;if(e)return void window.vivetChat.join(t).then(t=>{"playing"===t?showToast("Salí de tu sala actual para unirte a esa sala"):"ok"!==t&&showToast("No se pudo entrar a esa sala")});if(y())return void showToast("Salí de tu sala actual para unirte a esa sala");"function"==typeof joinByUrl&&joinByUrl(t,null)}});const o=a.$(".ch-input input"),i=async()=>{const t=o.value;t.trim()&&null!=a.active&&(o.value="",await j(a.active,t)||(o.value=t),o.focus())};o.addEventListener("keydown",t=>{"Enter"!==t.key||t.isComposing||i()}),a.$(".ch-input button").addEventListener("click",i)}(K,e?"window":"panel"),!e){document.querySelector('.nav-btn[data-panel="panel-chats"]')?.addEventListener("click",()=>{P(),O();const t=d[0];t&&null!=t.active&&M(t.active)}),n("#chat-popout-btn")?.addEventListener("click",()=>_(!1));const t=document.createElement("button");t.id="chat-sat-btn",t.className="overlay-btn",t.type="button",t.title=`Chats (${c})`,t.innerHTML='<span>Chats</span><span class="nav-badge ch-badge" hidden></span>',t.addEventListener("click",()=>_(!0)),appRoot.appendChild(t);try{window.vivet.setConfig("chatHotkey",c),window.vivet.setConfig("chatHotkeyGlobal","undefined"!=typeof CHAT_HOTKEY_GLOBAL&&!!CHAT_HOTKEY_GLOBAL)}catch(t){}window.addEventListener("vivet-chat-window",t=>{f=!!t.detail,!f&&g()&&x().catch(()=>{})}),new MutationObserver(()=>{d.forEach(t=>{null!=t.active&&z(t)}),N()}).observe(appRoot,{attributes:!0,attributeFilter:["class"]})}window.addEventListener("vivet-session-changed",()=>{r.clear(),l.clear(),v=null,d.forEach(t=>{t.active=null,t.renderedFor=null,t.root.classList.remove("ch-open")}),R(),P(),g()&&O()}),window.addEventListener("vivet-friends-updated",()=>{R(),P()}),window.addEventListener("vivet-room-updated",()=>d.forEach(t=>{null!=t.active&&z(t)})),document.addEventListener("visibilitychange",()=>{document.hidden||O()}),P(),N(),g()&&O()})();

/* =======================================================================
   GRUPOS DE CHAT (sin tocar el servidor)
   Cada mensaje de grupo viaja como un mensaje directo normal a cada
   miembro, con una marca ⟦vvg:...⟧ al principio. chat.js (arriba) esconde
   esas marcas de los chats 1 a 1 y se las pasa a este módulo.
   Los grupos y su historial se guardan en localStorage, por cuenta.
   Límites: máx. 8 miembros, y el dueño debe ser amigo de todos los miembros.
   ======================================================================= */
(() => {
  const RX = /^⟦vvg:(g_[a-z0-9]{6,12}):([mlt]):([a-z0-9]{4,12})⟧([\s\S]*)$/;
  const MAX_MEMBERS = 8;
  const MAX_MSGS = 200;
  const api = () => window.vivetApi;
  const br = () => window.__vvBridge;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
  const meId = () => { const m = api() && api().me && api().me(); return m ? m.id : null; };
  const rnd = (n) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
  const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 1000; };
  const tsOf = (m) => Number(m.created_at) || Date.parse(m.created_at) || Date.now();

  // ---------- almacenamiento ----------
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const kG = () => `vivet_groups_${meId()}`;
  const kM = (gid) => `vivet_gm_${meId()}_${gid}`;
  const kL = () => `vivet_gleft_${meId()}`;
  const loadG = () => (meId() == null ? {} : rd(kG(), {}));
  const saveG = (g) => wr(kG(), g);
  const loadM = (gid) => rd(kM(gid), []);
  const saveM = (gid, a) => wr(kM(gid), a.slice(-MAX_MSGS));
  const left = () => rd(kL(), []);
  const markLeft = (gid) => { const l = left(); if (!l.includes(gid)) { l.push(gid); wr(kL(), l.slice(-100)); } };
  function dropGroup(gid) {
    const gs = loadG(); delete gs[gid]; saveG(gs);
    try { localStorage.removeItem(kM(gid)); } catch (_) {}
    markLeft(gid);
  }

  const isMarker = (b) => typeof b === 'string' && b.startsWith('⟦vvg:');
  const mk = (gid, t, nonce, payload) => `⟦vvg:${gid}:${t}:${nonce}⟧${payload}`;

  // ---------- nombres / lista ----------
  const friends = () => { try { return (api().friends() || {}).friends || []; } catch (_) { return []; } };
  const fname = (f) => f.haxball_nick || f.username;
  const myName = () => { const m = api().me(); return ((m && (m.haxball_nick || m.username)) || 'Yo').slice(0, 25); };
  function name(uid) {
    if (uid === meId()) return 'Vos';
    const f = friends().find((x) => x.id === uid);
    if (f) return fname(f);
    for (const g of Object.values(loadG())) {
      const m = g.members.find((x) => x[0] === uid);
      if (m) return m[1];
    }
    return 'Jugador';
  }
  const avatar = (n) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#17e0e8"/><text x="20" y="26" font-size="18" font-family="Arial" font-weight="700" text-anchor="middle" fill="#04181a">${esc((n.trim().charAt(0) || 'G').toUpperCase())}</text></svg>`);

  function items() {
    if (meId() == null) return [];
    return Object.values(loadG()).map((g) => ({
      id: g.id, username: g.name, haxball_nick: null, avatar_url: avatar(g.name),
      online: false, room: null, group: true,
      sub: `Grupo · ${g.members.length} ${g.members.length === 1 ? 'miembro' : 'miembros'}`,
    }));
  }
  const get = (gid) => loadG()[gid] || null;
  const messages = (gid) => loadM(gid).map((m) => ({ id: m.id, from: m.from, to: gid, body: m.body, created_at: m.created_at }));
  function unread(gid) {
    const g = get(gid); const since = g ? g.read || 0 : 0;
    return Math.min(99, loadM(gid).filter((m) => m.from !== meId() && m.created_at > since).length);
  }
  function read(gid) {
    const gs = loadG(); const g = gs[gid]; if (!g) return;
    g.read = Math.max(Date.now(), ...loadM(gid).map((m) => m.created_at)); saveG(gs);
  }

  // ---------- recibir ----------
  const pending = {};
  function addText(gid, from, text, created, nonce, live) {
    const g = get(gid);
    if (!g) return false;
    if (from !== meId() && !g.members.some((m) => m[0] === from)) return true; // no es miembro: se ignora
    const arr = loadM(gid);
    if (arr.some((m) => m.n === nonce)) return true;
    const msg = { id: created * 1000 + hash(nonce), from, body: text, created_at: created, n: nonce };
    arr.push(msg); arr.sort((a, b) => a.id - b.id); saveM(gid, arr);
    if (br()) br().push(gid, { id: msg.id, from, to: gid, body: text, created_at: created }, live);
    return true;
  }

  function applyMeta(gid, from, payload, live) {
    if (left().includes(gid)) return;
    let p; try { p = JSON.parse(payload); } catch (_) { return; }
    if (!p || typeof p.n !== 'string' || typeof p.v !== 'number' || !Array.isArray(p.m) || p.m.length > MAX_MEMBERS) return;
    const members = p.m.filter((x) => Array.isArray(x) && typeof x[0] === 'number' && typeof x[1] === 'string').map((x) => [x[0], x[1].slice(0, 25)]);
    const me = meId(); const gs = loadG(); const g = gs[gid];
    const inIt = members.some((x) => x[0] === me);
    if (g) {
      if (from !== g.owner || p.v <= (g.v || 0)) return;
      if (!inIt) { const n = g.name; dropGroup(gid); toast(`Te sacaron del grupo "${n}"`); if (br()) br().refresh(); return; }
      g.name = p.n.slice(0, 32); g.members = members; g.v = p.v; saveG(gs);
    } else {
      if (!inIt || from !== p.o) return;
      gs[gid] = { id: gid, name: p.n.slice(0, 32), owner: p.o, members, v: p.v, read: 0 };
      saveG(gs);
      if (live) toast(`Te agregaron al grupo "${p.n.slice(0, 32)}"`, 'ok');
    }
    const q = pending[gid];
    if (q) { delete pending[gid]; q.sort((a, b) => a.created - b.created).forEach((x) => addText(gid, x.from, x.payload, x.created, x.nonce, false)); }
    if (br()) br().refresh();
  }

  function applyLeave(gid, from) {
    const gs = loadG(); const g = gs[gid]; if (!g) return;
    if (from === meId()) dropGroup(gid);
    else {
      g.members = g.members.filter((m) => m[0] !== from);
      if (g.owner === from && g.members[0]) g.owner = g.members[0][0];
      saveG(gs);
    }
    if (br()) br().refresh();
  }

  // Devuelve true si el mensaje era de grupo (y ya fue procesado).
  function ingest(msg, live) {
    if (!msg || !isMarker(msg.body)) return false;
    const m = RX.exec(msg.body);
    if (!m) return true;
    const [, gid, t, nonce, payload] = m;
    if (t === 'm') applyMeta(gid, msg.from, payload, live);
    else if (t === 'l') applyLeave(gid, msg.from);
    else if (!left().includes(gid)) {
      const created = tsOf(msg);
      if (!addText(gid, msg.from, payload, created, nonce, live)) (pending[gid] = pending[gid] || []).push({ from: msg.from, payload, created, nonce });
    }
    return true;
  }

  // Al abrir: busca grupos/mensajes que llegaron con la app cerrada.
  let syncing = false;
  async function sync(convs) {
    if (syncing || meId() == null || !api().loggedIn()) return;
    syncing = true;
    try {
      const key = `vivet_gseen_${meId()}`; const seen = rd(key, {});
      for (const c of convs) {
        if (!c.last || !(c.last.id > (seen[c.id] || 0))) continue;
        try {
          const res = await api().request('GET', `/chat/${c.id}/messages`);
          (res.messages || []).slice().sort((a, b) => a.id - b.id).forEach((m) => { if (isMarker(m.body)) ingest(m, false); });
          seen[c.id] = c.last.id; wr(key, seen);
        } catch (_) {}
      }
    } finally { syncing = false; }
  }

  // ---------- enviar ----------
  async function fan(ids, body) {
    const res = await Promise.allSettled(ids.map((id) => api().request('POST', `/chat/${id}`, { body })));
    const failed = []; let first = null; let err = '';
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') first = first || r.value;
      else { failed.push(ids[i]); err = err || (r.reason && r.reason.message) || ''; }
    });
    return { ok: res.length - failed.length, failed, first, err };
  }

  async function send(gid, text) {
    const g = get(gid);
    if (!g) throw new Error('Ese grupo ya no existe');
    const others = g.members.map((m) => m[0]).filter((id) => id !== meId());
    if (!others.length) throw new Error('No quedan miembros en el grupo');
    const nonce = rnd(8);
    const r = await fan(others, mk(gid, 't', nonce, text));
    if (!r.ok) throw new Error(r.err || 'No se pudo enviar');
    if (r.failed.length) toast('No le llegó a: ' + r.failed.map(name).join(', '));
    addText(gid, meId(), text, r.first ? tsOf(r.first) : Date.now(), nonce, false);
  }

  async function pushMeta(g, recipients) {
    const payload = JSON.stringify({ n: g.name, o: g.owner, m: g.members, v: g.v });
    const r = await fan([...new Set(recipients)].filter((id) => id !== meId()), mk(g.id, 'm', rnd(8), payload));
    if (r.failed.length) toast('No se pudo avisar a: ' + r.failed.map(name).join(', '));
  }

  const memberEntry = (id, keep) => {
    const f = friends().find((x) => x.id === id);
    return [id, ((f && fname(f)) || (keep && keep.get(id)) || 'Jugador').slice(0, 25)];
  };

  async function createGroup(title, ids) {
    const me = api().me();
    const g = { id: 'g_' + rnd(8), name: title.slice(0, 32), owner: me.id, members: [[me.id, myName()]].concat(ids.map((id) => memberEntry(id))), v: Date.now(), read: Date.now() };
    const gs = loadG(); gs[g.id] = g; saveG(gs);
    await pushMeta(g, ids);
    if (br()) { br().refresh(); br().open(g.id); }
  }

  async function updateGroup(gid, title, ids) {
    const gs = loadG(); const g = gs[gid];
    if (!g || g.owner !== meId()) return;
    const before = g.members.map((m) => m[0]);
    const keep = new Map(g.members);
    g.members = [[meId(), myName()]].concat(ids.map((id) => memberEntry(id, keep)));
    g.name = title.slice(0, 32); g.v = Date.now(); saveG(gs);
    await pushMeta(g, before.concat(ids));
    if (br()) br().refresh();
  }

  async function leaveGroup(gid) {
    const g = get(gid); if (!g) return;
    const others = g.members.map((m) => m[0]).filter((id) => id !== meId());
    if (others.length) await fan(others, mk(gid, 'l', rnd(8), ''));
    applyLeave(gid, meId());
  }

  // ---------- ventanas ----------
  function modal(title, html) {
    document.querySelectorAll('.gr-modal').forEach((m) => m.remove());
    const el = document.createElement('div');
    el.className = 'map-modal gr-modal';
    el.innerHTML = `<div class="map-modal-box" role="dialog" aria-modal="true"><div class="map-modal-head"><h3>${esc(title)}</h3><button class="ghost-btn secondary-action" data-gr="close" type="button">Cerrar</button></div>${html}</div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-gr="close"]')) el.remove(); });
    return el;
  }
  function picks(extraMembers, selected) {
    const rows = new Map();
    friends().forEach((f) => rows.set(f.id, fname(f)));
    (extraMembers || []).forEach((m) => { if (m[0] !== meId() && !rows.has(m[0])) rows.set(m[0], m[1]); });
    if (!rows.size) return '<p class="hint">No tenés amigos para agregar todavía.</p>';
    return `<div class="gr-picks">${[...rows].map(([id, n]) => `<label class="switch-row gr-pick"><span>${esc(n)}</span><input type="checkbox" value="${id}" ${selected.includes(id) ? 'checked' : ''} /></label>`).join('')}</div>`;
  }
  const checked = (el) => [...el.querySelectorAll('.gr-picks input:checked')].map((i) => Number(i.value));

  function openCreate() {
    if (!api() || !api().loggedIn()) return toast('Conectá tu Discord en Social para crear grupos');
    if (!friends().length) return toast('Primero agregá amigos en Social');
    const el = modal('Nuevo grupo', `<label class="form-field"><span>Nombre del grupo o equipo</span><input type="text" class="gr-name" maxlength="32" placeholder="Mi equipo" autocomplete="off" /></label>
      <div class="hint">Elegí hasta ${MAX_MEMBERS - 1} amigos.</div>${picks([], [])}
      <div class="map-actions"><button class="primary-btn" data-gr="save" type="button">Crear grupo</button></div>`);
    el.querySelector('[data-gr="save"]').addEventListener('click', async (e) => {
      const title = el.querySelector('.gr-name').value.trim(); const ids = checked(el);
      if (!title) return toast('Ponele un nombre al grupo');
      if (!ids.length) return toast('Elegí al menos un amigo');
      if (ids.length > MAX_MEMBERS - 1) return toast(`Máximo ${MAX_MEMBERS} miembros contándote a vos`);
      e.target.disabled = true;
      try { await createGroup(title, ids); el.remove(); } catch (err) { e.target.disabled = false; toast((err && err.message) || 'No se pudo crear el grupo'); }
    });
    el.querySelector('.gr-name').focus();
  }

  function manage(gid) {
    const g = get(gid); if (!g) return;
    const mine = g.owner === meId();
    const ids = g.members.map((m) => m[0]).filter((id) => id !== meId());
    const body = mine
      ? `<label class="form-field"><span>Nombre</span><input type="text" class="gr-name" maxlength="32" value="${esc(g.name)}" autocomplete="off" /></label>
         <div class="hint">Miembros (máx. ${MAX_MEMBERS} contándote a vos)</div>${picks(g.members, ids)}
         <div class="map-actions"><button class="primary-btn" data-gr="save" type="button">Guardar cambios</button><button class="ghost-btn secondary-action" data-gr="leave" type="button">Salir del grupo</button></div>`
      : `<div class="hint">Miembros</div><div class="gr-picks">${g.members.map((m) => `<div class="gr-pick">${esc(name(m[0]))}${m[0] === g.owner ? ' ★' : ''}</div>`).join('')}</div>
         <div class="map-actions"><button class="ghost-btn secondary-action" data-gr="leave" type="button">Salir del grupo</button></div>`;
    const el = modal(g.name, body);
    el.querySelector('[data-gr="save"]')?.addEventListener('click', async (e) => {
      const title = el.querySelector('.gr-name').value.trim(); const sel = checked(el);
      if (!title) return toast('Ponele un nombre al grupo');
      if (!sel.length) return toast('El grupo necesita al menos un miembro más');
      if (sel.length > MAX_MEMBERS - 1) return toast(`Máximo ${MAX_MEMBERS} miembros contándote a vos`);
      e.target.disabled = true;
      try { await updateGroup(gid, title, sel); el.remove(); } catch (err) { e.target.disabled = false; toast((err && err.message) || 'No se pudo guardar'); }
    });
    el.querySelector('[data-gr="leave"]').addEventListener('click', async () => {
      if (!confirm(`¿Salir del grupo "${g.name}"?`)) return;
      try { await leaveGroup(gid); el.remove(); } catch (err) { toast((err && err.message) || 'No se pudo salir'); }
    });
  }

  document.addEventListener('click', (e) => { if (e.target.closest('.gr-new')) openCreate(); });
  // Otra ventana (chat flotante / panel) cambió algo: repintar.
  window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith('vivet_g') && br()) br().rehydrate(); });

  window.vivetGroups = { isMarker, ingest, items, get, name, messages, unread, read, send, sync, manage, openCreate };
})();