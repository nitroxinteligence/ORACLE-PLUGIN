import {windowsLocalPath} from './portable-windows-paths.mjs';
import {validatedExternalURL} from './host-capabilities.mjs';
import {validatedCodexInterviewLink} from './codex-interview-link.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const wide=value=>Buffer.from(value+'\0','utf16le');
/** Kernel32 is a Windows KnownDLL. Resolve its system directory through the OS,
 * never from UI, persisted state or an environment-provided DLL location. */
export async function windowsSystemDirectory({platform=process.platform,loadFFI}={}){
 if(platform!=='win32')fail('host_capability_unsupported');
 const ffi=await(loadFFI?loadFFI():import('bun:ffi'));
 const library=ffi.dlopen('kernel32.dll',{GetSystemDirectoryW:{args:['ptr','u32'],returns:'u32'}});
 try{const output=Buffer.alloc(65536),length=library.symbols.GetSystemDirectoryW(ffi.ptr(output),32768);if(!length||length>=32768)fail('windows_system_library_path_required');return windowsLocalPath(output.subarray(0,length*2).toString('utf16le'));}finally{library.close();}
}
/** Source-only Windows x64 Shell32 provider. Calls are synchronous on Bun's
 * calling thread; COM STA is entered and balanced for each dialog/reveal.
 * Selection is ephemeral consent, not a persisted access token or ACL proof.
 * No shell command, PowerShell, callback, own DLL or executable is involved.
 * This native ABI candidate still requires execution in the target Windows host. */
export async function createWindowsShellProvider({systemDirectory,platform=process.platform,architecture=process.arch,loadFFI,inspectPath}={}){
 if(platform!=='win32'||architecture!=='x64'||typeof inspectPath!=='function')fail('host_capability_unsupported');
 systemDirectory=windowsLocalPath(systemDirectory);if(!/\\System32$/i.test(systemDirectory))fail('windows_system_library_path_required');
 const ffi=await(loadFFI?loadFFI():import('bun:ffi'));
 const ole=ffi.dlopen(systemDirectory+'\\ole32.dll',{CoInitializeEx:{args:['ptr','u32'],returns:'i32'},CoUninitialize:{args:[],returns:'void'},CoTaskMemFree:{args:['u64'],returns:'void'}});
 let shell;try{shell=ffi.dlopen(systemDirectory+'\\shell32.dll',{
  SHBrowseForFolderW:{args:['ptr'],returns:'u64'},SHGetPathFromIDListEx:{args:['u64','ptr','u32','u32'],returns:'i32'},
  SHParseDisplayName:{args:['ptr','ptr','ptr','u32','ptr'],returns:'i32'},SHOpenFolderAndSelectItems:{args:['u64','u32','ptr','u32'],returns:'i32'},
  ShellExecuteW:{args:['u64','ptr','ptr','ptr','ptr','i32'],returns:'u64'},
 });}catch(error){ole.close();throw error;}
 let closed=false;const live=()=>{if(closed)fail('windows_provider_closed');};
 const checkSignal=signal=>{live();if(signal?.aborted)fail('operation_cancelled');};
 const sta=operation=>{const hr=ole.symbols.CoInitializeEx(null,2);if(hr<0)fail('windows_com_apartment_unavailable');try{return operation();}finally{ole.symbols.CoUninitialize();}};
 return Object.freeze({
  async chooseDirectory({signal}={}){checkSignal(signal);return sta(()=>{
   const title=wide('Escolha a pasta do seu vault Obsidian para o Oracle'),display=Buffer.alloc(520),info=Buffer.alloc(64);
   info.writeBigUInt64LE(BigInt(ffi.ptr(display)),16);info.writeBigUInt64LE(BigInt(ffi.ptr(title)),24);info.writeUInt32LE(0x41,32);
   const pidl=BigInt(shell.symbols.SHBrowseForFolderW(ffi.ptr(info)));if(!pidl){checkSignal(signal);return null;}
   try{checkSignal(signal);const output=Buffer.alloc(65536);if(!shell.symbols.SHGetPathFromIDListEx(pidl,ffi.ptr(output),32768,0))fail('windows_directory_selection_invalid');
    const zero=output.indexOf(Buffer.from([0,0]));let end=zero;while(end>=0&&end%2)end=output.indexOf(Buffer.from([0,0]),end+1);if(end<0)fail('windows_directory_selection_invalid');
    const selected=windowsLocalPath(output.subarray(0,end).toString('utf16le')),identity=inspectPath(selected,{check:()=>checkSignal(signal),signal});if(!identity.directory)fail('windows_directory_selection_invalid');
    return Object.freeze({path:identity.path,authorization:'explicit-user-selection',mechanism:'windows-shell-folder-dialog',persistentGrant:false});
   }finally{ole.symbols.CoTaskMemFree(pidl);}
  });},
  async openExternal(value,{signal}={}){checkSignal(signal);const url=validatedExternalURL(value),verb=wide('open'),target=wide(url);const result=BigInt(shell.symbols.ShellExecuteW(0n,ffi.ptr(verb),ffi.ptr(target),null,null,1));if(result<=32n)fail('windows_external_open_failed');checkSignal(signal);return true;},
  async openCodex(value,{signal}={}){checkSignal(signal);const url=validatedCodexInterviewLink(value);if(url.length>=32760)throw Object.assign(new Error('O roteiro excede o limite de abertura do Windows. Use Copiar prompt e cole no Codex.'),{code:'codex_prompt_too_long'});const verb=wide('open'),target=wide(url);const result=BigInt(shell.symbols.ShellExecuteW(0n,ffi.ptr(verb),ffi.ptr(target),null,null,1));if(result<=32n)throw Object.assign(new Error('Codex não encontrado ou não abriu o roteiro. Use Copiar prompt e cole no Codex.'),{code:'codex_launch_unavailable'});checkSignal(signal);return true;},
  async reveal(value,{signal}={}){checkSignal(signal);const path=windowsLocalPath(value);inspectPath(path,{check:()=>checkSignal(signal),signal});return sta(()=>{const output=Buffer.alloc(8),attributes=Buffer.alloc(4),target=wide(path);if(shell.symbols.SHParseDisplayName(ffi.ptr(target),null,ffi.ptr(output),0,ffi.ptr(attributes))<0)fail('windows_reveal_failed');const pidl=output.readBigUInt64LE();if(!pidl)fail('windows_reveal_failed');try{checkSignal(signal);if(shell.symbols.SHOpenFolderAndSelectItems(pidl,0,null,0)<0)fail('windows_reveal_failed');checkSignal(signal);return true;}finally{ole.symbols.CoTaskMemFree(pidl);}});},
  close(){if(!closed){closed=true;shell.close();ole.close();}},
 });
}
