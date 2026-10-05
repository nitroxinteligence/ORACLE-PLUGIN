import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {verifyPortableContentManifest,canonicalContentJSON,PORTABLE_CONTENT_DOMAIN} from '../packages/oracle-desktop-portable/content-admission.mjs';
import {createCodexInstallationProvider} from '../packages/oracle-desktop-portable/codex-installation-provider.mjs';

// Opt-in: actual publisher signature and method bytes. Policy/vault/index
// context below is DECLARED synthetic composition, not a real Codex session.
async function sourceFixture(){
 if(process.env.ORACLE_CODEX_INSTALL_PAYLOAD_ROOT){const root=resolve(process.env.ORACLE_CODEX_INSTALL_PAYLOAD_ROOT);return {admitted:verifyPortableContentManifest(await fs.readFile(join(root,'resources/updates/portable-content.json'))),methodRoot:join(root,'resources/gbrain-method')};}
 const root=resolve('.work/portable-content-source-readiness');return {admitted:verifyPortableContentManifest(await fs.readFile(join(root,'portable-content-real-current.json'))),methodRoot:join(root,'payload-real-current/resources/gbrain-method')};
}
test('signed method workspace preserves edits, rejects forged source and revoked epoch, no secondary MCP', {skip:process.env.ORACLE_CODEX_INSTALL_REAL_TEST!=='1'},async()=>{
 const base=resolve('.work/portable-codex-installation-test');await fs.mkdir(base,{recursive:true});const dataDir=await fs.mkdtemp(join(base,'synthetic-'));
 const {admitted,methodRoot}=await sourceFixture();
 await fs.mkdir(join(dataDir,'installed-method'),{recursive:true});await fs.cp(methodRoot,join(dataDir,'installed-method',admitted.manifestSHA256),{recursive:true});
 const root=join(dataDir,'synthetic-vault');await fs.mkdir(root);let active=true,generation=1,ready=false;const ticket=Object.freeze({capability:'configure',generation:1});
 const policy={assertAdmission(t){if(!active||t!==ticket)throw Object.assign(new Error('stale'),{code:'stale_admission'});},async revalidateAdmission(t){this.assertAdmission(t);}};
 const vault={status:()=>({selected:true,root,generation})};
 const provider=createCodexInstallationProvider({policy,vault,dataDir,bundleRoot:resolve('packages/oracle-desktop-portable'),installationStatus:()=>({localContentVerified:ready,indexVerified:ready,manifestSHA256:admitted.manifestSHA256})});
 await assert.rejects(provider({ticket}),{code:'codex_installation_pending'});
 assert.throws(()=>provider.admit({admitted:{...admitted}},{ticket}),{code:'unadmitted_content'});
 provider.admit({admitted},{ticket});await assert.rejects(provider({ticket}),{code:'codex_installation_pending'});ready=true;
 const installed=await provider({ticket});assert.equal(installed.requiredPaths.length,2);assert.equal(installed.installedBytesVerified,true);assert.equal(installed.discoveryVerified,false);assert.equal(installed.modelExecutionVerified,false);assert.equal(installed.hooksTrusted,false);assert.equal(installed.mcpConnected,false);
 assert.equal(JSON.parse(await fs.readFile(join(installed.workspace,'.oracle/plugin-mcp.json'),'utf8')).executable,false);await assert.rejects(fs.stat(join(installed.workspace,'.codex/hooks.json')),{code:'ENOENT'});await assert.rejects(fs.stat(join(installed.workspace,'.codex/config.toml')),{code:'ENOENT'});
 const path=installed.requiredPaths[0],before=await fs.readFile(path);await fs.writeFile(path,'# User edit retained\n');await assert.rejects(installed.verifyManagedFiles(),{code:'codex_installation_conflict'});await assert.rejects(provider({ticket}),{code:'codex_installation_conflict'});assert.equal(await fs.readFile(path,'utf8'),'# User edit retained\n');await fs.writeFile(path,before);
 await installed.verifyManagedFiles();generation++;assert.throws(()=>installed.assertCurrent(),{code:'codex_installation_changed'});generation--;active=false;await assert.rejects(installed.verifyManagedFiles(),{code:'stale_admission'});
 const receipt={passed:true,syntheticPolicy:true,syntheticVault:true,syntheticIndexContext:true,realPublisherSignature:true,realMethodBytes:true,workspace:installed.workspace,managedFiles:installed.filesInstalled,sourceSHA256:admitted.manifestSHA256,discoveryVerified:false,modelExecutionVerified:false,hooksTrusted:false,secondaryMCP:false,preservedEditSHA256:createHash('sha256').update('# User edit retained\n').digest('hex')};await fs.writeFile(join(dataDir,'result.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
});

test('release changes preserve legacy and prior workspaces, resume idempotently and revoke prior authority', {skip:process.env.ORACLE_CODEX_INSTALL_REAL_TEST!=='1'},async()=>{
 const base=resolve('.work/portable-codex-installation-test');await fs.mkdir(base,{recursive:true});const dataDir=await fs.mkdtemp(join(base,'upgrade-'));
 const {admitted:first,methodRoot}=await sourceFixture(),root=join(dataDir,'synthetic-vault');await fs.mkdir(root);
 const ticket=Object.freeze({capability:'configure',generation:1}),policy={assertAdmission(t){assert.equal(t,ticket);},async revalidateAdmission(t){this.assertAdmission(t);}},vault={status:()=>({selected:true,root,generation:1})};
 let admitted=first;const provider=createCodexInstallationProvider({policy,vault,dataDir,bundleRoot:resolve('packages/oracle-desktop-portable'),installationStatus:()=>({localContentVerified:true,indexVerified:true,manifestSHA256:admitted.manifestSHA256})});
 await fs.mkdir(join(dataDir,'installed-method'),{recursive:true});await fs.cp(methodRoot,join(dataDir,'installed-method',first.manifestSHA256),{recursive:true});
 // An older release used only the vault digest and wrote a different signed
 // plan into AGENTS.md. Preserve even user additions in that old directory.
 const legacy=join(dataDir,'codex-workspaces',createHash('sha256').update(root).digest('hex'));
 await fs.mkdir(join(legacy,'.oracle'),{recursive:true});const oldAgents=Buffer.from('# Oracle System workspace\nPlano assinado: '+ 'a'.repeat(64)+'\n');
 await fs.writeFile(join(legacy,'AGENTS.md'),oldAgents);await fs.writeFile(join(legacy,'personal.md'),'# Preserve legacy user work\n');
 const oldReceipt=Buffer.from(JSON.stringify({schemaVersion:1,owner:'OracleSystem',manifestSHA256:'a'.repeat(64),authorityRestored:false}));await fs.writeFile(join(legacy,'.oracle/managed-installation.json'),oldReceipt);
 provider.admit({admitted},{ticket});const installed=await provider({ticket});assert.notEqual(installed.workspace,legacy);assert.equal((await provider({ticket})).workspace,installed.workspace);
 assert.deepEqual(await fs.readFile(join(legacy,'AGENTS.md')),oldAgents);assert.deepEqual(await fs.readFile(join(legacy,'.oracle/managed-installation.json')),oldReceipt);assert.equal(await fs.readFile(join(legacy,'personal.md'),'utf8'),'# Preserve legacy user work\n');
 // A distinct signed plan with the same actual method is enough to reproduce
 // the previous update collision. This signature is synthetic, never trusted
 // by the installed product or saved as live authority.
 const pair=generateKeyPairSync('ed25519'),trust={schema_version:1,algorithm:'Ed25519',keys:[{id:'synthetic-upgrade',public_key_base64:pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64')}]};
 const manifest=structuredClone(first.manifest);manifest.sequence++;manifest.release_id='synthetic-codex-upgrade';const payload=canonicalContentJSON(manifest);
 admitted=verifyPortableContentManifest(canonicalContentJSON({schema_version:manifest.contract,key_id:'synthetic-upgrade',payload_base64:payload.toString('base64'),signature_base64:sign(null,Buffer.concat([Buffer.from(PORTABLE_CONTENT_DOMAIN),payload]),pair.privateKey).toString('base64')}),{trust});
 await fs.cp(methodRoot,join(dataDir,'installed-method',admitted.manifestSHA256),{recursive:true});
 const previousAgents=await fs.readFile(join(installed.workspace,'AGENTS.md'));await fs.writeFile(join(installed.workspace,'personal.md'),'# Preserve prior release work\n');
 provider.admit({admitted},{ticket});assert.throws(()=>installed.assertCurrent(),{code:'codex_installation_changed'});
 const updated=await provider({ticket});assert.notEqual(updated.workspace,installed.workspace);assert.equal((await provider({ticket})).workspace,updated.workspace);await updated.verifyManagedFiles();
 assert.deepEqual(await fs.readFile(join(installed.workspace,'AGENTS.md')),previousAgents);assert.equal(await fs.readFile(join(installed.workspace,'personal.md'),'utf8'),'# Preserve prior release work\n');
 assert.equal(JSON.parse(await fs.readFile(join(updated.workspace,'.oracle/managed-installation.json'))).schemaVersion,2);
 const path=updated.requiredPaths[0];await fs.writeFile(path,'# User edit in current release\n');
 await assert.rejects(provider({ticket}),error=>{assert.equal(error.code,'codex_installation_conflict');assert.equal(error.path,path);assert(error.message.includes(path));return true;});assert.equal(await fs.readFile(path,'utf8'),'# User edit in current release\n');
});
