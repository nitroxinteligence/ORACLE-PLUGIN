import fs from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {canonicalContentJSON} from '../packages/oracle-desktop-portable/content-admission.mjs';
import {skillsSHA,admitSkillsRelease} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createSkillsReleaseSource} from '../packages/oracle-desktop-portable/skills-release-source.mjs';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';
import {createAccessPolicy} from '../packages/oracle-desktop-portable/access-policy.mjs';
import {createVaultService} from '../packages/oracle-desktop-portable/vault-service.mjs';
export function syntheticRelease(pair,files,{sequence=1,releaseID='synthetic-'+sequence,mutate=value=>value}={}){
 const inventory=[],packages=[],assets=new Map();
 for(const [kind,filter] of [['specialists',path=>/^SISTEMA\/(skills|recursos-skills)\//.test(path)],['prompts',path=>path.startsWith('SISTEMA/prompts/')]]){
  const selected=Object.entries(files).filter(([path])=>filter(path));if(!selected.length)continue;
  const id=kind+'-0001',rows=selected.map(([path,text])=>{const bytes=Buffer.from(text);return {path,sha256:skillsSHA(bytes),size:bytes.length,mode:420,content_base64:bytes.toString('base64')};});
  inventory.push(...rows.map(({content_base64,...row})=>({...row,kind,package_id:id})));
  const document={schema_version:3,release_id:releaseID,id,files:rows},bytes=canonicalContentJSON(document),asset=id+'.json',url=`https://github.com/nitroxinteligence/ORACLE-SKILLS/releases/download/${releaseID}/${asset}`;assets.set(url,bytes);
  packages.push({id,kind,asset,url,bytes:bytes.length,sha256:skillsSHA(bytes),expanded_bytes:rows.reduce((sum,row)=>sum+row.size,0),files:rows.map(row=>row.path),dependencies:[]});
 }
 const doc=mutate({schema_version:3,release_id:releaseID,sequence,gbrain_version:'99.1.0.0',gbrain_commit:'b'.repeat(40),adapter_commit:'b'.repeat(40),files:inventory,inventory_sha256:skillsSHA(canonicalContentJSON(inventory)),packages,licenses:[{component:'synthetic',license:'MIT',path:inventory[0].path}],items:[]});
 const payload=canonicalContentJSON(doc),envelope=canonicalContentJSON({schema_version:3,key_id:'synthetic',payload_base64:payload.toString('base64'),signature_base64:sign(null,Buffer.concat([Buffer.from('oracle-distribution-v3\0'),payload]),pair.privateKey).toString('base64')});
 const manifestURL=`https://github.com/nitroxinteligence/ORACLE-SKILLS/releases/download/${releaseID}/oracle-distribution.json`;assets.set(manifestURL,envelope);
 const metadata={tag_name:releaseID,draft:false,prerelease:false,assets:[{name:'oracle-distribution.json',size:envelope.length,digest:'sha256:'+skillsSHA(envelope),browser_download_url:manifestURL}]};
 return {envelope,doc,assets,metadata};
}
export async function updateFixture(t,{oldFiles={'SISTEMA/skills/sample/SKILL.md':'# Original\n'},newFiles={'SISTEMA/skills/sample/SKILL.md':'# Updated\n'},items=[],inspectPath}={}){
 const base=resolve('.work/portable-updates-tests');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(join(base,'synthetic-')),bundleRoot=join(root,'bundle'),dataDir=join(root,'profile'),vaultRoot=join(root,'vault');await fs.mkdir(vaultRoot);await fs.mkdir(dataDir,{mode:0o700});
 const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64'),trust={schema_version:1,algorithm:'Ed25519',keys:[{id:'synthetic',public_key_base64:publicKey}]};
 const policy=createAccessPolicy({keys:{version:1,keys:{synthetic:publicKey}}}),license=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic',licenseID:randomUUID(),subject:'Synthetic update qualification',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'a'.repeat(64)}));await policy.activate('ORACLE3.'+license.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),license]),pair.privateKey).toString('base64url'));
 const profileStore=createProfileStore({dataDir}),vault=createVaultService({profileStore,inspectPath,selectionAdapter:{selectVault:async()=>({root:vaultRoot,explicitSelection:true})},admission:{createAdmissionTicket:()=>policy.requireCapability('configure'),assertAdmissionTicket:ticket=>policy.assertAdmission(ticket)}});await vault.selectVault();
 const mutate=doc=>({...doc,items}),old=syntheticRelease(pair,oldFiles,{mutate}),latest=syntheticRelease(pair,newFiles,{sequence:2,mutate});const previous=admitSkillsRelease(old.envelope,{trust});
 await fs.mkdir(join(bundleRoot,'resources/updates'),{recursive:true});await fs.writeFile(join(bundleRoot,'resources/updates/distribution-keys.json'),JSON.stringify(trust));await fs.writeFile(join(bundleRoot,'resources/updates/sources.json'),JSON.stringify({skills:{repository:'https://github.com/nitroxinteligence/ORACLE-SKILLS',trust_keys:'distribution-keys.json'}}));await fs.mkdir(join(bundleRoot,'engine-source/provenance'),{recursive:true});await fs.writeFile(join(bundleRoot,'engine-source/provenance/oracle-distribution.json'),old.envelope);
 const fetched=[],fetchImpl=async url=>{fetched.push(String(url));if(String(url)==='https://api.github.com/repos/nitroxinteligence/ORACLE-SKILLS/releases/latest')return new Response(JSON.stringify(latest.metadata));const bytes=latest.assets.get(String(url));return bytes?new Response(bytes):new Response('absent',{status:404});};
 const source=createSkillsReleaseSource({bundleRoot,dataDir,policy,profileStore,fetchImpl}),ticket=policy.requireCapability('configure');
 for(const [path,text] of Object.entries(oldFiles)){const target=join(vaultRoot,path);await fs.mkdir(dirname(target),{recursive:true});await fs.writeFile(target,text);}
 t.after(async()=>{vault.revoke();policy.revoke();await fs.rm(root,{recursive:true,force:true});});
 return {root,bundleRoot,dataDir,vaultRoot,pair,trust,policy,profileStore,vault,old,latest,previous,source,ticket,fetched,fetchImpl,inspectPath,async stage(){return source.download(await source.check({ticket}),{ticket});}};
}
