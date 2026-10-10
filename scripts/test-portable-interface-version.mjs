import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createMCPServer} from '../packages/oracle-desktop-portable/server.mjs';
import {resourceURI} from '../packages/oracle-desktop-portable/mcp-metadata.mjs';

test('an update exposes a new interface URI consistently in tools, open and resource read',async()=>{
 const dispatcher={dispatch(){throw Error('Opening must not install or dispatch');}},old=createMCPServer({dispatcher,version:'0.1.34'}),next=createMCPServer({dispatcher,version:'0.1.35'});
 const oldURI=(await old.request('tools/list')).tools[0]._meta.ui.resourceUri,newURI=(await next.request('tools/list')).tools[0]._meta.ui.resourceUri;
 assert.equal(oldURI,resourceURI+'/0.1.34');assert.equal(newURI,resourceURI+'/0.1.35');assert.notEqual(oldURI,newURI);
 assert.equal((await next.request('tools/call',{name:'oracle_open'}))._meta.ui.resourceUri,newURI);
 assert.equal((await next.request('resources/list')).resources[0].uri,newURI);
 const response=await next.request('resources/read',{uri:newURI});assert.equal(response.contents[0].uri,newURI);assert.match(response.contents[0].text,/current!==observed/);
 await assert.rejects(next.request('resources/read',{uri:oldURI}),{code:-32602});
 assert.equal((await next.request('initialize',{protocolVersion:'2026-01-26'})).serverInfo.version,'0.1.35');
});
test('the unversioned synthetic interface remains compatible and URI versions are bounded',async()=>{
 const dispatcher={dispatch:async()=>({})},server=createMCPServer({dispatcher,webRoot:resolve('Resources/web')});
 assert.equal((await server.request('tools/list')).tools[0]._meta.ui.resourceUri,resourceURI);
 assert.throws(()=>createMCPServer({dispatcher,version:'a'.repeat(81)}),/Versão/);
});
