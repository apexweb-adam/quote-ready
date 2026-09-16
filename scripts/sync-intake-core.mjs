import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = new URL('../', import.meta.url);
const pairs = [
  ['packages/intake-core/index.mjs', 'public/intake-core.mjs'],
  ['packages/intake-core/index.mjs', 'docs/intake-core.mjs'],
  ['public/assemblyai-config.mjs', 'docs/assemblyai-config.mjs'],
  ['public/intake.mjs', 'docs/intake.mjs']
];
export async function syncCore({ check = false } = {}) {
  for (const [source, target] of pairs) {
    const expected = await readFile(new URL(source, root), 'utf8');
    if (check) {
      const actual = await readFile(new URL(target, root), 'utf8');
      if (actual !== expected) throw Error(`Generated file out of date: ${target}. Run node scripts/sync-intake-core.mjs`);
    } else {
      const url = new URL(target, root);
      await mkdir(new URL('.', url), { recursive: true });
      await writeFile(url, expected);
    }
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.slice(2).some(arg => arg !== '--check')) throw Error('Usage: node scripts/sync-intake-core.mjs [--check]');
  await syncCore({ check: process.argv.includes('--check') });
  console.log(process.argv.includes('--check') ? 'Core assets match.' : 'Core assets synchronized.');
}
