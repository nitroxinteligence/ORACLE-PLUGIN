import {readFileSync,existsSync,realpathSync,openSync,closeSync,fstatSync,constants} from 'node:fs';
import {join} from 'node:path';
import {scopedNote,sha,canonical} from './scope.ts';

export function readIndexReceipt(path:string):any {
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try {
    const before=fstatSync(fd);
    if(!before.isFile()||before.nlink!==1||before.size>64_000_000||(before.size>0&&before.blocks===0))throw Error('Invalid index receipt file');
    const bytes=readFileSync(fd),after=fstatSync(fd);
    if(bytes.length!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('Index receipt changed while reading');
    const value=JSON.parse(bytes.toString('utf8'));
    if(value.receipt_sha256!==undefined||value.records?.some((row:any)=>row.page_hash!==undefined)) {
      const {receipt_sha256,...payload}=value;
      if(receipt_sha256!==sha(canonical(payload)))throw Error('Index receipt hash mismatch');
    }
    if(typeof value.root!=='string'||!Array.isArray(value.records)||value.records.length>60_000)throw Error('Invalid index receipt');
    const paths=new Set(),slugs=new Set();
    for(const row of value.records) {
      if(typeof row.path!=='string'||typeof row.slug!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256)||paths.has(row.path)||slugs.has(row.slug))throw Error('Invalid index ownership record');
      paths.add(row.path);slugs.add(row.slug);
    }
    return value;
  } finally {closeSync(fd)}
}

export function readCompleteManifest(profile=process.env.GBRAIN_HOME){
  if(!profile)return null;
  const path=join(profile,'oracle-vault-manifest.json');
  if(!existsSync(path))return null;
  const manifest=readIndexReceipt(path);
  if(manifest.complete!==true||!Array.isArray(manifest.records)||manifest.records.length>60_000||typeof manifest.root!=='string')return null;
  return manifest;
}
export function indexFreshness(){
  const profile=process.env.GBRAIN_HOME;
  if(!profile)return {state:'unavailable',complete:false};
  const manifest=readCompleteManifest(profile);
  const partial=existsSync(join(profile,'oracle-vault-checkpoint.json'))||existsSync(join(profile,'oracle-vault-pending.json'));
  // Only the native watcher can attest a whole live snapshot. This receipt is
  // historical evidence, not an assertion that no external edit occurred later.
  return {state:partial?'partial':manifest?'snapshot_verified':'stale',complete:!!manifest&&!partial,
          verified_at:manifest?.at||null,generation:manifest?.generation??null};
}
export function assertFreshPage(page:any){
  if(!page||page.source_id!=='oracle-vault')return page;
  const manifest=readCompleteManifest();
  const record=manifest?.records.find((r:any)=>r.slug===page.slug);
  const indexed=record?.indexed_content_hash??record?.page_hash;
  if(!record||typeof indexed!=='string'||!/^[a-f0-9]{64}$/.test(indexed)||indexed!==page.content_hash)throw Error('Derived index is stale or partial. Synchronize before opening this note; the canonical file is preserved.');
  const root=realpathSync(manifest.root),path=scopedNote(root,record.path);
  if(sha(readFileSync(path))!==record.sha256)throw Error('Canonical note changed after indexing. Synchronize before opening this result.');
  return {...page,canonical_path:path,indexed_hash:record.sha256,index_verified_at:manifest.at,freshness:'current_at_read'};
}
