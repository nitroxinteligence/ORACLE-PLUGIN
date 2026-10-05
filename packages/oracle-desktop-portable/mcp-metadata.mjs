const protocols=['2026-01-26','2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
export const resourceURI='ui://oracle/workspace';
export const uiMeta={ui:{resourceUri:resourceURI,visibility:['app','model']},'openai/outputTemplate':resourceURI,'openai/ui':{entrypoints:[{type:'global'},{type:'thread'}]}};
export function initializeResult(params,{icons=[],version='1.0.0',listChanged=true}={}){
  return {protocolVersion:protocols.includes(params.protocolVersion)?params.protocolVersion:'2025-11-25',capabilities:{tools:{...(listChanged?{listChanged:true}:{})},resources:{}},serverInfo:{name:'oracle-desktop-portable',title:'Oracle System',icons,version}};
}
export function baseTools({icons=[]}={}){return [
          {name:'oracle_open',title:'Oracle System',annotations:{title:'Oracle System',readOnlyHint:true},icons,description:'Abrir o Oracle System para explorar o vault, notas, skills e configuração local.',inputSchema:{type:'object',properties:{},additionalProperties:false},_meta:uiMeta},
          {name:'oracle_dispatch',icons,description:'Executar uma ação da interface Oracle com suas permissões e autorizações.',inputSchema:{type:'object',properties:{method:{type:'string',maxLength:80},params:{type:'object'}},required:['method'],additionalProperties:false},_meta:{ui:{visibility:['app']}}}

];}
