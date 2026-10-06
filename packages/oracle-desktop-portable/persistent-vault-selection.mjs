import fs from 'node:fs/promises';
const fail=code=>{throw Object.assign(new Error(code),{code});};

/** Trusted picker/bookmark composition only. A stored path or completion flag
 * never selects a vault. Restore resolves and activates a real OS bookmark,
 * verifies the originally selected directory identity, and retains the lease. */
export function createPersistentVaultSelection({chooseDirectory,bookmarks,profileStore}={}){
 if(typeof chooseDirectory!=='function'||!profileStore?.update)fail('vault_selection_provider_required');
 return Object.freeze({
  async selectVault(){
   const selected=await chooseDirectory();if(!selected)return null;
   const root=await fs.realpath(selected.path),selection={root,explicitSelection:true};
   if(bookmarks){selection.bookmark=await bookmarks.createBookmark({path:root,userInitiated:true});selection.lease=await bookmarks.acquireDirectoryGrant(selection.bookmark);}
   return selection;
  },
  async restoreVault(){
   if(!bookmarks)return null;
   const record=(await profileStore.load()).vaultSelection;if(!record)return null;
   if(record.schemaVersion!==1||!record.rootIdentity||!Number.isSafeInteger(record.rootIdentity.dev)||!Number.isSafeInteger(record.rootIdentity.ino))fail('invalid_directory_bookmark');
   const lease=await bookmarks.acquireDirectoryGrant(record.bookmark);
   try{const info=await fs.lstat(lease.path);lease.assertActive();if(info.isSymbolicLink()||!info.isDirectory()||info.dev!==record.rootIdentity.dev||info.ino!==record.rootIdentity.ino)fail('directory_grant_changed');return {root:lease.path,persistentSelection:true,lease};}catch(error){lease.release();throw error;}
  },
  async commitSelection(selection,{root,identity,check}){
   if(selection.persistentSelection)return;
   if(selection.bookmark&&selection.lease?.path!==root)fail('directory_grant_changed');
   check();await profileStore.update(profile=>({...profile,vaultSelection:selection.bookmark?{schemaVersion:1,bookmark:selection.bookmark,rootIdentity:{dev:identity.dev,ino:identity.ino}}:null}),{beforeCommit:check});check();
  },
  async forgetSelection(){await profileStore.update(profile=>({...profile,vaultSelection:null}));}
 });
}
