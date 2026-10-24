# Oracle System

Distribuição pública do plugin Oracle para clientes em contas independentes. O uso do sistema continua exigindo uma licença válida e a seleção explícita da pasta do Obsidian.

Adicione este repositório como marketplace no gerenciador de plugins compatível do ChatGPT/Codex. O marketplace se chama `oracle-system`. Escolha `oracle-system-mac-stable` para macOS Apple Silicon ou `oracle-system-windows-stable` para Windows x64. O nome técnico permanece estável entre versões.

Os ZIPs completos também estão nas [releases](https://github.com/nitroxinteligence/ORACLE-PLUGIN/releases) e na [página de download](https://oracle.falamateus.com.br/download/). Instalações importadas por ZIP precisam usar o canal do host para receber a substituição do pacote. A interface do Oracle oferece acesso a esse canal.

Se a importação apresentar apenas `Couldn't add plugin. Try again.`, use o **Instalador para Mac** na página de download. Extraia o ZIP e abra `Instalar Oracle.command`. Essa alternativa usa os comandos oficiais `plugin marketplace add` e `plugin add` do Desktop para instalar o mesmo plugin local, sem criar outro registro privado na conta. Uma nova execução atualiza a fonte oficial e conserva a identidade local. O aplicativo precisa estar atualizado e permitir plugins. O instalador não é um ZIP para enviar em **Adicionar plugin**. Detalhes em [LEIA-ME](distribution/portable/installer/LEIA-ME.txt).

Um aviso genérico de importação não identifica a causa do servidor. Verifique a resposta completa antes de atribuí-lo a nome duplicado, permissões ou tamanho. Para uma instalação existente, use sua atualização; **Adicionar plugin** cria um registro na conta.

Dentro do Oracle, **Acervo** atualiza as skills da pasta selecionada, conserva edições locais e verifica o índice. **ORACLE** atualiza o plugin completo pelo host, incluindo componentes compatíveis dos repositórios originais [GBrain](https://github.com/garrytan/gbrain) e [AI Memory](https://github.com/akitaonrails/ai-memory). Licença, pasta, dados e consentimentos ficam no perfil do usuário.

O onboarding registra as entradas do acervo assinado em `~/.agents/skills`, apontando para os arquivos originais do vault. O Codex pode usar as skills em seus projetos após atualizar a descoberta; se a lista continuar desatualizada, reinicie o Codex. O registro também acompanha atualizações do acervo e não inicia uma conversa ou conexão com conta. A atualização só conclui após verificar o registro completo no Codex; conflitos preservam edições e mantêm a versão anterior como instalada até uma nova tentativa. No Windows, o registro usa junctions de diretórios.

Um push aprovado na fonte do aplicativo sincroniza somente os arquivos portáteis permitidos para este repositório. O workflow gera e verifica os pacotes completos. Uma verificação diária consulta os dois projetos originais. Alterações incompatíveis, migração recusada, assinatura inválida ou pacote acima do limite interrompem a publicação e preservam a release anterior. O acervo tem seu próprio workflow em [ORACLE-SKILLS](https://github.com/nitroxinteligence/ORACLE-SKILLS).

Os binários e scripts dos projetos originais são preservados. A publicação inclui inventários assinados por Ed25519, digests dos arquivos e procedência dos componentes. A assinatura de distribuição não equivale à qualificação de execução do Windows. As validações de inicialização e migração usam perfis sintéticos, sem ativar hooks pessoais ou executar uma conversa com modelo.

O workflow manual aceita `validate`, que constrói e exercita o candidato sem publicar. Credenciais de publicação, chaves privadas, licenças emitidas e perfis pessoais não fazem parte deste repositório.
