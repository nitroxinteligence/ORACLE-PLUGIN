// Real macOS bookmarks in disposable state. No personal profile, account,
// picker or installation consent. Production directory identity checks apply.
import fs from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const options=Object.fromEntries(process.argv.slice(2).reduce((rows,value,index,all)=>index%2?rows:[...rows,[value,all[index+1]]],[]));
const work=resolve('.work');
const isolated=value=>{const target=resolve(value||'');if(!target.startsWith(work+'/'))throw Error('Disposable canonical path required');return target;};
const root=isolated(options['--payload-root']);assert.equal(await fs.realpath(root),root);
const {createMacBookmarkProvider,loadMacCoreFoundationBookmarkBindings}=await import(pathToFileURL(join(root,'mac-bookmark-provider.mjs')));
const {createPersistentVaultSelection}=await import(pathToFileURL(join(root,'persistent-vault-selection.mjs')));
const {createProfileStore}=await import(pathToFileURL(join(root,'profile-store.mjs')));
const {createVaultService}=await import(pathToFileURL(join(root,'vault-service.mjs')));
const make=(dataDir,bookmarks,chooseDirectory=async()=>{throw Error('No picker on reopen');})=>{
 const profileStore=createProfileStore({dataDir});return {profileStore,vault:createVaultService({profileStore,selectionAdapter:createPersistentVaultSelection({profileStore,bookmarks,chooseDirectory})})};
};
if(options['--child-profile']){
 const dataDir=isolated(options['--child-profile']),{profileStore,vault}=make(dataDir,createMacBookmarkProvider());
 try{await vault.restoreVault();assert(vault.status().selected);const value=await profileStore.load();
  assert.deepEqual(value.preferences,{capture:false,maintenance:false});assert.equal(value.license,'Synthetic preserved metadata, not an activation');
  process.stdout.write(JSON.stringify({passed:true,pid:process.pid,root:vault.status().root,identity:value.vaultSelection.rootIdentity})+'\n');
 }finally{vault.revoke();}
}else{
 const output=isolated(options['--output']),scratch=join(dirname(output),'native-'+randomUUID());await fs.mkdir(scratch,{recursive:true,mode:0o700});
 const dataDir=join(scratch,'private'),original=join(scratch,'vault'),moved=join(scratch,'moved-vault');await fs.mkdir(original);
 await fs.writeFile(join(original,'original.md'),'# Synthetic original\nPreserve this file.\n');
 const bindings=await loadMacCoreFoundationBookmarkBindings(),bookmarks=createMacBookmarkProvider({bindings}),initial=make(dataDir,bookmarks,async()=>({path:original}));
 await initial.vault.selectVault();initial.vault.revoke();
 await initial.profileStore.update(value=>({...value,license:'Synthetic preserved metadata, not an activation',preferences:{capture:false,maintenance:false}}));
 const before=await initial.profileStore.load();await fs.rename(original,moved);
 const raw=bindings.resolveBookmark(Buffer.from(before.vaultSelection.bookmark.bookmarkBase64,'base64'));let stale;
 try{stale=raw.stale;assert.equal(raw.path(),moved);assert.equal(stale,true);}finally{raw.dispose();}
 let baselineRejected=false,baselineError=null;
 if(options['--baseline-bookmark-provider']){
  const module=await import(pathToFileURL(isolated(options['--baseline-bookmark-provider'])));
  try{const lease=await module.createMacBookmarkProvider().acquireDirectoryGrant(before.vaultSelection.bookmark);lease.release();}
  catch(error){baselineRejected=true;baselineError=error.code;assert.equal(baselineError,'directory_grant_stale');}
  assert(baselineRejected);
 }
 const restored=make(dataDir,bookmarks);try{await restored.vault.restoreVault();assert.equal(restored.vault.status().root,moved);}finally{restored.vault.revoke();}
 const after=await initial.profileStore.load();assert.equal(after.vaultSelection.bookmark.path,moved);assert.notEqual(after.vaultSelection.bookmark.bookmarkBase64,before.vaultSelection.bookmark.bookmarkBase64);
 assert.deepEqual(after.vaultSelection.rootIdentity,before.vaultSelection.rootIdentity);for(const key of ['license','preferences'])assert.deepEqual(after[key],before[key]);
 assert.equal(await fs.readFile(join(moved,'original.md'),'utf8'),'# Synthetic original\nPreserve this file.\n');
 // Replacing a bookmarked directory must not turn a renewed URL into access
 // to the replacement, even if the OS resolves that URL successfully.
 const rejectedDir=join(scratch,'replacement-private'),replaced=join(scratch,'replacement-vault');await fs.mkdir(replaced);
 const replacement=make(rejectedDir,bookmarks,async()=>({path:replaced}));await replacement.vault.selectVault();replacement.vault.revoke();
 const unchanged=await replacement.profileStore.load();await fs.rm(replaced,{recursive:true});await fs.mkdir(replaced);
 await assert.rejects(replacement.vault.restoreVault());assert.equal(replacement.vault.status().selected,false);assert.deepEqual(await replacement.profileStore.load(),unchanged);
 const delays=(options['--reopen-delays-seconds']||'0').split(',').map(Number);
 if(delays.length>3||delays.some(value=>!Number.isSafeInteger(value)||value<0||value>1800)||delays.some((value,index)=>index&&value<=delays[index-1]))throw Error('Up to three increasing delays from 0 to 1800 seconds required');
 const binary=join(scratch,'relocated-runtime/bun');await fs.mkdir(dirname(binary));await fs.copyFile(process.execPath,binary);await fs.chmod(binary,0o755);
 assert.equal(createHash('sha256').update(await fs.readFile(binary)).digest('hex'),createHash('sha256').update(await fs.readFile(process.execPath)).digest('hex'));
 const started=Date.now(),reopens=[];
 const timer=setInterval(()=>process.stdout.write(JSON.stringify({phase:'waiting-for-reopen',elapsedSeconds:Math.floor((Date.now()-started)/1000)})+'\n'),60000);timer.unref?.();
 const child=()=>new Promise((yes,no)=>{
  const process=spawn(binary,[resolve('scripts/qualify-portable-vault-recovery.mjs'),'--payload-root',root,'--child-profile',dataDir],{shell:false,stdio:['ignore','pipe','pipe']});let output='',error='';
  process.stdout.on('data',bytes=>output+=bytes);process.stderr.on('data',bytes=>error+=bytes);process.on('error',no);
  process.on('exit',code=>{try{if(code!==0)throw Error(error);yes(JSON.parse(output));}catch(failure){no(failure);}});
 });
 try{for(const seconds of delays){await new Promise(resolve=>setTimeout(resolve,Math.max(0,seconds*1000-(Date.now()-started))));const result=await child();assert(result.passed);assert.equal(result.root,moved);assert.deepEqual(result.identity,before.vaultSelection.rootIdentity);reopens.push({...result,requestedDelaySeconds:seconds,actualDelaySeconds:Math.floor((Date.now()-started)/1000)});process.stdout.write(JSON.stringify({phase:'reopened',...reopens.at(-1)})+'\n');}}
 finally{clearInterval(timer);}
 const report={passed:true,payloadRoot:root,packageReceiptSHA256:createHash('sha256').update(await fs.readFile(join(root,'portable-package-receipt.json'))).digest('hex'),actualOSBookmark:true,actualStaleBookmark:stale,baselineRejected,baselineError,renewalPersisted:true,originalDirectoryIdentityVerified:true,relocatedExecutableVerified:true,replacementDirectoryDenied:true,originalFilePreserved:true,profileMetadataPreserved:true,pickerOnReopen:false,personalProfileUsed:false,accountAccessed:false,installationExecuted:false,reopens,scratch};
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({report:output,...report})+'\n');
}
