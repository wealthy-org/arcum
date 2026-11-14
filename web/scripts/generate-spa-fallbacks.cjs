const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html not found!');
  process.exit(1);
}

const content = fs.readFileSync(indexHtml, 'utf-8');

// 1. Create 404.html for Vercel SPA Fallback
fs.writeFileSync(path.join(distDir, '404.html'), content, 'utf-8');

// 2. Create static directories for direct deep-linking
const routes = [
  'docs',
  'contracts',
  'trade',
  'positions',
  'shield',
  'pool',
  'agents',
  'activity',
  'settings',
  'exit',
  'products',
  'learn',
  'markets',
  'writers',
  'protocol',
  'costs',
  'privacy',
  'product-terms',
];

for (const route of routes) {
  const dir = path.join(distDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), content, 'utf-8');
}

console.log(`[SPA Fallback] Generated 404.html and ${routes.length} route directories successfully.`);
