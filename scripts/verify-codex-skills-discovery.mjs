// Read-only official app-server discovery of an actual isolated onboarding.
// No account/read, login, thread/start, model turn or personal configuration.
import fs from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {discoverCodexHost} from '../packages/oracle-desktop-portable/codex-host-provider.mjs';
import {createCodexAppServerTransport} from '../packages/oracle-desktop-portable/codex-connection-provider.mjs';

const reportPath=resolve(process.argv[2]||''),work=resolve('.work');
if(!process.argv[2]||!reportPath.startsWith(work+'/')||await fs.realpath(reportPath)!==reportPath)throw Error('Isolated onboarding report required');
const report=JSON.parse(await fs.readFile(reportPath,'utf8'));
if(!report.passed||!report.registrationVerified||!report.userHome?.startsWith(work+'/')||await fs.realpath(report.userHome)!==report.userHome||!report.vault?.startsWith(work+'/')||await fs.realpath(report.vault)!==report.vault)throw Error('Verified isolated registration required');
const cwd=join(report.userHome,'independent-project'),codexHome=join(report.userHome,'.codex');await fs.mkdir(cwd,{mode:0o700});await fs.mkdir(codexHome,{mode:0o700});
const destination=join(report.userHome,'.agents/skills'),paths=[];
for(const name of await fs.readdir(destination))paths.push(await fs.realpath(join(destination,name,'SKILL.md')));
const host=discoverCodexHost();if(!host.available)throw Error('Official signed Codex host unavailable');
const transport=createCodexAppServerTransport({executablePath:host.executablePath,cwd,environment:{HOME:report.userHome,CODEX_HOME:codexHome,PATH:'/usr/bin:/bin:/usr/sbin:/sbin',LANG:'en_US.UTF-8'},timeoutMS:30000});
try{
 const result=await transport.skillsList({cwd}),rows=(result.data||[]).flatMap(row=>row.skills||[]),errors=(result.data||[]).flatMap(row=>row.errors||[]),found=new Set();
 for(const row of rows.filter(row=>row.enabled&&row.scope==='user'))found.add(await fs.realpath(row.path));
 const missing=paths.filter(path=>!found.has(path));if(missing.length||errors.length)throw Error(JSON.stringify({missing,errors}));
 const verification={passed:true,officialSignedHost:true,request:'skills/list',expected:paths.length,discovered:paths.length,scope:'user',independentProject:true,isolatedUserHome:true,personalProfileUsed:false,accountRead:false,modelStarted:false};
 await fs.writeFile(join(dirname(reportPath),'codex-discovery.json'),JSON.stringify(verification,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(verification));
}finally{transport.close();}
