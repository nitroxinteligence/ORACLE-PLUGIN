import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createOfficialHooksInstaller} from '../packages/oracle-desktop-portable/official-hooks-installer.mjs';

const native=process.env.ORACLE_TEST_AI_MEMORY_BINARY;
test('official CLI installs both scopes, preserves foreign hooks and MCP, is idempotent, and never trusts hooks',{skip:!native||process.platform!=='darwin'},async()=>{
 const base=resolve('.work/official-hooks-tests');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(join(base,'isolated-'));
 const home=join(root,'home'),workspace=join(root,'oracle-workspace'),bundleRoot=join(root,'bundle'),dataDir=join(root,'plugin');
 for(const p of [join(home,'.codex'),workspace,join(bundleRoot,'runtime'),dataDir])await fs.mkdir(p,{recursive:true});
 await fs.copyFile(native,join(bundleRoot,'runtime/ai-memory'));
 await fs.cp(resolve('Resources/ai-memory/portable-hooks'),join(bundleRoot,'resources/ai-memory/hooks'),{recursive:true});
 const config='[mcp_servers.ai-memory]\nurl = "http://127.0.0.1:49379/mcp"\n';
 await fs.writeFile(join(home,'.codex/config.toml'),config);
 const foreign={type:'command',command:'echo synthetic-other-hook'};
 await fs.writeFile(join(home,'.codex/hooks.json'),JSON.stringify({description:'preserve',hooks:{Stop:[{matcher:'',hooks:[foreign]}]}}));
 let current=true;const check=()=>{if(!current)throw Object.assign(new Error('revoked'),{code:'revoked'});};
 const install=createOfficialHooksInstaller({bundleRoot,dataDir,home,environment:{PATH:'/usr/bin:/bin',AI_MEMORY_DATA_DIR:join(root,'official-memory')}});
 const receipt=await install({workspace,check});assert.equal(receipt.installed,true);assert.equal(receipt.hooksTrusted,false);assert.equal(receipt.captureVerified,false);
 const before={};for(const target of [receipt.user,receipt.workspace]){
  const text=await fs.readFile(target,'utf8');before[target]=text;const hooks=JSON.parse(text).hooks;
  assert.equal(Object.keys(hooks).length,7);
  for(const groups of Object.values(hooks))assert(groups.some(g=>g.hooks.some(h=>h.command.includes(' hook --event ')&&h.command.includes('--server-url http://127.0.0.1:49379')&&h.command.includes('installed-tools/ai-memory/'))));
 }
 assert.equal(JSON.parse(before[receipt.user]).description,'preserve');assert(JSON.parse(before[receipt.user]).hooks.Stop.some(g=>g.hooks.some(h=>h.command===foreign.command)));
 assert.equal(await fs.readFile(join(home,'.codex/config.toml'),'utf8'),config);
 assert.equal((await fs.readdir(join(home,'.codex'))).filter(x=>x!=='config.toml'&&x!=='hooks.json'&&!x.includes('backup')&&!x.includes('bak')).length,0);
 await install({workspace,check});for(const target of [receipt.user,receipt.workspace])assert.equal(await fs.readFile(target,'utf8'),before[target]);
 current=false;await assert.rejects(install({workspace,check}),{code:'revoked'});for(const target of [receipt.user,receipt.workspace])assert.equal(await fs.readFile(target,'utf8'),before[target]);
 await fs.writeFile(join(bundleRoot,'resources/ai-memory/hooks/codex/stop.sh'),'tampered');current=true;
 await assert.rejects(install({workspace,check}),{code:'official_hooks_scripts_mismatch'});for(const target of [receipt.user,receipt.workspace])assert.equal(await fs.readFile(target,'utf8'),before[target]);
 await fs.writeFile(join(root,'test-receipt.json'),JSON.stringify({passed:true,...receipt},null,2));
});
