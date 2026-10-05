import {join,isAbsolute} from 'node:path';

/** A packed Windows runtime is admitted by the launcher before this code runs. */
export function runtimeBinarySource({packageRoot,manifest,hostPlatform=process.platform,execPath=process.execPath}){
 const packed=manifest.packedRuntime;
 if(packed===undefined)return {runtime:join(packageRoot,hostPlatform==='win32'?'runtime/bun.exe':'runtime/bun')};
 if(hostPlatform!=='win32'||manifest.schemaVersion!==2||packed.path!=='runtime/bun.exe.gz'
    ||!/^[a-f0-9]{64}$/.test(packed.sha256)||!Number.isSafeInteger(packed.bytes)||packed.bytes<=0||packed.bytes>=100_000_000
    ||!Number.isSafeInteger(packed.expandedBytes)||packed.expandedBytes<=0||packed.expandedBytes>268_435_456
    ||!isAbsolute(execPath)||!execPath.toLowerCase().endsWith('bun.exe'))throw new Error('Payload Oracle: runtime compactado inválido');
 return {runtime:execPath,packed:{...packed,path:join(packageRoot,packed.path)}};
}
