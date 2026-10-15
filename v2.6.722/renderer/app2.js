// Vivet Client - renderer/app2.js
// Reúne en un solo archivo los módulos de la interfaz que antes estaban sueltos:
//   frame-rings.js, forum.js, profile.js, updates.js, music.js, roommates.js, ui-organize.js,
//   clans.js, halloween-cos.js, halloween.js, social-dock (panel Social a la derecha)
// Se carga DESPUÉS de app.js y chat.js. El orden de las secciones importa (profile usa el foro,
// clans y halloween usan la tienda de arriba). Cada sección va en su propio try/catch: si una falla, las demás siguen.
// chat.js NO se incluye acá porque también lo usa chat-window.html.
// Para BORRAR el evento de Halloween cuando termine: eliminá solo lo que está entre los carteles
// BEGIN/END del final. La sección "Cosméticos del evento" NO se borra nunca.

// ======================================================================
// Ornamentos reales por marco (corona, laurel, llamas...)
// ======================================================================
try {
// Vivet Client - ornamentos: una pieza vectorial propia por cada marco de la tienda.
// Una sola definicion sirve para el perfil/tienda (SVG) y para el canvas del juego (Path2D con los MISMOS paths).
// Cada ornamento: w,h (caja del dibujo), k (ancho en radios del disco, def. 1.5), lift (altura de la base sobre el centro, en radios, def. 0.8),
// rot (inclinacion, rad) y layers: { d: path, g: [colores vertical] | c: color, s: borde, nf: sin relleno (solo trazo), sw: grosor }.
// Para agregar uno: una entrada en ORN con el id del marco (f_xxx). Sin tocar shop.js.
(() => {
  const rad = (d) => d * Math.PI / 180, f = (n) => Math.round(n * 100) / 100;
  const poly = (pts) => 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0Z`;
  const circle = (cx, cy, r) => ell(cx, cy, r, r);
  const star = (cx, cy, R, r, n = 5) => {
    const pts = [];
    for (let i = 0; i < 2 * n; i++) { const a = rad(-90 + i * 180 / n), rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    return poly(pts);
  };
  const leaf = (x, y, deg, len, wid) => {
    const a = rad(deg), ca = Math.cos(a), sa = Math.sin(a), tx = x + len * ca, ty = y + len * sa, mx = x + len * .5 * ca, my = y + len * .5 * sa;
    return `M${f(x)} ${f(y)}Q${f(mx - sa * wid)} ${f(my + ca * wid)} ${f(tx)} ${f(ty)}Q${f(mx + sa * wid)} ${f(my - ca * wid)} ${f(x)} ${f(y)}Z`;
  };
  const heart = (cx, cy, s) => `M${f(cx)} ${f(cy + .95 * s)}C${f(cx - 1.7 * s)} ${f(cy - .1 * s)} ${f(cx - .95 * s)} ${f(cy - 1.15 * s)} ${f(cx)} ${f(cy - .4 * s)}C${f(cx + .95 * s)} ${f(cy - 1.15 * s)} ${f(cx + 1.7 * s)} ${f(cy - .1 * s)} ${f(cx)} ${f(cy + .95 * s)}Z`;
  const flame = (cx, by, w, h) => `M${f(cx)} ${f(by - h)}C${f(cx + w * .25)} ${f(by - h * .68)} ${f(cx + w)} ${f(by - h * .5)} ${f(cx + w * .72)} ${f(by - h * .16)}C${f(cx + w * .5)} ${f(by + h * .02)} ${f(cx - w * .5)} ${f(by + h * .02)} ${f(cx - w * .72)} ${f(by - h * .16)}C${f(cx - w)} ${f(by - h * .5)} ${f(cx - w * .25)} ${f(by - h * .68)} ${f(cx)} ${f(by - h)}Z`;
  const shard = (cx, by, w, h, lean) => poly([[cx + lean, by - h], [cx + w / 2, by - h * .45], [cx + w * .4, by], [cx - w * .4, by], [cx - w / 2, by - h * .45]]);
  const chevron = (cx, y, wid, th) => poly([[cx - wid, y + wid * .6], [cx, y], [cx + wid, y + wid * .6], [cx + wid, y + wid * .6 + th], [cx, y + th], [cx - wid, y + wid * .6 + th]]);
  const arc = (cx, cy, r, d1, d2) => { const a = rad(d1), b = rad(d2); return `M${f(cx + r * Math.sin(a))} ${f(cy - r * Math.cos(a))}A${r} ${r} 0 0 1 ${f(cx + r * Math.sin(b))} ${f(cy - r * Math.cos(b))}`; };
  // Para seguir la curva del disco: punto a `a` grados desde arriba, con la geometria (w,h,k,lift) del ornamento.
  const geo = (w, h, k = 1.5, lift = .8) => { const R = w / k, cx = w / 2, cy = h + lift * R; return { R, cx, cy, at: (a, off = 0) => [cx + (R + off) * Math.sin(rad(a)), cy - (R + off) * Math.cos(rad(a))] }; };
  const crescent = (x1, y1, R, x2, y2, r) => {
    const d = Math.hypot(x2 - x1, y2 - y1), a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R * R - a * a));
    const ux = (x2 - x1) / d, uy = (y2 - y1) / d, px = x1 + a * ux, py = y1 + a * uy;
    const P = [px + h * -uy, py + h * ux], Q = [px - h * -uy, py - h * ux];
    return `M${f(P[0])} ${f(P[1])}A${R} ${R} 0 1 0 ${f(Q[0])} ${f(Q[1])}A${r} ${r} 0 1 1 ${f(P[0])} ${f(P[1])}Z`;
  };

  // Corona (se reutiliza chica dentro del marco Inmortal)
  const crown = (s, dx, dy) => {
    const T = (x, y) => [dx + x * s, dy + y * s], P = (a) => poly(a.map((p) => T(p[0], p[1]))), C = (x, y, r) => circle(dx + x * s, dy + y * s, r * s);
    return [
      { d: P([[8, 56], [4, 14], [28, 34], [50, 6], [72, 34], [96, 14], [92, 56]]), g: ['#fff6c2', '#facc15', '#b45309'], s: '#7c4a03' },
      { d: P([[8, 56], [92, 56], [90, 45], [10, 45]]), g: ['#fde047', '#a16207'], s: '#7c4a03' },
      { d: C(4, 12, 5) + C(50, 5, 5) + C(96, 12, 5), c: '#fff6c2', s: '#b45309' },
      { d: C(50, 33, 5), c: '#ef4444', s: '#7f1d1d' },
      { d: C(28, 51, 3) + C(50, 51, 3) + C(72, 51, 3), c: '#38bdf8', s: '#0c4a6e' },
    ];
  };

  const ORN = {};

  ORN.f_crown = { w: 100, h: 60, rot: -0.1, layers: crown(1, 0, 0) };

  // Dorado: corona de laurel que sigue el borde de la foto
  (() => {
    const w = 100, h = 38, g = geo(w, h), L = [{ d: arc(g.cx, g.cy, g.R + 1, -70, 70), nf: true, s: '#a16207', sw: 2 }];
    for (const sg of [-1, 1]) for (const a of [8, 19, 30, 41, 52, 63]) {
      const [x, y] = g.at(sg * a, 1), vx = -sg * Math.cos(rad(a)), vy = -Math.sin(rad(a)), nx = sg * Math.sin(rad(a)), ny = -Math.cos(rad(a));
      const dx = vx * .75 + nx * .65, dy = vy * .75 + ny * .65, ang = Math.atan2(dy, dx) * 180 / Math.PI;
      L.push({ d: leaf(x, y, ang, 24, 9), g: ['#fff6c2', '#f5c542', '#a8780f'], s: '#7c4a03' });
    }
    L.push({ d: circle(50, 12, 4), c: '#fff6c2', s: '#a8780f' });
    ORN.f_gold = { w, h, rot: 0, layers: L };
  })();

  // Hielo: cristales
  ORN.f_ice = { w: 100, h: 46, rot: 0, layers: [
    { d: shard(12, 46, 14, 26, -3) + shard(88, 46, 14, 26, 3), g: ['#ffffff', '#8fe3ff', '#3d8fc4'], s: '#1e6a9e' },
    { d: shard(30, 46, 18, 38, -4) + shard(70, 46, 18, 38, 4), g: ['#ffffff', '#8fe3ff', '#3d8fc4'], s: '#1e6a9e' },
    { d: shard(50, 46, 22, 46, 0), g: ['#ffffff', '#b8efff', '#3d8fc4'], s: '#1e6a9e' },
    { d: poly([[50, 4], [54, 20], [50, 40], [47, 20]]), c: '#ffffff' },
  ] };

  // Neon: aureola flotante de doble tubo
  ORN.f_neon = { w: 100, h: 26, k: 1.5, lift: 1.34, rot: -0.08, layers: [
    { d: ell(50, 14, 38, 9), nf: true, s: '#17e0e8', sw: 4.5 },
    { d: ell(50, 12, 38, 9), nf: true, s: '#ff3df0', sw: 4.5 },
    { d: ell(50, 12, 38, 9), nf: true, s: '#ffe4fb', sw: 1.4 },
  ] };

  // Fuego: llamas
  ORN.f_fire = { w: 100, h: 54, lift: .85, rot: 0, layers: [
    { d: flame(14, 54, 12, 22) + flame(86, 54, 12, 22), g: ['#ff9a2b', '#dc2626', '#8a1000'], s: '#7a1200' },
    { d: flame(31, 54, 17, 40) + flame(69, 54, 17, 40), g: ['#ffb02b', '#f0401a', '#a31200'], s: '#7a1200' },
    { d: flame(50, 54, 22, 54), g: ['#ffd23f', '#f97316', '#c21500'], s: '#7a1200' },
    { d: flame(50, 54, 11, 30), g: ['#fffbe0', '#ffec7a', '#ffb02b'] },
  ] };

  // Arcoiris: arco con nubes
  ORN.f_rainbow = { w: 100, h: 46, lift: .85, rot: 0, layers: [
    { d: arc(50, 46, 40, -90, 90), nf: true, s: '#ff3b3b', sw: 6 },
    { d: arc(50, 46, 34, -90, 90), nf: true, s: '#ffb02b', sw: 6 },
    { d: arc(50, 46, 28, -90, 90), nf: true, s: '#4cff6a', sw: 6 },
    { d: arc(50, 46, 22, -90, 90), nf: true, s: '#2bd6ff', sw: 6 },
    { d: arc(50, 46, 16, -90, 90), nf: true, s: '#a56bff', sw: 6 },
    { d: circle(10, 42, 7) + circle(20, 43, 6) + circle(2, 44, 5), c: '#ffffff', s: '#9fb3c8' },
    { d: circle(90, 42, 7) + circle(80, 43, 6) + circle(98, 44, 5), c: '#ffffff', s: '#9fb3c8' },
  ] };

  // Esmeralda: gema tallada
  ORN.f_emerald = { w: 60, h: 56, k: 1.0, lift: .9, rot: 0, layers: [
    { d: poly([[14, 4], [46, 4], [58, 20], [30, 56], [2, 20]]), c: '#10b981', s: '#064e3b' },
    { d: poly([[14, 4], [46, 4], [40, 20], [20, 20]]), c: '#a7f3d0' },
    { d: poly([[14, 4], [20, 20], [2, 20]]), c: '#34d399' }, { d: poly([[46, 4], [58, 20], [40, 20]]), c: '#059669' },
    { d: poly([[20, 20], [40, 20], [30, 56]]), c: '#10b981' }, { d: poly([[2, 20], [20, 20], [30, 56]]), c: '#047857' }, { d: poly([[40, 20], [58, 20], [30, 56]]), c: '#065f46' },
    { d: poly([[14, 4], [46, 4], [58, 20], [30, 56], [2, 20]]), nf: true, s: '#064e3b', sw: 1.6 },
    { d: poly([[20, 8], [28, 8], [24, 14]]), c: '#ecfdf5' },
  ] };

  // Sakura: flores de cerezo
  (() => {
    const L = [];
    const flower = (cx, cy, R) => {
      let d = '';
      for (let i = 0; i < 5; i++) d += leaf(cx, cy, -90 + i * 72, R, R * .5);
      L.push({ d, g: ['#fff1f7', '#f9a8d4', '#ec4899'], s: '#be185d' });
      L.push({ d: circle(cx, cy, R * .18), c: '#facc15', s: '#a16207' });
    };
    flower(24, 28, 16); flower(76, 28, 16); flower(50, 22, 21);
    ORN.f_sakura = { w: 100, h: 44, lift: .85, rot: 0, layers: [{ d: circle(8, 36, 2.2) + circle(94, 38, 2.2) + circle(38, 6, 2) + circle(64, 5, 2), c: '#fbcfe8' }, ...L] };
  })();

  // Sombra: luna creciente y estrellas
  ORN.f_shadow = { w: 80, h: 56, k: 1.2, lift: .85, rot: -0.15, layers: [
    { d: crescent(36, 30, 24, 46, 24, 20), g: ['#ede9fe', '#8b5cf6', '#2e1065'], s: '#2e1065' },
    { d: star(62, 14, 7, 2.2, 4) + star(70, 38, 5, 1.6, 4) + star(12, 8, 4, 1.3, 4), c: '#ddd6fe' },
  ] };

  // Electrico: rayos
  (() => {
    const bolt = (s, dx, dy) => poly([[50, 0], [26, 28], [44, 28], [34, 48], [74, 18], [54, 18], [70, 0]].map((p) => [dx + p[0] * s, dy + p[1] * s]));
    ORN.f_electric = { w: 100, h: 48, lift: .85, rot: 0, layers: [
      { d: bolt(.55, -18, 22) + bolt(.55, 44, 22), g: ['#e0f2fe', '#38bdf8', '#0369a1'], s: '#0c4a6e' },
      { d: bolt(1, 0, 0), g: ['#fffbe0', '#fde047', '#38bdf8'], s: '#0c4a6e' },
    ] };
  })();

  // Galaxia: planeta con anillo y estrellas
  ORN.f_galaxy = { w: 100, h: 48, lift: .85, rot: -0.1, layers: [
    { d: star(14, 12, 6, 1.8, 4) + star(90, 10, 5, 1.6, 4) + star(86, 38, 4, 1.3, 4) + star(12, 38, 4, 1.3, 4), c: '#fff6c2' },
    { d: circle(50, 28, 15), g: ['#f0abfc', '#7c3aed', '#1e1b4b'], s: '#1e1b4b' },
    { d: ell(50, 28, 36, 7), nf: true, s: '#c4b5fd', sw: 3 },
    { d: ell(50, 28, 36, 7), nf: true, s: '#6d28d9', sw: 1 },
  ] };

  // Lava: cuernos de demonio
  ORN.f_lava = { w: 100, h: 44, lift: .85, rot: 0, layers: [
    { d: 'M24 44C26 26 20 12 6 2C26 4 44 18 44 44Z', g: ['#fde047', '#dc2626', '#450a0a'], s: '#3b0a0a' },
    { d: 'M76 44C74 26 80 12 94 2C74 4 56 18 56 44Z', g: ['#fde047', '#dc2626', '#450a0a'], s: '#3b0a0a' },
    { d: circle(50, 40, 3), c: '#f97316' },
  ] };

  // Rangos
  ORN.f_rank_suplente = { w: 60, h: 24, k: 1.0, lift: .9, layers: [{ d: chevron(30, 2, 26, 12), g: ['#e0fbff', '#22d3ee', '#0e7490'], s: '#083344' }] };
  ORN.f_rank_titular = { w: 60, h: 36, k: 1.0, lift: .9, layers: [
    { d: chevron(30, 2, 26, 11), g: ['#dbeafe', '#3b82f6', '#1e3a8a'], s: '#172554' },
    { d: chevron(30, 16, 26, 11), g: ['#dbeafe', '#3b82f6', '#1e3a8a'], s: '#172554' }] };
  ORN.f_rank_capitan = { w: 100, h: 40, lift: .85, rot: 0, layers: [
    { d: star(18, 26, 11, 4.8) + star(82, 26, 11, 4.8), g: ['#ede9fe', '#8b5cf6'], s: '#5b21b6' },
    { d: star(50, 18, 17, 7.4), g: ['#f5f3ff', '#a78bfa', '#6d28d9'], s: '#4c1d95' }] };
  (() => {
    let seams = '';
    for (let i = 0; i < 5; i++) { const a = rad(-90 + i * 72); seams += `M${f(22 + 8 * Math.cos(a))} ${f(22 + 8 * Math.sin(a))}L${f(22 + 19 * Math.cos(a))} ${f(22 + 19 * Math.sin(a))}`; }
    ORN.f_rank_crack = { w: 44, h: 44, k: .8, lift: .95, layers: [
      { d: circle(22, 22, 20), g: ['#ffffff', '#e5e7eb'], s: '#1f2937', sw: 1.8 },
      { d: seams, nf: true, s: '#1f2937', sw: 1.6 },
      { d: star(22, 22, 8.5, 8.5, 5), c: '#be185d', s: '#1f2937', sw: 1.4 }] };
  })();
  ORN.f_rank_idolo = { w: 70, h: 62, k: 1.2, lift: .9, rot: 0, layers: [
    { d: flame(35, 62, 20, 30), g: ['#fde047', '#f97316', '#c2410c'], s: '#7c2d12' },
    { d: star(35, 32, 30, 13), g: ['#fffbe0', '#fde047', '#f97316'], s: '#9a3412' },
    { d: star(35, 32, 13, 5.5), c: '#fff' }] };
  (() => {
    const L = [];
    for (const sg of [-1, 1]) {
      let d = '';
      [[192, 54, 11], [214, 50, 10.5], [238, 42, 10]].forEach(([a, len, wd]) => { d += leaf(sg < 0 ? 38 : 102, 44, sg < 0 ? a : 180 - a, len, wd); });
      L.push({ d, g: ['#ffffff', '#fecaca', '#ef4444'], s: '#7f1d1d' });
    }
    ORN.f_rank_inmortal = { w: 140, h: 56, k: 2.2, lift: .8, layers: [...L, ...crown(.72, 34, 13)] };
  })();

  // Logros
  ORN.f_ach_veteran = { w: 56, h: 62, k: 1.0, lift: .9, layers: [
    { d: 'M4 4L52 4L52 30C52 46 38 56 28 60C18 56 4 46 4 30Z', g: ['#e2e8f0', '#94a3b8', '#475569'], s: '#1e293b' },
    { d: star(28, 27, 15, 6.5), g: ['#fffbe0', '#fde047', '#ca8a04'], s: '#713f12' }] };
  ORN.f_ach_social = { w: 100, h: 46, lift: .85, layers: [
    { d: heart(19, 32, 11), g: ['#cffafe', '#22d3ee'], s: '#0e7490' }, { d: heart(81, 32, 11), g: ['#ede9fe', '#a78bfa'], s: '#5b21b6' },
    { d: heart(50, 24, 17), g: ['#fce7f3', '#f472b6', '#be185d'], s: '#831843' }] };
  ORN.f_ach_collector = { w: 60, h: 56, k: 1.0, lift: .9, layers: [
    { d: 'M10 10C-2 8 0 24 14 27M50 10C62 8 60 24 46 27', nf: true, s: '#a16207', sw: 3 },
    { d: 'M10 3L50 3L48 24C48 34 40 40 30 40C20 40 12 34 12 24Z', g: ['#fff6c2', '#facc15', '#b45309'], s: '#713f12' },
    { d: poly([[26, 40], [34, 40], [35, 48], [25, 48]]), c: '#ca8a04', s: '#713f12' },
    { d: poly([[16, 48], [44, 48], [48, 56], [12, 56]]), g: ['#5eead4', '#0f766e'], s: '#134e4a' },
    { d: star(30, 20, 7, 3), c: '#fff6c2' }] };
  ORN.f_ach_pet = { w: 56, h: 54, k: 1.0, lift: .9, layers: [
    { d: ell(9, 24, 5, 7) + ell(21, 11, 5.5, 8) + ell(35, 11, 5.5, 8) + ell(47, 24, 5, 7), g: ['#fef3c7', '#a3e635', '#4d7c0f'], s: '#365314' },
    { d: 'M28 26C40 26 46 40 44 46C42 52 34 50 28 50C22 50 14 52 12 46C10 40 16 26 28 26Z', g: ['#fef3c7', '#84cc16', '#4d7c0f'], s: '#365314' }] };

  // ---------- Marcos nuevos (a la venta)
  // Bronce: medalla con cinta
  ORN.f_bronze = { w: 60, h: 62, k: 1.0, lift: .9, layers: [
    { d: poly([[14, 30], [30, 30], [24, 60], [18, 54], [8, 58]]) + poly([[46, 30], [30, 30], [36, 60], [42, 54], [52, 58]]), g: ['#f87171', '#b91c1c'], s: '#7f1d1d' },
    { d: circle(30, 22, 20), g: ['#fde7cf', '#d08a4f', '#7a4a22'], s: '#4a2a10' },
    { d: circle(30, 22, 14), nf: true, s: '#7a4a22', sw: 1.4 },
    { d: star(30, 22, 10, 4.2), g: ['#fff3e0', '#e3a46a'], s: '#7a4a22' },
  ] };

  // Menta: ramita de hojas
  ORN.f_mint = { w: 80, h: 52, k: 1.2, lift: .88, layers: [
    { d: leaf(40, 52, -150, 34, 10) + leaf(40, 52, -30, 34, 10), g: ['#a7f3d0', '#14b8a6', '#0f766e'], s: '#064e3b' },
    { d: leaf(40, 52, -118, 44, 12) + leaf(40, 52, -62, 44, 12), g: ['#d1fae5', '#2dd4bf', '#0f766e'], s: '#064e3b' },
    { d: leaf(40, 52, -90, 50, 13), g: ['#ecfff6', '#6ee7b7', '#059669'], s: '#064e3b' },
    { d: 'M40 52L40 10', nf: true, s: '#ecfff6', sw: 1.1 },
  ] };

  // Oceano: tres olas con espuma
  ORN.f_ocean = { w: 100, h: 46, lift: .85, layers: [
    { d: 'M0 46C8 18 24 18 32 46Z', g: ['#bae6fd', '#0ea5e9', '#075985'], s: '#0c4a6e' },
    { d: 'M68 46C76 18 92 18 100 46Z', g: ['#bae6fd', '#0ea5e9', '#075985'], s: '#0c4a6e' },
    { d: 'M22 46C34 -2 66 -2 78 46Z', g: ['#e0f7ff', '#38bdf8', '#0369a1'], s: '#0c4a6e' },
    { d: 'M36 26C42 14 54 12 62 20', nf: true, s: '#ffffff', sw: 2.4 },
    { d: circle(66, 12, 2.2) + circle(72, 18, 1.6) + circle(30, 14, 2) + circle(14, 24, 1.6), c: '#ffffff' },
  ] };

  // Dulce: piruleta y caramelos envueltos
  (() => {
    const candy = (cx, cy) => ell(cx, cy, 9, 6.5) + poly([[cx - 8, cy], [cx - 19, cy - 7], [cx - 19, cy + 7]]) + poly([[cx + 8, cy], [cx + 19, cy - 7], [cx + 19, cy + 7]]);
    ORN.f_candy = { w: 100, h: 46, lift: .85, layers: [
      { d: candy(21, 34), g: ['#fbcfe8', '#f472b6'], s: '#be185d' },
      { d: candy(79, 34), g: ['#cffafe', '#22d3ee'], s: '#0e7490' },
      { d: poly([[48.5, 30], [51.5, 30], [51.5, 46], [48.5, 46]]), c: '#ffffff', s: '#9ca3af', sw: 1 },
      { d: circle(50, 18, 16), g: ['#fbcfe8', '#f472b6', '#be185d'], s: '#831843' },
      { d: circle(50, 18, 10), nf: true, s: '#ffffff', sw: 2.4 },
      { d: circle(50, 18, 4.6), nf: true, s: '#a5f3fc', sw: 2.2 },
    ] };
  })();

  // Atardecer: medio sol con rayos
  (() => {
    let rays = '';
    for (let a = -165; a <= -15; a += 30) rays += leaf(50, 46, a, 42, 4);
    ORN.f_sunset = { w: 100, h: 46, lift: .85, layers: [
      { d: rays, g: ['#fde047', '#fb923c'], s: '#9a3412', sw: 1 },
      { d: 'M26 46A24 24 0 0 1 74 46Z', g: ['#fff6c2', '#fb923c', '#be185d'], s: '#7c2d12' },
      { d: 'M35 46A15 15 0 0 1 65 46', nf: true, s: '#fff6c2', sw: 1.4 },
    ] };
  })();

  // Toxico: gotas de veneno y burbujas
  (() => {
    const drop = (cx, by, w, h) => `M${cx} ${by - h}C${cx + w} ${f(by - h * .45)} ${cx + w} ${by} ${cx} ${by}C${cx - w} ${by} ${cx - w} ${f(by - h * .45)} ${cx} ${by - h}Z`;
    const G = ['#ecfccb', '#84cc16', '#365314'];
    ORN.f_toxic = { w: 100, h: 50, lift: .85, layers: [
      { d: drop(18, 50, 8, 22) + drop(82, 50, 8, 22), g: G, s: '#1a2e05' },
      { d: drop(35, 50, 11, 34) + drop(65, 50, 11, 34), g: G, s: '#1a2e05' },
      { d: drop(50, 50, 13, 48), g: ['#f7fee7', '#a3e635', '#3f6212'], s: '#1a2e05' },
      { d: circle(24, 10, 3) + circle(76, 8, 2.4) + circle(60, 4, 2) + circle(40, 6, 2), c: '#d9f99d', s: '#365314', sw: 1 },
    ] };
  })();

  // Rubi: gema grande con dos pequenas
  ORN.f_ruby = { w: 100, h: 54, lift: .85, layers: [
    { d: poly([[36, 4], [64, 4], [78, 20], [50, 54], [22, 20]]), c: '#dc2626', s: '#450a0a' },
    { d: poly([[36, 4], [64, 4], [58, 20], [42, 20]]), c: '#fecaca' },
    { d: poly([[36, 4], [42, 20], [22, 20]]), c: '#f87171' }, { d: poly([[64, 4], [78, 20], [58, 20]]), c: '#b91c1c' },
    { d: poly([[42, 20], [58, 20], [50, 54]]), c: '#ef4444' }, { d: poly([[22, 20], [42, 20], [50, 54]]), c: '#991b1b' }, { d: poly([[58, 20], [78, 20], [50, 54]]), c: '#7f1d1d' },
    { d: poly([[36, 4], [64, 4], [78, 20], [50, 54], [22, 20]]), nf: true, s: '#450a0a', sw: 1.6 },
    { d: poly([[4, 36], [10, 28], [16, 36], [10, 48]]) + poly([[84, 36], [90, 28], [96, 36], [90, 48]]), g: ['#fecaca', '#ef4444', '#7f1d1d'], s: '#450a0a', sw: 1.3 },
    { d: poly([[41, 8], [47, 8], [44, 14]]), c: '#fff1f2' },
  ] };

  // Cyber: antenas y nucleo hexagonal
  ORN.f_cyber = { w: 100, h: 44, lift: .85, layers: [
    { d: poly([[6, 44], [12, 14], [22, 14], [18, 44]]) + poly([[94, 44], [88, 14], [78, 14], [82, 44]]), g: ['#fde047', '#a16207'], s: '#1c1500' },
    { d: poly([[24, 44], [30, 26], [38, 26], [36, 44]]) + poly([[76, 44], [70, 26], [62, 26], [64, 44]]), g: ['#67e8f9', '#0e7490'], s: '#083344' },
    { d: poly([[50, 2], [66, 12], [66, 30], [50, 40], [34, 30], [34, 12]]), g: ['#0b0f1a', '#164e63'], s: '#22d3ee', sw: 2 },
    { d: poly([[50, 12], [58, 17], [58, 26], [50, 31], [42, 26], [42, 17]]), c: '#fde047', s: '#a16207', sw: 1 },
  ] };

  // Real: corona purpura con joyas
  ORN.f_royal = { w: 100, h: 54, lift: .85, layers: [
    { d: poly([[10, 52], [6, 12], [30, 30], [50, 6], [70, 30], [94, 12], [90, 52]]), g: ['#e9d5ff', '#a855f7', '#3b0764'], s: '#2e1065' },
    { d: poly([[10, 52], [90, 52], [89, 42], [11, 42]]), g: ['#fde047', '#a16207'], s: '#713f12' },
    { d: circle(6, 10, 4.5) + circle(50, 5, 4.5) + circle(94, 10, 4.5), c: '#fff6c2', s: '#a16207' },
    { d: circle(50, 29, 5), c: '#f472b6', s: '#831843' },
    { d: circle(28, 47, 2.6) + circle(50, 47, 2.6) + circle(72, 47, 2.6), c: '#38bdf8', s: '#0c4a6e', sw: 1 },
  ] };

  // Diamante: gema tallada con destellos
  ORN.f_diamond = { w: 100, h: 54, lift: .85, layers: [
    { d: poly([[30, 4], [70, 4], [90, 20], [50, 54], [10, 20]]), c: '#e0f2fe', s: '#3730a3' },
    { d: poly([[30, 4], [70, 4], [62, 20], [38, 20]]), c: '#ffffff' },
    { d: poly([[30, 4], [38, 20], [10, 20]]), c: '#e0f2fe' }, { d: poly([[70, 4], [90, 20], [62, 20]]), c: '#c7d2fe' },
    { d: poly([[38, 20], [62, 20], [50, 54]]), c: '#a5f3fc' }, { d: poly([[10, 20], [38, 20], [50, 54]]), c: '#7dd3fc' }, { d: poly([[62, 20], [90, 20], [50, 54]]), c: '#818cf8' },
    { d: poly([[30, 4], [70, 4], [90, 20], [50, 54], [10, 20]]), nf: true, s: '#3730a3', sw: 1.6 },
    { d: star(10, 8, 6, 1.4, 4) + star(92, 44, 5, 1.2, 4) + star(8, 46, 4, 1.1, 4), c: '#ffffff', s: '#7dd3fc', sw: .8 },
  ] };

  // Halloween
  ORN.f_hw_pumpkin = { w: 72, h: 56, k: 1.1, lift: .85, layers: [
    { d: ell(17, 35, 16, 18) + ell(55, 35, 16, 18), g: ['#ffb347', '#e85d04', '#9a3412'], s: '#5a1f00' },
    { d: ell(36, 34, 18, 21), g: ['#ffc46b', '#ff6a00', '#b34700'], s: '#5a1f00' },
    { d: poly([[32, 15], [40, 15], [43, 3], [37, 1]]), g: ['#84cc16', '#365314'], s: '#1a2e05' },
    { d: poly([[22, 30], [31, 30], [26.5, 21]]) + poly([[41, 30], [50, 30], [45.5, 21]]) + poly([[20, 40], [26, 45], [31, 41], [36, 46], [41, 41], [46, 45], [52, 40], [49, 50], [23, 50]]), c: '#2a0f00' },
    { d: poly([[24, 29], [29, 29], [26.5, 24]]) + poly([[43, 29], [48, 29], [45.5, 24]]), c: '#ffd27a' }] };
  ORN.f_hw_ghost = { w: 56, h: 62, k: .9, lift: .9, rot: .1, layers: [
    { d: 'M6 62L6 26C6 10 16 2 28 2C40 2 50 10 50 26L50 62L42 54L35 62L28 54L21 62L14 54Z', g: ['#ffffff', '#e4dcff', '#a99be0'], s: '#5b4b9a' },
    { d: ell(20, 26, 3.6, 5.5) + ell(36, 26, 3.6, 5.5) + ell(28, 40, 3.4, 4.5), c: '#1f1535' },
    { d: circle(13, 36, 3) + circle(43, 36, 3), c: '#f9a8d4' }] };

  // ---------- SVG (perfil y tienda)
  let uid = 0;
  function svg(id) {
    const o = ORN[id];
    if (!o) return '';
    const n = ++uid, defs = [], k = o.k || 1.5, lift = o.lift == null ? .8 : o.lift;
    const body = o.layers.map((l, i) => {
      let fill = l.c || '#fff';
      if (l.g) {
        const gid = `ornG${n}_${i}`;
        defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${l.g.map((c, j) => `<stop offset="${j / (l.g.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`);
        fill = `url(#${gid})`;
      }
      const st = l.s ? ` stroke="${l.s}" stroke-width="${l.sw || 1.6}" stroke-linejoin="round" stroke-linecap="round"` : '';
      return `<path d="${l.d}" fill="${l.nf ? 'none' : fill}"${st}/>`;
    }).join('');
    const style = `width:${(k / 2 * 100).toFixed(1)}%;top:${((1 - lift) / 2 * 100).toFixed(1)}%;transform:translate(-50%,-100%) rotate(${((o.rot || 0) * 180 / Math.PI).toFixed(1)}deg)`;
    return `<svg class="orn-svg" viewBox="0 0 ${o.w} ${o.h}" aria-hidden="true" style="${style}"><defs>${defs.join('')}</defs>${body}</svg>`;
  }

  // Envuelve un <img> de avatar para poner el ornamento encima (perfil). Idempotente.
  function wrap(av, id, mt) {
    if (!av || !ORN[id] || av.parentNode.classList.contains('orn-wrap')) return;
    const w = document.createElement('span');
    w.className = 'orn-wrap';
    if (mt) w.style.marginTop = mt + 'px';
    av.replaceWith(w);
    w.append(av);
    w.insertAdjacentHTML('beforeend', svg(id));
  }

  // Datos para el canvas del juego (viajan serializados dentro de `ring`)
  const forCanvas = (id) => { const o = ORN[id]; return o ? { w: o.w, h: o.h, k: o.k || 1.5, lift: o.lift == null ? .8 : o.lift, rot: o.rot || 0, layers: o.layers } : null; };

  if (typeof document !== 'undefined') {
    const css = document.createElement('style');
    css.textContent = `
    .orn-wrap{position:relative;display:inline-flex;flex-shrink:0}
    .orn-svg{position:absolute;left:50%;height:auto;overflow:visible;pointer-events:none;z-index:2;transform-origin:50% 100%;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}`;
    document.head.appendChild(css);
  }
  (typeof window !== 'undefined' ? window : globalThis).vivetOrn = { has: (id) => !!ORN[id], ids: () => Object.keys(ORN), svg, wrap, forCanvas };
})();

} catch (err) { console.error("[app2] ornamentos:", err); }

// ======================================================================
// Aros de marcos para el canvas del juego  (antes: frame-rings.js)
// ======================================================================
try {
  // Vivet Client - renderer/frame-rings.js
  // Convierte el marco de la tienda que llevas puesto (f_gold, f_fire, f_hw_pumpkin...) en una descripcion simple del aro
  // (tramos de color + velocidad de giro) para dibujarlo en el <canvas> del juego, alrededor del circulo con tu foto.
  // Los degradados son los MISMOS del CSS de la tienda (app2.js / halloween-cos.js), copiados tal cual.
  // Si agregas un marco nuevo a la tienda, agrega aqui una linea con su degradado (id: [repetido, degradado, segundos_por_vuelta, borde_px]).
  // Si falta, se usa un aro dorado generico en vez de no mostrar nada.
  // Expone: window.vivetFrameRing(id) -> { stops: [[0..1, '#rrggbb'], ...], spin: segundos, w: grosor relativo, glow: '#rrggbb' } | null
  (() => {
    // id: [repeating-conic-gradient?, "tramos de color", segundos por vuelta, grosor del borde en el perfil (px)]
    const FRAMES = {
      f_gold: [false, "#fff6c2,#f5c542 14%,#a8780f 28%,#f5c542 42%,#fff6c2 50%,#f5c542 64%,#a8780f 78%,#f5c542 92%,#fff6c2", 7, 4],
      f_ice: [false, "#ffffff,#8fe3ff 20%,#3d8fc4 40%,#d9f7ff 55%,#8fe3ff 75%,#ffffff", 11, 4],
      f_neon: [false, "#17e0e8,#17e0e8 20%,#04141a 30%,#ff3df0 50%,#ff3df0 70%,#04141a 80%,#17e0e8", 2.6, 4],
      f_fire: [false, "#c21500,#ff3b1a 12%,#ffb02b 25%,#ffec7a 33%,#ff7a18 45%,#c21500 58%,#ff3b1a 70%,#ffb02b 82%,#ff7a18 92%,#c21500", 2.4, 4],
      f_rainbow: [false, "#ff3b3b,#ffb02b,#f6ff4a,#4cff6a,#2bd6ff,#5b6bff,#ff3df0,#ff3b3b", 3.5, 4],
      f_rank_suplente: [false, "#e0fbff,#22d3ee 25%,#0e7490 50%,#22d3ee 75%,#e0fbff", 12, 4],
      f_rank_titular: [true, "#3b82f6 0 9deg,#1e3a8a 9deg 18deg", 14, 4],
      f_rank_capitan: [false, "#ede9fe 0 8%,#8b5cf6 0 17%,#5b21b6 0 25%,#c4b5fd 0 33%,#8b5cf6 0 42%,#ede9fe 0 50%,#5b21b6 0 58%,#c4b5fd 0 67%,#8b5cf6 0 75%,#ede9fe 0 83%,#5b21b6 0 92%,#c4b5fd 0 100%", 10, 4],
      f_rank_crack: [false, "#ec4899,#ec4899 20%,#1a0410 30%,#fbcfe8 50%,#fbcfe8 62%,#1a0410 78%,#ec4899", 2.8, 4],
      f_rank_idolo: [false, "#c2410c,#f97316 14%,#fde047 28%,#f97316 42%,#c2410c 56%,#f97316 70%,#fde047 84%,#c2410c", 2.6, 4],
      f_rank_inmortal: [false, "#ef4444,#fde047 16%,#7f1d1d 33%,#ef4444 50%,#fde047 66%,#7f1d1d 83%,#ef4444", 3, 5],
      f_emerald: [false, "#d1fae5,#10b981 18%,#047857 36%,#6ee7b7 50%,#10b981 68%,#065f46 84%,#d1fae5", 6, 4],
      f_sakura: [false, "#fff1f7,#f9a8d4 20%,#ec4899 40%,#fbcfe8 55%,#f9a8d4 75%,#fff1f7", 12, 4],
      f_shadow: [false, "#0b0714,#1f1534 25%,#7c3aed 45%,#1f1534 60%,#0b0714 80%,#4c1d95", 9, 4],
      f_electric: [false, "#0b1220 0 12%,#38bdf8 18%,#e0f2fe 22%,#0b1220 30% 55%,#38bdf8 62%,#e0f2fe 66%,#0b1220 74%", 1.8, 4],
      f_lava: [false, "#450a0a,#dc2626 20%,#f97316 38%,#fde047 46%,#f97316 54%,#dc2626 72%,#450a0a", 8, 4],
      f_galaxy: [false, "#0f0a2e,#4338ca 18%,#a855f7 34%,#f0abfc 42%,#6366f1 58%,#0f0a2e 76%,#7c3aed 90%,#0f0a2e", 10, 4],
      f_crown: [false, "#fff6c2,#facc15 12%,#b45309 26%,#fde047 40%,#fff6c2 50%,#facc15 62%,#b45309 76%,#fde047 90%,#fff6c2", 5, 5],
      f_ach_veteran: [true, "#cbd5e1 0 10deg,#475569 10deg 20deg", 16, 4],
      f_ach_social: [false, "#f472b6,#22d3ee 25%,#a78bfa 50%,#f472b6 75%,#22d3ee", 4, 4],
      f_ach_collector: [false, "#14b8a6 0 25%,#facc15 0 50%,#14b8a6 0 75%,#facc15 0 100%", 8, 4],
      f_ach_pet: [false, "#f59e0b,#84cc16 30%,#fde68a 50%,#84cc16 70%,#f59e0b", 5, 4],
      f_bronze: [false, "#fde7cf,#d08a4f 18%,#7a4a22 36%,#e3a46a 52%,#fde7cf 62%,#d08a4f 80%,#7a4a22 92%,#fde7cf", 9, 4],
      f_mint: [false, "#ecfff6,#6ee7b7 20%,#14b8a6 40%,#a7f3d0 55%,#2dd4bf 75%,#ecfff6", 8, 4],
      f_ocean: [false, "#e0f7ff,#38bdf8 18%,#0369a1 38%,#7dd3fc 52%,#0ea5e9 72%,#082f49 88%,#e0f7ff", 7, 4],
      f_candy: [false, "#fbcfe8,#f472b6 20%,#a5f3fc 40%,#fbcfe8 55%,#f472b6 75%,#a5f3fc 90%,#fbcfe8", 5, 4],
      f_sunset: [false, "#fde047,#fb923c 18%,#ec4899 38%,#7c3aed 58%,#ec4899 76%,#fb923c 90%,#fde047", 8, 4],
      f_toxic: [false, "#1a2e05,#84cc16 16%,#d9f99d 30%,#65a30d 46%,#1a2e05 60%,#a3e635 78%,#1a2e05", 3.2, 4],
      f_ruby: [false, "#fecaca,#ef4444 16%,#7f1d1d 34%,#f87171 48%,#fff1f2 52%,#dc2626 68%,#450a0a 86%,#fecaca", 6, 4],
      f_cyber: [false, "#fde047 0 12%,#0b0f1a 12% 22%,#22d3ee 22% 34%,#0b0f1a 34% 44%,#fde047 44% 56%,#0b0f1a 56% 66%,#22d3ee 66% 78%,#0b0f1a 78% 88%,#fde047 88% 100%", 2.2, 4],
      f_royal: [false, "#f5d0fe,#a855f7 16%,#581c87 32%,#facc15 44%,#a855f7 58%,#3b0764 76%,#facc15 88%,#f5d0fe", 6, 4],
      f_diamond: [false, "#ffffff,#bae6fd 12%,#e0e7ff 24%,#ffffff 32%,#a5f3fc 46%,#f5f3ff 60%,#ffffff 68%,#c7d2fe 82%,#ffffff", 4, 4],
      f_hw_pumpkin: [false, "#ff6a00,#ffb347 12%,#1a0b00 24%,#ff8a1f 36%,#ffb347 48%,#1a0b00 62%,#ff6a00 76%,#ffb347 88%,#ff6a00", 6, 4],
      f_hw_ghost: [false, "#ffffff,#d6c8ff 20%,#8b7fc4 40%,#f4f0ff 55%,#c7b8ff 75%,#ffffff", 12, 4],
    };
    const FALLBACK = [false, '#fff6c2,#f5c542 25%,#a8780f 50%,#f5c542 75%,#fff6c2', 8, 4];

    const pos = (s) => {
      if (s == null) return null;
      const n = parseFloat(s);
      if (!Number.isFinite(n)) return null;
      return /deg$/.test(s) ? n / 360 : /%$/.test(s) ? n / 100 : n / 100; // "0" cuenta como 0
    };

    // Mini-intérprete de los tramos de un conic-gradient: colores con 0, 1 o 2 posiciones (% o deg).
    function parseStops(text, repeating) {
      const items = text.split(',').map((t) => {
        const p = t.trim().split(/\s+/);
        return { c: p[0], a: pos(p[1]), b: pos(p[2]) };
      }).filter((x) => /^#[0-9a-f]{3,8}$/i.test(x.c));
      if (!items.length) return [];
      if (items[0].a == null) items[0].a = 0;
      const last = items[items.length - 1];
      if (last.a == null && !repeating) last.a = 1;
      // Posiciones que faltan: se reparten parejo entre las vecinas que sí tienen (igual que CSS).
      for (let i = 0; i < items.length; i++) {
        if (items[i].a != null) continue;
        let j = i; while (j < items.length && items[j].a == null) j++;
        const from = (items[i - 1].b != null ? items[i - 1].b : items[i - 1].a);
        const to = j < items.length ? items[j].a : 1;
        for (let k = i; k < j; k++) items[k].a = from + ((to - from) * (k - i + 1)) / (j - i + 1);
      }
      let out = [], prev = 0;
      for (const it of items) {
        const a = Math.max(prev, it.a); out.push([a, it.c]); prev = a;
        if (it.b != null) { const b = Math.max(prev, it.b); out.push([b, it.c]); prev = b; }
      }
      if (repeating) {
        const period = out[out.length - 1][0];
        if (period > 0.001) {
          const base = out.slice(), all = [];
          for (let k = 0; k * period < 0.999; k++) for (const [o, c] of base) { const v = o + k * period; if (v <= 1.0001) all.push([Math.min(1, v), c]); }
          out = all;
        }
      }
      // Por redondeo de decimales algun tramo repetido puede quedar un pelo por debajo del anterior: se corrige.
      for (let i = 1; i < out.length; i++) if (out[i][0] < out[i - 1][0]) out[i][0] = out[i - 1][0];
      return out;
    }

    // Color del resplandor: el tramo más "vivo" (saturado y ni muy oscuro ni muy claro).
    function glowOf(stops) {
      let best = '#ffffff', score = -1;
      for (const [, c] of stops) {
        const h = c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c;
        const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = (mx + mn) / 510;
        const s = (mx - mn) * (1 - Math.abs(lum - 0.55) * 1.2);
        if (s > score) { score = s; best = h; }
      }
      return best;
    }

    const cache = new Map();
    window.vivetFrameRing = (id) => {
      if (!id || typeof id !== 'string' || !/^f_[a-z0-9_]+$/.test(id)) return null;
      if (cache.has(id)) return cache.get(id);
      const [rep, grad, spin, bw] = FRAMES[id] || FALLBACK;
      const stops = parseStops(grad, rep);
      const ring = stops.length ? { stops, spin, w: bw >= 5 ? 1.25 : 1, glow: glowOf(stops), orn: window.vivetOrn ? window.vivetOrn.forCanvas(id) : null } : null;
      cache.set(id, ring);
      return ring;
    };
  })();
} catch (err) { console.error("[app2] frame-rings.js:", err); }

// ======================================================================
// Foro  (antes: forum.js)
// ======================================================================
try {
  // Vivet Client - renderer/forum.js
  // Foro dentro de Social: publicaciones con texto, foto y/o clip (link), me gusta y comentarios.
  // Se carga DESPUÉS de app.js (usa window.vivetApi, escapeHtml, showToast y FRIENDS_API_URL).
  (() => {
    const $ = (s) => document.querySelector(s);
    const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (method, path, body) => api().request(method, path, body);

    const heartSvg = (on) => `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.7 2.7 5 6.3 5c2.1 0 3.6 1.1 4.4 2.6h2.6C14.1 6.1 15.6 5 17.7 5c3.6 0 5.3 3.7 3.9 6.8C19.5 16.4 12 21 12 21z"/></svg>`;
    const IMG_MAX_BYTES = 140 * 1024; // el server acepta hasta 150 KB
    const IMG_MAX_SIDE = 960;

    const panel = $('#panel-foro');
    const loginBox = $('#forum-login-hint'), mainBox = $('#forum-main');
    const listEl = $('#forum-list'), moreBtn = $('#forum-more');
    const textEl = $('#forum-text'), clipEl = $('#forum-clip'), fileEl = $('#forum-img-file');
    const imgBtn = $('#forum-img-btn'), prevEl = $('#forum-img-preview'), postBtn = $('#forum-post-btn');
    const countEl = $('#forum-count');
    if (!panel || !listEl || !textEl) return;

    let image = ''; // data URL de la foto elegida
    let mine = false;
    let posts = [];
    let more = false;
    let loading = false;
    const openComments = new Map(); // id de publicación -> { list: [], loaded }

    // ------------------------------------------------------------ utilidades
    function ago(ts) {
      const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return 'ahora';
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
      if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
      return new Date(ts).toLocaleDateString();
    }
    const nameOf = (a) => esc(a.haxball_nick ? `${a.haxball_nick} (${a.username})` : a.username);
    const avatarOf = (a) => `<img class="fr-avatar fo-avatar fo-link" data-act="profile" data-uid="${esc(a.id)}" alt="" src="${esc(a.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;

    function youtubeId(u) {
      try {
        const x = new URL(u);
        const h = x.hostname.replace(/^www\.|^m\./, '');
        if (h === 'youtu.be') return x.pathname.slice(1).split('/')[0] || '';
        if (h === 'youtube.com') {
          if (x.pathname === '/watch') return x.searchParams.get('v') || '';
          const m = /^\/(shorts|embed|live)\/([\w-]{6,20})/.exec(x.pathname);
          if (m) return m[2];
        }
      } catch (_) {}
      return '';
    }
    const isVideoFile = (u) => {
      try {
        const x = new URL(u);
        return /(^|\.)(cdn\.discordapp\.com|media\.discordapp\.net)$/.test(x.hostname) && /\.(mp4|webm|mov)$/i.test(x.pathname);
      } catch (_) { return false; }
    };
    function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return 'link'; } }

    function clipHtml(u) {
      if (!u) return '';
      if (isVideoFile(u)) {
        return `<video class="fo-video" controls preload="metadata" src="${esc(u)}"></video>`;
      }
      const yt = youtubeId(u);
      const thumb = yt ? `<img class="fo-clip-thumb" alt="" loading="lazy" src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" onerror="this.remove()" />` : '';
      return `<div class="fo-clip">${thumb}<div class="fo-clip-info"><span class="fo-clip-tag">Clip</span><span class="fo-clip-host">${esc(hostOf(u))}</span></div><button class="primary-btn fo-clip-open" type="button" data-act="open-clip" data-url="${esc(u)}">Ver clip</button></div>`;
    }

    // ------------------------------------------------------------ render
    function commentsHtml(p) {
      const st = openComments.get(p.id);
      if (!st) return '';
      const items = st.list.map((c) => `
        <div class="fo-comment" data-cid="${esc(c.id)}">
          ${avatarOf(c.author)}
          <div class="fo-comment-body">
            <div class="fo-comment-head"><b class="fo-link" data-act="profile" data-uid="${esc(c.author.id)}">${nameOf(c.author)}</b> <span>${ago(c.created_at)}</span></div>
            <div class="fo-text">${esc(c.body)}</div>
          </div>
          ${c.can_delete ? `<button class="ghost-btn secondary-action" type="button" data-act="del-comment" data-cid="${esc(c.id)}">Borrar</button>` : ''}
        </div>`).join('');
      const empty = st.loaded && !st.list.length ? '<p class="hint" style="margin:6px 0;">Todavía no hay comentarios.</p>' : '';
      const load = st.loaded ? '' : '<p class="hint" style="margin:6px 0;">Cargando…</p>';
      return `<div class="fo-comments">${load}${empty}${items}
        <div class="fo-comment-form">
          <input type="text" maxlength="300" placeholder="Escribí un comentario…" data-role="comment-input" />
          <button class="primary-btn" type="button" data-act="send-comment">Enviar</button>
        </div></div>`;
    }

    function postHtml(p) {
      const body = p.body ? `<div class="fo-text">${esc(p.body)}</div>` : '';
      const img = p.has_image ? `<img class="fo-image" alt="" loading="lazy" data-act="zoom" src="${esc(API)}/forum/posts/${esc(p.id)}/image" />` : '';
      return `<article class="card fo-post" data-id="${esc(p.id)}">
        <div class="fo-head">${avatarOf(p.author)}
          <div class="fo-head-info"><div class="fo-name fo-link" data-act="profile" data-uid="${esc(p.author.id)}">${nameOf(p.author)}</div><div class="hint">${ago(p.created_at)}</div></div>
          ${p.mine ? '<button class="ghost-btn secondary-action" type="button" data-act="del-post">Eliminar</button>'
            : '<button class="ghost-btn secondary-action" type="button" data-act="report">Reportar</button>'}
        </div>
        ${body}${img}${clipHtml(p.clip_url)}
        <div class="fo-actions">
          <button class="fo-act ${p.liked ? 'on' : ''}" type="button" data-act="like">${heartSvg(p.liked)} <span>${p.likes}</span></button>
          <button class="fo-act" type="button" data-act="toggle-comments">Comentarios <span>${p.comments}</span></button>
        </div>
        ${commentsHtml(p)}
      </article>`;
    }

    function render() {
      if (!posts.length) {
        listEl.innerHTML = `<p class="hint" style="margin:8px 32px;">${loading ? 'Cargando…' : (mine ? 'Todavía no publicaste nada.' : 'Todavía no hay publicaciones. ¡Sé el primero!')}</p>`;
      } else {
        // No se pisa lo que estás escribiendo en un comentario al volver a dibujar.
        const keep = {};
        listEl.querySelectorAll('.fo-post').forEach((a) => {
          const i = a.querySelector('[data-role="comment-input"]');
          if (i && i.value) keep[a.dataset.id] = i.value;
        });
        listEl.innerHTML = posts.map(postHtml).join('');
        for (const id in keep) {
          const i = listEl.querySelector(`.fo-post[data-id="${CSS.escape(id)}"] [data-role="comment-input"]`);
          if (i) i.value = keep[id];
        }
      }
      if (moreBtn) moreBtn.hidden = !more;
    }

    // ------------------------------------------------------------ datos
    async function load(append) {
      if (loading || !loggedIn()) return;
      loading = true;
      if (!append) render();
      try {
        const before = append && posts.length ? `&before=${encodeURIComponent(posts[posts.length - 1].id)}` : '';
        const r = await req('GET', `/forum/posts?mine=${mine ? 1 : 0}${before}`);
        posts = append ? posts.concat(r.posts || []) : (r.posts || []);
        more = !!r.more;
      } catch (e) {
        toast(e.message || 'No se pudo cargar el foro');
      }
      loading = false;
      render();
    }

    async function loadComments(id) {
      const st = openComments.get(id);
      if (!st) return;
      try {
        const r = await req('GET', `/forum/posts/${encodeURIComponent(id)}/comments`);
        st.list = r.comments || [];
        const p = posts.find((x) => x.id === id);
        if (p) p.comments = st.list.length;
      } catch (e) { toast(e.message || 'No se pudieron cargar los comentarios'); }
      st.loaded = true;
      render();
    }

    // ------------------------------------------------------------ componer
    function setPreview() {
      if (!prevEl) return;
      prevEl.hidden = !image;
      prevEl.innerHTML = image ? `<img alt="" src="${esc(image)}" /><button class="ghost-btn secondary-action" type="button" id="forum-img-remove">Quitar foto</button>` : '';
      $('#forum-img-remove')?.addEventListener('click', () => { image = ''; if (fileEl) fileEl.value = ''; setPreview(); });
    }

    // Reduce la foto a 960 px como máximo y la comprime hasta que entre en ~140 KB.
    async function compress(file) {
      const bmp = await createImageBitmap(file);
      let side = IMG_MAX_SIDE;
      for (let tries = 0; tries < 6; tries++) {
        const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bmp.width * k));
        c.height = Math.max(1, Math.round(bmp.height * k));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        for (const q of [0.85, 0.72, 0.58, 0.45]) {
          const url = c.toDataURL('image/webp', q);
          if (!url.startsWith('data:image/webp')) throw new Error('webp no disponible');
          if ((url.length - url.indexOf(',') - 1) * 0.75 <= IMG_MAX_BYTES) return url;
        }
        side = Math.round(side * 0.75);
      }
      throw new Error('too big');
    }

    imgBtn?.addEventListener('click', () => fileEl && fileEl.click());
    fileEl?.addEventListener('change', async () => {
      const f = fileEl.files && fileEl.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { fileEl.value = ''; return toast('Elegí una imagen'); }
      try { image = await compress(f); setPreview(); }
      catch (_) { image = ''; fileEl.value = ''; setPreview(); toast('No se pudo usar esa foto. Probá con otra.'); }
    });

    postBtn?.addEventListener('click', async () => {
      if (!loggedIn()) return;
      const body = textEl.value.trim(), clipUrl = (clipEl?.value || '').trim();
      if (!body && !image && !clipUrl) return toast('Escribí algo o agregá una foto o un clip');
      postBtn.disabled = true;
      try {
        await req('POST', '/forum/posts', { body, clip_url: clipUrl, image: image || undefined });
        textEl.value = ''; if (clipEl) clipEl.value = ''; image = ''; if (fileEl) fileEl.value = '';
        setPreview(); updateCount();
        toast('Publicado', 'ok');
        mine = false; syncFilter();
        await load(false);
      } catch (e) { toast(e.message || 'No se pudo publicar'); }
      postBtn.disabled = false;
    });

    function updateCount() { if (countEl) countEl.textContent = `${textEl.value.length}/1000`; }
    textEl.addEventListener('input', updateCount);

    // ------------------------------------------------------------ acciones sobre publicaciones
    listEl.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const art = t.closest('.fo-post');
      const id = art && art.dataset.id;
      const act = t.dataset.act;
      try {
        if (act === 'profile') {
          if (window.vivetProfile) window.vivetProfile.open(t.dataset.uid);
        } else if (act === 'open-clip') {
          const u = t.dataset.url || '';
          if (/^https:\/\//i.test(u)) window.vivet.openExternal(u);
        } else if (act === 'zoom') {
          t.classList.toggle('zoomed');
        } else if (act === 'like') {
          const r = await req('POST', `/forum/posts/${encodeURIComponent(id)}/like`);
          const p = posts.find((x) => x.id === id);
          if (p) { p.liked = r.liked; p.likes = r.likes; render(); }
        } else if (act === 'toggle-comments') {
          if (openComments.has(id)) { openComments.delete(id); render(); }
          else { openComments.set(id, { list: [], loaded: false }); render(); loadComments(id); }
        } else if (act === 'send-comment') {
          const input = art.querySelector('[data-role="comment-input"]');
          const body = (input.value || '').trim();
          if (!body) return;
          t.disabled = true;
          try { await req('POST', `/forum/posts/${encodeURIComponent(id)}/comments`, { body }); input.value = ''; await loadComments(id); }
          finally { t.disabled = false; }
        } else if (act === 'del-comment') {
          if (!confirm('¿Borrar este comentario?')) return;
          await req('DELETE', `/forum/comments/${encodeURIComponent(t.dataset.cid)}`);
          await loadComments(id);
        } else if (act === 'del-post') {
          if (!confirm('¿Eliminar esta publicación?')) return;
          await req('DELETE', `/forum/posts/${encodeURIComponent(id)}`);
          posts = posts.filter((x) => x.id !== id); openComments.delete(id); render();
          toast('Publicación eliminada', 'ok');
        } else if (act === 'report') {
          if (!confirm('¿Reportar esta publicación?')) return;
          await req('POST', `/forum/posts/${encodeURIComponent(id)}/report`, { reason: 'user-report' });
          toast('Reporte enviado', 'ok');
        }
      } catch (err) { toast(err.message || 'No se pudo completar la acción'); }
    });

    listEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('[data-role="comment-input"]')) {
        e.preventDefault();
        e.target.closest('.fo-post')?.querySelector('[data-act="send-comment"]')?.click();
      }
    });

    moreBtn?.addEventListener('click', () => load(true));
    $('#forum-refresh')?.addEventListener('click', () => { openComments.clear(); load(false); });

    // Filtro "Todo" / "Mis publicaciones"
    const fAll = $('#forum-f-all'), fMine = $('#forum-f-mine');
    function syncFilter() { fAll?.classList.toggle('on', !mine); fMine?.classList.toggle('on', mine); }
    fAll?.addEventListener('click', () => { if (mine) { mine = false; syncFilter(); load(false); } });
    fMine?.addEventListener('click', () => { if (!mine) { mine = true; syncFilter(); load(false); } });

    // ------------------------------------------------------------ panel Foro
    function forumActive() { return panel.classList.contains('active'); }
    document.querySelector('.nav-btn[data-panel="panel-foro"]')?.addEventListener('click', () => refreshState(true));

    function refreshState(fetchNow) {
      const ok = loggedIn();
      if (loginBox) loginBox.hidden = ok;
      if (mainBox) mainBox.hidden = !ok;
      if (!ok) { posts = []; openComments.clear(); return; }
      if (fetchNow) load(false);
    }
    window.addEventListener('vivet-session-changed', () => refreshState(forumActive()));

    // Mientras mirás el foro se actualiza solo cada minuto (sin pisar lo que estás escribiendo).
    setInterval(() => {
      if (document.hidden || !forumActive() || !loggedIn() || !forumActive()) return;
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#panel-foro')) return;
      const keepOpen = new Set(openComments.keys());
      load(false).then(() => keepOpen.forEach((id) => { if (openComments.has(id)) loadComments(id); }));
    }, 60000);

    setPreview(); updateCount(); syncFilter();
  })();
} catch (err) { console.error("[app2] forum.js:", err); }

// ======================================================================
// Perfiles  (antes: profile.js)
// ======================================================================
try {
  // Vivet Client - renderer/profile.js
  // Perfiles extendidos: ventana de perfil (bio, banner, estadísticas, publicaciones) y su edición en Social.
  // Se carga DESPUÉS de app.js y forum.js (usa window.vivetApi, escapeHtml, showToast y FRIENDS_API_URL).
  // Expone window.vivetProfile.open(userId) para abrir el perfil de cualquiera.
  (() => {
    const $ = (s) => document.querySelector(s);
    const API = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (method, path, body) => api().request(method, path, body);
    const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
    const BANNER_MAX_BYTES = 140 * 1024;

    // ------------------------------------------------------------ utilidades
    const nameOf = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);
    const hours = (sec) => {
      const h = Math.floor((Number(sec) || 0) / 3600);
      return h >= 1 ? `${h} h` : `${Math.floor((Number(sec) || 0) / 60)} min`;
    };
    const since = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—');
    const ago = (ts) => {
      const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return 'ahora';
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
      if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
      return new Date(ts).toLocaleDateString();
    };
    const safeColor = (c) => (COLOR_RE.test(c || '') ? c : '');

    // Banner recortado a 3:1 (900x300) y comprimido hasta ~140 KB.
    async function compressBanner(file) {
      const bmp = await createImageBitmap(file);
      let w = 900;
      for (let tries = 0; tries < 5; tries++) {
        const h = Math.round(w / 3);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const k = Math.max(w / bmp.width, h / bmp.height); // "cover"
        const dw = bmp.width * k, dh = bmp.height * k;
        c.getContext('2d').drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
        for (const q of [0.85, 0.72, 0.58, 0.45]) {
          const url = c.toDataURL('image/webp', q);
          if (!url.startsWith('data:image/webp')) throw new Error('webp no disponible');
          if ((url.length - url.indexOf(',') - 1) * 0.75 <= BANNER_MAX_BYTES) return url;
        }
        w = Math.round(w * 0.8);
      }
      throw new Error('too big');
    }

    // ============================================================ ventana de perfil
    const modal = document.createElement('div');
    modal.className = 'map-modal pf-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pf-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);
    const box = modal.querySelector('.pf-box');
    let currentId = 0;

    const close = () => { modal.hidden = true; box.innerHTML = ''; currentId = 0; };
    modal.addEventListener('mousedown', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

    function clipLine(u) {
      let host = 'link';
      try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (_) {}
      return `<div class="pf-clip"><span>${esc(host)}</span><button class="primary-btn" type="button" data-act="open-clip" data-url="${esc(u)}">Ver clip</button></div>`;
    }
    function miniPost(p) {
      const body = p.body ? `<div class="fo-text">${esc(p.body.length > 240 ? p.body.slice(0, 240) + '…' : p.body)}</div>` : '';
      const img = p.has_image ? `<img class="pf-post-img" alt="" loading="lazy" src="${esc(API)}/forum/posts/${esc(p.id)}/image" />` : '';
      return `<div class="pf-post">${body}${img}${p.clip_url ? clipLine(p.clip_url) : ''}
        <div class="hint">${ago(p.created_at)} · ${p.likes} me gusta · ${p.comments} comentarios</div></div>`;
    }

    function actionsHtml(p) {
      switch (p.relation) {
        case 'self': return '<button class="primary-btn" type="button" data-act="edit">Editar mi perfil</button>';
        case 'friend': return '<span class="pf-tag">Amigos</span>';
        case 'pending_out': return '<span class="pf-tag">Solicitud enviada</span>';
        case 'pending_in': return '<button class="primary-btn" type="button" data-act="accept">Aceptar solicitud</button>';
        default: return '<button class="primary-btn" type="button" data-act="add">Agregar amigo</button>';
      }
    }

    function draw(p) {
      const color = safeColor(p.color);
      const bannerStyle = p.banner
        ? `background-image:url('${esc(API + p.banner)}')`
        : (color ? `background:linear-gradient(135deg, ${color}, ${color}66)` : '');
      const online = p.online === null ? '' : `<span class="pf-dot ${p.online ? 'on' : ''}" title="${p.online ? 'En línea' : 'Desconectado'}"></span>`;
      box.style.setProperty('--pf-color', color || 'var(--accent)');
      box.innerHTML = `
        <button class="pf-close ghost-btn icon-only" type="button" data-act="close" aria-label="Cerrar">✕</button>
        <div class="pf-banner ${p.banner || color ? '' : 'empty'}" style="${bannerStyle}"></div>
        <div class="pf-head">
          <img class="pf-avatar" alt="" src="${esc(p.avatar_url || '')}" onerror="this.removeAttribute('src')" />
          <div class="pf-ident">
            <div class="pf-name">${online}${esc(nameOf(p))}</div>
            <div class="hint">Miembro desde ${esc(since(p.member_since))}</div>
          </div>
          <div class="pf-actions">${actionsHtml(p)}</div>
        </div>
        ${p.bio ? `<div class="pf-bio">${esc(p.bio)}</div>` : '<div class="pf-bio pf-bio-empty">Sin biografía todavía.</div>'}
        <div class="pf-stats">
          <div><b>${p.stats.posts}</b><span>Publicaciones</span></div>
          <div><b>${p.stats.likes}</b><span>Me gusta</span></div>
          <div><b>${esc(hours(p.stats.seconds))}</b><span>Tiempo jugado</span></div>
        </div>
        <div class="fr-section-title pf-section">Últimas publicaciones</div>
        <div id="pf-posts"><p class="hint">Cargando…</p></div>`;
    }

    async function loadPosts(id) {
      const el = box.querySelector('#pf-posts');
      if (!el) return;
      try {
        const r = await req('GET', `/forum/posts?user=${encodeURIComponent(id)}`);
        if (id !== currentId) return;
        const list = (r.posts || []).slice(0, 5);
        el.innerHTML = list.length ? list.map(miniPost).join('') : '<p class="hint">Todavía no publicó nada en el foro.</p>';
      } catch (_) {
        if (id === currentId && el) el.innerHTML = '<p class="hint">No se pudieron cargar las publicaciones.</p>';
      }
    }

    async function open(id) {
      id = Number(id);
      if (!Number.isInteger(id) || id < 1) return;
      if (!loggedIn()) return toast('Conectá tu Discord en Social para ver perfiles');
      currentId = id;
      modal.hidden = false;
      box.innerHTML = '<p class="hint" style="padding:28px;">Cargando perfil…</p>';
      try {
        const p = await req('GET', `/users/${encodeURIComponent(id)}/profile`);
        if (id !== currentId) return;
        draw(p);
        try { window.vivetShop && window.vivetShop.decorate(box, id); } catch (_) {} // marco/efecto/texto/mascota de la Tienda
        loadPosts(id);
      } catch (e) {
        close();
        toast(e.message || 'No se pudo abrir el perfil');
      }
    }
    window.vivetProfile = { open };

    box.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;
      try {
        if (act === 'close') close();
        else if (act === 'open-clip') {
          const u = t.dataset.url || '';
          if (/^https:\/\//i.test(u)) window.vivet.openExternal(u);
        } else if (act === 'edit') {
          close();
          window.vivetUI?.tab('panel-amigos', 'profile');
          document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.click();
          setTimeout(() => $('#profile-edit-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        } else if (act === 'add') {
          t.disabled = true;
          const r = await req('POST', '/friends/request', { id: currentId });
          toast(r && r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
          open(currentId);
        } else if (act === 'accept') {
          t.disabled = true;
          await req('POST', '/friends/respond', { id: currentId, accept: true });
          toast('Solicitud aceptada', 'ok');
          open(currentId);
        }
      } catch (err) { toast(err.message || 'No se pudo completar la acción'); t.disabled = false; }
    });

    // Click en la foto o el nombre de un amigo (Social) -> abre su perfil.
    $('#fr-lists')?.addEventListener('click', (e) => {
      if (!e.target.closest('.fr-avatar, .fr-row-name')) return;
      const row = e.target.closest('.fr-row');
      const idEl = row && row.querySelector('[data-id]');
      if (idEl) open(idEl.dataset.id);
    });

    // ============================================================ edición (Social)
    const bioEl = $('#pe-bio'), bioCount = $('#pe-bio-count'), colorEl = $('#pe-color'), colorClear = $('#pe-color-clear');
    const bannerBox = $('#pe-banner'), bannerPick = $('#pe-banner-pick'), bannerRemove = $('#pe-banner-remove'), bannerFile = $('#pe-banner-file');
    const saveBtn = $('#pe-save'), viewBtn = $('#pe-view');
    if (!bioEl) return;

    let mineState = { bio: '', color: '', banner: null };
    let colorSet = false;

    function paintEdit() {
      bioEl.value = mineState.bio;
      bioCount.textContent = `${bioEl.value.length}/200`;
      colorSet = !!safeColor(mineState.color);
      colorEl.value = colorSet ? mineState.color : '#17e0e8';
      bannerBox.classList.toggle('empty', !mineState.banner);
      bannerBox.style.backgroundImage = mineState.banner ? `url('${API + mineState.banner}')` : '';
      bannerRemove.hidden = !mineState.banner;
    }
    async function loadMine() {
      if (!loggedIn()) return;
      try { mineState = await req('GET', '/me/profile'); paintEdit(); } catch (_) {}
    }

    bioEl.addEventListener('input', () => { bioCount.textContent = `${bioEl.value.length}/200`; });
    colorEl.addEventListener('input', () => { colorSet = true; });
    colorClear?.addEventListener('click', () => { colorSet = false; colorEl.value = '#17e0e8'; });

    bannerPick.addEventListener('click', () => bannerFile.click());
    bannerFile.addEventListener('change', async () => {
      const f = bannerFile.files && bannerFile.files[0];
      bannerFile.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) return toast('Elegí una imagen');
      bannerPick.disabled = true;
      try {
        const image = await compressBanner(f);
        mineState = await req('PUT', '/me/banner', { image });
        paintEdit();
        toast('Banner actualizado', 'ok');
      } catch (e) { toast(e && e.message && !/too big|webp/.test(e.message) ? e.message : 'No se pudo usar esa imagen. Probá con otra.'); }
      bannerPick.disabled = false;
    });
    bannerRemove.addEventListener('click', async () => {
      try { mineState = await req('DELETE', '/me/banner'); paintEdit(); toast('Banner quitado', 'ok'); }
      catch (e) { toast(e.message || 'No se pudo quitar el banner'); }
    });

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        mineState = await req('PATCH', '/me/profile', { bio: bioEl.value.trim(), color: colorSet ? colorEl.value : '' });
        paintEdit();
        toast('Perfil guardado', 'ok');
      } catch (e) { toast(e.message || 'No se pudo guardar el perfil'); }
      saveBtn.disabled = false;
    });
    viewBtn.addEventListener('click', () => { const me = api() && api().me(); if (me) open(me.id); });

    window.addEventListener('vivet-session-changed', loadMine);
    document.querySelector('.nav-btn[data-panel="panel-amigos"]')?.addEventListener('click', loadMine);
    loadMine();
  })();
} catch (err) { console.error("[app2] profile.js:", err); }

// ======================================================================
// Novedades (la lista VIVET_UPDATES se edita acá)  (antes: updates.js)
// ======================================================================
try {
  // Vivet Client - renderer/updates.js
  // =======================================================================
  //  EDITÁ SOLO ESTA LISTA  (la más nueva va ARRIBA)
  // =======================================================================
  // Cada novedad:
  //   version : '2.1.0'
  //   date    : 'AAAA-MM-DD'
  //   title   : título corto
  //   changes : lista de textos. Podés empezar con una etiqueta:
  //             [nuevo]  [mejora]  [fix]   (si no ponés ninguna, sale sin etiqueta)
  const VIVET_UPDATES = [

    {
      version: '2.5.0',
      date: '2026-10-13',
      title: 'Workshop, clips, goles y mucho más rendimiento',
      changes: [
        '[nuevo] Workshop: sets personalizados creados por la comunidad. Cambiá la forma y el color de los botones, usá más fuentes y poné fondos fijos o animados. Gratis o con Vcoins.',
        '[nuevo] Botón Clip (tecla C): guarda los últimos segundos de la partida para sacar clips. Es 100% local para no gastar FPS, ideal para streamers.',
        '[nuevo] Animación al meter un gol: una estrella fugaz dentro del propio Haxball, sin salir del juego.',
        '[nuevo] Insignias de clubes favoritos en la Tienda, como Barcelona y Madrid. Las más populares cuestan más.',
        '[nuevo] Cosméticos totalmente personalizados: ahora una corona es una corona de verdad y no un círculo con detalles de corona.',
        '[nuevo] Íconos de rango personalizados.',
        '[nuevo] Barra lateral a la derecha con acciones rápidas de amigos y más.',
        '[nuevo] Podés mover el HUD dentro del juego y ajustar su transparencia.',
        '[nuevo] Cuando el juego está en stop se muestra el logo de fondo, y se agregó el logo de Halloween.',
        '[nuevo] Sin límite de FPS sin que el cliente se cierre.',
        '[mejora] Mejoras visuales de Haxball: marcador, animación del gol y otros detalles para que se juegue mejor.',
        '[mejora] Anti AFK competitivo más estricto.',
        '[mejora] El top ahora se ordena por XP y no por tiempo jugado.',
        '[mejora] La Tienda y otros apartados van mucho más fluidos: se corrigió un proceso que gastaba CPU y GPU en segundo plano.',
        '[fix] Una sala fijada ya no pasa a OFFLINE cuando el host le cambia el nombre.',
        '[fix] Se eliminaron los logros que no se podían cumplir.',
      ],
    },

        {
      version: '2.4.67',
      date: '2026-10-03',
      title: 'Trick or Treat, clanes y regalos',
      changes: [
        '[nuevo] Evento Trick or Treat: calendario de octubre con dulces, truco o trato diario y canje por cosméticos, efectos, mascotas, Vcoins y recompensas exclusivas.',
        '[nuevo] Mascotas de Halloween: calabaza, fantasma, araña, vampiro y huesos, más una etiqueta de edición limitada.',
        '[nuevo] Código promocional HALLOWEEN: canjealo en la Tienda, en "Código promocional".',
        '[nuevo] Clanes: apartado propio, top de clanes, imagen para tu clan y las invitaciones te llegan a Social.',
        '[nuevo] Regalá cosas de la Tienda a tus amigos.',
        '[nuevo] Más marcos, efectos, textos, mascotas, consumibles, mejoras y logros.',
        '[nuevo] Ahora ves a todos los jugadores de la sala que usan el cliente, no solo a tus amigos.',
        '[nuevo] Las recompensas diarias piden unos minutos jugando antes de poder reclamarse.',
        '[mejora] "Mi estilo" ahora está en Social > Mi perfil, junto al banner, y lo que comprás se configura desde Apariencia.',
        '[mejora] Se actualizaron los rangos: ahora aparecen los nuevos.',
        '[mejora] Tienda más rápida: valida las compras al instante y los efectos de marco ya no generan lag.',
        '[mejora] Mejor diseño al invitar jugadores al clan.',
        '[mejora] Solo las mascotas conservan emojis; el resto de los cosméticos son personalizados.',
        '[fix] Los logros ya no se pueden reclamar dos veces.',
        '[fix] El cliente ya no se congela ni se reinicia 3 veces al abrirlo.',
        '[fix] La foto de fondo ahora se muestra bien en lugar de la lista normal de Haxball.',
        '[fix] Corregido el retraso al entrar a una sala que afectaba a algunos jugadores.',
      ],
    },
    {
      version: '2.3.1',
      date: '2026-10-02',
      title: 'Tienda, mascotas y actualizaciones automáticas',
      changes: [
        '[nuevo] Tienda: canjeá tu XP por mascotas, auras y marcos para personalizar tu perfil.',
        '[nuevo] Mascotas: ahora te dan un multiplicador de XP mientras jugás.',
        '[nuevo] Elegí tu nick la primera vez que abrís el cliente, al instalarlo por primera vez.',
        '[nuevo] Actualizaciones automáticas: cuando salga una versión nueva vas a ver un aviso dentro del cliente para descargarla e instalarla con un click.',
        '[mejora] Auras y marcos rediseñados, con mucho más detalle y animaciones.',
        '[mejora] Interfaz más limpia: se eliminó un botón de enlace que ya no hacía falta.',
        '[fix] El instalador ahora incluye correctamente el sistema de actualizaciones.',
      ],
    },
    {
      version: '2.2.0',
      date: '2026-10-01',
      title: 'Más fluidez, menos desorden',
      changes: [
        '[nuevo] Instaladores separados: uno para Windows 10 y 11 (64 bits) y otro para Windows antiguos (32 bits).',
        '[nuevo] Mini reproductor de música en las salas y en la interfaz, para controlar tus canciones sin salir de lo que estás haciendo.',
        '[nuevo] La música también suena dentro del juego, con tu biblioteca ilimitada, y podés controlarla desde la partida.',
        '[nuevo] Traducciones.',
        '[nuevo] Anti AFK: ya no se puede farmear XP dejando el cliente abierto sin jugar.',
        '[mejora] Mejor rendimiento: más fluidez y más FPS.',
        '[mejora] Interfaz reorganizada: lobby, botones y paneles ahora están ordenados en pestañas.',
        '[mejora] Las notificaciones de mensajes de un grupo ya no aparecen en el chat de los demás.',
        '[fix] El cliente ya no se queda cargando en azul sin mostrar los estilos al abrirlo.',
        '[fix] El cliente ya no se queda pegado durante una partida.',
      ],
    },
    {
      version: '2.1.0',
      date: '2026-10-01',
      title: 'Rendimiento, Interfaz y Novedades',
      changes: [
        // ... (dejá acá la lista de la 2.1.0 tal cual la tenés)
      ],
    },
  ];

  // =======================================================================
  //  NO TOCAR DESDE ACÁ (dibuja el panel y el puntito de "hay novedades")
  // =======================================================================
  (() => {
    const list = document.getElementById('updates-list');
    const dot = document.getElementById('updates-badge');
    if (!list || typeof VIVET_UPDATES === 'undefined') return;

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const TAGS = { nuevo: 'Nuevo', mejora: 'Mejora', fix: 'Arreglo' };
    const stamp = () => {
      const u = VIVET_UPDATES[0];
      return u ? `${u.version}|${u.date}` : '';
    };

    function fmtDate(d) {
      const t = new Date(`${d}T00:00:00`);
      return isNaN(t) ? esc(d) : t.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    async function render() {
      let current = '';
      try { current = await window.vivet.getAppVersion(); } catch (_) {}
      if (!VIVET_UPDATES.length) {
        list.innerHTML = '<p class="hint" style="margin:0 32px;">Todavía no hay novedades.</p>';
        return;
      }
      list.innerHTML = VIVET_UPDATES.map((u) => {
        const items = (u.changes || []).map((c) => {
          const m = /^\[(nuevo|mejora|fix)\]\s*/i.exec(c);
          const tag = m ? m[1].toLowerCase() : '';
          const text = m ? c.slice(m[0].length) : c;
          return `<li>${tag ? `<span class="upd-tag upd-${tag}">${TAGS[tag]}</span>` : ''}<span>${esc(text)}</span></li>`;
        }).join('');
        const mine = current && u.version === current ? '<span class="upd-current">Tu versión</span>' : '';
        return `<article class="card upd-card">
          <div class="upd-head"><h3>v${esc(String(u.version).replace(/\.0$/, ''))} · ${esc(u.title)}</h3>${mine}</div>
          <div class="hint upd-date">${fmtDate(u.date)}</div>
          <ul class="upd-list">${items}</ul>
        </article>`;
      }).join('');
    }

    async function refreshDot() {
      if (!dot) return;
      let seen = '';
      try { seen = await window.vivet.getConfig('lastSeenUpdate', ''); } catch (_) {}
      dot.hidden = !stamp() || seen === stamp();
      dot.textContent = '•';
    }

    document.querySelector('.nav-btn[data-panel="panel-novedades"]')?.addEventListener('click', async () => {
      render();
      try { await window.vivet.setConfig('lastSeenUpdate', stamp()); } catch (_) {}
      if (dot) dot.hidden = true;
    });

    render();
    refreshDot();
  })();
} catch (err) { console.error("[app2] updates.js:", err); }

// ======================================================================
// Música del lobby y reproductor flotante en el juego  (antes: music.js)
// ======================================================================
try {
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#app-root');
    const mk = (p) => ({
      title: $(`#${p}-title`), sub: $(`#${p}-sub`), cur: $(`#${p}-cur`), dur: $(`#${p}-dur`), seek: $(`#${p}-seek`),
      vol: $(`#${p}-vol`), play: $(`#${p}-play`), prev: $(`#${p}-prev`), next: $(`#${p}-next`),
      shuf: $(`#${p}-shuffle`), loop: $(`#${p}-loop`), cover: $(`#${p}-cover`),
    });
    const lobby = mk('mu');
    const mini = mk('mm');
    const bar = mk('mb');
    const el = { card: $('#mu-player'), count: $('#mu-count'), add: $('#mu-add'), addFolder: $('#mu-add-folder'),
      file: $('#mu-file'), folder: $('#mu-folder'), list: $('#mu-list'), filter: $('#mu-filter'),
      auto: $('#mu-autoplay'), ingame: $('#mu-ingame'),
      panel: $('#mu-mini'), btn: $('#mu-mini-btn'), close: $('#mm-close'), mlist: $('#mm-list'),
      bar: $('#mb-bar'), barClose: $('#mb-close') };
    if (!root || !el.card || !el.list) return;
    // La versión flotante es opcional: si falta en el HTML, se ignora.
    const views = [lobby, mini.play ? mini : null, bar.play ? bar : null].filter(Boolean);

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
    const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
    const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
    const paint = (input) => { if (input) input.style.setProperty('--p', `${(input.value / input.max) * 100}%`); };

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
        t.onabort = () => rej(t.error);
      });
    };
    const dbAll = () => tx('readonly', (s) => s.getAll());
    const dbPut = (rec) => tx('readwrite', (s) => s.add(rec));
    const dbDel = (id) => tx('readwrite', (s) => s.delete(id));

    // ---------------- estado ----------------
    const audio = new Audio();
    audio.preload = 'auto';
    let tracks = [];            // { id, name, blob } - sin límite de cantidad
    let idx = -1;
    let url = '';
    let shuffle = !!rd('vivet_music_shuffle', false);
    let loop = rd('vivet_music_loop', true) !== false;
    let inGameMusic = !!rd('vivet_music_ingame', false);   // seguir sonando dentro del juego (opcional)
    let resumeAfterGame = false;
    audio.volume = Math.min(1, Math.max(0, Number(rd('vivet_music_vol', 0.4))));

    const cleanName = (n) => n.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || 'Canción';
    const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
    const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

    // ---------------- título / artista / portada (ID3 de los mp3; si no, "Artista - Título" del nombre) ----------------
    let coverUrl = '';
    let metaTok = 0;
    let started = false;          // ya se reprodujo algo en esta sesión (el mini del lobby recién aparece ahí)
    let barDismissed = false;
    function setCover(blob) {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
      coverUrl = blob ? URL.createObjectURL(blob) : '';
    }
    const decodeText = (b, enc) => {
      if (!b || !b.length) return '';
      let label = 'iso-8859-1', bytes = b;
      if (enc === 1) {
        if (b[0] === 0xFE && b[1] === 0xFF) { label = 'utf-16be'; bytes = b.subarray(2); }
        else if (b[0] === 0xFF && b[1] === 0xFE) { label = 'utf-16le'; bytes = b.subarray(2); }
        else label = 'utf-16le';
      } else if (enc === 2) label = 'utf-16be';
      else if (enc === 3) label = 'utf-8';
      try { return new TextDecoder(label).decode(bytes).split('\0')[0].trim(); } catch (_) { return ''; }
    };
    function readApic(body) {
      const enc = body[0]; let i = 1;
      while (i < body.length && body[i] !== 0) i++;
      const mime = String.fromCharCode(...body.subarray(1, i)); i += 2;   // mime + 0, tipo de imagen
      if (enc === 1 || enc === 2) { while (i + 1 < body.length && !(body[i] === 0 && body[i + 1] === 0)) i += 2; i += 2; }
      else { while (i < body.length && body[i] !== 0) i++; i++; }
      const data = body.subarray(i);
      if (data.length < 200) return null;
      const type = data[0] === 0x89 ? 'image/png' : (/^image\/(png|jpe?g|webp|gif)$/i.test(mime) ? mime : 'image/jpeg');
      return new Blob([data], { type });
    }
    async function readMeta(track) {
      if (track.meta) return track.meta;
      const base = cleanName(track.name);
      let title = base, artist = '', cover = null;
      const g = base.match(/^(.{1,60}?)\s+[-–—]\s+(.+)$/);
      if (g) { artist = g[1].trim(); title = g[2].trim(); }
      try {
        const head = new Uint8Array(await track.blob.slice(0, 10).arrayBuffer());
        if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33 && (head[3] === 3 || head[3] === 4)) {
          const ver = head[3];
          const sync = (a, o) => ((a[o] & 127) << 21) | ((a[o + 1] & 127) << 14) | ((a[o + 2] & 127) << 7) | (a[o + 3] & 127);
          const size = sync(head, 6);
          const buf = new Uint8Array(await track.blob.slice(10, 10 + Math.min(size, 8 * 1024 * 1024)).arrayBuffer());
          const dv = new DataView(buf.buffer);
          let p = 0;
          if (head[5] & 0x40) p = ver === 4 ? sync(buf, 0) : dv.getUint32(0) + 4;   // cabecera extendida
          while (p + 10 <= buf.length) {
            const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
            if (!/^[A-Z0-9]{4}$/.test(id)) break;
            const fs = ver === 4 ? sync(buf, p + 4) : dv.getUint32(p + 4);
            if (fs <= 0 || p + 10 + fs > buf.length) break;
            const body = buf.subarray(p + 10, p + 10 + fs);
            p += 10 + fs;
            if (id === 'TIT2') title = decodeText(body.subarray(1), body[0]) || title;
            else if (id === 'TPE1') artist = decodeText(body.subarray(1), body[0]) || artist;
            else if (id === 'APIC' && !cover) cover = readApic(body);
          }
        }
      } catch (_) {}
      track.meta = { title: title.slice(0, 80), artist: artist.slice(0, 60), cover };
      return track.meta;
    }

    // "mu-tab" = estás en la pestaña Música (ahí no hace falta el mini del lobby). Se marca con JS
    // y no con :has() en el CSS, que recalcula estilos de todo el .app en cada cambio del DOM.
    const musicPanel = $('#panel-musica');
    const syncMusicTab = () => document.documentElement.classList.toggle('mu-tab', !!musicPanel && musicPanel.classList.contains('active'));
    if (musicPanel) { new MutationObserver(syncMusicTab).observe(musicPanel, { attributes: true, attributeFilter: ['class'] }); syncMusicTab(); }

    function updateBar() {
      if (!el.bar) return;
      const show = tracks.length > 0 && started && !barDismissed;
      el.bar.hidden = !show;
      document.documentElement.classList.toggle('mu-bar-on', show);
    }

    function rows(filterText, withDel) {
      const q = (filterText || '').trim().toLowerCase();
      const html = tracks.map((t, i) => ({ t, i }))
        .filter(({ t }) => !q || cleanName(t.name).toLowerCase().includes(q))
        .map(({ t, i }) => `
        <div class="mu-row ${i === idx ? 'cur' : ''}" data-i="${i}">
          <span class="mu-n">${i === idx && !audio.paused ? '♪' : i + 1}</span>
          <span class="mu-name">${esc(cleanName(t.name))}</span>
          ${withDel ? `<button class="mu-del" type="button" data-del="${t.id}" title="Quitar">✕</button>` : ''}
        </div>`).join('');
      if (html) return html;
      return `<p class="hint" style="margin:6px 0;">${tracks.length ? 'Ninguna canción coincide.' : 'Todavía no agregaste canciones.'}</p>`;
    }

    function render() {
      el.count.textContent = `${tracks.length} ${tracks.length === 1 ? 'canción' : 'canciones'}`;
      el.list.innerHTML = rows(el.filter && el.filter.value, true);
      if (el.mlist) {
        el.mlist.innerHTML = rows('', false);
        if (el.panel && !el.panel.hidden) { const c = el.mlist.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' }); }
      }
      const t = tracks[idx];
      for (const v of views) {
        const m = t && t.meta;
        v.title.textContent = t ? (m ? m.title : cleanName(t.name)) : 'Sin canciones';
        v.sub.textContent = t ? (m && m.artist ? m.artist : `Canción ${idx + 1} de ${tracks.length}`) : 'Agregá tus temas para empezar';
        if (v.cover) {
          v.cover.style.backgroundImage = coverUrl ? `url("${coverUrl}")` : '';
          v.cover.classList.toggle('has-img', !!coverUrl);
        }
        v.play.innerHTML = audio.paused ? PLAY_SVG : PAUSE_SVG;
        v.shuf.classList.toggle('on', shuffle);
        v.loop.classList.toggle('on', loop);
      }
      el.card.classList.toggle('playing', !audio.paused);
      if (el.panel) el.panel.classList.toggle('playing', !audio.paused);
      if (el.btn) el.btn.classList.toggle('on', !audio.paused);
      updateBar();
    }

    function select(i, autoplay) {
      if (!tracks.length) { idx = -1; audio.removeAttribute('src'); setCover(null); render(); return; }
      idx = ((i % tracks.length) + tracks.length) % tracks.length;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(tracks[idx].blob);
      audio.src = url;
      wr('vivet_music_last', tracks[idx].id);
      if (autoplay) audio.play().catch(() => {});
      const tr = tracks[idx]; const tok = ++metaTok;
      setCover(null);
      readMeta(tr).then((m) => { if (tok !== metaTok) return; setCover(m.cover); render(); });
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

    // ---------------- controles (lobby y reproductor flotante comparten todo) ----------------
    const togglePlay = () => {
      if (!tracks.length) return el.file.click();
      if (idx < 0) select(0, true);
      else if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    };
    for (const v of views) {
      v.play.addEventListener('click', togglePlay);
      v.prev.addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); });
      v.next.addEventListener('click', () => step(1));
      v.shuf.addEventListener('click', () => { shuffle = !shuffle; wr('vivet_music_shuffle', shuffle); render(); });
      v.loop.addEventListener('click', () => { loop = !loop; wr('vivet_music_loop', loop); render(); });
      v.vol.addEventListener('input', () => {
        audio.volume = v.vol.value / 100; wr('vivet_music_vol', audio.volume);
        views.forEach((o) => { o.vol.value = v.vol.value; paint(o.vol); });
      });
      v.seek.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (v.seek.value / 1000) * audio.duration;
        paint(v.seek);
      });
    }
    audio.addEventListener('timeupdate', () => {
      for (const v of views) {
        if (document.activeElement !== v.seek && audio.duration) v.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
        paint(v.seek);
        v.cur.textContent = fmt(audio.currentTime);
      }
    });
    audio.addEventListener('loadedmetadata', () => { for (const v of views) v.dur.textContent = fmt(audio.duration); });
    audio.addEventListener('play', () => { started = true; barDismissed = false; render(); });
    audio.addEventListener('pause', render);
    audio.addEventListener('ended', () => {
      if (!loop && idx === tracks.length - 1 && !shuffle) { audio.pause(); return; }
      step(1);
    });
    audio.addEventListener('error', () => { if (tracks.length > 1) step(1); });

    // ---------------- lista: agregar (archivos o carpeta), sin límite ----------------
    const isAudio = (f) => /^audio\//.test(f.type) || /\.(mp3|ogg|wav|m4a|flac|aac|opus|wma)$/i.test(f.name);
    async function addFiles(fileList, sortByName) {
      let files = Array.from(fileList || []);
      if (!files.length) return;
      const audioFiles = files.filter(isAudio);
      if (files.length - audioFiles.length > 0 && !sortByName) toast(`${files.length - audioFiles.length} archivo(s) no son audio y se omitieron`);
      files = audioFiles.filter((f) => !tracks.some((t) => t.name === f.name && t.blob.size === f.size));
      if (sortByName) files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      let added = 0, failed = 0;
      for (const f of files) {
        try {
          const id = await dbPut({ name: f.name, blob: f });
          tracks.push({ id, name: f.name, blob: f });
          added++;
          if (added % 25 === 0) render();
        } catch (_) { failed++; }
      }
      if (failed) toast(`No se pudieron guardar ${failed} canción(es). Revisá el espacio en disco.`);
      else if (added) toast(added === 1 ? 'Canción agregada' : `${added} canciones agregadas`, 'ok');
      else if (audioFiles.length) toast('Esas canciones ya estaban en tu lista');
      else toast('No se encontraron archivos de audio');
      if (idx < 0 && tracks.length) select(0, true); else render();
    }
    el.add.addEventListener('click', () => el.file.click());
    el.addFolder?.addEventListener('click', () => el.folder && el.folder.click());
    el.file.addEventListener('change', async () => { const f = el.file.files; const list = Array.from(f || []); el.file.value = ''; await addFiles(list, false); });
    el.folder?.addEventListener('change', async () => { const f = el.folder.files; const list = Array.from(f || []); el.folder.value = ''; await addFiles(list, true); });
    el.filter?.addEventListener('input', render);

    const onListClick = async (e) => {
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
      if (i === idx) togglePlay(); else select(i, true);
    };
    el.list.addEventListener('click', onListClick);
    el.mlist?.addEventListener('click', onListClick);

    el.auto.checked = !!rd('vivet_music_auto', false);
    el.auto.addEventListener('change', () => wr('vivet_music_auto', el.auto.checked));

    // ---------------- reproductor flotante dentro del juego ----------------
    const setMiniOpen = (open) => {
      if (!el.panel) return;
      el.panel.hidden = !open;
      if (el.btn) el.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) render();
    };
    el.btn?.addEventListener('click', () => setMiniOpen(el.panel.hidden));
    el.close?.addEventListener('click', () => setMiniOpen(false));
    // La X del mini del lobby corta la música y lo esconde hasta que vuelvas a dar play.
    el.barClose?.addEventListener('click', () => { barDismissed = true; audio.pause(); updateBar(); });

    // ---------------- al jugar: pausar, o seguir sonando si el usuario lo activó ----------------
    const isPlayingGame = () => root.classList.contains('playing') || root.classList.contains('replay-mode') || root.classList.contains('creating');
    const applyInGame = () => document.documentElement.classList.toggle('mu-ingame', inGameMusic);
    if (el.ingame) {
      el.ingame.checked = inGameMusic;
      el.ingame.addEventListener('change', () => {
        inGameMusic = el.ingame.checked;
        wr('vivet_music_ingame', inGameMusic);
        applyInGame();
        if (!isPlayingGame()) return;
        if (inGameMusic) { if (resumeAfterGame) { resumeAfterGame = false; audio.play().catch(() => {}); } }
        else { resumeAfterGame = !audio.paused; audio.pause(); setMiniOpen(false); }
      });
    }
    applyInGame();
    let wasGame = isPlayingGame();
    new MutationObserver(() => {
      const g = isPlayingGame();
      if (g === wasGame) return;
      wasGame = g;
      if (g) {
        if (!inGameMusic) { resumeAfterGame = !audio.paused; audio.pause(); }
      } else {
        setMiniOpen(false);
        if (resumeAfterGame) { resumeAfterGame = false; audio.play().catch(() => {}); }
      }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // ---------------- arranque ----------------
    for (const v of views) { v.vol.value = Math.round(audio.volume * 100); paint(v.vol); paint(v.seek); }
    (async () => {
      try { tracks = await dbAll(); } catch (_) { tracks = []; }
      const last = rd('vivet_music_last', null);
      const start = Math.max(0, tracks.findIndex((t) => t.id === last));
      if (tracks.length) select(start, false); else render();
      if (tracks.length && el.auto.checked && !isPlayingGame()) audio.play().catch(() => {});
    })();
  })();
} catch (err) { console.error("[app2] music.js:", err); }

// ======================================================================
// Jugadores Vivet en la sala  (antes: roommates.js)
// ======================================================================
try {
  // Vivet Client - renderer/roommates.js
  // Muestra quién más de la sala usa Vivet Client y deja mandarle solicitud de amistad sin salir
  // del juego. Usa GET /presence/members (el servidor sabe quién está en tu sala) y
  // POST /friends/respond | /friends/request. Se carga después de app.js y profile.js.
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#app-root'), btn = $('#rm-btn'), panel = $('#rm-panel'), list = $('#rm-list'), count = $('#rm-count'), closeBtn = $('#rm-close');
    if (!root || !btn || !panel || !list) return;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const inGame = () => root.classList.contains('playing') && !root.classList.contains('replay-mode') && !root.classList.contains('creating');
    const nameOf = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);

    let members = [];
    let detected = []; // usan el cliente (marca invisible en el nick) pero el servidor no los lista
    let inRoom = false;
    let busy = false;
    let timer = null;

    function actionHtml(m) {
      switch (m.relation) {
        case 'detected': return '<span class="rm-tag">Con Vivet</span>';
        case 'friend': return '<span class="rm-tag">✓ Amigos</span>';
        case 'pending_out': return '<span class="rm-tag">Enviada</span>';
        case 'pending_in': return `<button class="rm-act" type="button" data-act="accept" data-id="${m.id}">Aceptar</button>`;
        default: return `<button class="rm-act" type="button" data-act="add" data-id="${m.id}">Agregar</button>`;
      }
    }

    function render() {
      // Cuenta = gente a la que todavía se le puede mandar o aceptar una solicitud.
      const pending = members.filter((m) => m.relation === 'none' || m.relation === 'pending_in').length;
      count.textContent = pending ? String(pending) : '';
      if (!loggedIn()) {
        list.innerHTML = '<p class="rm-empty">Conectá tu Discord en Social para ver a los demás jugadores con Vivet.</p>';
      } else if (!inRoom && !detected.length) {
        list.innerHTML = '<p class="rm-empty">Todavía no se detecta tu sala. Probá en unos segundos.</p>';
      } else if (!members.length && !detected.length) {
        list.innerHTML = '<p class="rm-empty">No hay más jugadores con Vivet Client en esta sala ahora mismo.</p>';
      } else {
        list.innerHTML = members.concat(detected).map((m) => m.relation === 'detected' ? `
          <div class="rm-row">
            <span class="rm-av"></span>
            <span class="rm-name" style="cursor:default">${esc(m.username)}</span>
            ${actionHtml(m)}
          </div>` : `
          <div class="rm-row" data-id="${m.id}">
            <img class="rm-av" alt="" src="${esc(m.avatar_url || '')}" onerror="this.removeAttribute('src')" />
            <span class="rm-name" data-act="profile" data-id="${m.id}" title="Ver perfil">${esc(nameOf(m))}</span>
            ${actionHtml(m)}
          </div>`).join('');
      }
    }

    // Lee la lista de jugadores del juego y busca la marca invisible del cliente. No depende del servidor
    // ni de la amistad: sirve para cualquiera que use Vivet Client.
    async function detectByMark(known) {
      try {
        const mark = typeof clientMark === 'function' ? clientMark() : '';
        if (!mark || typeof execInAllFrames !== 'function' || typeof clientNamesInPage !== 'function') return [];
        const rs = await execInAllFrames('(' + clientNamesInPage.toString() + ')(' + JSON.stringify(mark) + ');');
        const have = new Set((known || []).map((m) => String(m.haxball_nick || '').trim().toLowerCase()));
        const me = String(typeof currentNickname === 'string' ? currentNickname : '').trim().toLowerCase();
        const seen = new Set(), out = [];
        for (const r of rs || []) {
          if (!r || !r.ok || !Array.isArray(r.value)) continue;
          for (const n of r.value) {
            const k = String(n).trim().toLowerCase();
            if (!k || k === me || have.has(k) || seen.has(k)) continue;
            seen.add(k); out.push({ id: null, username: String(n).trim(), haxball_nick: '', avatar_url: '', relation: 'detected' });
          }
        }
        return out;
      } catch (_) { return []; }
    }

    async function refresh() {
      if (busy || !loggedIn() || !inGame()) return;
      busy = true;
      try {
        const r = await api().request('GET', '/presence/members');
        inRoom = !!r.in_room;
        members = r.members || [];
      } catch (_) { /* el servidor viejo no tiene el endpoint: se queda la lista vacía */ }
      detected = await detectByMark(members);
      busy = false;
      render();
    }

    function startPolling() {
      stopPolling();
      refresh();
      // El latido de presencia sube la sala unos segundos después de entrar: se consulta seguido
      // al principio y más espaciado después. No consulta si no estás jugando o no hay sesión.
      let n = 0;
      timer = setInterval(() => { n++; if (inGame()) refresh(); }, 15000);
    }
    function stopPolling() { if (timer) clearInterval(timer); timer = null; }

    function setOpen(open) {
      panel.hidden = !open;
      if (open) { render(); refresh(); }
    }
    btn.addEventListener('click', () => setOpen(panel.hidden));
    closeBtn?.addEventListener('click', () => setOpen(false));

    list.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const id = Number(t.dataset.id);
      if (t.dataset.act === 'profile') { if (window.vivetProfile) window.vivetProfile.open(id); return; }
      t.disabled = true;
      try {
        if (t.dataset.act === 'add') {
          const r = await api().request('POST', '/friends/request', { id });
          toast(r && r.accepted ? 'Ahora son amigos' : 'Solicitud enviada', 'ok');
        } else if (t.dataset.act === 'accept') {
          await api().request('POST', '/friends/respond', { id, accept: true });
          toast('Solicitud aceptada', 'ok');
        }
        await refresh();
      } catch (err) { toast(err.message || 'No se pudo completar la acción'); t.disabled = false; }
    });

    // Solo se consulta mientras estás dentro de una sala.
    let was = inGame();
    const sync = () => {
      const g = inGame();
      if (g === was) return;
      was = g;
      if (g) { members = []; detected = []; inRoom = false; startPolling(); } else { stopPolling(); setOpen(false); members = []; detected = []; count.textContent = ''; }
    };
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('vivet-session-changed', () => { if (inGame()) startPolling(); else render(); });
    if (was) startPolling();
    render();
  })();
} catch (err) { console.error("[app2] roommates.js:", err); }

// ======================================================================
// Aviso de actualización (cuadro abajo a la derecha; la lógica está en main.js, sección E)
// ======================================================================
try {
  (() => {
    const api = window.vivet && window.vivet.update;
    if (!api) return;
    const css = document.createElement('style');
    css.textContent = `
    #upd-box{position:fixed;right:18px;bottom:18px;width:310px;z-index:3000;box-sizing:border-box;padding:14px 14px 12px;border-radius:14px;
      background:var(--bg-elev,#10141b);color:var(--text,#eef5fb);border:1px solid var(--accent-border,rgba(23,224,232,.35));
      box-shadow:0 12px 34px rgba(0,0,0,.45);font:13px/1.4 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .22s,transform .22s}
    #upd-box.show{opacity:1;transform:none;pointer-events:auto}
    #upd-box .ub-top{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    #upd-box .ub-dot{width:8px;height:8px;border-radius:50%;background:var(--accent,#17e0e8);box-shadow:0 0 8px var(--accent,#17e0e8)}
    #upd-box .ub-title{font-weight:700;flex:1}
    #upd-box .ub-x{background:none;border:0;color:inherit;opacity:.5;cursor:pointer;font-size:15px;padding:0 2px}
    #upd-box .ub-x:hover{opacity:1}
    #upd-box .ub-sub{opacity:.75;font-size:12.5px}
    #upd-box .ub-notes{opacity:.6;font-size:11.5px;margin-top:6px;max-height:48px;overflow:hidden;white-space:pre-line}
    #upd-box .ub-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:10px;overflow:hidden}
    #upd-box .ub-bar i{display:block;height:100%;width:0;background:var(--accent,#17e0e8);transition:width .2s}
    #upd-box .ub-acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
    #upd-box .ub-acts button{font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:9px;cursor:pointer;color:inherit;background:transparent;border:1px solid var(--border,rgba(255,255,255,.14))}
    #upd-box .ub-acts button.p{background:var(--accent,#17e0e8);color:#021016;border-color:transparent}
    #upd-box .ub-acts button.l{border:0;opacity:.55;font-weight:500;margin-right:auto;padding-left:0}
    #upd-box .ub-acts button:hover{filter:brightness(1.12)}`;
    document.head.appendChild(css);
    const box = document.createElement('div');
    box.id = 'upd-box';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);

    let dismissed = ''; // "Más tarde" oculta el aviso de esa versión hasta el próximo chequeo o reinicio
    let cur = {};
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mbs = (n) => (n / 1048576).toFixed(1) + ' MB/s';

    function render(s) {
      cur = s;
      if (!s.visible || s.status === 'idle' || s.status === 'checking' || (s.status === 'available' && dismissed === s.version)) { box.classList.remove('show'); return; }
      let title = '', body = '', acts = '', extra = '';
      if (s.status === 'available') {
        title = 'Nueva actualización';
        body = '<b>Vivet Client v' + esc(s.version) + '</b> ya está disponible.<div class="ub-sub">Tenés la v' + esc(s.current) + '.</div>';
        if (s.notes) extra = '<div class="ub-notes">' + esc(s.notes) + '</div>';
        acts = '<button class="l" data-a="skip">Omitir</button><button data-a="later">Más tarde</button><button class="p" data-a="download">Descargar</button>';
      } else if (s.status === 'downloading') {
        title = 'Descargando v' + esc(s.version);
        body = s.percent + '%' + (s.speed ? ' · ' + mbs(s.speed) : '');
        extra = '<div class="ub-bar"><i style="width:' + s.percent + '%"></i></div>';
      } else if (s.status === 'downloaded') {
        title = 'Lista para instalar';
        body = 'v' + esc(s.version) + ' descargada.<div class="ub-sub">Se instala al reiniciar o al cerrar el cliente.</div>';
        acts = '<button data-a="later">Después</button><button class="p" data-a="install">Reiniciar e instalar</button>';
      } else if (s.status === 'none') {
        title = 'Todo al día'; body = 'Ya tenés la última versión (v' + esc(s.current) + ').';
      } else if (s.status === 'error') {
        title = 'No se pudo actualizar'; body = esc(s.message);
        acts = '<button data-a="later">Cerrar</button><button class="p" data-a="check">Reintentar</button>';
      }
      box.innerHTML = '<div class="ub-top"><span class="ub-dot"></span><span class="ub-title">' + title + '</span><button class="ub-x" data-a="later" title="Cerrar">✕</button></div>' +
        '<div>' + body + '</div>' + extra + (acts ? '<div class="ub-acts">' + acts + '</div>' : '');
      box.classList.add('show');
    }

    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'download') api.download();
      else if (a === 'install') api.install();
      else if (a === 'skip') api.skip();
      else if (a === 'check') window.vivet.checkForUpdates();
      else if (a === 'later') { if (cur.status === 'available') dismissed = cur.version; box.classList.remove('show'); api.later(); }
    });
    api.onState(render);
    api.getState().then(render).catch(() => {});
  })();
} catch (err) { console.error("[app2] aviso de actualización:", err); }

// ======================================================================
// Primer inicio: elegir nickname (se muestra solo en instalaciones nuevas)
// ======================================================================
try {
  (() => {
    let shown = false;
    function ask(suggested) {
      if (shown) return; shown = true;
      const css = document.createElement('style');
      css.textContent = `
      #fr-nick{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(3,6,10,.72);backdrop-filter:blur(4px)}
      #fr-nick .fn-card{width:360px;max-width:92vw;box-sizing:border-box;padding:22px;border-radius:16px;background:var(--bg-elev,#10141b);color:var(--text,#eef5fb);
        border:1px solid var(--accent-border,rgba(23,224,232,.35));box-shadow:0 18px 50px rgba(0,0,0,.55);font:13px/1.45 Inter,system-ui,sans-serif}
      #fr-nick h2{margin:0 0 4px;font-size:18px}
      #fr-nick p{margin:0 0 14px;opacity:.75}
      #fr-nick input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;font:inherit;font-size:14px;color:inherit;background:var(--bg-elev-2,#0b0e14);border:1px solid var(--border,rgba(255,255,255,.14));outline:none}
      #fr-nick input:focus{border-color:var(--accent,#17e0e8)}
      #fr-nick .fn-err{color:#ff7b7b;font-size:12px;min-height:16px;margin-top:6px}
      #fr-nick button{width:100%;margin-top:6px;padding:10px;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;background:var(--accent,#17e0e8);color:#021016}
      #fr-nick button:hover{filter:brightness(1.1)}`;
      document.head.appendChild(css);
      const el = document.createElement('div');
      el.id = 'fr-nick';
      el.innerHTML = '<div class="fn-card"><h2>¡Bienvenido a Vivet!</h2><p>Elegí tu nickname. Es el nombre con el que vas a entrar a las salas y el que ven tus amigos. Lo podés cambiar después en Social.</p>' +
        '<input id="fn-input" type="text" maxlength="25" autocomplete="off" spellcheck="false" /><div class="fn-err" id="fn-err"></div><button id="fn-ok" type="button">Empezar</button></div>';
      document.body.appendChild(el);
      const input = el.querySelector('#fn-input'), err = el.querySelector('#fn-err');
      input.value = suggested || '';
      setTimeout(() => { input.focus(); input.select(); }, 60);
      const done = async () => {
        const val = input.value.trim();
        if (!val) { err.textContent = 'Escribí un nickname para continuar'; return; }
        try { await applyNickname(val, { announce: false }); } catch (_) {}
        el.remove(); css.remove();
        try { showToast('¡Listo, ' + val + '!', 'ok'); } catch (_) {}
      };
      el.querySelector('#fn-ok').addEventListener('click', done);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    }
    if (window.__vivetFirstRun) ask(typeof currentNickname !== 'undefined' ? currentNickname : '');
    window.addEventListener('vivet-first-run', (e) => ask(e.detail));
  })();
} catch (err) { console.error("[app2] primer inicio:", err); }

// ======================================================================
// Tienda (Vcoins, marcos, efectos, textos y mascotas)  -  el servidor es shop.js
// ======================================================================
try {
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#shop-root');
    if (!root) return;
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (m, p, b) => api().request(m, p, b);
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const en = () => !!(window.vivetLang && window.vivetLang() === 'en');
    const ID_RE = /^[a-z0-9_]{1,32}$/;
    // La tienda se traduce acá adentro (con T), no con el diccionario global de app.js.
    root.setAttribute('data-i18n-skip', '');

    // ------------------------------------------------------------ traducciones (ES -> EN)
    // Todo lo que dibuja la tienda pasa por T(). Los textos del catálogo y de los logros vienen del
    // servidor en español: se traducen por id (ITEM_EN / ACH_EN). Los errores del servidor, por EN / PAT.
    const EN = {
      // paneles y pestañas
      'Tienda': 'Shop',
      'Ganás Vcoins jugando en salas, con logros, códigos y eventos. Gastalas en marcos, efectos, mascotas, consumibles, y mejoras.':
        'Earn Vcoins by playing in rooms, with achievements, codes and events. Spend them on frames, effects, pets, consumables, and upgrades.',
      'La tienda no está configurada en este cliente.': 'The shop is not configured in this client.',
      'Conectá tu Discord en Social para usar la Tienda y ganar Vcoins.': 'Connect your Discord in Social to use the Shop and earn Vcoins.',
      'Ofertas': 'Deals', 'Marcos': 'Frames', 'Efectos': 'Effects', 'Textos': 'Titles', 'Mascotas': 'Pets',
      'Consumibles': 'Consumables', 'Mejoras': 'Upgrades', 'Especiales': 'Specials', 'Logros': 'Achievements',
      // cabecera
      'Tu nombre': 'Your name', 'Vcoins': 'Vcoins', 'Código promocional': 'Promo code', 'Canjear': 'Redeem',
      'Escribí un código primero': 'Enter a code first',
      '+{n} Vcoins': '+{n} Vcoins',
      '¡Bienvenido! Ganaste {n} Vcoins': 'Welcome! You earned {n} Vcoins',
      'Escudo activo: {t}': 'Shield active: {t}',
      'XP x{m} activo: {t}': 'XP x{m} active: {t}',
      'Tu XP: x{m}': 'Your XP: x{m}',
      'Jugando en una sala ganás 1 Vcoin cada {m} min (máx. {c} por día). También podés canjear códigos promocionales, completar logros y ganar premios en eventos.':
        'Playing in a room you earn 1 Vcoin every {m} min (max. {c} per day). You can also redeem promo codes, complete achievements and win prizes in events.',
      'No hay objetos en esta categoría todavía.': 'There are no items in this category yet.',
      // tarjetas
      'Te faltan Vcoins': 'Not enough Vcoins', 'Comprar': 'Buy', 'Mejorar': 'Upgrade', 'Máximo': 'Maxed',
      'Puesto': 'Equipped', 'Quitar': 'Remove', 'Tuyo': 'Owned', 'Ponerme': 'Equip',
      'Se desbloquea con rango {r}': 'Unlocked with {r} rank',
      'Se consigue en el evento': 'Get it in the event',
      'Se desbloquea con el logro «{a}»': 'Unlocked with the achievement "{a}"',
      'Premio': 'Prize',
      'Hoy': 'Today', 'Semana': 'Week',
      '¡Comprado! Ya podés ponértelo': 'Purchased! You can equip it now',
      '¡Listo! Consumible activado': 'Done! Consumable activated',
      '¡Mejora comprada!': 'Upgrade purchased!',
      'No se pudo completar la acción': 'Could not complete the action',
      'Sin comprar': 'Not purchased',
      'Tenés +{n} espacios para mapas': 'You have +{n} map slots',
      'Tenés +{n} salas ancladas': 'You have +{n} pinned rooms',
      'Banner HD activo': 'HD banner active',
      'Nivel {a}/{b}': 'Level {a}/{b}',
      // mascotas
      'Cómo funcionan las mascotas': 'How pets work',
      'Con una mascota <b>puesta</b> ganás <b>más XP competitivo</b> mientras jugás en una sala (el bonus de cada una está en su tarjeta).':
        'With a pet <b>equipped</b> you earn <b>more competitive XP</b> while playing in a room (each pet\'s bonus is on its card).',
      'Solo una puesta a la vez. Si no la tenés puesta, no da bonus ni gana nivel.':
        'Only one equipped at a time. If it is not equipped, it gives no bonus and gains no levels.',
      'Suben de nivel con tus horas jugadas <b>con ella puesta</b> (2 h, 6 h, 15 h, 30 h y 60 h). Cada nivel suma +20% al bonus base, hasta duplicarlo en el nivel 6.':
        'They level up with the hours you play <b>with them equipped</b> (2 h, 6 h, 15 h, 30 h and 60 h). Each level adds +20% to the base bonus, up to doubling it at level 6.',
      'Se suma al boost "XP x2" si lo tenés activo. Las Vcoins por jugar no cambian: solo se multiplica el XP.':
        'It stacks with the "XP x2" boost if you have it active. Vcoins earned by playing do not change: only XP is multiplied.',
      'Tu multiplicador de XP actual: <b>x{m}</b>.': 'Your current XP multiplier: <b>x{m}</b>.',
      '+{n}% XP': '+{n}% XP',
      'Sube hasta +{n}% (nivel {l}) jugando con ella puesta.': 'Rises to +{n}% (level {l}) by playing with it equipped.',
      'Nivel {a}/{b} · +{n}% XP': 'Level {a}/{b} · +{n}% XP',
      '{a} / {b} para el nivel {l}': '{a} / {b} to level {l}',
      'Nivel máximo · {a} jugadas': 'Max level · {a} played',
      // consumibles / mejoras
      '<b>Escudo:</b> congela el decaimiento de XP por inactividad. Los días se acumulan (máx. 30). <b>Boost:</b> duplica tu XP y se suma al bonus de tu mascota (máx. 24 h acumuladas).':
        '<b>Shield:</b> freezes XP decay from inactivity. Days stack (max. 30). <b>Boost:</b> doubles your XP and stacks with your pet bonus (max. 24 h stacked).',
      'Mejoras permanentes: se compran una vez (o por niveles) y quedan en tu cuenta para siempre.':
        'Permanent upgrades: bought once (or by levels) and kept on your account forever.',
      // ofertas
      'Oferta de la semana': 'Deal of the week', 'Ofertas del día': "Today's deals",
      'termina en {t}': 'ends in {t}', 'No hay ofertas por ahora.': 'No deals right now.',
      'Cambian solas: 3 objetos con -25% cada día y 1 con -40% cada semana.': 'They rotate automatically: 3 items at -25% every day and 1 at -40% every week.',
      // código de amigo
      'Tu código actual: <b>{c}</b>': 'Your current code: <b>{c}</b>',
      'Cambiar': 'Change', 'Escribí el código que querés': 'Enter the code you want',
      'Código cambiado a {c}': 'Code changed to {c}',
      // logros
      'Objetos de la Tienda': 'Shop items', 'Mi estilo': 'My style', 'Ir a la Tienda': 'Go to the Shop', 'Cargando…': 'Loading…',
      'Elegí qué llevás puesto en tu perfil. Los objetos nuevos se consiguen en la Tienda.': 'Choose what you wear on your profile. Get new items in the Shop.',
      'Marco': 'Frame', 'Efecto': 'Effect', 'Texto': 'Title', 'Mascota': 'Pet', 'Ninguno': 'None', 'Todavía no tenés ninguno': 'You don\'t have any yet',
      'Regalar': 'Gift', 'Regalar a un amigo': 'Gift to a friend', 'Cancelar': 'Cancel',
      'Cuesta {n} Vcoins y se descuentan de tu saldo. Solo podés regalarle a tus amigos.': 'Costs {n} Vcoins, taken from your balance. You can only gift to friends.',
      'Necesitás tener amigos agregados para poder regalar.': 'You need friends added to send gifts.',
      '¡Regalo enviado a {n}!': 'Gift sent to {n}!', '{n} te regaló {i}': '{n} gifted you {i}',
      'Solo podés regalarle a tus amigos.': 'You can only gift to your friends.',
      'Esa persona ya tiene este objeto.': 'That person already has this item.',
      'Ese objeto no se puede regalar.': 'This item can\'t be gifted.',
      'Elegí a quién regalarle.': 'Choose who to gift it to.',
      'Recompensa diaria': 'Daily reward', 'Reclamada hoy': 'Claimed today',
      'Jugá {m} min en una sala y reclamá +{n} Vcoins. Se reinicia a medianoche.': 'Play {m} min in a room and claim +{n} Vcoins. Resets at midnight.',
      '¡Recompensa diaria! +{n} Vcoins': 'Daily reward! +{n} Vcoins',
      'Ya reclamaste la recompensa de hoy.': 'You already claimed today\'s reward.',
      'Reclamar': 'Claim', 'Reclamado': 'Claimed', '+{n} V': '+{n} V',
      '¡Logro reclamado! +{n} Vcoins': 'Achievement claimed! +{n} Vcoins',
      'Cargando…': 'Loading…',
      // errores del servidor (shop.js / server.js)
      'No te alcanzan las Vcoins.': 'You do not have enough Vcoins.',
      'Ese objeto no existe.': 'That item does not exist.',
      'Este objeto se compra desde su propia sección.': 'This item is bought from its own section.',
      'Este objeto no está a la venta.': 'This item is not for sale.',
      'Ya tenés este objeto.': 'You already own this item.',
      'Ya tenés el máximo de esta mejora.': 'You already have the maximum of this upgrade.',
      'Objeto inválido.': 'Invalid item.', 'Categoría inválida.': 'Invalid category.',
      'Todavía no tenés este objeto.': 'You do not own this item yet.',
      'El código debe tener de 3 a 8 letras o números.': 'The code must be 3 to 8 letters or numbers.',
      'Ese código está reservado.': 'That code is reserved.', 'Ya tenés ese código.': 'You already have that code.',
      'Ese código ya está en uso.': 'That code is already in use.',
      'Ese logro no existe.': 'That achievement does not exist.',
      'Todavía no cumpliste este logro.': 'You have not completed this achievement yet.',
      'Ya reclamaste este logro.': 'You already claimed this achievement.',
      'id inválido.': 'Invalid id.', 'id inválido': 'Invalid id',
      'Demasiados intentos. Probá de nuevo en un rato.': 'Too many attempts. Try again in a while.',
      'Escribí un código.': 'Enter a code.', 'Ese código no existe.': 'That code does not exist.',
      'Ese código ya venció.': 'That code has expired.', 'Ese código ya se agotó.': 'That code has run out.',
      'Ya canjeaste este código.': 'You already redeemed this code.',
      'Demasiadas solicitudes, esperá un momento.': 'Too many requests, wait a moment.',
      'Error del servidor': 'Server error', 'No autenticado': 'Not signed in', 'Sesión vencida': 'Session expired',
      'No se pudo cargar la tienda': 'Could not load the shop',
    };
    const RANK_NAMES = {
      cantera: ['Cantera', 'Academy'], suplente: ['Suplente', 'Substitute'], titular: ['Titular', 'Starter'], capitan: ['Capitán', 'Captain'],
      crack: ['Crack', 'Ace'], idolo: ['Ídolo', 'Idol'], inmortal: ['Inmortal', 'Immortal'],
    };
    const rankName = (id) => { const r = RANK_NAMES[id]; return r ? r[en() ? 1 : 0] : String(id || ''); };
    const rankByEs = (es) => { const k = Object.keys(RANK_NAMES).find((x) => RANK_NAMES[x][0] === es); return k ? RANK_NAMES[k][1] : es; };
    const PAT = [
      [/^Se desbloquea al llegar a rango (.+)\.$/, (_, r) => 'Unlocked by reaching ' + rankByEs(r) + ' rank.'],
      [/^Tu escudo ya cubre bastante \(máximo (\d+) días acumulados\)\.$/, 'Your shield already covers a lot (max. $1 days stacked).'],
      [/^Ya tenés mucho boost acumulado \(máximo (\d+) horas\)\.$/, 'You already have a lot of boost stacked (max. $1 hours).'],
    ];
    const fmt = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '')) : s);
    function T(s, v) {
      s = String(s);
      if (!en()) return fmt(s, v);
      let o = EN[s];
      if (o === undefined) for (const [re, rep] of PAT) if (re.test(s)) { o = s.replace(re, rep); break; }
      return fmt(o === undefined ? s : o, v);
    }
    // Objetos del catálogo: [nombre EN, descripción EN]
    const ITEM_EN = {
      f_gold: ['Golden Frame', 'A golden ring around your photo.'],
      f_ice: ['Ice Frame', 'Icy blue with a cold glow.'],
      f_neon: ['Neon Frame', 'A double neon ring that glows.'],
      f_fire: ['Fire Frame', 'A ring burning red and orange.'],
      f_rainbow: ['Rainbow Frame', 'Changes color nonstop.'],
      f_rank_suplente: ['Substitute Rank Frame', 'Unlocked by reaching Substitute rank.'],
      f_rank_titular: ['Starter Rank Frame', 'Unlocked by reaching Starter rank.'],
      f_rank_capitan: ['Captain Rank Frame', 'Unlocked by reaching Captain rank.'],
      f_rank_crack: ['Ace Rank Frame', 'Unlocked by reaching Ace rank.'],
      f_rank_idolo: ['Idol Rank Frame', 'Unlocked by reaching Idol rank.'],
      f_rank_inmortal: ['Immortal Rank Frame', 'Unlocked by reaching Immortal rank.'],
      e_glow: ['Aura', 'Your profile glows with your color.'],
      e_name: ['Gradient Name', 'Your name shifts color in motion.'],
      e_aurora: ['Aurora', 'Lights moving across your banner.'],
      e_sparkle: ['Sparkles', 'Sparks twinkling all over your profile.'],
      t_crack: ['Crack', 'For those who crush it.'],
      t_goleador: ['Top Scorer', 'The one who always scores.'],
      t_mvp: ['MVP', 'The most valuable.'],
      t_leyenda: ['Legend', 'A title for the few.'],
      t_vip: ['VIP', 'Golden and exclusive.'],
      p_ball: ['Ball', "The one that can't be missing."],
      p_cat: ['Kitten', 'Sleeps on your profile.'],
      p_dog: ['Puppy', 'Loyal and cheerful.'],
      p_ghost: ['Ghost', 'Floats by your side.'],
      p_dragon: ['Dragon', 'The rarest in the shop.'],
      c_shield3: ['Shield 3 days', 'Freezes your XP decay for 3 days.'],
      c_shield7: ['Shield 7 days', 'Freezes your XP decay for 7 days.'],
      c_shield14: ['Shield 14 days', 'Freezes your XP decay for 14 days.'],
      c_boost1: ['XP x2 (1 hour)', 'Doubles your XP for 1 hour. Stacks with your pet bonus.'],
      c_boost3: ['XP x2 (3 hours)', 'Doubles your XP for 3 hours. Stacks with your pet bonus.'],
      u_maps: ['More maps', '+10 slots for uploading maps (up to 3 times).'],
      u_banner: ['HD Banner', 'Allows a heavier profile banner.'],
      u_pins: ['More pinned rooms', '+3 pinned rooms (up to 2 times).'],
      e_hearts: ['Hearts', 'Little hearts floating up your profile.'],
      e_snow: ['Snowfall', 'Snowflakes falling over your profile.'],
      e_glitch: ['Glitch', 'Your name distorts like a broken signal.'],
      e_matrix: ['Matrix', 'Green code rain behind your profile.'],
      e_fire: ['Flames', 'Animated fire on your profile.'],
      e_rgb: ['RGB Border', 'A border that cycles through every color.'],
      e_pulse: ['Pulse', 'Your profile beats softly.'],
      t_noob: ['Noob', 'Proudly.'], t_tryhard: ['Tryhard', 'Never rests.'], t_pro: ['Pro', 'Professional level.'],
      t_arquero: ['Goalie', 'Under the three sticks.'], t_muro: ['Wall', 'Nothing gets through here.'], t_capitan: ['Captain', 'Leads the team.'],
      t_maquina: ['Machine', 'No mistakes.'], t_rey: ['King', 'The crown is yours.'], t_sombra: ['Shadow', 'Appears and disappears.'],
      t_bestia: ['Beast', 'Unstoppable.'], t_og: ['OG', 'Since the beginning.'], t_dios: ['God', 'The priciest title.'],
      p_chick: ['Chick', 'Small but steady.'], p_frog: ['Froggy', 'Jumps for joy on every goal.'], p_fox: ['Foxy', 'Clever and quick.'],
      p_panda: ['Panda', 'Calm, but deadly.'], p_owl: ['Owl', 'Plays at night.'], p_robot: ['Robot', 'Mechanical precision.'],
      p_alien: ['Alien', 'Comes from another planet.'], p_wolf: ['Wolf', 'Leader of the pack.'], p_unicorn: ['Unicorn', 'Magical and uncommon.'],
      p_eagle: ['Eagle', 'Sees the play before anyone.'], p_trex: ['T-Rex', 'The ultimate pet.'],
      b_nacional: ['Atlético Nacional badge', 'Colombia · next to your name.'], b_millonarios: ['Millonarios badge', 'Colombia · next to your name.'], b_boca: ['Boca Juniors badge', 'Argentina · next to your name.'], b_river: ['River Plate badge', 'Argentina · next to your name.'], b_flamengo: ['Flamengo badge', 'Brazil · next to your name.'], b_corinthians: ['Corinthians badge', 'Brazil · next to your name.'], b_america_mx: ['Club América badge', 'Mexico · next to your name.'], b_chivas: ['Chivas badge', 'Mexico · next to your name.'], b_madrid: ['Real Madrid badge', 'Spain · next to your name.'], b_barcelona: ['Barcelona badge', 'Spain · next to your name.'], b_manutd: ['Manchester United badge', 'England · next to your name.'], b_liverpool: ['Liverpool badge', 'England · next to your name.'], b_juventus: ['Juventus badge', 'Italy · next to your name.'], b_milan: ['AC Milan badge', 'Italy · next to your name.'], b_bayern: ['Bayern Múnich badge', 'Germany · next to your name.'], b_dortmund: ['Borussia Dortmund badge', 'Germany · next to your name.'],
      f_bronze: ['Bronze Frame', 'Warm copper with a soft shine.'],
      f_mint: ['Mint Frame', 'Fresh, bright green.'],
      f_ocean: ['Ocean Frame', 'Blue waves that never stop.'],
      f_candy: ['Candy Frame', 'Pink and sky blue, like cotton candy.'],
      f_sunset: ['Sunset Frame', 'Orange, pink and violet of the sky.'],
      f_toxic: ['Toxic Frame', 'Acid green that bubbles.'],
      f_ruby: ['Ruby Frame', 'Deep red with sparkles.'],
      f_cyber: ['Cyber Frame', 'Yellow and cyan of a futuristic city.'],
      f_royal: ['Royal Frame', 'Royal purple with golden threads.'],
      f_diamond: ['Diamond Frame', 'Pure crystal that reflects light.'],
      e_goldname: ['Golden Name', 'Your name shines like gold.'],
      e_neonname: ['Neon Name', 'Your name pulses with neon light.'],
      e_rain: ['Rain', 'Fine rain over your profile.'],
      e_bubbles: ['Bubbles', 'Bubbles floating upward.'],
      e_confetti: ['Confetti', 'A party of colorful confetti.'],
      e_lightning: ['Lightning', 'Storm flashes across your profile.'],
      t_gg: ['GG', 'Good game, always.'],
      t_zurdo: ['Lefty', 'Hits with the left.'],
      t_veloz: ['Swift', 'Gets there before the ball.'],
      t_sniper: ['Sniper', 'One shot, one goal.'],
      t_clutch: ['Clutch', 'Shows up in the final minutes.'],
      t_pichichi: ['Top Scorer+', 'Top scorer, no debate.'],
      t_elite: ['Elite', 'Only for the best.'],
      t_fenix: ['Phoenix', 'Always rises again.'],
      t_campeon: ['Champion', 'The one who lifts the cup.'],
      t_inmortal: ['Immortal', 'Their name is never forgotten.'],
      p_penguin: ['Penguin', 'Walks elegantly on the ice.'],
      p_turtle: ['Turtle', 'Slow but steady.'],
      p_bee: ['Bee', 'Works nonstop.'],
      p_bear: ['Bear', 'Strong and cuddly.'],
      p_octopus: ['Octopus', 'Eight arms, zero excuses.'],
      p_shark: ['Shark', 'Smells a goal from afar.'],
      p_lion: ['Lion', 'King of the pitch.'],
      p_peacock: ['Peacock', 'Shows off every play.'],
      p_dragon2: ['Red Dragon', 'Older and more feared.'],
      b_benfica: ['Benfica badge', 'Portugal · The Eagles of Lisbon.'],
      b_porto: ['FC Porto badge', 'Portugal · The Dragons, blue and white.'],
      b_ajax: ['Ajax badge', 'Netherlands · Red and white of Amsterdam.'],
      b_psg: ['PSG badge', 'France · The capital of fashion and goals.'],
      b_colocolo: ['Colo-Colo badge', 'Chile · The Cacique, white and black.'],
      b_penarol: ['Peñarol badge', 'Uruguay · Carboneros, yellow and black.'],
      b_alianza: ['Alianza Lima badge', 'Peru · Blue and white of La Victoria.'],
      b_olimpia: ['Olimpia badge', 'Paraguay · The Decano, white and black.'],
      c_shield30: ['Shield 30 days', 'Freezes your XP decay for 30 days.'],
      c_boost6: ['XP x2 (6 hours)', 'Doubles your XP for 6 hours. Stacks with your pet bonus.'],
      c_boost12: ['XP x2 (12 hours)', 'Doubles your XP for 12 hours. Stacks with your pet bonus.'],
      u_daily: ['Daily reward+', '+10 Vcoins on your daily reward (up to 3 times).'],
      u_gifts: ['More gifts', '+5 gifts per day (up to 2 times).'],
      x_box: ['Mystery box', 'A random item you do not own yet (up to 700 Vcoins). Cheap ones drop more often.'],
      x_petfood: ['Pet food', 'Your equipped pet instantly gains 2 hours of experience.'],
      x_friendcode: ['Custom friend code', 'Change VV-ABC123 to whatever you want (e.g. VV-BETA). It is unique.'],
    };
    const TITLE_EN = { GOLEADOR: 'TOP SCORER', LEYENDA: 'LEGEND', ARQUERO: 'GOALIE', MURO: 'WALL', 'CAPITÁN': 'CAPTAIN', 'MÁQUINA': 'MACHINE', REY: 'KING', SOMBRA: 'SHADOW', BESTIA: 'BEAST', DIOS: 'GOD', 'ZURDO': 'LEFTY', 'VELOZ': 'SWIFT', 'PICHICHI': 'TOP SCORER+', 'ÉLITE': 'ELITE', 'FÉNIX': 'PHOENIX', 'CAMPEÓN': 'CHAMPION', 'INMORTAL': 'IMMORTAL' };
    const ACH_EN = {
      nick: ['With a name of your own', 'Set your Haxball nick on your profile.'],
      avatar: ['Visible face', 'Upload your profile picture.'],
      friend1: ['First friend', 'Add your first friend.'],
      friend5: ['Sociable', 'Reach 5 friends.'],
      play1: ['Warming up', 'Play 1 hour in total.'],
      play10: ['Regular', 'Play 10 hours in total.'],
      play50: ['Veteran', 'Play 50 hours in total.'],
      map1: ['Map maker', 'Upload your first map.'],
      map5: ['Architect', 'Upload 5 maps.'],
      buy1: ['First purchase', 'Buy your first item in the shop.'],
      friend10: ['Beloved', 'Reach 10 friends.'],
      friend25: ['Popular', 'Reach 25 friends.'],
      play100: ['Addicted', 'Play 100 hours in total.'],
      play250: ['Living legend', 'Play 250 hours in total.'],
      map10: ['Builder', 'Upload 10 maps.'],
      buy5: ['Customer', 'Make 5 purchases in the shop.'],
      buy15: ['VIP customer', 'Make 15 purchases in the shop.'],
      collect10: ['Collector I', 'Own 10 items in your inventory.'],
      collect25: ['Collector', 'Own 25 items in your inventory.'],
      gift1: ['Generous', 'Gift an item to a friend.'],
      gift10: ['Santa Claus', 'Send 10 gifts.'],
      daily7: ['Steady', 'Claim the daily reward 7 times.'],
      daily30: ['Unstoppable', 'Claim the daily reward 30 times.'],
      redeem1: ['Code hunter', 'Redeem your first promo code.'],
      ownfc: ['Own identity', 'Buy your custom friend code.'],
      petlv3: ['Best friend', 'Raise a pet to level 3.'],
      petmax: ['Tamer', 'Take a pet to max level.'],
      rich: ['Saver', 'Save up 1000 Vcoins.'],
    };
    const itemName = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][0] : i.name);
    const itemDesc = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][1] : i.desc);
    const titleText = (c) => { const x = c.text || c.name; return en() ? (TITLE_EN[x] || (ITEM_EN[c.id] && !c.text ? ITEM_EN[c.id][0] : x)) : x; };

    const TABS = [['deals', 'Ofertas'], ['frame', 'Marcos'], ['effect', 'Efectos'], ['title', 'Textos'], ['badge', 'Insignias'], ['pet', 'Mascotas'],
      ['consumable', 'Consumibles'], ['perk', 'Mejoras'], ['special', 'Especiales'], ['ach', 'Logros']];
    const EQUIP = ['frame', 'effect', 'title', 'badge', 'pet'];
    const S = {
      balance: 0, catalog: [], owned: new Set(), equipped: {}, earn: null, deals: null, tab: 'frame', busy: false,
      pets: {}, xpMult: 1, shield: 0, boost: null, perks: {}, extra: {},
      ach: null, daily: null, code: '', fc: '',
    };
    // Mismos valores que PET_LEVELS / PET_STEP de shop.js (si los cambiás allá, cambialos acá).
    const PET_LEVELS = [0, 7200, 21600, 54000, 108000, 216000], PET_STEP = 0.2;

    // ------------------------------------------------------------ estilos de los objetos (se ven en el perfil y en la vista previa)
    const css = document.createElement('style');
    css.textContent = `
    /* ===== Marcos y auras: anillos con degradado cónico animado (se ven en el perfil y en la tienda) ===== */
    @property --cos-a{syntax:'<angle>';inherits:false;initial-value:0deg}
    @keyframes cos-spin{to{--cos-a:360deg}}
    /* Base común: el anillo es el borde de la foto (degradado en border-box) + anillo exterior + brillo */
    [class*="cos-f_"]{border:4px solid transparent !important;background-origin:border-box !important}
    /* --- Dorado: metal pulido con reflejo que gira --- */
    .cos-f_gold{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fff6c2,#f5c542 14%,#a8780f 28%,#f5c542 42%,#fff6c2 50%,#f5c542 64%,#a8780f 78%,#f5c542 92%,#fff6c2) border-box !important;
      outline:2px solid #f5c54299 !important;outline-offset:3px;animation:cos-spin 7s linear infinite,cos-p-gold 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-gold{from{box-shadow:0 0 10px #f5c54255}to{box-shadow:0 0 26px #f5c542cc,0 0 4px #fff6c2}}
    /* --- Hielo: cristal con aro punteado y brillo frío --- */
    .cos-f_ice{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ffffff,#8fe3ff 20%,#3d8fc4 40%,#d9f7ff 55%,#8fe3ff 75%,#ffffff) border-box !important;
      outline:2px dashed #bff3ffaa !important;outline-offset:4px;animation:cos-spin 11s linear infinite,cos-p-ice 3.2s ease-in-out infinite alternate}
    @keyframes cos-p-ice{from{box-shadow:0 0 8px #8fe3ff55,inset 0 0 6px #8fe3ff44}to{box-shadow:0 0 24px #8fe3ffcc,0 0 2px #fff,inset 0 0 10px #8fe3ff77}}
    /* --- Neón: dos tubos de luz (cian y magenta) girando en sentidos distintos --- */
    .cos-f_neon{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#17e0e8,#17e0e8 20%,#04141a 30%,#ff3df0 50%,#ff3df0 70%,#04141a 80%,#17e0e8) border-box !important;
      outline:2px solid #ff3df0 !important;outline-offset:3px;animation:cos-spin 2.6s linear infinite,cos-p-neon 1.4s ease-in-out infinite alternate}
    @keyframes cos-p-neon{from{box-shadow:0 0 8px #17e0e8aa,0 0 14px #ff3df066}to{box-shadow:0 0 18px #17e0e8,0 0 34px #ff3df0aa}}
    /* --- Fuego: llamas que giran y parpadean --- */
    .cos-f_fire{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#c21500,#ff3b1a 12%,#ffb02b 25%,#ffec7a 33%,#ff7a18 45%,#c21500 58%,#ff3b1a 70%,#ffb02b 82%,#ff7a18 92%,#c21500) border-box !important;
      outline:2px solid #ff7a1888 !important;outline-offset:3px;animation:cos-spin 2.4s linear infinite,cos-p-fire 1.1s steps(6,jump-none) infinite alternate}
    @keyframes cos-p-fire{0%{box-shadow:0 0 10px #ff3b1a99}30%{box-shadow:0 0 22px #ff9b1acc,0 -6px 14px #ffec7a66}60%{box-shadow:0 0 14px #ff3b1abb}100%{box-shadow:0 0 26px #ffb02bcc,0 -8px 16px #ff7a1888}}
    /* --- Arcoíris: espectro completo que gira, con brillo que cambia de color --- */
    .cos-f_rainbow{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ff3b3b,#ffb02b,#f6ff4a,#4cff6a,#2bd6ff,#5b6bff,#ff3df0,#ff3b3b) border-box !important;
      outline:1px solid #ffffffaa !important;outline-offset:3px;animation:cos-spin 3.5s linear infinite,cos-p-rb 5s linear infinite}
    @keyframes cos-p-rb{0%{box-shadow:0 0 16px #ff3b3b}17%{box-shadow:0 0 16px #ffb02b}33%{box-shadow:0 0 16px #4cff6a}50%{box-shadow:0 0 16px #2bd6ff}67%{box-shadow:0 0 16px #5b6bff}83%{box-shadow:0 0 16px #ff3df0}100%{box-shadow:0 0 16px #ff3b3b}}
    /* --- Rangos de competitivo (se ganan jugando): del más simple al más imponente --- */
    .cos-f_rank_suplente{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#e0fbff,#22d3ee 25%,#0e7490 50%,#22d3ee 75%,#e0fbff) border-box !important;
      outline:none !important;animation:cos-spin 12s linear infinite,cos-p-sup 3s ease-in-out infinite alternate}
    @keyframes cos-p-sup{from{box-shadow:0 0 8px #22d3ee44}to{box-shadow:0 0 20px #22d3eeaa}}
    .cos-f_rank_titular{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        repeating-conic-gradient(from var(--cos-a),#3b82f6 0 9deg,#1e3a8a 9deg 18deg) border-box !important;
      outline:none !important;animation:cos-spin 14s linear infinite,cos-p-tit 3s ease-in-out infinite alternate}
    @keyframes cos-p-tit{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #3b82f6,0 0 12px 3px #3b82f655}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #93c5fd,0 0 22px 4px #3b82f6aa}}
    .cos-f_rank_capitan{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ede9fe 0 8%,#8b5cf6 0 17%,#5b21b6 0 25%,#c4b5fd 0 33%,#8b5cf6 0 42%,#ede9fe 0 50%,#5b21b6 0 58%,#c4b5fd 0 67%,#8b5cf6 0 75%,#ede9fe 0 83%,#5b21b6 0 92%,#c4b5fd 0 100%) border-box !important;
      outline:none !important;animation:cos-spin 10s linear infinite,cos-p-cap 2.4s ease-in-out infinite alternate}
    @keyframes cos-p-cap{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 4px #8b5cf6,0 0 0 7px var(--bg-elev-2),0 0 0 8px #c4b5fd88,0 0 16px 6px #8b5cf655}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 4px #ede9fe,0 0 0 7px var(--bg-elev-2),0 0 0 8px #8b5cf6cc,0 0 28px 8px #8b5cf6aa}}
    .cos-f_rank_crack{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ec4899,#ec4899 20%,#1a0410 30%,#fbcfe8 50%,#fbcfe8 62%,#1a0410 78%,#ec4899) border-box !important;
      outline:2px solid #ec4899 !important;outline-offset:3px;animation:cos-spin 2.8s linear infinite,cos-p-cra 1.4s ease-in-out infinite alternate}
    @keyframes cos-p-cra{from{box-shadow:0 0 8px #ec4899aa,0 0 14px #fbcfe855}to{box-shadow:0 0 18px #ec4899,0 0 34px #ec4899aa}}
    .cos-f_rank_idolo{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#c2410c,#f97316 14%,#fde047 28%,#f97316 42%,#c2410c 56%,#f97316 70%,#fde047 84%,#c2410c) border-box !important;
      outline:2px solid #f9731688 !important;outline-offset:3px;animation:cos-spin 2.6s linear infinite,cos-p-ido 1.1s steps(6,jump-none) infinite alternate}
    @keyframes cos-p-ido{0%{box-shadow:0 0 10px #f9731699}40%{box-shadow:0 0 22px #fdba74cc,0 -6px 14px #fde04766}100%{box-shadow:0 0 26px #f97316cc,0 -8px 16px #fde04788}}
    .cos-f_rank_inmortal{border-width:5px !important;background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ef4444,#fde047 16%,#7f1d1d 33%,#ef4444 50%,#fde047 66%,#7f1d1d 83%,#ef4444) border-box !important;
      outline:none !important;animation:cos-spin 3s linear infinite,cos-p-inm 1.6s ease-in-out infinite alternate}
    @keyframes cos-p-inm{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #ef4444,0 0 0 8px var(--bg-elev-2),0 0 0 9px #fde04788,0 0 18px 6px #ef444466}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #fde047,0 0 0 8px var(--bg-elev-2),0 0 0 9px #ef4444cc,0 0 34px 10px #ef4444aa}}
    /* ===== Marcos nuevos (a la venta) ===== */
    .cos-f_emerald{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#d1fae5,#10b981 18%,#047857 36%,#6ee7b7 50%,#10b981 68%,#065f46 84%,#d1fae5) border-box !important;
      outline:2px solid #34d39988 !important;outline-offset:3px;animation:cos-spin 6s linear infinite,cos-p-em 2.8s ease-in-out infinite alternate}
    @keyframes cos-p-em{from{box-shadow:0 0 10px #10b98155}to{box-shadow:0 0 24px #34d399cc,0 0 3px #d1fae5}}
    .cos-f_sakura{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fff1f7,#f9a8d4 20%,#ec4899 40%,#fbcfe8 55%,#f9a8d4 75%,#fff1f7) border-box !important;
      outline:2px dotted #fbcfe8bb !important;outline-offset:4px;animation:cos-spin 12s linear infinite,cos-p-sk 3.4s ease-in-out infinite alternate}
    @keyframes cos-p-sk{from{box-shadow:0 0 8px #f9a8d444}to{box-shadow:0 0 22px #f9a8d4bb,0 0 2px #fff}}
    .cos-f_shadow{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#0b0714,#1f1534 25%,#7c3aed 45%,#1f1534 60%,#0b0714 80%,#4c1d95) border-box !important;
      outline:2px solid #7c3aed66 !important;outline-offset:3px;animation:cos-spin 9s linear infinite,cos-p-sh 2.2s ease-in-out infinite alternate}
    @keyframes cos-p-sh{from{box-shadow:0 0 10px #7c3aed55}to{box-shadow:0 0 28px 3px #7c3aedaa}}
    .cos-f_electric{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#0b1220 0 12%,#38bdf8 18%,#e0f2fe 22%,#0b1220 30% 55%,#38bdf8 62%,#e0f2fe 66%,#0b1220 74%) border-box !important;
      outline:2px solid #7dd3fc99 !important;outline-offset:3px;animation:cos-spin 1.8s linear infinite,cos-p-el 0.9s steps(4,jump-none) infinite alternate}
    @keyframes cos-p-el{from{box-shadow:0 0 8px #38bdf8aa}to{box-shadow:0 0 22px #7dd3fc,0 0 4px #fff}}
    .cos-f_lava{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#450a0a,#dc2626 20%,#f97316 38%,#fde047 46%,#f97316 54%,#dc2626 72%,#450a0a) border-box !important;
      outline:2px solid #ef444488 !important;outline-offset:3px;animation:cos-spin 8s linear infinite,cos-p-lv 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-lv{from{box-shadow:0 0 10px #dc262655}to{box-shadow:0 0 28px #f97316cc,0 0 4px #fde047}}
    .cos-f_galaxy{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#0f0a2e,#4338ca 18%,#a855f7 34%,#f0abfc 42%,#6366f1 58%,#0f0a2e 76%,#7c3aed 90%,#0f0a2e) border-box !important;
      outline:2px dashed #a78bfa88 !important;outline-offset:4px;animation:cos-spin 10s linear infinite,cos-p-gx 3.2s ease-in-out infinite alternate}
    @keyframes cos-p-gx{from{box-shadow:0 0 12px #6366f155}to{box-shadow:0 0 30px #a855f7bb,0 0 4px #f0abfc}}
    .cos-f_crown{border-width:5px !important;background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fff6c2,#facc15 12%,#b45309 26%,#fde047 40%,#fff6c2 50%,#facc15 62%,#b45309 76%,#fde047 90%,#fff6c2) border-box !important;
      outline:none !important;animation:cos-spin 5s linear infinite,cos-p-cr 1.8s ease-in-out infinite alternate}
    @keyframes cos-p-cr{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #facc15,0 0 16px 4px #facc1566}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #fff6c2,0 0 30px 6px #facc15bb}}
    /* ===== Marcos nuevos (a la venta) ===== */
    .cos-f_bronze{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fde7cf,#d08a4f 18%,#7a4a22 36%,#e3a46a 52%,#fde7cf 62%,#d08a4f 80%,#7a4a22 92%,#fde7cf) border-box !important;
      outline:2px solid #d08a4f88 !important;outline-offset:3px;animation:cos-spin 9s linear infinite,cos-p-bronze 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-bronze{from{box-shadow:0 0 8px #d08a4f44}to{box-shadow:0 0 24px #d08a4fcc,0 0 3px #fde7cf}}
    .cos-f_mint{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ecfff6,#6ee7b7 20%,#14b8a6 40%,#a7f3d0 55%,#2dd4bf 75%,#ecfff6) border-box !important;
      outline:2px solid #2dd4bf88 !important;outline-offset:3px;animation:cos-spin 8s linear infinite,cos-p-mint 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-mint{from{box-shadow:0 0 8px #2dd4bf44}to{box-shadow:0 0 24px #2dd4bfcc,0 0 3px #a7f3d0}}
    .cos-f_ocean{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#e0f7ff,#38bdf8 18%,#0369a1 38%,#7dd3fc 52%,#0ea5e9 72%,#082f49 88%,#e0f7ff) border-box !important;
      outline:2px dashed #0ea5e988 !important;outline-offset:3px;animation:cos-spin 7s linear infinite,cos-p-ocean 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-ocean{from{box-shadow:0 0 8px #0ea5e944}to{box-shadow:0 0 24px #0ea5e9cc,0 0 3px #7dd3fc}}
    .cos-f_candy{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fbcfe8,#f472b6 20%,#a5f3fc 40%,#fbcfe8 55%,#f472b6 75%,#a5f3fc 90%,#fbcfe8) border-box !important;
      outline:2px solid #f472b688 !important;outline-offset:3px;animation:cos-spin 5s linear infinite,cos-p-candy 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-candy{from{box-shadow:0 0 8px #f472b644}to{box-shadow:0 0 24px #f472b6cc,0 0 3px #a5f3fc}}
    .cos-f_sunset{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fde047,#fb923c 18%,#ec4899 38%,#7c3aed 58%,#ec4899 76%,#fb923c 90%,#fde047) border-box !important;
      outline:2px solid #ec489988 !important;outline-offset:3px;animation:cos-spin 8s linear infinite,cos-p-sunset 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-sunset{from{box-shadow:0 0 8px #ec489944}to{box-shadow:0 0 24px #ec4899cc,0 0 3px #fb923c}}
    .cos-f_toxic{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#1a2e05,#84cc16 16%,#d9f99d 30%,#65a30d 46%,#1a2e05 60%,#a3e635 78%,#1a2e05) border-box !important;
      outline:2px dashed #a3e63588 !important;outline-offset:3px;animation:cos-spin 3.2s linear infinite,cos-p-toxic 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-toxic{from{box-shadow:0 0 8px #a3e63544}to{box-shadow:0 0 24px #a3e635cc,0 0 3px #65a30d}}
    .cos-f_ruby{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fecaca,#ef4444 16%,#7f1d1d 34%,#f87171 48%,#fff1f2 52%,#dc2626 68%,#450a0a 86%,#fecaca) border-box !important;
      outline:2px solid #dc262688 !important;outline-offset:3px;animation:cos-spin 6s linear infinite,cos-p-ruby 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-ruby{from{box-shadow:0 0 8px #dc262644}to{box-shadow:0 0 24px #dc2626cc,0 0 3px #fecaca}}
    .cos-f_cyber{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#fde047 0 12%,#0b0f1a 12% 22%,#22d3ee 22% 34%,#0b0f1a 34% 44%,#fde047 44% 56%,#0b0f1a 56% 66%,#22d3ee 66% 78%,#0b0f1a 78% 88%,#fde047 88% 100%) border-box !important;
      outline:2px solid #22d3ee88 !important;outline-offset:3px;animation:cos-spin 2.2s linear infinite,cos-p-cyber 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-cyber{from{box-shadow:0 0 8px #22d3ee44}to{box-shadow:0 0 24px #22d3eecc,0 0 3px #fde047}}
    .cos-f_royal{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#f5d0fe,#a855f7 16%,#581c87 32%,#facc15 44%,#a855f7 58%,#3b0764 76%,#facc15 88%,#f5d0fe) border-box !important;
      outline:2px solid #a855f788 !important;outline-offset:3px;animation:cos-spin 6s linear infinite,cos-p-royal 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-royal{from{box-shadow:0 0 8px #a855f744}to{box-shadow:0 0 24px #a855f7cc,0 0 3px #facc15}}
    .cos-f_diamond{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ffffff,#bae6fd 12%,#e0e7ff 24%,#ffffff 32%,#a5f3fc 46%,#f5f3ff 60%,#ffffff 68%,#c7d2fe 82%,#ffffff) border-box !important;
      outline:2px solid #a5f3fc88 !important;outline-offset:3px;animation:cos-spin 4s linear infinite,cos-p-diamond 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-diamond{from{box-shadow:0 0 8px #a5f3fc44}to{box-shadow:0 0 24px #a5f3fccc,0 0 3px #ffffff}}
    /* ===== Marcos que se ganan con logros ===== */
    .cos-f_ach_veteran{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        repeating-conic-gradient(from var(--cos-a),#cbd5e1 0 10deg,#475569 10deg 20deg) border-box !important;
      outline:none !important;animation:cos-spin 16s linear infinite,cos-p-av 3s ease-in-out infinite alternate}
    @keyframes cos-p-av{from{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #94a3b8,0 0 12px 3px #e2e8f044}to{box-shadow:0 0 0 3px var(--bg-elev-2),0 0 0 5px #e2e8f0,0 0 22px 4px #e2e8f088}}
    .cos-f_ach_social{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#f472b6,#22d3ee 25%,#a78bfa 50%,#f472b6 75%,#22d3ee) border-box !important;
      outline:2px solid #ffffff66 !important;outline-offset:3px;animation:cos-spin 4s linear infinite,cos-p-so 2.4s ease-in-out infinite alternate}
    @keyframes cos-p-so{from{box-shadow:0 0 10px #f472b666}to{box-shadow:0 0 24px #22d3eecc}}
    .cos-f_ach_collector{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#14b8a6 0 25%,#facc15 0 50%,#14b8a6 0 75%,#facc15 0 100%) border-box !important;
      outline:2px solid #14b8a688 !important;outline-offset:3px;animation:cos-spin 8s linear infinite,cos-p-co 2.6s ease-in-out infinite alternate}
    @keyframes cos-p-co{from{box-shadow:0 0 10px #14b8a655}to{box-shadow:0 0 24px #facc15aa}}
    .cos-f_ach_pet{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#f59e0b,#84cc16 30%,#fde68a 50%,#84cc16 70%,#f59e0b) border-box !important;
      outline:2px solid #84cc1688 !important;outline-offset:3px;animation:cos-spin 5s linear infinite,cos-p-pe 2.2s ease-in-out infinite alternate}
    @keyframes cos-p-pe{from{box-shadow:0 0 10px #f59e0b55}to{box-shadow:0 0 26px #84cc16bb}}

    /* ===== Efectos del perfil (van sobre toda la ventana .pf-box) ===== */
    /* --- Aura: respira, con un anillo de luz que recorre el borde y un resplandor que cae desde arriba --- */
    .cos-e_glow{position:relative;animation:cos-aura 3.4s ease-in-out infinite alternate}
    @keyframes cos-aura{from{box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 16px var(--pf-color,var(--accent)),0 0 40px var(--pf-color,var(--accent))}
      to{box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 28px var(--pf-color,var(--accent)),0 0 84px var(--pf-color,var(--accent))}}
    .cos-e_glow::before{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;padding:2px;box-sizing:border-box;
      background:conic-gradient(from var(--cos-a),var(--pf-color,var(--accent)) 0,transparent 22%,transparent 50%,var(--pf-color,var(--accent)) 64%,transparent 86%,var(--pf-color,var(--accent)) 100%);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:cos-spin 6s linear infinite}
    .cos-e_glow::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;mix-blend-mode:screen;
      background:radial-gradient(120% 55% at 50% -8%,var(--pf-color,var(--accent)) 0,transparent 70%);animation:cos-breathe 3.4s ease-in-out infinite alternate}
    @keyframes cos-breathe{from{opacity:.12}to{opacity:.38}}
    /* --- Nombre en degradé: colores en movimiento con halo --- */
    .cos-e_name .pf-name,.cos-e_name .fx-name{background:linear-gradient(90deg,#17e0e8,#a78bfa,#ff5470,#ffc12b,#3ddc84,#17e0e8);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
      filter:drop-shadow(0 0 6px #a78bfa88);animation:cos-name 5s linear infinite}
    @keyframes cos-name{to{background-position:300% 0}}
    /* --- Aurora: cortinas de luz que ondulan sobre el banner --- */
    .cos-e_aurora .pf-banner,.cos-e_aurora .fx-banner{position:relative;overflow:hidden}
    .cos-e_aurora .pf-banner::before,.cos-e_aurora .fx-banner::before{content:"";position:absolute;inset:-30% -10%;pointer-events:none;mix-blend-mode:screen;filter:blur(10px);
      background:radial-gradient(40% 70% at 18% 85%,#17e0e8cc,transparent 70%),radial-gradient(35% 60% at 52% 92%,#a78bfacc,transparent 70%),radial-gradient(40% 70% at 86% 82%,#3ddc84cc,transparent 70%);
      animation:cos-curtain 7s ease-in-out infinite alternate}
    @keyframes cos-curtain{from{transform:translateX(-7%) skewX(-7deg)}to{transform:translateX(7%) skewX(7deg)}}
    .cos-e_aurora .pf-banner::after,.cos-e_aurora .fx-banner::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:.5;
      background:linear-gradient(115deg,transparent 10%,#17e0e866 30%,#a78bfa66 50%,#ff547066 70%,transparent 90%);background-size:250% 100%;animation:cos-aur 6s ease-in-out infinite alternate}
    @keyframes cos-aur{from{background-position:0 0}to{background-position:100% 0}}
    /* --- Destellos: dos capas de estrellas que titilan en fases distintas --- */
    .cos-e_sparkle{position:relative}
    .cos-e_sparkle::before,.cos-e_sparkle::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none}
    .cos-e_sparkle::before{background-image:radial-gradient(2px 2px at 12% 22%,#fff,transparent),radial-gradient(2.5px 2.5px at 78% 14%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 60%,#fff,transparent),radial-gradient(2px 2px at 88% 70%,#fff,transparent),radial-gradient(1.5px 1.5px at 24% 86%,#fff,transparent),radial-gradient(2px 2px at 60% 36%,#fff,transparent),radial-gradient(2.5px 2.5px at 94% 40%,#bff3ff,transparent);animation:cos-tw 2.2s ease-in-out infinite alternate}
    .cos-e_sparkle::after{background-image:radial-gradient(2px 2px at 30% 12%,#ffe27a,transparent),radial-gradient(1.5px 1.5px at 66% 78%,#fff,transparent),radial-gradient(2.5px 2.5px at 8% 54%,#fff,transparent),radial-gradient(2px 2px at 52% 92%,#ffe27a,transparent),radial-gradient(1.5px 1.5px at 84% 26%,#fff,transparent),radial-gradient(2px 2px at 46% 40%,#bff3ff,transparent);animation:cos-tw 3s ease-in-out -1.2s infinite alternate}
    @keyframes cos-tw{from{opacity:.1}to{opacity:.95}}
    @media (prefers-reduced-motion:reduce){[class*="cos-f_"],[class*="cos-e_"],[class*="cos-e_"]::before,[class*="cos-e_"]::after,[class*="cos-e_"] .pf-banner::before,[class*="cos-e_"] .pf-banner::after{animation:none !important}}
    /* Textos, mascotas y clan */
    .cos-trow{display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap}
    .cos-badge{display:inline-flex;align-items:center;line-height:0;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45))}
    .cos-badge-big{filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))}
    .cos-title{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#04141a;background:var(--accent)}
    .cos-clan{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:800;letter-spacing:.06em;border:1px solid var(--accent);color:var(--accent)}
    .cos-t_crack{background:linear-gradient(135deg,#17e0e8,#0aa8c9)}
    .cos-t_goleador{background:linear-gradient(135deg,#ff7a18,#ff3b1a);color:#fff}
    .cos-t_mvp{background:linear-gradient(135deg,#a78bfa,#6d4df2);color:#fff}
    .cos-t_leyenda{background:linear-gradient(135deg,#ff5470,#b8183a);color:#fff}
    .cos-t_vip{background:linear-gradient(135deg,#ffe27a,#f5b74b,#c98a12);box-shadow:0 0 12px #f5b74b88}

    /* ===== Textos: color propio de cada uno ===== */
    .cos-t_noob{background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#1e293b}
    .cos-t_tryhard{background:linear-gradient(135deg,#34d399,#059669);color:#04241a}
    .cos-t_pro{background:linear-gradient(135deg,#60a5fa,#2563eb);color:#fff}
    .cos-t_arquero{background:linear-gradient(135deg,#a3e635,#4d7c0f);color:#0b1a02}
    .cos-t_muro{background:linear-gradient(135deg,#94a3b8,#475569);color:#fff}
    .cos-t_capitan{background:linear-gradient(135deg,#ef4444,#991b1b);color:#fff}
    .cos-t_maquina{background:linear-gradient(135deg,#22d3ee,#0e7490);color:#021a20;box-shadow:0 0 10px #22d3ee66}
    .cos-t_rey{background:linear-gradient(135deg,#fde047,#ca8a04,#854d0e);color:#2a1500;box-shadow:0 0 12px #facc1588}
    .cos-t_sombra{background:linear-gradient(135deg,#6d28d9,#0b0714);color:#e9d5ff;box-shadow:0 0 10px #7c3aed88}
    .cos-t_bestia{background:linear-gradient(135deg,#fb923c,#9a3412);color:#fff}
    .cos-t_og{background:linear-gradient(135deg,#fde68a,#d97706,#78350f);color:#2a1500;box-shadow:0 0 10px #d9770688}
    .cos-t_dios{background:linear-gradient(135deg,#fff6c2,#facc15 35%,#f472b6 70%,#8b5cf6);color:#1a0b2e;box-shadow:0 0 14px #facc15aa}

    /* ===== Textos nuevos ===== */
    .cos-t_gg{background:linear-gradient(135deg,#86efac,#16a34a);color:#052e16;}
    .cos-t_zurdo{background:linear-gradient(135deg,#fca5a5,#dc2626);color:#fff;}
    .cos-t_veloz{background:linear-gradient(135deg,#fde047,#f59e0b);color:#2a1500;}
    .cos-t_sniper{background:linear-gradient(135deg,#475569,#0f172a);color:#e2e8f0;box-shadow:0 0 10px #47556988;}
    .cos-t_clutch{background:linear-gradient(135deg,#f0abfc,#a21caf);color:#fff;box-shadow:0 0 10px #c026d388;}
    .cos-t_pichichi{background:linear-gradient(135deg,#fb923c,#be123c);color:#fff;}
    .cos-t_elite{background:linear-gradient(135deg,#e2e8f0,#94a3b8,#e2e8f0);color:#0f172a;box-shadow:0 0 12px #e2e8f088;}
    .cos-t_fenix{background:linear-gradient(135deg,#fde047,#f97316,#dc2626);color:#fff;box-shadow:0 0 12px #f9731699;}
    .cos-t_campeon{background:linear-gradient(135deg,#fff6c2,#facc15,#b45309);color:#2a1500;box-shadow:0 0 14px #facc15aa;}
    .cos-t_inmortal{background:linear-gradient(135deg,#ef4444,#fde047,#7f1d1d);color:#fff;box-shadow:0 0 16px #ef4444aa;}
    /* ===== Efectos nuevos (las capas se mueven con background-position / opacity: barato de repintar) ===== */
    .cos-e_hearts,.cos-e_snow,.cos-e_matrix,.cos-e_fire,.cos-e_rgb,.cos-e_pulse,.cos-e_glitch{position:relative}
    .cos-e_hearts::before,.cos-e_hearts::after,.cos-e_snow::before,.cos-e_snow::after,.cos-e_matrix::before,.cos-e_matrix::after,
    .cos-e_fire::before,.cos-e_fire::after,.cos-e_rgb::before,.cos-e_pulse::before,.cos-e_glitch::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit}
    /* Corazones: dos capas que suben a distinta velocidad */
    .cos-e_hearts::before{z-index:2;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Cpath d='M20 34c-8-6-12-11-9-17 3-5 9-4 9 1 0-5 6-6 9-1 3 6-1 11-9 17z' fill='%23ff5c8a'/%3E%3Cpath d='M54 64c-5-4-8-7-6-11 2-3 6-3 6 1 0-4 4-4 6-1 2 4-1 7-6 11z' fill='%23ffb3c9'/%3E%3C/svg%3E") 0 0/70px 70px repeat;animation:cos-up70 5s linear infinite}
    .cos-e_hearts::after{z-index:2;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='46'%3E%3Cpath d='M30 20c-4-3-6-6-4-9 2-3 5-2 5 1 0-3 4-4 5-1 2 3-1 6-6 9z' fill='%23ff8fb1'/%3E%3Cpath d='M10 40c-3-2-5-4-4-7 1-2 4-2 4 0 0-2 3-2 4 0 1 3-1 5-4 7z' fill='%23ff5c8a'/%3E%3C/svg%3E") 12px 0/46px 46px repeat;opacity:.85;animation:cos-up46 3.4s linear infinite}
    @keyframes cos-up70{to{background-position:0 -70px}}
    @keyframes cos-up46{to{background-position:12px -46px}}
    /* Nevada: copos que caen */
    .cos-e_snow::before{z-index:2;background:radial-gradient(3px 3px at 20% 20%,#fff,transparent),radial-gradient(2px 2px at 70% 60%,#fff,transparent),radial-gradient(2.5px 2.5px at 45% 85%,#dff6ff,transparent),radial-gradient(2px 2px at 90% 15%,#fff,transparent);background-size:80px 80px;animation:cos-dn80 4.5s linear infinite}
    .cos-e_snow::after{z-index:2;background:radial-gradient(2px 2px at 30% 40%,#fff,transparent),radial-gradient(1.5px 1.5px at 75% 25%,#dff6ff,transparent),radial-gradient(2px 2px at 55% 75%,#fff,transparent);background-size:55px 55px;opacity:.8;animation:cos-dn55 3s linear infinite}
    .cos-e_snow{box-shadow:inset 0 0 40px #bfe9ff33}
    @keyframes cos-dn80{to{background-position:20px 80px}}
    @keyframes cos-dn55{to{background-position:-14px 55px}}
    /* Matrix: columnas de código verde que bajan */
    .cos-e_matrix{box-shadow:inset 0 0 46px #00ff6a22}
    .cos-e_matrix::before{z-index:1;opacity:.6;background:repeating-linear-gradient(180deg,#22ff7aee 0 5px,#22ff7a33 5px 10px,transparent 10px 24px) 0 0/100% 48px;
      -webkit-mask-image:repeating-linear-gradient(90deg,#000 0 2px,transparent 2px 13px);mask-image:repeating-linear-gradient(90deg,#000 0 2px,transparent 2px 13px);animation:cos-mx48 1.5s linear infinite}
    .cos-e_matrix::after{z-index:1;opacity:.4;background:repeating-linear-gradient(180deg,#9dffc4dd 0 4px,#22ff7a22 4px 9px,transparent 9px 30px) 0 0/100% 60px;
      -webkit-mask-image:repeating-linear-gradient(90deg,transparent 0 6px,#000 6px 8px,transparent 8px 17px);mask-image:repeating-linear-gradient(90deg,transparent 0 6px,#000 6px 8px,transparent 8px 17px);animation:cos-mx60 2.4s linear infinite}
    @keyframes cos-mx48{to{background-position:0 48px}}
    @keyframes cos-mx60{to{background-position:0 60px}}
    /* Llamas: lengua de fuego desde abajo que parpadea (solo transform/opacity) */
    .cos-e_fire{box-shadow:0 0 0 1px #ff7a18aa,0 0 22px #ff5a1a88}
    .cos-e_fire::before{z-index:2;transform-origin:50% 100%;mix-blend-mode:screen;
      background:radial-gradient(60% 50% at 18% 100%,#ff7a18dd,transparent 70%),radial-gradient(50% 62% at 52% 100%,#ffec7acc,transparent 70%),radial-gradient(60% 50% at 84% 100%,#ff3b1add,transparent 70%);animation:cos-flick .8s ease-in-out infinite alternate}
    .cos-e_fire::after{z-index:2;box-shadow:inset 0 0 0 2px #ff7a18aa,inset 0 -20px 30px -10px #ff3b1a99}
    @keyframes cos-flick{from{transform:scaleY(.78);opacity:.7}to{transform:scaleY(1.08);opacity:1}}
    /* Borde RGB: anillo de colores que gira */
    .cos-e_rgb{box-shadow:0 0 18px #5b6bff55}
    .cos-e_rgb::before{z-index:3;padding:3px;box-sizing:border-box;
      background:conic-gradient(from var(--cos-a),#ff3b3b,#ffb02b,#f6ff4a,#4cff6a,#2bd6ff,#5b6bff,#ff3df0,#ff3b3b);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:cos-spin 3s linear infinite}
    /* Pulso: el perfil late con tu color (opacity, barato) */
    .cos-e_pulse{box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 28px var(--pf-color,var(--accent))}
    .cos-e_pulse::before{z-index:2;mix-blend-mode:screen;background:radial-gradient(90% 70% at 50% 0,var(--pf-color,var(--accent)),transparent 70%);animation:cos-pulse-o 1.8s ease-in-out infinite}
    @keyframes cos-pulse-o{0%,100%{opacity:.06}50%{opacity:.42}}
    /* Glitch: nombre con aberración cromática + líneas de escaneo */
    .cos-e_glitch .pf-name,.cos-e_glitch .fx-name{text-shadow:2px 0 #ff2bd6,-2px 0 #17e0e8;animation:cos-gl 2.4s steps(1) infinite}
    @keyframes cos-gl{0%,86%,100%{transform:none;text-shadow:2px 0 #ff2bd6,-2px 0 #17e0e8}
      88%{transform:translate(-3px,1px) skewX(-8deg);text-shadow:-4px 0 #ff2bd6,4px 0 #17e0e8}
      92%{transform:translate(3px,-1px) skewX(6deg);text-shadow:4px 0 #ff2bd6,-4px 0 #17e0e8}
      96%{transform:translate(-1px,0);text-shadow:2px 0 #ff2bd6,-2px 0 #17e0e8}}
    .cos-e_glitch::before{z-index:2;background:repeating-linear-gradient(0deg,transparent 0 2px,#00000030 2px 3px),linear-gradient(180deg,transparent 40%,#17e0e82e 50%,transparent 60%) 0 0/100% 200% no-repeat;animation:cos-scan 3s linear infinite}
    @keyframes cos-scan{from{background-position:0 0,0 0}to{background-position:0 0,0 -200%}}
    /* ===== Efectos nuevos 2 ===== */
    .cos-e_rain,.cos-e_bubbles,.cos-e_confetti,.cos-e_lightning{position:relative}
    .cos-e_rain::before,.cos-e_rain::after,.cos-e_bubbles::before,.cos-e_bubbles::after,.cos-e_confetti::before,.cos-e_confetti::after,.cos-e_lightning::before,.cos-e_lightning::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit}
    /* Nombre dorado: oro que barre el texto */
    .cos-e_goldname .pf-name,.cos-e_goldname .fx-name{background:linear-gradient(100deg,#b45309,#facc15 25%,#fff6c2 40%,#facc15 55%,#b45309 75%,#facc15);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
      filter:drop-shadow(0 0 5px #facc1566);animation:cos-gold 3.6s linear infinite}
    @keyframes cos-gold{to{background-position:260% 0}}
    /* Nombre neón: texto brillante que late */
    .cos-e_neonname .pf-name,.cos-e_neonname .fx-name{color:#eaffff;text-shadow:0 0 4px #17e0e8,0 0 10px #17e0e8,0 0 22px #ff3df0;animation:cos-neon 1.6s ease-in-out infinite alternate}
    @keyframes cos-neon{from{text-shadow:0 0 3px #17e0e8,0 0 7px #17e0e8,0 0 14px #ff3df0;opacity:.88}to{text-shadow:0 0 5px #fff,0 0 14px #17e0e8,0 0 30px #ff3df0;opacity:1}}
    /* Lluvia: dos capas de gotas a distinta velocidad */
    .cos-e_rain{box-shadow:inset 0 0 40px #5aa9ff22}
    .cos-e_rain::before{z-index:2;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='64'%3E%3Cg stroke='%23bfe6ff' stroke-width='1.4' stroke-linecap='round'%3E%3Cpath d='M8 4l-3 12M28 26l-3 12M18 44l-3 12' opacity='.9'/%3E%3Cpath d='M36 10l-2 8M12 34l-2 8M32 52l-2 8' opacity='.55'/%3E%3C/g%3E%3C/svg%3E") 0 0/40px 64px repeat;animation:cos-rain1 .7s linear infinite}
    .cos-e_rain::after{z-index:2;opacity:.6;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='64'%3E%3Cg stroke='%23bfe6ff' stroke-width='1.4' stroke-linecap='round'%3E%3Cpath d='M8 4l-3 12M28 26l-3 12M18 44l-3 12' opacity='.9'/%3E%3Cpath d='M36 10l-2 8M12 34l-2 8M32 52l-2 8' opacity='.55'/%3E%3C/g%3E%3C/svg%3E") 14px 0/28px 44px repeat;animation:cos-rain2 1.1s linear infinite}
    @keyframes cos-rain1{to{background-position:-8px 64px}}
    @keyframes cos-rain2{to{background-position:6px 44px}}
    /* Burbujas: suben a dos velocidades */
    .cos-e_bubbles::before{z-index:2;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg fill='none' stroke='%23bff3ff' stroke-width='1.3'%3E%3Ccircle cx='16' cy='60' r='6'/%3E%3Ccircle cx='54' cy='28' r='9'/%3E%3Ccircle cx='68' cy='70' r='4'/%3E%3C/g%3E%3Cg fill='%23ffffff' opacity='.7'%3E%3Ccircle cx='14' cy='58' r='1.4'/%3E%3Ccircle cx='51' cy='25' r='2'/%3E%3C/g%3E%3C/svg%3E") 0 0/80px 80px repeat;animation:cos-bub1 7s linear infinite}
    .cos-e_bubbles::after{z-index:2;opacity:.7;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cg fill='none' stroke='%23dff9ff' stroke-width='1.1'%3E%3Ccircle cx='12' cy='14' r='4'/%3E%3Ccircle cx='40' cy='40' r='6'/%3E%3C/g%3E%3C/svg%3E") 10px 0/56px 56px repeat;animation:cos-bub2 4.5s linear infinite}
    @keyframes cos-bub1{to{background-position:0 -80px}}
    @keyframes cos-bub2{to{background-position:10px -56px}}
    /* Confeti: cae girando */
    .cos-e_confetti::before{z-index:2;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Crect x='10' y='12' width='6' height='3' fill='%23ff5470' transform='rotate(25 13 13)'/%3E%3Crect x='46' y='30' width='6' height='3' fill='%23ffc12b' transform='rotate(-30 49 31)'/%3E%3Crect x='70' y='8' width='5' height='3' fill='%2317e0e8' transform='rotate(60 72 9)'/%3E%3Crect x='24' y='64' width='6' height='3' fill='%233ddc84' transform='rotate(-15 27 65)'/%3E%3Crect x='72' y='62' width='5' height='3' fill='%23a78bfa' transform='rotate(40 74 63)'/%3E%3C/svg%3E") 0 0/90px 90px repeat;animation:cos-cf1 4s linear infinite}
    .cos-e_confetti::after{z-index:2;opacity:.85;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='14' cy='18' r='2.2' fill='%23ffc12b'/%3E%3Ccircle cx='44' cy='44' r='2.2' fill='%23ff5470'/%3E%3Crect x='36' y='8' width='5' height='3' fill='%2317e0e8' transform='rotate(35 38 9)'/%3E%3Crect x='8' y='46' width='5' height='3' fill='%23ffffff' transform='rotate(-25 10 47)'/%3E%3C/svg%3E") 0 0/60px 60px repeat;animation:cos-cf2 2.6s linear infinite}
    @keyframes cos-cf1{to{background-position:18px 90px}}
    @keyframes cos-cf2{to{background-position:-12px 60px}}
    /* Relámpago: destello rápido y marco eléctrico (opacity, barato de repintar) */
    .cos-e_lightning{box-shadow:0 0 0 1px #7dd3fcaa,0 0 24px #38bdf855}
    .cos-e_lightning::before{z-index:2;mix-blend-mode:screen;background:radial-gradient(70% 90% at 70% 0,#e0f2fe,#38bdf8aa 35%,transparent 70%);opacity:0;animation:cos-bolt 4.2s steps(1) infinite}
    .cos-e_lightning::after{z-index:2;box-shadow:inset 0 0 0 2px #7dd3fc99,inset 0 0 30px #38bdf855;animation:cos-boltb 4.2s steps(1) infinite}
    @keyframes cos-bolt{0%,40%,46%,100%{opacity:0}41%{opacity:.95}43%{opacity:.2}44%{opacity:.8}}
    @keyframes cos-boltb{0%,40%,46%,100%{box-shadow:inset 0 0 0 2px #7dd3fc55,inset 0 0 20px #38bdf833}41%,44%{box-shadow:inset 0 0 0 2px #fff,inset 0 0 44px #7dd3fc}}
    .cos-pet{display:inline-block;font-size:20px;line-height:1;animation:cos-bob 1.6s ease-in-out infinite}
    @keyframes cos-bob{50%{transform:translateY(-3px) rotate(-5deg)}}
    /* Panel Tienda */
    .shop-top{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
    .shop-bal{font-size:30px;font-weight:800;color:var(--accent)}
    .shop-bal small{font-size:13px;font-weight:600;opacity:.7;margin-left:6px}
    .shop-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
    .shop-chip{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--accent-soft);color:var(--accent)}
    .shop-redeem{display:flex;gap:8px;margin-left:auto}
    .shop-redeem input,.shop-input{padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elev-2);color:inherit;font:inherit}
    .shop-redeem input{width:190px;text-transform:uppercase}
    .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin:14px 32px 0}
    .shop-sec{margin:18px 32px 0;font-weight:800;font-size:14px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
    .shop-sec small{font-weight:600;opacity:.65;font-size:12px}
    .shop-card{display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:14px;background:var(--bg-elev);border:1px solid var(--border)}
    .shop-card.on{border-color:var(--accent)}
    .shop-card.wide{margin:14px 32px 0}
    .shop-prev{height:96px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--bg-elev-2);overflow:hidden}
    .shop-av{width:58px;height:58px;border-radius:50%;object-fit:cover;background:var(--bg-elev-3);border:3px solid var(--bg-elev-2)}
    .shop-fx{width:88%;border-radius:10px;background:var(--bg-elev);overflow:hidden;position:relative}
    .shop-fx .fx-banner{height:34px;background:linear-gradient(135deg,var(--accent),var(--accent-soft))}
    .shop-fx .fx-name{padding:7px 10px;font-weight:800;font-size:13px}
    .shop-pet{font-size:40px}
    .shop-name{font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .shop-desc{font-size:12px;opacity:.65;flex:1}
    .shop-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
    .shop-price{font-weight:800;color:var(--accent)}
    .shop-old{opacity:.5;font-weight:600;margin-right:4px}
    .shop-deal{font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:#ff5470;color:#fff}
    .shop-tag{font-size:11px;font-weight:700;opacity:.7}
    .shop-lock{opacity:1;color:var(--accent)}
    .shop-earn{margin:14px 32px 0}
    .shop-note{margin:14px 32px 0;padding:14px 16px;border-radius:14px;background:var(--bg-elev);border:1px solid var(--accent);font-size:13px;line-height:1.55}
    .shop-note b{color:var(--accent)}
    .shop-note ul{margin:6px 0 0 18px;padding:0}
    .shop-petxp{font-size:12px;font-weight:700;color:var(--accent)}
    .shop-petlvl{font-size:11.5px;opacity:.8}
    .shop-bar{height:6px;border-radius:99px;background:var(--bg-elev-3);overflow:hidden}
    .shop-bar>i{display:block;height:100%;background:var(--accent)}
    .shop-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .shop-pre{font-weight:800;opacity:.7}
    .shop-list{display:flex;flex-direction:column;gap:6px;margin-top:6px}
    .shop-li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--bg-elev-2)}
    .shop-li>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
    .shop-ach{display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:12px;background:var(--bg-elev);border:1px solid var(--border)}
    .shop-ach.ready{border-color:var(--accent)}
    .shop-achs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin:14px 32px 0}

    /* ===== Optimización (anti-lag) =====
       Causa: cada marco anima --cos-a (@property) + box-shadow, y el catálogo dibuja ~10 marcos y varios
       efectos A LA VEZ. Ninguna de las dos animaciones corre en la GPU: repintan en el hilo principal cada cuadro.
       Solución: en la Tienda solo se anima lo que tenés equipado o lo que tocás con el mouse; el resto queda quieto.
       En el perfil (1 solo marco) todo se ve igual que antes. */
    .shop-card{content-visibility:auto;contain-intrinsic-size:auto 250px}
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-f_"],
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-e_"],
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-e_"]::before,
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-e_"]::after,
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::before,
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::after,
    .shop-grid .shop-card:not(.on):not(:hover):not(:focus-within) .cos-pet{animation-play-state:paused !important}
    /* El aura del perfil: el box-shadow de 84px animado repintaba toda la ventana. El "respirar" lo hace el ::after (opacity, barato). */
    .cos-e_glow{animation:none !important;box-shadow:0 0 0 1px var(--pf-color,var(--accent)),0 0 22px var(--pf-color,var(--accent)),0 0 56px var(--pf-color,var(--accent))}
    /* Aurora: el blur(10px) animado es caro; se baja y se avisa al navegador que esa capa se mueve */
    .cos-e_aurora .pf-banner::before,.cos-e_aurora .fx-banner::before{filter:blur(6px);will-change:transform}
    .shop-daily{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px}
    .shop-daily-body{flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px}
    .shop-daily-foot{display:flex;align-items:center}
    .shop-foot{flex-wrap:wrap}
    .ap-shop-row{display:flex;align-items:center;gap:14px;margin-top:12px;flex-wrap:wrap}
    .ap-shop-info{flex:1;min-width:200px;display:flex;flex-direction:column;gap:6px}
    .ap-shop-lbl{font-weight:700;font-size:13px}
    .ap-shop-prev{width:150px;height:72px;flex:none;contain:layout paint}
    /* Mi estilo: vistas previas quietas (primer cuadro). Solo se animan al pasar el mouse por la fila, así no repintan sin parar. */
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-f_"],
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"],
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"]::before,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"]::after,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::before,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::after,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) .cos-pet{animation-play-state:paused !important}
    #ap-shop .cos-e_aurora .fx-banner::before{filter:none !important;will-change:auto}

    /* ===== Efectos solo con el mouse encima (tienda y "Mi estilo") =====
       Quieto, cada objeto se ve en una pose a mitad de animación (no en el primer cuadro, que casi no se notaba);
       al pasar el mouse por la tarjeta se anima. Así nunca hay más de un efecto en movimiento a la vez. */
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-f_"],
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"],
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"]::before,
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"]::after,
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-name,
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::before,
    .shop-grid .shop-card:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::after,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-f_"],
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"],
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"]::before,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"]::after,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-name,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::before,
    #ap-shop .ap-shop-row:not(:hover):not(:focus-within) [class*="cos-e_"] .fx-banner::after{animation-play-state:paused !important;animation-delay:-1.2s !important}
    /* Dentro de las vistas previas el efecto va sobre la tarjeta .shop-fx (chica): los pseudo-elementos se recortan ahí */
    .shop-fx[class*="cos-e_"]{isolation:isolate}
    .shop-gift-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
    .shop-gift-box{width:min(380px,90vw);display:flex;flex-direction:column;gap:10px;padding:18px;border-radius:14px;background:var(--bg-elev);border:1px solid var(--accent)}
    .shop-gift-box .shop-row{justify-content:flex-end}`;
    document.head.appendChild(css);

    // ------------------------------------------------------------ cabecera / menú (se traducen acá)
    const panel = $('#panel-tienda');
    const hd = panel && panel.querySelector('.panel-header');
    const nav = document.querySelector('.nav-btn[data-panel="panel-tienda"]');
    if (hd) hd.setAttribute('data-i18n-skip', '');
    if (nav) nav.setAttribute('data-i18n-skip', '');
    function paintHead() {
      if (hd) {
        const h2 = hd.querySelector('h2'), hint = hd.querySelector('.hint');
        if (h2) h2.textContent = T('Tienda');
        if (hint) hint.textContent = T('Ganás Vcoins jugando en salas, con logros, códigos y eventos. Gastalas en marcos, efectos, mascotas, consumibles, y mejoras.');
      }
      if (nav) { const tn = Array.from(nav.childNodes).find((n) => n.nodeType === 3); if (tn) tn.nodeValue = T('Tienda') + ' '; }
    }

    // ------------------------------------------------------------ estado / datos
    const badge = $('#shop-coins');
    function setBadge() {
      if (!badge) return;
      badge.hidden = !loggedIn();
      badge.textContent = String(S.balance);
    }
    const byId = (id) => S.catalog.find((i) => i.id === id);
    // Avisa al juego qué marco llevás puesto, para dibujarlo alrededor del círculo (ver frame-rings.js y app.js).
    let lastFrame = null;
    function emitFrame() {
      const id = (S.equipped && S.equipped.frame) || '';
      if (id === lastFrame) return;
      lastFrame = id;
      try { window.dispatchEvent(new CustomEvent('vivet-frame-changed', { detail: id })); } catch (_) {}
    }
    function apply(r) {
      if (!r) return;
      if (typeof r.balance === 'number') S.balance = r.balance;
      if (Array.isArray(r.catalog)) S.catalog = r.catalog.filter((i) => i && ID_RE.test(i.id));
      if (Array.isArray(r.owned)) S.owned = new Set(r.owned);
      if (r.equipped) { S.equipped = r.equipped; emitFrame(); }
      if (r.earn) S.earn = r.earn;
      if (r.deals) S.deals = r.deals;
      if (r.daily) S.daily = r.daily;
      if (Array.isArray(r.owned_add)) for (const id of r.owned_add) S.owned.add(id); // compra rápida: el server solo manda lo nuevo
      if (Array.isArray(r.gifts)) for (const g of r.gifts) {
        const it = byId(g.item_id);
        toast(T('{n} te regaló {i}', { n: g.from, i: it ? itemName(it) : g.item_id }), 'ok');
      }
      if (r.pets) S.pets = r.pets;
      if (typeof r.xp_mult === 'number') S.xpMult = r.xp_mult;
      if ('shield_until' in r) S.shield = Number(r.shield_until) || 0;
      if ('boost' in r) S.boost = r.boost || null;
      if (r.perks) S.perks = r.perks;
      if (r.extra) S.extra = r.extra;
      if (Array.isArray(r.achievements)) S.ach = r.achievements;
    }
    async function load(silent) {
      if (!loggedIn()) { S.balance = 0; S.equipped = {}; emitFrame(); setBadge(); render(); return; }
      try {
        const r = await req('GET', '/shop');
        apply(r);
        if (r.welcome) toast(T('¡Bienvenido! Ganaste {n} Vcoins', { n: r.welcome }), 'ok');
      } catch (e) { if (!silent) toast(T(e.message || 'No se pudo cargar la tienda')); }
      setBadge(); render();
      refreshAch(); // para el puntito de la pestaña Logros
    }
    function refreshDaily() {
      if (!loggedIn()) return;
      req('GET', '/shop/daily').then((r) => { if (r && r.daily) { S.daily = r.daily; render(); } }).catch(() => {});
    }
    function refreshAch() {
      if (!loggedIn()) return;
      req('GET', '/shop/achievements').then((r) => { if (r && Array.isArray(r.achievements)) { S.ach = r.achievements; render(); } }).catch(() => {});
    }

    // ------------------------------------------------------------ helpers de dibujo
    const fmtH = (sec) => { const h = sec / 3600; return (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10) + ' h'; };
    const left = (ts) => {
      const m = Math.max(0, Math.floor((ts - Date.now()) / 60000));
      const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
      return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`;
    };
    // Íconos propios (SVG) para mejoras y consumibles. Solo las mascotas usan emoji.
    const ICON_D = {
      shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/>',
      boost: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
      maps: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
      banner: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>',
      pins: '<path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
      friendcode: '<path d="M20 12l-8 8-9-9V4h7l10 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
      mystery: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h18M12 8v12M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
      petfood: '<path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 10z"/><path d="M4 10c0-3 3-5 8-5s8 2 8 5"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8h14v-8M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
    };
    const icon = (n, sz = 30) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_D[n] || ICON_D.gift}</svg>`;

    // Insignias de club: escudo de dos colores con las iniciales (a propósito NO son los escudos oficiales: son marcas registradas).
    // Agregá un club nuevo acá y en CATALOG de shop.js (id b_<club>).
    const BADGES = {
      b_nacional: ['#0b8a3e', '#dfe8e2', 'AN'],
      b_millonarios: ['#1d4ed8', '#e8eefc', 'MI'],
      b_boca: ['#123d8f', '#f2c500', 'BJ'],
      b_river: ['#e10600', '#f3f3f3', 'RP'],
      b_flamengo: ['#d11a2a', '#111111', 'FLA'],
      b_corinthians: ['#111111', '#f3f3f3', 'COR'],
      b_america_mx: ['#fdd835', '#0b2a6f', 'AME'],
      b_chivas: ['#c8102e', '#1b3a8a', 'CHI'],
      b_madrid: ['#e8ecf5', '#febe10', 'RM'],
      b_barcelona: ['#a50044', '#004d98', 'FCB'],
      b_manutd: ['#da291c', '#fbe122', 'MU'],
      b_liverpool: ['#c8102e', '#f3f3f3', 'LIV'],
      b_juventus: ['#111111', '#f3f3f3', 'JUV'],
      b_milan: ['#fb090b', '#111111', 'ACM'],
      b_bayern: ['#dc052d', '#0066b2', 'BAY'],
      b_dortmund: ['#fde100', '#111111', 'BVB'],
      b_benfica: ['#e30613', '#f3f3f3', 'SLB'],
      b_porto: ['#003893', '#f3f3f3', 'FCP'],
      b_ajax: ['#d2122e', '#f3f3f3', 'AJX'],
      b_psg: ['#004170', '#da291c', 'PSG'],
      b_colocolo: ['#f3f3f3', '#111111', 'CC'],
      b_penarol: ['#fde100', '#111111', 'CAP'],
      b_alianza: ['#1d3fa0', '#f3f3f3', 'AL'],
      b_olimpia: ['#111111', '#f3f3f3', 'OLI'],
    };
    function badgeSvg(id, px) {
      const b = BADGES[id] || ['#64748b', '#e2e8f0', '?'];
      return `<svg class="cos-badge-svg" viewBox="0 0 24 28" width="${px}" height="${Math.round(px * 28 / 24)}" aria-hidden="true">` +
        `<path d="M12 1L22 4V13C22 20 17 25 12 27C7 25 2 20 2 13V4Z" fill="${b[1]}"/>` +
        `<path d="M12 1L2 4V13C2 20 7 25 12 27Z" fill="${b[0]}"/>` +
        `<path d="M12 1L22 4V13C22 20 17 25 12 27C7 25 2 20 2 13V4Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>` +
        `<text x="12" y="${b[2].length > 2 ? 17 : 17.5}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="800" font-size="${b[2].length > 2 ? 7.5 : 9}" fill="#fff" stroke="#000" stroke-opacity=".55" stroke-width="1.6" paint-order="stroke">${b[2]}</text></svg>`;
    }
    function preview(i) {
      if (i.cat === 'badge') return `<span class="cos-badge cos-badge-big" title="${esc(itemName(i))}">${badgeSvg(i.id, 56)}</span>`;
      const me = api() && api().me && api().me();
      if (i.cat === 'frame') { const im = `<img class="shop-av cos-${i.id}" alt="" src="${esc((me && me.avatar_url) || '')}" onerror="this.removeAttribute('src')" />`; return window.vivetOrn && window.vivetOrn.has(i.id) ? `<span class="orn-wrap">${im}${window.vivetOrn.svg(i.id)}</span>` : im; }
      if (i.cat === 'effect') return `<div class="shop-fx cos-${i.id}"><div class="fx-banner"></div><div class="fx-name">${esc(T('Tu nombre'))}</div></div>`;
      if (i.cat === 'title') return `<span class="cos-title cos-${i.id}">${esc(titleText(i))}</span>`;
      if (i.cat === 'pet') return `<span class="shop-pet cos-pet">${esc(i.emoji || '❔')}</span>`;
      const k = i.kind || i.perk || i.action;
      return `<span class="shop-pet shop-ico">${icon(k)}</span>`;
    }
    function petInfo(i) {
      const base = Math.round((i.xp - 1) * 100);
      const maxL = PET_LEVELS.length;
      const top = Math.round((i.xp - 1) * (1 + PET_STEP * (maxL - 1)) * 100);
      const p = S.pets[i.id];
      if (!p) return `<div class="shop-petxp">${esc(T('+{n}% XP', { n: base }))}</div><div class="shop-petlvl">${esc(T('Sube hasta +{n}% (nivel {l}) jugando con ella puesta.', { n: top, l: maxL }))}</div>`;
      const pct = p.next_at ? Math.min(100, Math.round((p.seconds / p.next_at) * 100)) : 100;
      const next = p.next_at ? T('{a} / {b} para el nivel {l}', { a: fmtH(p.seconds), b: fmtH(p.next_at), l: p.level + 1 }) : T('Nivel máximo · {a} jugadas', { a: fmtH(p.seconds) });
      return `<div class="shop-petxp">${esc(T('Nivel {a}/{b} · +{n}% XP', { a: p.level, b: p.max_level, n: Math.round(p.bonus * 100) }))}</div>` +
        `<div class="shop-bar"><i style="width:${pct}%"></i></div><div class="shop-petlvl">${esc(next)}</div>`;
    }
    function perkInfo(i) {
      const lvl = S.perks[i.perk] || 0;
      let line = T('Sin comprar');
      if (lvl > 0) line = i.perk === 'maps' ? T('Tenés +{n} espacios para mapas', { n: lvl * i.amount })
        : i.perk === 'pins' ? T('Tenés +{n} salas ancladas', { n: lvl * i.amount })
        : i.perk === 'daily' ? T('Tenés +{n} Vcoins en la recompensa diaria', { n: lvl * i.amount })
        : i.perk === 'gifts' ? T('Tenés +{n} regalos por día', { n: lvl * i.amount }) : T('Banner HD activo');
      return `<div class="shop-petxp">${esc(T('Nivel {a}/{b}', { a: lvl, b: i.max }))}</div><div class="shop-petlvl">${esc(line)}</div>`;
    }
    const priceHtml = (i) => (i.original ? `<s class="shop-old">${i.original}</s>${i.price} V` : `${i.price} V`);
    // Regalar: solo objetos de aspecto a la venta (el server lo vuelve a validar).
    function giftBtn(i) {
      if (!['frame', 'effect', 'title', 'badge', 'pet'].includes(i.cat) || i.price == null || i.rank) return '';
      return `<button class="ghost-btn" type="button" data-act="gift" data-id="${esc(i.id)}" title="${esc(T('Regalar a un amigo'))}"${S.balance < i.price ? ' disabled' : ''}>${icon('gift', 16)}</button>`;
    }
    function footFor(i) { return footBase(i) + giftBtn(i); }
    function openGift(id) {
      const it = byId(id); if (!it) return;
      const fr = (((api().friends && api().friends()) || {}).friends) || [];
      const old = document.getElementById('shop-gift'); if (old) old.remove();
      const ov = document.createElement('div'); ov.id = 'shop-gift'; ov.className = 'shop-gift-ov';
      const opts = fr.map((f) => `<option value="${Number(f.id)}">${esc(f.username)}</option>`).join('');
      ov.innerHTML = `<div class="shop-gift-box"><div class="shop-name">${esc(T('Regalar'))}: ${esc(itemName(it))}</div>` +
        (fr.length
          ? `<p class="hint">${esc(T('Cuesta {n} Vcoins y se descuentan de tu saldo. Solo podés regalarle a tus amigos.', { n: it.price }))}</p><select id="shop-gift-to" class="shop-input">${opts}</select>`
          : `<p class="hint">${esc(T('Necesitás tener amigos agregados para poder regalar.'))}</p>`) +
        `<div class="shop-row"><button class="ghost-btn" type="button" data-g="cancel">${esc(T('Cancelar'))}</button>` +
        (fr.length ? `<button class="primary-btn" type="button" data-g="ok">${esc(T('Regalar'))} · ${it.price} V</button>` : '') + `</div></div>`;
      ov.addEventListener('click', async (e) => {
        const g = e.target.dataset && e.target.dataset.g;
        if (e.target === ov || g === 'cancel') { ov.remove(); return; }
        if (g !== 'ok' || S.busy) return;
        const sel = ov.querySelector('#shop-gift-to'); if (!sel) return;
        S.busy = true; e.target.disabled = true;
        try {
          const r = await req('POST', '/shop/gift', { to_id: Number(sel.value), item_id: id }); apply(r);
          toast(T('¡Regalo enviado a {n}!', { n: sel.options[sel.selectedIndex].text }), 'ok');
          ov.remove();
        } catch (err) { toast(T((err && err.message) || 'No se pudo enviar el regalo')); e.target.disabled = false; }
        S.busy = false; setBadge(); render();
      });
      document.body.appendChild(ov);
    }
    function footBase(i) {
      const owned = S.owned.has(i.id), worn = S.equipped[i.cat] === i.id;
      const buy = (label) => `<span class="shop-price">${priceHtml(i)}</span><button class="primary-btn" type="button" data-act="buy" data-id="${esc(i.id)}"${S.balance < i.price ? ` disabled title="${esc(T('Te faltan Vcoins'))}"` : ''}>${esc(T(label))}</button>`;
      if (i.cat === 'perk') { const lvl = S.perks[i.perk] || 0; return lvl >= i.max ? `<span class="shop-tag">${esc(T('Máximo'))}</span>` : buy(lvl ? 'Mejorar' : 'Comprar'); }
      if (i.cat === 'consumable') return buy('Comprar');
      // Objetos que se ganan por rango (price null): no se compran.
      if (!owned && i.price == null && i.ach) { const an = en() && ACH_EN[i.ach] ? ACH_EN[i.ach][0] : (((S.ach || []).find((x) => x.id === i.ach) || {}).name || i.ach); return `<span class="shop-tag shop-lock">${esc(T('Se desbloquea con el logro «{a}»', { a: an }))}</span>`; }
      if (!owned && i.price == null && i.event) return `<span class="shop-tag shop-lock">${esc(T('Se consigue en el evento'))}</span>`;
      if (!owned && i.price == null) return `<span class="shop-tag shop-lock">${esc(T('Se desbloquea con rango {r}', { r: rankName(i.rank) }))}</span>`;
      if (!owned) return buy('Comprar');
      if (worn) return `<span class="shop-tag">${esc(T('Puesto'))}</span><button class="ghost-btn" type="button" data-act="unequip" data-cat="${esc(i.cat)}">${esc(T('Quitar'))}</button>`;
      return `<span class="shop-tag">${esc(T('Tuyo'))}</span><button class="primary-btn" type="button" data-act="equip" data-cat="${esc(i.cat)}" data-id="${esc(i.id)}">${esc(T('Ponerme'))}</button>`;
    }
    function cardHtml(i) {
      const worn = S.equipped[i.cat] === i.id;
      const deal = i.deal && i.original
        ? `<span class="shop-deal">${esc(T(i.deal === 'weekly' ? 'Semana' : 'Hoy'))} −${Math.round((1 - i.price / i.original) * 100)}%</span>` : '';
      const extra = i.cat === 'pet' && i.xp ? petInfo(i) : i.cat === 'perk' ? perkInfo(i) : '';
      return `<div class="shop-card${worn ? ' on' : ''}"><div class="shop-prev">${preview(i)}</div><div class="shop-name">${esc(itemName(i))}${deal}</div>` +
        `<div class="shop-desc">${esc(itemDesc(i))}</div>${extra}<div class="shop-foot">${footFor(i)}</div></div>`;
    }

    // ------------------------------------------------------------ secciones
    // Recompensa diaria: el server cuenta el tiempo JUGANDO en una sala (no se puede adelantar desde el cliente).
    function dailyHtml() {
      const d = S.daily; if (!d) return '';
      const fmt = (x) => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
      const have = Math.min(d.seconds, d.need), pct = Math.round((have / d.need) * 100);
      const foot = d.claimed ? `<span class="shop-tag">✓ ${esc(T('Reclamada hoy'))}</span>`
        : d.ready ? `<button class="primary-btn" type="button" data-act="daily">${esc(T('Reclamar'))} +${d.coins} V</button>`
        : `<span class="shop-tag">${esc(fmt(have))} / ${esc(fmt(d.need))}</span>`;
      return `<div class="card shop-daily"><div class="shop-daily-body"><div class="shop-name">${esc(T('Recompensa diaria'))}</div>` +
        `<div class="shop-desc">${esc(T('Jugá {m} min en una sala y reclamá +{n} Vcoins. Se reinicia a medianoche.', { m: Math.round(d.need / 60), n: d.coins }))}</div>` +
        `<div class="shop-bar"><i style="width:${d.claimed ? 100 : pct}%"></i></div></div><div class="shop-daily-foot">${foot}</div></div>`;
    }
    function topHtml() {
      const chips = [];
      if (S.shield > Date.now()) chips.push(`${T('Escudo activo: {t}', { t: left(S.shield) })}`);
      if (S.boost && S.boost.until > Date.now()) chips.push(`${T('XP x{m} activo: {t}', { m: S.boost.mult, t: left(S.boost.until) })}`);
      chips.push(`${T('Tu XP: x{m}', { m: S.xpMult.toFixed(2) })}`);
      return `<div class="card shop-top"><div><div class="shop-bal">${S.balance}<small>${esc(T('Vcoins'))}</small></div>` +
        `<div class="shop-chips">${chips.map((c) => `<span class="shop-chip">${esc(c)}</span>`).join('')}</div></div>` +
        `<div class="shop-redeem"><input id="shop-code" type="text" maxlength="40" value="${esc(S.code)}" placeholder="${esc(T('Código promocional'))}" autocomplete="off" spellcheck="false" />` +
        `<button class="primary-btn" type="button" data-act="redeem">${esc(T('Canjear'))}</button></div></div>` + dailyHtml();
    }
    function tabsHtml() {
      const ready = S.ach && S.ach.some((a) => a.ready);
      return `<div class="ui-tabs" role="tablist">${TABS.map(([c, l]) =>
        `<button type="button" class="ui-tab${c === S.tab ? ' active' : ''}" data-act="tab" data-cat="${c}">${esc(T(l))}${c === 'ach' && ready ? ' •' : ''}</button>`).join('')}</div>`;
    }
    function dealsHtml() {
      const d = S.deals;
      const weekly = d && byId(d.weekly), daily = d ? d.daily.map(byId).filter(Boolean) : [];
      if (!weekly && !daily.length) return `<p class="hint shop-earn">${esc(T('No hay ofertas por ahora.'))}</p>`;
      return `<div class="shop-sec">${esc(T('Oferta de la semana'))}<small>${esc(T('termina en {t}', { t: left(d.weekly_ends_at) }))}</small></div>` +
        `<div class="shop-grid">${weekly ? cardHtml(weekly) : ''}</div>` +
        `<div class="shop-sec">${esc(T('Ofertas del día'))}<small>${esc(T('termina en {t}', { t: left(d.daily_ends_at) }))}</small></div>` +
        `<div class="shop-grid">${daily.map(cardHtml).join('')}</div>` +
        `<p class="hint shop-earn">${esc(T('Cambian solas: 3 objetos con -25% cada día y 1 con -40% cada semana.'))}</p>`;
    }
    function itemsHtml() {
      const items = S.catalog.filter((i) => i.cat === S.tab);
      let note = '';
      if (S.tab === 'pet') {
        note = `<div class="shop-note"><b>${esc(T('Cómo funcionan las mascotas'))}</b><ul>` +
          [T('Con una mascota <b>puesta</b> ganás <b>más XP competitivo</b> mientras jugás en una sala (el bonus de cada una está en su tarjeta).'),
            T('Solo una puesta a la vez. Si no la tenés puesta, no da bonus ni gana nivel.'),
            T('Suben de nivel con tus horas jugadas <b>con ella puesta</b> (2 h, 6 h, 15 h, 30 h y 60 h). Cada nivel suma +20% al bonus base, hasta duplicarlo en el nivel 6.'),
            T('Se suma al boost "XP x2" si lo tenés activo. Las Vcoins por jugar no cambian: solo se multiplica el XP.'),
            T('Tu multiplicador de XP actual: <b>x{m}</b>.', { m: S.xpMult.toFixed(2) })].map((x) => `<li>${x}</li>`).join('') + '</ul></div>';
      } else if (S.tab === 'consumable') {
        note = `<div class="shop-note">${T('<b>Escudo:</b> congela el decaimiento de XP por inactividad. Los días se acumulan (máx. 30). <b>Boost:</b> duplica tu XP y se suma al bonus de tu mascota (máx. 24 h acumuladas).')}</div>`;
      } else if (S.tab === 'perk') {
        note = `<div class="shop-note">${esc(T('Mejoras permanentes: se compran una vez (o por niveles) y quedan en tu cuenta para siempre.'))}</div>`;
      }
      return note + `<div class="shop-grid">${items.length ? items.map(cardHtml).join('') : `<p class="hint">${esc(T('No hay objetos en esta categoría todavía.'))}</p>`}</div>`;
    }
    function specialHtml() {
      const fcItem = byId('x_friendcode');
      const me = api() && api().me && api().me();
      let html = '';
      if (fcItem) {
        const can = S.balance >= fcItem.price;
        html += `<div class="shop-card wide"><div class="shop-name">${esc(itemName(fcItem))}</div><div class="shop-desc">${esc(itemDesc(fcItem))}</div>` +
          `<div class="shop-desc">${T('Tu código actual: <b>{c}</b>', { c: esc((me && me.friend_code) || '—') })}</div>` +
          `<div class="shop-row"><span class="shop-pre">VV-</span><input id="shop-fc" class="shop-input" type="text" maxlength="8" value="${esc(S.fc)}" placeholder="BETA" autocomplete="off" spellcheck="false" style="width:130px;text-transform:uppercase" />` +
          `<span class="shop-price">${priceHtml(fcItem)}</span><button class="primary-btn" type="button" data-act="friendcode"${can ? '' : ` disabled title="${esc(T('Te faltan Vcoins'))}"`}>${esc(T('Cambiar'))}</button></div></div>`;
      }
      for (const [id, act, label] of [['x_box', 'mystery', 'Abrir'], ['x_petfood', 'petfood', 'Alimentar']]) {
        const it = byId(id); if (!it) continue;
        const can = S.balance >= it.price;
        html += `<div class="shop-card wide"><div class="shop-prev" style="height:64px">${preview(it)}</div><div class="shop-name">${esc(itemName(it))}</div><div class="shop-desc">${esc(itemDesc(it))}</div>` +
          `<div class="shop-row"><span class="shop-price">${priceHtml(it)}</span><button class="primary-btn" type="button" data-act="${act}"${can ? '' : ` disabled title="${esc(T('Te faltan Vcoins'))}"`}>${esc(T(label))}</button></div></div>`;
      }
      return html;
    }
    function achHtml() {
      if (!S.ach) return `<p class="hint shop-earn">${esc(T('Cargando…'))}</p>`;
      return `<div class="shop-achs">${S.ach.map((a) => {
        const nm = en() && ACH_EN[a.id] ? ACH_EN[a.id] : [a.name, a.desc];
        const time = a.need >= 3600;
        const pct = Math.min(100, Math.round((a.progress / a.need) * 100));
        const prog = time ? `${fmtH(a.progress)} / ${fmtH(a.need)}` : `${a.progress} / ${a.need}`;
        const foot = a.claimed ? `<span class="shop-tag">✓ ${esc(T('Reclamado'))}</span>`
          : `<span class="shop-price">${esc(T('+{n} V', { n: a.coins }))}</span>` + (a.ready ? `<button class="primary-btn" type="button" data-act="claim" data-id="${esc(a.id)}">${esc(T('Reclamar'))}</button>` : `<span class="shop-tag">${prog}</span>`);
        const fr = a.frame ? (S.catalog.find((x) => x.id === a.frame) || null) : null;
        const prize = fr ? `<div class="shop-desc">${esc(T('Premio'))}: ${esc(itemName(fr))}</div>` : '';
        return `<div class="shop-ach${a.ready ? ' ready' : ''}"><div class="shop-name">${esc(nm[0])}</div><div class="shop-desc">${esc(nm[1])}</div>${prize}` +
          `<div class="shop-bar"><i style="width:${a.claimed ? 100 : pct}%"></i></div><div class="shop-foot">${foot}</div></div>`;
      }).join('')}</div>`;
    }

    // ------------------------------------------------------------ Apariencia > "Mi estilo": ponerte/sacarte lo que compraste
    const AP_CATS = [['frame', 'Marco'], ['effect', 'Efecto'], ['title', 'Texto'], ['badge', 'Insignia'], ['pet', 'Mascota']];
    const apBox = document.createElement('div');
    apBox.id = 'ap-shop'; apBox.className = 'card'; apBox.dataset.grp = 'profile';
    // Mi estilo vive en Social > Mi perfil, justo debajo del banner/biografía (tarjeta "Tu perfil").
    const peCard = document.getElementById('profile-edit-card');
    const frMain = document.getElementById('fr-main');
    if (peCard) peCard.after(apBox); else if (frMain) frMain.appendChild(apBox);
    let eqChain = Promise.resolve();
    // Equipa al instante en pantalla y confirma con el server en segundo plano (si falla, vuelve atrás).
    function equipCat(cat, id) {
      const prev = S.equipped[cat];
      if (id) S.equipped[cat] = id; else delete S.equipped[cat];
      if (cat === 'frame') emitFrame();
      render();
      eqChain = eqChain.then(async () => {
        try { apply(await req('POST', '/shop/equip', { cat, item_id: id || null })); }
        catch (err) {
          if (prev) S.equipped[cat] = prev; else delete S.equipped[cat];
          if (cat === 'frame') emitFrame();
          toast(T((err && err.message) || 'No se pudo completar la acción'));
        }
        render();
      });
      return eqChain;
    }
    function renderAp() {
      if (!apBox.isConnected) return;
      const a = document.activeElement;
      if (a && apBox.contains(a) && a.tagName === 'SELECT') return; // no cerrar el desplegable mientras lo usás
      const head = `<h3>${esc(T('Mi estilo'))}</h3><p class="hint">${esc(T('Elegí qué llevás puesto en tu perfil. Los objetos nuevos se consiguen en la Tienda.'))}</p>`;
      if (!api() || !api().configured || !loggedIn()) { apBox.innerHTML = head + `<p class="hint">${esc(T('Conectá tu Discord en Social para usar la Tienda y ganar Vcoins.'))}</p>`; return; }
      if (!S.catalog.length) { apBox.innerHTML = head + `<p class="hint">${esc(T('Cargando…'))}</p>`; return; }
      const rows = AP_CATS.map(([cat, label]) => {
        const items = S.catalog.filter((i) => i.cat === cat && S.owned.has(i.id));
        const cur = S.equipped[cat], curItem = cur && byId(cur);
        const opts = items.map((i) => `<option value="${esc(i.id)}"${i.id === cur ? ' selected' : ''}>${esc(cat === 'title' ? titleText(i) : itemName(i))}</option>`).join('');
        return `<div class="ap-shop-row"><div class="ap-shop-info"><span class="ap-shop-lbl">${esc(T(label))}</span>` +
          `<select class="shop-input" data-ap-cat="${cat}"${items.length ? '' : ' disabled'}><option value="">${esc(T(items.length ? 'Ninguno' : 'Todavía no tenés ninguno'))}</option>${opts}</select></div>` +
          `<div class="shop-prev ap-shop-prev">${curItem ? preview(curItem) : '<span class="hint">—</span>'}</div></div>`;
      }).join('');
      apBox.innerHTML = head + rows + `<div class="shop-row"><button class="ghost-btn" type="button" data-ap-go>${esc(T('Ir a la Tienda'))}</button></div>`;
    }
    apBox.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-ap-cat]');
      if (!sel) return;
      sel.blur(); // si queda enfocado, renderAp() no redibuja (protege el desplegable abierto) y el cambio no se ve hasta salir y volver
      equipCat(sel.dataset.apCat, sel.value || null);
    });
    apBox.addEventListener('click', (e) => { if (e.target.closest('[data-ap-go]') && nav) nav.click(); });
    const apNav = document.querySelector('.nav-btn[data-panel="panel-amigos"]');
    if (apNav) apNav.addEventListener('click', () => { if (loggedIn() && !S.catalog.length) load(true); else renderAp(); });
    function render() { renderShop(); renderAp(); }

    function renderShop() {
      if (!api() || !api().configured) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('La tienda no está configurada en este cliente.'))}</p></div>`; return; }
      if (!loggedIn()) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('Conectá tu Discord en Social para usar la Tienda y ganar Vcoins.'))}</p></div>`; return; }
      const a = document.activeElement;
      const keep = a && root.contains(a) && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null;
      const earn = S.earn ? T('Jugando en una sala ganás 1 Vcoin cada {m} min (máx. {c} por día). También podés canjear códigos promocionales, completar logros y ganar premios en eventos.',
        { m: Math.round(S.earn.per_coin_seconds / 60), c: S.earn.daily_cap }) : '';
      const body = S.tab === 'deals' ? dealsHtml() : S.tab === 'special' ? specialHtml() : S.tab === 'ach' ? achHtml() : itemsHtml();
      root.innerHTML = topHtml() + tabsHtml() + body + (earn ? `<p class="hint shop-earn">${esc(earn)}</p>` : '');
      if (keep) {
        const n = document.getElementById(keep.id);
        if (n) { n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (_) {} }
      }
    }

    // ------------------------------------------------------------ acciones
    async function doAct(act, t) {
      if (act === 'buy') {
        const it0 = byId(t.dataset.id);
        const quick = !!it0 && ['frame', 'effect', 'title', 'badge', 'pet'].includes(it0.cat) && it0.price != null;
        if (quick) { S.balance -= it0.price; S.owned.add(it0.id); render(); } // se ve al instante; el server confirma
        let r;
        try { r = await req('POST', '/shop/buy', { item_id: t.dataset.id }); }
        catch (e) { if (quick) { S.balance += it0.price; S.owned.delete(it0.id); render(); } throw e; }
        apply(r);
        const it = byId(t.dataset.id);
        toast(T(it && it.cat === 'consumable' ? '¡Listo! Consumible activado' : it && it.cat === 'perk' ? '¡Mejora comprada!' : '¡Comprado! Ya podés ponértelo'), 'ok');
        refreshAch();
      } else if (act === 'equip') {
        await equipCat(t.dataset.cat, t.dataset.id);
      } else if (act === 'unequip') {
        await equipCat(t.dataset.cat, null);
      } else if (act === 'redeem') {
        const code = (S.code || '').trim();
        if (!code) { toast(T('Escribí un código primero')); return; }
        const r = await req('POST', '/shop/redeem', { code }); apply(r); S.code = '';
        toast(T('+{n} Vcoins', { n: r.gained }), 'ok');
      } else if (act === 'friendcode') {
        const code = (S.fc || '').trim();
        if (!code) { toast(T('Escribí el código que querés')); return; }
        const r = await req('POST', '/shop/friendcode', { code }); apply(r); S.fc = '';
        const me = api().me && api().me();
        if (me) me.friend_code = r.friend_code;
        const el = document.getElementById('fr-code'); if (el) el.textContent = r.friend_code;
        toast(T('Código cambiado a {c}', { c: r.friend_code }), 'ok');
      } else if (act === 'mystery') {
        const r = await req('POST', '/shop/mystery'); apply(r);
        toast(T('¡Te tocó: {n}!', { n: r.won ? itemName(r.won) : '' }), 'ok');
        refreshAch();
      } else if (act === 'petfood') {
        const r = await req('POST', '/shop/petfood'); apply(r);
        toast(T('¡Tu mascota se alimentó!'), 'ok');
        refreshAch();
      } else if (act === 'daily') {
        const r = await req('POST', '/shop/daily/claim'); apply(r);
        toast(T('¡Recompensa diaria! +{n} Vcoins', { n: r.gained }), 'ok');
      } else if (act === 'claim') {
        const r = await req('POST', '/shop/achievements/claim', { id: t.dataset.id }); apply(r);
        toast(T('¡Logro reclamado! +{n} Vcoins', { n: r.gained }), 'ok');
      }
    }
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || S.busy) return;
      const act = t.dataset.act;
      if (act === 'tab') {
        S.tab = t.dataset.cat; render();
        if (S.tab === 'ach') refreshAch();
        return;
      }
      if (act === 'gift') { openGift(t.dataset.id); return; }
      S.busy = true; t.disabled = true;
      if (act === 'buy' || act === 'claim' || act === 'daily') t.textContent = '…';
      try { await doAct(act, t); } catch (err) { toast(T((err && err.message) || 'No se pudo completar la acción')); }
      S.busy = false; setBadge(); render();
    });
    root.addEventListener('input', (e) => {
      const id = e.target.id;
      if (id === 'shop-code') S.code = e.target.value;
      else if (id === 'shop-fc') S.fc = e.target.value;
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const map = { 'shop-code': 'redeem', 'shop-fc': 'friendcode' };
      const act = map[e.target.id];
      const b = act && root.querySelector(`[data-act="${act}"]`);
      if (b) b.click();
    });

    // ------------------------------------------------------------ objetos puestos en el perfil de cualquiera
    async function decorate(box, id) {
      if (!box || !loggedIn() || !Number.isInteger(Number(id))) return;
      let c = null;
      try { const r = await req('GET', '/shop/cosmetics?ids=' + encodeURIComponent(id)); c = r && r.users && r.users[id]; } catch (_) { return; }
      if (!c || !box.isConnected) return;
      const av = box.querySelector('.pf-avatar');
      const ident = box.querySelector('.pf-ident');
      if (!av || !ident) return; // se cerró o se redibujó mientras tanto
      if (c.frame && ID_RE.test(c.frame.id)) av.classList.add('cos-' + c.frame.id);
      if (c.frame && ID_RE.test(c.frame.id) && window.vivetOrn) window.vivetOrn.wrap(av, c.frame.id, 26);
      if (c.effect && ID_RE.test(c.effect.id)) box.classList.add('cos-' + c.effect.id);
      if ((c.pet || c.title || c.clan || c.badge) && !ident.querySelector('.cos-trow')) {
        const row = document.createElement('div');
        row.className = 'cos-trow';
        const petName = c.pet ? (en() && ITEM_EN[c.pet.id] ? ITEM_EN[c.pet.id][0] : c.pet.name) : '';
        row.innerHTML = (c.clan ? `<span class="cos-clan">[${esc(c.clan)}]</span>` : '') +
          (c.badge && ID_RE.test(c.badge.id) ? `<span class="cos-badge" title="${esc(en() && ITEM_EN[c.badge.id] ? ITEM_EN[c.badge.id][0] : c.badge.name)}">${badgeSvg(c.badge.id, 20)}</span>` : '') +
          (c.pet && c.pet.emoji ? `<span class="cos-pet" title="${esc(petName)}${c.pet.level ? ' · ' + esc(T('Nivel {a}/{b}', { a: Number(c.pet.level), b: PET_LEVELS.length })) : ''}">${esc(c.pet.emoji)}</span>` : '') +
          (c.title && ID_RE.test(c.title.id) ? `<span class="cos-title cos-${c.title.id}">${esc(titleText(c.title))}</span>` : '');
        const nameEl = ident.querySelector('.pf-name');
        if (nameEl) nameEl.after(row); else ident.prepend(row);
      }
    }
    window.vivetShop = { decorate, reload: () => load(true) };

    window.addEventListener('vivet-session-changed', () => load(true));
    window.addEventListener('vivet-lang-changed', () => { paintHead(); render(); });
    nav && nav.addEventListener('click', () => load(false));
    setInterval(() => { if (!document.hidden && loggedIn()) load(true); }, 5 * 60 * 1000); // refresca el saldo (Vcoins por jugar)
    // Cuentas regresivas (escudo, boost, ofertas): se redibuja cada minuto con el panel a la vista.
    setInterval(() => { if (!document.hidden && !S.busy && loggedIn() && root.offsetParent !== null) { refreshDaily(); render(); } }, 60 * 1000);
    paintHead();
    render();
    load(true);
  })();
} catch (err) { console.error("[app2] tienda:", err); }

// ======================================================================
// Pestañas y orden de la interfaz  (antes: ui-organize.js)
// ======================================================================
try {
  // Vivet Client - renderer/ui-organize.js
  // Ordena paneles largos en pestañas (Apariencia, Social, Rendimiento) sin mover nada del DOM:
  // solo marca cada tarjeta con data-grp y oculta las que no son de la pestaña activa (clase .grp-off).
  // Los ids y listeners de app.js siguen intactos. Se carga AL FINAL (después de app.js).
  (() => {
    const $ = (s) => document.querySelector(s);
    const KEY = 'vivet_ui_tabs';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    const controllers = {};

    function makeTabs(panelId, defs, fallback) {
      const panel = document.getElementById(panelId);
      const header = panel && panel.querySelector('.panel-header');
      if (!panel || !header || controllers[panelId]) return controllers[panelId];
      const bar = document.createElement('div');
      bar.className = 'ui-tabs';
      bar.setAttribute('role', 'tablist');
      bar.innerHTML = defs.map((d) => `<button type="button" class="ui-tab" role="tab" data-tab="${d.id}">${d.label}</button>`).join('');
      header.after(bar);
      const btns = Array.from(bar.querySelectorAll('.ui-tab'));
      let current = defs.some((d) => d.id === saved[panelId]) ? saved[panelId] : fallback;

      function show(id) {
        if (!defs.some((d) => d.id === id)) return;
        current = id;
        panel.querySelectorAll('[data-grp]').forEach((el) => el.classList.toggle('grp-off', el.dataset.grp !== id));
        btns.forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        saved[panelId] = id;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {}
      }
      bar.addEventListener('click', (e) => { const b = e.target.closest('.ui-tab'); if (b) show(b.dataset.tab); });
      controllers[panelId] = { show, refresh: () => show(current) };
      controllers[panelId].refresh();
      return controllers[panelId];
    }

    // ------------------------------------------------------------ Apariencia
    // Las tarjetas de "Personalización avanzada" las inserta app.js después de cargar: se espera a que existan.
    const AP_RULES = [
      ['themes', ['#ap-presets', '#ap-theme-code']],
      ['colors', ['#club-grid', '#btn-swatches', '.stadium-grid', '#bg-strength', '[data-key="base"]']],
      ['stream', ['#streamer-toggle', '#stream-boost-toggle']],
    ];
    function tagAppearance() {
      const panel = $('#panel-apariencia');
      if (!panel || !$('#ap-presets')) return false;
      Array.from(panel.children).forEach((el) => {
        if (el.classList.contains('fr-section-title')) { el.dataset.grp = '_'; return; } // los títulos sueltos sobran con pestañas
        if (el.classList.contains('panel-toolbar')) { el.dataset.grp = 'colors'; return; } // botón Restablecer: solo en Colores
        if (!el.classList.contains('card')) return;
        const rule = AP_RULES.find(([, sels]) => sels.some((s) => el.matches(s) || el.querySelector(s)));
        el.dataset.grp = rule ? rule[0] : 'interface';
      });
      makeTabs('panel-apariencia', [
        { id: 'themes', label: 'Temas' }, { id: 'colors', label: 'Colores' },
        { id: 'interface', label: 'Fondo e interfaz' }, { id: 'stream', label: 'Transmisión' }
      ], 'themes');
      return true;
    }
    const apPanel = $('#panel-apariencia');
    if (apPanel && !tagAppearance()) {
      const mo = new MutationObserver(() => { if (tagAppearance()) mo.disconnect(); });
      mo.observe(apPanel, { childList: true });
    }

    // ------------------------------------------------------------ Rendimiento (agrupa por título de sección)
    (function perf() {
      const panel = $('#panel-rendimiento');
      if (!panel) return;
      const MAP = [['Mientras', 'game'], ['Pantalla', 'game'], ['Avanzado', 'adv'], ['Interfaz', 'adv'], ['Ayuda', 'help']];
      let grp = 'game';
      Array.from(panel.children).forEach((el) => {
        if (el.classList.contains('panel-header')) return;
        if (el.classList.contains('fr-section-title')) {
          const hit = MAP.find(([k]) => el.textContent.trim().startsWith(k));
          if (hit) grp = hit[1];
        }
        el.dataset.grp = grp;
      });
      makeTabs('panel-rendimiento', [{ id: 'game', label: 'Juego' }, { id: 'adv', label: 'Avanzado' }, { id: 'help', label: 'Ayuda' }], 'game');
    })();

    // ------------------------------------------------------------ Social (las tarjetas ya traen data-grp en index.html)
    makeTabs('panel-amigos', [{ id: 'friends', label: 'Amigos' }, { id: 'profile', label: 'Mi perfil' }], 'friends');

    window.vivetUI = { tab: (panelId, id) => controllers[panelId] && controllers[panelId].show(id) };
  })();
} catch (err) { console.error("[app2] ui-organize.js:", err); }

// ======================================================================
// Clanes  (antes: clans.js)
// ======================================================================
try {
  // Vivet Client - renderer/clans.js
  // Apartado "Clanes": Mi clan (miembros, chat, solicitudes, ajustes) y Top clanes.
  // Se carga DESPUÉS de app.js, chat.js y app2.js (usa window.vivetApi, escapeHtml, showToast,
  // joinByUrl, appRoot y window.vivetLang). Habla con server/clans.js.
  // Idiomas: ES (el código) y EN. Igual que la Tienda, el panel se traduce acá adentro con T()
  // (el panel tiene data-i18n-skip para que el traductor global no lo toque).
  (() => {
    const $ = (s) => document.querySelector(s);
    const panel = $('#panel-clanes');
    const root = $('#clan-root');
    if (!panel || !root) return;

    // ------------------------------------------------------------ traducciones (ES -> EN)
    const en = () => !!(window.vivetLang && window.vivetLang() === 'en');
    const EN = {
      // cabecera / menú
      'Clanes': 'Clans',
      'Armá tu clan, sumá XP en equipo, chateá con tus compañeros y escalá en el top de clanes.':
        'Build your clan, earn XP as a team, chat with your teammates and climb the clan leaderboard.',
      'Clanes no disponible': 'Clans unavailable',
      'Falta configurar FRIENDS_API_URL en config.js.': 'FRIENDS_API_URL is not set in config.js.',
      'Conectá tu Discord para usar los clanes': 'Connect your Discord to use clans',
      'Andá a Social y tocá "Conectar con Discord". Después podés crear o unirte a un clan.':
        'Go to Social and tap "Connect with Discord". Then you can create or join a clan.',
      'Mi clan': 'My clan', 'Top clanes': 'Top clans',
      'Cargando…': 'Loading…',
      // clan
      'Anuncio:': 'Announcement:',
      'Nv {n}': 'Lv {n}', '{a}/{b} miembros': '{a}/{b} members', '{n} XP': '{n} XP',
      '{n} XP para el nivel {l}': '{n} XP to level {l}',
      'Abierto': 'Open', 'Con solicitud': 'By request', 'Cerrado': 'Closed',
      'Líder': 'Leader', 'Oficial': 'Officer', 'Miembro': 'Member',
      // miembros
      'Jugando en {s}': 'Playing in {s}', 'una sala': 'a room', 'En línea': 'Online', 'Desconectado': 'Offline',
      'Unirme': 'Join', 'Quitar oficial': 'Remove officer', 'Hacer oficial': 'Make officer',
      'Dar liderazgo': 'Give leadership', 'Expulsar': 'Kick',
      'Invitar jugador': 'Invite player', 'Invitar': 'Invite',
      'Código de amigo (VV-XXXXXX) o usuario de Discord': 'Friend code (VV-XXXXXX) or Discord username',
      'Miembros ({a}/{b})': 'Members ({a}/{b})', ' · {n} jugando ahora': ' · {n} playing now',
      'Miembros': 'Members', 'Chat': 'Chat', 'Solicitudes': 'Requests', 'Solicitudes ({n})': 'Requests ({n})', 'Ajustes': 'Settings',
      'Salir del clan': 'Leave clan',
      // chat
      'Escribí al clan...': 'Write to the clan...', 'Enviar': 'Send', 'Vos': 'You',
      'Todavía no hay mensajes. ¡Saludá al clan!': 'No messages yet. Say hi to the clan!',
      // solicitudes
      'No hay solicitudes pendientes.': 'There are no pending requests.', 'Aceptar': 'Accept', 'Rechazar': 'Decline',
      // ajustes
      'Ajustes del clan': 'Clan settings', 'Descripción (máx. 200)': 'Description (max. 200)',
      'Anuncio para los miembros (máx. 300)': 'Announcement for members (max. 300)',
      'Ingreso': 'Joining', 'Color': 'Color', 'Guardar cambios': 'Save changes', 'Zona peligrosa': 'Danger zone',
      'Disolver el clan expulsa a todos y borra su chat. No se puede deshacer.':
        'Disbanding the clan removes everyone and deletes its chat. This cannot be undone.',
      'Disolver clan': 'Disband clan',
      // sin clan
      'Invitaciones': 'Invitations', 'Te invitó {by} · {a}/{b} miembros': 'Invited by {by} · {a}/{b} members',
      'Crear un clan': 'Create a clan',
      'Sumá XP con tu clan jugando en Vivet y escalá en el top. Podés estar en un solo clan a la vez.':
        'Earn XP with your clan by playing in Vivet and climb the leaderboard. You can only be in one clan at a time.',
      'Imagen del clan': 'Clan image', 'Elegir imagen': 'Choose image', 'Quitar imagen': 'Remove image',
      'PNG, JPG o WebP. Se recorta a cuadrado y se achica sola.': 'PNG, JPG or WebP. It is cropped to a square and shrunk automatically.',
      'Formato no soportado. Usá PNG, JPG o WebP.': 'Unsupported format. Use PNG, JPG or WebP.',
      'La imagen pesa demasiado (máx. 8 MB).': 'The image is too large (max. 8 MB).',
      'No se pudo achicar la imagen lo suficiente.': 'Could not shrink the image enough.',
      'No se pudo leer la imagen': 'Could not read the image',
      'Clan creado, pero no se pudo subir la imagen': 'Clan created, but the image could not be uploaded',
      'Pedile su código de amigo (está en Social) o escribí su usuario de Discord.': 'Ask for their friend code (it is in Social) or type their Discord username.',
      '{n} cupos libres · las invitaciones vencen a los 14 días': '{n} open spots · invitations expire after 14 days',
      'Clan lleno · no se pueden mandar más invitaciones': 'Clan full · no more invitations can be sent',
      'Escribí un código o usuario': 'Enter a code or username',
      'Image too large': 'Image too large', 'Imagen inválida.': 'Invalid image.', 'La imagen es demasiado grande.': 'The image is too large.',
      'Nombre (3-24)': 'Name (3-24)', 'Etiqueta (2-5)': 'Tag (2-5)', 'Descripción (opcional)': 'Description (optional)',
      'Cerrado (solo invitación)': 'Closed (invite only)',
      'Cómo se puede unir la gente': 'How people can join',
      'Cualquiera puede entrar al instante.': 'Anyone can join instantly.',
      'Un líder u oficial aprueba cada ingreso.': 'A leader or officer approves each join.',
      'Solo entran los que invites.': 'Only people you invite can join.', 'Crear clan': 'Create clan', 'Buscar un clan': 'Find a clan',
      // top
      'Tu clan': 'Your clan', 'Cancelar solicitud': 'Cancel request', 'Aceptar invitación': 'Accept invitation',
      'Lleno': 'Full', 'Solicitar': 'Request', 'Solicitar unirme': 'Request to join',
      'Nv {n} · {a}/{b} miembros · {m}': 'Lv {n} · {a}/{b} members · {m}',
      'No se pudo cargar el top ({e}).': 'Could not load the leaderboard ({e}).',
      'Sin resultados.': 'No results.', 'Todavía no hay clanes. ¡Creá el primero!': 'There are no clans yet. Create the first one!',
      'Buscar clan por nombre o etiqueta...': 'Search clan by name or tag...', 'Actualizar': 'Refresh',
      'Más XP': 'Most XP', 'Más miembros': 'Most members', 'Nuevos': 'Newest', '← Volver al top': '← Back to leaderboard',
      // avisos y confirmaciones
      'No se pudo completar la acción': 'Could not complete the action',
      '¡Te uniste al clan!': 'You joined the clan!',
      'Solicitud enviada. Un oficial tiene que aprobarla.': 'Request sent. An officer has to approve it.',
      'Salí de tu sala actual para unirte a esa sala': 'Leave your current room to join that room',
      '¡Clan creado!': 'Clan created!', 'Invitación enviada': 'Invitation sent',
      '¿Seguro que querés salir del clan?': 'Are you sure you want to leave the clan?', 'Saliste del clan': 'You left the clan',
      '¿Disolver el clan? Se expulsa a todos y se borra el chat. No se puede deshacer.':
        'Disband the clan? Everyone is removed and the chat is deleted. This cannot be undone.',
      'Clan disuelto': 'Clan disbanded', '¿Expulsar a este miembro?': 'Kick this member?',
      '¿Transferir el liderazgo? Vas a quedar como oficial.': 'Transfer leadership? You will become an officer.',
      'Liderazgo transferido': 'Leadership transferred', 'Cambios guardados': 'Changes saved',
      // errores del servidor (server/clans.js y server.js)
      'Ese clan no existe.': 'That clan does not exist.', 'Ese clan ya no existe.': 'That clan no longer exists.',
      'No sos parte de ese clan.': 'You are not part of that clan.', 'No tenés permisos para eso.': 'You do not have permission for that.',
      'Probaste muchas veces. Esperá un rato.': 'You tried too many times. Wait a bit.',
      'Ya estás en un clan. Salí primero para crear otro.': 'You are already in a clan. Leave it first to create another.',
      'El nombre debe tener entre 3 y 24 caracteres (letras, números, espacios, _ . -).':
        'The name must be 3 to 24 characters (letters, numbers, spaces, _ . -).',
      'La etiqueta debe tener entre 2 y 5 letras o números.': 'The tag must be 2 to 5 letters or numbers.',
      'Ya existe un clan con ese nombre.': 'A clan with that name already exists.',
      'Esa etiqueta ya está en uso.': 'That tag is already in use.',
      'Ese nombre o etiqueta ya está en uso.': 'That name or tag is already in use.',
      'Ya estás en un clan.': 'You are already in a clan.',
      'Para cambiar al líder usá "Transferir liderazgo".': 'To change the leader use "Transfer leadership".',
      'Rol inválido.': 'Invalid role.', 'No estás en ningún clan.': 'You are not in any clan.',
      'Sos el líder: transferí el liderazgo antes de salir (o disolvé el clan).':
        'You are the leader: transfer leadership before leaving (or disband the clan).',
      'Ya estás en un clan. Salí primero para unirte a otro.': 'You are already in a clan. Leave it first to join another.',
      'Este clan no acepta miembros nuevos.': 'This clan is not accepting new members.',
      'El clan está lleno.': 'The clan is full.', 'Solicitud no encontrada.': 'Request not found.',
      'Esa persona ya entró a otro clan.': 'That person already joined another clan.',
      'Escribí un código de amigo o usuario de Discord.': 'Enter a friend code or Discord username.',
      'No se encontró a ese usuario.': 'That user was not found.', 'Esa persona ya está en un clan.': 'That person is already in a clan.',
      'Hay demasiadas invitaciones pendientes.': 'There are too many pending invitations.',
      'Invitación no encontrada.': 'Invitation not found.', 'Esa persona no está en el clan.': 'That person is not in the clan.',
      'No podés expulsar a alguien de tu mismo rango o superior.': 'You cannot kick someone of your rank or higher.',
      'Elegí a otro miembro del clan.': 'Pick another clan member.', 'Escribí un mensaje.': 'Write a message.',
      'Más despacio.': 'Slow down.', 'Error del servidor': 'Server error',
      'Demasiadas solicitudes, esperá un momento.': 'Too many requests, wait a moment.',
      'No autenticado': 'Not signed in', 'Sesión vencida': 'Session expired',
    };
    const PAT = [[/^Error (\d+)$/, 'Error $1']];
    const fmtV = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '')) : s);
    function T(s, v) {
      s = String(s);
      if (!en()) return fmtV(s, v);
      let o = EN[s];
      if (o === undefined) for (const [re, rep] of PAT) if (re.test(s)) { o = s.replace(re, rep); break; }
      return fmtV(o === undefined ? s : o, v);
    }

    // ------------------------------------------------------------ utilidades
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(T(m), k); } catch (_) {} };
    const api = () => window.vivetApi;
    const req = (m, p, b) => api().request(m, p, b);
    const loggedIn = () => !!(api() && api().loggedIn());
    const myId = () => (api() && api().me() ? api().me().id : null);
    const panelActive = () => panel.classList.contains('active');

    const ROLE_ES = { leader: 'Líder', officer: 'Oficial', member: 'Miembro' };
    const MODE_ES = { open: 'Abierto', request: 'Con solicitud', closed: 'Cerrado' };
    // Modos de ingreso: [icono, nombre, descripción]
    const MODE_INFO = {
      open: ['globe', 'Abierto', 'Cualquiera puede entrar al instante.'],
      request: ['userCheck', 'Con solicitud', 'Un líder u oficial aprueba cada ingreso.'],
      closed: ['lock', 'Cerrado', 'Solo entran los que invites.'],
    };
    // Íconos propios (SVG), sin emojis.
    const ICO_D = {
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
      userCheck: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 11l2 2 4-4"/>',
      lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>',
    };
    const ico = (n, sz = 20) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO_D[n] || ''}</svg>`;
    const modeLabel = (k) => modeName(k);
    // Selector de ingreso: tres tarjetas (radio) en vez de un <select>.
    const modePicker = (name, current) => `<div class="cl-modes" role="radiogroup" aria-label="${esc(T('Ingreso'))}">${Object.keys(MODE_INFO).map((k) =>
      `<label class="cl-mode"><input type="radio" name="${name}" value="${k}"${k === current ? ' checked' : ''} />
        <span class="cl-mode-body"><span class="cl-mode-ico">${ico(MODE_INFO[k][0])}</span>
          <span class="cl-mode-txt"><b>${esc(T(MODE_INFO[k][1]))}</b><small>${esc(T(MODE_INFO[k][2]))}</small></span></span></label>`).join('')}</div>`;
    const roleName = (k) => T(ROLE_ES[k] || '');
    const modeName = (k) => T(MODE_ES[k] || '');
    const col = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#17e0e8');
    const fmt = (n) => Number(n || 0).toLocaleString(en() ? 'en-US' : 'es');
    const who = (u) => (u.haxball_nick ? `${u.haxball_nick} (${u.username})` : u.username);
    const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const avatar = (u) => `<img class="fr-avatar" alt="" src="${esc(u.avatar_url || '')}" onerror="this.removeAttribute('src')" />`;

    // Imagen del clan: el servidor la sirve en GET /clans/:id/image (image_v cambia al subir una nueva).
    const API_BASE = (typeof FRIENDS_API_URL !== 'undefined' && FRIENDS_API_URL ? FRIENDS_API_URL : '').replace(/\/+$/, '');
    const imgUrl = (c) => (c && Number(c.image_v) > 0 && API_BASE ? `${API_BASE}/clans/${Number(c.id)}/image?v=${Number(c.image_v)}` : '');
    // Emblema: la imagen si tiene; si no (o si falla la carga) la etiqueta de texto.
    const emblem = (c, cls = '') => {
      const u = imgUrl(c);
      return `<div class="cl-emblem ${cls}${u ? ' has-img' : ''}" style="--c:${col(c.color)}">${u
        ? `<img src="${esc(u)}" alt="" data-tag="${esc(c.tag)}" onerror="this.parentNode.classList.remove('has-img');this.replaceWith(document.createTextNode(this.dataset.tag))" />`
        : esc(c.tag)}</div>`;
    };

    // Nivel del clan según su XP total: Nv 2 = 100 XP, Nv 3 = 400, Nv 4 = 900 ... (cuadrático)
    function level(xp) {
      const l = 1 + Math.floor(Math.sqrt(xp / 100));
      const a = (l - 1) ** 2 * 100, b = l ** 2 * 100;
      return { l, pct: Math.max(0, Math.min(100, Math.round(((xp - a) / (b - a)) * 100))), next: b };
    }

    // ------------------------------------------------------------ estado
    const S = {
      tab: 'mine',        // mine | top | view
      sub: 'members',     // members | chat | requests | settings
      mine: null,         // { clan, invites } | null
      top: null,          // null = sin cargar | [] | 'error'
      topErr: '',
      sort: 'xp',
      q: '',
      view: null,         // detalle de un clan ajeno
      reqs: null,
      msgs: [],
      busy: false,
      newImg: '',         // imagen elegida al crear el clan (data URL) | ''
      setImg: undefined,  // ajustes: undefined = sin cambios | '' = quitar | data URL = nueva
    };

    async function run(fn) {
      if (S.busy) return;
      S.busy = true;
      try { await fn(); } catch (e) { toast((e && e.message) || 'No se pudo completar la acción'); } finally { S.busy = false; }
    }

    // ------------------------------------------------------------ vistas
    const notReady = () => {
      if (!api() || !api().configured) return `<div class="card"><h3>${esc(T('Clanes no disponible'))}</h3><p>${esc(T('Falta configurar FRIENDS_API_URL en config.js.'))}</p></div>`;
      if (!loggedIn()) return `<div class="card"><h3>${esc(T('Conectá tu Discord para usar los clanes'))}</h3><p>${esc(T('Andá a Social y tocá "Conectar con Discord". Después podés crear o unirte a un clan.'))}</p></div>`;
      return '';
    };

    function headCard(c) {
      const lv = level(c.xp);
      const ann = c.announcement ? `<div class="cl-ann"><b>${esc(T('Anuncio:'))}</b> ${esc(c.announcement)}</div>` : '';
      return `<div class="card cl-head" style="--c:${col(c.color)}">
        ${emblem(c)}
        <div class="cl-head-info">
          <h3>${esc(c.name)}${imgUrl(c) ? ` <span class="cl-tag">${esc(c.tag)}</span>` : ''}</h3>
          ${c.description ? `<div class="hint">${esc(c.description)}</div>` : ''}
          <div class="cl-chips">
            <span class="cl-chip">${esc(T('Nv {n}', { n: lv.l }))}</span>
            <span class="cl-chip">${esc(T('{a}/{b} miembros', { a: c.members, b: c.max }))}</span>
            <span class="cl-chip">${esc(T('{n} XP', { n: fmt(c.xp) }))}</span>
            <span class="cl-chip cl-chip-mode">${esc(modeLabel(c.join_mode))}</span>
          </div>
          <div class="comp-bar-bg"><div class="comp-bar" style="width:${lv.pct}%"></div></div>
          <div class="hint">${esc(T('{n} XP para el nivel {l}', { n: fmt(Math.max(0, lv.next - c.xp)), l: lv.l + 1 }))}</div>
          ${ann}
        </div>
      </div>`;
    }

    function memberRow(m, c, mine) {
      const myRole = c.my_role;
      const rank = { member: 1, officer: 2, leader: 3 };
      const isMe = m.id === myId();
      const inRoom = m.room && (m.room.code || m.room.name);
      const sub = inRoom ? T('Jugando en {s}', { s: m.room.name || T('una sala') }) : m.online ? T('En línea') : (mine ? T('Desconectado') : '');
      const acts = [];
      if (mine && m.room && m.room.code && !isMe) acts.push(`<button class="ghost-btn secondary-action" data-act="joinroom" data-code="${esc(m.room.code)}">${esc(T('Unirme'))}</button>`);
      if (mine && !isMe && myRole === 'leader' && m.role !== 'leader') {
        acts.push(`<button class="ghost-btn secondary-action" data-act="role" data-id="${m.id}" data-role="${m.role === 'officer' ? 'member' : 'officer'}">${esc(T(m.role === 'officer' ? 'Quitar oficial' : 'Hacer oficial'))}</button>`);
        acts.push(`<button class="ghost-btn secondary-action" data-act="transfer" data-id="${m.id}">${esc(T('Dar liderazgo'))}</button>`);
      }
      if (mine && !isMe && rank[myRole] > rank[m.role] && rank[myRole] >= 2) acts.push(`<button class="ghost-btn secondary-action cl-danger" data-act="kick" data-id="${m.id}">${esc(T('Expulsar'))}</button>`);
      return `<div class="fr-row ${inRoom ? 'fr-row-live' : ''}">
        ${avatar(m)}
        <div class="fr-row-info"><div class="fr-row-name">${esc(who(m))} <span class="cl-role cl-role-${m.role}">${esc(roleName(m.role))}</span></div>
          <div class="fr-row-sub ${inRoom ? 'in-room' : ''}">${sub ? esc(sub) + ' · ' : ''}${esc(T('{n} XP', { n: fmt(m.xp) }))}</div></div>
        <div class="cl-row-acts">${acts.join('')}</div>
      </div>`;
    }

    function membersTab(c, mine) {
      const canInvite = mine && (c.my_role === 'leader' || c.my_role === 'officer');
      const live = mine ? c.members_list.filter((m) => m.room).length : 0;
      const free = Math.max(0, c.max - c.members);
      const inviteCard = canInvite ? `<div class="card cl-invite">
          <div class="cl-invite-head">
            <div class="cl-invite-ico" aria-hidden="true">${ico('mail', 22)}</div>
            <div class="cl-invite-txt"><h3>${esc(T('Invitar jugador'))}</h3>
              <p class="hint">${esc(T('Pedile su código de amigo (está en Social) o escribí su usuario de Discord.'))}</p></div>
            <span class="cl-chip cl-invite-free${free ? '' : ' full'}">${esc(T('{a}/{b} miembros', { a: c.members, b: c.max }))}</span>
          </div>
          <div class="cl-invite-box">
            <span class="cl-invite-at" aria-hidden="true">${ico('search', 16)}</span>
            <input id="cl-invite-q" type="text" maxlength="40" placeholder="${esc(T('Código de amigo (VV-XXXXXX) o usuario de Discord'))}" autocomplete="off" spellcheck="false" ${free ? '' : 'disabled'} />
            <button class="primary-btn" data-act="invite" type="button" ${free ? '' : 'disabled'}>${esc(T('Invitar'))}</button>
          </div>
          <div class="cl-invite-foot">${esc(free ? T('{n} cupos libres · las invitaciones vencen a los 14 días', { n: free }) : T('Clan lleno · no se pueden mandar más invitaciones'))}</div>
        </div>` : '';
      return `${inviteCard}
        <div class="fr-section-title">${esc(T('Miembros ({a}/{b})', { a: c.members, b: c.max }))}${mine ? esc(T(' · {n} jugando ahora', { n: live })) : ''}</div>
        ${c.members_list.map((m) => memberRow(m, c, mine)).join('')}`;
    }

    function chatTab() {
      return `<div class="card cl-chat">
        <div id="cl-msgs" class="cl-msgs"></div>
        <div class="cl-inline"><input id="cl-msg-in" type="text" maxlength="300" placeholder="${esc(T('Escribí al clan...'))}" autocomplete="off" />
        <button class="primary-btn" data-act="send" type="button">${esc(T('Enviar'))}</button></div>
      </div>`;
    }

    function requestsTab() {
      if (S.reqs === null) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
      if (!S.reqs.length) return `<p class="hint fr-empty">${esc(T('No hay solicitudes pendientes.'))}</p>`;
      return S.reqs.map((r) => `<div class="fr-row">
        ${avatar(r)}
        <div class="fr-row-info"><div class="fr-row-name">${esc(who(r))}</div><div class="fr-row-sub">${esc(T('{n} XP', { n: fmt(r.xp) }))}</div></div>
        <div class="cl-row-acts">
          <button class="primary-btn secondary-action" data-act="req" data-id="${r.id}" data-accept="1" type="button">${esc(T('Aceptar'))}</button>
          <button class="ghost-btn secondary-action cl-danger" data-act="req" data-id="${r.id}" data-accept="0" type="button">${esc(T('Rechazar'))}</button>
        </div></div>`).join('');
    }

    // Selector de imagen (t = 'new' al crear | 'set' en ajustes). El preview se repinta sin re-renderizar todo,
    // así no se pierde lo que ya escribiste en el formulario.
    function prevHtml(t) {
      const v = t === 'new' ? S.newImg : S.setImg;
      const clan = t === 'set' ? S.mine && S.mine.clan : null;
      if (v) return `<img src="${esc(v)}" alt="" />`;
      if (v === undefined && clan && imgUrl(clan)) return `<img src="${esc(imgUrl(clan))}" alt="" />`;
      return `<span>${ico('image', 26)}</span>`;
    }
    const paintPrev = (t) => { const el = document.getElementById('cl-prev-' + t); if (el) el.innerHTML = prevHtml(t); };
    function imgPicker(t, color) {
      return `<div class="form-field"><span>${esc(T('Imagen del clan'))}</span>
        <div class="cl-imgpick">
          <div class="cl-emblem has-img cl-imgpick-prev" id="cl-prev-${t}" style="--c:${col(color)}">${prevHtml(t)}</div>
          <div class="cl-imgpick-body">
            <div class="cl-row-acts" style="justify-content:flex-start">
              <button class="ghost-btn secondary-action" data-act="img-pick" data-t="${t}" type="button">${esc(T('Elegir imagen'))}</button>
              <button class="ghost-btn secondary-action cl-danger" data-act="img-clear" data-t="${t}" type="button">${esc(T('Quitar imagen'))}</button>
            </div>
            <small class="hint">${esc(T('PNG, JPG o WebP. Se recorta a cuadrado y se achica sola.'))}</small>
          </div>
          <input type="file" id="cl-file-${t}" data-img="${t}" accept="image/png,image/jpeg,image/webp" hidden />
        </div></div>`;
    }
    // Recorta al centro, achica a 128x128 y comprime (WebP, o JPEG si no hay WebP) para que pese < ~45 KB.
    async function fileToDataUrl(file) {
      if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Formato no soportado. Usá PNG, JPG o WebP.');
      if (file.size > 8 * 1024 * 1024) throw new Error('La imagen pesa demasiado (máx. 8 MB).');
      const bmp = await createImageBitmap(file);
      const size = 128, side = Math.min(bmp.width, bmp.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
      if (bmp.close) bmp.close();
      for (const q of [0.9, 0.8, 0.65, 0.5]) {
        let u = cv.toDataURL('image/webp', q);
        if (!u.startsWith('data:image/webp')) u = cv.toDataURL('image/jpeg', q);
        if (u.length <= 60000) return u;
      }
      throw new Error('No se pudo achicar la imagen lo suficiente.');
    }

    function settingsTab(c) {
      const leader = c.my_role === 'leader';
      return `<div class="card cl-settings">
        <h3>${esc(T('Ajustes del clan'))}</h3>
        <label class="form-field"><span>${esc(T('Descripción (máx. 200)'))}</span><input id="cl-set-desc" type="text" maxlength="200" value="${esc(c.description)}" /></label>
        <label class="form-field"><span>${esc(T('Anuncio para los miembros (máx. 300)'))}</span><input id="cl-set-ann" type="text" maxlength="300" value="${esc(c.announcement || '')}" /></label>
        ${leader ? `<div class="form-field"><span>${esc(T('Cómo se puede unir la gente'))}</span>${modePicker('cl-set-mode', c.join_mode)}</div>
        ${imgPicker('set', c.color)}
        <div class="cl-inline"><label class="form-field cl-color"><span>${esc(T('Color'))}</span><input id="cl-set-color" type="color" value="${col(c.color)}" /></label></div>` : ''}
        <div class="cl-inline"><button class="primary-btn" data-act="save" type="button">${esc(T('Guardar cambios'))}</button></div>
      </div>
      ${leader ? `<div class="card"><h3>${esc(T('Zona peligrosa'))}</h3><p class="hint">${esc(T('Disolver el clan expulsa a todos y borra su chat. No se puede deshacer.'))}</p>
        <button class="ghost-btn cl-danger" data-act="disband" type="button">${esc(T('Disolver clan'))}</button></div>` : ''}`;
    }

    function renderMine() {
      const m = S.mine;
      if (!m) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
      const c = m.clan;
      if (!c) {
        const inv = (m.invites || []).length ? `<div class="fr-section-title">${esc(T('Invitaciones'))}</div>` + m.invites.map((i) => `<div class="fr-row">
            ${emblem(i, 'sm')}
            <div class="fr-row-info"><div class="fr-row-name">${esc(i.name)}</div><div class="fr-row-sub">${esc(T('Te invitó {by} · {a}/{b} miembros', { by: i.by, a: i.members, b: i.max }))}</div></div>
            <div class="cl-row-acts">
              <button class="primary-btn secondary-action" data-act="inv" data-id="${i.id}" data-accept="1" type="button">${esc(T('Unirme'))}</button>
              <button class="ghost-btn secondary-action cl-danger" data-act="inv" data-id="${i.id}" data-accept="0" type="button">${esc(T('Rechazar'))}</button>
            </div></div>`).join('') : '';
        return `${inv}
          <div class="card cl-create">
            <h3>${esc(T('Crear un clan'))}</h3>
            <p class="hint">${esc(T('Sumá XP con tu clan jugando en Vivet y escalá en el top. Podés estar en un solo clan a la vez.'))}</p>
            <div class="cl-inline">
              <label class="form-field" style="flex:1"><span>${esc(T('Nombre (3-24)'))}</span><input id="cl-new-name" type="text" maxlength="24" autocomplete="off" /></label>
              <label class="form-field" style="width:110px"><span>${esc(T('Etiqueta (2-5)'))}</span><input id="cl-new-tag" type="text" maxlength="5" autocomplete="off" style="text-transform:uppercase" /></label>
            </div>
            <label class="form-field"><span>${esc(T('Descripción (opcional)'))}</span><input id="cl-new-desc" type="text" maxlength="200" autocomplete="off" /></label>
            <div class="form-field"><span>${esc(T('Cómo se puede unir la gente'))}</span>${modePicker('cl-new-mode', 'request')}</div>
            ${imgPicker('new', '#17e0e8')}
            <div class="cl-inline"><label class="form-field cl-color"><span>${esc(T('Color'))}</span><input id="cl-new-color" type="color" value="#17e0e8" /></label></div>
            <div class="cl-inline"><button class="primary-btn" data-act="create" type="button">${esc(T('Crear clan'))}</button>
              <button class="ghost-btn" data-act="tab" data-tab="top" type="button">${esc(T('Buscar un clan'))}</button></div>
          </div>`;
      }
      const isOff = c.my_role === 'leader' || c.my_role === 'officer';
      const subs = [['members', T('Miembros')], ['chat', T('Chat')],
        ...(isOff ? [['requests', c.pending_requests ? T('Solicitudes ({n})', { n: c.pending_requests }) : T('Solicitudes')]] : []),
        ...(isOff ? [['settings', T('Ajustes')]] : [])];
      if (!subs.some(([k]) => k === S.sub)) S.sub = 'members';
      const body = S.sub === 'chat' ? chatTab() : S.sub === 'requests' ? requestsTab() : S.sub === 'settings' ? settingsTab(c) : membersTab(c, true);
      return `${headCard(c)}
        <div class="forum-bar">${subs.map(([k, l]) => `<button class="social-tab ${S.sub === k ? 'on' : ''}" data-act="sub" data-sub="${k}" type="button">${esc(l)}</button>`).join('')}
          <button class="ghost-btn secondary-action cl-danger" data-act="leave" type="button" style="margin-left:auto;">${esc(T('Salir del clan'))}</button></div>
        ${body}`;
    }

    function topRow(c, i) {
      const lv = level(c.xp);
      const cls = i < 3 ? `comp-top${i + 1}` : '';
      let btn = '';
      if (c.state === 'member') btn = `<span class="cl-chip">${esc(T('Tu clan'))}</span>`;
      else if (c.state === 'pending') btn = `<button class="ghost-btn secondary-action" data-act="cancel" data-id="${c.id}" type="button">${esc(T('Cancelar solicitud'))}</button>`;
      else if (c.state === 'invited') btn = `<button class="primary-btn secondary-action" data-act="join" data-id="${c.id}" type="button">${esc(T('Aceptar invitación'))}</button>`;
      else if (c.join_mode === 'closed') btn = `<span class="hint">${esc(T('Cerrado'))}</span>`;
      else if (c.members >= c.max) btn = `<span class="hint">${esc(T('Lleno'))}</span>`;
      else if (loggedIn()) btn = `<button class="primary-btn secondary-action" data-act="join" data-id="${c.id}" type="button">${esc(T(c.join_mode === 'open' ? 'Unirme' : 'Solicitar'))}</button>`;
      return `<div class="fr-row cl-toprow ${cls}" data-act="view" data-id="${c.id}">
        <div class="comp-pos">${i + 1}</div>
        ${emblem(c, 'sm')}
        <div class="fr-row-info"><div class="fr-row-name">${esc(c.name)}</div>
          <div class="fr-row-sub">${esc(T('Nv {n} · {a}/{b} miembros · {m}', { n: lv.l, a: c.members, b: c.max, m: modeLabel(c.join_mode) }))}</div></div>
        <div class="comp-time">${esc(T('{n} XP', { n: fmt(c.xp) }))}</div>
        <div class="cl-row-acts">${btn}</div></div>`;
    }

    function topList() {
      if (S.top === null) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
      if (S.top === 'error') return `<p class="hint fr-empty">${esc(T('No se pudo cargar el top ({e}).', { e: T(S.topErr) }))}</p>`;
      if (!S.top.length) return `<p class="hint fr-empty">${esc(T(S.q ? 'Sin resultados.' : 'Todavía no hay clanes. ¡Creá el primero!'))}</p>`;
      return S.top.map(topRow).join('');
    }

    function renderTop() {
      return `<div class="toolbar" style="margin:0 32px 8px;">
          <div class="search-box"><input id="cl-search" type="text" maxlength="30" placeholder="${esc(T('Buscar clan por nombre o etiqueta...'))}" value="${esc(S.q)}" autocomplete="off" /></div>
          <button class="ghost-btn" data-act="refresh" type="button">${esc(T('Actualizar'))}</button>
        </div>
        <div class="forum-bar">${[['xp', 'Más XP'], ['members', 'Más miembros'], ['new', 'Nuevos']].map(([k, l]) => `<button class="social-tab ${S.sort === k ? 'on' : ''}" data-act="sort" data-sort="${k}" type="button">${esc(T(l))}</button>`).join('')}</div>
        <div id="cl-toplist">${topList()}</div>`;
    }

    function renderView() {
      const c = S.view;
      if (!c) return `<p class="hint fr-empty">${esc(T('Cargando…'))}</p>`;
      let btn = '';
      if (c.state === 'member') btn = '';
      else if (c.state === 'pending') btn = `<button class="ghost-btn" data-act="cancel" data-id="${c.id}" type="button">${esc(T('Cancelar solicitud'))}</button>`;
      else if (c.state === 'invited') btn = `<button class="primary-btn" data-act="join" data-id="${c.id}" type="button">${esc(T('Aceptar invitación'))}</button>`;
      else if (c.join_mode !== 'closed' && c.members < c.max && loggedIn()) btn = `<button class="primary-btn" data-act="join" data-id="${c.id}" type="button">${esc(T(c.join_mode === 'open' ? 'Unirme' : 'Solicitar unirme'))}</button>`;
      return `<div class="forum-bar"><button class="ghost-btn secondary-action" data-act="back" type="button">${esc(T('← Volver al top'))}</button>
          <span style="margin-left:auto">${btn}</span></div>
        ${headCard(c)}
        ${membersTab(c, false)}`;
    }

    // ------------------------------------------------------------ render
    // Textos fijos del HTML (menú y cabecera del panel): se repintan al cambiar de idioma.
    function paintHead() {
      const set = (id, es) => { const el = document.getElementById(id); if (el) el.textContent = T(es); };
      set('clan-nav-label', 'Clanes');
      set('clan-title', 'Clanes');
      set('clan-hint', 'Armá tu clan, sumá XP en equipo, chateá con tus compañeros y escalá en el top de clanes.');
    }

    function render(force) {
      // No pisar lo que se está escribiendo (los refrescos de fondo no deben borrar los inputs).
      const ae = document.activeElement;
      if (!force && ae && root.contains(ae) && ae.matches('input,textarea,select')) return;
      const nr = notReady();
      const tabs = `<div class="forum-bar" style="margin:0 32px 12px;">
          <button class="social-tab ${S.tab === 'mine' ? 'on' : ''}" data-act="tab" data-tab="mine" type="button">${esc(T('Mi clan'))}</button>
          <button class="social-tab ${S.tab !== 'mine' ? 'on' : ''}" data-act="tab" data-tab="top" type="button">${esc(T('Top clanes'))}</button></div>`;
      // Top clanes se puede mirar sin sesión; Mi clan no.
      let body;
      if (S.tab === 'mine') body = nr || renderMine();
      else if (S.tab === 'view') body = renderView();
      else body = renderTop();
      root.innerHTML = `${tabs}<div class="cl-body">${body}</div>`;
      if (S.tab === 'mine' && S.mine && S.mine.clan && S.sub === 'chat') paintMsgs(true);
    }

    // ------------------------------------------------------------ datos
    async function loadMine(opts = {}) {
      if (!loggedIn()) { S.mine = null; updateBadge(); if (!opts.silent) render(true); return; }
      try {
        const prev = S.mine && S.mine.clan && S.mine.clan.id;
        S.mine = await req('GET', '/clans/mine');
        if ((S.mine.clan && S.mine.clan.id) !== prev) { S.msgs = []; S.reqs = null; S.sub = 'members'; S.setImg = undefined; }
      } catch (e) { if (!opts.silent) toast(e.message); }
      updateBadge();
      if (panelActive() && S.tab === 'mine') render(!!opts.force);
    }

    let topTimer = null;
    async function loadTop() {
      try {
        const p = new URLSearchParams({ sort: S.sort, limit: '50' });
        if (S.q) p.set('q', S.q);
        const r = await req('GET', '/clans/top?' + p);
        S.top = r.top || [];
      } catch (e) { S.top = 'error'; S.topErr = e.message || 'error'; }
      const box = $('#cl-toplist');
      if (box) box.innerHTML = topList();
    }

    async function loadView(id) {
      S.tab = 'view'; S.view = null; render(true);
      try { S.view = await req('GET', `/clans/${id}`); } catch (e) { toast(e.message); S.tab = 'top'; }
      render(true);
    }

    async function loadReqs() {
      const c = S.mine && S.mine.clan;
      if (!c || (c.my_role !== 'leader' && c.my_role !== 'officer')) return;
      try { S.reqs = (await req('GET', `/clans/${c.id}/requests`)).requests || []; } catch (_) { S.reqs = []; }
      if (S.sub === 'requests') render(true);
    }

    function updateBadge() {
      const b = $('#clan-badge');
      if (!b) return;
      const m = S.mine;
      // Las invitaciones se avisan en Social (app.js); acá solo cuentan las solicitudes de ingreso por aprobar.
      const n = m ? ((m.clan && m.clan.pending_requests) || 0) : 0;
      b.hidden = n === 0;
      b.textContent = n > 99 ? '99+' : String(n);
    }

    // ------------------------------------------------------------ chat
    function paintMsgs(bottom) {
      const box = $('#cl-msgs');
      if (!box) return;
      const near = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      const me = myId();
      box.innerHTML = S.msgs.length ? S.msgs.map((m) => `<div class="cl-msg ${m.from === me ? 'mine' : ''}"><b>${esc(m.from === me ? T('Vos') : m.name)}</b> <span>${esc(m.body)}</span> <i>${hhmm(m.created_at)}</i></div>`).join('')
        : `<p class="hint fr-empty">${esc(T('Todavía no hay mensajes. ¡Saludá al clan!'))}</p>`;
      if (bottom || near) box.scrollTop = box.scrollHeight;
    }
    async function pollMsgs() {
      const c = S.mine && S.mine.clan;
      if (!c || S.sub !== 'chat' || S.tab !== 'mine' || !panelActive() || document.hidden) return;
      try {
        const last = S.msgs.length ? S.msgs[S.msgs.length - 1].id : 0;
        const r = await req('GET', `/clans/${c.id}/messages${last ? `?after=${last}` : ''}`);
        const fresh = (r.messages || []).filter((m) => !S.msgs.some((x) => x.id === m.id));
        if (fresh.length || !last) { S.msgs = S.msgs.concat(fresh).slice(-200); paintMsgs(false); }
      } catch (_) {}
    }

    // ------------------------------------------------------------ acciones
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const radio = (name) => (document.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
    const ask = (es) => confirm(T(es));
    const joinRoom = (code) => {
      const url = `https://www.haxball.com/play?c=${encodeURIComponent(code)}`;
      try {
        if (typeof appRoot !== 'undefined' && appRoot && appRoot.classList.contains('playing')) return toast('Salí de tu sala actual para unirte a esa sala');
        if (typeof joinByUrl === 'function') joinByUrl(url, null);
      } catch (_) {}
    };

    async function afterJoin(r) {
      if (r && r.joined) { toast('¡Te uniste al clan!', 'ok'); S.tab = 'mine'; await loadMine({ force: true }); }
      else if (r && r.requested) { toast('Solicitud enviada. Un oficial tiene que aprobarla.', 'ok'); await loadTop(); if (S.tab === 'view') loadView(S.view.id); }
    }

    const ACTIONS = {
      tab: (el) => {
        S.tab = el.dataset.tab; S.view = null; S.setImg = undefined; render(true);
        if (S.tab === 'top') loadTop(); else loadMine({ force: true });
      },
      sub: (el) => {
        S.sub = el.dataset.sub; S.setImg = undefined; render(true);
        if (S.sub === 'requests') loadReqs();
        if (S.sub === 'chat') pollMsgs();
      },
      back: () => { S.tab = 'top'; S.view = null; render(true); loadTop(); },
      view: (el, ev) => { if (ev.target.closest('button')) return; loadView(el.dataset.id); },
      sort: (el) => { S.sort = el.dataset.sort; S.top = null; render(true); loadTop(); },
      refresh: () => loadTop(),
      create: () => run(async () => {
        const made = await req('POST', '/clans', {
          name: val('cl-new-name'), tag: val('cl-new-tag'), description: val('cl-new-desc'),
          join_mode: radio('cl-new-mode'), color: val('cl-new-color'),
        });
        if (S.newImg && made && made.id) {
          try { await req('PUT', `/clans/${made.id}/image`, { image: S.newImg }); }
          catch (_) { toast('Clan creado, pero no se pudo subir la imagen'); }
        }
        S.newImg = '';
        toast('¡Clan creado!', 'ok');
        await loadMine({ force: true });
      }),
      join: (el) => run(async () => afterJoin(await req('POST', `/clans/${el.dataset.id}/join`))),
      cancel: (el) => run(async () => {
        await req('DELETE', `/clans/${el.dataset.id}/join`);
        await loadTop(); if (S.tab === 'view') loadView(S.view.id);
      }),
      inv: (el) => run(async () => {
        const acc = el.dataset.accept === '1';
        await req('POST', `/clans/invites/${el.dataset.id}/respond`, { accept: acc });
        if (acc) toast('¡Te uniste al clan!', 'ok');
        await loadMine({ force: true });
      }),
      invite: () => run(async () => {
        const q = val('cl-invite-q').trim();
        if (!q) { toast('Escribí un código o usuario'); return; }
        await req('POST', `/clans/${S.mine.clan.id}/invite`, { query: q });
        toast('Invitación enviada', 'ok');
        const i = document.getElementById('cl-invite-q'); if (i) i.value = '';
      }),
      leave: () => run(async () => {
        if (!ask('¿Seguro que querés salir del clan?')) return;
        await req('POST', '/clans/leave');
        toast('Saliste del clan', 'ok');
        await loadMine({ force: true });
      }),
      disband: () => run(async () => {
        if (!ask('¿Disolver el clan? Se expulsa a todos y se borra el chat. No se puede deshacer.')) return;
        await req('DELETE', `/clans/${S.mine.clan.id}`);
        toast('Clan disuelto', 'ok');
        await loadMine({ force: true });
      }),
      kick: (el) => run(async () => {
        if (!ask('¿Expulsar a este miembro?')) return;
        await req('POST', `/clans/${S.mine.clan.id}/members/${el.dataset.id}/kick`);
        await loadMine({ force: true });
      }),
      role: (el) => run(async () => {
        await req('POST', `/clans/${S.mine.clan.id}/members/${el.dataset.id}/role`, { role: el.dataset.role });
        await loadMine({ force: true });
      }),
      transfer: (el) => run(async () => {
        if (!ask('¿Transferir el liderazgo? Vas a quedar como oficial.')) return;
        await req('POST', `/clans/${S.mine.clan.id}/transfer`, { id: Number(el.dataset.id) });
        toast('Liderazgo transferido', 'ok');
        await loadMine({ force: true });
      }),
      req: (el) => run(async () => {
        await req('POST', `/clans/${S.mine.clan.id}/requests/${el.dataset.id}`, { accept: el.dataset.accept === '1' });
        await Promise.all([loadReqs(), loadMine({ force: true })]);
      }),
      save: () => run(async () => {
        const body = { description: val('cl-set-desc'), announcement: val('cl-set-ann') };
        if (S.mine.clan.my_role === 'leader') { body.join_mode = radio('cl-set-mode'); body.color = val('cl-set-color'); }
        await req('PATCH', `/clans/${S.mine.clan.id}`, body);
        if (S.mine.clan.my_role === 'leader' && S.setImg !== undefined) {
          if (S.setImg) await req('PUT', `/clans/${S.mine.clan.id}/image`, { image: S.setImg });
          else if (Number(S.mine.clan.image_v) > 0) await req('DELETE', `/clans/${S.mine.clan.id}/image`);
          S.setImg = undefined;
        }
        toast('Cambios guardados', 'ok');
        await loadMine({ force: true });
      }),
      send: () => run(async () => {
        const inp = document.getElementById('cl-msg-in');
        const body = (inp && inp.value || '').trim();
        if (!body) return;
        inp.value = '';
        try { await req('POST', `/clans/${S.mine.clan.id}/messages`, { body }); }
        catch (e) { inp.value = body; throw e; }
        await pollMsgs();
        paintMsgs(true);
        inp.focus();
      }),
      'img-pick': (el) => { const f = document.getElementById('cl-file-' + el.dataset.t); if (f) f.click(); },
      'img-clear': (el) => { if (el.dataset.t === 'new') S.newImg = ''; else S.setImg = ''; paintPrev(el.dataset.t); },
      joinroom: (el) => joinRoom(el.dataset.code),
    };

    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      const fn = ACTIONS[el.dataset.act];
      if (fn) fn(el, e);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (e.target.id === 'cl-msg-in') ACTIONS.send();
      else if (e.target.id === 'cl-invite-q') ACTIONS.invite();
    });
    root.addEventListener('change', async (e) => {
      const inp = e.target;
      if (!inp.matches || !inp.matches('input[type=file][data-img]')) return;
      const t = inp.dataset.img, f = inp.files && inp.files[0];
      inp.value = '';
      if (!f) return;
      try {
        const u = await fileToDataUrl(f);
        if (t === 'new') S.newImg = u; else S.setImg = u;
        paintPrev(t);
      } catch (err) { toast((err && err.message) || 'No se pudo leer la imagen'); }
    });
    root.addEventListener('input', (e) => {
      if (e.target.id !== 'cl-search') return;
      S.q = e.target.value.trim();
      clearTimeout(topTimer);
      topTimer = setTimeout(loadTop, 300);
    });

    // ------------------------------------------------------------ arranque / eventos
    document.querySelector('.nav-btn[data-panel="panel-clanes"]')?.addEventListener('click', () => {
      render(true);
      if (S.tab === 'top') loadTop(); else loadMine({ force: true });
    });
    window.addEventListener('vivet-session-changed', () => {
      S.mine = null; S.msgs = []; S.reqs = null; S.view = null;
      if (S.tab === 'view') S.tab = 'top';
      render(true);
      if (loggedIn()) loadMine({ silent: true, force: true }); else updateBadge();
    });
    window.addEventListener('vivet-clan-changed', () => { S.tab = 'mine'; loadMine({ silent: true, force: true }); });
    window.addEventListener('vivet-friends-updated', () => { if (panelActive()) render(false); });
    window.addEventListener('vivet-lang-changed', () => { paintHead(); render(true); });

    setInterval(() => { if (!document.hidden && loggedIn()) loadMine({ silent: true }); }, 15000);
    setInterval(pollMsgs, 4000);
    setInterval(() => { if (!document.hidden && panelActive() && S.tab === 'top') loadTop(); }, 60000);

    paintHead();
    render(true);
    if (loggedIn()) loadMine({ silent: true, force: true });
  })();
} catch (err) { console.error("[app2] clans.js:", err); }

// ======================================================================
// Cosméticos del evento  (antes: halloween-cos.js)  *** NO BORRAR NUNCA ***
// ======================================================================
// Vivet Client - renderer/halloween-cos.js
// Estilos de los COSMETICOS del evento Trick or Treat 2026 (marcos, efectos y etiquetas .cos-*_hw_*).
// *** NO BORRAR NUNCA, ni cuando termine el evento ***: los objetos que la gente ya consiguió se siguen
// viendo gracias a este archivo. Es independiente del panel y del tema (esos sí se borran después).
// Se carga desde index.html y no depende de nada más.
try {
  (() => {
    if (document.getElementById('hw-cos-css')) return;
    const BAT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64'%3E%3Cpath d='M48 36C43 28 33 22 21 26c6 4 6 10 2 14 8-2 14 2 18 8 2-4 5-6 7-6s5 2 7 6c4-6 10-10 18-8-4-4-4-10 2-14C63 22 53 28 48 36z' fill='%23b794f6'/%3E%3C/svg%3E\")";
    const WEB = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' fill='none' stroke='%23e5e7eb' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M0 0L90 0M0 0L85 30M0 0L60 60M0 0L30 85M0 0L0 90M25 0Q20 20 0 25M50 0Q40 40 0 50M75 0Q60 60 0 75'/%3E%3C/svg%3E\")";
    const css = document.createElement('style');
    css.id = 'hw-cos-css';
    css.textContent = `
    /* ===== Cosméticos del evento (se ven en perfiles, tienda y Mi estilo) ===== */
    .cos-f_hw_pumpkin{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ff6a00,#ffb347 12%,#1a0b00 24%,#ff8a1f 36%,#ffb347 48%,#1a0b00 62%,#ff6a00 76%,#ffb347 88%,#ff6a00) border-box !important;
      outline:2px solid #ff8a1f88 !important;outline-offset:3px;animation:cos-spin 6s linear infinite,cos-p-hwp 1.8s ease-in-out infinite alternate}
    @keyframes cos-p-hwp{from{box-shadow:0 0 10px #ff6a0066}to{box-shadow:0 0 26px #ff8a1fcc,0 0 4px #ffd9a8}}
    .cos-f_hw_ghost{background:linear-gradient(var(--bg-elev-3),var(--bg-elev-3)) padding-box,
        conic-gradient(from var(--cos-a),#ffffff,#d6c8ff 20%,#8b7fc4 40%,#f4f0ff 55%,#c7b8ff 75%,#ffffff) border-box !important;
      outline:2px dashed #e9e1ffaa !important;outline-offset:4px;animation:cos-spin 12s linear infinite,cos-p-hwg 3s ease-in-out infinite alternate}
    @keyframes cos-p-hwg{from{box-shadow:0 0 8px #c7b8ff44;opacity:.88}to{box-shadow:0 0 26px #e9e1ffcc,0 0 3px #fff;opacity:1}}
    .cos-e_hw_fog,.cos-e_hw_bats,.cos-e_hw_cobweb{position:relative}
    .cos-e_hw_fog::before,.cos-e_hw_bats::before,.cos-e_hw_cobweb::before,.cos-e_hw_cobweb::after{content:"";position:absolute;pointer-events:none}
    .cos-e_hw_fog{box-shadow:inset 0 -30px 50px -20px #c7b8ff33}
    .cos-e_hw_fog::before{inset:auto -20% -10% -20%;height:70%;z-index:2;filter:blur(12px);
      background:radial-gradient(45% 60% at 20% 80%,#e9e1ff88,transparent 70%),radial-gradient(40% 55% at 60% 90%,#d6c8ff77,transparent 70%),radial-gradient(45% 60% at 90% 80%,#e9e1ff88,transparent 70%);animation:cos-hwfog 9s ease-in-out infinite alternate}
    @keyframes cos-hwfog{from{transform:translateX(-8%)}to{transform:translateX(8%)}}
    .cos-e_hw_bats{box-shadow:inset 0 0 40px #9b5de533}
    .cos-e_hw_bats::before{inset:0;z-index:2;background:${BAT} 0 0/52px 35px repeat-x;opacity:.8;-webkit-mask-image:linear-gradient(180deg,#000 0 38%,transparent 60%);mask-image:linear-gradient(180deg,#000 0 38%,transparent 60%);animation:cos-hwbats 7s linear infinite}
    @keyframes cos-hwbats{to{background-position:104px 0}}
    .cos-e_hw_cobweb::before{top:0;left:0;width:84px;height:84px;z-index:2;background:${WEB} 0 0/100% 100% no-repeat;opacity:.75;transform-origin:0 0;animation:cos-hwsway 5s ease-in-out infinite alternate}
    .cos-e_hw_cobweb::after{top:0;right:0;width:84px;height:84px;z-index:2;background:${WEB} 0 0/100% 100% no-repeat;opacity:.75;transform:scaleX(-1);transform-origin:50% 0}
    @keyframes cos-hwsway{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
    .cos-t_hw_boo{background:linear-gradient(135deg,#ffb347,#ff6a00);color:#1a0b00;box-shadow:0 0 10px #ff8a1f88}
    .cos-t_hw_2026{background:linear-gradient(110deg,#ff8a1f,#9b5de5 45%,#ff8a1f 90%);background-size:220% 100%;color:#fff;box-shadow:0 0 14px #9b5de5aa,0 0 4px #ff8a1f;animation:cos-hwshine 3.5s linear infinite}
    @keyframes cos-hwshine{to{background-position:220% 0}}
    @media (prefers-reduced-motion:reduce){.cos-t_hw_2026{animation:none !important}}`;
    document.head.appendChild(css);
  })();
} catch (err) { console.error('[halloween-cos]', err); }

// >>>>>>>>>> BEGIN Evento Trick or Treat (se puede borrar entero cuando termine el canje) >>>>>>>>>>
// ======================================================================
// Evento Trick or Treat 2026  (antes: halloween.js)
// ======================================================================
// Vivet Client - renderer/halloween.js
// (Los estilos de los cosméticos viven en halloween-cos.js, que NO se borra. Este archivo SÍ se puede borrar entero
//  cuando termine el canje: panel, calendario y tema.)
// Evento "Trick or Treat 2026": calendario de 31 días, dulces y canje. Habla con server/halloween.js.
// Se carga DESPUÉS de app.js, chat.js, app2.js y clans.js (usa window.vivetApi, window.vivetShop,
// escapeHtml, showToast y window.vivetLang). Como la Tienda, se traduce acá adentro con T().
try {
  (() => {
    const $ = (s) => document.querySelector(s);
    const root = $('#hw-root');
    const panel = $('#panel-halloween');
    if (!root || !panel) return;
    const api = () => window.vivetApi;
    const loggedIn = () => !!(api() && api().loggedIn());
    const req = (m, p, b) => api().request(m, p, b);
    const esc = (s) => escapeHtml(String(s ?? ''));
    const toast = (m, k) => { try { showToast(m, k); } catch (_) {} };
    const en = () => !!(window.vivetLang && window.vivetLang() === 'en');
    panel.setAttribute('data-i18n-skip', '');

    // ------------------------------------------------------------ traducciones
    const EN = {
      'Trick or Treat': 'Trick or Treat',
      'Calendario de 31 días, dulces y recompensas de Halloween. Canjeá dulces por cosméticos, mascotas y Vcoins.':
        '31-day calendar, candy and Halloween rewards. Trade candy for cosmetics, pets and Vcoins.',
      'Conectá tu Discord en Social para participar del evento.': 'Connect your Discord in Social to join the event.',
      'El evento no está configurado en este cliente.': 'The event is not configured in this client.',
      'No se pudo cargar el evento': 'Could not load the event',
      'Dulces': 'Candy', 'Calendario': 'Calendar', 'Canje': 'Redeem', 'Cómo ganar': 'How to earn',
      'Todo': 'All', 'Marcos': 'Frames', 'Efectos': 'Effects', 'Textos': 'Titles', 'Mascotas': 'Pets', 'Vcoins': 'Vcoins',
      'Termina en {t}': 'Ends in {t}', 'El calendario terminó': 'The calendar has ended', 'Empieza pronto': 'Starting soon',
      'Canje abierto {t} más': 'Redeem open for {t} more', 'El canje cerró': 'Redeeming has closed',
      'Día {n}': 'Day {n}', 'Hoy': 'Today', 'Reclamar': 'Claim', 'Recuperar': 'Recover', 'Reclamado': 'Claimed', 'Se abre más adelante': 'Opens later', 'Perdido': 'Missed',
      'Recuperar un día pasado da la mitad de dulces (los premios se conservan).': 'Recovering a past day gives half the candy (prizes are kept).',
      '+{n} dulces': '+{n} candy', '+{n} Vcoins': '+{n} Vcoins',
      'Truco o trato': 'Trick or treat', 'Una tirada gratis por día. ¿Truco o trato?': 'One free roll per day. Trick or treat?',
      'Probar suerte': 'Try your luck', 'Ya probaste hoy': 'Already rolled today',
      '¡JACKPOT! +{n} dulces': 'JACKPOT! +{n} candy', '¡Trato! +{n} dulces': 'Treat! +{n} candy', '¡Truco! Solo +{n} dulce': 'Trick! Just +{n} candy',
      'Etiqueta limitada': 'Limited tag', 'Edición limitada': 'Limited edition',
      'Reclamá {n} de los 31 días y te llevás la etiqueta «{t}». Llevás {c}.': 'Claim {n} of the 31 days to get the «{t}» tag. You have {c}.',
      'Canjear': 'Redeem', 'Tuyo': 'Yours', 'Canjeado': 'Redeemed', 'Límite alcanzado': 'Limit reached', 'Te faltan dulces': 'Not enough candy', '{a}/{b} canjeados': '{a}/{b} redeemed',
      'Se canjeó {n}. Ya podés ponértelo desde la Tienda o Social > Mi perfil.': '{n} redeemed. Equip it from the Shop or Social > My profile.',
      '¡Canjeado! Ya lo tenés.': 'Redeemed! It is yours.', '¡Listo! Vcoins sumados.': 'Done! Vcoins added.',
      '+{n}% XP': '+{n}% XP', 'Pronto: una parte de tu premio se entrega al conectar la tienda.': 'Soon: part of your prize is delivered once the shop is connected.',
      'Jugando en una sala ganás 1 dulce cada {m} min (máx. {c} por día). Hoy: {t}/{c}.': 'Playing in a room earns 1 candy every {m} min (max {c} per day). Today: {t}/{c}.',
      'Dulces de hoy': 'Today\'s candy',
      'Reclamá cada día del calendario (6 dulces; los días especiales traen Vcoins y cosméticos).': 'Claim every calendar day (6 candy; special days bring Vcoins and cosmetics).',
      'Jugá en salas: 1 dulce cada 10 min, hasta 15 por día.': 'Play in rooms: 1 candy every 10 min, up to 15 per day.',
      'Probá tu suerte con «Truco o trato» una vez por día.': 'Try your luck with "Trick or treat" once a day.',
      'Tema Halloween': 'Halloween theme', 'Naranja y violeta, telarañas y letras de colores. Se quita solo el 31 de octubre.': 'Orange and purple, cobwebs and colored text. It turns off by itself on October 31.',
      'Activar': 'Turn on', 'Desactivar': 'Turn off',
      'Tenés premios pendientes de entrega: llegan solos apenas la tienda esté conectada.': 'You have prizes waiting: they arrive automatically once the shop is connected.',
      'Cargando…': 'Loading…', 'Premios de hoy': 'Today\'s prizes', 'Premios del calendario': 'Calendar prizes',
      'Tu nombre': 'Your name', 'Calabaza': 'Pumpkin', 'Fantasma': 'Ghost', 'Niebla': 'Fog', 'Murciélagos': 'Bats', 'Telarañas': 'Cobwebs',
    };
    const ITEM_EN = {
      f_hw_pumpkin: ['Pumpkin', 'Orange ring of a lit jack-o\'-lantern.'], f_hw_ghost: ['Ghost', 'A pale ring that floats and breathes.'],
      e_hw_fog: ['Fog', 'Spectral fog over your profile.'], e_hw_bats: ['Bats', 'A flock flies across your profile.'], e_hw_cobweb: ['Cobwebs', 'Cobwebs in the corners of your profile.'],
      t_hw_boo: ['BOO!', 'To scare your rivals.'], t_hw_2026: ["Trick or Treat 2026", 'Limited-edition tag: only available in the event.'],
      p_hw_pumpkin: ['Pumpkin', 'A carved pumpkin that follows you.'], p_hw_ghost: ['Little ghost', 'Shy, walks through walls.'], p_hw_spider: ['Spider', 'Weaves webs on your profile.'],
      p_hw_bat: ['Vampire bat', 'Sleeps by day, plays by night.'], p_hw_bones: ['Bones', 'A skeleton that never gets tired.'],
      c_hw_100: ['100 Vcoins', 'Up to 3 times.'], c_hw_500: ['500 Vcoins', 'Up to 2 times.'], c_hw_1500: ['1500 Vcoins', 'Only once.'],
    };
    const T = (k, v) => {
      let s = (en() && EN[k]) || k;
      if (v) s = s.replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ''));
      return s;
    };
    const nm = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][0] : i.name);
    const ds = (i) => (en() && ITEM_EN[i.id] ? ITEM_EN[i.id][1] : i.desc);

    // ------------------------------------------------------------ estilos (interfaz + cosméticos del evento)
    const WEB = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' fill='none' stroke='%23e5e7eb' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M0 0L90 0M0 0L85 30M0 0L60 60M0 0L30 85M0 0L0 90M25 0Q20 20 0 25M50 0Q40 40 0 50M75 0Q60 60 0 75'/%3E%3C/svg%3E\")";
    const css = document.createElement('style');
    css.textContent = `
    /* ===== Panel del evento ===== */
    #panel-halloween{--hw-o:#ff8a1f;--hw-p:#9b5de5;--hw-g:#3ddc84}
    .hw-nav-ic{display:inline-block;width:18px;text-align:center;flex-shrink:0;animation:hw-bob 2.4s ease-in-out infinite}
    @keyframes hw-bob{50%{transform:translateY(-2px) rotate(-8deg)}}
    .hw-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin:14px 32px 0;padding:22px 24px;border-radius:18px;
      background:radial-gradient(120% 140% at 85% -20%,#ff8a1f55,transparent 60%),radial-gradient(90% 120% at 0% 120%,#9b5de555,transparent 60%),linear-gradient(135deg,#1b1026,#0f0a16);
      border:1px solid #ff8a1f66;color:#fff4e6}
    .hw-hero::before{content:"";position:absolute;right:28px;top:-34px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff7d6,#ffd58a 55%,#ffb347);box-shadow:0 0 60px #ffb34788;opacity:.9}
    .hw-bat{position:absolute;font-size:18px;opacity:.75;animation:hw-fly 9s linear infinite;pointer-events:none}
    .hw-bat:nth-of-type(1){top:16px;left:-30px}.hw-bat:nth-of-type(2){top:52px;left:-30px;animation-delay:-3.5s;animation-duration:12s;font-size:14px}
    .hw-bat:nth-of-type(3){top:84px;left:-30px;animation-delay:-6s;animation-duration:10s;font-size:12px}
    @keyframes hw-fly{to{transform:translateX(900px) translateY(-14px)}}
    .hw-hero h3{margin:0;font-size:24px;font-weight:800;color:#ffb866;text-shadow:0 0 18px #ff8a1f88}
    .hw-hero p{margin:4px 0 0;font-size:12.5px;opacity:.8}
    .hw-hero-body{position:relative;flex:1;min-width:220px}
    .hw-count{display:inline-block;margin-top:8px;font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:99px;background:#ff8a1f33;color:#ffb866}
    .hw-candy{position:relative;text-align:center;padding:10px 18px;border-radius:14px;background:#00000055;border:1px solid #ff8a1f77}
    .hw-candy b{display:block;font-size:34px;line-height:1;color:#ffb866}
    .hw-candy small{font-size:11px;font-weight:700;opacity:.75;letter-spacing:.06em;text-transform:uppercase}
    .hw-theme{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:14px 32px 0}
    .hw-theme .hint{flex:1;min-width:200px;margin:0}
    .hw-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin:14px 32px 0}
    @media (max-width:900px){.hw-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    .hw-day{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 6px;border-radius:12px;border:1px solid var(--border);
      background:var(--bg-elev);color:inherit;font:inherit;cursor:default;text-align:center;min-height:92px}
    .hw-dn{font-size:11px;font-weight:800;opacity:.6}
    .hw-ic{font-size:24px;line-height:1.1}
    .hw-rw{font-size:11px;font-weight:700;color:var(--hw-o)}
    .hw-rw small{display:block;opacity:.8;font-weight:600;color:inherit}
    .hw-day.big{border-color:#9b5de588;background:linear-gradient(160deg,#9b5de522,var(--bg-elev))}
    .hw-day.big .hw-dn::after{content:" ★";color:#ffc12b}
    .hw-day.claimed{opacity:.55}
    .hw-day.claimed::after{content:"✓";position:absolute;top:5px;right:7px;font-weight:800;color:var(--hw-g)}
    .hw-day.today,.hw-day.late{cursor:pointer;border-color:var(--hw-o)}
    .hw-day.today{box-shadow:0 0 0 1px var(--hw-o),0 0 20px #ff8a1f66;animation:hw-pulse 1.8s ease-in-out infinite alternate}
    @keyframes hw-pulse{to{box-shadow:0 0 0 1px var(--hw-o),0 0 32px #ff8a1faa}}
    .hw-day.today:hover,.hw-day.late:hover{background:#ff8a1f22}
    .hw-day.locked{opacity:.4;filter:grayscale(.6)}
    .hw-day.missed{opacity:.3}
    .hw-act{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--hw-o);color:#1a0b00}
    .hw-roll{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:14px 32px 0}
    .hw-roll-res{font-weight:800;color:var(--hw-o);animation:hw-pop .5s cubic-bezier(.2,1.6,.4,1)}
    @keyframes hw-pop{from{transform:scale(.4);opacity:0}}
    .hw-limited{margin:14px 32px 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
    .hw-lim-badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:99px;background:linear-gradient(135deg,#ff8a1f,#9b5de5);color:#fff;margin-left:6px}
    .hw-chips{display:flex;gap:6px;flex-wrap:wrap;margin:14px 32px 0}
    .hw-chip{padding:5px 12px;border-radius:99px;border:1px solid var(--border);background:var(--bg-elev);color:inherit;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
    .hw-chip.on{border-color:var(--hw-o);color:var(--hw-o);background:#ff8a1f1c}
    .hw-big{font-size:42px}
    .hw-price{font-weight:800;color:var(--hw-o)}
    .hw-card.limited{border-color:#9b5de5;box-shadow:0 0 18px #9b5de533}
    .hw-list{margin:8px 0 0 18px;padding:0;font-size:13px;line-height:1.7}
    @media (prefers-reduced-motion:reduce){.hw-bat,.hw-day.today,.hw-nav-ic{animation:none !important}}
`;
    document.head.appendChild(css);

    // ============================================================ TEMA HALLOWEEN  (BORRAR EL 31)
    // Todo lo "decorativo" vive en este bloque. Se apaga solo el 1 nov 00:00 (hora de Colombia) y, si quieren
    // borrarlo del código, basta con eliminar desde acá hasta "FIN TEMA" y dejar `const THEME = null;`.
    // NO toca los cosméticos ni las mascotas del evento: esos estilos (.cos-*) están en halloween-cos.js y se quedan para siempre.
    const THEME_END = Date.UTC(2026, 10, 1) + 5 * 3600000;
    const THEME = Date.now() < THEME_END ? (() => {
      const css = document.createElement('style');
      css.id = 'hw-theme-css';
      css.textContent = `
      :root[data-hw="1"]{--accent:#ff8a1f;--accent-2:#ff6a00;--accent-soft:rgba(255,138,31,.16);--accent-border:rgba(255,138,31,.45);--hw-o:#ff8a1f;--hw-p:#9b5de5}
      :root[data-hw="1"][data-theme="dark"]{--bg:#09050d;--bg-elev:#120b17;--bg-elev-2:#181020;--bg-elev-3:#20142b;--border:#2e1d3d;
        --text:#fff1e0;--text-dim:#cdb6df;--text-faint:#8d72a6}
      :root[data-hw="1"][data-theme="light"]{--accent:#d9680a;--accent-2:#b85400;--accent-soft:rgba(217,104,10,.12);--accent-border:rgba(217,104,10,.4)}
      /* letras de colores */
      :root[data-hw="1"] .nav-group{color:#b985f5;letter-spacing:.09em;text-transform:uppercase;text-shadow:0 0 10px #9b5de566}
      :root[data-hw="1"] .nav-btn.active{color:#ffb866}
      :root[data-hw="1"] .panel-header h2{background:linear-gradient(90deg,#ffb866,#ff8a1f 45%,#b985f5);-webkit-background-clip:text;background-clip:text;color:transparent}
      :root[data-hw="1"] .shop-name,:root[data-hw="1"] .shop-sec{color:#ffc27a}
      :root[data-hw="1"][data-theme="light"] .shop-name,:root[data-hw="1"][data-theme="light"] .shop-sec{color:#b85400}
      :root[data-hw="1"] .ui-tab.active{color:#ffb866}
      :root[data-hw="1"] .card{border-color:#9b5de52e}
      :root[data-hw="1"] .card:hover{border-color:#ff8a1f66}
      :root[data-hw="1"][data-theme="dark"] .sidebar{background:linear-gradient(180deg,#1a0f24,#0d0712 70%)}
      /* telarañas en las esquinas */
      :root[data-hw="1"] .sidebar,:root[data-hw="1"] .panel-header{position:relative}
      :root[data-hw="1"] .sidebar::after,:root[data-hw="1"] .panel-header::after{content:"";position:absolute;top:0;width:120px;height:120px;pointer-events:none;opacity:.32;background:${WEB} 0 0/100% 100% no-repeat}
      :root[data-hw="1"] .sidebar::after{left:0;width:100px;height:100px}
      :root[data-hw="1"] .panel-header::after{right:0;transform:scaleX(-1)}
      /* decoración fija: niebla abajo + araña colgando (la crea el JS al activar el tema) */
      #hw-deco{position:fixed;inset:0;pointer-events:none;z-index:3;overflow:hidden}
      #hw-deco .hw-fog{position:absolute;left:-10%;right:-10%;bottom:-30px;height:110px;filter:blur(14px);opacity:.55;
        background:radial-gradient(45% 70% at 15% 100%,#9b5de555,transparent 70%),radial-gradient(40% 60% at 55% 110%,#ff8a1f33,transparent 70%),radial-gradient(45% 70% at 90% 100%,#9b5de555,transparent 70%);animation:cos-hwfog 11s ease-in-out infinite alternate}
      #hw-deco .hw-spider{position:absolute;top:0;right:170px;width:2px;height:70px;background:linear-gradient(#e5e7eb99,#e5e7eb33);transform-origin:50% 0;animation:hw-swing 4.5s ease-in-out infinite alternate}
      #hw-deco .hw-spider span{position:absolute;left:50%;bottom:-14px;transform:translateX(-50%);font-size:18px;line-height:1}
      @keyframes hw-swing{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
      @media (prefers-reduced-motion:reduce){#hw-deco .hw-fog,#hw-deco .hw-spider{animation:none !important}}
      html.perf-mode #hw-deco{display:none}`;
      document.head.appendChild(css);
      const KEY = 'vivet_hw_theme';
      const deco = (on) => {
        let el = document.getElementById('hw-deco');
        if (on && !el) { el = document.createElement('div'); el.id = 'hw-deco'; el.innerHTML = '<div class="hw-fog"></div><div class="hw-spider"><span>🕷️</span></div>'; document.body.appendChild(el); }
        else if (!on && el) el.remove();
      };
      const on = () => document.documentElement.getAttribute('data-hw') === '1';
      const set = (v) => {
        if (v) document.documentElement.setAttribute('data-hw', '1'); else document.documentElement.removeAttribute('data-hw');
        deco(v);
        try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {}
      };
      // Si la persona nunca eligió, arranca encendido durante el evento.
      let saved = null; try { saved = localStorage.getItem(KEY); } catch (_) {}
      set(saved !== '0');
      // Se apaga solo al llegar la fecha aunque la app siga abierta.
      setTimeout(() => THEME_KILL(), Math.min(2147483000, THEME_END - Date.now()));
      return { on, set };
    })() : null;
    function THEME_KILL() {
      document.documentElement.removeAttribute('data-hw');
      const d = document.getElementById('hw-deco'); if (d) d.remove();
      const c = document.getElementById('hw-theme-css'); if (c) c.remove();
      try { localStorage.removeItem('vivet_hw_theme'); } catch (_) {}
    }
    if (!THEME) THEME_KILL(); // fecha pasada: limpia restos guardados
    // ============================================================ FIN TEMA

    // ------------------------------------------------------------ estado
    const S = { d: null, tab: 'cal', filter: 'all', busy: false, roll: null, err: '' };
    const badge = $('#hw-badge');
    const left = (ms) => {
      const m = Math.max(0, Math.floor(ms / 60000));
      const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
      return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`;
    };
    const CAT_ICON = { frame: '🖼️', effect: '✨', title: '🏷️', pet: '🐾', coins: '🪙' };
    const claimable = () => {
      const d = S.d; if (!d || !d.event.active) return 0;
      return d.calendar.filter((c) => c.day <= d.event.day && !c.claimed).length;
    };
    function setBadge() {
      if (!badge) return;
      const n = loggedIn() ? claimable() : 0;
      badge.hidden = !n; badge.textContent = String(n);
    }
    const themeOn = () => !!THEME && THEME.on();

    function paintHead() {
      const hd = panel.querySelector('.panel-header');
      if (hd) {
        hd.setAttribute('data-i18n-skip', '');
        const h2 = hd.querySelector('h2'), hint = hd.querySelector('.hint');
        if (h2) h2.textContent = T('Trick or Treat');
        if (hint) hint.textContent = T('Calendario de 31 días, dulces y recompensas de Halloween. Canjeá dulces por cosméticos, mascotas y Vcoins.');
      }
      const nav = document.querySelector('.nav-btn[data-panel="panel-halloween"]');
      if (nav) { nav.setAttribute('data-i18n-skip', ''); const lb = nav.querySelector('.hw-nav-label'); if (lb) lb.textContent = en() ? 'Event' : 'Evento'; }
    }

    async function load(silent) {
      if (!api() || !api().configured || !loggedIn()) { S.d = null; setBadge(); render(); return; }
      try { S.d = await req('GET', '/halloween'); S.err = ''; }
      catch (e) { S.err = (e && e.message) || ''; if (!silent) toast(T(S.err || 'No se pudo cargar el evento')); }
      setBadge(); render();
    }
    const take = (r) => { if (r && r.state) S.d = r.state; };

    // ------------------------------------------------------------ vistas
    function previewHtml(i) {
      const me = api() && api().me && api().me();
      if (i.cat === 'frame') return `<img class="shop-av cos-${i.id}" alt="" src="${esc((me && me.avatar_url) || '')}" onerror="this.removeAttribute('src')" />`;
      if (i.cat === 'effect') return `<div class="shop-fx cos-${i.id}"><div class="fx-banner"></div><div class="fx-name">${esc(T('Tu nombre'))}</div></div>`;
      if (i.cat === 'title') return `<span class="cos-title cos-${i.id}">${esc(i.text || nm(i))}</span>`;
      if (i.cat === 'pet') return `<span class="shop-pet cos-pet">${esc(i.emoji || '❔')}</span>`;
      return `<span class="hw-big">🪙</span>`;
    }
    function heroHtml() {
      const d = S.d, ev = d.event;
      const when = ev.now < ev.start ? T('Empieza pronto')
        : ev.active ? T('Termina en {t}', { t: left(ev.end - ev.now) })
        : ev.shop_open ? T('El calendario terminó') + ' · ' + T('Canje abierto {t} más', { t: left(ev.shop_end - ev.now) })
        : T('El canje cerró');
      return `<div class="hw-hero"><span class="hw-bat">🦇</span><span class="hw-bat">🦇</span><span class="hw-bat">🦇</span>` +
        `<div class="hw-hero-body"><h3>${esc(T('Trick or Treat'))} 2026</h3><p>🎃 👻 🕷️ 🦇 💀</p><span class="hw-count">${esc(when)}</span></div>` +
        `<div class="hw-candy"><b>${d.candy}</b><small>🍬 ${esc(T('Dulces'))}</small></div></div>`;
    }
    function themeHtml() {
      if (!THEME) return '';
      return `<div class="card hw-theme"><div><div class="shop-name">${esc(T('Tema Halloween'))}</div><p class="hint">${esc(T('Naranja y violeta, telarañas y letras de colores. Se quita solo el 31 de octubre.'))}</p></div>` +
        `<button class="ghost-btn" type="button" data-act="theme">${esc(T(themeOn() ? 'Desactivar' : 'Activar'))}</button></div>`;
    }
    function tabsHtml() {
      const ready = claimable();
      return `<div class="ui-tabs" role="tablist">${[['cal', 'Calendario'], ['shop', 'Canje'], ['how', 'Cómo ganar']].map(([c, l]) =>
        `<button type="button" class="ui-tab${c === S.tab ? ' active' : ''}" data-act="tab" data-tab="${c}">${esc(T(l))}${c === 'cal' && ready ? ' •' : ''}</button>`).join('')}</div>`;
    }
    function rollHtml() {
      const r = S.d.roll;
      const res = S.roll ? `<span class="hw-roll-res">${S.roll.kind === 'jackpot' ? '🎰 ' : S.roll.kind === 'treat' ? '🍬 ' : '🕸️ '}${esc(T(S.roll.kind === 'jackpot' ? '¡JACKPOT! +{n} dulces' : S.roll.kind === 'treat' ? '¡Trato! +{n} dulces' : '¡Truco! Solo +{n} dulce', { n: S.roll.candy }))}</span>` : '';
      return `<div class="card hw-roll"><div style="flex:1;min-width:200px"><div class="shop-name">🎲 ${esc(T('Truco o trato'))}</div><div class="shop-desc">${esc(T('Una tirada gratis por día. ¿Truco o trato?'))}</div></div>` +
        `${res}<button class="primary-btn" type="button" data-act="roll"${r.available ? '' : ' disabled'}>${esc(T(r.available ? 'Probar suerte' : 'Ya probaste hoy'))}</button></div>`;
    }
    function limitedHtml() {
      const d = S.d, l = d.limited; if (!l) return '';
      const owned = d.calendar.length && d.claimed >= d.limited_needs;
      return `<div class="card hw-limited"><span class="cos-title cos-${esc(l.id)}">${esc(l.text)}</span>` +
        `<div style="flex:1;min-width:220px"><div class="shop-name">${esc(T('Etiqueta limitada'))}<span class="hw-lim-badge">${esc(T('Edición limitada'))}</span></div>` +
        `<div class="shop-desc">${esc(T('Reclamá {n} de los 31 días y te llevás la etiqueta «{t}». Llevás {c}.', { n: d.limited_needs, t: l.text, c: d.claimed }))}</div>` +
        `<div class="shop-bar"><i style="width:${Math.min(100, Math.round((d.claimed / d.limited_needs) * 100))}%"></i></div></div>${owned ? '<span class="shop-tag">✓</span>' : ''}</div>`;
    }
    function dayHtml(c) {
      const d = S.d, ev = d.event;
      const state = c.claimed ? 'claimed' : !ev.active ? (ev.now < ev.start ? 'locked' : 'missed') : c.day === ev.day ? 'today' : c.day < ev.day ? 'late' : 'locked';
      const item = c.item ? (d.catalog.find((x) => x.id === c.item) || { cat: 'frame', id: c.item }) : null;
      const ic = item ? (item.emoji || CAT_ICON[item.cat] || '🎁') : c.coins ? '🪙' : '🍬';
      const big = !!(c.item || c.coins || c.day === 31);
      const lines = `+${state === 'late' ? Math.ceil(c.candy / 2) : c.candy} 🍬` + (c.coins ? `<small>${esc(T('+{n} Vcoins', { n: c.coins }))}</small>` : '') + (item ? `<small>${esc(item.name ? nm(item) : '')}</small>` : '');
      const act = state === 'today' ? `<span class="hw-act">${esc(T('Reclamar'))}</span>` : state === 'late' ? `<span class="hw-act">${esc(T('Recuperar'))}</span>` : '';
      const tag = state === 'today' || state === 'late' ? 'button' : 'div';
      return `<${tag} class="hw-day ${state}${big ? ' big' : ''}"${tag === 'button' ? ` type="button" data-act="claim" data-day="${c.day}"` : ''} title="${esc(T('Día {n}', { n: c.day }))}">` +
        `<span class="hw-dn">${esc(state === 'today' ? T('Hoy') + ' · ' + c.day : String(c.day))}</span><span class="hw-ic">${ic}</span><span class="hw-rw">${lines}</span>${act}</${tag}>`;
    }
    function calHtml() {
      const d = S.d;
      return rollHtml() + limitedHtml() + `<div class="shop-sec">${esc(T('Calendario'))}<small>${esc(T('Recuperar un día pasado da la mitad de dulces (los premios se conservan).'))}</small></div>` +
        `<div class="hw-grid">${d.calendar.map(dayHtml).join('')}</div>`;
    }
    function cardHtml(i) {
      const d = S.d, max = i.max || (i.kind === 'item' ? 1 : 0);
      const done = max && i.bought >= max;
      const lim = !!i.text && i.id === (d.limited && d.limited.id);
      const extra = i.cat === 'pet' && i.xp ? `<div class="shop-petxp">${esc(T('+{n}% XP', { n: Math.round((i.xp - 1) * 100) }))}</div>` : '';
      const prog = i.kind !== 'item' && max > 1 ? `<div class="shop-petlvl">${esc(T('{a}/{b} canjeados', { a: i.bought, b: max }))}</div>` : '';
      const off = !d.event.shop_open;
      const foot = done ? `<span class="shop-tag">${esc(T(i.kind === 'item' ? 'Tuyo' : 'Canjeado'))}</span>`
        : `<span class="hw-price">${i.price} 🍬</span><button class="primary-btn" type="button" data-act="buy" data-id="${esc(i.id)}"${d.candy < i.price || off ? ` disabled title="${esc(T('Te faltan dulces'))}"` : ''}>${esc(T('Canjear'))}</button>`;
      return `<div class="shop-card hw-card${lim ? ' limited' : ''}"><div class="shop-prev">${previewHtml(i)}</div>` +
        `<div class="shop-name">${esc(nm(i))}</div><div class="shop-desc">${esc(ds(i))}</div>${extra}${prog}<div class="shop-foot">${foot}</div></div>`;
    }
    function shopHtml() {
      const F = [['all', 'Todo'], ['frame', 'Marcos'], ['effect', 'Efectos'], ['title', 'Textos'], ['pet', 'Mascotas'], ['coins', 'Vcoins']];
      const items = S.d.catalog.filter((i) => i.kind !== 'room' && (S.filter === 'all' || i.cat === S.filter));
      return `<div class="hw-chips">${F.map(([c, l]) => `<button type="button" class="hw-chip${c === S.filter ? ' on' : ''}" data-act="filter" data-f="${c}">${esc(T(l))}</button>`).join('')}</div>` +
        `<div class="shop-grid">${items.map(cardHtml).join('')}</div>`;
    }
    function howHtml() {
      const e = S.d.earn;
      return `<div class="card" style="margin:14px 32px 0"><div class="shop-name">🍬 ${esc(T('Cómo ganar'))}</div><ul class="hw-list">` +
        [T('Reclamá cada día del calendario (6 dulces; los días especiales traen Vcoins y cosméticos).'),
          T('Jugá en salas: 1 dulce cada 10 min, hasta 15 por día.'),
          T('Probá tu suerte con «Truco o trato» una vez por día.')].map((x) => `<li>${esc(x)}</li>`).join('') + `</ul>` +
        `<p class="hint">${esc(T('Jugando en una sala ganás 1 dulce cada {m} min (máx. {c} por día). Hoy: {t}/{c}.', { m: Math.round(e.per_candy_seconds / 60), c: e.daily_cap, t: e.today }))}</p></div>`;
    }
    function render() {
      paintHead();
      if (!api() || !api().configured) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('El evento no está configurado en este cliente.'))}</p></div>`; return; }
      if (!loggedIn()) { root.innerHTML = `<div class="card"><p class="hint">${esc(T('Conectá tu Discord en Social para participar del evento.'))}</p></div>`; return; }
      if (!S.d) { root.innerHTML = `<div class="card"><p class="hint">${esc(S.err ? T(S.err) : T('Cargando…'))}</p></div>`; return; }
      const body = S.tab === 'shop' ? shopHtml() : S.tab === 'how' ? howHtml() : calHtml();
      const pend = S.d.pending ? `<p class="hint shop-earn">${esc(T('Tenés premios pendientes de entrega: llegan solos apenas la tienda esté conectada.'))}</p>` : '';
      root.innerHTML = heroHtml() + themeHtml() + tabsHtml() + body + pend;
    }

    // ------------------------------------------------------------ acciones
    async function doAct(act, t) {
      if (act === 'claim') {
        const r = await req('POST', '/halloween/claim', { day: Number(t.dataset.day) }); take(r);
        const g = r.got || {};
        toast('🎃 ' + [g.candy ? T('+{n} dulces', { n: g.candy }) : '', g.coins ? T('+{n} Vcoins', { n: g.coins }) : ''].filter(Boolean).join(' · '), 'ok');
        if (g.items && g.items.length) { toast('🎁 ' + g.items.map((id) => { const it = S.d.catalog.find((x) => x.id === id); return it ? nm(it) : id; }).join(', '), 'ok'); if (window.vivetShop) window.vivetShop.reload(); }
        if (g.coins && window.vivetShop) window.vivetShop.reload();
      } else if (act === 'roll') {
        const r = await req('POST', '/halloween/roll'); take(r); S.roll = r.result;
      } else if (act === 'buy') {
        const r = await req('POST', '/halloween/buy', { item_id: t.dataset.id }); take(r);
        const it = S.d.catalog.find((x) => x.id === t.dataset.id);
        toast(T(it && it.kind === 'coins' ? '¡Listo! Vcoins sumados.' : '¡Canjeado! Ya lo tenés.'), 'ok');
        if (window.vivetShop) window.vivetShop.reload();
      }
    }
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || S.busy) return;
      const act = t.dataset.act;
      if (act === 'tab') { S.tab = t.dataset.tab; render(); return; }
      if (act === 'filter') { S.filter = t.dataset.f; render(); return; }
      if (act === 'theme') { if (THEME) THEME.set(!THEME.on()); render(); return; }
      S.busy = true; t.disabled = true;
      try { await doAct(act, t); } catch (err) { toast(T((err && err.message) || 'No se pudo completar la acción')); }
      S.busy = false; setBadge(); render();
    });

    // ------------------------------------------------------------ ciclo de vida
    const nav = document.querySelector('.nav-btn[data-panel="panel-halloween"]');
    nav && nav.addEventListener('click', () => load(false));
    window.addEventListener('vivet-session-changed', () => load(true));
    window.addEventListener('vivet-lang-changed', render);
    setInterval(() => { if (!document.hidden && loggedIn()) load(true); }, 5 * 60 * 1000); // dulces por jugar
    setInterval(() => { if (!document.hidden && !S.busy && root.offsetParent !== null && S.d) render(); }, 60 * 1000); // cuentas regresivas
    window.vivetHalloween = { reload: () => load(true) };
    paintHead(); render(); load(true);
  })();
} catch (err) { console.error('[halloween]', err); }
// <<<<<<<<<< END Evento Trick or Treat <<<<<<<<<<


// ======================================================================
// Panel Social a la derecha: amigos conectados/desconectados con botón para entrar a su sala,
// estado (En línea / Invisible) y código en el pie. Plegable. Se oculta mientras jugás.
// Va al FINAL y fuera de los carteles BEGIN/END del evento: sobrevive cuando se borra Halloween.
// ======================================================================
try {
(() => {
  // Panel Social a la derecha: lista de amigos (conectados / desconectados) con botón para entrar a su sala,
  // y en el pie tu estado (En línea / Invisible) y tu código. Plegable. Se oculta solo mientras jugás.
  // Usa lo que ya expone app.js: window.vivetApi (sesión + pedidos), joinByUrl / joinByName y los
  // controles de Social (#fr-invisible, #fr-copy-code, #fr-login-btn), así que no duplica lógica.
  const root = document.getElementById('app-root');
  if (!root || document.querySelector('.sdock')) return;

  const ROOM_CODE = /^[A-Za-z0-9_-]{6,64}$/;
  const $ = (s) => document.querySelector(s);
  const T = (s) => (typeof window.t === 'function' ? window.t(s) : s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = () => window.vivetApi;
  const logged = () => !!(api() && api().loggedIn());
  const initialAvatar = (name) => {
    const ch = (String(name || '?').trim().charAt(0) || '?').toUpperCase().replace(/[<>&"']/g, '?');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1a2230"/><text x="32" y="43" font-family="Arial,sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#93a5b8">${ch}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  // ---------------------------------------------------------------- CSS
  const style = document.createElement('style');
  style.textContent = `
  .sdock { position: relative; z-index: 3; flex-shrink: 0; width: 248px; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg-elev); border-left: 1px solid var(--border); transition: width .2s ease; }
  .app.playing .sdock { display: none; }
  .sd-head { display: flex; align-items: center; gap: 2px; padding: 14px 8px 12px 16px; border-bottom: 1px solid var(--border); }
  .sd-title { flex: 1; font-size: 14px; font-weight: 700; }
  .sd-ico { all: unset; box-sizing: border-box; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 8px;
    cursor: pointer; color: var(--text-dim); font-size: 18px; line-height: 1; }
  .sd-ico:hover:not([disabled]) { background: var(--accent-soft); color: var(--text); }
  .sd-ico[disabled] { opacity: .4; cursor: default; }
  .sd-ico:focus-visible, .sd-join:focus-visible, .sd-status:focus-visible, .sd-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .sd-fold svg { transition: transform .2s ease; }
  .sd-count { display: none; min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box; border-radius: 10px; background: #3ddc84; color: #04141a;
    font-size: 11px; font-weight: 800; line-height: 20px; text-align: center; }
  .sd-list { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px 8px; }
  .sd-sec { padding: 12px 8px 6px; font-size: 12px; font-weight: 600; color: var(--text-dim); }
  .sd-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 9px; }
  .sd-row:hover { background: var(--accent-soft); }
  .sd-row.off { opacity: .55; }
  .sd-av { position: relative; width: 34px; height: 34px; flex-shrink: 0; }
  .sd-av img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: var(--bg-elev-2); display: block; }
  .sd-st { position: absolute; right: -2px; bottom: -2px; width: 11px; height: 11px; box-sizing: border-box; border-radius: 50%;
    border: 2px solid var(--bg-elev); background: var(--text-dim); }
  .sd-st.on { background: #3ddc84; }
  .sd-st.live { background: var(--accent); }
  .sd-info { flex: 1; min-width: 0; }
  .sd-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sd-sub { font-size: 11.5px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sd-sub.live { color: var(--accent); }
  .sd-join { all: unset; box-sizing: border-box; flex-shrink: 0; cursor: pointer; padding: 5px 10px; border-radius: 8px; background: var(--accent);
    color: #04141a; font-size: 11.5px; font-weight: 700; }
  .sd-join:hover { filter: brightness(1.1); }
  .sd-empty { padding: 14px 10px; font-size: 12.5px; line-height: 1.5; color: var(--text-dim); }
  .sd-empty .sd-join { display: inline-block; margin-top: 10px; font-size: 12.5px; padding: 7px 12px; }
  .sd-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 12px; border-top: 1px solid var(--border); }
  .sd-foot[hidden] { display: none; }
  .sd-status { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 7px; padding: 5px 8px; border-radius: 8px; cursor: pointer;
    font-size: 12.5px; font-weight: 600; }
  .sd-status:hover { background: var(--accent-soft); }
  .sd-status i { width: 9px; height: 9px; border-radius: 50%; background: #3ddc84; }
  .sd-status.inv i { background: var(--text-dim); }
  .sd-code { display: flex; flex-direction: column; align-items: flex-end; min-width: 0; }
  .sd-code small { font-size: 11px; color: var(--text-dim); }
  .sd-copy { all: unset; box-sizing: border-box; cursor: pointer; padding: 1px 4px; border-radius: 6px; font-size: 13px; font-weight: 800; letter-spacing: .3px; }
  .sd-copy:hover { background: var(--accent-soft); }

  .sdock.folded { width: 46px; }
  .sdock.folded .sd-title, .sdock.folded .sd-add, .sdock.folded .sd-list, .sdock.folded .sd-foot { display: none; }
  .sdock.folded .sd-head { flex-direction: column; gap: 10px; padding: 12px 0; border-bottom: 0; }
  .sdock.folded .sd-fold svg { transform: rotate(180deg); }
  .sdock.folded .sd-count.has { display: block; }
  @media (prefers-reduced-motion: reduce) { .sdock, .sd-fold svg { transition: none; } }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------- DOM
  const dock = document.createElement('aside');
  dock.className = 'sdock';
  dock.setAttribute('data-i18n-skip', ''); // los textos se traducen con T() y se redibujan al cambiar idioma
  dock.innerHTML = `
    <div class="sd-head">
      <span class="sd-title"></span>
      <button type="button" class="sd-ico sd-add" aria-label="Agregar amigo">+</button>
      <span class="sd-count" aria-hidden="true"></span>
      <button type="button" class="sd-ico sd-fold" aria-expanded="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>
    </div>
    <div class="sd-list"></div>
    <div class="sd-foot" hidden>
      <button type="button" class="sd-status"><i></i><span></span></button>
      <div class="sd-code"><small></small><button type="button" class="sd-copy"></button></div>
    </div>`;
  root.appendChild(dock);

  const el = {
    title: dock.querySelector('.sd-title'), add: dock.querySelector('.sd-add'), fold: dock.querySelector('.sd-fold'),
    count: dock.querySelector('.sd-count'), list: dock.querySelector('.sd-list'), foot: dock.querySelector('.sd-foot'),
    status: dock.querySelector('.sd-status'), statusTxt: dock.querySelector('.sd-status span'),
    codeLbl: dock.querySelector('.sd-code small'), copy: dock.querySelector('.sd-copy'),
  };

  // ---------------------------------------------------------------- datos
  let friends = [];
  let folded = false;

  async function load() {
    if (!logged()) { friends = []; render(); return; }
    try { friends = ((await api().request('GET', '/friends')) || {}).friends || []; } catch (_) { return; }
    render();
  }

  // ---------------------------------------------------------------- render
  function row(f) {
    const live = !!f.room, on = live || !!f.online;
    const name = f.haxball_nick || f.username;
    const sub = live ? `${T('Jugando en')} ${f.room.name || T('una sala')}` : on ? T('En línea') : T('Desconectado');
    const canJoin = live && (f.room.code || f.room.name);
    const btn = canJoin
      ? `<button type="button" class="sd-join" data-code="${esc(f.room.code || '')}" data-name="${esc(f.room.name || '')}">${T(f.room.code ? 'Unirme' : 'Buscar sala')}</button>` : '';
    return `<div class="sd-row${on ? '' : ' off'}" title="${esc(f.username)}">
      <div class="sd-av"><img alt="" referrerpolicy="no-referrer" src="${esc(f.avatar_url || initialAvatar(name))}" data-n="${esc(name)}" /><span class="sd-st${live ? ' live' : on ? ' on' : ''}"></span></div>
      <div class="sd-info"><div class="sd-name">${esc(name)}</div><div class="sd-sub${live ? ' live' : ''}">${esc(sub)}</div></div>${btn}</div>`;
  }

  function render() {
    const A = api();
    el.title.textContent = T('Social');
    el.fold.title = T(folded ? 'Mostrar panel' : 'Ocultar panel');
    el.fold.setAttribute('aria-expanded', String(!folded));
    el.add.title = T('Agregar amigo');
    el.add.disabled = !logged();

    if (!A || !A.configured) {
      el.list.innerHTML = `<p class="sd-empty">${esc(T('Social todavía no está configurado en este cliente.'))}</p>`;
      el.foot.hidden = true; el.count.classList.remove('has');
      return;
    }
    if (!logged()) {
      el.list.innerHTML = `<p class="sd-empty">${esc(T('Conectá tu Discord para ver a tus amigos acá.'))}<br><button type="button" class="sd-join" data-login>${esc(T('Conectar con Discord'))}</button></p>`;
      el.foot.hidden = true; el.count.classList.remove('has');
      return;
    }

    const rank = (f) => (f.room ? 0 : f.online ? 1 : 2);
    const sorted = friends.slice().sort((a, b) => rank(a) - rank(b) || String(a.username).localeCompare(String(b.username)));
    const on = sorted.filter((f) => f.room || f.online), off = sorted.filter((f) => !f.room && !f.online);
    let html = '';
    if (!sorted.length) html = `<p class="sd-empty">${esc(T('Todavía no tenés amigos agregados. Tocá + o compartí tu código.'))}</p>`;
    if (on.length) html += `<div class="sd-sec">${esc(T('Conectados'))} (${on.length})</div>` + on.map(row).join('');
    if (off.length) html += `<div class="sd-sec">${esc(T('Desconectados'))} (${off.length})</div>` + off.map(row).join('');
    el.list.innerHTML = html;

    el.count.textContent = String(on.length);
    el.count.classList.toggle('has', on.length > 0);

    const me = A.me() || {};
    el.foot.hidden = false;
    el.status.classList.toggle('inv', !!me.invisible);
    el.statusTxt.textContent = T(me.invisible ? 'Invisible' : 'En línea');
    el.status.title = T(me.invisible ? 'Pasar a En línea' : 'Pasar a Invisible');
    el.codeLbl.textContent = T('Tu código');
    el.copy.textContent = me.friend_code || '';
    el.copy.title = T('Copiar');
  }

  // ---------------------------------------------------------------- eventos
  el.list.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && !img.dataset.fb) { img.dataset.fb = '1'; img.src = initialAvatar(img.dataset.n); }
  }, true);

  el.list.addEventListener('click', (e) => {
    if (e.target.closest('[data-login]')) { $('#fr-login-btn')?.click(); return; }
    const b = e.target.closest('.sd-join[data-name]');
    if (!b) return;
    const { code, name } = b.dataset;
    if (root.classList.contains('playing')) { showToast(T('Salí de tu sala actual para unirte a la de tu amigo')); return; }
    if (code && ROOM_CODE.test(code)) joinByUrl(`https://www.haxball.com/play?c=${encodeURIComponent(code)}`, name || null);
    else if (name) { showToast(T('Buscando la sala de tu amigo…'), 'ok'); joinByName(name, null); }
  });

  el.add.addEventListener('click', () => {
    $('.nav-btn[data-panel="panel-amigos"]')?.click();
    setTimeout(() => $('#fr-add-input')?.focus(), 80);
  });
  // Estado: reutiliza el interruptor de Social, que ya hace el PATCH /me y refresca todo.
  el.status.addEventListener('click', () => $('#fr-invisible')?.click());
  el.copy.addEventListener('click', () => {
    const me = api() && api().me();
    if (!me || !me.friend_code) return;
    if (typeof copyToClipboard === 'function') copyToClipboard(me.friend_code, T('Código copiado'));
    else navigator.clipboard?.writeText(me.friend_code).then(() => showToast(T('Código copiado'), 'ok')).catch(() => {});
  });

  const KEY = 'socialDockFolded';
  const setFolded = (v, save) => {
    folded = v;
    dock.classList.toggle('folded', v);
    render();
    if (!v) load();
    if (save) { try { window.vivet?.setConfig(KEY, v); } catch (_) {} }
  };
  el.fold.addEventListener('click', () => setFolded(!folded, true));

  window.addEventListener('vivet-session-changed', load);
  window.addEventListener('vivet-friends-updated', () => { // app.js ya refrescó: se toma su copia sin pedir de nuevo
    try { friends = (api().friends() || {}).friends || friends; } catch (_) {}
    render();
  });
  window.addEventListener('vivet-lang-changed', render);
  // app.js solo refresca amigos con el panel Social abierto; acá se refresca por cuenta propia.
  setInterval(() => { if (!document.hidden && !folded && !root.classList.contains('playing')) load(); }, 12000);

  render();
  load();
  (async () => {
    try { if (window.vivet?.getConfig) { const v = !!(await window.vivet.getConfig(KEY, false)); if (v) setFolded(true, false); } } catch (_) {}
  })();
})();
} catch (err) { console.error('[social-dock]', err); }