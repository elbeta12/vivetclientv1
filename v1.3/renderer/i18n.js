// Vivet Client - renderer/i18n.js
// Idioma (Español / English). El código y el HTML siguen escritos en español;
// acá vive el diccionario ES -> EN. Traduce los nodos de texto y los atributos
// placeholder/title, y con un MutationObserver también todo lo que app.js,
// friends.js y replays.js dibujan después. Se carga ANTES de appearance.js/app.js
// (ver index.html). Expone t(texto) para strings que no pasan por el DOM
// (Discord Rich Presence, confirm()).

(() => {
  const EXACT = {
    // --- shell / sidebar
    '← Salir del replay': '← Exit replay',
    '← Volver a Vivet': '← Back to Vivet',
    'Completá los datos de la sala y confirmá': 'Fill in the room details and confirm',
    'Cancelar y volver a Vivet': 'Cancel and go back to Vivet',
    'Copiar link de la sala': 'Copy room link',
    'Entrando a la sala…': 'Joining the room…',
    'Explorar salas': 'Browse rooms',
    'Crear sala': 'Create room',
    'Rendimiento': 'Performance',
    'Apariencia': 'Appearance',
    'Actualización disponible': 'Update available',
    'Descargar actualización': 'Download update',
    'Esto solo abre la página de descarga en tu navegador - no se instala solo. Descargá el instalador y corré Setup como siempre.':
      'This only opens the download page in your browser - it does not install by itself. Download the installer and run Setup as usual.',
    'Oscuro': 'Dark',
    'Claro': 'Light',
    // --- explorar
    'Directorio de partidas': 'Match directory',
    'Encontrá tu próxima': 'Find your next',
    'cancha': 'pitch',
    'Buscá una sala pública por nombre, o pegá una URL / código para entrar directo.':
      'Search a public room by name, or paste a URL / code to join directly.',
    'Más cerca': 'Closest',
    'Más jugadores': 'Most players',
    'Nombre (A-Z)': 'Name (A-Z)',
    'Actualizar': 'Refresh',
    'jugadores en salas públicas ahora mismo': 'players in public rooms right now',
    'Fijar sala': 'Pin room',
    'Nombre de sala, URL o código...': 'Room name, URL or code...',
    'Ordenar por': 'Sort by',
    'Nombre a mostrar (ej: Vivet — Sala oficial)': 'Display name (e.g. Vivet — Official room)',
    'Pedazo del nombre real, o pegá el link/código directo': 'Part of the real name, or paste the direct link/code',
    // --- crear sala
    'Esto te lleva directo a la pantalla de "Create room" propia de Haxball - Vivet no arma un servidor de salas paralelo, usa el mismo host nativo de haxball.com/play. Completá los datos (nombre, máx. jugadores, etc.) ahí mismo.':
      'This takes you straight to Haxball\'s own "Create room" screen - Vivet does not build a parallel room server, it uses the same native host as haxball.com/play. Fill in the details (name, max players, etc.) right there.',
    'Crear sala en Haxball': 'Create a room on Haxball',
    // --- social
    'Vinculá tu Discord para tener perfil, agregar amigos con un código, ver en qué sala están y unirte con un click. Solo tus amigos ven dónde jugás, y podés ponerte invisible o bloquear a cualquiera.':
      'Link your Discord to get a profile, add friends with a code, see which room they are in and join with one click. Only your friends see where you play, and you can go invisible or block anyone.',
    'Tu nickname': 'Your nickname',
    'Es tu nombre en Haxball: se completa solo en la pantalla "Choose nickname" al entrar a una sala y también es el que ven tus amigos. Se aplica en la próxima sala que entres.':
      'This is your name on Haxball: it is filled in automatically on the "Choose nickname" screen when you join a room, and it is also what your friends see. It applies to the next room you join.',
    'Guardar': 'Save',
    'Vincular con Discord': 'Link with Discord',
    'Se abre Discord en tu navegador para confirmar quién sos. Vivet solo lee tu nombre y avatar.':
      'Discord opens in your browser to confirm who you are. Vivet only reads your name and avatar.',
    'Conectar con Discord': 'Connect with Discord',
    'Tu código:': 'Your code:',
    'Copiar': 'Copy',
    'Cerrar sesión': 'Log out',
    'Privacidad': 'Privacy',
    'Modo invisible (tus amigos te ven desconectado)': 'Invisible mode (your friends see you as offline)',
    'Agregar amigo': 'Add friend',
    'Código de amigo o usuario de Discord': 'Friend code or Discord username',
    'Enviar solicitud': 'Send request',
    // --- replays
    'Reproduce archivos': 'Plays',
    'con el reproductor oficial de Haxball, dentro de Vivet. Elegí un archivo o tocá uno de la lista (recientes + los que estén en tu carpeta de Descargas). Si el archivo no se carga solo, usá el botón "Replays" de la lista de salas de Haxball, que queda a la vista.':
      'files with the official Haxball player, inside Vivet. Pick a file or tap one from the list (recent ones + those in your Downloads folder). If the file does not load by itself, use the "Replays" button in Haxball\'s room list, which stays visible.',
    'Abrir replay…': 'Open replay…',
    'Actualizar lista': 'Refresh list',
    'Todavía no hay replays. Tocá "Abrir replay…" para elegir un archivo .hbr2.': 'No replays yet. Tap "Open replay…" to choose an .hbr2 file.',
    'Cerrar el replay y volver a Vivet': 'Close the replay and go back to Vivet',
    'No se pudo leer el replay': 'Could not read the replay',
    'No se pudo cargar solo: usá el botón Replays de Haxball': 'Could not load it automatically: use Haxball\'s Replays button',
    'No se encontró el botón "Replays" de Haxball; usalo a mano desde la lista de salas.':
      'Haxball\'s "Replays" button was not found; use it manually from the room list.',
    'No se pudo abrir el replay': 'Could not open the replay',
    // --- rendimiento
    'FPS y latencia': 'FPS and latency',
    'Optimizado dependiendo de tu pc.': 'Optimized depending on your PC.',
    'Mostrar contador de FPS mientras jugás': 'Show FPS counter while playing',
    'Límite de FPS': 'FPS limit',
    'Depende de tus Hz del monitor.': 'Depends on your monitor\'s Hz.',
    'Calidad de render': 'Render quality',
    'Resolución interna a la que se dibuja el juego. Menos calidad = menos píxeles que dibujar, lo que ayuda a sostener los FPS en PCs modestas. No cambia el tamaño de la ventana.':
      'Internal resolution the game is drawn at. Lower quality = fewer pixels to draw, which helps keep FPS up on modest PCs. It does not change the window size.',
    '100% (nativa)': '100% (native)',
    '35% (mínima)': '35% (minimum)',
    'Destrabar límite de FPS': 'Unlock FPS limit',
    'Por defecto el juego no puede pasar de los Hz de tu monitor. Esto quita ese tope para que el "Límite de FPS" de arriba mande de verdad (hasta 600).':
      'By default the game cannot go above your monitor\'s Hz. This removes that cap so the "FPS limit" above actually takes effect (up to 600).',
    'Ojo:': 'Note:',
    'tu pantalla igual solo muestra sus Hz; lo que ganás es menos latencia de input, a cambio de más uso de GPU/CPU y posible tearing. Necesita reiniciar Vivet para aplicarse.':
      'your screen still only shows its own Hz; what you gain is lower input latency, at the cost of more GPU/CPU use and possible tearing. Requires restarting Vivet to apply.',
    'Activar (más uso de GPU)': 'Enable (more GPU usage)',
    'Destrabar el límite de FPS necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?': 'Unlocking the FPS limit needs Vivet to restart to apply. Restart now?',
    'Modo GPU agresivo': 'Aggressive GPU mode',
    'Fuerza a Chromium a acelerar por GPU aunque tu placa/driver esté en su lista de bloqueo - en placas viejas o con drivers raros esto puede ser justo lo que hace falta para que el rendimiento no vaya lento.':
      'Forces Chromium to use GPU acceleration even if your card/driver is on its blocklist - on old cards or odd drivers this may be exactly what is needed so performance is not slow.',
    'El costado malo:': 'The downside:',
    'es la causa conocida de que el widget de un captcha (esa parte que a veces se pone en gris y no deja tocarla) deje de renderizar bien - por eso viene apagado. Necesita reiniciar Vivet para aplicarse.':
      'it is the known cause of a captcha widget (the part that sometimes turns grey and cannot be clicked) failing to render properly - that is why it is off by default. Requires restarting Vivet to apply.',
    'Activar (puede romper captchas)': 'Enable (may break captchas)',
    'Sobre Vivet Client': 'About Vivet Client',
    'Cliente de escritorio no oficial para Haxball. No está afiliado a Haxball ni a sus desarrolladores; empaqueta el juego oficial con una interfaz propia.':
      'Unofficial desktop client for Haxball. It is not affiliated with Haxball or its developers; it wraps the official game in its own interface.',
    'El Modo GPU agresivo necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?': 'Aggressive GPU mode needs Vivet to restart to apply. Restart now?',
    'Se aplicará la próxima vez que abras Vivet': 'It will apply the next time you open Vivet',
    // --- apariencia
    'Personalizá el fondo de Vivet con los colores de tu club y una textura de estadio. Es solo decorativo y se mantiene sutil; no afecta el juego ni el rendimiento.':
      'Customize Vivet\'s background with your club colors and a stadium texture. It is purely decorative and stays subtle; it does not affect the game or performance.',
    'Colores del club': 'Club colors',
    'Principal': 'Primary',
    'Secundario': 'Secondary',
    'Estadio': 'Stadium',
    'Una textura muy suave sobre el fondo.': 'A very soft texture over the background.',
    'Ninguno': 'None',
    'Césped': 'Grass',
    'Cancha': 'Pitch',
    'Reflectores': 'Floodlights',
    'Gradas': 'Stands',
    'Intensidad': 'Intensity',
    'Qué tanto se nota el color del club en el fondo.': 'How visible the club color is in the background.',
    'Restablecer': 'Reset',
    'Personalizado': 'Custom',
    // --- auth
    'Tu Auth es el ID público que Haxball te asigna y que los hosts ven para reconocerte entre partidas. Se guarda local en esta PC. Si venís del navegador, podés traer tu mismo ID importando tu clave privada (abajo). Usá el botón para mostrar u ocultar el ID.':
      'Your Auth is the public ID Haxball gives you and that hosts see to recognize you between matches. It is stored locally on this PC. If you are coming from the browser, you can bring your same ID by importing your private key (below). Use the button to show or hide the ID.',
    'Mi país': 'My country',
    'Cambia la bandera/ubicación que Haxball muestra de vos en las salas. Es solo cosmético: no cambia tu conexión ni tu ping real. "Automático" vuelve a usar la detección normal de Haxball.':
      'Changes the flag/location Haxball shows for you in rooms. It is cosmetic only: it does not change your connection or real ping. "Automatic" goes back to Haxball\'s normal detection.',
    'País': 'Country',
    'Aplicar': 'Apply',
    'Automático (por IP)': 'Automatic (by IP)',
    'Traer mi Auth del navegador': 'Bring my Auth from the browser',
    'En el navegador donde ya jugabas, entrá a': 'In the browser where you already played, go to',
    ', copiá tu': ', copy your',
    'clave privada': 'private key',
    '(empieza con': '(starts with',
    ') y pegala acá. Tu ID público sale de esa clave, así que en la app vas a tener el mismo. Usá solo tu propia clave y no se la des a nadie: quien la tenga puede hacerse pasar por vos. Se guarda un respaldo de la clave actual antes de reemplazarla.':
      ') and paste it here. Your public ID comes from that key, so you will have the same one in the app. Only use your own key and do not give it to anyone: whoever has it can impersonate you. A backup of the current key is saved before replacing it.',
    'Clave privada': 'Private key',
    'Importar': 'Import',
    'Restaurar anterior': 'Restore previous',
    'Volver a la clave que tenías antes del último cambio': 'Go back to the key you had before the last change',
    'Ver mi Auth': 'Show my Auth',
    'Ocultar Auth': 'Hide Auth',
    'ID público': 'Public ID',
    'Tu Auth': 'Your Auth',
    'Copiar Auth': 'Copy Auth',
    'Auth copiado': 'Auth copied',
    'Importando...': 'Importing...',
    'Restaurando...': 'Restoring...',
    'Leyendo...': 'Reading...',
    'Auth importado': 'Auth imported',
    'Auth anterior restaurado': 'Previous Auth restored',
    'Error desconocido': 'Unknown error',
    'Pegá primero tu clave privada (empieza con "idkey.")': 'Paste your private key first (starts with "idkey.")',
    'País aplicado, recargando el juego…': 'Country applied, reloading the game…',
    'País automático, recargando el juego…': 'Automatic country, reloading the game…',
    // --- misc titles
    'Unirse al Discord': 'Join the Discord',
    'Cambiar tema': 'Toggle theme',
    'Copiar link de esta sala': 'Copy this room\'s link',
    // --- toasts / rooms
    'No hay nada para copiar todavía': 'Nothing to copy yet',
    'Copiado al portapapeles': 'Copied to clipboard',
    'No se pudo copiar': 'Could not copy',
    'Link de la sala copiado': 'Room link copied',
    'Link copiado': 'Link copied',
    'Nombre de la sala copiado': 'Room name copied',
    'No se encontró el link. Intentá cuando ya estés en la cancha.': 'Link not found. Try again once you are on the pitch.',
    'Copiar link': 'Copy link',
    'Con clave': 'Password',
    'Fijada': 'Pinned',
    'Acceso directo por link': 'Direct link access',
    'DIRECTO': 'DIRECT',
    'Quitar': 'Remove',
    'Desanclar': 'Unpin',
    'Sin host': 'No host',
    'Jugar': 'Play',
    'Entrar directo': 'Join directly',
    'Entrar': 'Join',
    'Sin resultados para esa búsqueda.': 'No results for that search.',
    'Cargando salas en vivo…': 'Loading live rooms…',
    'No se pudo entrar a esa sala automáticamente. Probá de nuevo.': 'Could not join that room automatically. Try again.',
    'Abriendo Haxball...': 'Opening Haxball...',
    'Completá el formulario de Haxball ahí adentro.': 'Fill in Haxball\'s form in there.',
    'Sala creada.': 'Room created.',
    'Sala creada': 'Room created',
    'No detectamos que se haya creado la sala. Si la cancelaste no pasa nada, probá de nuevo.': 'We did not detect that the room was created. If you cancelled, no worries, try again.',
    'Nickname guardado. Se aplica al entrar a la próxima sala': 'Nickname saved. It applies when you join the next room',
    'Escribí un nickname primero': 'Type a nickname first',
    // --- social dinámico
    'Esperando confirmación en el navegador…': 'Waiting for confirmation in the browser…',
    'Se agotó el tiempo. Probá de nuevo.': 'Timed out. Try again.',
    'Discord vinculado': 'Discord linked',
    'En línea': 'Online',
    'Desconectado': 'Offline',
    'Unirme': 'Join',
    'Buscar sala': 'Find room',
    'Bloquear': 'Block',
    'Todavía no tenés amigos agregados. Compartí tu código.': 'You have no friends added yet. Share your code.',
    'Solicitudes recibidas': 'Received requests',
    'Solicitudes enviadas': 'Sent requests',
    'Aceptar': 'Accept',
    'Rechazar': 'Decline',
    'Cancelar': 'Cancel',
    'Bloqueados': 'Blocked',
    'Desbloquear': 'Unblock',
    'La sección Amigos todavía no está configurada: falta FRIENDS_API_URL en config.js (ver server/README.md).': 'The Friends section is not configured yet: FRIENDS_API_URL is missing in config.js (see server/README.md).',
    'Código copiado': 'Code copied',
    'Ahora son amigos': 'You are now friends',
    'Solicitud enviada': 'Request sent',
    'Solicitud aceptada': 'Request accepted',
    'Salí de tu sala actual para unirte a la de tu amigo': 'Leave your current room to join your friend\'s',
    'Buscando la sala de tu amigo…': 'Looking for your friend\'s room…',
    '¿Bloquear a este usuario? Se elimina la amistad y no podrá volver a enviarte solicitudes ni ver dónde jugás.': 'Block this user? The friendship is removed and they will not be able to send you requests or see where you play.',
    'Usuario bloqueado': 'User blocked',
    'Usuario desbloqueado': 'User unblocked',
    'No se pudo completar la acción': 'Could not complete the action',
    'una sala': 'a room',
    // --- Discord Rich Presence (vía t())
    'Jugando': 'Playing',
    'En el menú principal': 'In the main menu',
    'Buscando sala': 'Looking for a room',
    'Viendo un replay': 'Watching a replay',
    'Reproductor de replays': 'Replay player',
    'Conectando…': 'Connecting…',
    // --- mapas
    'Mapas': 'Maps',
    'Comunidad': 'Community',
    'Guardados': 'Saved',
    'Mis mapas': 'My maps',
    'Subir mapa': 'Upload map',
    'Buscar mapa...': 'Search map...',
    'Más nuevos': 'Newest',
    'Más usados': 'Most used',
    'Mapas de Haxball (.hbs) subidos por la comunidad. Mirá cómo se ven en la cancha antes de usarlos, guardalos en tu PC o subí los tuyos.':
      'Haxball maps (.hbs) uploaded by the community. See how they look on the pitch before using them, save them to your PC or upload your own.',
    'Mostrar paredes invisibles': 'Show invisible walls',
    'Quitar de guardados': 'Remove from saved',
    'Descargar .hbs': 'Download .hbs',
    'Reportar': 'Report',
    'Eliminar': 'Delete',
    'Cerrar': 'Close',
    'Arrastrá tu archivo .hbs acá o tocá para elegirlo': 'Drag your .hbs file here or click to choose it',
    'Nombre': 'Name',
    'Descripción (opcional)': 'Description (optional)',
    'Para qué modo sirve, cuántos jugadores, etc.': 'What mode it is for, how many players, etc.',
    'Publicar en la comunidad': 'Publish to the community',
    'Guardar solo en mi PC': 'Save on my PC only',
    // --- botones, favoritos, mapas
    'Botones': 'Buttons',
    'Elegí el color de los botones y los acentos del cliente.': 'Choose the color of the client\'s buttons and accents.',
    'Color original': 'Original color',
    'Agregar a favoritos': 'Add to favorites',
    'Quitar de favoritos': 'Remove from favorites',
    'Agregada a favoritos': 'Added to favorites',
    'Quitada de favoritos': 'Removed from favorites',
    'No parece un mapa de Haxball (no tiene vertexes, segments, discs ni goals).': 'This does not look like a Haxball map (it has no vertexes, segments, discs or goals).',
    'El archivo está vacío.': 'The file is empty.',
    'El mapa pesa más de 512 KB.': 'The map is larger than 512 KB.',
    'No es un JSON válido. ¿Es un archivo .hbs de Haxball?': 'Not valid JSON. Is it a Haxball .hbs file?',
    'El archivo no tiene forma de mapa de Haxball.': 'The file does not look like a Haxball map.',
    'Global': 'Global',
  };

  // Strings con partes variables: [regex, reemplazo]
  const PATTERNS = [
    [/^(\d+) partidos rechazados por el servidor \(se quedan solo en este equipo\)$/, '$1 matches rejected by the server (kept on this computer only)'],
    [/^Vivet (.+) disponible$/, 'Vivet $1 available'],
    [/^Sala: (.+)$/, 'Room: $1'],
    [/^Código: (.+)$/, 'Code: $1'],
    [/^(\d+)\/(\d+) jugadores$/, '$1/$2 players'],
    [/^Jugando en (.+)$/, 'Playing in $1'],
    [/^Amigos \((\d+)\)$/, 'Friends ($1)'],
    [/^actualizado (.+)$/, 'updated $1'],
    [/^"(.+)" fijada$/, '"$1" pinned'],
    [/^"(.+)" desanclada$/, '"$1" unpinned'],
    [/^Cargando (.+)…$/, 'Loading $1…'],
    [/^Error inesperado: (.+)$/, 'Unexpected error: $1'],
    [/^El nick se guardó local, pero no se pudo subir: (.+)$/, 'The nickname was saved locally, but could not be uploaded: $1'],
  ];

  let lang = 'es';
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  function translate(text) {
    const key = norm(text);
    if (!key) return text;
    let out = EXACT[key];
    if (out === undefined) {
      for (const [re, rep] of PATTERNS) {
        if (re.test(key)) { out = key.replace(re, rep); break; }
      }
    }
    if (out === undefined) return text;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return lead + out + trail;
  }

  // t(): para strings que no pasan por el DOM.
  function t(text) { return lang === 'en' ? translate(String(text)) : String(text); }
  window.t = t;
  window.vivetLang = () => lang;

  const skip = (el) => el && el.closest && el.closest('[data-i18n-skip]');
  const ATTRS = ['placeholder', 'title'];

  function doText(node) {
    if (skip(node.parentElement)) return;
    const p = node.parentElement;
    if (p && /^(SCRIPT|STYLE)$/.test(p.tagName)) return;
    if (node.__vvOut !== undefined && node.nodeValue === node.__vvOut) {
      // ya traducido por nosotros: solo reaplicar según idioma
    } else {
      node.__vvOrig = node.nodeValue; // texto nuevo (en español)
    }
    const out = lang === 'en' ? translate(node.__vvOrig) : node.__vvOrig;
    node.__vvOut = out;
    if (node.nodeValue !== out) node.nodeValue = out;
  }

  function doAttrs(el) {
    if (skip(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      const store = el.__vvAttr || (el.__vvAttr = {});
      const rec = store[a];
      if (!rec || rec.out !== cur) store[a] = { orig: cur, out: cur };
      const out = lang === 'en' ? translate(store[a].orig) : store[a].orig;
      store[a].out = out;
      if (cur !== out) el.setAttribute(a, out);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n); else doAttrs(n);
    }
  }

  let scheduled = false;
  const pending = new Set();
  function flush() {
    scheduled = false;
    obs.disconnect();
    pending.forEach((n) => { if (n.isConnected !== false) walk(n); });
    pending.clear();
    observe();
  }
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => pending.add(n));
      else if (m.type === 'characterData') pending.add(m.target);
      else if (m.type === 'attributes') pending.add(m.target);
    }
    if (!scheduled) { scheduled = true; queueMicrotask(flush); }
  });
  function observe() {
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  // confirm() también pasa por el diccionario.
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (msg) => nativeConfirm(t(msg));

  function updateToggle() {
    const b = document.getElementById('lang-toggle-label');
    if (b) b.textContent = lang === 'en' ? 'English' : 'Español';
  }

  async function setLang(next, persist) {
    lang = next === 'en' ? 'en' : 'es';
    document.documentElement.setAttribute('lang', lang);
    obs.disconnect();
    walk(document.body);
    observe();
    updateToggle();
    if (persist) { try { await window.vivet.setConfig('lang', lang); } catch (_) {} }
    window.dispatchEvent(new CustomEvent('vivet-lang-changed', { detail: lang }));
  }

  function init() {
    observe();
    document.getElementById('lang-toggle')?.addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en', true));
    updateToggle();
    (async () => {
      let saved = 'es';
      try { saved = await window.vivet.getConfig('lang', 'es'); } catch (_) {}
      if (saved === 'en') setLang('en', false);
    })();
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();