import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {accessSync,constants} from 'node:fs';
import {lstat,realpath,open,rename,unlink} from 'node:fs/promises';
import {dirname,basename,isAbsolute,join,normalize} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validatePNGStructure} from './mac-image-provider.mjs';

const execute=promisify(execFile);
const available=path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}};
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
/** Fixed JXA program uses Apple's Objective-C bridge and NSSavePanel. No UI
 * automation, dynamic script interpolation, own executable or ObjC callbacks.
 * runModal runs inside the Apple helper; abort terminates that helper.
 * https://developer.apple.com/documentation/appkit/nssavepanel
 * allowedFileTypes is the public legacy AppKit PNG/UTI restriction; still
 * available on macOS 13+, deprecated in favor of allowedContentTypes. JXA on
 * this host cannot import UniformTypeIdentifiers; no guessed UTType constant.
 * This selects a transient export destination, never a durable directory grant.
 * The writing process still needs its own actual filesystem access. */
export const MAC_PNG_SAVE_PANEL_SCRIPT=`ObjC.import('AppKit');
function run() {
  var app = $.NSApplication.sharedApplication;
  var panel = $.NSSavePanel.savePanel;
  panel.nameFieldStringValue = 'Oracle-universo.png';
  panel.allowedFileTypes = $.NSArray.arrayWithObject('png');
  panel.allowsOtherFileTypes = false;
  panel.canCreateDirectories = true;
  var response = panel.runModal;
  if (Number(response) !== 1) return JSON.stringify({cancelled:true});
  var url = panel.URL;
  if (!url || !url.isFileURL) throw new Error('Invalid file URL');
  return JSON.stringify({path:ObjC.unwrap(url.path)});
}`;
const fingerprint=stat=>stat?`${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`:null;
async function existing(path){try{const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())fail('export_destination_invalid','O destino não é um arquivo regular.');return stat;}catch(error){if(error.code==='ENOENT')return null;throw error;}}

/** Only the trusted system panel runner can supply a path. No destination input
 * is accepted. beforeCommit revalidates the caller's captured admission/scope.
 * Atomic rename uses the selected directory, with canonical/inode checks;
 * filesystem denial fails closed. It does not transfer helper security scope.
 * A hostile concurrent directory replacement requires an openat-based native
 * writer to eliminate the remaining check/rename race, not a fabricated grant. */
export function createMacSavePanelProvider({platform=process.platform,runner=execute,executableAvailable=available}={}) {
  const supported=platform==='darwin'&&executableAvailable('/usr/bin/osascript');
  let busy=false;
  const savePNG=async request=>{
    if(!supported)fail('host_capability_unsupported','O host não oferece um painel de exportação PNG.');
    if(!request||Object.keys(request).some(key=>!['bytes','signal','beforeCommit'].includes(key))||typeof request.beforeCommit!=='function')fail('invalid_export','Exportação requer validação de acesso.');
    const {signal,beforeCommit}=request;
    const checkpoint=async()=>{if(signal?.aborted)fail('operation_cancelled','Exportação cancelada.');await beforeCommit();if(signal?.aborted)fail('operation_cancelled','Exportação cancelada.');};
    const bytes=Buffer.from(request.bytes??[]);validatePNGStructure(bytes);
    if(busy)fail('export_busy','Aguarde o painel de exportação atual.');busy=true;
    let temp,handle;
    try {
      await checkpoint();
      let result;
      try{result=await runner('/usr/bin/osascript',['-l','JavaScript','-e',MAC_PNG_SAVE_PANEL_SCRIPT],{encoding:'utf8',shell:false,timeout:120000,maxBuffer:16384,signal});}
      catch(error){if(signal?.aborted)fail('operation_cancelled','Exportação cancelada.');fail('export_panel_unavailable','O macOS não concluiu o painel de exportação.');}
      await checkpoint();
      let selected;try{selected=JSON.parse(String(result.stdout??'').trim());}catch{fail('export_destination_invalid','O painel retornou um destino inválido.');}
      if(selected?.cancelled===true&&Object.keys(selected).length===1)return null;
      const path=selected?.path;
      if(Object.keys(selected??{}).length!==1||typeof path!=='string'||!isAbsolute(path)||normalize(path)!==path||/[\0\r\n]/.test(path)||Buffer.from(path).toString('utf8')!==path||!basename(path).toLowerCase().endsWith('.png'))fail('export_destination_invalid','Selecione um destino PNG válido.');
      const parent=dirname(path),canonical=await realpath(parent),parentStat=await lstat(parent);
      if(canonical!==parent||!parentStat.isDirectory()||parentStat.isSymbolicLink())fail('export_destination_invalid','A pasta selecionada mudou ou contém um link.');
      const previous=fingerprint(await existing(path));
      temp=join(parent,`.oracle-export-${randomUUID()}.tmp`);
      handle=await open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
      await handle.writeFile(bytes);await handle.sync();await handle.close();handle=null;
      const assertDestination=async()=>{if(await realpath(parent)!==canonical||fingerprint(await lstat(parent)).split(':').slice(0,2).join(':')!==fingerprint(parentStat).split(':').slice(0,2).join(':')||fingerprint(await existing(path))!==previous)fail('export_destination_changed','O destino mudou durante a exportação.');};
      await checkpoint();await assertDestination();
      await rename(temp,path);temp=null;
      return path;
    } finally {if(handle)await handle.close().catch(()=>{});if(temp)await unlink(temp).catch(()=>{});busy=false;}
  };
  return Object.freeze({savePNG,saveExportPNG:(bytes,{signal,beforeCommit,name='Oracle-universo.png'}={})=>{if(name!=='Oracle-universo.png')fail('invalid_export','Nome de exportação inválido.');return savePNG({bytes,signal,beforeCommit});}});
}
