import { constants, openSync, closeSync, lstatSync, realpathSync, mkdirSync, readSync, writeFileSync, fstatSync, fsyncSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { admittedManifestForPlan } from './content-installation-plan.mjs';
import { loadAdmittedContentFile, verifyContentFile } from './content-admission.mjs';
import {upgradeReadableSkillMetadata} from './readable-skill-metadata-upgrade.mjs';
import {restorePrivateMethod} from './private-method-restore.mjs';
import {assertSkillsRelease,verifySkillsFile} from './skills-release-admission.mjs';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a,b) => a.dev === b.dev && a.ino === b.ino;
function directory(path) {
  const entry = lstatSync(path);
  if (entry.isSymbolicLink() || !entry.isDirectory() || realpathSync(path) !== path) fail('content_path_collision');
  return entry;
}
function privateRoot(path, check) {
  if (typeof path !== 'string' || resolve(path) !== path) fail('private_content_root_required');
  let cursor = '/';
  for (const component of path.slice(1).split('/')) {
    const parent = directory(cursor); check(); const next = join(cursor, component);
    try { directory(next); } catch(error) {
      if (error.code !== 'ENOENT') throw error;
      check(); mkdirSync(next, { mode: 0o700 });
    }
    if (!same(parent,directory(cursor))) fail('content_parent_changed'); cursor = next;
  }
  return directory(path);
}
function pathUnder(root, relative, check) {
  const segments = relative.split('/'); let parent = root;
  for (const part of segments.slice(0,-1)) {
    const stamp = directory(parent); check(); const next = join(parent,part);
    try { directory(next); } catch(error) {
      if (error.code !== 'ENOENT') throw error;
      check(); mkdirSync(next,{mode:0o700});
    }
    check(); if (!same(stamp,directory(parent))) fail('content_parent_changed'); directory(next); parent = next;
  }
  return join(parent,segments.at(-1));
}
function checkedBytes(target, limit) {
  const entry = lstatSync(target);
  if (entry.isSymbolicLink() || !entry.isFile() || entry.nlink !== 1 || entry.size > limit) fail('content_path_collision');
  const fd = openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd); if (!same(before,entry)) fail('content_file_changed');
    if (!before.isFile() || before.nlink !== 1 || before.size > limit) fail('content_path_collision');
    const buffer = Buffer.alloc(limit + 1); let length = 0;
    while (length < buffer.length) { const count = readSync(fd,buffer,length,buffer.length-length,null); if (!count) break; length += count; }
    if (length > limit) fail('content_existing_conflict');
    const bytes = buffer.subarray(0,length), after = fstatSync(fd);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || !same(after,lstatSync(target))) fail('content_file_changed');
    return bytes;
  } finally { closeSync(fd); }
}
function existingPathUnder(root,relative,check){
 directory(root);let target=root;
 for(const part of relative.split('/').slice(0,-1)){check();target=join(target,part);directory(target);}
 return join(target,relative.split('/').at(-1));
}

/** Composition-only API. Requires a real vault.withContentTransaction grant and
 * real policy tickets. Journal is advisory private profile state, never authority.
 * Existing differing files are conflicts, except exact reviewed public skill
 * metadata originals migrated with a verified private backup. O_EXCL prevents
 * overwriting notes;
 * ancestor rechecks do not claim openat or external filesystem CAS guarantees.
 * Resume requires a freshly authorized selected vault. No stale lock is broken.
 * afterFile is a trusted interruption/progress callback, never a UI parameter. */
