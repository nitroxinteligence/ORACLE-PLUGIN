import {createHash,randomUUID} from 'node:crypto';
import {createReadStream,promises as fs,constants,openSync,readSync,closeSync,readFileSync,lstatSync} from 'node:fs';
import {dirname,resolve,join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createGunzip,createBrotliDecompress} from 'node:zlib';
import {setImmediate as yieldIO} from 'node:timers/promises';
import {runtimePlatform} from './runtime-payload-platform.mjs';
import {acquireRuntimeCacheLock,removeInterruptedRuntimePartials} from './runtime-cache-lock.mjs';
import {startRuntimeBootstrap} from './runtime-bootstrap.mjs';
import {runtimeBinarySource} from './runtime-binary-source.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Payload Oracle: ${message}`);};
const MAX_FILES=30000,MAX_BYTES=700_000_000,MAX_BUFFERED_HASH_BYTES=1_048_576;
function trace(stage){if(process.env.ORACLE_PORTABLE_STARTUP_TRACE==='1')process.stderr.write(`ORACLE_STARTUP ${stage} ${performance.now().toFixed(1)}ms\n`);}
async function digest(file,expectedBytes,signal){
  if(signal?.aborted)fail('cancelado');
  // Tiny admitted members use one bounded buffer and no per-read async jobs.
  // Tree admission yields regularly; large files always use cancellable chunks.
  if(Number.isSafeInteger(expectedBytes)&&expectedBytes>=0&&expectedBytes<=MAX_BUFFERED_HASH_BYTES){
    const handle=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
    try{
      const buffer=Buffer.alloc(expectedBytes);let cursor=0;
      while(cursor<buffer.length){const count=readSync(handle,buffer,cursor,buffer.length-cursor,cursor);if(!count)fail('cache alterado');cursor+=count;}
      if(readSync(handle,Buffer.alloc(1),0,1,cursor))fail('cache alterado');
      return hash(buffer);
    }finally{closeSync(handle);}
  }
  const handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const h=createHash('sha256'),buffer=Buffer.alloc(MAX_BUFFERED_HASH_BYTES);let position=0;
    while(true){if(signal?.aborted)fail('cancelado');const {bytesRead}=await handle.read(buffer,0,buffer.length,position);if(!bytesRead)break;h.update(buffer.subarray(0,bytesRead));position+=bytesRead;}
    return h.digest('hex');
  }finally{await handle.close();}
}
async function regular(file){const stat=await fs.lstat(file);if(!stat.isFile()||stat.nlink!==1)fail('arquivo irregular');return stat;}
function manifestRows(manifest,platform){
  if(!((manifest.schemaVersion===1&&manifest.format==='oracle-concat-gzip-v1')||(manifest.schemaVersion===2&&['oracle-concat-gzip-v2','oracle-concat-brotli-v2'].includes(manifest.format)))||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>MAX_FILES||!Number.isSafeInteger(manifest.expandedBytes)||manifest.expandedBytes>MAX_BYTES||!/^[a-f0-9]{64}$/.test(manifest.payloadSHA256)||!/^[a-f0-9]{64}$/.test(manifest.runtimeSHA256))fail('manifesto inválido');
  let total=0;const paths=new Set(),descriptors=new Map();for(const row of manifest.files){if(typeof row.path!=='string'||row.path.includes('\\')||row.path.includes('\0')||isAbsolute(row.path)||row.path.split('/').some(p=>!p||p==='.'||p==='..')||paths.has(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||!Number.isInteger(row.mode)||![0o644,0o755].includes(row.mode)||!/^[a-f0-9]{64}$/.test(row.sha256))fail('descritor inválido');platform.validateMember(row.path);if(row.source!==undefined){const original=descriptors.get(row.source);if(manifest.schemaVersion!==2||!original||original.source!==undefined||original.bytes!==row.bytes||original.sha256!==row.sha256||original.mode!==row.mode)fail('alias inválido');}descriptors.set(row.path,row);paths.add(row.path);total+=row.bytes;}
  for(const path of paths)for(let parent=dirname(path);parent!=='.';parent=dirname(parent))if(paths.has(parent))fail('conflito de caminhos');
  if(total!==manifest.expandedBytes||total>MAX_BYTES||paths.has(platform.runtimePath))fail('limite ou runtime inválido');return manifest.files;
}
async function verifyTree(root,rows,runtimeSHA256,signal,platform){
  trace('cache.inventory.start');
  const expected=new Set([...rows.map(row=>row.path),platform.runtimePath]);
  async function walk(directory){for(const item of await fs.readdir(directory,{withFileTypes:true})){if(signal?.aborted)fail('cancelado');const file=join(directory,item.name),relative=file.slice(root.length+1).replaceAll('\\','/'),stat=await fs.lstat(file);await platform.inspect(file);if(stat.isSymbolicLink())fail('link no cache');if(stat.isDirectory())await walk(file);else if(!expected.has(relative)||!stat.isFile()||stat.nlink!==1)fail('arquivo extra no cache');}}
  await walk(root);
  trace('cache.inventory.ready');let verified=0;
  for(const row of rows){if(signal?.aborted)fail('cancelado');const file=join(root,row.path),stat=await regular(file);if(stat.size!==row.bytes||(platform.enforceModes&&(stat.mode&0o777)!==row.mode)||await digest(file,row.bytes,signal)!==row.sha256)fail('cache alterado');if(++verified%1000===0)trace(`cache.files.${verified}`);if(verified%64===0)await yieldIO();}
  const runtime=join(root,platform.runtimePath),stat=await regular(runtime);if((platform.enforceModes&&(stat.mode&0o777)!==0o755)||await digest(runtime,undefined,signal)!==runtimeSHA256)fail('runtime alterado');
}
async function runtimePublished(destination,platform){
  let stat;try{stat=await fs.lstat(destination);}catch(error){if(error.code==='ENOENT')return false;throw error;}
  await platform.inspect(destination);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail('cache irregular');
  return true;
}
export async function materializeRuntime({packageRoot,dataDir,signal}={}){
  trace('materialize.start');
  if(signal?.aborted)fail('cancelado');
  const platform=await runtimePlatform();try{
  const manifestFile=join(packageRoot,'runtime-payload-manifest.json');const stat=await regular(manifestFile);if(stat.size>8_000_000)fail('manifesto excede limite');const bytes=await fs.readFile(manifestFile),manifest=JSON.parse(bytes),rows=manifestRows(manifest,platform),streamRows=rows.filter(row=>row.source===undefined);
  await platform.privateDirectory(dataDir);const cache=join(dataDir,'runtime-cache');await platform.privateDirectory(cache);const key=hash(bytes),destination=join(cache,key);
  // Package and published-cache admission are read-only. Each Desktop session
  // verifies the same immutable runtime independently, without waiting in a
  // writer queue. Only extraction and atomic publication need the cache lock.
  const payload=join(packageRoot,manifest.format==='oracle-concat-brotli-v2'?'runtime-payload.br':'runtime-payload.gz');await regular(payload);if(await digest(payload,undefined,signal)!==manifest.payloadSHA256)fail('checksum inválido');
  const binary=runtimeBinarySource({packageRoot,manifest}),runtime=binary.runtime;
  if(binary.packed){await platform.inspect(binary.packed.path);const compressed=await regular(binary.packed.path);if(compressed.size!==binary.packed.bytes||await digest(binary.packed.path,undefined,signal)!==binary.packed.sha256)fail('runtime compactado alterado');}
  await platform.inspect(runtime);const runtimeStat=await regular(runtime);if((binary.packed&&runtimeStat.size!==binary.packed.expandedBytes)||await digest(runtime,undefined,signal)!==manifest.runtimeSHA256)fail('runtime inválido');
  trace('package.ready');
  if(signal?.aborted)fail('cancelado');
  if(await runtimePublished(destination,platform)){await verifyTree(destination,rows,manifest.runtimeSHA256,signal,platform);return destination;}
  const release=await acquireRuntimeCacheLock({cache,key,signal});let verifyPublished=false;try{
  trace('writer.acquired');
  await removeInterruptedRuntimePartials({cache,key,platform});
  // Another process may have published while this session waited. Release the
  // writer lock before verifying its complete tree, just like a warm reader.
  if(await runtimePublished(destination,platform)){verifyPublished=true;}else{
  const staging=join(cache,`${key}.partial-${process.pid}-${randomUUID()}`);await platform.privateDirectory(staging);
  const source=createReadStream(payload),expanded=source.pipe(manifest.format==='oracle-concat-brotli-v2'?createBrotliDecompress():createGunzip());source.on('error',error=>expanded.destroy(error));const abort=()=>{source.destroy(new Error('cancelado'));expanded.destroy(new Error('cancelado'));};signal?.addEventListener('abort',abort,{once:true});
  let file;
  try{
    let index=0,written=0,checksum;async function open(){const row=streamRows[index];await fs.mkdir(dirname(join(staging,row.path)),{recursive:true,mode:0o700});file=await fs.open(join(staging,row.path),'wx',row.mode);checksum=createHash('sha256');written=0;}
    async function finish(){const row=streamRows[index];await file.close();file=null;await fs.chmod(join(staging,row.path),row.mode);if(checksum.digest('hex')!==row.sha256)fail('arquivo extraído difere');index++;}
    await open();for await(const chunk of expanded){if(signal?.aborted)fail('cancelado');let offset=0;while(offset<chunk.length){if(index===streamRows.length)fail('dados excedentes');const count=Math.min(chunk.length-offset,streamRows[index].bytes-written);if(count){const slice=chunk.subarray(offset,offset+count);let cursor=0;while(cursor<slice.length){const result=await file.write(slice,cursor);if(!result.bytesWritten)fail('escrita incompleta');cursor+=result.bytesWritten;}checksum.update(slice);written+=count;offset+=count;}if(written===streamRows[index].bytes){await finish();if(index<streamRows.length)await open();}}}
    while(index<streamRows.length&&streamRows[index].bytes===0){await finish();if(index<streamRows.length)await open();}if(index!==streamRows.length)fail('payload truncado');
    for(const row of rows.filter(row=>row.source!==undefined)){if(signal?.aborted)fail('cancelado');await fs.mkdir(dirname(join(staging,row.path)),{recursive:true,mode:0o700});await fs.copyFile(join(staging,row.source),join(staging,row.path),constants.COPYFILE_EXCL);await fs.chmod(join(staging,row.path),row.mode);}
    await fs.mkdir(join(staging,'runtime'),{recursive:true,mode:0o700});await fs.copyFile(runtime,join(staging,platform.runtimePath));await fs.chmod(join(staging,platform.runtimePath),0o755);await verifyTree(staging,rows,manifest.runtimeSHA256,signal,platform);
    try{await fs.rename(staging,destination);}catch(error){if(!['EEXIST','ENOTEMPTY'].includes(error.code))throw error;await verifyTree(destination,rows,manifest.runtimeSHA256,signal,platform);}return destination;
  }finally{await file?.close();source.destroy();expanded.destroy();signal?.removeEventListener('abort',abort);await fs.rm(staging,{recursive:true,force:true});}
  }
  }finally{await release();}
  if(verifyPublished){await verifyTree(destination,rows,manifest.runtimeSHA256,signal,platform);return destination;}
  }finally{platform.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const controller=new AbortController();
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>controller.abort());
  const report=error=>{process.stderr.write(`Oracle: ${error.message}\n`);process.exitCode=1;};
  try{
    const packageRoot=dirname(fileURLToPath(import.meta.url));
    const readMetadata=(member,limit)=>{const file=join(packageRoot,member),stat=lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>limit)fail('metadados irregulares');return readFileSync(file);};
    const version=JSON.parse(readMetadata('plugin.json',64_000)).version;
    const icons=[{src:`data:image/png;base64,${readMetadata('assets/icon-mono.png',5_000_000).toString('base64')}`,mimeType:'image/png',sizes:['1254x1254']}];
    startRuntimeBootstrap({signal:controller.signal,icons,version,onError:report,loadServer:async({signal})=>{
      const dataDir=process.env.ORACLE_PORTABLE_PLUGIN_DATA||process.env.PLUGIN_DATA;
      let root=await materializeRuntime({packageRoot,dataDir,signal}),activeVersion=version;
      const {createPluginRuntimeUpdates}=await import(pathToFileURL(join(root,'plugin-runtime-updates.mjs')).href);
      const {loadReviewedContentTrust}=await import(pathToFileURL(join(root,'content-admission.mjs')).href);
      const selected=await createPluginRuntimeUpdates({dataDir,trust:loadReviewedContentTrust(join(root,'resources')),bundleVersion:version}).selected({check:()=>{if(signal.aborted)fail('cancelado');}});
      if(selected){root=await materializeRuntime({packageRoot:selected.packageRoot,dataDir,signal});activeVersion=selected.version;}
      trace('materialize.ready');
      if(signal.aborted)fail('cancelado');
      process.chdir(root);
      const server=await import(pathToFileURL(join(root,'server.mjs')).href);
      trace('server.imported');
      if(signal.aborted)fail('cancelado');
      const handler=await server.createPortableServer({signal,icons,version:activeVersion,hostPackageRoot:packageRoot});
      trace('server.ready');
      return handler;
    }});
  }catch(error){report(error);}
}
