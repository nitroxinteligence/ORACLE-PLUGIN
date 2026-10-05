import {windowsLocalPath,windowsAncestors} from './portable-windows-paths.mjs';
const fail=(code,message=code)=>{throw Object.assign(new Error(message),{code});};
const invalid=0xffffffffffffffffn,numberHandle=value=>BigInt(value),same=(a,b)=>a.volumeSerial===b.volumeSerial&&a.fileID===b.fileID;
/** Source provider using only vendor Bun FFI and OS DLLs. Trusted composition
 * supplies systemDirectory; no environment/UI path chooses a library. HANDLEs
 * are unsigned 64-bit integers, not pointer arguments. Windows host unqualified.
 * inspectPath is metadata only; neither JSON metadata nor path grants I/O rights.
 * COM dialogs/WIC/export and persistence grants remain separate providers. */
export async function createWindowsNativeProvider({systemDirectory,platform=process.platform,architecture=process.arch,loadFFI}={}){
 if(platform!=='win32'||architecture!=='x64')fail('host_capability_unsupported');
 systemDirectory=windowsLocalPath(systemDirectory);if(!/\\System32$/i.test(systemDirectory))fail('windows_system_library_path_required');
 const ffi=await (loadFFI?loadFFI():import('bun:ffi'));
 const kernel=ffi.dlopen(systemDirectory+'\\kernel32.dll',{
  CreateFileW:{args:['ptr','u32','u32','ptr','u32','u32','u64'],returns:'u64'},
  GetFileInformationByHandleEx:{args:['u64','i32','ptr','u32'],returns:'i32'},
  GetFinalPathNameByHandleW:{args:['u64','ptr','u32','u32'],returns:'u32'},
  CloseHandle:{args:['u64'],returns:'i32'},GlobalAlloc:{args:['u32','u64'],returns:'u64'},
  GlobalLock:{args:['u64'],returns:'ptr'},GlobalUnlock:{args:['u64'],returns:'i32'},GlobalFree:{args:['u64'],returns:'u64'},
 });
 let user;try{user=ffi.dlopen(systemDirectory+'\\user32.dll',{CreateWindowExW:{args:['u32','ptr','ptr','u32','i32','i32','i32','i32','u64','u64','u64','ptr'],returns:'u64'},DestroyWindow:{args:['u64'],returns:'i32'},OpenClipboard:{args:['u64'],returns:'i32'},EmptyClipboard:{args:[],returns:'i32'},SetClipboardData:{args:['u32','u64'],returns:'u64'},CloseClipboard:{args:[],returns:'i32'}});}catch(error){kernel.close();throw error;}
 let closed=false;const live=()=>{if(closed)fail('windows_provider_closed');};
 const openMetadata=path=>{const wide=Buffer.from(path+'\0','utf16le'),handle=numberHandle(kernel.symbols.CreateFileW(ffi.ptr(wide),128,7,null,3,0x02200000,0n));if(handle===invalid||handle===0n)fail('windows_path_open_failed');return handle;};
 function metadata(handle){const attrs=Buffer.alloc(8),id=Buffer.alloc(24),standard=Buffer.alloc(24);if(!kernel.symbols.GetFileInformationByHandleEx(handle,9,ffi.ptr(attrs),8)||!kernel.symbols.GetFileInformationByHandleEx(handle,18,ffi.ptr(id),24)||!kernel.symbols.GetFileInformationByHandleEx(handle,1,ffi.ptr(standard),24))fail('windows_file_identity_unavailable');if(attrs.readUInt32LE(0)&0x400||attrs.readUInt32LE(4)!==0)fail('windows_reparse_point_denied');if(!standard[21]&&standard.readUInt32LE(16)!==1)fail('windows_hardlink_denied');const final=Buffer.alloc(65536);const length=kernel.symbols.GetFinalPathNameByHandleW(handle,ffi.ptr(final),32768,0);if(!length||length>=32768)fail('windows_path_resolution_failed');const raw=final.subarray(0,length*2).toString('utf16le');if(!raw.startsWith('\\\\?\\'))fail('windows_path_resolution_failed');const path=windowsLocalPath(raw.slice(4));return Object.freeze({path,volumeSerial:id.readBigUInt64LE(0).toString(),fileID:id.subarray(8,24).toString('hex'),directory:!!standard[21],bytes:standard.readBigUInt64LE(8).toString()});}
 return Object.freeze({
  // All ancestors are held while final metadata is inspected. Identity and
  // tags are checked again before return, without following junction/symlinks.
  inspectPath(path,{check,signal}={}){live();if(typeof check!=='function')fail('windows_admission_required');const handles=[];try{let final;for(const ancestor of windowsAncestors(path)){check();if(signal?.aborted)fail('operation_cancelled');const handle=openMetadata(ancestor),entry={handle,first:null};handles.push(entry);entry.first=metadata(handle);final=entry.first;}for(const entry of handles){check();const now=metadata(entry.handle);if(!same(entry.first,now)||entry.first.path!==now.path)fail('windows_file_identity_changed');}check();return final;}finally{for(const entry of handles.reverse())kernel.symbols.CloseHandle(entry.handle);}},
  copyText(text,{check,signal}={}){live();if(typeof check!=='function'||typeof text!=='string'||text.includes('\0')||Buffer.byteLength(text)>2000000)fail('windows_clipboard_input_invalid');check();if(signal?.aborted)fail('operation_cancelled');const bytes=Buffer.from(text+'\0','utf16le');let handle=0n,window=0n,opened=false,transferred=false;try{handle=numberHandle(kernel.symbols.GlobalAlloc(2,BigInt(bytes.length)));if(!handle)fail('windows_clipboard_memory_failed');const memory=kernel.symbols.GlobalLock(handle);if(!memory)fail('windows_clipboard_memory_failed');try{new Uint8Array(ffi.toArrayBuffer(memory,0,bytes.length)).set(bytes);}finally{kernel.symbols.GlobalUnlock(handle);}check();if(signal?.aborted)fail('operation_cancelled');const windowClass=Buffer.from('STATIC\0','utf16le'),title=Buffer.from('\0','utf16le');window=numberHandle(user.symbols.CreateWindowExW(0,ffi.ptr(windowClass),ffi.ptr(title),0,0,0,0,0,0xfffffffffffffffdn,0n,0n,null));if(!window)fail('windows_clipboard_window_failed');opened=!!user.symbols.OpenClipboard(window);if(!opened)fail('windows_clipboard_busy');check();if(!user.symbols.EmptyClipboard())fail('windows_clipboard_failed');check();if(signal?.aborted)fail('operation_cancelled');if(!numberHandle(user.symbols.SetClipboardData(13,handle)))fail('windows_clipboard_failed');transferred=true;check();return Object.freeze({copied:true});}finally{if(opened)user.symbols.CloseClipboard();if(window)user.symbols.DestroyWindow(window);if(handle&&!transferred)kernel.symbols.GlobalFree(handle);}},
  close(){if(!closed){closed=true;user.close();kernel.close();}},
 });
}
