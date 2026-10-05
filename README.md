# Oracle System

Distribuição pública do plugin Oracle para clientes em contas independentes. O uso do sistema continua exigindo uma licença válida e a seleção explícita da pasta do Obsidian.

Adicione este repositório como marketplace no gerenciador de plugins compatível do ChatGPT/Codex. O marketplace se chama `oracle-system`. Escolha `oracle-system-mac-v017` para macOS Apple Silicon ou `oracle-system-windows-v017` para Windows x64. O nome técnico permanece estável entre versões.

Os ZIPs completos também estão nas [releases](https://github.com/nitroxinteligence/ORACLE-PLUGIN/releases) e na [página de download](https://oracle.falamateus.com.br/download/). Instalações importadas por ZIP precisam usar o canal do host para receber a substituição do pacote. A interface do Oracle oferece acesso a esse canal.

Dentro do Oracle, **Acervo** atualiza as skills da pasta selecionada, conserva edições locais e verifica o índice. **ORACLE** atualiza o plugin completo pelo host, incluindo componentes compatíveis dos repositórios originais [GBrain](https://github.com/garrytan/gbrain) e [AI Memory](https://github.com/akitaonrails/ai-memory). Licença, pasta, dados e consentimentos ficam no perfil do usuário.

Um push aprovado na fonte do aplicativo sincroniza somente os arquivos portáteis permitidos para este repositório. O workflow gera e verifica os pacotes completos. Uma verificação diária consulta os dois projetos originais. Alterações incompatíveis, migração recusada, assinatura inválida ou pacote acima do limite interrompem a publicação e preservam a release anterior. O acervo tem seu próprio workflow em [ORACLE-SKILLS](https://github.com/nitroxinteligence/ORACLE-SKILLS).

Os binários e scripts dos projetos originais são preservados. A publicação inclui inventários assinados por Ed25519, digests dos arquivos e procedência dos componentes. A assinatura de distribuição não equivale à qualificação de execução do Windows. As validações de inicialização e migração usam perfis sintéticos, sem ativar hooks pessoais ou executar uma conversa com modelo.

O workflow manual aceita `validate`, que constrói e exercita o candidato sem publicar. Credenciais de publicação, chaves privadas, licenças emitidas e perfis pessoais não fazem parte deste repositório.
