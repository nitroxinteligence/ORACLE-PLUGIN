import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {upgradeReadableSkillMetadata} from '../packages/oracle-desktop-portable/readable-skill-metadata-upgrade.mjs';
import {onboardingStatus} from '../packages/oracle-desktop-portable/onboarding-status.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const destination='SISTEMA/skills/codigo/frontend/impeccable/agents/openai.yaml';
const tail='\n  short_description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify,...\n  default_prompt: Use Impeccable to redesign, critique, audit, or polish this frontend.';
const original=Buffer.from('interface:\n  display_name: Impeccable'+tail);
const updated=Buffer.from('interface:\n  display_name: "Oracle Frontend Impeccable"'+tail);
function fixture(){
 const base=resolve('.work/readable-metadata-test');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(join(base,'synthetic-')),target=join(root,'vault',destination),dataDir=join(root,'private');fs.mkdirSync(join(root,'vault','SISTEMA/skills/codigo/frontend/impeccable/agents'),{recursive:true});fs.mkdirSync(dataDir,{mode:0o700});fs.writeFileSync(target,original);
 const readBytes=(path,limit)=>{const s=fs.lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>limit)throw Object.assign(Error('collision'),{code:'content_path_collision'});return fs.readFileSync(path);};
 const options={entry:{scope:'vault',destination,sha256:sha(updated)},target,bytes:updated,dataDir,check(){},privateRoot:path=>{fs.mkdirSync(path,{recursive:true,mode:0o700});assert(!fs.lstatSync(path).isSymbolicLink());},readBytes};
 return {root,target,dataDir,options,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('previous public Impeccable metadata upgrades and retains the exact original backup',()=>{
 const f=fixture();try{const result=upgradeReadableSkillMetadata(f.options);assert.equal(result.status,'updated-readable-metadata');assert.deepEqual(fs.readFileSync(f.target),updated);assert.deepEqual(fs.readFileSync(join(f.dataDir,result.backup)),original);assert.equal(fs.statSync(join(f.dataDir,result.backup)).mode&0o777,0o600);assert.equal(upgradeReadableSkillMetadata(f.options),null);}finally{f.close();}
});
test('custom metadata, notes, unreviewed target bytes and symbolic links never overwrite originals',()=>{
 for(const variant of ['custom','note','target','link']){const f=fixture();try{
  const custom=Buffer.from('USER CUSTOM NAME');let options=f.options;
  if(variant==='custom')fs.writeFileSync(f.target,custom);
  if(variant==='note')options={...options,entry:{...options.entry,destination:'SISTEMA/skills/sample/SKILL.md'}};
  if(variant==='target')options={...options,bytes:Buffer.from('UNREVIEWED METADATA')};
  if(variant==='link'){const outside=join(f.root,'outside.yaml');fs.writeFileSync(outside,original);fs.unlinkSync(f.target);fs.symlinkSync(outside,f.target);}
  assert.equal(upgradeReadableSkillMetadata(options),null);assert.deepEqual(fs.readFileSync(f.target),variant==='custom'?custom:original);assert(!fs.existsSync(join(f.dataDir,'readable-metadata-backups')));
 }finally{f.close();}}
});
test('an external edit during metadata preparation remains intact and blocks replacement',()=>{
 const f=fixture();try{let calls=0;const edited=Buffer.from('CONCURRENT USER EDIT');assert.throws(()=>upgradeReadableSkillMetadata({...f.options,check(){if(++calls===3)fs.writeFileSync(f.target,edited);}}),{code:'content_file_changed'});assert.deepEqual(fs.readFileSync(f.target),edited);assert.deepEqual(fs.readFileSync(join(f.dataDir,'readable-metadata-backups',sha(original)+'.yaml')),original);}finally{f.close();}
});
test('onboarding exposes the actual conflicting file without converting missing proofs into completion',()=>{
 const state=onboardingStatus({policy:{snapshot:()=>({active:true,role:'student',capabilities:[]})},vault:{status:()=>({selected:true,root:'/synthetic/vault',generation:1})},runID:'synthetic-conflict',operation:{running:false},coordinator:{status:'conflicted',running:false,conflict:destination,localContentVerified:false,indexVerified:false,pendingStages:['catalog_installation','method_installation','codex','hooks']}});
 assert.equal(state.status,'interrupted');assert.equal(state.installationCompleted,false);assert.equal(state.installationError.code,'content_existing_conflict');assert.equal(state.installationError.path,destination);assert.match(state.message,/original foi preservado/);assert(!state.message.includes('precisa de confirmação'));
});
