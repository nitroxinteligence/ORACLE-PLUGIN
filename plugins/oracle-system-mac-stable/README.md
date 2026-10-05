# Oracle System: backend portátil

O pacote distribui o backend JavaScript, a interface original, o método GBrain, o acervo assinado e os componentes originais do sistema. O runtime e os binários dos fornecedores conservam seus bytes e assinaturas. Licenças, índices e dados pessoais ficam fora do ZIP.

O servidor usa STDIO MCP. O host fornece `${PLUGIN_DATA}`; o launcher exige uma pasta absoluta. O perfil privado não importa configurações pessoais existentes. Licença válida, seleção da pasta do Obsidian, conexão ao Codex e confiança de hooks continuam sendo ações e estados próprios.

O modal de atualizações tem dois canais: **Acervo de skills**, para atualizar os arquivos do Obsidian e verificar seu índice, e **ORACLE completo**, para substituir o plugin pelo gerenciador oficial do host. A atualização completa incorpora versões compatíveis dos repositórios originais `garrytan/gbrain` e `akitaonrails/ai-memory`. A consulta é automática; a instalação depende da escolha do usuário.

O canal público está em [ORACLE-PLUGIN](https://github.com/nitroxinteligence/ORACLE-PLUGIN), marketplace `oracle-system`, com identidades estáveis `oracle-system-mac-stable` e `oracle-system-windows-stable`. Uma importação manual por ZIP precisa do registro do canal para receber a substituição pelo host. Essa configuração não ativa hooks nem inicia uma conversa com modelo.

O pipeline provisiona apenas checkouts descartáveis dos projetos originais, preserva os lockfiles e não executa scripts de instalação de dependências. As versões e os hashes usados pelos empacotadores vêm de `Resources/updates/portable-upstream.json`. A montagem confere inventários, caminhos regulares, licenças e os addons originais necessários. O Mac confere Developer ID do fornecedor e consulta seu comprovante de notarização na Apple. Os ZIPs precisam ter menos de 100.000.000 bytes.

Antes da publicação, o pipeline inicia o ZIP Mac completo em perfil sintético, migra o perfil da release assinada anterior, verifica documentos canônicos pelo MCP original e verifica o estado do AI Memory. Uma falha conserva a release publicada anterior. Os manifestos de distribuição usam Ed25519 e inventários completos. Chaves privadas e credenciais ficam fora do pacote.

O Windows x64 usa empacotador próprio. PowerShell reconstrói o Bun original a partir do membro gzip em `${PLUGIN_DATA}`, confere bytes e protege o diretório com ACL. O payload completo usa Brotli; a deduplicação mantém todos os caminhos lógicos. A integridade do pacote é verificada, mas sua execução continua dependente de teste em Windows real.

A qualificação separa inicialização do ZIP, migração de dados sintéticos, renderização da interface e operações reais do gerenciador de plugins. Esses resultados não comprovam ativação em conta independente de cliente, execução em segundo Mac nem instalação no vault pessoal. A edição de notas revalida revisões e preserva alterações concorrentes; depende das capacidades do host para as garantias de contenção necessárias.
