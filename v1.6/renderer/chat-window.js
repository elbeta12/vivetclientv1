// Vivet Client - renderer/chat-window.js
// Arranque de la ventana de chats (corre ANTES de chat.js). Arma lo que chat.js espera
// del cliente principal: window.vivetApi (request / me / friends / loggedIn), showToast
// y escapeHtml. El token de sesión lo lee del proceso principal (mismo que usa friends.js).
// Mientras la ventana está oculta no hace ninguna petición: el cliente principal sigue
// avisando de los mensajes nuevos.

(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  let token = '', me = null, friendsData = { friends: [], incoming: [], outgoing: [], blocked: [] }, roomUrl = null;

  window.escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.showToast = (msg, kind) => {
    const box = document.getElementById('cw-toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'cw-toast ' + (kind || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  async function request(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.status === 401) { me = null; }
    if (!res.ok) throw new Error((json && json.error) || `Error ${res.status}`);
    return json;
  }

  window.vivetApi = {
    configured: !!API,
    request,
    loggedIn: () => !!(token && me),
    me: () => me,
    friends: () => friendsData,
    roomUrl: () => roomUrl,
  };

  async function loadFriends() {
    try { friendsData = await request('GET', '/friends'); window.dispatchEvent(new Event('vivet-friends-updated')); } catch (_) {}
  }
  async function loadRoom() {
    let u = null;
    try { u = await window.vivetChat.myRoomUrl(); } catch (_) {}
    if (u !== roomUrl) { roomUrl = u; window.dispatchEvent(new Event('vivet-room-updated')); }
  }

  // Sesión: si cambia el token en el cliente principal (login / logout), se entera acá.
  async function syncSession() {
    if (document.hidden) return;
    let t = '';
    try { t = (await window.vivetChat.getToken()) || ''; } catch (_) {}
    if (t !== token || (t && !me)) {
      token = t; me = null;
      friendsData = { friends: [], incoming: [], outgoing: [], blocked: [] };
      if (t) { try { me = await request('GET', '/me'); } catch (_) {} }
      if (me) await loadFriends();
      window.dispatchEvent(new Event('vivet-session-changed'));
    }
  }

  const tick = async () => { await syncSession(); if (window.vivetApi.loggedIn() && !document.hidden) { loadRoom(); } };
  setInterval(tick, 4000);
  setInterval(() => { if (!document.hidden && window.vivetApi.loggedIn()) loadFriends(); }, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); loadFriends(); } });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); window.vivetChat.hide(); } });
  tick();
})();