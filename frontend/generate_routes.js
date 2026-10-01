import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html does not exist!');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

// Also write 404.html for static hosting fallbacks
fs.writeFileSync(path.join(distDir, '404.html'), htmlContent);

const routes = [
  'login',
  'dashboard',
  'transactions',
  'alerts',
  'cases',
  'risk-profiles',
  'search',
  'analytics',
  'models',
  'notifications',
  'access-denied',
  'admin',
  'admin/overview',
  'admin/rules',
  'admin/users',
  'admin/settings',
  'admin/audit-logs',
  'admin/observability',
  'ui-components'
];

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent);
  // Also create flat HTML file for servers looking for /login.html
  fs.writeFileSync(path.join(distDir, `${route.replace(/\//g, '_')}.html`), htmlContent);
  console.log(`Generated route shell for /${route}`);
}

console.log('Successfully generated all static route entrypoints!');
