import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {GBRAIN_NATIVE_PINS} from './gbrain-native-pins.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
/** Original upstream OS lock, admitted by exact platform/hash before loading.
 * The same flock as AI Memory's serve guard blocks a live previous process.
 * No PID/TTL fallback, force option, custom compilation or executable argv. */
export function createProfileKernelLock(addonPath){
 const pin=GBRAIN_NATIVE_PINS[`${process.platform}-${process.arch}`];
 if(!pin||realpathSync(addonPath)!==addonPath)fail('profile_lock_unavailable','Trava oficial indisponível.');
 const info=lstatSync(addonPath);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size!==pin.bytes||createHash('sha256').update(readFileSync(addonPath)).digest('hex')!==pin.sha256)fail('profile_lock_unavailable','Trava oficial diverge do pin.');
 const native=createRequire(import.meta.url)(addonPath);
 if(native.target!==`${process.platform}-${process.arch}`||typeof native.openLock!=='function'||typeof native.tryLock!=='function'||typeof native.close!=='function')fail('profile_lock_unavailable','ABI da trava oficial inválida.');
 return async function acquire(path){const handle=native.openLock(path);let closed=false;const release=()=>{if(!closed){closed=true;native.close(handle);}};
  try{if(!native.tryLock(handle))fail('profile_in_use','Encerre as conversas que estão usando o Oracle e tente novamente.');return release;}catch(error){release();throw error;}
 };
}
