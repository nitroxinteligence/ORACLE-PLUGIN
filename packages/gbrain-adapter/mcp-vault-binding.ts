/** Workspace configuration is a grant to one reviewed vault selection, not to
 * whichever vault later occupies the reusable profile directory. */
import {existsSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
function bounded(path:string,limit:number):Buffer {
 const before=lstatSync(path);
 if(!before.isFile()||before.isSymbolicLink()||before.size>limit||(before.size>0&&before.blocks===0)||realpathSync(path)!==path)throw Error('MCP vault binding file is unavailable or unsafe');
 const bytes=readFileSync(path),after=lstatSync(path);
 if(bytes.length!==before.size||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs||after.size!==before.size)throw Error('MCP vault binding changed during read');
 return bytes;
}
export function captureMcpVaultBinding(profile:string,expectedVault:string|undefined,expectedEpoch:string|undefined){
 const canonical=resolve(profile),epochFile=join(dirname(canonical),'vault-epoch.json');
 const epoch=()=>existsSync(epochFile)?bounded(epochFile,4096):Buffer.alloc(0);
 const owner=()=>{
  if(realpathSync(canonical)!==canonical||lstatSync(canonical).isSymbolicLink())throw Error('MCP profile binding path changed');
  const value=JSON.parse(bounded(join(canonical,'oracle-owned.json'),32_000).toString('utf8'));
  if(value.owner!=='OracleCompanion'||value.schema_version!==2||typeof value.vault_root!=='string')throw Error('MCP ownership binding is invalid');
  return value.vault_root as string;
 };
 // Never synthesize a reviewed grant from the current profile for legacy config.
 // Initialization/tools discovery remains compatible; requests ask for reprepare.
 const boundVault=owner(),boundEpoch=hash(epoch());
 return ()=>{
  if(!expectedVault||!expectedEpoch)throw Error('This Oracle workspace has no reviewed MCP vault binding. Prepare the Codex connection again before using memory.');
  if(!/^[a-f0-9]{64}$/.test(expectedEpoch)||resolve(expectedVault)!==expectedVault||realpathSync(expectedVault)!==expectedVault)throw Error('The Oracle workspace vault binding is invalid. Prepare the connection again.');
  if(expectedVault!==boundVault||expectedEpoch!==boundEpoch||owner()!==expectedVault||hash(epoch())!==expectedEpoch)throw Error('The selected vault or its revision changed. Prepare the Oracle connection again before using memory.');
 };
}
