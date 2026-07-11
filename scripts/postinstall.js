const { existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const nodelinkDir = path.join(__dirname, '..', 'nodelink-server');

if (existsSync(nodelinkDir)) {
  console.log('[postinstall] Instalando dependencias de NodeLink...');
  execSync('pnpm --prefix nodelink-server install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} else {
  console.log('[postinstall] nodelink-server no encontrado. Omitiendo instalación de NodeLink.');
}
