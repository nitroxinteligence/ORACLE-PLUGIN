/** CI-only GitHub API authentication. Release downloads never receive the key. */
const repositories=new Set(['garrytan/gbrain','akitaonrails/ai-memory','nitroxinteligence/ORACLE-PLUGIN','nitroxinteligence/ORACLE-SKILLS']);
export function createPublisherFetch({token=process.env.ORACLE_RELEASE_API_TOKEN,fetchImpl=globalThis.fetch}={}){
 delete process.env.ORACLE_RELEASE_API_TOKEN;
 return (url,options={})=>{
  const address=new URL(url),match=address.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/(releases\/latest|git\/ref\/tags\/v[\d.]+|git\/tags\/[a-f0-9]{40})$/);
  const headers=new Headers(options.headers);headers.delete('Authorization');
  if(token&&address.protocol==='https:'&&address.hostname==='api.github.com'&&!address.username&&!address.password&&match&&repositories.has(match[1]))headers.set('Authorization','Bearer '+token);
  return fetchImpl(url,{...options,headers});
 };
}
