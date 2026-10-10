import fs from 'node:fs/promises';
import {join} from 'node:path';
import {latestRelease} from './release-network.mjs';
const repositories=Object.freeze({gbrain:'garrytan/gbrain',aiMemory:'akitaonrails/ai-memory'});
const newer=(next,current)=>{const a=next.split('.').map(Number),b=current.split('.').map(Number);for(let n=0;n<Math.max(a.length,b.length);n++)if((a[n]||0)!==(b[n]||0))return (a[n]||0)>(b[n]||0);return false;};
/** Consult original projects independently. An upstream version is a candidate;
 * executable admission still requires the qualified signed ORACLE release. */
export async function checkOriginalComponents({bundleRoot,fetchImpl,signal,check=()=>{},qualified}={}){
 const pins=JSON.parse(await fs.readFile(join(bundleRoot,'resources/updates/portable-upstream.json'),'utf8'));
 const rows=await Promise.all(Object.entries(repositories).map(async([key,repository])=>{
  const installed=pins[key],base={repository,currentVersion:installed.version,qualifiedVersion:qualified?.[key]?.version||null};
  try{check();const release=await latestRelease(repository,{fetchImpl,signal,check});if(!/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(release.tag_name))throw Error('Versão oficial incompatível.');check();
   const latestVersion=release.tag_name.slice(1);return [key,{...base,latestVersion,checked:true,available:newer(latestVersion,installed.version),qualified:qualified?.[key]?.version===latestVersion,releaseURL:`https://github.com/${repository}/releases/tag/${release.tag_name}`}];
  }catch(error){if(signal?.aborted)throw error;return [key,{...base,checked:false,error:String(error.message)}];}
 }));check();return Object.fromEntries(rows);
}
