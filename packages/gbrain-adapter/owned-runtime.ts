/** Process-local boundary around the official engine; never edits its config.
 * No credential discovery or gateway configuration is performed by Oracle. */
import {existsSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {loadConfig,type GBrainConfig} from '../../vendor/gbrain/src/core/config.ts';
import {isAvailable} from '../../vendor/gbrain/src/core/ai/gateway.ts';
import type {BrainEngine} from '../../vendor/gbrain/src/core/engine.ts';
import {assertRuntimeAvailable} from './runtime-gate.ts';

export function ownedConfig():GBrainConfig {
  const input=process.env.GBRAIN_HOME;
  if (!input) throw Error('Explicit Oracle profile required');
  const profile=realpathSync(input);
  assertRuntimeAvailable(profile);
  if (resolve(input)!==profile || lstatSync(input).isSymbolicLink()) throw Error('Profile symlink refused');
  const marker=join(profile,'oracle-owned.json');
  if (!existsSync(marker) || lstatSync(marker).isSymbolicLink()) throw Error('Missing Oracle ownership receipt');
  const owner=JSON.parse(readFileSync(marker,'utf8'));
  if (owner.owner!=='OracleCompanion' || owner.schema_version!==2 || typeof owner.vault_root!=='string') throw Error('Invalid Oracle ownership receipt');
  const configDir=join(profile,'.gbrain'),file=join(configDir,'config.json');
  if (lstatSync(configDir).isSymbolicLink() || lstatSync(file).isSymbolicLink()) throw Error('Configuration symlink refused');
  // Do not even open a secrets sidecar. A separately configured installation
  // must use attach/read-only, not this owned write-through MCP surface.
  if (existsSync(join(configDir,'.env'))) throw Error('Secret-bearing profiles are not supported by the isolated Oracle adapter');
  const raw=JSON.parse(readFileSync(file,'utf8'));
  const forbidden=(obj:any):boolean => !!obj && typeof obj==='object' && Object.entries(obj).some(([key,value])=>
    ((/api.?key|token|credential|database_url|base_url|embedding_model|chat_model|expansion_model|reranker_model/i.test(key) && !!value) || (typeof value==='object' && forbidden(value))));
  if (raw.embedding_disabled!==true || forbidden(raw)) throw Error('Provider/remote configuration is outside the Oracle adapter boundary');
  const allow=new Set(['PATH','HOME','TMPDIR','LANG','LC_ALL','GBRAIN_HOME','ORACLE_CANCEL_FILE','ORACLE_RECEIPT_DIR','ORACLE_PLAN_EVENTS_DIR','ORACLE_OWNED_ONLY']);
  for (const key of Object.keys(process.env)) if (!allow.has(key)) delete process.env[key];
  process.env.HOME=profile;process.env.GBRAIN_HOOKS='0';process.env.GBRAIN_SKIP_UPDATE_CHECK='1';
  const config=loadConfig();
  if (!config || config.engine!=='pglite' || !config.database_path) throw Error('Oracle requires its isolated local PGLite engine');
  const db=resolve(config.database_path);
  if (!db.startsWith(configDir+'/') || (existsSync(db) && realpathSync(db)!==db)) throw Error('Database target is outside the owned profile');
  assertNoInference();return config;
}
export function assertNoInference():void {
  if (['embedding','chat','expansion','reranker'].some(kind=>isAvailable(kind as any))) throw Error('Additional inference is not enabled by Oracle');
}
export async function verifyMemorySource(engine:BrainEngine):Promise<void> {
  const profile=realpathSync(process.env.GBRAIN_HOME!);
  const owner=JSON.parse(readFileSync(join(profile,'oracle-owned.json'),'utf8'));
  const root=realpathSync(owner.vault_root);
  if (root!==owner.vault_root || root===profile || root.startsWith(profile+'/') || profile.startsWith(root+'/')) throw Error('Canonical source target changed');
  const expected=join(root,'INBOX/oracle-memory');
  for (const path of [join(root,'INBOX'),expected]) if (lstatSync(path).isSymbolicLink()) throw Error('Canonical memory symlink refused');
  const sources=await engine.listAllSources();
  if (sources.find(s=>s.id==='oracle-memory')?.local_path!==expected || realpathSync(expected)!==expected) throw Error('Memory source is not bound to the reviewed canonical target');
  if (!sources.some(s=>s.id==='oracle-vault' && !s.local_path)) throw Error('Derived source target changed');
  if (await engine.getConfig('search.mcp_keyword_only')!=='true') throw Error('Keyword-only policy changed; Oracle will not call an embedding provider');
  assertNoInference();
}
