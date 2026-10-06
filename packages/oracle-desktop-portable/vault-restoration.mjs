import {createHash} from 'node:crypto';

/** A conversation can predate another conversation's explicit selection.
 * The persisted record is only a change hint; restore must acquire and verify
 * the real OS grant. Concurrent UI polls share one attempt. */
export function createVaultRestoration({profileStore,canRestore,restore,revision=()=>0}){
 let pending=null,lastAttempt=null;
 const ensure=()=>{
  if(pending)return pending;
  if(!canRestore())return Promise.resolve(false);
  pending=Promise.resolve().then(async()=>{
   if(!canRestore())return false;
   const profile=await profileStore.load();
   if(!canRestore())return false;
   const key=createHash('sha256').update(JSON.stringify([revision(),profile.vaultSelection??null])).digest('hex');
   if(key===lastAttempt)return false;
   const result=await restore();lastAttempt=key;return result;
  }).finally(()=>{pending=null;});
  return pending;
 };
 return Object.freeze({ensure,async settled(){await pending;}});
}
