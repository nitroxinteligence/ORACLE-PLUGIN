import fs from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {skillsSHA} from './skills-release-admission.mjs';
import {pluginFilePath} from './plugin-release-admission.mjs';
const fail=()=>{throw Object.assign(new Error('O ZIP não corresponde ao pacote assinado.'),{code:'plugin_inventory_changed'});};

/** A signed, bounded ZIP32. No extractor, candidate code, links or arbitrary
 * paths are executed. Verify all entries before creating the private stage. */
export async function extractSignedPluginArchive(input,pack,destination,{check=()=>{}}={}){
 const bytes=Buffer.from(input);if(bytes.length!==pack.bytes||skillsSHA(bytes)!==pack.sha256||bytes.length>=100000000)fail();
 let end=-1;for(let n=bytes.length-22;n>=Math.max(0,bytes.length-65557);n--)if(bytes.readUInt32LE(n)===0x06054b50&&n+22+bytes.readUInt16LE(n+20)===bytes.length){end=n;break;}
 if(end<0)fail();const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),start=bytes.readUInt32LE(end+16);
 if(bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6)||bytes.readUInt16LE(end+8)!==count||count!==Object.keys(pack.files).length||count>100||start+size!==end)fail();
 const rows=[],seen=new Set(),ranges=[];let at=start,total=0;
 for(let n=0;n<count;n++){
  check();if(at+46>end||bytes.readUInt32LE(at)!==0x02014b50)fail();
  const flags=bytes.readUInt16LE(at+8),method=bytes.readUInt16LE(at+10),compressed=bytes.readUInt32LE(at+20),expanded=bytes.readUInt32LE(at+24),length=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32),attributes=bytes.readUInt32LE(at+38)>>>16,local=bytes.readUInt32LE(at+42);
  if(at+46+length+extra+comment>end||flags&1||![0,8].includes(method)||local+30>start||bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method)fail();
  const encoded=bytes.subarray(at+46,at+46+length),name=new TextDecoder('utf-8',{fatal:true}).decode(encoded),prefix=pack.name+'/';if(!name.startsWith(prefix))fail();
  const path=pluginFilePath(name.slice(prefix.length)),expected=pack.files[path],mode=attributes&0o777;
  if(!expected||seen.has(path)||expanded!==expected.bytes||mode!==expected.mode||![0,0x8000].includes(attributes&0xf000))fail();seen.add(path);total+=expanded;if(total>200000000)fail();
  const localLength=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),offset=local+30+localLength+localExtra;
  if(localLength!==length||!bytes.subarray(local+30,local+30+localLength).equals(encoded)||offset+compressed>start||ranges.some(([a,b])=>local<b&&offset+compressed>a))fail();ranges.push([local,offset+compressed]);
  const encodedContent=bytes.subarray(offset,offset+compressed),content=method===0?encodedContent:inflateRawSync(encodedContent,{maxOutputLength:Math.max(1,expanded)});
  if(content.length!==expanded||skillsSHA(content)!==expected.sha256)fail();rows.push({path,content,mode});at+=46+length+extra+comment;
 }
 if(at!==end||seen.size!==Object.keys(pack.files).length)fail();
 for(const row of rows){check();const path=join(destination,row.path);await fs.mkdir(dirname(path),{recursive:true,mode:0o700});await fs.writeFile(path,row.content,{flag:'wx',mode:row.mode});await fs.chmod(path,row.mode);}
 check();return {files:rows.length,expandedBytes:total};
}
