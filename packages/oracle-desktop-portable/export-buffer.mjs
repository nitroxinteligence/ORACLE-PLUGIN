import {randomUUID} from 'node:crypto';
import {validatePNGStructure} from './mac-image-provider.mjs';

export const MAX_EXPORT_BYTES=32*1024*1024;
export const MAX_EXPORT_CHUNK_BYTES=256*1024;
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
// Structure checks precede the platform decoder. They never replace decoding.
export function inspectPNG(input) {
  const data=Buffer.isBuffer(input)?input:Buffer.from(input);
  return {...validatePNGStructure(data),bytes:data.length};
}

/** Transport buffers only. The caller must provide trusted admission, current
 * scope, complete platform decoding and a real authorized save panel/provider.
 * No path from UI params is accepted as a destination or filesystem grant. */
export function createExportBuffer({scope,assertAdmission,decodePNG,savePNG,now=Date.now}={}){
  if([scope,assertAdmission,decodePNG,savePNG].some(value=>typeof value!=='function'))fail('export_unavailable','O host ainda não disponibiliza exportação PNG completa.');
  const buffers=new Map();
  const current=()=>JSON.stringify(scope());
  const check=context=>{assertAdmission(context);if(context?.signal?.aborted)fail('operation_cancelled','Exportação cancelada.');};
  const prune=()=>{const stamp=now(),value=current();for(const [id,row]of buffers)if(row.scope!==value||stamp<row.createdAt||stamp-row.createdAt>=900_000)buffers.delete(id);};
  const token=params=>{if(typeof params?.exportID!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.exportID))fail('invalid_export','Identificador de exportação inválido.');return params.exportID;};
  const rowFor=params=>{const id=token(params),row=buffers.get(id);if(!row)fail('expired_export','A imagem expirou. Gere novamente a visão atual.');return {id,row};};
  return {
    begin(params={},context){check(context);if(Object.keys(params).length)fail('invalid_export','Esta ação não aceita argumentos.');prune();if(buffers.size>=4)fail('export_busy','Aguarde a exportação atual.');const exportID=randomUUID();buffers.set(exportID,{scope:current(),createdAt:now(),parts:[],bytes:0,index:0});return {exportID,maximumBytes:MAX_EXPORT_BYTES,maximumChunkBytes:MAX_EXPORT_CHUNK_BYTES};},
    chunk(params,context){check(context);prune();const {row}=rowFor(params);const {index,base64}=params;
      if(Object.keys(params).some(key=>!['exportID','index','base64'].includes(key))||!Number.isSafeInteger(index)||index!==row.index||typeof base64!=='string'||base64.length>Math.ceil(MAX_EXPORT_CHUNK_BYTES/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail('invalid_export_chunk','Bloco da imagem inválido.');
      const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>MAX_EXPORT_CHUNK_BYTES||row.bytes+bytes.length>MAX_EXPORT_BYTES||bytes.toString('base64')!==base64)fail('invalid_export_chunk','Bloco excede o limite de exportação.');
      row.parts.push(bytes);row.bytes+=bytes.length;row.index++;return {accepted:true};},
    discard(params,context){check(context);prune();buffers.delete(token(params));return true;},
    async finish(params,context){check(context);prune();const {id,row}=rowFor(params);if(Object.keys(params).some(key=>key!=='exportID'))fail('invalid_export','Argumento de exportação inválido.');
      const data=Buffer.concat(row.parts,row.bytes),dimensions=inspectPNG(data);
      const checkpoint=()=>{check(context);if(current()!==row.scope||now()<row.createdAt||now()-row.createdAt>=900_000)fail('stale_export','O acesso ou a pasta mudou. A imagem não foi salva.');};
      const decoded=await decodePNG(data,{signal:context?.signal});checkpoint();
      if(decoded?.complete!==true||decoded?.type!=='public.png'||decoded?.count!==1||decoded.width!==dimensions.width||decoded.height!==dimensions.height)fail('invalid_png','Não foi possível confirmar o PNG completo.');
      buffers.delete(id);row.parts=[];
      const destination=await savePNG(data,{name:'Oracle-universo.png',signal:context?.signal,beforeCommit:checkpoint});checkpoint();
      if(destination!==null&&(typeof destination!=='string'||!destination.startsWith('/')))fail('export_unconfirmed','O host não confirmou a gravação da imagem.');return destination;
    },
    cancelAll(){buffers.clear();},
  };
}
