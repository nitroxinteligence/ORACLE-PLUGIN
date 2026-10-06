import {createMacDefaultProviders} from './host-capabilities.mjs';
import {createMacImageProvider} from './mac-image-provider.mjs';
import {createMacSavePanelProvider} from './mac-save-panel-provider.mjs';
import {createWindowsNativeProvider} from './portable-windows-native.mjs';
import {createWindowsShellProvider,windowsSystemDirectory} from './windows-shell-provider.mjs';
import {createMacBookmarkProvider} from './mac-bookmark-provider.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
/** Composition chooses OS providers. Missing capabilities remain absent.
 * No Windows bookmarks, scheduler, image decoder, protected secret, device
 * binding, persistent grant or authentication is fabricated by this factory. */
export async function createPlatformHostProviders({platform=process.platform,architecture=process.arch,bunVersion=process.versions.bun,loadFFI,check=()=>{}}={}){
 if(platform==='darwin'){
  const images=createMacImageProvider({platform});
  return Object.freeze({...createMacDefaultProviders({platform}),...(['1.3.10','1.4.2'].includes(bunVersion)&&architecture==='arm64'?{directoryBookmarks:createMacBookmarkProvider({platform})}:{}),imageThumbnail:images.imageThumbnail,...(bunVersion==='1.3.10'?{validatePNG:images.validatePNG,saveExportPNG:createMacSavePanelProvider({platform}).saveExportPNG}:{})});
 }
 if(platform!=='win32')return Object.freeze({});
 if(architecture!=='x64'||bunVersion!=='1.3.10')fail('host_capability_unsupported');
 const systemDirectory=await windowsSystemDirectory({platform,loadFFI});
 const native=await createWindowsNativeProvider({systemDirectory,platform,architecture,loadFFI});
 let shell;try{shell=await createWindowsShellProvider({systemDirectory,platform,architecture,loadFFI,inspectPath:(path,options)=>native.inspectPath(path,{...options,check(){check();options?.check?.();}})});}catch(error){native.close();throw error;}
 return Object.freeze({...shell,systemDirectory,inspectPath:(path,options)=>native.inspectPath(path,options),copy:async(text,{signal}={})=>{native.copyText(text,{check,signal});return true;},close(){shell.close();native.close();}});
}
