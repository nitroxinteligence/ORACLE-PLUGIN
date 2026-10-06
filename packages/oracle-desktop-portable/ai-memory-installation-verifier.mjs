import {getAIMemoryRuntimeContext} from './ai-memory-runtime.mjs';
import {getAIMemorySnapshotContext} from './ai-memory-snapshot.mjs';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
import {lstatSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
const receipts=new WeakMap(),fail=code=>{throw Object.assign(new Error(code),{code});};

// Verifies an existing owned profile, pinned executable/version and the actual
// SQLite schema through a read-only snapshot. It neither starts a service nor
// restores portability, capture, hook, scheduler or Codex consent from disk.
export async function verifyAIMemoryInstallation({backend,ticket,signal,check}={}){
 if(typeof backend?.verifyInstallationProfile!=='function'||typeof backend?.assertPreparedProfile!=='function'||typeof check!=='function')fail('ai_memory_installation_unavailable');
 check();const context=getAIMemoryRuntimeContext(backend.runtime);context.assertCurrent(ticket);
 if(backend.runtime.version!==AI_MEMORY_PINS.version||backend.runtime.binarySHA256!==AI_MEMORY_PINS.binarySHA256||backend.runtime.versionExecutionVerified!==true)fail('ai_memory_pin_mismatch');
 const prepared=await backend.verifyInstallationProfile({ticket,signal});check();if(prepared.restored!==true||prepared.initializationExecuted!==false)fail('ai_memory_installation_unverified');
 const snapshot=await backend.snapshotReader.read({ticket,signal});check();getAIMemorySnapshotContext(snapshot);
 const database=join(context.dataDir,'db/memory.sqlite'),identity=lstatSync(database);
 const assertCurrent=()=>{check();context.assertCurrent(ticket);backend.assertPreparedProfile(ticket);getAIMemorySnapshotContext(snapshot);const current=lstatSync(database);if(current.isSymbolicLink()||!current.isFile()||current.nlink!==1||current.dev!==identity.dev||current.ino!==identity.ino||realpathSync(database)!==database)fail('ai_memory_profile_changed');};
 const receipt=Object.freeze({installed:true,version:AI_MEMORY_PINS.version,binarySHA256:AI_MEMORY_PINS.binarySHA256,versionExecutionVerified:true,ownedProfileVerified:true,schemaVerified:true,workspace:context.workspace,project:context.project,runtimeReady:false,serviceAvailable:false,portability:'pending',captureEnabled:false,hooksTrusted:false,codexConnected:false});
 receipts.set(receipt,{check:assertCurrent});assertCurrent();return receipt;
}
export function assertAIMemoryInstallationReceipt(receipt){const value=receipts.get(receipt);if(!value)fail('ai_memory_installation_unverified');value.check();return receipt;}
