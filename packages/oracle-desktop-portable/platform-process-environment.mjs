import {join,win32,sep} from 'node:path';
import {windowsLocalPath} from './portable-windows-paths.mjs';
/** Explicit private environments, without parent credentials/profile discovery.
 * Environment isolation is not OS network isolation or ACL verification. */
export function gbrainPrivateEnvironment({stateRoot,profile,platform=process.platform,systemDirectory}={}){
 const paths=platform==='win32'?win32:{join};
 if(platform==='win32'){windowsLocalPath(stateRoot);windowsLocalPath(profile);systemDirectory=windowsLocalPath(systemDirectory);}
 const home=paths.join(stateRoot,'execution-home'),temporary=paths.join(stateRoot,'tmp');
 return Object.freeze({...(platform==='win32'?{SYSTEMROOT:win32.dirname(systemDirectory),WINDIR:win32.dirname(systemDirectory),PATH:systemDirectory,USERPROFILE:home,APPDATA:win32.join(home,'Roaming'),LOCALAPPDATA:win32.join(home,'Local'),TEMP:temporary,TMP:temporary}:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin'}),HOME:home,TMPDIR:temporary,LANG:'en_US.UTF-8',GBRAIN_HOME:profile,GBRAIN_SKIP_UPDATE_CHECK:'1',GBRAIN_HOOKS:'0',ORACLE_RECEIPT_DIR:paths.join(stateRoot,'events'),BUN_RUNTIME_TRANSPILER_CACHE_PATH:paths.join(temporary,'bun-cache'),DO_NOT_TRACK:'1'});
}
export function pathsOverlap(a,b,{platform=process.platform}={}){
 const paths=platform==='win32'?win32:{sep};
 const normalize=value=>platform==='win32'?windowsLocalPath(value).toLowerCase():value;
 a=normalize(a);b=normalize(b);return a===b||a.startsWith(b+paths.sep)||b.startsWith(a+paths.sep);
}
