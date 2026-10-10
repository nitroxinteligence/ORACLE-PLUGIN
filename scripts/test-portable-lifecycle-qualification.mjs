import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPortableLifecycleQualification} from './portable-lifecycle-qualification.mjs';
const receipt='a'.repeat(64),root='/synthetic/expanded-package';
const common={passed:true,personalProfileUsed:false,payloadRoot:root,packageReceiptSHA256:receipt,actualOSBookmark:true};
const lifecycle={...common,stableRunID:true,concurrentProcesses:2,dormantConversationResumed:true,kernelLockRecoveredAfterCrash:true,contentReinstalled:false,protectedFilesPreserved:true,revocationVerified:true};
const recovery={...common,actualStaleBookmark:true,renewalPersisted:true,originalDirectoryIdentityVerified:true,relocatedExecutableVerified:true,replacementDirectoryDenied:true,originalFilePreserved:true,profileMetadataPreserved:true,pickerOnReopen:false,accountAccessed:false,installationExecuted:false};
const proof={packed:{payloadRoot:root},packageReceiptSHA256:receipt,lifecycle,recovery};
test('matching isolated restart and actual stale bookmark proofs qualify',()=>assert.doesNotThrow(()=>assertPortableLifecycleQualification(proof)));
test('a recovery proof from another package cannot qualify the current ZIP',()=>{
 for(const patch of [{payloadRoot:'/another/expanded-package'},{packageReceiptSHA256:'b'.repeat(64)}])assert.throws(()=>assertPortableLifecycleQualification({...proof,recovery:{...recovery,...patch}}),/Exact packed stale/);
});
test('ordinary bookmark resolution cannot substitute for actual renewal proof',()=>{
 for(const patch of [{actualStaleBookmark:false},{renewalPersisted:false},{relocatedExecutableVerified:false}])assert.throws(()=>assertPortableLifecycleQualification({...proof,recovery:{...recovery,...patch}}));
});
test('replacement directory access and lost files or metadata stop publication',()=>{
 for(const patch of [{originalDirectoryIdentityVerified:false},{replacementDirectoryDenied:false},{originalFilePreserved:false},{profileMetadataPreserved:false}])assert.throws(()=>assertPortableLifecycleQualification({...proof,recovery:{...recovery,...patch}}));
});
test('personal state, account access or reinstallation cannot be recovery evidence',()=>{
 for(const patch of [{personalProfileUsed:true},{accountAccessed:true},{installationExecuted:true},{pickerOnReopen:true}])assert.throws(()=>assertPortableLifecycleQualification({...proof,recovery:{...recovery,...patch}}));
});
test('renewal proof does not replace the original restart and preservation gates',()=>{
 for(const patch of [{stableRunID:false},{contentReinstalled:true},{kernelLockRecoveredAfterCrash:false},{revocationVerified:false},{dormantConversationResumed:false}])assert.throws(()=>assertPortableLifecycleQualification({...proof,lifecycle:{...lifecycle,...patch}}),/Exact packed restart/);
});
