import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const site = '2a84ae0a-d59c-4c23-a3f2-b9ea827a62c5';
const linked = JSON.parse(await readFile('.netlify/state.json', 'utf8'));
if (linked.siteId !== site) throw Error('This release must target the dedicated QuoteReady site.');
for (const file of ['netlify/functions/voice.mts','netlify/functions/_shared/voice-api.mjs','netlify.toml','public/index.html']) await readFile(file);
execFileSync('npm',['test'],{stdio:'inherit'});
execFileSync('netlify',['deploy','--prod','--site',site,'--dir','public','--functions','netlify/functions','--skip-functions-cache','--no-build','--json'],{stdio:'inherit'});
