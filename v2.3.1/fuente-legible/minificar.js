// Regenera renderer/app.js, renderer/chat.js y renderer/style.css (minificados) a partir de
// fuente-legible/renderer/. Úsalo después de editar la fuente:
//   npm i -D terser clean-css      (una sola vez, en la raíz del proyecto)
//   node fuente-legible/minificar.js
const fs = require('fs'), path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const SRC = path.join(__dirname, 'renderer'), DST = path.join(__dirname, '..', 'renderer');
(async () => {
  for (const f of ['app.js', 'chat.js']) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    // toplevel:false -> los globales compartidos (appRoot, t, showToast, joinByUrl...) conservan su nombre:
    // main.js y chat.js los usan por nombre.
    const r = await minify(code, { compress: { passes: 2, toplevel: false }, mangle: { toplevel: false }, format: { comments: false } });
    if (r.error) throw r.error;
    fs.writeFileSync(path.join(DST, f), r.code);
    console.log(f, code.length, '->', r.code.length);
  }
  const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
  const c = new CleanCSS({ level: 1 }).minify(css);
  if (c.errors.length) throw new Error(c.errors.join('\n'));
  fs.writeFileSync(path.join(DST, 'style.css'), c.styles);
  console.log('style.css', css.length, '->', c.styles.length);
})();