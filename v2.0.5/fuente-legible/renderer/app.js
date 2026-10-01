// Vivet Client - renderer/app.js
// Bundle único del renderer. Contiene, en este orden (el orden importa: comparten globales):
//   1 i18n · 2 rendimiento · 3 apariencia · 4 núcleo · 5 menús · 6 replays · 7 amigos
//   8 competitivo · 9 foto de perfil · 10 fotos de otros · 11 resolución · 12 streamer
//   13 mapas · 14 animaciones
// config.js se carga antes (constantes editables a mano) y chat.js después.

// =============================================================================
// 1. IDIOMA (i18n)  (antes: i18n.js)
// =============================================================================
// Vivet Client - renderer/i18n.js
// Idioma (Español / English). El código y el HTML siguen escritos en español;
// acá vive el diccionario ES -> EN. Traduce los nodos de texto y los atributos
// placeholder/title, y con un MutationObserver también todo lo que app.js,
// friends.js y replays.js dibujan después. Se carga ANTES de appearance.js/app.js
// (ver index.html). Expone t(texto) para strings que no pasan por el DOM
// (Discord Rich Presence, confirm()).

(() => {
  const EXACT = {
    // --- textos simplificados (index.html)
    'Se abre la página de descarga en tu navegador. Bajá el instalador y ejecutalo como siempre: no se instala solo.':
      'The download page opens in your browser. Download the installer and run it as usual: it does not install by itself.',
    'Buscá una sala por su nombre, o pegá el link de una sala para entrar directo.':
      'Search for a room by name, or paste a room link to join directly.',
    'Nombre de la sala o link...':
      'Room name or link...',
    'Cómo querés llamarla (ej: Sala de mis amigos)':
      'What to call it (e.g. My friends\' room)',
    'Parte del nombre de la sala, o pegá su link':
      'Part of the room name, or paste its link',
    'Tocá el botón y se abre la pantalla de Haxball para crear tu sala. Ahí ponés el nombre, la cantidad de jugadores y confirmás.':
      'Tap the button and Haxball\'s screen for creating your room opens. There you set the name and number of players, then confirm.',
    'Conectá tu Discord para tener perfil, sumar amigos con un código, ver en qué sala están y entrar con un click. Solo tus amigos ven dónde jugás, y podés ponerte invisible o bloquear a quien quieras.':
      'Connect your Discord to get a profile, add friends with a code, see which room they are in and join with one click. Only your friends see where you play, and you can go invisible or block anyone you want.',
    'Es tu nombre en Haxball. Se pone solo al entrar a una sala y es el que ven tus amigos. Se usa desde la próxima sala que entres.':
      'This is your name in Haxball. It is filled in automatically when you join a room and it is what your friends see. It applies from the next room you join.',
    'Conectar con Discord':
      'Connect with Discord',
    'Se abre tu navegador para confirmar que sos vos. Vivet solo ve tu nombre y tu foto de Discord.':
      'Your browser opens so you can confirm it is you. Vivet only sees your Discord name and picture.',
    'Modo invisible: tus amigos te ven como desconectado':
      'Invisible mode: your friends see you as offline',
    'Mirá tus partidas grabadas (archivos .hbr2) dentro de Vivet. Elegí un archivo o tocá uno de la lista: aparecen los recientes y los de tu carpeta de Descargas. Si no se abre solo, usá el botón "Replays" que Haxball muestra en su lista de salas.':
      'Watch your recorded matches (.hbr2 files) inside Vivet. Pick a file or tap one from the list: recent ones and those in your Downloads folder appear there. If it does not open by itself, use the "Replays" button Haxball shows in its room list.',
    'Mapas hechos por la comunidad. Mirá cómo se ven antes de usarlos, guardalos en tu PC o subí los tuyos.':
      'Maps made by the community. See how they look before using them, save them to your PC or upload your own.',
    'Ajustes para que el juego vaya más fluido. Si todo anda bien, no hace falta tocar nada.':
      'Settings to make the game run smoother. If everything works fine, you do not need to change anything.',
    'Mientras jugás':
      'While you play',
    'Contador de FPS':
      'FPS counter',
    'Muestra en pantalla cuántos cuadros por segundo da el juego. Más FPS = imagen más fluida.':
      'Shows on screen how many frames per second the game runs at. More FPS = smoother picture.',
    'Es el tope de fluidez del juego. Un buen valor es el doble de los Hz de tu monitor (por ejemplo, 120 si tu monitor es de 60 Hz). Si la PC se pone pesada, bajalo.':
      'This is the game\'s smoothness cap. A good value is double your monitor\'s Hz (for example, 120 if your monitor is 60 Hz). If your PC gets heavy, lower it.',
    'Qué tan nítida se dibuja la imagen del juego. Bajarla ayuda a que vaya más fluido en PCs modestas. No cambia el tamaño de la ventana.':
      'How sharp the game image is drawn. Lowering it helps the game run smoother on modest PCs. It does not change the window size.',
    'Avanzado (piden reiniciar Vivet)':
      'Advanced (need a Vivet restart)',
    'Elige cómo usa Vivet la placa de video de tu PC. Si el juego va con retraso o se siente pesado, probá otra opción.':
      'Chooses how Vivet uses your PC\'s graphics card. If the game lags or feels heavy, try another option.',
    'Automático es lo más estable. Alto rendimiento usa la placa de video más potente, pero en notebooks puede causar retraso. Agresivo puede fallar con los captchas. Desactivada usa solo el procesador.':
      'Automatic is the most stable. High performance uses the most powerful graphics card, but on laptops it can cause lag. Aggressive may fail with captchas. Disabled uses only the processor.',
    'Normalmente el juego no puede pasar de los Hz de tu monitor. Activar esto quita ese tope para que el límite de arriba mande de verdad. Tu pantalla igual solo muestra sus Hz, pero puede bajar un poco el retraso de las teclas a cambio de usar más la PC.':
      'Normally the game cannot go above your monitor\'s Hz. Turning this on removes that cap so the limit above really applies. Your screen still only shows its Hz, but it can slightly reduce key delay in exchange for using the PC more.',
    'Activar (usa más la PC)':
      'Turn on (uses the PC more)',
    'Interfaz de Vivet':
      'Vivet interface',
    'Deja la interfaz de Vivet más simple (sin animaciones, sombras ni fondo de club) para que gaste menos. No afecta al juego y no hace falta reiniciar.':
      'Makes the Vivet interface simpler (no animations, shadows or club background) so it uses less. It does not affect the game and no restart is needed.',
    'Ayuda':
      'Help',
    'Si el teclado va con retraso o algo se siente raro, esto vuelve todas las opciones de rendimiento a como vienen de fábrica y reinicia Vivet. Después probalas de a una para descubrir cuál te causa el problema.':
      'If the keyboard lags or something feels off, this puts every performance option back to its default and restarts Vivet. Then try them one at a time to find which one causes the problem.',
    'Cliente no oficial para Haxball. No tiene relación con Haxball ni con sus creadores: usa el juego oficial con una interfaz propia.':
      'Unofficial client for Haxball. It has no relation to Haxball or its creators: it uses the official game with its own interface.',
    'Poné el fondo de Vivet con los colores de tu club y una textura de estadio. Es solo decoración: no afecta al juego.':
      'Set the Vivet background with your club colors and a stadium texture. It is decoration only: it does not affect the game.',
    'Elegí el color de los botones y los detalles de Vivet.':
      'Pick the color of the buttons and details in Vivet.',
    'Tu Auth es un código que Haxball te da y que los admins usan para reconocerte en cada partida. Se guarda solo en esta PC. Si ya jugabas en el navegador, podés traer tu mismo Auth con tu clave (más abajo).':
      'Your Auth is a code Haxball gives you and that admins use to recognize you in every match. It is stored only on this PC. If you already played in the browser, you can bring your same Auth with your key (below).',
    'Cambia la bandera que Haxball muestra de vos en las salas. Es solo estético: no cambia tu conexión ni tu ping real. "Automático" vuelve a la detección normal.':
      'Changes the flag Haxball shows for you in rooms. It is cosmetic only: it does not change your connection or real ping. "Automatic" goes back to the normal detection.',
    'Entrá a haxball.com/playerauth en el navegador donde ya jugabas, copiá tu clave privada (empieza con idkey.) y pegala acá. Así vas a tener el mismo Auth en Vivet. Usá solo tu propia clave y no se la des a nadie: con ella pueden hacerse pasar por vos. Antes de reemplazarla, Vivet guarda un respaldo de la clave actual.':
      'Go to haxball.com/playerauth in the browser where you already played, copy your private key (it starts with idkey.) and paste it here. That way you will have the same Auth in Vivet. Use only your own key and never share it: with it, someone can impersonate you. Before replacing it, Vivet saves a backup of the current key.',
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
    'Impulso de FPS': 'FPS boost',
    'Foto en el juego': 'In-game photo',
    'Elegí una foto y se ve dentro de tu círculo mientras jugás, como el color de la pelota. Solo la ves vos: los demás jugadores ven tu círculo normal. Se aplica al jugador con tu nickname y se ve desde la próxima sala que entres.': 'Pick a photo and it shows inside your circle while you play, like the ball color. Only you see it: other players see your normal circle. It applies to the player with your nickname and shows from the next room you join.',
    'Elegir foto': 'Choose photo',
    'Elegí un archivo de imagen': 'Choose an image file',
    'La imagen pesa demasiado (máx. 8 MB)': 'The image is too large (max 8 MB)',
    'No se pudo leer esa imagen': 'Could not read that image',
    'Foto quitada': 'Photo removed',
    'Foto guardada. Se ve al entrar a una sala': 'Photo saved. It shows when you join a room',
    'Competitivo': 'Competitive',
    'Ganás XP por el tiempo que jugás en Vivet y subís de rango. Los mejores del top ganan recompensas exclusivas.': 'You earn XP for the time you play in Vivet and climb ranks. The best players in the top win exclusive rewards.',
    'Conectá tu Discord en Social para entrar al top y guardar tu progreso en tu cuenta.': 'Connect your Discord in Social to join the leaderboard and save your progress to your account.',
    'Rangos': 'Ranks',
    'Top de jugadores': 'Top players',
    'Rango máximo alcanzado': 'Max rank reached',
    'Todavía no hay jugadores en el top.': 'There are no players in the top yet.',
    'Bronce': 'Bronze', 'Plata': 'Silver', 'Oro': 'Gold', 'Platino': 'Platinum', 'Diamante': 'Diamond', 'Maestro': 'Master', 'Leyenda': 'Legend',
    'jugados': 'played',
    'Normalmente el juego no puede pasar de los Hz de tu monitor. Esto sube ese techo unos 200 FPS por encima de tus Hz (por ejemplo, 60 Hz → hasta 260), sin quitar el tope del todo. Tu pantalla igual solo muestra sus Hz, pero puede bajar un poco el retraso de las teclas a cambio de usar más la PC.':
      'Normally the game cannot go above your monitor\'s Hz. This raises that ceiling to about 200 FPS above your Hz (e.g. 60 Hz → up to 260) without removing the cap entirely. Your screen still only shows its own Hz, but it can lower key delay a bit at the cost of more PC usage.',
    'Ojo:': 'Note:',
    'tu pantalla igual solo muestra sus Hz; lo que ganás es menos latencia de input, a cambio de más uso de GPU/CPU y posible tearing. Necesita reiniciar Vivet para aplicarse.':
      'your screen still only shows its own Hz; what you gain is lower input latency, at the cost of more GPU/CPU use and possible tearing. Requires restarting Vivet to apply.',
    'Activar (más uso de GPU)': 'Enable (more GPU usage)',
    'El Impulso de FPS necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?': 'FPS boost needs Vivet to restart to apply. Restart now?',
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
    'Mapas guardados': 'Saved maps',
    'Aceleración por GPU': 'GPU acceleration',
    'Restablecer rendimiento': 'Reset performance',
    'Juego sin elementos encima': 'Game without overlays',
    'Oculta el contador de FPS, el nombre de la sala y los botones que flotan sobre el juego mientras jugás. Cada uno es una capa extra que Chromium tiene que componer encima del juego; si notás delay en el teclado, probá con esto activado. Se aplica al instante. (Para copiar el link o cargar un mapa, desactivalo un momento.)': 'Hides the FPS counter, room name and buttons floating over the game while you play. Each one is an extra layer Chromium must composite on top of the game; if you notice keyboard delay, try this. Applies instantly. (To copy the link or load a map, turn it off for a moment.)',
    'Ocultar elementos sobre el juego': 'Hide elements over the game',
    'Si el teclado va con delay o algo se siente raro, esto deja todas las opciones de rendimiento en sus valores seguros (GPU automática, Impulso de FPS desactivado, calidad 100%) y reinicia Vivet. Después activá las opciones de a una para ver cuál te trae problemas.': 'If the keyboard feels delayed or something feels off, this resets every performance option to safe values (automatic GPU, FPS boost off, 100% quality) and restarts Vivet. Then enable options one at a time to find the one causing trouble.',
    'Restablecer y reiniciar': 'Reset and restart',
    'Se van a restablecer todas las opciones de rendimiento y se reiniciará Vivet. ¿Continuar?': 'All performance options will be reset and Vivet will restart. Continue?',
    'Automático (recomendado)': 'Automatic (recommended)',
    'Alto rendimiento': 'High performance',
    'Agresivo (puede romper captchas)': 'Aggressive (may break captchas)',
    'Desactivada (solo CPU)': 'Disabled (CPU only)',
    'Cambiar la aceleración por GPU necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?': 'Changing GPU acceleration needs Vivet to restart to apply. Restart now?',
    'Bloquear anuncios': 'Block ads',
    'Bloquear anuncios y ventanas emergentes': 'Block ads and pop-up windows',
    'Modo rendimiento del panel': 'Panel performance mode',
    'Poner un mapa guardado en tu sala': 'Load a saved map into your room',
    'Elegí uno y se carga directo en tu sala, sin descargarlo. Hay que ser admin y tener el partido parado.': 'Pick one and it loads straight into your room, no download. You must be admin and the match must be stopped.',
    'Buscar mapa...': 'Search map...',
    'Míos': 'Mine',
    'Usar en mi sala': 'Use in my room',
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
    // --- resolución del juego + modo streamer
    'Pantalla': 'Display',
    'Resolución del juego': 'Game resolution',
    'Define con cuántos píxeles se dibuja el juego (por ejemplo 1280 × 1024) y se estira para llenar la ventana. Menos píxeles = más FPS en PCs modestas. Solo se aplica mientras jugás. "Restaurar" vuelve a la resolución nativa.':
      'Sets how many pixels the game is drawn with (for example 1280 × 1024) and stretches it to fill the window. Fewer pixels = more FPS on modest PCs. It only applies while you play. "Restore" goes back to the native resolution.',
    'Resolución (px):': 'Resolution (px):',
    'Restaurar': 'Restore',
    'Estirar a pantalla completa (si no, mantiene la proporción con barras)': 'Stretch to full screen (otherwise it keeps the aspect ratio with bars)',
    'Resolución restaurada': 'Resolution restored',
    'Transmisión': 'Streaming',
    'Modo streamer': 'Streamer mode',
    'Difumina tu código de amigo, usuario de Discord, nickname, amigos y Auth; oculta el nombre y el link de la sala; y deja el Discord Rich Presence genérico, sin datos de la sala. Atajo: Ctrl + Shift + S.':
      'Blurs your friend code, Discord username, nickname, friends and Auth; hides the room name and link; and makes the Discord Rich Presence generic, with no room info. Shortcut: Ctrl + Shift + S.',
    'Activar modo streamer': 'Enable streamer mode',
    'Modo streamer activado': 'Streamer mode enabled',
    'Modo streamer desactivado': 'Streamer mode disabled',
    'Jugando a Haxball': 'Playing Haxball',
    'Abrir en ventana': 'Open in window',
    'Hablá con tus amigos sin salir de Vivet. Mientras jugás, abrí la ventana de chats (queda encima del juego) con el botón "Chats" o con la tecla F8.': 'Talk to your friends without leaving Vivet. While you play, open the chat window (it stays on top of the game) with the "Chats" button or the F8 key.',
    'Conectá tu Discord en Social para chatear con tus amigos.': 'Connect your Discord in Social to chat with your friends.',
    'Buscar amigo...': 'Search friend...',
    'Escribí un mensaje...': 'Write a message...',
    'Enviar': 'Send',
    'Hoy': 'Today',
    'Ayer': 'Yesterday',
    'Sin resultados.': 'No results.',
    'Todavía no tenés amigos. Agregalos en Social.': 'You have no friends yet. Add them in Social.',
    'Vos': 'You',
    'Elegí un chat para empezar.': 'Pick a chat to start.',
    'Invitar a mi sala': 'Invite to my room',
    'Cargar anteriores': 'Load earlier messages',
    'Todavía no hay mensajes. ¡Saludá!': 'No messages yet. Say hi!',
    'Invitación a una sala': 'Room invitation',
    '🎮 Invitación a una sala': '🎮 Room invitation',
    'Unirme': 'Join',
    'Jugando en': 'Playing in',
    'una sala': 'a room',
    'En línea': 'Online',
    'Desconectado': 'Offline',
    'Salí de tu sala actual para unirte a esa sala': 'Leave your current room to join that one',
    'No se pudo enviar': 'Could not send',
    'No se pudo cargar el chat': 'Could not load the chat',
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
    [/^(.+) XP para$/, '$1 XP to'],
    [/^Usá valores entre (\d+) y (\d+) px$/, 'Use values between $1 and $2 px'],
    [/^Resolución (\d+) × (\d+) aplicada$/, 'Resolution $1 × $2 applied'],
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

// =============================================================================
// 2. RENDIMIENTO (renderer)  (antes: optimizations.js)
// =============================================================================
// Vivet Client - renderer/optimizations.js
// TODO lo relacionado con rendimiento del lado del renderer vive acá:
//   - limitador de FPS (override de requestAnimationFrame dentro del juego)
//   - contador de FPS y slider de límite
//   - toggle "Modo GPU agresivo"
//   - ocultar publicidad del juego
//   - intervalos de sondeo (qué tan seguido se le pregunta cosas al juego)
// Se carga ANTES que app.js (ver index.html). app.js llama a
// VivetPerf.init({...}) una vez y a VivetPerf.injectIntoGame() cuando el
// webview está listo. Los flags de Chromium/GPU del proceso principal están
// en ../optimizations-main.js.

const VIVET_PERF = {
  // Cada cuántos ms se revisa si saliste de la sala / cuál es su nombre.
  // Cada chequeo es un IPC + ejecutar JS en TODOS los frames del webview,
  // así que cuanto más espaciado, menos le roba al juego.
  LEAVE_CHECK_INTERVAL_MS: 1000,
  TITLE_REFRESH_INTERVAL_MS: 15000,
  FPS_BADGE_INTERVAL_MS: 1000,
  FPS_LIMIT_MIN: 30,
  FPS_LIMIT_MAX: 800,
  FPS_LIMIT_DEFAULT: 800,
};

// ---------------------------------------------------------------------------
// Ocultar publicidad (se inyecta dentro de la página del juego)
// ---------------------------------------------------------------------------
function hideAdsInPage() {
  try {
    var id = 'vivet-hide-ads';
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = [
      'ins.adsbygoogle { display: none !important; }',
      'iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="googleadservices"] { display: none !important; }',
      'iframe[title="Advertisement" i], iframe[aria-label="Advertisement" i] { display: none !important; }',
      '[id^="google_ads_"], [id^="div-gpt-ad"], [id*="gpt-ad"], #ad-container, .ad-container, #ezmob-footer { display: none !important; }',
      '[class*="ad-slot" i], [class*="ad_slot" i], [id*="ad-slot" i], [class*="advert" i], [id*="advert" i], [class*="banner_ad" i], [class*="banner-ad" i] { display: none !important; }',
      'iframe[width="300"][height="250"], iframe[width="160"][height="600"],',
      'iframe[width="120"][height="600"], iframe[width="300"][height="600"],',
      'iframe[width="728"][height="90"], iframe[width="320"][height="50"],',
      'iframe[width="970"][height="250"] { display: none !important; }',
      '[id*="right" i][id*="ad" i], [class*="right" i][class*="ad" i],',
      '[id*="side" i][id*="ad" i], [class*="side" i][class*="ad" i] { display: none !important; }',
    ].join('\n');
    return true;
  } catch (e) {
    return false;
  }
}



// ---------------------------------------------------------------------------
// Limitador de FPS (se inyecta dentro de la página del juego)
// ---------------------------------------------------------------------------
// CORREGIDO - causa de los bajones de FPS: el limitador anterior comparaba
// `now - lastTime >= 1000 / limite` y reseteaba lastTime = now. Cuando el
// límite es (casi) igual a los Hz del monitor - justo lo que sugiere el
// panel ("depende de tus Hz") - el timestamp de rAF tiene un jitter de
// décimas de ms, así que cada tanto `now - lastTime` daba 6.9ms contra un
// intervalo de 6.94ms y ese cuadro se SALTEABA: el juego caía a la mitad de
// FPS en ráfagas. Ahora:
//   - se usa un acumulador (lastTime += interval) con 0.5ms de tolerancia,
//     así el promedio es exacto y el jitter no saltea cuadros;
//   - si el límite es >= al refresco real, no se saltea nada;
//   - cancelAnimationFrame funciona (antes cancelar podía matar el loop);
//   - no se aloca un array nuevo (slice) por cuadro.
function overrideRafInPage(initialFps) {
  // Solo en páginas de haxball.com (no en captchas ni anuncios de terceros).
  if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
  if (window.__vivetRafOverridden) {
    window.__vivetFpsLimit = initialFps || window.__vivetFpsLimit || 300;
    return;
  }
  window.__vivetRafOverridden = true;
  window.__vivetFpsLimit = initialFps || 300;
  window.__vivetDelivered = 0;

  var nativeRAF = window.requestAnimationFrame.bind(window);
  window.__vivetNativeRAF = nativeRAF;

  var queue = [];
  var nextId = 0;
  var lastTime = 0;

  // El límite se respeta siempre (el máximo del slider es 800 FPS reales).
  window.requestAnimationFrame = function (cb) {
    var id = ++nextId;
    queue.push({ id: id, cb: cb });
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === id) { queue[i].cb = null; return; }
    }
  };

  // El loop corre con el rAF nativo. Si Chromium no está limitado a los Hz del
  // monitor ("Impulso de FPS"), el rAF nativo dispara miles de veces
  // por segundo y este loop se quedaba girando en el hilo principal aunque
  // saltease casi todos los cuadros: eso le quita tiempo a los eventos de
  // teclado y el delay aparece con los minutos. Por eso, si falta bastante
  // para el próximo cuadro, se duerme con un timer y recién ahí se pide el rAF.
  function schedule(now) {
    var wait = (lastTime + 1000 / (window.__vivetFpsLimit || 300)) - now;
    if (wait > 3) setTimeout(function () { nativeRAF(loop); }, wait - 2.5);
    else nativeRAF(loop);
  }
  function loop(now) {
    var interval = 1000 / (window.__vivetFpsLimit || 300);
    var elapsed = now - lastTime;
    if (elapsed >= interval - 0.5) {
      lastTime = elapsed > interval * 2 ? now : lastTime + interval;
      window.__vivetFrame = (window.__vivetFrame || 0) + 1;
      var run = queue;
      queue = [];
      for (var i = 0; i < run.length; i++) {
        var entry = run[i];
        if (!entry.cb) continue;
        try { entry.cb(now); } catch (e) { console.error(e); }
      }
      window.__vivetDelivered++;
    }
    schedule(now);
  }
  nativeRAF(loop);
}

// ---------------------------------------------------------------------------
// Foto de perfil dentro del círculo del jugador (se inyecta en la página del juego)
// ---------------------------------------------------------------------------
// Haxball NO dibuja tu propio nick: en su lugar traza un halo blanco translúcido
// (arc de radio 25, alpha 0.3) en la posición de TU disco y justo después dibuja
// todos los discos con arc() + fill() + stroke(). Entonces: se detecta el halo,
// se toma el primer arc completo con el mismo centro (tu disco) y, cuando termina
// su stroke(), se pinta la foto recortada en círculo encima. Solo cambia lo que ve
// este cliente. Idempotente: volver a llamarla solo actualiza la foto.
// (El parámetro nick ya no se usa; queda por compatibilidad con VivetPerf.)
function avatarHookInPage(dataUrl, nick) {
  try {
    if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
    var st = window.__vivetAvatar || (window.__vivetAvatar = { bmp: null, src: '', halo: null, pend: null });
    if (!dataUrl) {
      st.bmp = null; st.src = ''; st.halo = null; st.pend = null;
    } else if (st.src !== dataUrl) {
      st.src = dataUrl; st.bmp = null;
      var m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (m) {
        // Blob en vez de <img src=data:...>: no depende de la CSP de la página.
        var bin = atob(m[2]);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        createImageBitmap(new Blob([u8], { type: m[1] })).then(function (b) {
          if (st.src === dataUrl) st.bmp = b;
        }).catch(function () {});
      }
    }
    if (window.__vivetAvatarHooked) return;
    window.__vivetAvatarHooked = true;

    var proto = CanvasRenderingContext2D.prototype;
    var nativeArc = proto.arc;
    var nativeStroke = proto.stroke;
    var TAU = Math.PI * 2;

    proto.arc = function (x, y, r, a0, a1) {
      if (st.bmp && a1 - a0 > 6 && a1 - a0 < 6.6) { // círculo completo
        if (r === 25 && Math.abs(this.globalAlpha - 0.3) < 0.02 && /^(#fff(fff)?|white)$/i.test(String(this.strokeStyle))) {
          // Halo del jugador actual.
          st.halo = { ctx: this, x: x, y: y, t: performance.now() };
          st.pend = null;
        } else if (st.halo && st.halo.ctx === this && r >= 3 && r <= 60
          && Math.abs(x - st.halo.x) < 0.5 && Math.abs(y - st.halo.y) < 0.5
          && performance.now() - st.halo.t < 60) {
          // Disco del jugador actual: se pinta cuando termine su stroke().
          st.pend = { ctx: this, x: x, y: y, r: r, t: performance.now() };
          st.halo = null;
        }
      }
      return nativeArc.apply(this, arguments);
    };

    proto.stroke = function () {
      var ret = nativeStroke.apply(this, arguments);
      var p = st.pend;
      if (p && p.ctx === this) {
        st.pend = null;
        if (st.bmp && performance.now() - p.t < 16) {
          try {
            this.save();
            this.beginPath();
            nativeArc.call(this, p.x, p.y, Math.max(1, p.r - 1), 0, TAU);
            this.clip();
            this.drawImage(st.bmp, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            this.restore();
          } catch (e) {}
        }
      }
      return ret;
    };
  } catch (e) {}
}

// Cuenta cuadros reales entregados al juego por segundo. Usa el rAF NATIVO
// (capturado antes del override) para no pasar por el limitador.
function fpsProbeInPage() {
  if (!/(^|\.)haxball\.com$/.test(location.hostname)) return;
  if (window.__vivetFpsStarted) return;
  window.__vivetFpsStarted = true;
  window.__vivetFps = 0;
  var nativeRAF = (window.__vivetNativeRAF || window.requestAnimationFrame).bind(window);
  var frames = 0;
  var lastDelivered = 0;
  var last = performance.now();
  // Antes del override se cuentan cuadros con el rAF nativo; una vez que el
  // limitador está activo se lee su contador con un timer de 1s (así no hay
  // un segundo rAF girando a miles de Hz cuando el límite está destrabado).
  function tick() {
    if (window.__vivetRafOverridden) return;
    frames++;
    nativeRAF(tick);
  }
  nativeRAF(tick);
  setInterval(function () {
    var now = performance.now();
    if (window.__vivetRafOverridden) {
      var d = window.__vivetDelivered || 0;
      window.__vivetFps = Math.round((d - lastDelivered) * 1000 / Math.max(1, now - last));
      lastDelivered = d;
    } else {
      window.__vivetFps = Math.round(frames * 1000 / Math.max(1, now - last));
    }
    frames = 0;
    last = now;
  }, 1000);
}

function setFpsLimitInPage(value) {
  window.__vivetFpsLimit = value;
}

// Baja/restaura la resolución de render del juego. Haxball dimensiona su
// canvas usando devicePixelRatio, así que se lo escala y se fuerza un resize.
function setRenderScaleInPage(scale) {
  try {
    if (window.__vivetRealDpr === undefined) window.__vivetRealDpr = window.devicePixelRatio || 1;
    window.__vivetRenderScale = scale;
    if (!window.__vivetDprPatched) {
      window.__vivetDprPatched = true;
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: function () { return window.__vivetRealDpr * (window.__vivetRenderScale || 1); },
      });
    }
    window.dispatchEvent(new Event('resize'));
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// API que usa app.js
// ---------------------------------------------------------------------------
const VivetPerf = (() => {
  let ctx = null;
  let fpsLimitValue = VIVET_PERF.FPS_LIMIT_DEFAULT;
  let fpsBoost = false;
  let avatarData = '';
  let avatarInjected = false;
  let displayHz = 60;
  let badgeBusy = false;
  let badgeFrame = null;
  let badgeTick = 0;
  let renderScale = 1;

  const asScript = (fn, arg) =>
    '(' + fn.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ');';

  function applyAdsSetting() {
    if (!ctx) return;
    ctx.execInAllFrames(asScript(hideAdsInPage)).catch(() => {});
  }

  // Idempotente: todo se protege con flags dentro de la página, así que se
  // puede llamar en dom-ready, en cada navegación de frame y al entrar a
  // jugar sin duplicar nada. El orden importa: el probe se engancha al rAF
  // nativo ANTES de que el override lo reemplace.
  // CORREGIDO (28/09) - "a veces no sirve el contador de FPS": el probe y el
  // limitador se inyectaban con execInGame, o sea en UN solo frame elegido por
  // gameFrameHint. Ese hint se pone en null en cada navegación (entrar por
  // link, salir/entrar de salas), y con null se apuntaba al último frame que
  // podía no ser el del juego -> el contador leía 0 o nada. Ahora se inyecta
  // en TODOS los frames de haxball.com (es idempotente y se protege con flags)
  // y se reintenta unas veces porque el frame del juego puede no existir aún
  // cuando llega dom-ready / did-frame-navigate.
  let retryPending = false;
  async function injectAll() {
    if (!ctx) return;
    try {
      await ctx.execInAllFrames(asScript(fpsProbeInPage));
      await ctx.execInAllFrames(asScript(overrideRafInPage, effectiveFps()));
      if (avatarData || avatarInjected) {
        // El nick se lee ahora: es el que tenías al entrar a la sala.
        const nick = typeof currentNickname === 'string' ? currentNickname : '';
        await ctx.execInAllFrames('(' + avatarHookInPage.toString() + ')(' + JSON.stringify(avatarData) + ',' + JSON.stringify(nick) + ');');
        avatarInjected = !!avatarData;
      }
    } catch (_) {}
  }
  function injectIntoGame() {
    if (!ctx) return;
    injectAll();
    if (!retryPending) {
      retryPending = true;
      [700, 2000, 4500].forEach((ms) => setTimeout(injectAll, ms));
      setTimeout(() => { retryPending = false; }, 5000);
    }
    if (renderScale !== 1) applyRenderScale();
    applyAdsSetting();
  }

  // Con el Impulso de FPS activo el tope real es Hz del monitor + 200 (o el
  // slider, si es menor). Sin impulso, Chromium ya limita a los Hz.
  const effectiveFps = () =>
    fpsBoost ? Math.min(fpsLimitValue, Math.round(displayHz) + 200) : fpsLimitValue;
  const fpsLabel = () => `${fpsLimitValue} FPS`;

  const clampFps = (v) =>
    Math.min(VIVET_PERF.FPS_LIMIT_MAX, Math.max(VIVET_PERF.FPS_LIMIT_MIN, Number(v) || VIVET_PERF.FPS_LIMIT_DEFAULT));

  async function initFpsLimit() {
    const input = document.querySelector('#fps-limit-input');
    const label = document.querySelector('#fps-limit-value');
    try {
      fpsLimitValue = clampFps(await window.vivet.getConfig('fpsLimit', VIVET_PERF.FPS_LIMIT_DEFAULT));
    } catch (_) {
      fpsLimitValue = VIVET_PERF.FPS_LIMIT_DEFAULT;
    }
    if (input) input.value = String(fpsLimitValue);
    if (label) label.textContent = fpsLabel();

    let saveTimer = null;
    input?.addEventListener('input', () => {
      fpsLimitValue = clampFps(input.value);
      if (label) label.textContent = fpsLabel();
      // Aplica al toque en el frame que ya tiene el override corriendo.
      ctx.execInAllFrames(asScript(setFpsLimitInPage, effectiveFps())).catch(() => {});
      // Guardar en disco solo cuando el slider se queda quieto.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => window.vivet.setConfig('fpsLimit', fpsLimitValue).catch(() => {}), 300);
    });
  }

  function initFpsBadge() {
    const badge = document.querySelector('#fps-badge');
    const toggle = document.querySelector('#fps-toggle');
    setInterval(async () => {
      const playing = ctx.appRoot.classList.contains('playing');
      if (!playing || (toggle && !toggle.checked)) {
        if (badge && badge.style.display !== 'none') badge.style.display = 'none';
        return;
      }
      if (badgeBusy) return;
      badgeBusy = true;
      try {
        // Cada segundo se pregunta SOLO al frame del juego (ya identificado);
        // cada 10 ticks, o si ese frame falla, se revisan todos. Así no se
        // ejecuta JS en todos los frames (anuncios incluidos) todos los segundos.
        const CODE = "typeof window.__vivetFps === 'number' ? window.__vivetFps : -1";
        let fps = -1;
        badgeTick++;
        if (badgeFrame != null && badgeTick % 10 !== 0) {
          try {
            const v = Number(await window.vivet.execInWebview(ctx.view.getWebContentsId(), CODE, badgeFrame));
            if (Number.isFinite(v)) fps = v;
          } catch (_) { badgeFrame = null; }
        }
        if (fps < 0) {
          const results = await ctx.execInAllFrames(CODE);
          let best = null;
          for (const r of results) {
            if (r.ok && Number(r.value) > fps) { fps = Number(r.value); best = r.frameTreeNodeId; }
          }
          badgeFrame = fps >= 0 ? best : null;
        }
        if (fps < 0) injectAll();
        if (badge) {
          const txt = fps < 0 ? 'FPS: --' : `FPS: ${fps}`;
          if (badge.textContent !== txt) badge.textContent = txt;
          if (badge.style.display !== '') badge.style.display = '';
        }
      } catch (_) {
      } finally {
        badgeBusy = false;
      }
    }, VIVET_PERF.FPS_BADGE_INTERVAL_MS);
  }

  // Modo de aceleración por GPU. Lo lee optimizations-main.js al arrancar
  // ('gpuMode'; si no existe, migra el viejo 'aggressiveGpu'), por eso pide reinicio.
  async function initGpuMode() {
    const sel = document.querySelector('#gpu-mode-select');
    if (!sel) return;
    const MODES = ['auto', 'performance', 'aggressive', 'off'];
    let mode = 'auto';
    try {
      const saved = await window.vivet.getConfig('gpuMode', null);
      if (MODES.includes(saved)) mode = saved;
      else if (await window.vivet.getConfig('aggressiveGpu', false)) mode = 'aggressive';
    } catch (_) {}
    sel.value = mode;
    sel.addEventListener('change', async () => {
      try { await window.vivet.setConfig('gpuMode', sel.value); } catch (_) {}
      if (window.confirm('Cambiar la aceleración por GPU necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
        window.vivet.relaunch?.();
      } else {
        ctx.showToast('Se aplicará la próxima vez que abras Vivet', 'ok');
      }
    });
  }

  // Impulso de FPS: sube el techo a Hz del monitor + 200. Lo lee
  // optimizations-main.js al arrancar ('fpsBoost'), por eso pide reinicio.
  async function initFpsBoostToggle() {
    const el = document.querySelector('#fps-boost-toggle');
    try { displayHz = Number(await window.vivet.displayHz()) || 60; } catch (_) {}
    try { fpsBoost = !!(await window.vivet.getConfig('fpsBoost', false)); } catch (_) {}
    injectAll(); // reaplica el tope ya con Hz + boost conocidos
    if (!el) return;
    el.checked = fpsBoost;
    el.addEventListener('change', async () => {
      try { await window.vivet.setConfig('fpsBoost', el.checked); } catch (_) {}
      if (window.confirm('El Impulso de FPS necesita reiniciar Vivet para aplicarse. ¿Reiniciar ahora?')) {
        window.vivet.relaunch?.();
      } else {
        ctx.showToast('Se aplicará la próxima vez que abras Vivet', 'ok');
      }
    });
  }

  const applyRenderScale = () => {
    if (!ctx) return;
    ctx.execInAllFrames(asScript(setRenderScaleInPage, renderScale)).catch(() => {});
  };

  // Calidad de render: escala devicePixelRatio dentro del juego.
  async function initRenderScale() {
    const sel = document.querySelector('#render-scale-select');
    try {
      renderScale = Number(await window.vivet.getConfig('renderScale', 1)) || 1;
    } catch (_) { renderScale = 1; }
    if (![0.35, 0.5, 0.75, 1].includes(renderScale)) renderScale = 1;
    if (renderScale !== 1) applyRenderScale();
    if (sel) {
      if (![...sel.options].some((o) => Number(o.value) === renderScale)) renderScale = 1;
      sel.value = String(renderScale);
      sel.addEventListener('change', () => {
        renderScale = Number(sel.value) || 1;
        applyRenderScale();
        window.vivet.setConfig('renderScale', renderScale).catch(() => {});
      });
    }
  }

  // Modo rendimiento del PANEL (la interfaz de Vivet, no el juego): pone
  // .perf-mode en <html> y el CSS (final de style.css) apaga animaciones,
  // degradados fijos y sombras. Se aplica al instante, sin reiniciar.
  async function initPanelPerfMode() {
    const el = document.querySelector('#panel-perf-toggle');
    const apply = (on) => document.documentElement.classList.toggle('perf-mode', !!on);
    let on = false;
    try { on = !!(await window.vivet.getConfig('panelPerf', false)); } catch (_) {}
    apply(on);
    if (!el) return;
    el.checked = on;
    el.addEventListener('change', () => {
      apply(el.checked);
      window.vivet.setConfig('panelPerf', el.checked).catch(() => {});
      ctx.showToast(el.checked ? 'Modo rendimiento activado' : 'Modo rendimiento desactivado', 'ok');
    });
  }

  // Deja todo el rendimiento en valores seguros y reinicia (los flags de GPU y
  // "destrabar FPS" solo se aplican al arrancar).
  function initPerfReset() {
    const btn = document.querySelector('#perf-reset-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!window.confirm('Se van a restablecer todas las opciones de rendimiento y se reiniciará Vivet. ¿Continuar?')) return;
      const defaults = {
        gpuMode: 'auto',
        aggressiveGpu: false,
        fpsBoost: false,
        uncapFps: false, // viejo, por si quedó guardado
        fpsLimit: VIVET_PERF.FPS_LIMIT_DEFAULT,
        renderScale: 1,
        panelPerf: false,
      };
      for (const [k, v] of Object.entries(defaults)) {
        try { await window.vivet.setConfig(k, v); } catch (_) {}
      }
      window.vivet.relaunch?.();
    });
  }

  function init(context) {
    ctx = context;
    initPerfReset();
    initPanelPerfMode();
    initRenderScale();
    initFpsLimit();
    initFpsBadge();
    initGpuMode();
    initFpsBoostToggle();
  }

  // Foto de perfil dentro del juego (ver avatar.js). '' = sin foto.
  function setAvatar(dataUrl) {
    avatarData = dataUrl || '';
    injectAll();
  }

  return { init, injectIntoGame, applyAdsSetting, setAvatar };
})();

// =============================================================================
// 3. APARIENCIA  (antes: appearance.js)
// =============================================================================
// Vivet Client - renderer/appearance.js
// Personalización del cliente: colores de club, textura de estadio, color de
// botones y (nuevo) temas rápidos, fondo base, imagen de fondo, tipografía,
// tamaño de interfaz, esquinas, densidad, estilo de tarjetas, barra lateral,
// portada de Explorar y exportar/importar tema.
// Solo toca variables CSS / atributos data-* del <html> y un <style> para la
// imagen; los estilos que los usan están al final de style.css.
// Las tarjetas nuevas las inserta este mismo archivo en #panel-apariencia
// (no hace falta tocar index.html). Se carga después de optimizations.js.

(() => {
  const CLUBS = [
    { id: 'vivet',        name: 'Vivet',                c1: '#17e0e8', c2: '#0aa8c9' },
    { id: 'nacional',     name: 'Atlético Nacional',    c1: '#0b8a3e', c2: '#dfe8e2' },
    { id: 'millonarios',  name: 'Millonarios',          c1: '#1d4ed8', c2: '#e8eefc' },
    { id: 'america',      name: 'América de Cali',      c1: '#d7263d', c2: '#f3f3f3' },
    { id: 'cali',         name: 'Deportivo Cali',       c1: '#14a85a', c2: '#f3f3f3' },
    { id: 'junior',       name: 'Junior',               c1: '#e63946', c2: '#f3f3f3' },
    { id: 'dim',          name: 'Independiente Medellín', c1: '#d62839', c2: '#1b3a8a' },
    { id: 'santafe',      name: 'Santa Fe',             c1: '#d62839', c2: '#f3f3f3' },
    { id: 'tolima',       name: 'Tolima',               c1: '#7a1f3d', c2: '#f2c14e' },
    { id: 'boca',         name: 'Boca Juniors',         c1: '#123d8f', c2: '#f2c500' },
    { id: 'river',        name: 'River Plate',          c1: '#e10600', c2: '#f3f3f3' },
    { id: 'madrid',       name: 'Real Madrid',          c1: '#e8ecf5', c2: '#febe10' },
    { id: 'barcelona',    name: 'Barcelona',            c1: '#a50044', c2: '#004d98' },
  ];
  const STADIUMS = ['none', 'cesped', 'cancha', 'reflectores', 'gradas'];
  const BTN_PRESETS = ['#17e0e8', '#3ddc84', '#f5b74b', '#ff5470', '#a78bfa', '#3b82f6', '#f472b6', '#ffffff'];

  // Opciones de "un solo valor entre varios" (se dibujan como botones segmentados).
  const SEGMENTS = [
    { card: 'base', key: 'base', label: 'Fondo base', opts: [['normal', 'Normal'], ['amoled', 'Negro puro'], ['navy', 'Azul noche'], ['graphite', 'Grafito']] },
    { card: 'type', key: 'font', label: 'Tipografía', opts: [['inter', 'Inter'], ['system', 'Sistema'], ['serif', 'Serif'], ['mono', 'Monoespaciada']] },
    { card: 'shape', key: 'radius', label: 'Esquinas', opts: [['sharp', 'Rectas'], ['normal', 'Normales'], ['round', 'Redondeadas'], ['pill', 'Píldora']] },
    { card: 'shape', key: 'density', label: 'Densidad', opts: [['compact', 'Compacta'], ['normal', 'Normal'], ['comfy', 'Cómoda']] },
    { card: 'shape', key: 'cards', label: 'Tarjetas', opts: [['flat', 'Planas'], ['border', 'Con borde'], ['raised', 'Elevadas']] },
    { card: 'shape', key: 'sidebar', label: 'Barra lateral', opts: [['narrow', 'Angosta'], ['normal', 'Normal'], ['wide', 'Ancha']] },
    { card: 'explore', key: 'hero', label: 'Portada de Explorar', opts: [['full', 'Completa'], ['compact', 'Compacta'], ['minimal', 'Mínima']] },
  ];
  const ENUMS = {};
  SEGMENTS.forEach((s) => { ENUMS[s.key] = s.opts.map((o) => o[0]); });

  // Temas rápidos: cambian colores, textura, intensidad y fondo base de una.
  const PRESETS = [
    { id: 'vivet',     name: 'Vivet',      c1: '#17e0e8', c2: '#0aa8c9', club: 'vivet',  btn: '',        stadium: 'none',        strength: 40, base: 'normal' },
    { id: 'medianoche', name: 'Medianoche', c1: '#6366f1', c2: '#22d3ee', club: 'custom', btn: '#818cf8', stadium: 'reflectores', strength: 55, base: 'navy' },
    { id: 'esmeralda', name: 'Esmeralda',  c1: '#10b981', c2: '#065f46', club: 'custom', btn: '#3ddc84', stadium: 'cesped',      strength: 50, base: 'normal' },
    { id: 'atardecer', name: 'Atardecer',  c1: '#fb923c', c2: '#ec4899', club: 'custom', btn: '#fb923c', stadium: 'gradas',      strength: 45, base: 'graphite' },
    { id: 'sakura',    name: 'Sakura',     c1: '#f472b6', c2: '#a78bfa', club: 'custom', btn: '#f472b6', stadium: 'none',        strength: 45, base: 'normal' },
    { id: 'carbon',    name: 'Carbón',     c1: '#e5e7eb', c2: '#6b7280', club: 'custom', btn: '#ffffff', stadium: 'none',        strength: 25, base: 'amoled' },
  ];

  const DEFAULTS = {
    club: 'vivet', custom1: '#17e0e8', custom2: '#0aa8c9', stadium: 'none', strength: 40, btn: '',
    base: 'normal', font: 'inter', scale: 100, radius: 'normal', density: 'normal',
    cards: 'border', sidebar: 'normal', hero: 'full', dim: 55,
  };
  const EXTRA_KEYS = [...Object.keys(ENUMS), 'scale', 'dim'];
  const SHARE_KEYS = ['club', 'custom1', 'custom2', 'stadium', 'strength', 'btn', ...EXTRA_KEYS];

  const $ = (s) => document.querySelector(s);
  const state = { ...DEFAULTS, image: '' };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toast = (m, k) => { try { if (typeof showToast === 'function') showToast(m, k); } catch (_) {} };

  const HEX = /^#[0-9a-f]{6}$/i;
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
  }
  function colorsOf(club) {
    if (club === 'custom') return [state.custom1, state.custom2];
    const c = CLUBS.find((x) => x.id === club) || CLUBS[0];
    return [c.c1, c.c2];
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.round(Math.min(255, Math.max(0, v * (1 + f))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
  }

  // Valida cualquier objeto de ajustes (config guardada o tema importado).
  function sanitize(o) {
    const r = {};
    if (!o || typeof o !== 'object') return r;
    if (typeof o.club === 'string' && (o.club === 'custom' || CLUBS.some((x) => x.id === o.club))) r.club = o.club;
    ['custom1', 'custom2'].forEach((k) => { if (HEX.test(o[k])) r[k] = o[k]; });
    if (STADIUMS.includes(o.stadium)) r.stadium = o.stadium;
    if (o.strength != null && Number.isFinite(Number(o.strength))) r.strength = clamp(Number(o.strength), 0, 100);
    if (o.btn === '' || HEX.test(o.btn)) r.btn = o.btn;
    Object.keys(ENUMS).forEach((k) => { if (ENUMS[k].includes(o[k])) r[k] = o[k]; });
    if (o.scale != null && Number.isFinite(Number(o.scale))) r.scale = clamp(Math.round(Number(o.scale)), 85, 130);
    if (o.dim != null && Number.isFinite(Number(o.dim))) r.dim = clamp(Math.round(Number(o.dim)), 0, 90);
    return r;
  }

  // ------------------------------------------------------------ aplicar
  // Color de botones/acentos: pisa las variables del tema; '' = el del tema.
  function applyButtons() {
    const root = document.documentElement;
    const names = ['--accent', '--accent-2', '--accent-soft', '--accent-border', '--btn-ink'];
    if (!HEX.test(state.btn)) { names.forEach((v) => root.style.removeProperty(v)); return; }
    const n = parseInt(state.btn.slice(1), 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    root.style.setProperty('--accent', state.btn);
    root.style.setProperty('--accent-2', shade(state.btn, -0.25));
    root.style.setProperty('--accent-soft', rgba(state.btn, 0.11));
    root.style.setProperty('--accent-border', rgba(state.btn, 0.32));
    root.style.setProperty('--btn-ink', lum > 0.55 ? '#04141a' : '#ffffff');
  }

  // La imagen va en un <style> propio (no en una variable CSS: una variable
  // con cientos de KB se heredaría a todos los elementos).
  function applyImage() {
    const root = document.documentElement;
    let st = document.getElementById('vv-bgimg');
    if (!state.image) {
      if (st) st.remove();
      root.removeAttribute('data-bgimg');
      return;
    }
    if (!st) { st = document.createElement('style'); st.id = 'vv-bgimg'; document.head.appendChild(st); }
    const css = `:root[data-bgimg] .main{background:` +
      `linear-gradient(color-mix(in srgb,var(--bg) var(--fx-dim,55%),transparent),color-mix(in srgb,var(--bg) var(--fx-dim,55%),transparent)),` +
      `url("${state.image}") center / cover no-repeat,` +
      `var(--fx-stadium,linear-gradient(transparent,transparent)),` +
      `radial-gradient(1100px 520px at 100% -8%,var(--fx-c1),transparent 70%),` +
      `radial-gradient(900px 480px at -8% 108%,var(--fx-c2),transparent 70%),var(--bg);}`;
    if (st.dataset.src !== state.image) { st.textContent = css; st.dataset.src = state.image; }
    root.setAttribute('data-bgimg', '1');
  }

  function apply() {
    applyButtons();
    const [c1, c2] = colorsOf(state.club);
    const k = clamp(Number(state.strength) || 0, 0, 100) / 100;
    const root = document.documentElement;
    // Con intensidad 100% el brillo llega a ~0.26 de alfa: presente pero nunca invasivo.
    root.style.setProperty('--fx-c1', rgba(c1, 0.26 * k));
    root.style.setProperty('--fx-c2', rgba(c2, 0.20 * k));
    root.style.setProperty('--fx-side', rgba(c1, 0.12 * k));
    root.style.setProperty('--fx-edge', rgba(c1, 0.45 * k));
    root.setAttribute('data-stadium', state.stadium);

    // Atributos data-*: solo se ponen si el valor no es el de fábrica.
    const setAttr = (name, val, def) => {
      if (val === def) root.removeAttribute(name); else root.setAttribute(name, val);
    };
    setAttr('data-base', state.base, 'normal');
    setAttr('data-font', state.font, 'inter');
    setAttr('data-radius', state.radius, 'normal');
    setAttr('data-density', state.density, 'normal');
    setAttr('data-cards', state.cards, 'border');
    setAttr('data-sidebar', state.sidebar, 'normal');
    setAttr('data-hero', state.hero, 'full');
    root.style.setProperty('--ui-zoom', String(state.scale / 100));
    setAttr('data-zoomed', '1', state.scale === 100 ? '1' : '');
    root.style.setProperty('--fx-dim', state.dim + '%');
    applyImage();
  }

  // ------------------------------------------------------------ guardar
  function save() {
    try {
      window.vivet.setConfig('bgClub', state.club);
      window.vivet.setConfig('bgCustom1', state.custom1);
      window.vivet.setConfig('bgCustom2', state.custom2);
      window.vivet.setConfig('bgStadium', state.stadium);
      window.vivet.setConfig('bgStrength', state.strength);
      window.vivet.setConfig('btnColor', state.btn);
      const extra = {};
      EXTRA_KEYS.forEach((k) => { extra[k] = state[k]; });
      window.vivet.setConfig('bgExtra', extra);
    } catch (_) {}
  }
  function saveImage() {
    try { window.vivet.setConfig('bgImage', state.image || ''); return true; }
    catch (_) { return false; }
  }

  // ------------------------------------------------------------ UI existente
  function syncUI() {
    document.querySelectorAll('.club-chip').forEach((b) => b.classList.toggle('active', b.dataset.club === state.club));
    document.querySelectorAll('.stadium-chip').forEach((b) => b.classList.toggle('active', b.dataset.stadium === state.stadium));
    const s1 = $('#bg-custom-1'), s2 = $('#bg-custom-2'), r = $('#bg-strength'), l = $('#bg-strength-value');
    if (s1) s1.value = state.custom1;
    if (s2) s2.value = state.custom2;
    if (r) r.value = String(state.strength);
    if (l) l.textContent = `${state.strength}%`;
    const bc = $('#btn-color');
    if (bc && HEX.test(state.btn)) bc.value = state.btn;
    document.querySelectorAll('.btn-swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === state.btn));

    // Controles nuevos
    document.querySelectorAll('.ap-seg-btn').forEach((b) => b.classList.toggle('active', state[b.dataset.key] === b.dataset.v));
    const sc = $('#ap-scale'), scv = $('#ap-scale-value');
    if (sc) sc.value = String(state.scale);
    if (scv) scv.textContent = `${state.scale}%`;
    const dm = $('#ap-dim'), dmv = $('#ap-dim-value');
    if (dm) dm.value = String(state.dim);
    if (dmv) dmv.textContent = `${state.dim}%`;
    const st = $('#ap-img-status');
    if (st) st.textContent = state.image ? `Imagen activa (${Math.round(state.image.length / 1024)} KB)` : 'Sin imagen';
    const clr = $('#ap-img-clear');
    if (clr) clr.disabled = !state.image;
  }

  function buildBtnSwatches() {
    const box = $('#btn-swatches');
    if (!box) return;
    box.innerHTML = BTN_PRESETS.map((c) =>
      `<button type="button" class="btn-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('');
    box.querySelectorAll('.btn-swatch').forEach((b) => b.addEventListener('click', () => {
      state.btn = b.dataset.color; apply(); syncUI(); save();
    }));
  }

  function buildClubChips() {
    const grid = $('#club-grid');
    if (!grid) return;
    const chips = CLUBS.map((c) => `
      <button class="club-chip" data-club="${c.id}" type="button">
        <span class="club-swatch" style="background: linear-gradient(135deg, ${c.c1} 50%, ${c.c2} 50%);"></span>
        <span class="club-chip-name">${c.name}</span>
      </button>`);
    chips.push(`
      <button class="club-chip" data-club="custom" type="button">
        <span class="club-swatch club-swatch-custom"></span>
        <span class="club-chip-name">Personalizado</span>
      </button>`);
    grid.innerHTML = chips.join('');
    grid.querySelectorAll('.club-chip').forEach((b) => b.addEventListener('click', () => {
      state.club = b.dataset.club;
      apply(); syncUI(); save();
    }));
  }

  // ------------------------------------------------------------ UI nueva
  const segRow = (s) =>
    `<div class="ap-row"><span class="ap-label">${s.label}</span><div class="ap-seg">` +
    s.opts.map(([v, t]) => `<button type="button" class="ap-seg-btn" data-key="${s.key}" data-v="${v}">${t}</button>`).join('') +
    `</div></div>`;
  const segs = (card) => SEGMENTS.filter((s) => s.card === card).map(segRow).join('');

  function buildExtraUI() {
    const panel = $('#panel-apariencia');
    if (!panel || $('#ap-presets')) return;
    const anchor = panel.querySelector('.panel-toolbar');
    const html = `
      <div class="fr-section-title">Personalización avanzada</div>
      <div class="card">
        <h3>Temas rápidos</h3>
        <p>Un click cambia colores, textura y fondo a la vez. Después podés ajustar lo que quieras.</p>
        <div id="ap-presets" class="preset-grid"></div>
      </div>
      <div class="card">
        <h3>Fondo base</h3>
        <p>El tono de fondo del cliente. Solo se nota con el tema oscuro.</p>
        ${segs('base')}
      </div>
      <div class="card">
        <h3>Imagen de fondo</h3>
        <p>Poné tu propia imagen detrás del cliente. Se reduce sola para que no pese, y no afecta al juego.</p>
        <div class="btn-color-row">
          <button id="ap-img-pick" class="primary-btn" type="button">Elegir imagen</button>
          <button id="ap-img-clear" class="ghost-btn" type="button">Quitar</button>
          <span id="ap-img-status" class="status"></span>
        </div>
        <input id="ap-img-file" type="file" accept="image/*" hidden />
        <div class="ap-row">
          <span class="ap-label">Oscurecer</span>
          <div class="fps-limit-row ap-range">
            <input type="range" id="ap-dim" min="0" max="90" step="5" value="55" />
            <span id="ap-dim-value" class="fps-limit-value">55%</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Texto</h3>
        <p>Tipografía y tamaño de toda la interfaz del cliente.</p>
        ${segs('type')}
        <div class="ap-row">
          <span class="ap-label">Tamaño de la interfaz</span>
          <div class="fps-limit-row ap-range">
            <input type="range" id="ap-scale" min="85" max="130" step="5" value="100" />
            <span id="ap-scale-value" class="fps-limit-value">100%</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Forma y densidad</h3>
        <p>Qué tan redondeado, compacto y marcado se ve todo.</p>
        ${segs('shape')}
      </div>
      <div class="card">
        <h3>Explorar salas</h3>
        <p>La portada grande se puede reducir para ver más salas sin hacer scroll.</p>
        ${segs('explore')}
      </div>
      <div class="card">
        <h3>Compartir tema</h3>
        <p>Copiá tu configuración para pasársela a alguien, o pegá la de otra persona y aplicala. La imagen de fondo no se incluye.</p>
        <textarea id="ap-theme-code" class="ap-code" rows="3" spellcheck="false" placeholder="Pegá acá un tema y tocá Aplicar tema"></textarea>
        <div class="btn-color-row" style="margin-top:10px">
          <button id="ap-theme-copy" class="ghost-btn" type="button">Copiar mi tema</button>
          <button id="ap-theme-apply" class="primary-btn" type="button">Aplicar tema</button>
        </div>
      </div>`;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    panel.insertBefore(frag, anchor || null);

    // Temas rápidos
    $('#ap-presets').innerHTML = PRESETS.map((p) => `
      <button type="button" class="preset-chip" data-preset="${p.id}">
        <span class="club-swatch" style="background: linear-gradient(135deg, ${p.c1} 50%, ${p.c2} 50%);"></span>
        <span class="club-chip-name">${p.name}</span>
      </button>`).join('');
  }

  // Redimensiona a máx. 1600 px y comprime a JPEG para guardar poco en disco.
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Elegí un archivo de imagen'));
      if (file.size > 20 * 1024 * 1024) return reject(new Error('La imagen pesa demasiado (máx. 20 MB)'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Esa imagen no se pudo abrir'));
        img.onload = () => {
          const k = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k));
          c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function bindExtra() {
    const panel = $('#panel-apariencia');
    if (!panel) return;

    panel.addEventListener('click', (e) => {
      const seg = e.target.closest('.ap-seg-btn');
      if (seg) { state[seg.dataset.key] = seg.dataset.v; apply(); syncUI(); save(); return; }
      const pr = e.target.closest('.preset-chip');
      if (pr) {
        const p = PRESETS.find((x) => x.id === pr.dataset.preset);
        if (!p) return;
        Object.assign(state, sanitize({ club: p.club, custom1: p.c1, custom2: p.c2, btn: p.btn, stadium: p.stadium, strength: p.strength, base: p.base }));
        apply(); syncUI(); save();
      }
    });

    let t = null;
    $('#ap-scale')?.addEventListener('input', (e) => {
      state.scale = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });
    $('#ap-dim')?.addEventListener('input', (e) => {
      state.dim = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });

    $('#ap-img-pick')?.addEventListener('click', () => $('#ap-img-file')?.click());
    $('#ap-img-file')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const st = $('#ap-img-status');
      if (st) st.textContent = 'Procesando…';
      try {
        state.image = await readImage(file);
        apply(); syncUI();
        if (!saveImage()) toast('La imagen se aplicó, pero no se pudo guardar para la próxima vez');
        else toast('Imagen de fondo aplicada', 'ok');
      } catch (err) {
        syncUI();
        toast(err.message || 'No se pudo usar esa imagen');
      }
    });
    $('#ap-img-clear')?.addEventListener('click', () => {
      state.image = '';
      apply(); syncUI(); saveImage();
    });

    $('#ap-theme-copy')?.addEventListener('click', async () => {
      const out = { v: 1 };
      SHARE_KEYS.forEach((k) => { out[k] = state[k]; });
      const text = JSON.stringify(out);
      const box = $('#ap-theme-code');
      if (box) box.value = text;
      try {
        if (typeof copyToClipboard === 'function') copyToClipboard(text, 'Tema copiado');
        else { await navigator.clipboard.writeText(text); toast('Tema copiado', 'ok'); }
      } catch (_) { toast('Copialo a mano desde el cuadro de texto'); }
    });
    $('#ap-theme-apply')?.addEventListener('click', () => {
      const box = $('#ap-theme-code');
      let obj = null;
      try { obj = JSON.parse((box && box.value || '').trim()); } catch (_) {}
      const clean = sanitize(obj);
      if (!Object.keys(clean).length) return toast('Ese texto no es un tema válido');
      Object.assign(state, clean);
      apply(); syncUI(); save();
      toast('Tema aplicado', 'ok');
    });
  }

  function bind() {
    document.querySelectorAll('.stadium-chip').forEach((b) => b.addEventListener('click', () => {
      state.stadium = b.dataset.stadium;
      apply(); syncUI(); save();
    }));
    ['1', '2'].forEach((n) => {
      $('#bg-custom-' + n)?.addEventListener('input', (e) => {
        state['custom' + n] = e.target.value;
        state.club = 'custom';
        apply(); syncUI();
      });
      $('#bg-custom-' + n)?.addEventListener('change', save);
    });
    let t = null;
    $('#bg-strength')?.addEventListener('input', (e) => {
      state.strength = Number(e.target.value);
      apply(); syncUI();
      clearTimeout(t); t = setTimeout(save, 300);
    });
    $('#btn-color')?.addEventListener('input', (e) => { state.btn = e.target.value; apply(); syncUI(); });
    $('#btn-color')?.addEventListener('change', save);
    $('#btn-color-reset')?.addEventListener('click', () => { state.btn = ''; apply(); syncUI(); save(); });
    $('#bg-reset-btn')?.addEventListener('click', () => {
      const hadImage = !!state.image;
      Object.assign(state, DEFAULTS, { image: '' });
      apply(); syncUI(); save();
      if (hadImage) saveImage();
    });
    bindExtra();
  }

  async function load() {
    try {
      const g = (k, d) => window.vivet.getConfig(k, d);
      const merged = {
        club: await g('bgClub', DEFAULTS.club),
        custom1: await g('bgCustom1', DEFAULTS.custom1),
        custom2: await g('bgCustom2', DEFAULTS.custom2),
        stadium: await g('bgStadium', DEFAULTS.stadium),
        strength: await g('bgStrength', DEFAULTS.strength),
        btn: await g('btnColor', ''),
        ...(await g('bgExtra', null) || {}),
      };
      Object.assign(state, sanitize(merged));
      const im = await g('bgImage', '');
      if (typeof im === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(im) && im.length < 8e6) state.image = im;
    } catch (_) {}
    apply(); syncUI();
  }

  buildExtraUI();
  buildClubChips();
  buildBtnSwatches();
  bind();
  apply(); syncUI(); // valores por defecto al toque, sin esperar al disco
  load();
})();

// =============================================================================
// 4. NÚCLEO (salas, juego, paneles)  (antes: app.js)
// =============================================================================
// Vivet Client - renderer app.js
// Script del proceso de renderer principal de Vivet Client.

const $ = (sel) => document.querySelector(sel);
const appRoot = $('#app-root');
const view = $('#game-view');

const HAXBALL_PLAY_URL = 'https://www.haxball.com/play';

let gameFrameHint = null;

function execInGame(code) {
  let id;
  try {
    id = view.getWebContentsId();
  } catch (_) {
    return Promise.reject(new Error('webview no está listo todavía'));
  }
  return window.vivet.execInWebview(id, code, gameFrameHint);
}

function execInAllFrames(code) {
  let id;
  try {
    id = view.getWebContentsId();
  } catch (_) {
    return Promise.reject(new Error('webview no está listo todavía'));
  }
  return window.vivet.execInWebviewAll(id, code);
}

// CORREGIDO (27/09) - un solo intento de foco justo al entrar a jugar no
// siempre pega: el webview puede todavía estar asentándose, o Haxball
// puede robar el foco un instante después (ej: autofocus del input de
// nickname). Reintentamos con foco "real" (proceso principal, ver
// webview-focus en main.js) unas cuantas veces durante el primer segundo.
function focusGameView() {
  try { view.focus(); } catch (_) {}
  let attempts = 0;
  const maxAttempts = 6;
  const tick = () => {
    attempts++;
    let id;
    try {
      id = view.getWebContentsId();
    } catch (_) {
      id = null;
    }
    if (id != null) {
      const rect = view.getBoundingClientRect();
      window.vivet.focusWebview?.(id, rect.width, rect.height).catch(() => {});
      try { view.focus(); } catch (_) {}
    }
    if (attempts < maxAttempts) setTimeout(tick, 150);
  };
  tick();
}

// Si el teclado queda en la capa de Vivet (host) en vez de en el webview del
// juego, las teclas llegan con delay o no llegan. Estos avisos devuelven el
// foco al juego sin simular clicks: al volver a la ventana, al soltar el mouse
// sobre el área del juego y cuando una tecla cae en el documento de Vivet
// mientras se juega (fuera de inputs).
(() => {
  let last = 0;
  const softFocus = () => {
    if (!appRoot.classList.contains('playing')) return;
    const now = Date.now();
    if (now - last < 150) return;
    last = now;
    try {
      const id = view.getWebContentsId();
      if (id != null) window.vivet.focusWebviewSoft?.(id).catch(() => {});
    } catch (_) {}
  };
  const editable = (t) => !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
  window.addEventListener('focus', softFocus);
  document.addEventListener('pointerup', (e) => {
    if (e.target.closest && e.target.closest('.game-wrap')) softFocus();
  }, true);
  document.addEventListener('keydown', (e) => { if (!editable(e.target)) softFocus(); }, true);
})();



// ---------------------------------------------------------------------------
// Toasts / Notificaciones cortas
// ---------------------------------------------------------------------------
function showToast(message, kind) {
  const container = $('#toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'ok' ? ' toast-ok' : '');
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, 2400);
}

function copyToClipboard(text, successMessage) {
  if (!text) {
    showToast('No hay nada para copiar todavía');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => showToast(successMessage || 'Copiado al portapapeles', 'ok'))
    .catch(() => showToast('No se pudo copiar'));
}

// Rendimiento (rAF, FPS, GPU, anuncios): todo en optimizations.js
VivetPerf.init({ view, appRoot, execInGame, execInAllFrames, showToast });

// ---------------------------------------------------------------------------
// Chequeo de actualizaciones
// ---------------------------------------------------------------------------
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

const updateBanner = $('#update-banner');
const updateBannerText = $('#update-banner-text');
const updateDownloadBtn = $('#update-download-btn');
let latestUpdateUrl = null;

async function checkForUpdate() {
  if (typeof UPDATE_MANIFEST_URL === 'undefined' || !UPDATE_MANIFEST_URL) return;
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const current = await window.vivet.getAppVersion();
    if (data && data.version && data.url && compareVersions(data.version, current) > 0) {
      latestUpdateUrl = data.url;
      if (updateBannerText) updateBannerText.textContent = `Vivet ${data.version} disponible`;
      if (updateBanner) updateBanner.style.display = '';
    }
  } catch (_) {}
}
updateDownloadBtn?.addEventListener('click', () => {
  if (latestUpdateUrl) window.vivet.openExternal(latestUpdateUrl);
});
checkForUpdate();
setInterval(checkForUpdate, 30 * 60 * 1000);

// ---------------------------------------------------------------------------
// Navegación entre paneles
// ---------------------------------------------------------------------------
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    navBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(btn.dataset.panel).classList.add('active');
    // "Crear sala" no es un panel para leer: lleva directo al diálogo de Haxball.
    if (btn.dataset.panel === 'panel-crear' && typeof startCreateRoom === 'function') startCreateRoom();
  });
});

// ---------------------------------------------------------------------------
// Tema claro/oscuro
// ---------------------------------------------------------------------------
const themeToggle = $('#theme-toggle');
const themeLabel = $('#theme-label');

async function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Oscuro' : 'Claro';
  await window.vivet.setConfig('theme', theme);
}

(async () => {
  const saved = await window.vivet.getConfig('theme', 'dark');
  applyTheme(saved);
})();

themeToggle?.addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

$('#discord-quick-btn')?.addEventListener('click', () => {
  window.vivet.openExternal(DISCORD_INVITE_URL);
});

// ---------------------------------------------------------------------------
// Modo "jugando"
// ---------------------------------------------------------------------------
const copyLinkBtn = $('#copy-link-btn');
const roomNameBadge = $('#room-name-badge');

function updateRoomNameBadge(code, roomName) {
  if (!roomNameBadge) return;
  roomNameBadge.textContent = roomName ? roomName : (code ? `Sala: ${code}` : '');
}

// ---------------------------------------------------------------------------
// Overlay de "entrando a la sala" - ver comentario en index.html/style.css.
// Tapa el webview desde el instante en que se marca "playing" hasta que
// hay señal real de que ya estás DENTRO de la sala (no solo conectando).
// ---------------------------------------------------------------------------
const joinOverlayEl = $('#join-overlay');
const joinOverlayTextEl = $('#join-overlay-text');
const JOIN_OVERLAY_MIN_MS = 350; // piso, para que no titile si ya estaba casi listo
const JOIN_OVERLAY_MAX_MS = 12000; // techo, para no quedar tapado para siempre si algo no matchea
const JOIN_OVERLAY_POLL_MS = 200;
let joinOverlayPollTimer = null;
let joinOverlayHideTimer = null;

function showJoinOverlay(text) {
  if (!joinOverlayEl) return;
  if (joinOverlayTextEl) joinOverlayTextEl.textContent = text || 'Entrando a la sala…';
  clearTimeout(joinOverlayHideTimer);
  joinOverlayEl.classList.add('visible');
  // Fuerza reflow para que la transición de opacity sí corra (si venía de
  // display:none no hay transición sin este truco).
  void joinOverlayEl.offsetWidth;
  joinOverlayEl.classList.add('show');
}

function hideJoinOverlay() {
  clearInterval(joinOverlayPollTimer);
  joinOverlayPollTimer = null;
  if (!joinOverlayEl) return;
  joinOverlayEl.classList.remove('show');
  clearTimeout(joinOverlayHideTimer);
  joinOverlayHideTimer = setTimeout(() => joinOverlayEl.classList.remove('visible'), 200);
}

// Detecta si ya hay UI real de sala/partido en pantalla (no solo el lobby
// ni la pantalla intermedia de "conectando" de Haxball) - usa las mismas
// clases que ya pisa el CSS personalizado en config.js, así que sabemos
// que existen de verdad en la página.
function inGameUiVisibleInPage() {
  try {
    if (document.querySelector('.room-view') || document.querySelector('.game-state-view')) return true;
    // CORREGIDO (28/09) - al entrar por link, si Haxball muestra algo que
    // necesita que lo veas (captcha, clave de sala, "Room closed"...) el
    // overlay lo tapaba hasta el techo de tiempo y parecía que "no mostraba
    // nada". Esos casos cuentan como "ya hay algo para mostrar". El pedido
    // de nickname NO cuenta: ese lo completa Vivet solo.
    var txt = (document.body && document.body.innerText) || '';
    if (/choose\s*nickname/i.test(txt)) return false;
    if (document.querySelector('iframe[src*="recaptcha"], iframe[title*="recaptcha" i], .g-recaptcha')) return true;
    if (document.querySelector('.dialog') && /password|captcha|robot|closed|full|banned|kicked|error|failed/i.test(txt)) return true;
    return false;
  } catch (e) {
    return false;
  }
}
function buildInGameUiScript() {
  return '(' + inGameUiVisibleInPage.toString() + ')();';
}

function waitOutJoinOverlay() {
  const startedAt = Date.now();
  clearInterval(joinOverlayPollTimer);
  const check = async () => {
    if (!appRoot.classList.contains('playing')) return; // saliste mientras tanto
    const elapsed = Date.now() - startedAt;
    let ready = false;
    try {
      // CORREGIDO (28/09) - entrando por link nadie completaba el "Choose
      // nickname" (el sondeo de salas se frena al pasar a "playing"), así que
      // la pantalla quedaba tapada hasta el timeout. Se completa acá también.
      await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
      const results = await execInAllFrames(buildInGameUiScript());
      ready = results.some((r) => r.ok && r.value === true);
    } catch (_) {}
    if ((ready && elapsed >= JOIN_OVERLAY_MIN_MS) || elapsed >= JOIN_OVERLAY_MAX_MS) {
      hideJoinOverlay();
      refreshRoomTitleFromPage();
      return;
    }
    joinOverlayPollTimer = setTimeout(check, JOIN_OVERLAY_POLL_MS);
  };
  check();
}

let joinedAt = 0;
let currentRoomName = null;
let currentRoomUrl = null;
let leaveHits = 0;
// Se pone en true mientras el flujo de "Crear sala" tiene el juego real a
// la vista (ver createRoomBtn más abajo) - el diálogo nativo de Haxball
// aparece ENCIMA del lobby, así que sin esto checkLeftRoom pensaría que
// "volviste al lobby" al toque y te sacaría de vuelta al panel de Vivet
// antes de que puedas ni ver el diálogo.
let creatingRoom = false;
// true mientras se reproduce un replay (ver replays.js): el juego queda a la
// vista sin ser una sala, así que hay que frenar la detección de "volviste al
// lobby" y no mostrar el overlay de "entrando a la sala".
let replayMode = false;
const LEAVE_GRACE_MS = 1000;
const LEAVE_CONFIRM_HITS = 1;
const LEAVE_CHECK_INTERVAL_MS = VIVET_PERF.LEAVE_CHECK_INTERVAL_MS;

function setPlaying(isPlaying) {
  const wasPlaying = appRoot.classList.contains('playing');
  appRoot.classList.toggle('playing', isPlaying);
  if (isPlaying === wasPlaying) return;
  if (isPlaying) {
    joinedAt = Date.now();
    leaveHits = 0;
    stopRoomPolling();
    // CORREGIDO (27/09) - antes, apenas se confirmaba el join, se
    // destapaba el webview al toque: eso mostraba, en crudo, tanto el
    // parpadeo negro de #game-wrap asentándose como la propia pantalla de
    // "conectando" nativa de Haxball (que todavía puede tardar un rato
    // más en resolverse). Ahora se tapa con join-overlay (con su propio
    // spinner, sin negro puro) desde este mismo instante, y recién se
    // saca cuando waitOutJoinOverlay detecta UI real de sala/partido.
    // Excepto en el flujo de "Crear sala" (creatingRoom) - ahí el webview
    // se muestra a propósito para que completes vos mismo el diálogo
    // nativo "Create room" de Haxball, así que taparlo sería contraprod.
    if (!creatingRoom && !replayMode) {
      showJoinOverlay();
      waitOutJoinOverlay();
    }
    // CORREGIDO (27/09) - view.focus() (DOM, desde este mismo renderer)
    // no siempre alcanza para que Chromium le pase el foco de teclado real
    // al guest, sobre todo justo acá, con el webview todavía asentándose
    // después del join/navegación. focusGameView() pide el foco "de
    // verdad" desde el proceso principal (ver webview-focus en main.js) y
    // reintenta un par de veces, porque el primer intento puede llegar
    // demasiado pronto.
    focusGameView();
    VivetPerf.injectIntoGame();
  } else {
    hideJoinOverlay();
    startRoomPolling();
  }
}

function currentRoomCode() {
  try {
    return new URL(view.getURL()).searchParams.get('c');
  } catch (_) {
    return null;
  }
}

function handleNavigate() {
  const code = currentRoomCode();
  gameFrameHint = null;
  setPlaying(replayMode ? true : !!code);
  updateDiscordPresence(code, currentRoomName);
  updateRoomNameBadge(code, currentRoomName);
}copyLinkBtn?.addEventListener('click', async () => {
  // CORREGIDO (26/09) - cuando entrás a una sala pública haciendo click en
  // la lista, Haxball no navega la URL (es un SPA), así que ni
  // currentRoomCode() ni buscar "c=" en los frames encontraba nada. Ahora
  // guardamos la URL real de la sala (la que scrapeamos de la lista, o la
  // que usamos para el "Jugar" directo) en currentRoomUrl al entrar, y la
  // usamos primero acá.
  if (currentRoomUrl) {
    copyToClipboard(currentRoomUrl, 'Link de la sala copiado');
    return;
  }

  const code = currentRoomCode();

  // Si hay código en la URL, lo usa. Si no, busca en todos los frames:
  if (code) {
    copyToClipboard(`${HAXBALL_PLAY_URL}?c=${encodeURIComponent(code)}`, 'Link copiado');
    return;
  }

  try {
    const results = await execInAllFrames('location.href');
    const withCode = results.find((r) => r.ok && /[?&]c=/.test(r.value || ''));
    const m = withCode ? withCode.value.match(/[?&]c=([^&]+)/) : null;

    if (m) {
      // CORREGIDO: Se usa m[1] porque es el primer y único grupo de captura ([^&]+)
      copyToClipboard(`${HAXBALL_PLAY_URL}?c=${m[1]}`, 'Link de la sala copiado');
      return;
    }
  } catch (_) {}

  showToast('No se encontró el link. Intentá cuando ya estés en la cancha.');
});

// ---------------------------------------------------------------------------
// Detección automática de retorno al lobby
// ---------------------------------------------------------------------------
function lobbyVisibleInPage() {
  try {
    // Si hay sala o partida en pantalla NO estamos en el lobby: salida
    // inmediata, sin tocar el texto de la página. Antes se leía
    // document.body.innerText (fuerza un layout completo) en todos los
    // frames cada 600ms MIENTRAS jugabas - causa directa de tirones.
    if (document.querySelector('.room-view, .game-state-view')) return false;
    var bodyText = (document.body && document.body.textContent) || '';
    return /[\d,]+\s+players?\s+in\s+[\d,]+\s+rooms?/i.test(bodyText);
  } catch (e) {
    return false;
  }
}

function buildLobbyCheckScript() {
  return '(' + lobbyVisibleInPage.toString() + ')();';
}

let leaveWatchTimer = null;
let leaveCheckInFlight = false;
let leaveTick = 0;
async function checkLeftRoom() {
  if (!appRoot.classList.contains('playing') || creatingRoom || replayMode) return;
  if (Date.now() - joinedAt < LEAVE_GRACE_MS) return;
  if (leaveCheckInFlight) return;
  leaveCheckInFlight = true;
  try {
    // Optimización: normalmente alcanza con preguntarle al frame del juego (ya
    // identificado en gameFrameHint). Cada 5 chequeos, o si no hay frame / falla,
    // se revisan todos (mismo criterio que el contador de FPS).
    let backAtLobby;
    leaveTick++;
    if (gameFrameHint != null && leaveTick % 5 !== 0) {
      try { backAtLobby = (await execInGame(buildLobbyCheckScript())) === true; } catch (_) { backAtLobby = undefined; }
    }
    if (backAtLobby === undefined) {
      const results = await execInAllFrames(buildLobbyCheckScript());
      backAtLobby = results.some((r) => r.ok && r.value === true);
    }
    leaveHits = backAtLobby ? leaveHits + 1 : 0;
    if (leaveHits >= LEAVE_CONFIRM_HITS) {
      leaveHits = 0;
      setPlaying(false);
      gameFrameHint = null;
      currentRoomName = null;
      currentRoomUrl = null;
      updateDiscordPresence(null);
      updateRoomNameBadge(null, null);
      // CORREGIDO (27/09) - antes acá se hacía view.loadURL(HAXBALL_PLAY_URL),
      // o sea recargar TODA la página del juego desde cero al salir de una
      // sala. Eso te mandaba de nuevo por todo el handshake de conexión de
      // Haxball (la pantalla de "conectando" que se quedaba viendo) y
      // mientras esa recarga terminaba, la lista de salas no tenía nada
      // fresco para mostrar. Entrar a una sala NO navega la URL (es un
      // SPA - ver el comentario en copyLinkBtn más arriba), así que salir
      // tampoco debería necesitar un reload completo: alcanza con
      // quedarnos en la misma página (ya volvió sola al lobby) y
      // re-scrapear al toque.
      pokeRoomPolling();
    }
  } catch (_) {
  } finally {
    leaveCheckInFlight = false;
  }
}

if (!leaveWatchTimer) {
  leaveWatchTimer = setInterval(checkLeftRoom, LEAVE_CHECK_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Explorar salas & Scraper ligero
// ---------------------------------------------------------------------------
const searchInput = $('#search-input');
const sortSelect = $('#sort-select');
const refreshBtn = $('#refresh-btn');
const roomListEl = $('#room-list');
const statPlayersEl = $('#stat-players');
const lastUpdatedEl = $('#last-updated');

let allRoomsCache = [];
let currentRoomsData = { rooms: [], totalPlayers: null, totalRooms: null };
let roomPollTimer = null;

function scrapeRoomsInPage() {
  try {
    var rows = Array.from(document.querySelectorAll('tr'));
    var rooms = [];
    rows.forEach(function (row) {
      var text = (row.innerText || '').trim();
      if (!text) return;
      var m = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      var cells = Array.from(row.querySelectorAll('td, th')).map(function (c) {
        return (c.innerText || '').trim();
      });
      var name = cells[0] || (text.split('\n')[0] || 'Sala');
      var distM = text.match(/(\d+)\s*km/i);
      var link = row.querySelector('a[href*="c="]');
      var url = link ? link.href : null;
      // País: Haxball marca la bandera de cada sala con una clase tipo "f-co"
      // (o con una <img> cuyo nombre de archivo es el código).
      var country = null;
      var flagEls = row.querySelectorAll('[class*="flag"], [class*="f-"]');
      for (var fi = 0; fi < flagEls.length && !country; fi++) {
        var cm = String(flagEls[fi].className || '').match(/(?:^|\s)f-([a-z]{2})(?:\s|$)/i);
        if (cm) country = cm[1].toLowerCase();
      }
      if (!country) {
        var flagImg = row.querySelector('img');
        var im = flagImg && String(flagImg.src || '').match(/\/([a-z]{2})\.(?:png|gif|svg|webp)/i);
        if (im) country = im[1].toLowerCase();
      }
      rooms.push({
        country: country,
        name: name,
        players: parseInt(m[1], 10),
        maxPlayers: parseInt(m[2], 10),
        distanceKm: distM ? parseInt(distM[1], 10) : null,
        hasPassword: /(^|[^a-zA-Z])Yes([^a-zA-Z]|$)/.test(text),
        url: url,
      });
    });
    var bodyText = document.body.innerText || '';
    var hm = bodyText.match(/([\d,]+)\s+players?\s+in\s+([\d,]+)\s+rooms?/i);
    return JSON.stringify({
      rooms: rooms,
      totalPlayers: hm ? parseInt(hm[1].replace(/,/g, ''), 10) : null,
      totalRooms: hm ? parseInt(hm[2].replace(/,/g, ''), 10) : null,
    });
  } catch (e) {
    return JSON.stringify({ rooms: [], totalPlayers: null, totalRooms: null, error: String((e && e.message) || e) });
  }
}

function joinRoomInPage(roomName) {
  try {
    var rows = Array.from(document.querySelectorAll('tr'));
    var target = rows.find(function (row) {
      return (row.innerText || '').trim() === roomName.trim();
    });
    if (!target) {
      target = rows.find(function (row) {
        return (row.innerText || '').indexOf(roomName) !== -1;
      });
    }
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      try {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      } catch (_) {}
    });

    var attempts = 0;
    var maxAttempts = 50;
    var intervalMs = 200;
    var triedDblClick = false;
    var timer = setInterval(function () {
      attempts++;
      var btns = Array.from(document.querySelectorAll('button, a'));
      var joinBtn = btns.find(function (b) {
        var t = (b.innerText || b.textContent || '').trim();
        return /^(join\s*room|join|entrar|unirse)$/i.test(t) || /join\s*room/i.test(t);
      });
      if (joinBtn) {
        clearInterval(timer);
        joinBtn.click();
        return;
      }
      if (!triedDblClick && attempts >= 5) {
        triedDblClick = true;
        try {
          target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, intervalMs);

    return true;
  } catch (e) {
    return false;
  }
}

// Haxball NO actualiza su lista de salas solo: hay que tocar su botón "Refresh".
// Antes Vivet solo releía el DOM viejo, por eso las salas nuevas no salían ni
// apretando "Actualizar". Se toca ese botón en el lobby y se espera a que cargue.
function clickLobbyRefreshInPage() {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return false;
    var b = document.querySelector('button[data-hook="refresh"]');
    if (!b) {
      var all = document.querySelectorAll('button');
      for (var i = 0; i < all.length; i++) {
        if (/^\s*refresh\s*$/i.test(all[i].textContent || '')) { b = all[i]; break; }
      }
    }
    if (!b || b.disabled) return false;
    b.click();
    return true;
  } catch (e) { return false; }
}
let lastLobbyRefresh = 0;
async function refreshLobbyList(force) {
  const now = Date.now();
  if (!force && now - lastLobbyRefresh < 4000) return;
  try {
    const r = await execInAllFrames('(' + clickLobbyRefreshInPage.toString() + ')();');
    if (r.some((x) => x.ok && x.value === true)) {
      lastLobbyRefresh = now;
      await new Promise((res) => setTimeout(res, 900)); // deja que Haxball termine de cargar la lista
    }
  } catch (_) {}
}

function buildScrapeScript() {
  return '(' + scrapeRoomsInPage.toString() + ')();';
}
function buildJoinScript(roomName) {
  return '(' + joinRoomInPage.toString() + ')(' + JSON.stringify(roomName) + ');';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

const COUNTRY_HINTS = [
  ['VENEZUELA', 'VE'], ['COLOMBIA', 'CO'], ['ARGENTINA', 'AR'], ['MÉXICO', 'MX'],
  ['MEXICO', 'MX'], ['PERÚ', 'PE'], ['PERU', 'PE'], ['CHILE', 'CL'], ['ECUADOR', 'EC'],
  ['ESPAÑA', 'ES'], ['SPAIN', 'ES'], ['BOLIVIA', 'BO'], ['PARAGUAY', 'PY'],
  ['URUGUAY', 'UY'], ['BRASIL', 'BR'], ['BRAZIL', 'BR'], ['GUATEMALA', 'GT'],
  ['HONDURAS', 'HN'], ['DOMINICANA', 'DO'], ['COSTA RICA', 'CR'], ['PANAMÁ', 'PA'],
  ['PANAMA', 'PA'], ['NICARAGUA', 'NI'], ['EL SALVADOR', 'SV'], ['CUBA', 'CU'],
  ['PUERTO RICO', 'PR'], ['USA', 'US'], ['UNITED STATES', 'US'], ['ESTADOS UNIDOS', 'US'],
  ['CANADA', 'CA'], ['CANADÁ', 'CA'], ['ITALIA', 'IT'], ['ITALY', 'IT'], ['FRANCIA', 'FR'],
  ['FRANCE', 'FR'], ['ALEMANIA', 'DE'], ['GERMANY', 'DE'], ['PORTUGAL', 'PT'],
  ['ENGLAND', 'GB'], ['UK', 'GB'], ['REINO UNIDO', 'GB'], ['RUSSIA', 'RU'],
  ['RUSIA', 'RU'], ['TURKEY', 'TR'], ['TURQUIA', 'TR'], ['POLAND', 'PL'],
  ['POLONIA', 'PL'], ['ROMANIA', 'RO'], ['RUMANIA', 'RO'], ['INDONESIA', 'ID'],
  ['PHILIPPINES', 'PH'], ['FILIPINAS', 'PH'], ['INDIA', 'IN'], ['CHINA', 'CN'],
  ['JAPAN', 'JP'], ['JAPÓN', 'JP'], ['KOREA', 'KR'], ['COREA', 'KR'],
  ['VIETNAM', 'VN'], ['THAILAND', 'TH'], ['EGYPT', 'EG'], ['EGIPTO', 'EG'],
  ['MOROCCO', 'MA'], ['MARRUECOS', 'MA'], ['AUSTRALIA', 'AU'], ['NETHERLANDS', 'NL'], ['HOLANDA', 'NL'],
];

function guessCountryCode(name) {
  const upper = name.toUpperCase();
  const hit = COUNTRY_HINTS.find(([needle]) => upper.includes(needle));
  return hit ? hit[1] : 'WW';
}

function countryCodeToDisplay(code) {
  if (!code || code === 'WW') return '🌐';
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const base = 0x1f1e6;
  const chars = [...code].map((c) => String.fromCodePoint(base + (c.charCodeAt(0) - 65)));
  return chars.join('');
}

function resolveRoomUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) return trimmed;
  const code = trimmed.replace(/^\?c=/, '').replace(/^c=/, '');
  return `https://www.haxball.com/play?c=${encodeURIComponent(code)}`;
}

function isDirectJoinInput(value) {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('http')) return true;
  return /^[a-zA-Z0-9_-]{14,}$/.test(v) && /[0-9]/.test(v) && /[a-zA-Z]/.test(v);
}

function matchPinned(pinned, rooms) {
  if (!pinned.match) return null;
  const needle = pinned.match.toUpperCase();
  return rooms.find((r) => r.name.toUpperCase().includes(needle)) || null;
}

// País de una sala: primero el que Haxball marca en la lista, si no, se intenta
// adivinar por el nombre. En Windows los emojis de bandera no se ven (salen
// como letras), así que la bandera se dibuja con una imagen.
function roomCountry(r) {
  const c = r && r.country ? String(r.country).toLowerCase() : '';
  if (/^[a-z]{2}$/.test(c)) return c;
  const g = guessCountryCode((r && r.name) || '');
  return g === 'WW' ? '' : g.toLowerCase();
}
function countryName(code) {
  try {
    return new Intl.DisplayNames([window.vivetLang && window.vivetLang() === 'en' ? 'en' : 'es'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase();
  } catch (_) { return code.toUpperCase(); }
}
function flagBoxHtml(code) {
  if (!code) return '<div class="room-flag" title="Global">🌐</div>';
  return `<div class="room-flag has-flag" title="${escapeHtml(countryName(code))}"><img class="flag-img" alt="" src="https://flagcdn.com/w40/${code}.png" onerror="this.remove()" /><span class="flag-code">${code.toUpperCase()}</span></div>`;
}
function countryBadgeHtml(code) {
  if (!code) return '';
  return `<span class="chip chip-country"><img class="flag-img-sm" alt="" src="https://flagcdn.com/w20/${code}.png" onerror="this.remove()" />${escapeHtml(countryName(code))}</span>`;
}

// Favoritos: una sala favorita es una sala fijada por nombre (misma lista que
// "Fijar sala"), así que aparece arriba y se guarda en 'pinnedRooms'.
function isFavRoom(r) {
  const n = String((r && r.name) || '').toUpperCase();
  return pinnedRooms.some((p) => !p.url && p.match && n.includes(String(p.match).toUpperCase()));
}
function toggleFavRoom(name) {
  const n = String(name || '').toUpperCase();
  const hits = pinnedRooms.filter((p) => !p.url && p.match && n.includes(String(p.match).toUpperCase()));
  if (hits.length) {
    pinnedRooms = pinnedRooms.filter((p) => !hits.includes(p));
    showToast('Quitada de favoritos');
  } else {
    pinnedRooms.push({ label: name, match: name });
    showToast('Agregada a favoritos', 'ok');
  }
  savePinnedRooms();
  renderRoomList();
}

function roomCardHtml(r) {
  const cc = roomCountry(r);
  const fav = isFavRoom(r);
  return `<div class="room-card">
    ${flagBoxHtml(cc)}
    <div class="room-main">
      <div class="room-name">${escapeHtml(r.name)}</div>
      <div class="room-meta">
        ${countryBadgeHtml(cc)}
        <span class="chip">${r.players}/${r.maxPlayers} jugadores</span>
        ${r.hasPassword ? '<span class="chip chip-lock">Con clave</span>' : ''}
        ${r.distanceKm != null ? `<span class="chip">${r.distanceKm} km</span>` : ''}
      </div>
    </div>
    <span class="room-pill room-pill-live">LIVE</span>
    <div class="room-actions">
      <button class="ghost-btn fav-btn ${fav ? 'active' : ''}" data-fav-name="${escapeHtml(r.name)}" title="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${fav ? '★' : '☆'}</button>
      ${r.url ? `<button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(r.url)}" title="Copiar link">Copiar</button>` : ''}
      <button class="primary-btn room-join-btn" data-join-name="${escapeHtml(r.name)}" data-join-url="${escapeHtml(r.url || '')}">Jugar</button>
    </div>
  </div>`;
}

function pinnedCardHtml(pinned, live, index) {
  const removeBtn = `<button class="ghost-btn pin-remove-btn" data-unpin-index="${index}" title="Desanclar">Quitar</button>`;
  if (pinned.url) {
    return `<div class="room-card room-card-pinned">
      <div class="room-flag room-flag-text" aria-hidden="true">URL</div>
      <div class="room-main">
        <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
        <div class="room-meta"><span class="chip">Acceso directo por link</span></div>
      </div>
      <span class="room-pill room-pill-direct">DIRECTO</span>
      <div class="room-actions">
        <button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(pinned.url)}" title="Copiar link">Copiar</button>
        <button class="primary-btn room-join-btn" data-join-url="${escapeHtml(pinned.url)}" data-join-label="${escapeHtml(pinned.label)}">Jugar</button>
        ${removeBtn}
      </div>
    </div>`;
  }
  if (live) {
    const lcc = roomCountry(live);
    return `<div class="room-card room-card-pinned">
      ${flagBoxHtml(lcc)}
      <div class="room-main">
        <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
        <div class="room-meta">
          ${countryBadgeHtml(lcc)}
          <span class="chip">${live.players}/${live.maxPlayers} jugadores</span>
          ${live.distanceKm != null ? `<span class="chip">${live.distanceKm} km</span>` : ''}
        </div>
      </div>
      <span class="room-pill room-pill-live">LIVE</span>
      <div class="room-actions">
        ${live.url ? `<button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(live.url)}" title="Copiar link">Copiar</button>` : ''}
        <button class="primary-btn room-join-btn" data-join-name="${escapeHtml(live.name)}" data-join-url="${escapeHtml(live.url || '')}">Jugar</button>
        ${removeBtn}
      </div>
    </div>`;
  }
  return `<div class="room-card room-card-pinned room-card-offline">
    <div class="room-flag room-flag-text" aria-hidden="true">PIN</div>
    <div class="room-main">
      <div class="room-name">${escapeHtml(pinned.label)} <span class="badge-pinned">Fijada</span></div>
      <div class="room-meta"><span class="chip">Sin host</span></div>
    </div>
    <span class="room-pill room-pill-offline">OFFLINE</span>
    <div class="room-actions">
      <button class="ghost-btn" disabled>Jugar</button>
      ${removeBtn}
    </div>
  </div>`;
}

function directJoinCardHtml(query) {
  const url = resolveRoomUrl(query);
  return `<div class="room-card room-card-direct">
    <div class="room-flag room-flag-text" aria-hidden="true">URL</div>
    <div class="room-main">
      <div class="room-name">Entrar directo</div>
      <div class="room-meta"><span class="chip">${escapeHtml(query)}</span></div>
    </div>
    <div class="room-actions">
      <button class="ghost-btn secondary-action" data-copy-url="${escapeHtml(url)}" title="Copiar link">Copiar</button>
      <button class="primary-btn room-join-btn" data-join-url="${escapeHtml(url)}">Entrar</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Salas fijadas
// ---------------------------------------------------------------------------
let pinnedRooms = Array.isArray(PINNED_ROOMS) ? PINNED_ROOMS.slice() : [];

async function loadPinnedRooms() {
  try {
    const stored = await window.vivet.getConfig('pinnedRooms', null);
    if (Array.isArray(stored)) pinnedRooms = stored;
  } catch (_) {}
  renderRoomList();
}

function savePinnedRooms() {
  window.vivet.setConfig('pinnedRooms', pinnedRooms).catch(() => {});
}

function addPinnedRoom(label, matchOrLink) {
  const l = label.trim();
  const raw = matchOrLink.trim();
  if (!l || !raw) return;
  if (isDirectJoinInput(raw)) {
    pinnedRooms.push({ label: l, url: resolveRoomUrl(raw) });
  } else {
    pinnedRooms.push({ label: l, match: raw });
  }
  savePinnedRooms();
  renderRoomList();
  showToast(`"${l}" fijada`, 'ok');
}

function removePinnedRoom(index) {
  const removed = pinnedRooms[index];
  pinnedRooms.splice(index, 1);
  savePinnedRooms();
  renderRoomList();
  if (removed) showToast(`"${removed.label}" desanclada`);
}
loadPinnedRooms();

const pinAddBtn = $('#pin-add-btn');
const pinLabelInput = $('#pin-label-input');
const pinMatchInput = $('#pin-match-input');
pinAddBtn?.addEventListener('click', () => {
  addPinnedRoom(pinLabelInput.value, pinMatchInput.value);
  pinLabelInput.value = '';
  pinMatchInput.value = '';
});

function markUpdatedNow() {
  if (!lastUpdatedEl) return;
  const now = new Date();
  lastUpdatedEl.textContent = `actualizado ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

// Un solo listener para toda la lista (antes se enganchaba uno por botón en
// cada render). NOTA: un botón "Jugar" de sala pública puede tener a la vez
// data-join-name (auto-click de Vivet dentro del juego) y data-join-url (la URL
// real, para poder copiar el link); data-join-name tiene prioridad, si no los
// dos se dispararían juntos.
var lastRoomListHtml = null;
roomListEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-join-name],[data-join-url],[data-fav-name],[data-unpin-index],[data-copy-url],[data-copy-name]');
  if (!el || !roomListEl.contains(el)) return;
  const d = el.dataset;
  if (d.joinName !== undefined) joinByName(d.joinName, d.joinUrl || null);
  else if (d.joinUrl !== undefined) joinByUrl(d.joinUrl, d.joinLabel);
  if (d.favName !== undefined) toggleFavRoom(d.favName);
  if (d.unpinIndex !== undefined) removePinnedRoom(Number(d.unpinIndex));
  if (d.copyUrl !== undefined) copyToClipboard(d.copyUrl, 'Link de la sala copiado');
  if (d.copyName !== undefined) copyToClipboard(d.copyName, 'Nombre de la sala copiado');
});

function renderRoomList() {
  const query = searchInput.value;
  const parts = [];

  if (isDirectJoinInput(query)) {
    parts.push(directJoinCardHtml(query.trim()));
  }

  const shownAsPinned = new Set();
  pinnedRooms.forEach((pinned, index) => {
    const live = pinned.url ? null : matchPinned(pinned, allRoomsCache);
    if (live) shownAsPinned.add(live);
    parts.push(pinnedCardHtml(pinned, live, index));
  });

  let list = allRoomsCache.filter((r) => !shownAsPinned.has(r));
  const q = query.trim().toLowerCase();
  if (q && !isDirectJoinInput(query)) {
    list = list.filter((r) => r.name.toLowerCase().includes(q));
  }
  const sortBy = sortSelect.value;
  list.sort((a, b) => {
    if (sortBy === 'distance') return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.players - a.players;
  });

  if (list.length) {
    parts.push(...list.map(roomCardHtml));
  } else if (!pinnedRooms.length && !isDirectJoinInput(query)) {
    parts.push(`<div class="room-list-empty">${
      allRoomsCache.length ? 'Sin resultados para esa búsqueda.' : 'Cargando salas en vivo…'
    }</div>`);
  }

  // Si nada cambió desde el sondeo anterior no se toca el DOM: reconstruir
  // cientos de filas cada 6 s era una de las causas del lag al scrollear.
  const html = parts.join('');
  if (html !== lastRoomListHtml) {
    lastRoomListHtml = html;
    roomListEl.innerHTML = html;
  }

  if (statPlayersEl) {
    if (currentRoomsData.totalPlayers != null) {
      statPlayersEl.textContent = currentRoomsData.totalPlayers.toLocaleString('es');
    } else if (allRoomsCache.length) {
      statPlayersEl.textContent = String(allRoomsCache.reduce((sum, r) => sum + r.players, 0));
    } else {
      statPlayersEl.textContent = '—';
    }
  }
}

const JOIN_CONFIRM_TIMEOUT_MS = 6000;
const JOIN_CONFIRM_INTERVAL_MS = 250;
const JOIN_LATE_WATCH_MS = 15000;

let joinWaitToken = 0;
function waitForJoinConfirm(timeoutMs) {
  const startedAt = Date.now();
  const myToken = joinWaitToken;
  return new Promise((resolve) => {
    const check = async () => {
      if (myToken !== joinWaitToken || Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      try {
        // Si Haxball te pide nickname justo en este momento, lo cerramos
        // solos en cada vuelta - si no, se queda trabado atrás (invisible,
        // porque el juego todavía está tapado por el panel de Vivet acá)
        // y el proceso entero se siente lento hasta que expira el timeout.
        await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
        const results = await execInAllFrames(buildLobbyCheckScript());
        const stillLobby = results.some((r) => r.ok && r.value === true);
        if (!stillLobby) {
          resolve(true);
          return;
        }
      } catch (_) {}
      setTimeout(check, JOIN_CONFIRM_INTERVAL_MS);
    };
    check();
  });
}

async function joinByName(name, url) {
  currentRoomName = name || null;
  currentRoomUrl = url || null;
  await execInGame(buildJoinScript(name)).catch(() => {});
  joinedAt = Date.now();

  let confirmed = await waitForJoinConfirm(JOIN_CONFIRM_TIMEOUT_MS);
  if (!confirmed) {
    confirmed = await waitForJoinConfirm(JOIN_LATE_WATCH_MS);
  }

  if (confirmed) {
    setPlaying(true);
    updateDiscordPresence(currentRoomCode(), currentRoomName);
    updateRoomNameBadge(currentRoomCode(), currentRoomName);
  } else {
    currentRoomName = null;
    currentRoomUrl = null;
    showToast('No se pudo entrar a esa sala automáticamente. Probá de nuevo.');
  }
}

function joinByUrl(url, name) {
  currentRoomName = name || null;
  currentRoomUrl = url || null;
  joinedAt = Date.now();
  gameFrameHint = null;
  seedNicknameInGame();
  view.loadURL(url);
}

// ---------------------------------------------------------------------------
// Crear sala (te lleva a la pantalla nativa "Create room" de Haxball -
// no completa nada, lo llenás vos ahí mismo)
// ---------------------------------------------------------------------------
const createRoomBtn = $('#create-room-btn');
const createRoomStatusEl = $('#create-room-status');

// Haxball no tiene un botón separado que "abra" un diálogo de crear sala -
// el formulario (nombre/máx. jugadores/contraseña/pública + botón
// "Create Room") ya está en la pantalla principal, pero parece quedar sin
// activarse hasta que hay alguna interacción real con la página (lo mismo
// que "despierta" la lista de salas al tocar "Jugar" en una fila). Con esto
// simulamos esa misma interacción genérica.
function wakeUpLobbyInPage() {
  try {
    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return 'ok';
  } catch (e) {
    return 'error:' + String((e && e.message) || e);
  }
}

function buildWakeUpLobbyScript() {
  return '(' + wakeUpLobbyInPage.toString() + ')();';
}

// REESCRITO (28/09-v3) - Vivet YA NO intenta clickear nada por su cuenta en
// "Crear sala" (adivinar el DOM de Haxball hacía que la crease sola con los
// datos por defecto, o que te dejara en la lista sin abrir nada). Ahora:
//   1) se muestra el lobby real de Haxball con un aviso arriba;
//   2) el botón "Create room" de Haxball lo tocás vos, y llenás todo a mano;
//   3) el botón "← Volver a Vivet" está siempre visible mientras tanto;
//   4) la sala se da por creada SOLO cuando aparece la UI real de sala.
function inRoomInPage() {
  try { return !!document.querySelector('.room-view, .game-state-view'); } catch (e) { return false; }
}

// Abre el diálogo "Create room" de Haxball tocando SOLO el botón del lobby.
// Nunca toca botones que estén dentro de un .dialog (ahí vive el "Create"
// que confirma), así que no puede crear la sala con los datos por defecto:
// los datos los llenás vos en el diálogo ya abierto.
// Devuelve: 'open' (diálogo ya abierto), 'clicked', 'busy' (hay otro
// diálogo, p. ej. nickname) o 'no-button' (este frame no es el lobby).
function openCreateDialogInPage() {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return 'in-room';
    var visible = function (el) { return !el.getClientRects || el.getClientRects().length > 0; };
    var RX = /^\s*create\s*room\s*$/i;
    // OJO: la propia lista de salas es un .dialog (h1 "Room list"), así que no
    // se puede excluir "todo lo que esté en un .dialog". Se distingue por el
    // título: el diálogo de crear tiene h1 "Create room".
    var isCreateDlg = function (d) {
      var h = d.querySelector('h1');
      return !!h && RX.test(h.textContent || '') && visible(d);
    };
    var dialogs = Array.prototype.slice.call(document.querySelectorAll('.dialog'));
    if (dialogs.some(isCreateDlg)) return 'open';
    if (/choose\s*nickname/i.test(document.body.innerText || '')) return 'busy';
    var btn = document.querySelector('button[data-hook=create]');
    if (!btn || !visible(btn) || (btn.closest('.dialog') && isCreateDlg(btn.closest('.dialog')))) {
      var cands = Array.prototype.slice.call(document.querySelectorAll('button, [role=button], div, a'));
      btn = cands.find(function (el) {
        if (!RX.test(el.textContent || '') || !visible(el)) return false;
        if (el.children.length && RX.test(el.children[0].textContent || '')) return false;
        var d = el.closest('.dialog');
        return !(d && isCreateDlg(d));
      });
    }
    if (!btn) return 'no-button';
    btn.click();
    return 'clicked';
  } catch (e) { return 'error:' + String((e && e.message) || e); }
}

// Vigila el botón "Cancel" (y Escape) del diálogo nativo "Create room" de Haxball.
// Sin esto, cancelar te dejaba en la lista de salas de Haxball en vez de volver a Vivet.
// Devuelve 'cancelled' | 'watching' | 'none'.
function watchCreateCancelInPage() {
  try {
    if (window.__vivetCreateCancelled === true) return 'cancelled';
    var RX = /^\s*create\s*room\s*$/i;
    var dlgs = document.querySelectorAll('.dialog');
    for (var i = 0; i < dlgs.length; i++) {
      var d = dlgs[i];
      var h = d.querySelector('h1');
      if (!h || !RX.test(h.textContent || '')) continue;
      if (!d.__vvCancelHooked) {
        d.__vvCancelHooked = true;
        d.addEventListener('click', function (e) {
          var b = e.target && e.target.closest ? e.target.closest('button') : null;
          if (b && (b.getAttribute('data-hook') === 'cancel' || /^\s*(cancel|cancelar)\s*$/i.test(b.textContent || ''))) {
            window.__vivetCreateCancelled = true;
          }
        }, true);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && document.contains(d)) window.__vivetCreateCancelled = true;
        }, true);
      }
      return 'watching';
    }
    return 'none';
  } catch (e) { return 'error'; }
}

function waitForRoomCreated(token, timeoutMs) {
  const startedAt = Date.now();
  let dialogOpened = false, clicks = 0, lastClickAt = 0;
  return new Promise((resolve) => {
    const check = async () => {
      if (token !== joinWaitToken || Date.now() - startedAt >= timeoutMs) { resolve(false); return; }
      try {
        // Si Haxball pide "Choose nickname" al crear, se completa solo.
        await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
        // Llevar directo al diálogo "Create room" (una sola vez, con reintentos
        // mientras el lobby termina de cargar).
        if (!dialogOpened && clicks < 8 && Date.now() - lastClickAt > 1500) {
          if (clicks === 0) await execInAllFrames(buildWakeUpLobbyScript()).catch(() => {});
          const opened = await execInAllFrames('(' + openCreateDialogInPage.toString() + ')();').catch(() => []);
          if (opened.some((r) => r.ok && r.value === 'open')) dialogOpened = true;
          else if (opened.some((r) => r.ok && r.value === 'clicked')) { clicks++; lastClickAt = Date.now(); }
        }
        // Si tocó "Cancel" en el diálogo de Haxball, se corta y se vuelve a Vivet.
        if (dialogOpened || clicks > 0) {
          const w = await execInAllFrames('(' + watchCreateCancelInPage.toString() + ')();').catch(() => []);
          if (w.some((r) => r.ok && r.value === 'cancelled')) { resolve('cancelled'); return; }
        }
        const results = await execInAllFrames('(' + inRoomInPage.toString() + ')();');
        if (results.some((r) => r.ok && r.value === true)) { resolve(true); return; }
      } catch (_) {}
      setTimeout(check, 500);
    };
    check();
  });
}

async function startCreateRoom() {
  if (!createRoomBtn || creatingRoom || createRoomBtn.disabled) return;
  createRoomBtn.disabled = true;
  joinWaitToken++;
  const token = joinWaitToken;

  // creatingRoom frena la detección de "volviste al lobby" (checkLeftRoom) y
  // el overlay de "entrando a la sala" mientras vos completás el formulario.
  creatingRoom = true;
  appRoot.classList.add('creating');
  setPlaying(true);
  if (createRoomStatusEl) createRoomStatusEl.textContent = '';
  execInAllFrames('window.__vivetCreateCancelled = false;').catch(() => {});

  try {
    const created = await waitForRoomCreated(token, 15 * 60 * 1000);
    if (token !== joinWaitToken) return; // cancelaste con "Volver a Vivet"
    if (created === 'cancelled') { // tocó "Cancel" en el diálogo de Haxball
      joinWaitToken++;
      creatingRoom = false;
      appRoot.classList.remove('creating');
      reloadGameFresh(); // vuelve a Vivet, igual que "← Volver a Vivet"
      return;
    }
    creatingRoom = false;
    if (created) {
      joinedAt = Date.now();
      currentRoomName = null;
      updateDiscordPresence(currentRoomCode(), null);
      updateRoomNameBadge(currentRoomCode(), null);
      showToast('Sala creada', 'ok');
    } else {
      setPlaying(false);
    }
  } catch (err) {
    creatingRoom = false;
    setPlaying(false);
  } finally {
    if (token === joinWaitToken) appRoot.classList.remove('creating');
    createRoomBtn.disabled = false;
  }
}
createRoomBtn?.addEventListener('click', startCreateRoom);

// Botón "Volver a Vivet" mientras se está creando la sala: antes no había
// forma de salir de ahí (el sidebar queda oculto en modo jugando).
$('#exit-create-btn')?.addEventListener('click', () => {
  joinWaitToken++; // corta la espera de confirmación
  creatingRoom = false;
  appRoot.classList.remove('creating');
  if (createRoomStatusEl) createRoomStatusEl.textContent = '';
  reloadGameFresh(); // vuelve al lobby limpio y muestra el panel de Vivet
});


// ---------------------------------------------------------------------------
// Emblema de usuarios del cliente
// Cada Vivet Client agrega una marca INVISIBLE (2 caracteres de ancho cero) al
// final del nick que manda al juego. Quien no usa el cliente no ve nada; quien
// sí lo usa ve un emblema junto al nombre en la lista de jugadores (el script
// clientBadgeInPage + el CSS .vv-client-name de config.js). La marca se puede
// cambiar o apagar en config.js (CLIENT_BADGE_MARK / CLIENT_BADGE_ENABLED).
// OJO: es cosmético, no una verificación: alguien que copie la marca también
// mostraría el emblema.
// ---------------------------------------------------------------------------
function clientMark() {
  const on = typeof CLIENT_BADGE_ENABLED === 'undefined' ? true : !!CLIENT_BADGE_ENABLED;
  const m = typeof CLIENT_BADGE_MARK === 'string' ? CLIENT_BADGE_MARK : '\u200C\u2060';
  return on ? m : '';
}
// Haxball corta los nombres a 25 caracteres: si el nick no deja lugar para la
// marca, se manda sin ella (no se recorta el nick del usuario).
function withClientMark(nick) {
  const m = clientMark();
  if (!m || !nick || nick.endsWith(m)) return nick;
  if (nick.length + m.length > 25) return nick;
  return nick + m;
}

function clientBadgeInPage(mark) {
  try {
    var st = window.__vivetBadge || (window.__vivetBadge = { mark: '', hooked: false, t: null });
    st.mark = mark || '';
    function scan() {
      st.t = null;
      if (!st.mark) return;
      var items = document.querySelectorAll('.player-list-item');
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var el = it.querySelector('[data-hook=name]') || it.querySelector('.name') || it;
        var has = (el.textContent || '').indexOf(st.mark) >= 0;
        var on = el.classList.contains('vv-client-name');
        if (has && !on) el.classList.add('vv-client-name');
        else if (!has && on) el.classList.remove('vv-client-name');
      }
    }
    function later() { if (!st.t) st.t = setTimeout(scan, 200); }
    if (!st.hooked) {
      st.hooked = true;
      // Solo childList/characterData: poner la clase (atributo) no dispara un bucle.
      new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
    later();
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Nickname Auto-Dismiss
// ---------------------------------------------------------------------------
let currentNickname = null;
const nicknameInput = $('#nickname-input');
const nicknameSaveBtn = $('#nickname-save-btn');

async function loadNickname() {
  let saved = null;
  try {
    saved = await window.vivet.getConfig('nickname', null);
  } catch (_) {}
  if (!saved) {
    saved = 'Jugador' + Math.floor(1000 + Math.random() * 9000);
    window.vivet.setConfig('nickname', saved).catch(() => {});
  }
  currentNickname = saved;
  if (nicknameInput) nicknameInput.value = saved;
}
loadNickname();

// Aplica un nick nuevo en todos lados: config local, memoria, input,
// localStorage de Haxball (para la próxima vez) y Social (servidor).
async function applyNickname(val, { announce = true } = {}) {
  currentNickname = val;
  if (nicknameInput) nicknameInput.value = val;
  await window.vivet.setConfig('nickname', val).catch(() => {});
  try {
    execInAllFrames(
      "try{localStorage.setItem('player_name'," + JSON.stringify(withClientMark(val)) + ")}catch(e){}"
    ).catch(() => {});
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('vivet-nick-changed', { detail: val }));
  if (announce) showToast('Nickname guardado. Se aplica al entrar a la próxima sala', 'ok');
}

nicknameSaveBtn?.addEventListener('click', () => {
  const val = (nicknameInput?.value || '').trim();
  if (!val) { showToast('Escribí un nickname primero'); return; }
  applyNickname(val);
});
nicknameInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') nicknameSaveBtn?.click(); });

function dismissNicknamePromptInPage(nickname) {
  try {
    if (document.querySelector('.room-view, .game-state-view')) return 'in-room';
    var bodyText = document.body.innerText || '';
    if (!/choose\s*nickname/i.test(bodyText)) return 'no-prompt';
    var inputs = Array.from(document.querySelectorAll('input'));
    var input = inputs.find(function (i) {
      var type = (i.type || 'text').toLowerCase();
      return type === 'text' || type === '';
    }) || inputs[0];
    if (!input) return 'no-input';

    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, nickname);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    var clickable = Array.from(document.querySelectorAll('button, a, div, span, input[type="button"], input[type="submit"]'));
    var okBtn = clickable.find(function (b) {
      var t = (b.innerText || b.value || b.textContent || '').trim();
      return /^ok$/i.test(t);
    });
    if (okBtn) {
      okBtn.click();
      return 'clicked';
    }

    ['keydown', 'keyup'].forEach(function (type) {
      input.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true,
      }));
    });
    return 'enter';
  } catch (e) {
    return 'error:' + String((e && e.message) || e);
  }
}

function buildDismissNicknameScript(nickname) {
  return '(' + dismissNicknamePromptInPage.toString() + ')(' + JSON.stringify(withClientMark(nickname)) + ');';
}

// CORREGIDO (28/09) - "a veces me pide el nombre": el único momento en que se
// completaba solo era durante el sondeo de salas / la confirmación de join.
// Entrando por link, recargando o reconectando, el prompt aparecía con el
// sondeo ya frenado y quedaba esperando. Ahora, mientras se está entrando a
// jugar (primeros 30 s), se vigila y se completa en cualquier caso.
setInterval(() => {
  if (!appRoot.classList.contains('playing') || replayMode) return;
  if (Date.now() - joinedAt > 30000) return;
  execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
}, 1200);

// Deja el nick ya cargado en el localStorage de Haxball, así el prompt (si
// aparece) sale con tu nombre puesto.
function seedNicknameInGame() {
  if (!currentNickname) return;
  execInAllFrames(
    "try{localStorage.setItem('player_name'," + JSON.stringify(withClientMark(currentNickname)) + ")}catch(e){}"
  ).catch(() => {});
}

// ---------------------------------------------------------------------------
// Polling de Salas
// ---------------------------------------------------------------------------
let lastScrapeDebug = [];

const explorarVisible = () => !!document.querySelector('#panel-explorar.active');
let roomListDirty = false;

async function pollRoomsOnce(force) {
  // Ventana minimizada / oculta: no se le pregunta nada al juego.
  if (document.hidden) return;
  if (appRoot.classList.contains('playing')) return;
  try {
    await execInAllFrames(buildDismissNicknameScript(currentNickname || 'Jugador')).catch(() => {});
    await refreshLobbyList(force === true);
    const results = await execInAllFrames(buildScrapeScript());
    lastScrapeDebug = results;
    let best = null;
    let bestCount = -1;
    let bestFrame = null;
    for (const r of results) {
      if (!r.ok) continue;
      try {
        const data = JSON.parse(r.value);
        const count = (data.rooms || []).length;
        if (count > bestCount) {
          bestCount = count;
          best = data;
          bestFrame = r.frameTreeNodeId;
        }
      } catch (_) {}
    }
    if (best && bestCount > 0) {
      allRoomsCache = best.rooms || [];
      currentRoomsData = best;
      gameFrameHint = bestFrame;
      markUpdatedNow();
      if (!hasScrapedRoomsOnce) {
        hasScrapedRoomsOnce = true;
        if (roomPollTimer) {
          clearInterval(roomPollTimer);
          roomPollTimer = setInterval(pollRoomsOnce, ROOM_POLL_INTERVAL_MS);
        }
      }
    }
  } catch (_) {}
  // Con otro panel abierto la lista no se ve: se marca para dibujarla al volver.
  if (explorarVisible()) renderRoomList(); else roomListDirty = true;
}
document.querySelector('.nav-btn[data-panel="panel-explorar"]')?.addEventListener('click', () => {
  if (roomListDirty) { roomListDirty = false; renderRoomList(); }
});

const ROOM_POLL_INTERVAL_MS = 6000;
const ROOM_POLL_FAST_INTERVAL_MS = 1500;
let hasScrapedRoomsOnce = false;

function startRoomPolling() {
  if (roomPollTimer) return;
  const interval = hasScrapedRoomsOnce ? ROOM_POLL_INTERVAL_MS : ROOM_POLL_FAST_INTERVAL_MS;
  pollRoomsOnce();
  roomPollTimer = setInterval(pollRoomsOnce, interval);
}

function stopRoomPolling() {
  if (roomPollTimer) {
    clearInterval(roomPollTimer);
    roomPollTimer = null;
  }
}

function pokeRoomPolling() {
  pollRoomsOnce(true);
}
startRoomPolling();

searchInput.addEventListener('input', renderRoomList);
window.addEventListener('vivet-lang-changed', renderRoomList);
sortSelect.addEventListener('change', renderRoomList);
refreshBtn.addEventListener('click', () => pollRoomsOnce(true));
searchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const direct = isDirectJoinInput(searchInput.value) ? resolveRoomUrl(searchInput.value) : null;
  if (direct) joinByUrl(direct);
});


// ---------------------------------------------------------------------------
// Eventos del webview del juego
// (las inyecciones de rendimiento - rAF, FPS, ads - están en optimizations.js)
// ---------------------------------------------------------------------------
view.addEventListener('dom-ready', () => {
  seedNicknameInGame();
  VivetPerf.injectIntoGame();
  applyCountryOverride();
  applyCustomGameCssSetting();
  handleNavigate();
  pokeRoomPolling();
  if (appRoot.classList.contains('playing')) focusGameView();
});
view.addEventListener('did-navigate', handleNavigate);
view.addEventListener('did-navigate-in-page', handleNavigate);
let failRetries = 0;
view.addEventListener('did-fail-load', async (e) => {
  if (!e.isMainFrame || e.errorCode === -3) return;
  showToast(`Haxball no cargó: ${e.errorDescription} (${e.errorCode})`);
  if (failRetries++ < 2) {
    try { await window.vivet.resetGameNetwork(view.getWebContentsId()); } catch (_) {}
    setTimeout(() => { try { view.loadURL(HAXBALL_PLAY_URL); } catch (_) {} }, 1500);
  }
});
view.addEventListener('did-finish-load', () => { failRetries = 0; });
view.addEventListener('preload-error', (e) => {
  showToast('Error de preload: ' + ((e.error && e.error.message) || e.error));
});
view.addEventListener('did-frame-navigate', () => {
  seedNicknameInGame();
  VivetPerf.injectIntoGame();
  applyCustomGameCssSetting();
});

// ---------------------------------------------------------------------------
// Auth de Haxball (solo ID público)
// ---------------------------------------------------------------------------
// Un solo botón: la primera vez lee y muestra el ID público, la siguiente lo
// oculta (y borra del DOM). La clave privada solo viaja hacia main.js al
// importar y nunca vuelve al renderer. Ver main.js (auth-read / auth-import).
const authToggleBtn = $('#auth-refresh-btn');
const authGuessesEl = $('#auth-guesses');
const authKeyInput = $('#auth-key-input');
const authApplyBtn = $('#auth-apply-btn');
const authRestoreBtn = $('#auth-restore-btn');
let authVisible = false;
let authBusy = false;

function showAuthResult(publicId) {
  authVisible = true;
  if (authToggleBtn) authToggleBtn.textContent = 'Ocultar Auth';
  authGuessesEl.innerHTML = `
    <div class="auth-box">
      <h3>ID público <span>Tu Auth</span></h3>
      <p>${escapeHtml(publicId)}</p>
      <button class="auth-copy-item" data-value="${escapeHtml(publicId)}">Copiar Auth</button>
    </div>`;
  authGuessesEl.querySelector('.auth-copy-item').addEventListener('click', (e) => {
    copyToClipboard(e.target.dataset.value, 'Auth copiado');
  });
}

function setAuthBusy(busy) {
  authBusy = busy;
  [authToggleBtn, authApplyBtn, authRestoreBtn].forEach((b) => { if (b) b.disabled = busy; });
}

async function runAuthAction(label, action, okMessage) {
  if (authBusy) return null;
  setAuthBusy(true);
  if (authGuessesEl) authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(label)}</div>`;
  try {
    const res = await action();
    if (authRestoreBtn) authRestoreBtn.style.display = res && res.hasBackup ? '' : 'none';
    if (!res || !res.ok) {
      const msg = (res && res.error) || 'Error desconocido';
      authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(msg)}</div>`;
      authVisible = false;
      if (authToggleBtn) authToggleBtn.textContent = 'Ver mi Auth';
      return null;
    }
    showAuthResult(res.publicId);
    if (okMessage) showToast(okMessage, 'ok');
    return res;
  } catch (err) {
    authGuessesEl.innerHTML = `<div class="hint">${escapeHtml(String((err && err.message) || err))}</div>`;
    return null;
  } finally {
    setAuthBusy(false);
  }
}

authApplyBtn?.addEventListener('click', async () => {
  const key = (authKeyInput?.value || '').trim();
  if (!key) { showToast('Pegá primero tu clave privada (empieza con "idkey.")'); return; }
  const res = await runAuthAction('Importando...', () => window.vivet.importAuth(key), 'Auth importado');
  if (res) {
    authKeyInput.value = '';
    reloadGameFresh(); // el juego lee la clave al cargar
  }
});

authRestoreBtn?.addEventListener('click', async () => {
  const res = await runAuthAction('Restaurando...', () => window.vivet.restoreAuth(), 'Auth anterior restaurado');
  if (res) reloadGameFresh();
});

function hideAuth() {
  authVisible = false;
  if (authGuessesEl) authGuessesEl.innerHTML = '';
  if (authToggleBtn) authToggleBtn.textContent = 'Ver mi Auth';
}

authToggleBtn?.addEventListener('click', () => {
  if (authBusy) return;
  if (authVisible) { hideAuth(); return; }
  runAuthAction('Leyendo...', () => window.vivet.readAuth());
});

// Al salir del panel "Auth" el Auth se vuelve a ocultar solo.
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.panel !== 'panel-cuenta' && authVisible) hideAuth();
  });
});

// ---------------------------------------------------------------------------
// Mi país (bandera/ubicación que Haxball muestra de vos)
// ---------------------------------------------------------------------------
// Haxball guarda su ubicación en localStorage.geo como {lat, lon, code}. Se
// pisa ese valor en el webview y se recarga el juego. Sin selección
// ("Automático") se borra la clave y Haxball vuelve a detectarla solo.
const COUNTRIES = [
  ['ar', 'Argentina', -34.6, -58.4], ['bo', 'Bolivia', -16.5, -68.1], ['br', 'Brasil', -15.8, -47.9],
  ['cl', 'Chile', -33.4, -70.6], ['co', 'Colombia', 4.7, -74.1], ['cr', 'Costa Rica', 9.9, -84.1],
  ['cu', 'Cuba', 23.1, -82.4], ['do', 'República Dominicana', 18.5, -69.9], ['ec', 'Ecuador', -0.2, -78.5],
  ['sv', 'El Salvador', 13.7, -89.2], ['gt', 'Guatemala', 14.6, -90.5], ['hn', 'Honduras', 14.1, -87.2],
  ['mx', 'México', 19.4, -99.1], ['ni', 'Nicaragua', 12.1, -86.3], ['pa', 'Panamá', 9.0, -79.5],
  ['py', 'Paraguay', -25.3, -57.6], ['pe', 'Perú', -12.0, -77.0], ['pr', 'Puerto Rico', 18.5, -66.1],
  ['uy', 'Uruguay', -34.9, -56.2], ['ve', 'Venezuela', 10.5, -66.9],
  ['es', 'España', 40.4, -3.7], ['pt', 'Portugal', 38.7, -9.1], ['fr', 'Francia', 48.9, 2.35],
  ['de', 'Alemania', 52.5, 13.4], ['it', 'Italia', 41.9, 12.5], ['gb', 'Reino Unido', 51.5, -0.12],
  ['nl', 'Países Bajos', 52.4, 4.9], ['pl', 'Polonia', 52.2, 21.0], ['ro', 'Rumania', 44.4, 26.1],
  ['gr', 'Grecia', 37.98, 23.7], ['tr', 'Turquía', 39.9, 32.9], ['ua', 'Ucrania', 50.45, 30.5],
  ['ru', 'Rusia', 55.75, 37.6], ['us', 'Estados Unidos', 38.9, -77.0], ['ca', 'Canadá', 45.4, -75.7],
  ['ma', 'Marruecos', 34.0, -6.8], ['il', 'Israel', 31.8, 35.2], ['jp', 'Japón', 35.7, 139.7],
  ['kr', 'Corea del Sur', 37.6, 127.0],
];
const countrySelect = $('#country-select');
const countryApplyBtn = $('#country-apply-btn');

function applyGeoInPage(geo) {
  try {
    if (geo) localStorage.setItem('geo', JSON.stringify(geo));
    else localStorage.removeItem('geo');
    return true;
  } catch (e) {
    return false;
  }
}
function geoForCode(code) {
  const c = COUNTRIES.find((x) => x[0] === code);
  return c ? { lat: c[2], lon: c[3], code: c[0] } : null;
}
// Recarga el juego DESDE EL LOBBY. view.reload() vuelve a cargar la URL actual,
// y si esa URL tiene ?c=CODIGO (entraste por link) te vuelve a meter en la sala
// y muestra "Entrando a la sala…" sin que hayas pedido nada. Acá se limpia el
// estado de sala y se carga la URL base.
function reloadGameFresh() {
  currentRoomName = null;
  currentRoomUrl = null;
  gameFrameHint = null;
  if (!replayMode) setPlaying(false);
  updateDiscordPresence(null);
  updateRoomNameBadge(null, null);
  try { view.loadURL(HAXBALL_PLAY_URL); } catch (_) {}
}

async function applyCountryOverride() {
  let code = '';
  try { code = await window.vivet.getConfig('countryCode', ''); } catch (_) {}
  if (!code) return; // Automático: no tocamos nada
  execInAllFrames('(' + applyGeoInPage.toString() + ')(' + JSON.stringify(geoForCode(code)) + ');').catch(() => {});
}

if (countrySelect) {
  countrySelect.innerHTML = '<option value="">Automático (por IP)</option>' +
    COUNTRIES.map((c) => `<option value="${c[0]}">${escapeHtml(c[1])}</option>`).join('');
  window.vivet.getConfig('countryCode', '').then((v) => { countrySelect.value = v || ''; }).catch(() => {});
}
countryApplyBtn?.addEventListener('click', async () => {
  const code = countrySelect?.value || '';
  await window.vivet.setConfig('countryCode', code).catch(() => {});
  try {
    await execInAllFrames('(' + applyGeoInPage.toString() + ')(' + JSON.stringify(geoForCode(code)) + ');');
  } catch (_) {}
  showToast(code ? 'País aplicado, recargando el juego…' : 'País automático, recargando el juego…', 'ok');
  reloadGameFresh();
});

// ---------------------------------------------------------------------------
// Discord Rich Presence - CORREGIDO
// ---------------------------------------------------------------------------

$('#discord-join-btn')?.addEventListener('click', () => {
  window.vivet.openExternal(DISCORD_INVITE_URL);
});

// El panel de Discord se eliminó: si no existe el elemento de estado, se usa
// un objeto suelto para que la conexión de Rich Presence siga funcionando.
const discordStatus = $('#discord-status') || { textContent: '', className: '' };
let discordConnected = false;
let discordRetryTimer = null;

async function connectDiscord() {
  if (!discordStatus) return;
  
  if (!DISCORD_CLIENT_ID) {
    discordStatus.textContent = 'Sin Client ID (configuralo en renderer/config.js)';
    discordStatus.className = 'status';
    return;
  }

  discordStatus.textContent = 'Conectando...';
  discordStatus.className = 'status';
  
  const res = await window.vivet.discordConnect(DISCORD_CLIENT_ID);
  
  if (res.ok) {
    discordConnected = true;
    discordStatus.textContent = 'Conectado';
    discordStatus.className = 'status ok';
    updateDiscordPresence(currentRoomCode(), currentRoomName);
  } else {
    discordConnected = false;
    discordStatus.textContent = 'Error: ' + res.error;
    discordStatus.className = 'status err';
  }

  // CORREGIDO: El timer de reintento ahora se inicializa correctamente de forma segura
  if (!discordRetryTimer) {
    discordRetryTimer = setInterval(() => {
      if (!discordConnected && DISCORD_CLIENT_ID) {
        connectDiscord();
      }
    }, 20000);
  }
}

function updateDiscordPresence(code, roomName) {
  if (!DISCORD_CLIENT_ID) return;
  
  const buttons = [];
  if (DISCORD_INVITE_URL && !DISCORD_INVITE_URL.includes('TU_INVITE_AQUI')) {
    buttons.push({ label: t('Unirse al Discord'), url: DISCORD_INVITE_URL });
  }

  // CORREGIDO (27/09) - esto decidía "Jugando" vs "En el menú" mirando
  // solo `code` (el ?c= de la URL). Pero al entrar a una sala pública
  // haciendo click en la lista (el flujo más común, ver joinByName) Haxball
  // nunca navega la URL - es un SPA - así que `code` se quedaba en null
  // aunque estuvieras jugando de verdad, y el Rich Presence se quedaba
  // trabado en "Buscando sala" para siempre, sin mostrar nunca la sala. El
  // estado real de "estás jugando" ya lo sabe Vivet por su cuenta (la
  // clase .playing en appRoot), así que ahora se usa eso en vez de code.
  const playing = appRoot.classList.contains('playing');
  if (replayMode) {
    window.vivet.discordSetActivity({
      details: t('Viendo un replay'),
      state: t('Reproductor de replays'),
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
    });
    return;
  }
  // MUESTRA EL NOMBRE DE LA SALA EN EL ESTADO
  const label = roomName ? t(`Sala: ${roomName}`) : (code ? t(`Código: ${code}`) : t('Conectando…'));

  window.vivet.discordSetActivity(
    playing ? {
      details: t('Jugando'),
      state: label,
      // Usamos joinedAt para que el tiempo no se reinicie a 00:00 cada vez
      startTimestamp: typeof joinedAt !== 'undefined' && joinedAt ? joinedAt : Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
      buttons: buttons.length ? buttons : undefined,
    } : {
      details: t('En el menú principal'),
      state: t('Buscando sala'),
      startTimestamp: Date.now(),
      largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
      buttons: buttons.length ? buttons : undefined,
    }
  );
}

// ---------------------------------------------------------------------------
// Nombre real de la sala, leído de la propia página (fallback / verificación)
// ---------------------------------------------------------------------------
// El <h1> dentro de .room-view > .container es el título que Haxball
// muestra de la sala en la que estás - lo sabemos porque config.js ya le
// pisa estilos a propósito (".room-view > .container > h1"). Lo usamos
// como fuente de verdad del nombre real, en vez de depender solo de lo que
// Vivet scrapeó de la lista antes de entrar (que puede fallar si entraste
// por una sala fijada sin nombre real, por link directo, o si el host
// cambió el nombre después).
function roomTitleInPage() {
  try {
    var h1 = document.querySelector('.room-view > .container > h1');
    var text = h1 ? (h1.textContent || '').trim() : '';
    return text || null;
  } catch (e) {
    return null;
  }
}
function buildRoomTitleScript() {
  return '(' + roomTitleInPage.toString() + ')();';
}

async function refreshRoomTitleFromPage() {
  if (!appRoot.classList.contains('playing')) return;
  try {
    const results = await execInAllFrames(buildRoomTitleScript());
    const found = results.find((r) => r.ok && r.value);
    if (found && found.value && found.value !== currentRoomName) {
      currentRoomName = found.value;
      updateRoomNameBadge(currentRoomCode(), currentRoomName);
      updateDiscordPresence(currentRoomCode(), currentRoomName);
    }
  } catch (_) {}
}
// Revisión periódica mientras estás jugando, por si el título tarda en
// aparecer o cambia (ej: el host renombra la sala).
setInterval(refreshRoomTitleFromPage, VIVET_PERF.TITLE_REFRESH_INTERVAL_MS);

// Iniciar la conexión inicial
connectDiscord();


// ---------------------------------------------------------------------------
// CSS Personalizado dentro del juego (la ocultación de publicidad vive en optimizations.js)
// ---------------------------------------------------------------------------
function applyCustomGameCssInPage(cssText) {
  try {
    var id = 'vivet-custom-game-css';
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText || '';
    return true;
  } catch (e) {
    return false;
  }
}

function buildCustomGameCssScript(cssText) {
  return '(' + applyCustomGameCssInPage.toString() + ')(' + JSON.stringify(cssText || '') + ');';
}

// Chat expandido (28/09): al enfocar el input del chat se le pone la clase
// vv-chat-open al contenedor (el CSS está en config.js) y se baja el log hasta
// el último mensaje; al soltar el foco se quita. No toca nada más, así el
// comportamiento normal de Haxball al mandar con Enter queda intacto.
// F9 dentro del juego copia al portapapeles el HTML del chat (recortado):
// sirve para ajustar los selectores si Haxball cambia su DOM.
function chatExpandInPage() {
  try {
    if (window.__vivetChatInit) return true;
    window.__vivetChatInit = true;
    var OPEN = 'vv-chat-open';
    var box = function () { return document.querySelector('.chatbox-view-contents'); };
    var isChatInput = function (t) {
      return !!(t && t.tagName === 'INPUT' && t.closest && t.closest('.chatbox-view-contents'));
    };
    function scrollLog(b) {
      for (var i = 0; i < b.children.length; i++) {
        var k = b.children[i];
        if (k.classList.contains('input') || k.classList.contains('autocompletebox')) continue;
        k.scrollTop = k.scrollHeight;
      }
    }
    document.addEventListener('focusin', function (e) {
      if (!isChatInput(e.target)) return;
      var b = box();
      if (!b) return;
      b.classList.add(OPEN);
      if (b.parentElement) b.parentElement.classList.add(OPEN);
      setTimeout(function () { scrollLog(b); }, 60);
    }, true);
    document.addEventListener('focusout', function (e) {
      if (!isChatInput(e.target)) return;
      var b = box();
      if (b) { b.classList.remove(OPEN); if (b.parentElement) b.parentElement.classList.remove(OPEN); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'F9') return;
      var b = box();
      var root = (b && b.parentElement) || b;
      var html = root ? root.cloneNode(true) : null;
      if (html) {
        var ps = html.querySelectorAll('p');
        for (var i = 3; i < ps.length; i++) ps[i].remove();
      }
      var out = html ? html.outerHTML.slice(0, 8000) : 'no se encontro el chat';
      try { navigator.clipboard.writeText(out); } catch (_) {}
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Comandos rápidos del chat: "/ex" + Tab, Espacio o Enter -> "/extrapolation".
// Los atajos se editan en config.js (CHAT_ALIASES). Además, con Tab se completa
// cualquier comienzo único de un comando (ej: "/col" -> "/colors").
function chatAliasesInPage(aliases) {
  try {
    var st = window.__vivetAlias || (window.__vivetAlias = { map: {}, hooked: false });
    st.map = aliases || {};
    if (st.hooked) return true;
    st.hooked = true;
    var COMMANDS = ['avatar', 'clear_avatar', 'clear_bans', 'clear_password', 'colors',
      'extrapolation', 'handicap', 'kick_ratelimit', 'restore', 'set_password', 'store'];
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'INPUT' || !t.closest || !t.closest('.chatbox-view-contents')) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      var k = e.key;
      if (k !== 'Tab' && k !== ' ' && k !== 'Enter') return;
      if (t.selectionStart !== t.value.length) return;
      var m = /^\/([A-Za-z_]+)$/.exec(t.value);
      if (!m) return;
      var word = m[1].toLowerCase(), full = null;
      if (COMMANDS.indexOf(word) < 0) {
        if (Object.prototype.hasOwnProperty.call(st.map, word)) full = st.map[word];
        else if (k === 'Tab') {
          var hits = COMMANDS.filter(function (c) { return c.indexOf(word) === 0; });
          if (hits.length === 1) full = hits[0];
        }
      }
      if (!full) return;
      t.value = '/' + full + (k === 'Enter' ? '' : ' ');
      t.dispatchEvent(new Event('input', { bubbles: true }));
      if (k !== 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    return true;
  } catch (e) {
    return false;
  }
}

function applyCustomGameCssSetting() {
  execInAllFrames('(' + chatExpandInPage.toString() + ')();').catch(() => {});
  const aliases = (typeof CHAT_ALIASES !== 'undefined' && CHAT_ALIASES) ? CHAT_ALIASES : {};
  execInAllFrames('(' + chatAliasesInPage.toString() + ')(' + JSON.stringify(aliases) + ');').catch(() => {});
  execInAllFrames('(' + clientBadgeInPage.toString() + ')(' + JSON.stringify(clientMark()) + ');').catch(() => {});
  if (typeof CUSTOM_GAME_CSS === 'undefined' || !CUSTOM_GAME_CSS || !CUSTOM_GAME_CSS.trim()) return;
  execInAllFrames(buildCustomGameCssScript(CUSTOM_GAME_CSS)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Animación de arranque (28/09): logo + barra, y después el sidebar/paneles
// entran con un fade. Dura mínimo ~1.5 s; si algo demora, se saca igual a los 4 s.
// ---------------------------------------------------------------------------
(function bootSplash() {
  const splash = $('#splash');
  if (!splash) { appRoot.classList.add('intro'); return; }
  const t0 = performance.now();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, 1500 - (performance.now() - t0));
    setTimeout(() => {
      splash.classList.add('hide');
      appRoot.classList.add('intro');
      setTimeout(() => splash.remove(), 700);
    }, wait);
  };
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
  setTimeout(finish, 4000);
})();

// =============================================================================
// 5. MENÚS DESPLEGABLES  (antes: dropdowns.js)
// =============================================================================
// Vivet Client - renderer/dropdowns.js
// Reemplaza la lista nativa que abren los <select> (imposible de estilizar en
// Chromium) por un menú propio. El <select> original NO se toca: sigue siendo
// la fuente de verdad, así que app.js / optimizations.js siguen leyendo
// `.value` y escuchando `change` como siempre. Si el código cambia el valor
// o las opciones por programa (countrySelect.value = ..., innerHTML = ...),
// el botón se sincroniza solo.
// Se carga DESPUÉS de app.js (ver index.html). Estilos: final de style.css.

(() => {
  const CHEVRON =
    '<svg class="dd-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  const CHECK =
    '<svg class="dd-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

  let openState = null; // { close }

  function enhance(sel) {
    if (sel.dataset.dd) return;
    sel.dataset.dd = '1';

    const wrap = document.createElement('div');
    wrap.className = 'dd';
    if (sel.style.width === '100%') wrap.classList.add('dd-block');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('dd-native');
    sel.tabIndex = -1;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    if (sel.title) btn.title = sel.title;
    btn.innerHTML = '<span class="dd-label"></span>' + CHEVRON;
    wrap.appendChild(btn);
    const labelEl = btn.firstElementChild;

    function sync() {
      const o = sel.options[sel.selectedIndex];
      labelEl.textContent = o ? o.textContent : '';
      btn.disabled = sel.disabled;
    }

    // Cambios por programa: `.value = x` no dispara eventos, así que se
    // intercepta el setter en esta instancia.
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); sync(); },
    });
    new MutationObserver(sync).observe(sel, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['disabled'],
    });
    sel.addEventListener('change', sync);
    sync();

    function open() {
      if (openState) openState.close();
      if (btn.disabled) return;

      const menu = document.createElement('div');
      menu.className = 'dd-menu';
      menu.setAttribute('role', 'listbox');
      const items = [];
      [...sel.options].forEach((o, i) => {
        if (o.hidden) return;
        const it = document.createElement('div');
        it.className = 'dd-item' + (o.disabled ? ' disabled' : '') + (i === sel.selectedIndex ? ' selected' : '');
        it.setAttribute('role', 'option');
        it.dataset.i = String(i);
        it.innerHTML = '<span class="dd-item-text"></span>' + CHECK;
        it.firstElementChild.textContent = o.textContent;
        menu.appendChild(it);
        if (!o.disabled) items.push(it);
      });
      if (!items.length) return;
      document.body.appendChild(menu);

      // Posición: debajo del botón, o arriba si no hay lugar.
      const r = btn.getBoundingClientRect();
      const gap = 6, margin = 12;
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const up = below < 180 && above > below;
      const maxH = Math.max(120, Math.min(320, (up ? above : below) - gap));
      menu.style.minWidth = r.width + 'px';
      menu.style.maxHeight = maxH + 'px';
      menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - margin) + 'px';
      menu.style.left = Math.max(margin, parseFloat(menu.style.left)) + 'px';
      if (up) menu.style.bottom = (window.innerHeight - r.top + gap) + 'px';
      else menu.style.top = (r.bottom + gap) + 'px';
      menu.classList.toggle('up', up);

      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.add('open');

      let active = Math.max(0, items.findIndex((it) => it.classList.contains('selected')));
      function setActive(n, scroll = true) {
        active = (n + items.length) % items.length;
        items.forEach((it, k) => it.classList.toggle('active', k === active));
        if (scroll) items[active].scrollIntoView({ block: 'nearest' });
      }
      setActive(active);

      function choose(it) {
        const idx = Number(it.dataset.i);
        const changed = idx !== sel.selectedIndex;
        sel.selectedIndex = idx;
        sync();
        close();
        btn.focus();
        if (changed) {
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      let typed = '', typedT = null;
      function onKey(e) {
        switch (e.key) {
          case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
          case 'ArrowUp': e.preventDefault(); setActive(active - 1); break;
          case 'Home': e.preventDefault(); setActive(0); break;
          case 'End': e.preventDefault(); setActive(items.length - 1); break;
          case 'Enter': case ' ': e.preventDefault(); choose(items[active]); break;
          case 'Escape': e.preventDefault(); close(); btn.focus(); break;
          case 'Tab': close(); break;
          default:
            // Escribir para saltar a una opción (útil en la lista de países).
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              typed += e.key.toLowerCase();
              clearTimeout(typedT); typedT = setTimeout(() => { typed = ''; }, 700);
              const hit = items.findIndex((it) => it.textContent.trim().toLowerCase().startsWith(typed));
              if (hit >= 0) setActive(hit);
            }
        }
      }
      const onDown = (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); };
      const onScroll = (e) => { if (!menu.contains(e.target)) close(); };
      menu.addEventListener('click', (e) => {
        const it = e.target.closest('.dd-item');
        if (it && !it.classList.contains('disabled')) choose(it);
      });
      menu.addEventListener('mousemove', (e) => {
        const it = e.target.closest('.dd-item');
        const k = it ? items.indexOf(it) : -1;
        if (k >= 0 && k !== active) setActive(k, false);
      });
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onDown, true);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', close);
      window.addEventListener('blur', close);

      function close() {
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', close);
        window.removeEventListener('blur', close);
        clearTimeout(typedT);
        menu.remove();
        btn.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('open');
        if (openState && openState.close === close) openState = null;
      }
      openState = { close };
    }

    btn.addEventListener('click', () => (wrap.classList.contains('open') ? openState?.close() : open()));
    btn.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
  }

  document.querySelectorAll('select').forEach(enhance);
})();

// =============================================================================
// 6. REPLAYS  (antes: replays.js)
// =============================================================================
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


// =============================================================================
// 7. AMIGOS Y SESIÓN  (antes: friends.js)
// =============================================================================
// Vivet Client - renderer/friends.js
// Perfil + amigos + presencia + bloqueos. Habla con el servidor propio
// (FRIENDS_API_URL, ver config.js y server/README.md); el cliente NUNCA
// tiene credenciales de la base de datos, solo un token de sesión.
// Se carga DESPUÉS de app.js: usa sus globales (appRoot, view, joinByUrl,
// currentRoomCode, currentRoomName, replayMode, escapeHtml, showToast...).

(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  const ROOM_CODE = /^[A-Za-z0-9_-]{6,64}$/;
  const HEARTBEAT_MS = 15000;
  const REFRESH_MS = 10000;

  let token = null;
  let me = null;
  let data = { friends: [], incoming: [], outgoing: [], blocked: [] };
  let loginTimer = null;

  const setStatus = (t) => { const el = $('#fr-status'); if (el) el.textContent = t || ''; };
  const panelActive = () => $('#panel-amigos')?.classList.contains('active');

  async function api(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.status === 401 && token) await clearSession();
    if (!res.ok) throw new Error((json && json.error) || `Error ${res.status}`);
    return json;
  }
  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) showToast(okMsg, 'ok'); await refresh(); }
    catch (e) { showToast(e.message || 'No se pudo completar la acción'); }
  };

  // ------------------------------------------------------------ sesión
  async function clearSession() {
    token = null; me = null;
    data = { friends: [], incoming: [], outgoing: [], blocked: [] };
    try { await window.vivet.setConfig('friendsToken', ''); } catch (_) {}
    render();
    window.dispatchEvent(new Event('vivet-session-changed'));
  }

  async function startLogin() {
    if (!API) return;
    const state = crypto.randomUUID();
    const btn = $('#fr-login-btn');
    btn.disabled = true;
    setStatus('Esperando confirmación en el navegador…');
    window.vivet.openExternal(`${API}/auth/start?state=${state}`);
    clearInterval(loginTimer);
    const until = Date.now() + 3 * 60 * 1000;
    loginTimer = setInterval(async () => {
      if (Date.now() > until) {
        clearInterval(loginTimer); btn.disabled = false;
        return setStatus('Se agotó el tiempo. Probá de nuevo.');
      }
      try {
        const r = await (await fetch(`${API}/auth/poll?state=${state}`)).json();
        if (!r.token) return;
        clearInterval(loginTimer);
        token = r.token;
        await window.vivet.setConfig('friendsToken', token);
        btn.disabled = false;
        setStatus('');
        await loadMe();
        showToast('Discord vinculado', 'ok');
      } catch (_) {}
    }, 2000);
  }

  async function loadMe() {
    me = await api('GET', '/me');
    // Un solo nick para todo. Si el local sigue siendo el "JugadorXXXX" por
    // defecto y el servidor ya tiene uno, se adopta el del servidor; si no,
    // el local manda y se sube al servidor.
    if (typeof currentNickname === 'string' && currentNickname) {
      if (me.haxball_nick && /^Jugador\d{4}$/.test(currentNickname) && typeof applyNickname === 'function') {
        await applyNickname(me.haxball_nick, { announce: false });
      } else if (me.haxball_nick !== currentNickname) {
        try { me = await api('PATCH', '/me', { haxball_nick: currentNickname }); } catch (_) {}
      }
    }
    render();
    window.dispatchEvent(new Event('vivet-session-changed'));
    await refresh();
    heartbeat();
  }

  // ------------------------------------------------------------ datos
  async function refresh() {
    if (!token) return;
    try { data = await api('GET', '/friends'); } catch (_) { return; }
    renderLists();
    window.dispatchEvent(new Event('vivet-friends-updated')); // chat.js
    const n = data.incoming.length;
    const badge = $('#fr-badge');
    if (badge) { badge.hidden = n === 0; badge.textContent = String(n); }
  }

  // Haxball es un SPA: al entrar a una sala desde la lista la URL NO cambia.
  // Por eso view.getURL() y la URL de los frames pueden quedarse con el código
  // de una sala ANTERIOR (p. ej. entraste por un link y después por la lista).
  // Mandar ese código hace que al amigo le salga "Room closed". Así que solo
  // se confía en el link con el que se entró (currentRoomUrl, guardado por
  // joinByUrl). Si no hay, no se manda código y el amigo ve "Buscar sala",
  // que entra por nombre.
  const codeFrom = (u) => { try { return new URL(u).searchParams.get('c'); } catch (_) { return null; } };
  let cachedCode = null, cachedFor = null;
  async function resolveRoomCode() {
    const key = `${joinedAt}|${currentRoomUrl || ''}`;
    if (cachedFor !== key) { cachedCode = null; cachedFor = key; }
    if (cachedCode) return cachedCode;
    const c = codeFrom(currentRoomUrl);
    if (c && ROOM_CODE.test(c)) cachedCode = c;
    return cachedCode;
  }

  async function heartbeat() {
    if (!token) return;
    const playing = appRoot.classList.contains('playing') && !replayMode && !creatingRoom;
    let code = null, name = null;
    if (playing) {
      code = await resolveRoomCode();
      name = currentRoomName || null;
    } else { cachedCode = null; cachedFor = null; }
    try { await api('POST', '/presence', { code, name }); } catch (_) {}
  }

  // ------------------------------------------------------------ UI
  const avatar = (u) => `<img class="fr-avatar" alt="" src="${escapeHtml(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;
  const display = (u) => escapeHtml(u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);

  function friendRow(f) {
    const inRoom = !!f.room;
    const canJoin = inRoom && (f.room.code || f.room.name);
    const sub = inRoom
      ? `<span class="fr-dot in-room"></span>Jugando en ${escapeHtml(f.room.name || 'una sala')}`
      : f.online ? '<span class="fr-dot online"></span>En línea' : '<span class="fr-dot"></span>Desconectado';
    const joinBtn = canJoin
      ? `<button class="primary-btn" data-act="join" data-code="${escapeHtml(f.room.code || '')}" data-name="${escapeHtml(f.room.name || '')}">${f.room.code ? 'Unirme' : 'Buscar sala'}</button>`
      : '';
    return `<div class="fr-row ${inRoom ? 'fr-row-live' : ''}">${avatar(f)}
      <div class="fr-row-info"><div class="fr-row-name">${display(f)}</div><div class="fr-row-sub ${inRoom ? 'in-room' : ''}">${sub}</div></div>
      <div class="fr-actions">
        ${joinBtn}
        <button class="ghost-btn secondary-action" data-act="remove" data-id="${f.id}">Quitar</button>
        <button class="ghost-btn secondary-action" data-act="block" data-id="${f.id}">Bloquear</button>
      </div></div>`;
  }
  function simpleRow(u, buttons) {
    return `<div class="fr-row">${avatar(u)}<div class="fr-row-info"><div class="fr-row-name">${display(u)}</div></div><div class="fr-actions">${buttons}</div></div>`;
  }

  function renderLists() {
    const box = $('#fr-lists');
    if (!box) return;
    const rank = (f) => (f.room ? 0 : f.online ? 1 : 2);
    const friends = data.friends.slice().sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username));
    const sect = (title, rows, empty) =>
      `<div class="fr-section-title">${title}</div>` + (rows.length ? rows.join('') : (empty ? `<p class="hint fr-empty">${empty}</p>` : ''));
    let html = sect(`Amigos (${friends.length})`, friends.map(friendRow), 'Todavía no tenés amigos agregados. Compartí tu código.');
    if (data.incoming.length) html += sect('Solicitudes recibidas', data.incoming.map((u) => simpleRow(u,
      `<button class="primary-btn" data-act="accept" data-id="${u.id}">Aceptar</button>
       <button class="ghost-btn secondary-action" data-act="decline" data-id="${u.id}">Rechazar</button>
       <button class="ghost-btn secondary-action" data-act="block" data-id="${u.id}">Bloquear</button>`)));
    if (data.outgoing.length) html += sect('Solicitudes enviadas', data.outgoing.map((u) => simpleRow(u,
      `<button class="ghost-btn secondary-action" data-act="remove" data-id="${u.id}">Cancelar</button>`)));
    if (data.blocked.length) html += sect('Bloqueados', data.blocked.map((u) => simpleRow(u,
      `<button class="ghost-btn secondary-action" data-act="unblock" data-id="${u.id}">Desbloquear</button>`)));
    box.innerHTML = html;
  }

  function render() {
    const login = $('#fr-login'), main = $('#fr-main');
    if (!API) {
      login.hidden = false; main.hidden = true;
      $('#fr-login-btn').hidden = true;
      $('#fr-login-text').textContent = 'La sección Amigos todavía no está configurada: falta FRIENDS_API_URL en config.js (ver server/README.md).';
      return;
    }
    $('#fr-login-btn').hidden = false;
    login.hidden = !!me; main.hidden = !me;
    if (!me) return;
    $('#fr-avatar').src = me.avatar_url || '';
    $('#fr-name').textContent = me.username;
    $('#fr-code').textContent = me.friend_code;
    $('#fr-invisible').checked = !!me.invisible;
    renderLists();
  }

  // ------------------------------------------------------------ eventos
  $('#fr-login-btn')?.addEventListener('click', startLogin);
  $('#fr-logout-btn')?.addEventListener('click', () => act(async () => { await api('POST', '/logout').catch(() => {}); await clearSession(); }));
  $('#fr-copy-code')?.addEventListener('click', () => me && copyToClipboard(me.friend_code, 'Código copiado'));
  // Cuando se guarda el nick en Social, se sube al servidor si hay sesión.
  window.addEventListener('vivet-nick-changed', async (e) => {
    if (!token || !me) return;
    try { me = await api('PATCH', '/me', { haxball_nick: e.detail }); await refresh(); }
    catch (err) { showToast('El nick se guardó local, pero no se pudo subir: ' + (err.message || 'error')); }
  });
  $('#fr-invisible')?.addEventListener('change', (e) =>
    act(async () => { me = await api('PATCH', '/me', { invisible: e.target.checked }); }));
  const addFriend = () => {
    const input = $('#fr-add-input');
    const query = input.value.trim();
    if (!query) return;
    act(async () => {
      const r = await api('POST', '/friends/request', { query });
      input.value = '';
      showToast(r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
    });
  };
  $('#fr-add-btn')?.addEventListener('click', addFriend);
  $('#fr-add-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFriend(); });

  $('#fr-lists')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    switch (b.dataset.act) {
      case 'join': {
        const { code, name } = b.dataset;
        if (appRoot.classList.contains('playing')) { showToast('Salí de tu sala actual para unirte a la de tu amigo'); break; }
        if (code && ROOM_CODE.test(code)) joinByUrl(`https://www.haxball.com/play?c=${encodeURIComponent(code)}`, name || null);
        else if (name) { showToast('Buscando la sala de tu amigo…', 'ok'); joinByName(name, null); }
        break;
      }
      case 'accept': act(() => api('POST', '/friends/respond', { id, accept: true }), 'Solicitud aceptada'); break;
      case 'decline': act(() => api('POST', '/friends/respond', { id, accept: false })); break;
      case 'remove': act(() => api('DELETE', `/friends/${id}`)); break;
      case 'block':
        if (window.confirm('¿Bloquear a este usuario? Se elimina la amistad y no podrá volver a enviarte solicitudes ni ver dónde jugás.'))
          act(() => api('POST', '/block', { id }), 'Usuario bloqueado');
        break;
      case 'unblock': act(() => api('DELETE', `/block/${id}`), 'Usuario desbloqueado'); break;
    }
  });

  document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.addEventListener('click', refresh);
  setInterval(() => { if (token) heartbeat(); }, HEARTBEAT_MS);
  setInterval(() => { if (token && panelActive()) refresh(); }, REFRESH_MS);
  // Al entrar/salir de una sala se avisa enseguida (con un respiro para que
  // el nombre y el link de la sala ya estén disponibles).
  let hbTimer = null;
  new MutationObserver(() => {
    clearTimeout(hbTimer);
    hbTimer = setTimeout(heartbeat, 2500);
  }).observe(appRoot, { attributes: true, attributeFilter: ['class'] });


  // Para otros módulos (competitive.js): misma sesión, sin exponer el token.
  window.vivetApi = { configured: !!API, request: api, loggedIn: () => !!(token && me), me: () => me, friends: () => data };

  // ------------------------------------------------------------ arranque
  render();
  (async () => {
    if (!API) return;
    try { token = (await window.vivet.getConfig('friendsToken', '')) || null; } catch (_) {}
    if (token) { try { await loadMe(); } catch (_) {} }
  })();
})();

// =============================================================================
// 8. COMPETITIVO  (antes: competitive.js)
// =============================================================================
// Vivet Client - renderer/competitive.js
// Competitivo: XP por tiempo jugado, rangos (desde la DB) y top de jugadores.
// - 1 XP por minuto jugado en una sala (no cuenta replays ni "creando sala").
// - Inactividad: pasado un período de gracia, el XP baja por día. Con sesión
//   lo aplica el servidor; sin sesión se aplica localmente con la misma regla.
// - Los rangos y los parámetros de decaimiento vienen de GET /competitive/ranks
//   (con caché local y valores por defecto si el servidor no responde).
// Se carga DESPUÉS de app.js y friends.js. Usa globales de app.js: appRoot,
// replayMode, creatingRoom, escapeHtml.

(() => {
  const EP_TICK = '/competitive/tick';        // POST { seconds } -> { seconds, last_played_at }
  const EP_ME = '/competitive/me';            // GET -> { seconds, last_played_at }
  const EP_TOP = '/competitive/leaderboard';  // GET -> { top: [...] }
  const EP_RANKS = '/competitive/ranks';      // GET -> { ranks: [{id,name,xp,color}], decay: {grace_days, xp_per_day} }

  const DEFAULT_RANKS = [
    { id: 'bronce',   name: 'Bronce',   xp: 0,     color: '#cd7f32' },
    { id: 'plata',    name: 'Plata',    xp: 300,   color: '#c0c8d4' },
    { id: 'oro',      name: 'Oro',      xp: 900,   color: '#f5b74b' },
    { id: 'platino',  name: 'Platino',  xp: 2000,  color: '#4fd1c5' },
    { id: 'diamante', name: 'Diamante', xp: 4000,  color: '#5eb5ff' },
    { id: 'maestro',  name: 'Maestro',  xp: 8000,  color: '#a78bfa' },
    { id: 'leyenda',  name: 'Leyenda',  xp: 15000, color: '#ff5470' },
  ];
  let RANKS = DEFAULT_RANKS.slice();
  // Mismos valores por defecto que el servidor (tabla comp_config).
  let DECAY = { graceDays: 7, xpPerDay: 15 };
  const DAY_MS = 86400000;

  const TICK_MS = 5000;
  const SAVE_MS = 30000;
  const SYNC_MS = 60000;
  const TOP_REFRESH_MS = 30000;
  const DECAY_CHECK_MS = 60 * 60 * 1000;

  const $ = (s) => document.querySelector(s);
  let seconds = 0;          // tiempo local (se usa sin sesión)
  let dirty = false;
  let serverSeconds = null; // total en el servidor (con sesión)
  let serverLast = null;    // último momento jugado según el servidor (ms)
  let localLast = 0;        // último momento jugado local (ms)
  let localDecayedAt = 0;   // hasta cuándo se aplicó el decaimiento local (ms)
  let pending = 0;          // segundos jugados todavía no enviados
  let sending = false;
  let top = null; // null = sin cargar, [] = vacío, 'error' = falló
  let topError = '';

  const loggedIn = () => !!(window.vivetApi && window.vivetApi.loggedIn());
  const curSeconds = () => (loggedIn() && serverSeconds != null ? serverSeconds + pending : seconds);
  const xpOf = (s) => Math.floor(s / 60);
  function rankOf(xp) {
    let r = RANKS[0];
    for (const k of RANKS) if (xp >= k.xp) r = k;
    return r;
  }
  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  };
  const panelActive = () => $('#panel-competitivo')?.classList.contains('active');
  const esc = (t) => (typeof escapeHtml === 'function' ? escapeHtml(String(t ?? '')) : String(t ?? ''));
  const toMs = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : null; };

  // ------------------------------------------------------------ rangos (DB)
  function setRanks(list) {
    if (!Array.isArray(list)) return false;
    const ok = list
      .filter((r) => r && r.name && Number.isFinite(Number(r.xp)) && /^#[0-9a-f]{6}$/i.test(r.color || ''))
      .map((r) => ({ id: String(r.id || r.name), name: String(r.name), xp: Number(r.xp), color: r.color }))
      .sort((a, b) => a.xp - b.xp);
    if (ok.length < 2 || ok[0].xp !== 0) return false; // tiene que existir un rango base con 0 XP
    RANKS = ok;
    return true;
  }
  function setDecay(d) {
    if (!d) return;
    const g = Number(d.grace_days ?? d.graceDays);
    const x = Number(d.xp_per_day ?? d.xpPerDay);
    if (Number.isFinite(g) && g >= 0) DECAY.graceDays = g;
    if (Number.isFinite(x) && x >= 0) DECAY.xpPerDay = x;
  }
  async function loadRanks() {
    const api = window.vivetApi;
    if (!api || !api.configured) return;
    try {
      const r = await api.request('GET', EP_RANKS);
      if (setRanks(r && r.ranks)) {
        setDecay(r.decay);
        try { window.vivet.setConfig('compRanks', { ranks: RANKS, decay: DECAY }); } catch (_) {}
        renderAll();
      }
    } catch (_) { /* se queda con la caché / valores por defecto */ }
  }

  // ------------------------------------------------------------ decaimiento local
  // Misma regla que el servidor: pasado el período de gracia desde la última
  // vez que jugaste, se descuentan xpPerDay por cada día completo.
  function applyLocalDecay() {
    if (loggedIn() || !localLast || seconds <= 0) return;
    const from = Math.max(localLast + DECAY.graceDays * DAY_MS, localDecayedAt);
    const days = Math.floor((Date.now() - from) / DAY_MS);
    if (days < 1) return;
    seconds = Math.max(0, seconds - days * DECAY.xpPerDay * 60);
    localDecayedAt = from + days * DAY_MS;
    dirty = true;
    try { window.vivet.setConfig('compDecayedAt', localDecayedAt); } catch (_) {}
  }

  function badgeSvg(color) {
    return `<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M12 7l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 15.2 8.8 16.9l.6-3.6-2.6-2.5 3.6-.5L12 7z" fill="${color}"/>
    </svg>`;
  }

  // ------------------------------------------------------------ render
  function renderDecay() {
    let el = $('#comp-decay');
    if (!el) {
      const anchor = $('#comp-next');
      if (!anchor) return;
      el = document.createElement('p');
      el.id = 'comp-decay';
      el.className = 'hint';
      anchor.insertAdjacentElement('afterend', el);
    }
    const last = loggedIn() && serverLast ? serverLast : localLast;
    if (!last || curSeconds() <= 0 || DECAY.xpPerDay <= 0) { el.hidden = true; return; }
    const idle = (Date.now() - last) / DAY_MS;
    const left = Math.ceil(DECAY.graceDays - idle);
    if (left > 2) { el.hidden = true; return; }
    el.hidden = false;
    if (left > 0) {
      el.textContent = `Jugá pronto: tu XP empieza a bajar en ${left} ${left === 1 ? 'día' : 'días'} si no entrás a una sala.`;
      el.style.color = '';
    } else {
      el.textContent = `Por inactividad perdés ${DECAY.xpPerDay} XP por día. Jugá para frenarlo.`;
      el.style.color = 'var(--danger, #ff5470)';
    }
  }

  function renderMe() {
    const cur = curSeconds();
    const xp = xpOf(cur);
    const rank = rankOf(xp);
    const idx = RANKS.indexOf(rank);
    const next = RANKS[idx + 1];

    const badge = $('#comp-rank-badge');
    if (badge) { badge.innerHTML = badgeSvg(rank.color); badge.style.borderColor = rank.color; }
    const name = $('#comp-rank-name');
    if (name) { name.textContent = rank.name; name.style.color = rank.color; }
    const xpEl = $('#comp-xp'); if (xpEl) xpEl.textContent = `${xp} XP`;
    const timeEl = $('#comp-time'); if (timeEl) timeEl.textContent = fmtTime(cur);

    const bar = $('#comp-bar');
    const nextEl = $('#comp-next');
    if (bar) {
      const pct = next ? ((xp - rank.xp) / (next.xp - rank.xp)) * 100 : 100;
      bar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
      bar.style.background = rank.color;
    }
    if (nextEl) {
      nextEl.textContent = next
        ? `${next.xp - xp} XP para ${next.name}`
        : 'Rango máximo alcanzado';
    }
    const note = $('#comp-login-note');
    if (note) note.hidden = loggedIn();
    renderDecay();
  }

  function renderLadder() {
    const box = $('#comp-ladder');
    if (!box) return;
    const xp = xpOf(curSeconds());
    const cur = rankOf(xp);
    box.innerHTML = RANKS.map((r) => {
      const cls = r === cur ? 'current' : xp >= r.xp ? 'done' : '';
      return `<div class="rk-step ${cls}" style="--rk:${r.color}">
        ${badgeSvg(r.color).replace('width="44" height="44"', 'width="22" height="22"')}
        <div><div class="rk-step-name">${esc(r.name)}</div><div class="rk-step-xp">${r.xp} XP</div></div>
      </div>`;
    }).join('');
  }

  function renderTop() {
    const box = $('#comp-lb');
    if (!box) return;
    if (!window.vivetApi || !window.vivetApi.configured) {
      box.innerHTML = '<p class="hint fr-empty">El top no está disponible: falta configurar FRIENDS_API_URL en config.js.</p>';
      return;
    }
    if (top === null) { box.innerHTML = '<p class="hint fr-empty">Cargando…</p>'; return; }
    if (top === 'error') { box.innerHTML = `<p class="hint fr-empty">No se pudo cargar el top (${esc(topError)}). Revisá que el servidor tenga la ruta ${esc(EP_TOP)}.</p>`; return; }
    if (!top.length) { box.innerHTML = '<p class="hint fr-empty">Todavía no hay jugadores en el top.</p>'; return; }
    const myId = window.vivetApi.me()?.id;
    box.innerHTML = top.slice(0, 50).map((u, i) => {
      const s = Number(u.seconds ?? (u.minutes != null ? u.minutes * 60 : (u.xp || 0) * 60)) || 0;
      const r = rankOf(xpOf(s));
      const who = u.haxball_nick ? `${u.haxball_nick} (${u.username})` : (u.username || '?');
      const cls = `fr-row ${i < 3 ? 'comp-top' + (i + 1) : ''} ${myId != null && u.id === myId ? 'comp-me' : ''}`;
      return `<div class="${cls}">
        <div class="comp-pos">${i + 1}</div>
        <img class="fr-avatar" alt="" src="${esc(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />
        <div class="fr-row-info"><div class="fr-row-name">${esc(who)}</div>
          <div class="fr-row-sub" style="color:${r.color}">${esc(r.name)} · ${xpOf(s)} XP</div></div>
        <div class="comp-time">${fmtTime(s)}</div>
      </div>`;
    }).join('');
  }

  function renderAll() { renderMe(); renderLadder(); renderTop(); }

  // ------------------------------------------------------------ datos
  async function save() {
    if (!dirty) return;
    dirty = false;
    try {
      await window.vivet.setConfig('compSeconds', seconds);
      await window.vivet.setConfig('compLastPlayed', localLast);
    } catch (_) { dirty = true; }
  }

  function takeServer(r) {
    const v = Number(r && r.seconds);
    if (Number.isFinite(v)) serverSeconds = v;
    const l = toMs(r && r.last_played_at);
    if (l) serverLast = l;
  }

  // Trae el total del servidor (al iniciar sesión / abrir el panel).
  async function pull() {
    if (!loggedIn()) { serverSeconds = null; serverLast = null; return; }
    try { takeServer(await window.vivetApi.request('GET', EP_ME)); } catch (_) {}
    renderAll();
  }

  // Envía el tiempo jugado. El servidor decide cuánto acredita (solo si estás
  // en una sala y con tope según el tiempo real), así que lo enviado se descarta
  // de `pending` y el total se toma de su respuesta.
  async function sync() {
    if (sending || !loggedIn()) return;
    const n = Math.floor(Math.min(pending, 600));
    if (n < 1) return;
    sending = true;
    try {
      const r = await window.vivetApi.request('POST', EP_TICK, { seconds: n });
      pending = Math.max(0, pending - n);
      takeServer(r);
      if (panelActive()) renderAll(); // con otro panel abierto no hay nada que redibujar
    } catch (_) { /* se reintenta en el próximo ciclo */ }
    finally { sending = false; }
  }

  async function loadTop() {
    const api = window.vivetApi;
    if (!api || !api.configured) { renderTop(); return; }
    try {
      const r = await api.request('GET', EP_TOP);
      top = Array.isArray(r) ? r : (r && Array.isArray(r.top) ? r.top : []);
    } catch (e) { top = 'error'; topError = (e && e.message) || 'error'; console.warn('[competitivo] top:', EP_TOP, e); }
    renderTop();
  }

  // ------------------------------------------------------------ tiempo jugado
  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(30, (now - lastTick) / 1000); // tope por si la PC se durmió
    lastTick = now;
    let playing = false;
    try { playing = appRoot.classList.contains('playing') && !replayMode && !creatingRoom; } catch (_) {}
    if (!playing) return;
    seconds += dt;
    pending += dt;
    localLast = now;
    if (loggedIn()) serverLast = now;
    dirty = true;
    if (panelActive()) renderMe();
  }, TICK_MS);

  setInterval(save, SAVE_MS);
  setInterval(sync, SYNC_MS);
  setInterval(() => { applyLocalDecay(); if (panelActive()) renderMe(); }, DECAY_CHECK_MS);
  setInterval(() => { if (panelActive()) loadTop(); }, TOP_REFRESH_MS);
  window.addEventListener('beforeunload', () => {
    try {
      window.vivet.setConfig('compSeconds', seconds);
      window.vivet.setConfig('compLastPlayed', localLast);
    } catch (_) {}
  });
  window.addEventListener('vivet-session-changed', async () => { pending = 0; serverSeconds = null; serverLast = null; renderAll(); await pull(); loadRanks(); loadTop(); });
  document.querySelector('.nav-btn[data-panel="panel-competitivo"]')?.addEventListener('click', () => {
    applyLocalDecay(); renderAll(); sync().then(pull); loadRanks(); loadTop();
  });

  // ------------------------------------------------------------ arranque
  renderAll();
  (async () => {
    try {
      const cache = await window.vivet.getConfig('compRanks', null);
      if (cache && setRanks(cache.ranks)) setDecay(cache.decay);
      const v = Number(await window.vivet.getConfig('compSeconds', 0));
      if (Number.isFinite(v) && v > seconds) seconds = v;
      const lp = Number(await window.vivet.getConfig('compLastPlayed', 0));
      if (Number.isFinite(lp) && lp > localLast) localLast = lp;
      // Usuario que ya tenía XP y nunca guardó última vez: se cuenta desde hoy (no se le castiga retroactivamente).
      if (!localLast && seconds > 0) { localLast = Date.now(); dirty = true; }
      const da = Number(await window.vivet.getConfig('compDecayedAt', 0));
      if (Number.isFinite(da)) localDecayedAt = da;
    } catch (_) {}
    applyLocalDecay();
    renderAll();
    loadRanks();
    // friends.js carga la sesión de forma asíncrona: se espera a que esté lista.
    for (let i = 0; i < 20 && !loggedIn(); i++) await new Promise((r) => setTimeout(r, 1000));
    pull();
  })();
})();

// =============================================================================
// 9. FOTO DE PERFIL  (antes: avatar.js)
// =============================================================================
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

// =============================================================================
// 10. FOTOS DE OTROS JUGADORES  (antes: peers.js)
// =============================================================================
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

// =============================================================================
// 11. RESOLUCIÓN  (antes: resolution.js)
// =============================================================================
// Vivet Client - renderer/resolution.js
// Resolución del juego (px). El <webview> pasa a medir W x H "lógicos" y se
// escala con CSS para llenar la ventana (estirado, como la resolución
// estirada de los shooters) o para entrar con su proporción (con barras).
// Solo se aplica mientras jugás (.app.playing); en los paneles no cambia nada.
// Estilos: final de style.css (.custom-res). Se carga DESPUÉS de app.js.

(() => {
  const $ = (s) => document.querySelector(s);
  const wrap = $('#game-wrap');
  const appRoot = $('#app-root');
  if (!wrap || !appRoot) return;

  const MIN = 320, MAX = 7680;
  let res = null; // { w, h, stretch } | null = nativa

  const inputW = $('#res-w'), inputH = $('#res-h'), stretchEl = $('#res-stretch');
  const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };

  function layout() {
    if (!res) { wrap.classList.remove('custom-res'); return; }
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    let sx = W / res.w, sy = H / res.h, tx = 0, ty = 0;
    if (!res.stretch) {
      const s = Math.min(sx, sy);
      sx = sy = s;
      tx = (W - res.w * s) / 2;
      ty = (H - res.h * s) / 2;
    }
    const st = wrap.style;
    st.setProperty('--gv-w', res.w + 'px');
    st.setProperty('--gv-h', res.h + 'px');
    st.setProperty('--gv-sx', sx.toFixed(5));
    st.setProperty('--gv-sy', sy.toFixed(5));
    st.setProperty('--gv-tx', tx.toFixed(2) + 'px');
    st.setProperty('--gv-ty', ty.toFixed(2) + 'px');
    wrap.classList.add('custom-res');
  }

  function markPreset() {
    document.querySelectorAll('.res-chip').forEach((b) => {
      b.classList.toggle('active', !!res && Number(b.dataset.w) === res.w && Number(b.dataset.h) === res.h);
    });
  }

  function syncUI() {
    markPreset();
    const cw = Math.round(wrap.clientWidth), ch = Math.round(wrap.clientHeight);
    if (inputW) { inputW.value = res ? res.w : ''; inputW.placeholder = String(cw || 1920); }
    if (inputH) { inputH.value = res ? res.h : ''; inputH.placeholder = String(ch || 1080); }
    if (stretchEl) stretchEl.checked = res ? !!res.stretch : true;
  }

  async function save() {
    try { await window.vivet.setConfig('gameRes', res || ''); } catch (_) {}
  }

  function apply() {
    const w = Math.round(Number(inputW && inputW.value));
    const h = Math.round(Number(inputH && inputH.value));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < MIN || h < MIN || w > MAX || h > MAX) {
      return toast(`Usá valores entre ${MIN} y ${MAX} px`);
    }
    res = { w, h, stretch: stretchEl ? stretchEl.checked : true };
    layout(); syncUI(); save();
    toast(`Resolución ${w} × ${h} aplicada`, 'ok');
  }

  function restore() {
    res = null;
    layout(); syncUI(); save();
    toast('Resolución restaurada', 'ok');
  }

  document.querySelectorAll('.res-chip').forEach((b) => b.addEventListener('click', () => {
    if (inputW) inputW.value = b.dataset.w;
    if (inputH) inputH.value = b.dataset.h;
    apply();
  }));
  $('#res-apply-btn')?.addEventListener('click', apply);
  $('#res-reset-btn')?.addEventListener('click', restore);
  [inputW, inputH].forEach((el) => el?.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); }));
  stretchEl?.addEventListener('change', () => { if (res) { res.stretch = stretchEl.checked; layout(); save(); } });

  // Re-calcula al cambiar el tamaño de la ventana y al entrar/salir de jugar.
  try { new ResizeObserver(layout).observe(wrap); } catch (_) { window.addEventListener('resize', layout); }
  new MutationObserver(layout).observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  (async () => {
    try {
      const r = await window.vivet.getConfig('gameRes', '');
      if (r && Number.isFinite(r.w) && Number.isFinite(r.h) && r.w >= MIN && r.h >= MIN) {
        res = { w: Math.round(r.w), h: Math.round(r.h), stretch: r.stretch !== false };
      }
    } catch (_) {}
    layout(); syncUI();
  })();
})();

