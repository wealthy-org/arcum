import fs from 'fs';
import path from 'path';

const srcDir = fs.existsSync(path.resolve('surplus-src'))
  ? path.resolve('surplus-src')
  : path.resolve('..', 'surplus.codes');

const distDir = path.resolve('dist');

console.log(`Building web using Surplus source from: ${srcDir}`);

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

fs.cpSync(srcDir, distDir, { recursive: true });

console.log('✓ Successfully populated dist/ with 100% full surplus.codes website!');
