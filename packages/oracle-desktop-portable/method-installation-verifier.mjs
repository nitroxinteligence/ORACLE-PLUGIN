import {constants,openSync,closeSync,lstatSync,realpathSync,fstatSync,readSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertAdmittedContentManifest,loadAdmittedContentFile,verifyContentFile,PORTABLE_CONTENT_PINS as pins,portableContentPath} from './content-admission.mjs';
const receipts=new WeakSet();
const fail=code=>{throw Object.assign(new Error(code),{code});};
const sha=b=>createHash('sha256').update(b).digest('hex');
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
const relative=path=>{portableContentPath('resources/gbrain-method/'+path);return path;};
function installedFile(root,path,limit,check){
 if(typeof root!=='string'||resolve(root)!==root||realpathSync(root)!==root)fail('invalid_method_root');
 let target=root;const chain=[root];for(const segment of relative(path).split('/')){target=join(target,segment);chain.push(target);}
 const stamps=chain.map(value=>{const entry=lstatSync(value);if(entry.isSymbolicLink())fail('method_symlink');return entry;});
 if(!stamps[0].isDirectory()||stamps.slice(0,-1).some(s=>!s.isDirectory()))fail('invalid_method_root');
 const fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const before=fstatSync(fd);if(!before.isFile()||before.nlink!==1||before.size>limit||!same(before,stamps.at(-1)))fail('method_file_changed');
  const buffer=Buffer.alloc(limit+1);let length=0;while(length<buffer.length){const n=readSync(fd,buffer,length,buffer.length-length,null);if(!n)break;length+=n;}
  const after=fstatSync(fd);check();if(length>limit||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||!chain.every((p,i)=>{const current=lstatSync(p);return !current.isSymbolicLink()&&same(current,stamps[i]);}))fail('method_file_changed');return buffer.subarray(0,length);
 }finally{closeSync(fd);}
}
/** Verifies the complete native pinned method corpus, not a receipt flag or one
 * manifest file. Roots/check callbacks are trusted composition only. This proves
 * reference bytes/routes; it does not execute methods, discover Codex or trust hooks. */
export async function verifyGBrainMethodInstallation({admitted,payloadRoot,methodRoot,check=()=>{}}={}){
 assertAdmittedContentManifest(admitted);if((payloadRoot===undefined)===(methodRoot===undefined))fail('method_verification_root_required');
 const inventory=new Map(admitted.manifest.files.map(file=>[file.path,file]));
 const read=path=>{check();const source='resources/gbrain-method/'+relative(path),entry=inventory.get(source);if(!entry)fail('method_inventory_incomplete');
  const bytes=methodRoot===undefined?loadAdmittedContentFile(admitted,source,payloadRoot):installedFile(methodRoot,path,entry.bytes,check);verifyContentFile(admitted,source,bytes);check();return bytes;};
 const manifestBytes=read('manifest.json');if(sha(manifestBytes)!==pins.methodManifestSHA256)fail('method_pin_changed');let manifest;
 try{manifest=JSON.parse(manifestBytes);}catch{fail('invalid_method_manifest');}
 if(manifest.schema_version!==1||manifest.id!=='gbrain-official-method'||manifest.version!==pins.gbrainVersion||manifest.commit!==pins.gbrainCommit||manifest.source!=='pinned_git_objects_only'||manifest.license!=='MIT'||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>5000)fail('invalid_method_manifest');
 const files=new Map();let verifiedBytes=manifestBytes.length;
 if([...inventory.keys()].filter(path=>path.startsWith('resources/gbrain-method/')).length!==manifest.files.length+1)fail('method_inventory_incomplete');
 for(const [i,row] of manifest.files.entries()){
  const path=relative(row.path);if(files.has(path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>32000000||!/^[a-f0-9]{64}$/.test(row.sha256))fail('invalid_method_manifest');
  const signed=inventory.get('resources/gbrain-method/'+path);if(!signed||signed.sha256!==row.sha256||signed.bytes!==row.bytes)fail('method_inventory_incomplete');
  const bytes=read(path);if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)fail('method_file_changed');files.set(path,row);verifiedBytes+=bytes.length;
  if(i%50===0){await new Promise(resolve=>setImmediate(resolve));check();}
 }
 const resolver=JSON.parse(read('resolver.json')),references=JSON.parse(read('references.json'));
 if(resolver.schema_version!==1||resolver.automatic_invocation!==false||!Array.isArray(resolver.routes)||resolver.routes.length!==manifest.method_count||!files.has(resolver.upstream_resolver)||references.schema_version!==1||!Array.isArray(references.references))fail('invalid_method_resolver');
 const routes=new Set();for(const route of resolver.routes){if(typeof route.name!=='string'||routes.has(route.name)||route.execution!=='reference_only'||!files.has(route.path)||!Array.isArray(route.triggers))fail('invalid_method_resolver');routes.add(route.name);}
 let packagedReferences=0,unavailableReferences=0;
 for(const reference of references.references){if(!files.has('upstream/'+relative(reference.from)))fail('invalid_method_reference');
  if(reference.status==='packaged'){const target='upstream/'+relative(reference.target);if(!files.has(target)&&![...files.keys()].some(path=>path.startsWith(target+'/')))fail('invalid_method_reference');packagedReferences++;}
  else if(reference.status==='upstream_example_or_unavailable')unavailableReferences++;else fail('invalid_method_reference');
 }
 if(!files.has(manifest.license_path))fail('method_license_missing');check();
 const receipt=Object.freeze({manifestSHA256:admitted.manifestSHA256,methodManifestSHA256:pins.methodManifestSHA256,filesVerified:files.size+1,bytesVerified:verifiedBytes,routesVerified:routes.size,packagedReferencesVerified:packagedReferences,unavailableReferences,verifiedAt:new Date().toISOString(),scope:methodRoot===undefined?'signed-source':'installed-private-method',runtimeVerified:false,
  discovery:Object.freeze({id:manifest.id,version:manifest.version,commit:manifest.commit,status:'verified_reference_bytes',methodCount:manifest.method_count,skills:Object.freeze(resolver.routes.map(r=>Object.freeze(r))),license:'MIT',runtimeVerified:false})});receipts.add(receipt);return receipt;
}
export function assertVerifiedGBrainMethod(receipt){if(!receipts.has(receipt))fail('unverified_method_receipt');return receipt;}