// =============================================================================
// 12. MODO STREAMER  (antes: streamer.js)
// =============================================================================
// Vivet Client - renderer/streamer.js
// Modo streamer: oculta datos personales para transmitir sin filtrar nada.
//  - Difumina: código de amigo, usuario de Discord, avatar, lista de amigos,
//    nickname, campo de agregar amigo y el Auth.
//  - Oculta el nombre de la sala y el botón "Copiar link de la sala".
//  - Discord Rich Presence genérico (sin nombre/código de sala).
// Atajo: Ctrl+Shift+S. Se guarda en la config ('streamerMode').
// Se carga DESPUÉS de app.js (envuelve updateDiscordPresence).

(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const toggle = $('#streamer-toggle');
  let on = false;

  // Presence genérico: nunca sale el nombre ni el código de la sala.
  const tr = (x) => (typeof t === 'function' ? t(x) : x);
  const original = (typeof updateDiscordPresence === 'function') ? updateDiscordPresence : null;
  if (original) {
    updateDiscordPresence = function (code, roomName) {
      if (!on) return original.apply(this, arguments);
      try {
        const playing = $('#app-root')?.classList.contains('playing');
        window.vivet.discordSetActivity({
          details: playing ? tr('Jugando a Haxball') : tr('En el menú principal'),
          state: 'Vivet Client',
          startTimestamp: (typeof joinedAt !== 'undefined' && joinedAt && playing) ? joinedAt : Date.now(),
          largeImageKey: typeof DISCORD_LARGE_IMAGE_KEY !== 'undefined' ? DISCORD_LARGE_IMAGE_KEY : undefined,
        });
      } catch (_) {}
    };
  }

  function refreshPresence() {
    try {
      if (typeof updateDiscordPresence === 'function') {
        updateDiscordPresence(typeof currentRoomCode === 'function' ? currentRoomCode() : null,
          typeof currentRoomName !== 'undefined' ? currentRoomName : null);
      }
    } catch (_) {}
  }

  function set(v, announce) {
    on = !!v;
    root.classList.toggle('streamer', on);
    if (toggle) toggle.checked = on;
    window.vivet.setConfig('streamerMode', on).catch(() => {});
    refreshPresence();
    if (announce) { try { showToast(on ? 'Modo streamer activado' : 'Modo streamer desactivado', 'ok'); } catch (_) {} }
  }

  toggle?.addEventListener('change', () => set(toggle.checked, true));
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); set(!on, true); }
  });

  (async () => {
    try { on = !!(await window.vivet.getConfig('streamerMode', false)); } catch (_) {}
    root.classList.toggle('streamer', on);
    if (toggle) toggle.checked = on;
    if (on) refreshPresence();
  })();
})();

