import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {checkOriginalComponents} from '../packages/oracle-desktop-portable/component-update-check.mjs';

async function fixture(t){
 const parent=resolve('.work/updates-20261010/components');await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(join(parent,'synthetic-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(join(root,'resources/updates'),{recursive:true});
 await fs.writeFile(join(root,'resources/updates/portable-upstream.json'),JSON.stringify({gbrain:{version:'0.60.94.0'},aiMemory:{version:'2.5.2'}}));return root;
}
const release=version=>new Response(JSON.stringify({draft:false,prerelease:false,tag_name:'v'+version,assets:[]}),{status:200});
test('queries both original repositories and distinguishes a qualified component from a newer candidate',async t=>{
 const bundleRoot=await fixture(t),urls=[];
 const rows=await checkOriginalComponents({bundleRoot,qualified:{gbrain:{version:'0.60.150.0'},aiMemory:{version:'2.5.2'}},fetchImpl:async url=>{urls.push(url);return release(url.includes('garrytan')?'0.60.150.0':'2.6.3');}});
 assert.deepEqual(urls.sort(),['https://api.github.com/repos/akitaonrails/ai-memory/releases/latest','https://api.github.com/repos/garrytan/gbrain/releases/latest']);
 assert.equal(rows.gbrain.available,true);assert.equal(rows.gbrain.qualified,true);assert.equal(rows.aiMemory.available,true);assert.equal(rows.aiMemory.qualified,false);
});
test('one upstream outage leaves the other result usable and older releases never offer a downgrade',async t=>{
 const bundleRoot=await fixture(t),rows=await checkOriginalComponents({bundleRoot,fetchImpl:async url=>url.includes('akitaonrails')?new Response('',{status:503}):release('0.60.93.0')});
 assert.equal(rows.gbrain.checked,true);assert.equal(rows.gbrain.available,false);assert.equal(rows.aiMemory.checked,false);assert.match(rows.aiMemory.error,/HTTP 503/);
});
test('revoked admission stops the component query',async t=>{
 const bundleRoot=await fixture(t);let revoked=false;
 await assert.rejects(checkOriginalComponents({bundleRoot,check:()=>{if(revoked)throw Error('Admission revoked');},fetchImpl:async()=>{revoked=true;return release('2.6.3');}}),/Admission revoked/);
});
