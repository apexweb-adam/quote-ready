import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { syncCore } from '../scripts/sync-intake-core.mjs';
import * as core from '../packages/intake-core/index.mjs';
import * as browser from '../public/intake.mjs';
import * as sample from '../docs/intake.mjs';
test('all checked-in core and adapter copies match their canonical source',async()=>{await syncCore({check:true});});
test('browser and static entry points retain the application API',()=>{
  for(const entry of [browser,sample])for(const name of [...Object.keys(core),'agentConfig'])assert.equal(typeof entry[name],typeof (name==='agentConfig'?browser.agentConfig:core[name]));
  assert.deepEqual(browser.agentConfig(),sample.agentConfig());
});
test('standalone core contains no provider configuration, runtime dependencies or publication hooks',async()=>{
  const pkg=JSON.parse(await readFile(new URL('../packages/intake-core/package.json',import.meta.url),'utf8'));
  assert.equal(core.agentConfig,undefined);assert.equal(pkg.private,true);assert.equal(pkg.dependencies,undefined);assert.equal(pkg.scripts,undefined);
  assert.deepEqual(pkg.files,['index.mjs','index.d.mts','README.md','LICENSE']);
});
