import {existsSync,lstatSync,mkdirSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {acquireLock,releaseLock,type LockHandle} from '../../vendor/gbrain/src/core/pglite-lock.ts';

export function runtimeTransitionPath(profile:string){return join(dirname(dirname(resolve(profile))),'updates/runtime/transition.json')}
export function assertRuntimeAvailable(profile:string){
 if(existsSync(runtimeTransitionPath(profile)))throw Error('Runtime transaction is pending; reopen Oracle to recover the previous generation');
}
/** Stable lease outside the directory that a generation transaction may rename.
 * Lock order: native operation (when applicable), access lease, official DB lock.
 * Waiting clients recheck the gate after acquiring this lease, BEFORE DB open.
 */
export async function acquireRuntimeAccess(profile:string):Promise<LockHandle>{
 const path=resolve(profile)+'.oracle-access',parent=dirname(path);
 if(realpathSync(parent)!==parent)throw Error('Profile access parent symlink refused');
 if(!existsSync(path))try{mkdirSync(path,{mode:0o700})}catch(error){if(!existsSync(path))throw error}
 if(lstatSync(path).isSymbolicLink()||!lstatSync(path).isDirectory())throw Error('Profile access lease path is invalid');
 return acquireLock(path,{timeoutMs:40_000});
}
export {releaseLock as releaseRuntimeAccess};
