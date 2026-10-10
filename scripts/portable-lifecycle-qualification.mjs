/** Publisher-only proof checks. Reports must describe the same expanded ZIP. */
export function assertPortableLifecycleQualification({packed,lifecycle,recovery,packageReceiptSHA256}){
 const matches=report=>report?.passed===true&&report.personalProfileUsed===false&&report.payloadRoot===packed.payloadRoot&&report.packageReceiptSHA256===packageReceiptSHA256;
 if(!matches(lifecycle)||lifecycle.actualOSBookmark!==true||lifecycle.stableRunID!==true||lifecycle.concurrentProcesses!==2||lifecycle.dormantConversationResumed!==true||lifecycle.kernelLockRecoveredAfterCrash!==true||lifecycle.contentReinstalled!==false||lifecycle.protectedFilesPreserved!==true||lifecycle.revocationVerified!==true)
  throw Error('Exact packed restart, OS grant, dormant conversation, concurrency and preservation proof required');
 if(!matches(recovery)||recovery.actualOSBookmark!==true||recovery.actualStaleBookmark!==true||recovery.renewalPersisted!==true||recovery.originalDirectoryIdentityVerified!==true||recovery.relocatedExecutableVerified!==true||recovery.replacementDirectoryDenied!==true||recovery.originalFilePreserved!==true||recovery.profileMetadataPreserved!==true||recovery.pickerOnReopen!==false||recovery.accountAccessed!==false||recovery.installationExecuted!==false)
  throw Error('Exact packed stale OS bookmark renewal, directory identity and profile preservation proof required');
}
