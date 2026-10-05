import {win32} from 'node:path';
const fail=()=>{throw Object.assign(new Error('Caminho Windows fora do contrato local revisado.'),{code:'windows_path_unsupported'});};
const reserved=/^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i;
function component(value){if(!value||value==='.'||value==='..'||/[<>:"/\\|?*\x00-\x1f]/.test(value)||/[. ]$/.test(value)||reserved.test(value)||value.length>255)fail();return value;}
/** Lexical validation only, never a vault grant. Initial scope is local drives;
 * UNC/network/device/ADS/relative/reserved aliases fail closed. Native handles,
 * reparse tags, volume and file IDs must also be checked by the I/O provider. */
export function windowsLocalPath(value){if(typeof value!=='string'||value.length>32760||!/^([A-Za-z]):\\/.test(value)||value.includes('/'))fail();const drive=value.slice(0,2).toUpperCase(),tail=value.slice(3);if(tail)for(const item of tail.split('\\'))component(item);const result=drive+'\\'+tail;if(win32.normalize(result)!==result)fail();return result;}
export function windowsRelativePath(value){if(typeof value!=='string'||value.length>32760||value.startsWith('\\')||value.includes('/'))fail();for(const part of value.split('\\'))component(part);return value;}
export function windowsContainedPath(root,relative){root=windowsLocalPath(root);relative=windowsRelativePath(relative);return windowsLocalPath(win32.join(root,relative));}
export function windowsAncestors(value){value=windowsLocalPath(value);const result=[value.slice(0,3)];let current=value.slice(0,3);for(const item of value.slice(3).split('\\').filter(Boolean)){current=win32.join(current,item);result.push(current);}return result;}
