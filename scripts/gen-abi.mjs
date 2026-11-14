// scripts/gen-abi.mjs
import fs from 'node:fs';
const names = ['ArcumEngine','WriterPool','AgentRouter','SeriesRegistry','PriceGuard'];
let out = '// AUTO-GENERATED dari forge build. Jangan diedit manual.\n';
for (const n of names) {
  const { abi } = JSON.parse(fs.readFileSync(`contracts/out/${n}.sol/${n}.json`, 'utf8'));
  out += `export const ${n}Abi = ${JSON.stringify(abi)} as const;\n\n`;
}
fs.writeFileSync('web/src/contracts/generated.ts', out);
console.log('Successfully generated web/src/contracts/generated.ts');
