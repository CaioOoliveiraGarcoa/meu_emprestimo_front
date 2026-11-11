import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const schema = readFileSync('openapi.json');
const reference = process.argv[2] || process.env.OPENAPI_PUBLISHED_URL;
if (reference) {
  let upstream;
  if (/^https:\/\//.test(reference)) {
    const response = await fetch(reference, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('OpenAPI publicado indisponível.');
    upstream = await response.json();
  } else upstream = JSON.parse(readFileSync(reference, 'utf8'));
  if (JSON.stringify(upstream) !== JSON.stringify(JSON.parse(schema.toString('utf8'))))
    throw new Error('Contrato do backend diferente da cópia no frontend.');
}
const target = 'src/api/generated.ts';
const before = readFileSync(target);
try {
  const result = spawnSync(process.execPath, ['node_modules/orval/dist/bin/orval.js', '--config', 'orval.config.ts'], { stdio: 'inherit' });
  if (result.status !== 0 || !before.equals(readFileSync(target))) throw new Error('Cliente gerado divergente.');
} finally {
  if (!before.equals(readFileSync(target))) writeFileSync(target, before);
}
console.log('OpenAPI e cliente Orval sincronizados.');
