import fs from 'node:fs/promises';
const fail=code=>{throw Object.assign(new Error(code),{code});};

/** Trusted picker/bookmark composition only. A stored path or completion flag
 * never selects a vault. Restore resolves and activates a real OS bookmark,
 * verifies the originally selected directory identity, and retains the lease. */
export function createPersistentVaultSelection({chooseDirectory,bookmarks,profileStore}={}){
 if(typeof chooseDirectory!=='function'||!profileStore?.update)fail('vault_selection_provider_required');
 return Object.freeze({
  async selectVault(){
   if(typeof bookmarks?.createBookmark!=='function'||typeof bookmarks?.acquireDirectoryGrant!=='function')fail('directory_grant_unavailable');
   const selected=await chooseDirectory();if(!selected)return null;
   const root=await fs.realpath(selected.path),selection={root,explicitSelection:true};
   if(bookmarks){selection.bookmark=await bookmarks.createBookmark({path:root,userInitiated:true});selection.lease=await bookmarks.acquireDirectoryGrant(selection.bookmark);}
   return selection;
  },
  async restoreVault(){
   const record=(await profileStore.load()).vaultSelection;if(!record)return null;
   if(typeof bookmarks?.acquireDirectoryGrant!=='function')fail('directory_grant_unavailable');
   if(record.schemaVersion!==1||!record.rootIdentity||!Number.isSafeInteger(record.rootIdentity.dev)||!Number.isSafeInteger(record.rootIdentity.ino))fail('invalid_directory_bookmark');
   // Relocation is admitted only by a resolved OS bookmark and the original
   // device/inode below. A saved path never grants access to a replacement.
   const lease=await bookmarks.acquireDirectoryGrant(record.bookmark,{allowRelocation:true});
   try{const info=await fs.lstat(lease.path);lease.assertActive();if(info.isSymbolicLink()||!info.isDirectory()||info.dev!==record.rootIdentity.dev||info.ino!==record.rootIdentity.ino)fail('directory_grant_changed');return {root:lease.path,persistentSelection:true,lease,previousRecord:record,bookmark:lease.bookmark||record.bookmark};}catch(error){lease.release();throw error;}
  },
  async commitSelection(selection,{root,identity,check}){
   if(selection.persistentSelection&&!selection.lease?.bookmark)return;
   if(selection.bookmark&&selection.lease?.path!==root)fail('directory_grant_changed');
   check();await profileStore.update(profile=>{
    check();
    // Another process can forget/change the selection while this process is
    // resolving its bookmark. Renewal must not resurrect that older grant.
    if(selection.persistentSelection&&JSON.stringify(profile.vaultSelection)!==JSON.stringify(selection.previousRecord))fail('vault_selection_changed');
    return {...profile,vaultSelection:selection.bookmark?{schemaVersion:1,bookmark:selection.bookmark,rootIdentity:{dev:identity.dev,ino:identity.ino}}:null};
   },{beforeCommit:check});check();
  },
  async forgetSelection(){await profileStore.update(profile=>({...profile,vaultSelection:null}));}
 });
}
