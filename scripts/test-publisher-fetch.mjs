import {test} from 'node:test';import assert from 'node:assert/strict';import {createPublisherFetch} from './publisher-fetch.mjs';
test('publisher API token stays within the original approved API endpoints',async()=>{
 const calls=[],fetchImpl=async(url,options)=>{calls.push({url,headers:options.headers});return {ok:true};};
 const fetch=createPublisherFetch({token:'synthetic-ci-token',fetchImpl});
 const urls=['https://api.github.com/repos/garrytan/gbrain/releases/latest','https://api.github.com/repos/akitaonrails/ai-memory/git/ref/tags/v2.5.2','https://github.com/akitaonrails/ai-memory/releases/download/v2.5.2/file.zip','https://release-assets.githubusercontent.com/file','https://api.github.com/repos/unrelated/project/releases/latest','https://api.github.com/repos/nitroxinteligence/ORACLE-PLUGIN/issues','https://example.com/file'];
 for(const url of urls)await fetch(url,{headers:{Accept:'application/json',Authorization:'untrusted'}});
 for(let i=0;i<calls.length;i++){assert.equal(calls[i].headers.get('Authorization'),i<2?'Bearer synthetic-ci-token':null);assert.equal(calls[i].headers.get('Accept'),'application/json');}
});
test('publisher consumes the environment key before vendor child execution',()=>{
 process.env.ORACLE_RELEASE_API_TOKEN='synthetic-ci-token';createPublisherFetch({fetchImpl:()=>{}});assert.equal(process.env.ORACLE_RELEASE_API_TOKEN,undefined);
});