// =============================================================================
// 13. MAPAS  (antes: maps.js)
// =============================================================================
// Vivet Client - renderer/maps.js
// Mapas de Haxball (.hbs) subidos por la comunidad, con vista previa dibujada
// en canvas (sin abrir el juego). Habla con el mismo servidor que Amigos
// (FRIENDS_API_URL). Para subir hace falta haber vinculado Discord en Social:
// se reutiliza el token de sesión guardado en 'friendsToken'.
// Se carga DESPUÉS de app.js/friends.js (index.html). Usa sus globales:
// escapeHtml, showToast.

(() => {
  const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);

  const MAP_MAX_BYTES = 512 * 1024;   // un .hbs normal pesa < 100 KB
  const THUMB_W = 480, THUMB_H = 270;
  const LIB_KEY = 'mapsLibrary';
  const LIB_MAX = 40;

  // Si en un mapa real los arcos salen espejados, cambiá esto a -1.
  const CURVE_SIGN = 1;

  // ------------------------------------------------------------ estado
  let tab = 'community';            // community | saved | mine
  let sort = 'recent';
  let query = '';
  let list = [];                    // resultados de la pestaña activa
  let library = [];                 // guardados localmente
  let me = null;                    // { username } si hay sesión
  let current = null;               // mapa abierto en el detalle
  let upload = null;                // { text, json, name } en el diálogo de subida
  let searchTimer = null;

  // ------------------------------------------------------------ API
  async function token() {
    try { return (await window.vivet.getConfig('friendsToken', '')) || null; } catch (_) { return null; }
  }
  async function api(method, path, body) {
    const t = await token();
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.status === 404 && !json) throw new Error('El servidor todavía no tiene la sección de mapas.');
    if (!res.ok) throw new Error((json && json.error) || `Error ${res.status}`);
    return json;
  }

  // ------------------------------------------------------------ biblioteca local
  // La biblioteca vive en memoria y solo este archivo la modifica, así que se
  // lee del disco UNA vez. Antes cada apertura del selector de mapas volvía a
  // pedir toda la biblioteca (hasta 40 mapas) por IPC: era una gran parte de la lentitud.
  let libraryLoaded = false;
  async function loadLibrary() {
    try {
      const v = await window.vivet.getConfig(LIB_KEY, []);
      library = Array.isArray(v) ? v : [];
    } catch (_) { library = []; }
    libraryLoaded = true;
  }
  const saveLibrary = () => window.vivet.setConfig(LIB_KEY, library).catch(() => {});
  const isSaved = (id) => library.some((m) => m.id === id);

  // ------------------------------------------------------------ parseo del .hbs
  // Devuelve { ok, json, error }. Solo valida lo mínimo para poder dibujarlo;
  // Haxball es quien decide si el mapa es jugable.
  function parseStadium(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'El archivo está vacío.' };
    if (text.length > MAP_MAX_BYTES) return { ok: false, error: 'El mapa pesa más de 512 KB.' };
    let json, repaired = false;
    try { json = JSON.parse(text); }
    catch (_) {
      // Muchos .hbs a mano traen BOM, comentarios o comas finales: se limpian.
      try {
        let t = text.replace(/^\uFEFF/, '');
        t = t.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, s) => s || '');
        t = t.replace(/("(?:\\.|[^"\\])*")|,(\s*[}\]])/g, (m, s, c) => s || c);
        json = JSON.parse(t);
        repaired = true;
      } catch (_2) {
        return { ok: false, error: 'No es un JSON válido. ¿Es un archivo .hbs de Haxball?' };
      }
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) return { ok: false, error: 'El archivo no tiene forma de mapa de Haxball.' };
    // Antes se exigía vertexes + segments + bg, y muchos mapas válidos no
    // los traen (p. ej. sin paredes dibujadas o sin bg). Basta con que tenga
    // algo de geometría; lo que falte se completa para poder dibujarlo.
    const hasGeometry = ['vertexes', 'segments', 'discs', 'goals', 'planes'].some((k) => Array.isArray(json[k]));
    if (!hasGeometry && !json.bg) return { ok: false, error: 'No parece un mapa de Haxball (no tiene vertexes, segments, discs ni goals).' };
    if (!Array.isArray(json.vertexes)) json.vertexes = [];
    if (!Array.isArray(json.segments)) json.segments = [];
    if (!json.bg || typeof json.bg !== 'object') json.bg = {};
    return { ok: true, json, repaired };
  }

  // ------------------------------------------------------------ dibujo de la cancha
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  function cssColor(c, fallback) {
    if (c === 'transparent') return null;
    if (typeof c === 'string' && /^[0-9a-f]{6}$/i.test(c)) return '#' + c;
    if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.replace('#', ''))) return '#' + c.replace('#', '');
    if (Array.isArray(c) && c.length === 3 && c.every((n) => Number.isFinite(n))) return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    return fallback;
  }

  // Propiedad con herencia por "trait": objeto -> trait -> valor por defecto.
  function prop(json, obj, key, def) {
    if (obj && obj[key] !== undefined) return obj[key];
    const tr = obj && obj.trait && json.traits && json.traits[obj.trait];
    if (tr && tr[key] !== undefined) return tr[key];
    return def;
  }

  function bounds(json) {
    const bg = json.bg || {};
    const w = Math.abs(num(json.width, 0)), h = Math.abs(num(json.height, 0));
    let minX = -Math.max(w, num(bg.width, 0)), maxX = -minX;
    let minY = -Math.max(h, num(bg.height, 0)), maxY = -minY;
    const grow = (x, y, r = 0) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
    };
    // Solo los vértices que dibujan algo definen el encuadre.
    const seg = json.segments || [], vx = json.vertexes || [];
    seg.forEach((s) => {
      if (prop(json, s, 'vis', true) === false) return;
      [vx[s.v0], vx[s.v1]].forEach((v) => v && grow(num(v.x, NaN), num(v.y, NaN)));
    });
    (json.goals || []).forEach((g) => {
      if (Array.isArray(g.p0)) grow(g.p0[0], g.p0[1]);
      if (Array.isArray(g.p1)) grow(g.p1[0], g.p1[1]);
    });
    if (!isFinite(minX) || maxX - minX < 10) { minX = -400; maxX = 400; }
    if (!isFinite(minY) || maxY - minY < 10) { minY = -200; maxY = 200; }
    return { minX, maxX, minY, maxY };
  }

  function strokeSegment(ctx, json, s, a, b, dashed) {
    ctx.beginPath();
    const curve = num(prop(json, s, 'curve', 0), 0) * CURVE_SIGN;
    if (Math.abs(curve) < 0.5) {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    } else {
      const th = curve * Math.PI / 180;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.tan(th / 2);
      const cx = (a.x + b.x) / 2 - dy / (2 * t);
      const cy = (a.y + b.y) / 2 + dx / (2 * t);
      const r = Math.hypot(a.x - cx, a.y - cy);
      const a0 = Math.atan2(a.y - cy, a.x - cx);
      ctx.arc(cx, cy, r, a0, a0 + th, th < 0);
    }
    ctx.setLineDash(dashed ? [6, 6] : []);
    ctx.stroke();
  }

  // Dibuja el mapa completo dentro de `canvas`. opts.invisible = mostrar paredes
  // invisibles (punteadas). Devuelve nada; si algo falla, deja el fondo liso.
  function drawStadium(canvas, json, opts = {}) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const bg = json.bg || {};
    // Haxball: type "grass" / "hockey" / (sin type = "none"). En "none" el
    // color del mapa (bg.color) pinta TODO el fondo; antes se ignoraba y se
    // mostraba siempre verde. Por defecto el color es 718C5A.
    const type = bg.type === 'hockey' ? 'hockey' : bg.type === 'grass' ? 'grass' : 'none';
    const defInside = type === 'hockey' ? '#556E55' : '#718C5A';
    const inside = cssColor(bg.color, defInside) || defInside;
    const outside = type === 'hockey' ? '#3a4a3a' : type === 'grass' ? '#5a7a4a' : inside;
    const lines = type === 'hockey' ? '#E9CC6E' : '#C7E6BD';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = outside; ctx.fillRect(0, 0, W, H);

    try {
      const b = bounds(json);
      const pad = 0.06;
      const bw = (b.maxX - b.minX) * (1 + pad * 2), bh = (b.maxY - b.minY) * (1 + pad * 2);
      const scale = Math.min(W / bw, H / bh);
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      ctx.setTransform(scale, 0, 0, scale, W / 2 - cx * scale, H / 2 - cy * scale);
      const px = 1 / scale;                 // 1 píxel de pantalla en coordenadas del mapa

      // --- cancha (bg)
      const bgW = num(bg.width, 0), bgH = num(bg.height, 0);
      if (bgW > 0 && bgH > 0) {
        const cr = Math.min(num(bg.cornerRadius, 0), bgW, bgH);
        ctx.fillStyle = inside;
        ctx.beginPath();
        if (cr > 0 && ctx.roundRect) ctx.roundRect(-bgW, -bgH, bgW * 2, bgH * 2, cr); else ctx.rect(-bgW, -bgH, bgW * 2, bgH * 2);
        ctx.fill();
        ctx.strokeStyle = lines; ctx.lineWidth = Math.max(3, 2 * px); ctx.setLineDash([]);
        ctx.stroke();
        // línea central y círculo de saque
        ctx.beginPath(); ctx.moveTo(0, -bgH); ctx.lineTo(0, bgH); ctx.stroke();
        const kr = num(bg.kickOffRadius, 0);
        if (kr > 0) { ctx.beginPath(); ctx.arc(0, 0, kr, 0, Math.PI * 2); ctx.stroke(); }
      }

      // --- paredes / líneas
      const vx = json.vertexes;
      (json.segments || []).forEach((s) => {
        const a = vx[s.v0], c = vx[s.v1];
        if (!a || !c) return;
        const vis = prop(json, s, 'vis', true) !== false;
        const color = cssColor(prop(json, s, 'color', '000000'), '#000000');
        if (!vis && !opts.invisible) return;
        if (!color && vis) return;              // "transparent"
        ctx.lineWidth = Math.max(3, 2 * px);
        ctx.lineCap = 'round';
        ctx.strokeStyle = vis ? color : 'rgba(255, 255, 255, 0.45)';
        strokeSegment(ctx, json, s, a, c, !vis);
      });

      // --- arcos
      (json.goals || []).forEach((g) => {
        if (!Array.isArray(g.p0) || !Array.isArray(g.p1)) return;
        ctx.strokeStyle = g.team === 'blue' ? '#5689E5' : '#E56E56';
        ctx.lineWidth = Math.max(4, 3 * px); ctx.lineCap = 'butt'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(g.p0[0], g.p0[1]); ctx.lineTo(g.p1[0], g.p1[1]); ctx.stroke();
      });

      // --- discos del mapa (postes, obstáculos)
      (json.discs || []).forEach((d) => {
        const p = d.pos;
        if (!Array.isArray(p)) return;
        const r = num(prop(json, d, 'radius', 10), 10);
        const fill = cssColor(prop(json, d, 'color', 'FFFFFF'), '#FFFFFF');
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.setLineDash([]); ctx.stroke();
      });

      // --- pelota y jugadores en su posición de saque
      const ball = json.ballPhysics && typeof json.ballPhysics === 'object' ? json.ballPhysics : {};
      if (ball !== 'disc0') {
        const r = num(ball.radius, 10);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = cssColor(ball.color, '#FFFFFF'); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.stroke();
      }
      const pr = num(json.playerPhysics && json.playerPhysics.radius, 15);
      const team = (pts, color) => (Array.isArray(pts) ? pts : []).slice(0, 4).forEach((p) => {
        if (!Array.isArray(p)) return;
        ctx.beginPath(); ctx.arc(p[0], p[1], pr, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2, 1.6 * px); ctx.stroke();
      });
      team(json.redSpawnPoints, '#E56E56');
      team(json.blueSpawnPoints, '#5689E5');
    } catch (_) { /* preview incompleta, pero no se rompe la UI */ }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function thumbDataUrl(json) {
    const c = document.createElement('canvas');
    c.width = THUMB_W; c.height = THUMB_H;
    drawStadium(c, json);
    return c.toDataURL('image/webp', 0.8);
  }

  // ------------------------------------------------------------ tarjetas
  const authorName = (m) => (m.author && (m.author.username || m.author)) || 'Local';
  const fmtDate = (v) => { try { return new Date(v).toLocaleDateString(); } catch (_) { return ''; } };

  function cardHtml(m, i) {
    const img = m.local ? `<canvas class="map-thumb" width="${THUMB_W}" height="${THUMB_H}" data-local="${i}"></canvas>`
      : `<img class="map-thumb" alt="" loading="lazy" src="${escapeHtml(API + '/maps/' + encodeURIComponent(m.id) + '/thumb')}" />`;
    const dl = m.local ? 'Guardado' : `${Number(m.downloads) || 0} usos`;
    return `<button class="map-card" type="button" data-i="${i}">
      ${img}
      <span class="map-card-body">
        <span class="map-card-name">${escapeHtml(m.name)}</span>
        <span class="map-card-meta">${escapeHtml(authorName(m))} · ${escapeHtml(dl)}</span>
      </span></button>`;
  }

  // Dibuja las miniaturas de mapas guardados en tandas de ~8 ms por cuadro, en
  // vez de parsear y dibujar los 40 de golpe (congelaba la UI al abrir el selector).
  function drawLocalThumbs(grid, items) {
    const canvases = Array.from(grid.querySelectorAll('canvas[data-local]'));
    let k = 0;
    const step = () => {
      const t0 = performance.now();
      while (k < canvases.length && performance.now() - t0 < 8) {
        const c = canvases[k++];
        if (!c.isConnected) continue;
        const m = items[Number(c.dataset.local)];
        if (!m) continue;
        const p = parseStadium(m.map);
        if (p.ok) drawStadium(c, p.json);
      }
      if (k < canvases.length) requestAnimationFrame(step);
    };
    if (canvases.length) requestAnimationFrame(step);
  }

  function renderGrid(emptyMsg) {
    const grid = $('#maps-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<p class="hint maps-empty">${emptyMsg}</p>`;
      return;
    }
    grid.innerHTML = list.map(cardHtml).join('');
    drawLocalThumbs(grid, list);
  }

  function setStatus(t) { const el = $('#maps-status'); if (el) el.textContent = t || ''; }

  async function refresh() {
    if (!$('#panel-mapas')) return;
    if (tab === 'saved') {
      list = library.map((m) => ({ ...m, local: true }))
        .filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase()));
      setStatus('');
      return renderGrid('Todavía no guardaste mapas. Abrí uno de la comunidad y tocá "Guardar".');
    }
    if (!API) {
      list = [];
      setStatus('');
      return renderGrid('Los mapas de la comunidad necesitan FRIENDS_API_URL en config.js.');
    }
    setStatus('Cargando mapas…');
    try {
      const qs = new URLSearchParams({ sort, q: query, mine: tab === 'mine' ? '1' : '0' });
      const r = await api('GET', '/maps?' + qs.toString());
      list = Array.isArray(r.maps) ? r.maps : [];
      setStatus('');
      renderGrid(tab === 'mine' ? 'Todavía no subiste mapas.' : 'No hay mapas que coincidan. Sé la primera persona en subir uno.');
    } catch (e) {
      list = [];
      setStatus('');
      renderGrid(escapeHtml(e.message || 'No se pudieron cargar los mapas.'));
    }
  }

  // ------------------------------------------------------------ detalle
  function openModal(id) { const m = $(id); if (m) m.hidden = false; }
  function closeModal(id) { const m = $(id); if (m) m.hidden = true; }

  function paintDetail() {
    if (!current) return;
    const c = $('#map-detail-canvas');
    drawStadium(c, current.json, { invisible: $('#map-detail-invisible').checked });
  }

  async function openDetail(item) {
    let text = item.map || null;
    if (!text) {
      try { const full = await api('GET', '/maps/' + encodeURIComponent(item.id)); text = full.map; }
      catch (e) { return showToast(e.message || 'No se pudo abrir el mapa'); }
    }
    const p = parseStadium(text);
    if (!p.ok) return showToast(p.error);
    current = { item, text, json: p.json };
    const j = p.json;
    $('#map-detail-name').textContent = item.name || j.name || 'Mapa';
    $('#map-detail-desc').textContent = item.description || '';
    $('#map-detail-meta').textContent =
      `${authorName(item)} · ${num(j.width, 0) * 2 || num(j.bg && j.bg.width, 0) * 2}×${num(j.height, 0) * 2 || num(j.bg && j.bg.height, 0) * 2} · ${(text.length / 1024).toFixed(1)} KB`;
    $('#map-detail-invisible').checked = false;
    $('#map-save-btn').textContent = isSaved(item.id) ? 'Quitar de guardados' : 'Guardar';
    // Se compara por id (los nombres de Discord pueden repetirse). Si el servidor
    // todavía no manda author.id, el botón queda oculto (el servidor igual valida).
    const mine = !!(me && item.author && item.author.id != null && Number(item.author.id) === Number(me.id));
    $('#map-delete-btn').hidden = !(mine && !item.local);
    $('#map-report-btn').hidden = !!item.local;
    openModal('#map-detail');
    paintDetail();
  }

  function downloadCurrent() {
    if (!current) return;
    const safe = (current.item.name || 'mapa').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'mapa';
    const url = URL.createObjectURL(new Blob([current.text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = safe + '.hbs';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (!current.item.local && API) api('POST', `/maps/${encodeURIComponent(current.item.id)}/use`).catch(() => {});
  }

  async function toggleSave() {
    if (!current) return;
    const it = current.item;
    if (isSaved(it.id)) {
      library = library.filter((m) => m.id !== it.id);
      $('#map-save-btn').textContent = 'Guardar';
      showToast('Quitado de guardados', 'ok');
    } else {
      if (library.length >= LIB_MAX) return showToast(`Máximo ${LIB_MAX} mapas guardados`);
      library.unshift({ id: it.id, name: it.name, author: authorName(it), description: it.description || '', map: current.text, savedAt: Date.now() });
      $('#map-save-btn').textContent = 'Quitar de guardados';
      showToast('Guardado en tu PC', 'ok');
      if (!it.local && API) api('POST', `/maps/${encodeURIComponent(it.id)}/use`).catch(() => {});
    }
    await saveLibrary();
    if (tab === 'saved') refresh();
  }

  async function deleteCurrent() {
    if (!current || !window.confirm('¿Eliminar este mapa de la comunidad? No se puede deshacer.')) return;
    try {
      await api('DELETE', '/maps/' + encodeURIComponent(current.item.id));
      closeModal('#map-detail'); showToast('Mapa eliminado', 'ok'); refresh();
    } catch (e) { showToast(e.message || 'No se pudo eliminar'); }
  }

  async function reportCurrent() {
    if (!current || !window.confirm('¿Reportar este mapa por contenido inapropiado o engañoso?')) return;
    try { await api('POST', `/maps/${encodeURIComponent(current.item.id)}/report`, { reason: 'user-report' }); showToast('Reporte enviado', 'ok'); }
    catch (e) { showToast(e.message || 'No se pudo reportar'); }
  }

  // ------------------------------------------------------------ subida
  function resetUpload() {
    upload = null;
    $('#map-upload-form').hidden = true;
    $('#map-upload-error').textContent = '';
    $('#map-upload-name').value = '';
    $('#map-upload-desc').value = '';
    $('#map-upload-file').value = '';
    $('#map-upload-publish').disabled = true;
    $('#map-upload-local').disabled = true;
  }

  function openUpload() {
    resetUpload();
    openModal('#map-upload');
  }

  async function handleFile(file) {
    if (!file) return;
    const err = $('#map-upload-error');
    err.textContent = '';
    if (file.size > MAP_MAX_BYTES) { err.textContent = 'El mapa pesa más de 512 KB.'; return; }
    const text = await file.text();
    const p = parseStadium(text);
    if (!p.ok) { err.textContent = p.error; $('#map-upload-form').hidden = true; return; }
    const name = String(p.json.name || file.name.replace(/\.(hbs|json)$/i, '') || 'Mapa').slice(0, 60);
    upload = { text: p.repaired ? JSON.stringify(p.json) : text, json: p.json };
    $('#map-upload-name').value = name;
    $('#map-upload-form').hidden = false;
    drawStadium($('#map-upload-canvas'), p.json);
    $('#map-upload-publish').disabled = false;
    $('#map-upload-local').disabled = false;
  }

  async function publish() {
    if (!upload) return;
    const name = $('#map-upload-name').value.trim().slice(0, 60);
    if (!name) { $('#map-upload-error').textContent = 'Poné un nombre al mapa.'; return; }
    if (!API) { $('#map-upload-error').textContent = 'Falta FRIENDS_API_URL en config.js.'; return; }
    if (!me) { $('#map-upload-error').textContent = 'Para subir mapas vinculá tu Discord en Social.'; return; }
    const btn = $('#map-upload-publish');
    btn.disabled = true;
    try {
      await api('POST', '/maps', {
        name,
        description: $('#map-upload-desc').value.trim().slice(0, 200),
        map: upload.text,
        thumb: thumbDataUrl(upload.json),
      });
      closeModal('#map-upload');
      showToast('Mapa publicado', 'ok');
      setTab('mine');
    } catch (e) {
      $('#map-upload-error').textContent = e.message || 'No se pudo publicar.';
      btn.disabled = false;
    }
  }

  async function saveUploadLocal() {
    if (!upload) return;
    const name = $('#map-upload-name').value.trim().slice(0, 60) || 'Mapa';
    if (library.length >= LIB_MAX) { $('#map-upload-error').textContent = `Máximo ${LIB_MAX} mapas guardados.`; return; }
    library.unshift({ id: 'local-' + Date.now().toString(36), name, author: 'Local', description: '', map: upload.text, savedAt: Date.now() });
    await saveLibrary();
    closeModal('#map-upload');
    showToast('Guardado en tu PC', 'ok');
    setTab('saved');
  }

  // ------------------------------------------------------------ pestañas y eventos
  function setTab(next) {
    tab = next;
    document.querySelectorAll('.maps-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#maps-sort').hidden = tab === 'saved';
    refresh();
  }

  async function loadMe() {
    me = null;
    if (!API || !(await token())) return;
    try { me = await api('GET', '/me'); } catch (_) {}
  }

  function bind() {
    document.querySelectorAll('.maps-tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('#maps-sort')?.addEventListener('change', (e) => { sort = e.target.value; refresh(); });
    $('#maps-search')?.addEventListener('input', (e) => {
      query = e.target.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refresh, 250);
    });
    $('#maps-upload-btn')?.addEventListener('click', openUpload);
    $('#maps-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.map-card');
      if (card) openDetail(list[Number(card.dataset.i)]);
    });

    // detalle
    $('#map-detail-invisible')?.addEventListener('change', paintDetail);
    $('#map-download-btn')?.addEventListener('click', downloadCurrent);
    $('#map-save-btn')?.addEventListener('click', toggleSave);
    $('#map-delete-btn')?.addEventListener('click', deleteCurrent);
    $('#map-report-btn')?.addEventListener('click', reportCurrent);

    // subida
    const drop = $('#map-drop');
    $('#map-upload-file')?.addEventListener('change', (e) => handleFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop?.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    $('#map-upload-publish')?.addEventListener('click', publish);
    $('#map-upload-local')?.addEventListener('click', saveUploadLocal);

    // mapas dentro de la sala (guardados / comunidad / míos), sin descargar nada
    $('#room-maps-btn')?.addEventListener('click', openRoomMaps);
    document.querySelectorAll('.rm-tab').forEach((b) => b.addEventListener('click', () => setRoomTab(b.dataset.rtab)));
    $('#room-maps-search')?.addEventListener('input', (e) => {
      roomMapsQuery = e.target.value.trim();
      clearTimeout(roomTimer);
      roomTimer = setTimeout(refreshRoomMaps, roomTab === 'saved' ? 0 : 250);
    });
    $('#room-maps-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.map-card');
      const item = card && roomMapsShown[Number(card.dataset.i)];
      if (item) useRoomMap(item);
    });
    $('#map-use-btn')?.addEventListener('click', useCurrentInRoom);
    $('#room-maps-grid')?.addEventListener('pointerover', (e) => {
      const card = e.target.closest('.map-card');
      const item = card && roomMapsShown[Number(card.dataset.i)];
      if (item && !item.local) mapTextOf(item).catch(() => {});
    });

    // cierre de modales (botón, fondo o Escape)
    document.querySelectorAll('.map-modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.map-modal').forEach((m) => { m.hidden = true; });
    });

    document.querySelector('.nav-btn[data-panel="panel-mapas"]')?.addEventListener('click', async () => {
      await loadMe();
      refresh();
    });
  }

  // ------------------------------------------------------------ cargar un mapa guardado en TU sala
  // Se usa desde el botón "Mapas" que flota sobre el juego mientras estás en
  // una sala. Haxball solo deja cambiar el estadio al admin y con el partido
  // parado, y solo lo hace desde su botón "Pick" (abre un selector de archivos).
  // Igual que en replays.js: se toca ese botón, se intercepta el selector de
  // archivos y se le entrega el .hbs guardado. Todo esto corre DENTRO del juego.
  function pickStadiumInPage(name, text) {
    try {
      var visible = function (el) { return !el.getClientRects || el.getClientRects().length > 0; };
      var room = document.querySelector('.room-view');
      if (!room) return document.querySelector('.game-state-view') ? 'in-game' : 'no-room';

      var btn = room.querySelector('[data-hook=stadium-pick], [data-hook=pick-stadium]');
      if (!btn) {
        var nm = room.querySelector('[data-hook=stadium-name]');
        var p = nm;
        for (var i = 0; i < 3 && p && !btn; i++) {
          p = p.parentElement;
          if (!p) break;
          var bs = p.querySelectorAll('button');
          for (var k = 0; k < bs.length && !btn; k++) {
            if (/stadium|pick|elegir|escoger|choose|select|selecc|cambiar/i.test((bs[k].getAttribute('data-hook') || '') + ' ' + (bs[k].textContent || ''))) btn = bs[k];
          }
          if (!btn && bs.length === 1) btn = bs[0];
        }
      }
      if (!btn) return 'no-button';
      if (btn.disabled) {
        var stop = room.querySelector('[data-hook=stop-btn]');
        return stop && !stop.disabled && visible(stop) ? 'in-game' : 'not-host';
      }

      // Estado que lee después el renderer (pickStateInPage).
      var nmBefore = room.querySelector('[data-hook=stadium-name]');
      var S = window.__vivetPick = { state: 'pending', info: '', before: nmBefore ? (nmBefore.textContent || '').trim() : '' };
      var file = new File([text], name + '.hbs', { type: 'application/json' });
      var origClick = HTMLInputElement.prototype.click;
      var fed = false;
      var restore = function () { HTMLInputElement.prototype.click = origClick; };
      var feed = function (input) {
        if (fed) return;
        fed = true;
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        S.state = 'ok';
      };
      // Si Haxball abre el selector con input.click() (creando el <input> al vuelo),
      // se intercepta acá en vez de dejar que abra el diálogo del sistema.
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file' && !fed) { feed(this); return; }
        return origClick.apply(this, arguments);
      };

      // Muchas versiones de Haxball abren primero un MENÚ (estadios de fábrica +
      // una opción "Load"/"Cargar"). Si aparece, se toca esa opción.
      var LOAD = /^\s*(load|load stadium|load a stadium|cargar|cargar mapa|cargar estadio|custom|personalizado|abrir|open|browse|examinar|upload)\s*(\.\.\.|…)?\s*$/i;
      var loadCands = function () {
        var out = [], els = document.querySelectorAll('button, div, a, li, span, p');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.childElementCount > 3) continue; // contenedores grandes: textContent caro y nunca es la opción
          if (!LOAD.test(el.textContent || '') || !visible(el)) continue;
          if (el.children && el.children.length && LOAD.test(el.children[0].textContent || '')) continue; // el más interno
          out.push(el);
        }
        return out;
      };
      var before = loadCands();
      var describe = function () {
        var parts = [], boxes = document.querySelectorAll('.dialog, [class*=menu], [class*=popup], [class*=dropdown], [class*=context], [class*=picker]');
        for (var i = 0; i < boxes.length; i++) {
          if (visible(boxes[i])) parts.push((boxes[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90));
        }
        return parts.join(' | ').slice(0, 220);
      };

      btn.click();

      var tries = 0, clickedLoad = false;
      var timer = setInterval(function () {
        tries++;
        if (fed) { clearInterval(timer); setTimeout(restore, 300); return; }
        var input = document.querySelector('input[type=file]');
        if (input) { feed(input); clearInterval(timer); setTimeout(restore, 300); return; }
        if (!clickedLoad) {
          var now = loadCands().filter(function (el) { return before.indexOf(el) < 0; });
          if (now.length) {
            clickedLoad = true;
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
              try { now[0].dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); } catch (_) {}
            });
          }
        }
        if (tries >= 40) {
          clearInterval(timer);
          restore();
          S.state = 'no-picker';
          S.info = describe();
        }
      }, 100);
      return 'started';
    } catch (e) {
      return 'error:' + ((e && e.message) || e);
    }
  }

  function pickStateInPage() {
    try { return window.__vivetPick ? { state: window.__vivetPick.state, info: window.__vivetPick.info, before: window.__vivetPick.before } : null; }
    catch (e) { return null; }
  }

  // Lee cómo quedó el lobby: nombre del estadio y, si Haxball abrió un
  // diálogo (p. ej. "error al cargar el estadio"), su texto.
  function stadiumStatusInPage() {
    try {
      var nm = document.querySelector('.room-view [data-hook=stadium-name]');
      var dlg = document.querySelector('.dialog');
      return { name: nm ? (nm.textContent || '').trim() : '', dialog: dlg ? (dlg.textContent || '').trim().slice(0, 160) : '' };
    } catch (e) { return { name: '', dialog: '' }; }
  }

  const ROOM_MAP_MSG = {
    'no-room': 'Entrá o creá una sala primero',
    'in-game': 'Pará el partido para cambiar el mapa',
    'not-host': 'Solo el admin de la sala puede cambiar el mapa',
    'no-button': 'No encontré el botón de estadio de Haxball. Cambialo a mano con "Pick"',
    'no-picker': 'Haxball no abrió el selector de mapa. Probá de nuevo',
  };

  // Devuelve 'ok' o el código del fallo ('no-room', 'in-game', 'not-host', ...).
  // opts.silentNoRoom: no avisar si todavía no hay sala (lo usa la cola de "usar en mi sala").
  async function loadMapIntoRoom(entry, opts = {}) {
    const fail = (code, msg) => { if (!(opts.silentNoRoom && code === 'no-room')) showToast(msg); return code; };
    if (!appRoot.classList.contains('playing') || replayMode || creatingRoom) return fail('no-room', 'Entrá o creá una sala primero');
    const p = parseStadium(entry.map);
    if (!p.ok) return fail('bad-map', p.error);
    // Si el archivo necesitó reparación (comentarios, comas finales), se manda limpio.
    const text = p.repaired ? JSON.stringify(p.json) : entry.map;
    const name = String(entry.name || p.json.name || 'mapa').replace(/[^\w\- ]+/g, '').trim() || 'mapa';
    const asScript = (fn, ...args) => '(' + fn.toString() + ')(' + args.map((a) => JSON.stringify(a)).join(',') + ');';
    let out;
    try {
      const results = await execInAllFrames(asScript(pickStadiumInPage, name, text));
      const vals = results.filter((r) => r.ok && typeof r.value === 'string').map((r) => r.value);
      // El frame del juego es el único que no contesta 'no-room'.
      out = vals.find((v) => v !== 'no-room') || 'no-room';
    } catch (_) { out = 'error'; }
    if (out !== 'started') return fail(out, ROOM_MAP_MSG[out] || 'No se pudo cargar el mapa');

    // La inyección es asíncrona (espera el menú / el selector de Haxball): se sondea el resultado.
    let state = null;
    for (let i = 0; i < 90 && !(state && state.state !== 'pending'); i++) {
      await new Promise((r) => setTimeout(r, 80));
      try {
        const results = await execInAllFrames('(' + pickStateInPage.toString() + ')();');
        state = (results.find((r) => r.ok && r.value && r.value.state) || {}).value || state;
      } catch (_) {}
    }
    if (!state || state.state !== 'ok') {
      const extra = state && state.info ? ` (Haxball mostró: ${state.info})` : '';
      return fail('no-picker', ROOM_MAP_MSG['no-picker'] + extra);
    }

    // Antes: espera fija de 900 ms. Ahora se revisa cada 100 ms y se sale apenas
    // cambia el nombre del estadio o Haxball muestra un error (máx. ~1,2 s).
    const ERR = /error|invalid|inv[aá]lid|no se pudo|could not|failed/i;
    const before = (state && state.before) || '';
    let st = null;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const results = await execInAllFrames(asScript(stadiumStatusInPage));
        st = (results.find((r) => r.ok && r.value && (r.value.name || r.value.dialog)) || {}).value || st;
      } catch (_) {}
      if (st && ((st.dialog && ERR.test(st.dialog)) || (st.name && st.name !== before))) break;
    }
    if (st && st.dialog && /error|invalid|inv[aá]lid|no se pudo|could not|failed/i.test(st.dialog)) {
      return fail('rejected', 'Haxball rechazó el mapa: ' + st.dialog);
    }
    showToast(st && st.name ? `Mapa cargado: ${st.name}` : 'Mapa cargado', 'ok');
    try { focusGameView(); } catch (_) {}
    return 'ok';
  }

  // Trae el texto del .hbs de un mapa (guardado, de la comunidad o tuyo) sin
  // guardarlo ni descargarlo: queda solo en memoria hasta entregárselo a Haxball.
  // El texto se guarda en memoria (y se pide apenas pasás el mouse por la
  // tarjeta), así al hacer click el mapa ya está y no hay que esperar al servidor.
  const textCache = new Map();
  async function mapTextOf(item) {
    if (item.map) return item.map;
    if (!textCache.has(item.id)) {
      if (textCache.size >= 30) textCache.delete(textCache.keys().next().value);
      textCache.set(item.id, api('GET', '/maps/' + encodeURIComponent(item.id)).then((f) => f.map));
    }
    try { return await textCache.get(item.id); }
    catch (e) { textCache.delete(item.id); throw e; }
  }

  // ------------------------------------------------------------ "usar en mi sala" desde el detalle
  // Desde el panel no hay sala abierta (el panel se oculta al jugar), así que
  // el mapa queda en cola y se pone solo apenas entrás a tu sala.
  let pendingMap = null;
  let pendingRunning = false;
  const PENDING_TTL = 10 * 60 * 1000;

  async function runPending() {
    if (pendingRunning || !pendingMap) return;
    pendingRunning = true;
    const job = pendingMap;
    try {
      for (let i = 0; i < 60 && pendingMap === job; i++) {
        if (Date.now() - job.at > PENDING_TTL) { pendingMap = null; break; }
        if (!appRoot.classList.contains('playing')) break;   // salió: queda en cola
        if (!creatingRoom && !replayMode) {
          const r = await loadMapIntoRoom(job.entry, { silentNoRoom: true });
          if (r !== 'no-room') { if (pendingMap === job) pendingMap = null; break; }
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    } finally { pendingRunning = false; }
  }
  new MutationObserver(() => { if (pendingMap && appRoot.classList.contains('playing')) runPending(); })
    .observe(appRoot, { attributes: true, attributeFilter: ['class'] });

  function useCurrentInRoom() {
    if (!current) return;
    const entry = { name: current.item.name || current.json.name || 'mapa', map: current.text };
    closeModal('#map-detail');
    if (appRoot.classList.contains('playing') && !replayMode && !creatingRoom) { loadMapIntoRoom(entry); return; }
    pendingMap = { entry, at: Date.now() };
    showToast('Listo: se pondrá apenas entres a tu sala como admin', 'ok');
  }

  // ------------------------------------------------------------ selector dentro de la sala
  let roomTab = 'saved';            // saved | community | mine
  let roomMapsQuery = '';
  let roomMapsShown = [];
  let roomSeq = 0;
  let roomTimer = null;

  function paintRoomGrid(emptyMsg) {
    const grid = $('#room-maps-grid');
    if (!grid) return;
    if (!roomMapsShown.length) { grid.innerHTML = `<p class="hint maps-empty">${emptyMsg}</p>`; return; }
    grid.innerHTML = roomMapsShown.map(cardHtml).join('');
    drawLocalThumbs(grid, roomMapsShown);
  }

  async function refreshRoomMaps() {
    const grid = $('#room-maps-grid');
    if (!grid) return;
    const seq = ++roomSeq;
    const q = roomMapsQuery.toLowerCase();
    if (roomTab === 'saved') {
      roomMapsShown = library.filter((m) => !q || m.name.toLowerCase().includes(q)).map((m) => ({ ...m, local: true }));
      return paintRoomGrid(library.length
        ? 'Ningún mapa coincide con la búsqueda.'
        : 'Todavía no tenés mapas guardados. Mirá la pestaña Comunidad: podés usar cualquiera directo, sin guardarlo.');
    }
    if (!API) { roomMapsShown = []; return paintRoomGrid('Los mapas de la comunidad necesitan FRIENDS_API_URL en config.js.'); }
    grid.innerHTML = '<p class="hint maps-empty">Cargando mapas…</p>';
    try {
      const qs = new URLSearchParams({ sort: 'recent', q: roomMapsQuery, mine: roomTab === 'mine' ? '1' : '0' });
      const r = await api('GET', '/maps?' + qs.toString());
      if (seq !== roomSeq) return;
      roomMapsShown = Array.isArray(r.maps) ? r.maps : [];
      paintRoomGrid(roomTab === 'mine' ? 'Todavía no subiste mapas.' : 'No hay mapas que coincidan.');
    } catch (e) {
      if (seq !== roomSeq) return;
      roomMapsShown = [];
      paintRoomGrid(escapeHtml(e.message || 'No se pudieron cargar los mapas.'));
    }
  }

  function setRoomTab(next) {
    roomTab = next;
    document.querySelectorAll('.rm-tab').forEach((b) => b.classList.toggle('active', b.dataset.rtab === roomTab));
    refreshRoomMaps();
  }

  async function openRoomMaps() {
    if (!libraryLoaded) await loadLibrary();
    roomMapsQuery = '';
    const q = $('#room-maps-search');
    if (q) q.value = '';
    openModal('#room-maps-modal');
    setRoomTab(library.length ? 'saved' : 'community');
  }

  async function useRoomMap(item) {
    closeModal('#room-maps-modal');
    let text;
    try { text = await mapTextOf(item); }
    catch (e) { return showToast(e.message || 'No se pudo traer el mapa'); }
    const r = await loadMapIntoRoom({ name: item.name, map: text });
    if (r === 'ok' && !item.local && API) api('POST', `/maps/${encodeURIComponent(item.id)}/use`).catch(() => {});
  }

  // ------------------------------------------------------------ arranque
  bind();
  (async () => { await loadLibrary(); await loadMe(); })();
})();

