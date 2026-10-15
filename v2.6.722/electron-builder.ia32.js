// Instalador para Windows ANTIGUO (32 bits): Windows 7 / 8 / 8.1 (y 10 de 32 bits)
// -> Vivet-setup32-v2.2.0.exe
// Electron 23 en adelante ya no corre en Windows 7/8/8.1; la 22.3.27 es la última que sí.
// Por eso este instalador se arma con Electron 22 aunque el desarrollo use el 38.
const base = require('./package.json').build;

module.exports = {
  ...base,
  electronVersion: '22.3.27',
  // Canal propio: genera ia32.yml en vez de latest.yml, así no pisa al de 64 bits en el mismo release.
  publish: base.publish.map((p) => ({ ...p, channel: 'ia32' })),
  win: { ...base.win, target: [{ target: 'nsis', arch: ['ia32'] }] },
  nsis: { ...base.nsis, artifactName: 'Vivet-setup32-v${version}.${ext}' },
};