export function createVaultContentTransaction({ vault, policy, profileStore, dataDir, afterFile } = {}) {
  if (!vault?.withContentTransaction || !policy?.requireCapability || !policy?.assertAdmission || !policy?.revalidateAdmission || !profileStore?.update) fail('content_transaction_provider_required');
  if (typeof dataDir !== 'string' || resolve(dataDir)!==dataDir) fail('private_content_root_required');
  return Object.freeze({
    verify(plan,{payloadRoot,signal,updatedSkills}={}){
      const admitted=admittedManifestForPlan(plan),ticket=policy.requireCapability('configure');
      return vault.withContentReadScope(async grant=>{
        const check=()=>{grant.check();policy.assertAdmission(ticket);if(signal?.aborted)fail('content_install_cancelled');};
        await grant.checkRoot();check();const methodRoot=join(dataDir,'installed-method',plan.manifestSHA256);
        const verifyEntries=async entries=>{for(const [index,entry] of entries.entries()){
          check();const base=entry.scope==='vault'?grant.root:methodRoot;
          let target;try{target=existingPathUnder(base,entry.destination,check);const parent=directory(dirname(target));verifyContentFile(admitted,entry.source,checkedBytes(target,entry.bytes));if(!same(parent,directory(dirname(target))))fail('content_parent_changed');}
          catch(error){if(error.code==='ENOENT')throw Object.assign(new Error('Um arquivo da instalação está ausente: '+entry.destination+'. Os arquivos existentes foram preservados.'),{code:'content_installation_missing',path:entry.destination});if(['content_existing_conflict','content_path_collision','content_file_changed'].includes(error.code))throw Object.assign(new Error('Um arquivo da instalação foi alterado: '+entry.destination+'. Seu arquivo foi preservado; revise-o antes de reparar a instalação.'),{code:'content_existing_conflict',path:entry.destination});throw error;}
          if(index%32===0){await new Promise(resolve=>setImmediate(resolve));await grant.checkRoot();check();}
        }};
        // Read back every existing vault file before creating any derived
        // cache. A changed or missing note must remain an explicit conflict.
        if(updatedSkills){
          assertSkillsRelease(updatedSkills);
          for(const row of updatedSkills.files){check();const target=existingPathUnder(grant.root,row.path,check),parent=directory(dirname(target));verifySkillsFile(updatedSkills,row.path,checkedBytes(target,row.size));if(!same(parent,directory(dirname(target))))fail('content_parent_changed');}
        }else await verifyEntries(plan.entries.filter(entry=>entry.scope==='vault'));
        let methodMigrated=false;
        try{directory(methodRoot);}catch(error){
          if(error.code!=='ENOENT')throw error;
          await restorePrivateMethod({plan,admitted,payloadRoot,dataDir,profileStore,grant,check,filesystem:{directory,privateRoot,pathUnder,same}});methodMigrated=true;
        }
        await verifyEntries(plan.entries.filter(entry=>entry.scope==='private-method'));
        await grant.checkRoot();check();await policy.revalidateAdmission(ticket);check();
        return {completed:true,state:'verified-existing',manifestSHA256:plan.manifestSHA256,filesVerified:plan.entries.length,methodRoot,filesCreated:0,methodMigrated};
      },{signal});
    },
    install(plan, { payloadRoot, signal } = {}) {
      const admitted = admittedManifestForPlan(plan), ticket = policy.requireCapability('configure');
      return vault.withContentTransaction(async grant => {
        const check = () => { grant.check(); policy.assertAdmission(ticket); if (signal?.aborted) fail('content_install_cancelled'); };
        const rootCheck = async () => { check(); await grant.checkRoot(); check(); await policy.revalidateAdmission(ticket); check(); };
        await rootCheck(); privateRoot(dataDir,check);
        const lockPath=join(dataDir,'content-installation.lock'); check();
        let lock;
        try { lock=openSync(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600); }
        catch(error){ if(error.code==='EEXIST')fail('content_installation_busy');throw error; }
        const lockIdentity=fstatSync(lock), journalKey=sha(Buffer.from(plan.manifestSHA256+'\0'+grant.root));
        let journal, pendingCheckpoint = 0;
        const save = async () => { check(); await profileStore.update(profile => ({...profile, contentInstallations:{...profile.contentInstallations,[journalKey]:journal}}),{beforeCommit:check});check(); };
        try {
          const previous=(await profileStore.load()).contentInstallations?.[journalKey];check();
          if(previous && (previous.manifestSHA256!==plan.manifestSHA256 || previous.rootIdentity?.dev!==grant.rootIdentity.dev || previous.rootIdentity?.ino!==grant.rootIdentity.ino)) fail('content_resume_identity_changed');
          journal={schemaVersion:1,manifestSHA256:plan.manifestSHA256,releaseID:plan.releaseID,sequence:plan.sequence,rootIdentity:grant.rootIdentity,state:'installing',files:{},completed:false};
          await save();
          const methodRoot=join(dataDir,'installed-method',plan.manifestSHA256);privateRoot(methodRoot,check);
          for(const entry of plan.entries){
            await rootCheck(); const bytes=loadAdmittedContentFile(admitted,entry.source,payloadRoot);check();
            const base=entry.scope==='vault'?grant.root:methodRoot;
            const target=pathUnder(base,entry.destination,check), parent=directory(dirname(target));
            let status='verified-existing',metadataUpgrade=null;
            try {
              const existing=checkedBytes(target,entry.bytes);
              if(existing.length!==entry.bytes || sha(existing)!==entry.sha256)fail('content_existing_conflict');
            } catch(error) {
              if(error.code==='content_existing_conflict' || error.code==='content_path_collision'){
                metadataUpgrade=upgradeReadableSkillMetadata({entry,target,bytes,dataDir,check,privateRoot,readBytes:checkedBytes});
                if(metadataUpgrade)status=metadataUpgrade.status;
                else{
                  journal.files[entry.source]={status:'conflict',sha256:entry.sha256};journal.state='conflicted';await save();
                  return {completed:false,state:'conflicted',manifestSHA256:plan.manifestSHA256,conflict:entry.destination};
                }
              }
              else if(error.code!=='ENOENT')throw error;
              if(!metadataUpgrade){
                check(); let fd;
                try { fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600); }
                catch(error){ if(error.code==='EEXIST')fail('content_existing_conflict');throw error; }
                try { check();writeFileSync(fd,bytes);fsyncSync(fd);check(); } finally {closeSync(fd);}
                status='created';
              }
            }
            check();if(!same(parent,directory(dirname(target))))fail('content_parent_changed');
            verifyContentFile(admitted,entry.source,checkedBytes(target,entry.bytes));await rootCheck();
            journal.files[entry.source]={status,sha256:entry.sha256,readbackVerified:true,...(metadataUpgrade?{originalSHA256:metadataUpgrade.originalSHA256,backup:metadataUpgrade.backup}:{})};pendingCheckpoint++;
            // Advisory progress only. Resume always rechecks every signed file,
            // including files committed after the last durable checkpoint.
            if(pendingCheckpoint>=32){await save();pendingCheckpoint=0;}
            if(afterFile){await afterFile(Object.freeze({source:entry.source,status}));check();}
          }
          await rootCheck();journal.state='complete';journal.completed=true;await save();
          return {completed:true,state:'complete',manifestSHA256:plan.manifestSHA256,filesVerified:plan.entries.length,methodRoot};
        } catch(error) {
          // Only live authorization may checkpoint an interruption. Revocation
          // leaves the previous durable marker; it never grants another write.
          try { check();if(journal){journal.state='interrupted';journal.completed=false;await save();} } catch {}
          throw error;
        } finally {
          closeSync(lock);try {if(same(lockIdentity,lstatSync(lockPath)))unlinkSync(lockPath);}catch(error){if(error.code!=='ENOENT')throw error;}
        }
      }, { signal });
    }
  });
}