// =============================================================================
// 14. ANIMACIONES  (antes: animations.js)
// =============================================================================
// Vivet Client - renderer/animations.js
// Animaciones del panel que necesitan un poco de JS (el resto vive en style.css):
//  - Onda al hacer click en botones.
//  - Foco de luz que sigue al mouse en las tarjetas.
//  - Contadores que "suben" (jugadores en línea, XP) en vez de saltar.
//  - Lista de salas: entrada escalonada la primera vez y destello en las salas nuevas.
//  - Destello cuando cambia "actualizado hace...". Spinner en "Actualizar".
// No toca la lógica de app.js: solo observa el DOM. Se apaga con el modo
// rendimiento y con prefers-reduced-motion. Se carga al final (ver index.html).

(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const off = () => reduced.matches || root.classList.contains('perf-mode') || !!document.querySelector('#app-root.playing');

  // ------------------------------------------------------------ ondas al click
  const RIPPLE = '.primary-btn, .ghost-btn, .nav-btn, .club-chip, .stadium-chip, .res-chip';
  document.addEventListener('pointerdown', (e) => {
    if (off() || e.button !== 0) return;
    const b = e.target.closest && e.target.closest(RIPPLE);
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'vv-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, true);

  // ------------------------------------------------------------ foco de luz en tarjetas
  let raf = 0, lx = 0, ly = 0, lcard = null;
  document.addEventListener('pointermove', (e) => {
    if (off()) return;
    const c = e.target.closest && e.target.closest('.card');
    if (!c) return;
    lcard = c; lx = e.clientX; ly = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!lcard) return;
      const r = lcard.getBoundingClientRect();
      lcard.style.setProperty('--mx', (lx - r.left) + 'px');
      lcard.style.setProperty('--my', (ly - r.top) + 'px');
    });
  }, { passive: true });

  // ------------------------------------------------------------ contadores
  // fmt(n, textoOriginal) -> texto. Se anima del valor anterior al nuevo.
  function counter(el, fmt) {
    if (!el) return;
    let shown = null, anim = 0, internal = false;
    const parse = (t) => { const m = /\d[\d.,\s]*/.exec(t || ''); return m ? Number(m[0].replace(/[^\d]/g, '')) : null; };
    const write = (v) => { internal = true; el.textContent = fmt(v, el.textContent); internal = false; };
    new MutationObserver(() => {
      if (internal) return;
      const target = parse(el.textContent);
      if (target == null) { shown = null; return; }
      if (shown == null || off() || shown === target) { shown = target; return; }
      const from = shown, t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(target - from) * 12);
      cancelAnimationFrame(anim);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const v = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
        shown = v; write(v);
        if (k < 1) anim = requestAnimationFrame(step);
        else { shown = target; write(target); }
      };
      write(from);
      anim = requestAnimationFrame(step);
    }).observe(el, { childList: true, characterData: true, subtree: true });
    shown = parse(el.textContent);
  }
  counter($('#stat-players'), (n) => n.toLocaleString('es'));
  counter($('#comp-xp'), (n) => `${n} XP`);

  // ------------------------------------------------------------ lista de salas
  const list = $('#room-list');
  if (list) {
    const seen = new Map();         // nombre -> último momento en que se vio
    const FRESH_MS = 30000;         // si reaparece antes de esto (filtro, reorden) no cuenta como nueva
    let first = true, queued = false, added = [];
    const isRoom = (n) => n.nodeType === 1 && n.classList.contains('room-card') &&
      !n.classList.contains('room-card-pinned') && !n.classList.contains('room-card-direct');
    const flush = () => {
      queued = false;
      const nodes = added; added = [];
      if (off() || !nodes.length) return;
      const now = Date.now();
      let i = 0;
      for (const c of nodes) {
        if (!c.isConnected) continue;
        const n = (c.querySelector('.room-name')?.textContent || '').trim();
        if (!n) continue;
        const last = seen.get(n);
        if (first) {
          if (i < 12) { c.classList.add('vv-enter'); c.style.animationDelay = (i * 45) + 'ms'; }
          i++;
        } else if (last == null || now - last > FRESH_MS) {
          c.classList.add('vv-new');
        }
        seen.set(n, now);
      }
      first = false;
      if (seen.size > 600) for (const [k, t] of seen) if (now - t > 5 * 60000) seen.delete(k);
    };
    new MutationObserver((muts) => {
      if (off()) return;
      for (const m of muts) for (const n of m.addedNodes) if (isRoom(n)) added.push(n);
      if (added.length && !queued) { queued = true; requestAnimationFrame(flush); }
    }).observe(list, { childList: true });
  }

  // ------------------------------------------------------------ actualizar / última vez
  const refresh = $('#refresh-btn');
  refresh?.addEventListener('click', () => {
    if (off()) return;
    refresh.classList.add('vv-spin');
    setTimeout(() => refresh.classList.remove('vv-spin'), 1400);
  });
  const lu = $('#last-updated');
  if (lu) {
    let prev = lu.textContent;
    new MutationObserver(() => {
      if (off() || lu.textContent === prev) return;
      prev = lu.textContent;
      lu.classList.remove('vv-flash'); void lu.offsetWidth; lu.classList.add('vv-flash');
    }).observe(lu, { childList: true, characterData: true, subtree: true });
  }
})();