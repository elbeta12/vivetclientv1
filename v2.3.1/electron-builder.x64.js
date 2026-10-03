// Instalador para Windows 10 / 11 (64 bits) -> Vivet-setup64-v2.2.0.exe
// Usa el Electron del package.json (38).
const base = require('./package.json').build;

module.exports = {
  ...base,
  win: { ...base.win, target: [{ target: 'nsis', arch: ['x64'] }] },
  nsis: { ...base.nsis, artifactName: 'Vivet-setup64-v${version}.${ext}' },
};