import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createAccessGrantClient} from './access-grant-client.mjs';
const endpoint='https://oracle.falamateus.com.br/api/oracle/access-grant';
const fail=()=>{throw Object.assign(new Error('Emissor de acesso não configurado nesta distribuição.'),{code:'activation_unavailable'});};
function json(path){if(realpathSync(path)!==path||lstatSync(path).isSymbolicLink()||!lstatSync(path).isFile()||lstatSync(path).size>32000)fail();return JSON.parse(readFileSync(path,'utf8'));}
/** Fixed existing-site endpoint, enabled only by explicit reviewed package
 * configuration. No raw key, issuer secret, endpoint or role enters via RPC.
 * Missing config preserves local signed-grant activation; it grants no access.
 * An enabled locator is not proof the server has a provisioned signed grant. */
export function createPortableAccessGrantResolver({resourcesRoot,fetchImpl=globalThis.fetch,now}={}){
 if(typeof resourcesRoot!=='string'||resolve(resourcesRoot)!==resourcesRoot)fail();let config;
 try{config=json(join(resourcesRoot,'updates/portable-access.json'));}catch(error){if(error.code==='ENOENT')return undefined;fail();}
 if(Object.keys(config).sort().join(',')!=='endpoint,schema_version'||config.schema_version!==1||config.endpoint!==endpoint)fail();
 let keys;try{keys=json(join(resourcesRoot,'licensing/public-keys.json'));}catch{fail();}
 return createAccessGrantClient({endpoint,allowedOrigins:['https://oracle.falamateus.com.br'],keys,fetchImpl,...(now?{now}:{})});
}
