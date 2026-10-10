# Oracle System: retomada da instalação

O processo portátil perdia a seleção do vault e os recibos em memória ao encerrar.
O perfil ainda continha a instalação, mas a abertura seguinte voltava à escolha
do Obsidian. Alterar somente a versão do ZIP não corrigia esse ciclo.

No macOS arm64, o picker agora cria um bookmark CoreFoundation com security
scope. A retomada resolve o bookmark, ativa a permissão do sistema e confere a
identidade do diretório. A licença é validada separadamente. Caminhos, preferências
e marcadores de conclusão no JSON não concedem acesso. Revogação explícita apaga
o bookmark; encerramento normal apenas libera a permissão ativa.

Uma instalação existente é conferida com o manifesto assinado do pacote, leitura
dos arquivos do acervo e método, estado real do GBrain e schema SQLite do perfil
próprio do AI Memory. Essa retomada não baixa nem copia novamente o acervo.
Notas alteradas exigem atualização do índice derivado. Arquivos da instalação
com conteúdo diferente são preservados e apresentados como pendência de revisão.
A tentativa seguinte repete a verificação, sem entrar no instalador por engano.

A identidade da instalação e a confirmação da apresentação inicial persistem.
Os registros das skills no Codex são verificados sem reconstruir o workspace a
cada conversa. Um workspace continua sendo preparado e conferido quando a
integração explícita precisa dele.

Instalação da memória e serviço ativo são estados distintos. Ao reabrir, o
executável fixado, sua versão real, propriedade do perfil, configuração e schema
são conferidos sem iniciar um segundo serviço ou restaurar consentimento de
captura, portabilidade, hooks, manutenção ou conta Codex a partir de um journal.

Atualizações do perfil mantêm a trava oficial do upstream durante toda a leitura,
mutação e substituição atômica. Operações de GBrain também são serializadas entre
conversas. A trava do kernel é liberada pelo sistema após encerramento abrupto;
travas históricas de outras versões não são removidas por idade ou PID.

`scripts/qualify-portable-reopen.mjs` verifica seleção real via bookmark, fechamento
e reabertura, identidade estável, duas conversas em processos diferentes, morte de
um escritor com trava ativa, preservação de arquivos e revogação. O assinador exige
esse relatório vinculado ao payload efetivamente expandido do ZIP, além das
qualificações de boot e compatibilidade de perfis já existentes.

Uma instalação antiga sem bookmark exige uma seleção explícita da pasta uma vez.
A partir dela, a versão nova confere os arquivos já instalados e persiste a
autorização para as próximas aberturas. A execução Windows permanece sem
qualificação em um host Windows real.

Uma conversa que iniciou antes da seleção feita em outra conversa também
recupera a autorização ao consultar o estado ou abrir a interface. O registro
persistido serve apenas para detectar mudanças: a autorização continua dependendo
do bookmark real e da identidade da pasta. Consultas simultâneas compartilham uma
tentativa; um bookmark inválido não é resolvido a cada atualização da interface.
Seleção explícita, revogação e encerramento impedem restauração concorrente. Uma
conversa com vault já autorizado não muda de pasta silenciosamente.

A qualificação do ZIP inicia um segundo processo antes da primeira escolha,
mantém esse processo aberto e só depois consulta a instalação. Ela exige conclusão
com o mesmo identificador e uma única chamada ao picker. Esse caso reproduzia a
volta à escolha do Obsidian na 0.1.26 e é agora um gate obrigatório de assinatura.

Na 0.1.30, o controlador do aviso também recebe o estado do snapshot que renderiza
o mapa. Assim, uma conclusão recebida por esse caminho encerra o aviso, mesmo com
uma consulta anterior atrasada. Respostas anteriores não podem restaurar o aviso
depois desse snapshot. A atualização do inventário ocorre separadamente das
consultas curtas de progresso. O aviso continua visível quando a instalação está
realmente pendente, sem conceder confiança a hooks ou captura.

`scripts/test-onboarding-status-refresh.py` exercita esses casos em WKWebView
offline com recibos sintéticos. A versão anterior falha nos três casos de atraso;
a versão corrigida encerra o aviso e preserva o mapa e os consentimentos.

A atualização do pacote também pode trocar o hash do método privado. Na retomada,
a versão 0.1.30 verifica primeiro todos os arquivos existentes do vault contra o
novo plano assinado. Havendo apenas o recibo de uma geração anterior, prepara
atomicamente o novo cache privado a partir dos recursos assinados do pacote.
Preserva o cache anterior, as notas, os recibos do acervo e a memória instalada.
Uma nota alterada, um cache atual ausente ou um método atual alterado continuam
exigindo revisão; um recibo isolado não comprova a instalação.

`scripts/test-private-method-restore.mjs` verifica a migração de cache, preservação
de alterações, rejeição de recibos forjados e ausência do cache da geração atual
em um vault descartável com o catálogo assinado real.

O perfil real usa o diretório persistente `PLUGIN_DATA` do host. A instalação não
usa `.work/` do repositório para guardar licença, bookmark, memória ou recibos.
Os arquivos grandes dessa pasta são cópias de desenvolvimento e de qualificação.
O pipeline portátil agora agrupa suas qualificações em um único diretório
descartável e o remove ao encerrar, inclusive em falhas, conservando apenas
relatórios compactos. Reter cópias expandidas exige `--keep-work` explícito.

## Correção do perfil na 0.1.31

Os journals de quatro instalações já ocupavam 7.995.593 bytes do limite de
8.000.000 de `profile.json`; o checkpoint seguinte falhava com
`PROFILE_TOO_LARGE`. A configuração agora mantém resumos dos recibos e guarda
as listas de arquivos separadamente em `content-installation-receipts`, no
diretório persistente do host. Recibos antigos migram na próxima gravação
autorizada. Nenhuma licença, seleção, confirmação ou nota é descartada.

As listas usam arquivos privados imutáveis com SHA-256, persistidos antes da
substituição atômica do perfil. Leitura e gravação compartilham a trava do perfil;
apenas checkpoints sem referência são removidos. Consultas comuns não carregam
todo o histórico. Diagnósticos internos podem pedir `includeContentFiles:true`;
essa leitura mantém limites próprios e rejeita alterações, symlinks e hardlinks.
Os recibos continuam sendo indícios de progresso; não concedem acesso nem
substituem a conferência assinada do conteúdo original do vault.

A entrega manual macOS 0.1.31 usa uma identidade nova. Desinstalar um
plugin remove a instalação, mas não apaga o registro privado criado por upload;
reutilizar o nome `oracle-system-mac-stable` em Adicionar plugin causava conflito.
A limpeza precede a entrega e nenhuma instalação pessoal é feita automaticamente.

Verificação focada: `scripts/test-profile-content-receipts.mjs`,
`scripts/test-portable-reopen.mjs` e `scripts/test-portable-vault.mjs`.

## Recuperação do vault na 0.1.32

A investigação de 10/10 reproduziu um bookmark real que o macOS marcou como
desatualizado após mover o vault. A 0.1.31 recusava esse registro com
`directory_grant_stale`. A camada de serviço ocultava a falha e retornava um
estado sem vault selecionado, que a interface apresentava como primeira
instalação. A configuração salva continuava existindo. Essa falha concreta
não comprova qual condição disparou cada ocorrência pessoal anterior: o perfil
foi removido na limpeza autorizada e o erro não era exposto pelo código antigo.

A versão 0.1.32 resolve o bookmark original e ativa o acesso do macOS antes de
renová-lo. Confere o device/inode originalmente autorizado, rejeita uma pasta
substituta e persiste os bytes renovados numa transação que preserva licença,
preferências, memória e recibos. Uma revogação ou seleção concorrente impede que
a renovação ressuscite a autorização anterior. Caminhos e journals não
substituem a permissão do sistema nem a verificação assinada da instalação.

Uma falha de acesso passa a ser recuperação da instalação existente. A interface
oferece recuperar o acesso e, se necessário, selecionar a pasta novamente.
O botão de recuperação verifica os arquivos existentes; não inicia outra
instalação nem solicita os consentimentos de memória novamente. Falhas
temporárias têm tentativas limitadas, com intervalo crescente. Sem um provedor
de bookmark persistente, a primeira seleção não pode concluir silenciosamente.

O produto se chama Oracle System nos manifestos, ferramentas e mensagens do
launcher. O namespace MCP corresponde à identidade exata do plugin, inclusive
na configuração de compatibilidade. Isso evita que versões importadas usem um
mesmo identificador de servidor. Um ensaio com dois plugins locais sintéticos no
servidor real do Desktop confirmou que um namespace compartilhado expõe apenas
um dos servidores. Com namespaces próprios, ambas as ferramentas atendem ao
plugin correto. A colisão estrutural é reproduzível, mas esse ensaio não identifica
qual plugin antigo respondeu a cada abertura pessoal anterior.
O canal do marketplace mantém sua identidade
estável; o ZIP manual 0.1.32 usa `oracle-system-mac-0-1-32`. A remoção do rótulo
experimental não altera os estados de qualificação que ainda são falsos.

As verificações têm escopos separados:

- `scripts/qualify-portable-vault-recovery.mjs` reproduz a falha da versão
  anterior com CoreFoundation real, renova a autorização, reabre em outro
  processo e com o executável movido, preserva o arquivo original e rejeita
  substituição de pasta. O relatório identifica o payload e seu recibo SHA-256.
- A composição do ZIP verifica instalação local completa, índice GBrain,
  AI Memory original e registro de 260 skills em um perfil sintético.
- O servidor incluído no ChatGPT Desktop mantém o mesmo `PLUGIN_DATA` em duas
  conversas e após reinício. Esse ensaio chama o launcher e o RPC reais do ZIP,
  com rede negada e sem executar um modelo; não instala o plugin na conta pessoal.
  O ensaio de colisão usa dois servidores sintéticos, em outro perfil isolado,
  para comparar um namespace compartilhado com namespaces próprios.
- `scripts/qualify-portable-reopen.mjs` aceita
  `--reopen-delays-seconds 600,1200,1800` para conferir a instalação existente em
  processos novos após 10, 20 e 30 minutos. Ele exige o mesmo identificador de
  instalação, sem copiar ou baixar o acervo novamente, e verifica preservação,
  concorrência e revogação separadamente.
- A interface de recuperação foi exercitada em WKWebView offline, com estados
  sintéticos e respostas atrasadas. Esse resultado não é uma instalação na conta
  do usuário nem uma qualificação em outro Mac.

A assinatura de publicação passa a exigir também a prova de renovação do
bookmark real vinculada ao mesmo payload. Relatórios de outra versão, pasta
substituta, reinstalação ou uso de perfil pessoal interrompem a assinatura.
Os temporários grandes desses ensaios são removidos após concluir as verificações;
somente relatórios compactos e o ZIP final solicitado são conservados.

Em 10/10, no macOS 27.0.1, as três reaberturas passaram aos 631, 1.233 e 1.813
segundos, com o mesmo identificador de instalação. Os testes posteriores também
preservaram uma skill editada, os arquivos originais e a memória, sem download
ou reinstalação. O ensaio prolongado e o ZIP final têm os mesmos 19.510 arquivos
executáveis e de recursos; a única diferença no payload é o inventário do pacote.
O ZIP final tem 82.560.127 bytes e SHA-256
`ea52c778b7a8db011b874e43b5e8eeecdccc04c6a272e6c97b5cee2a38b2264f`.
Seu boot, hashes externos, autorização renovada e persistência do host foram
conferidos separadamente. Uma autorização normal também permaneceu válida
após 30 minutos: o ensaio não demonstrou expiração automática por tempo.
O ciclo completo foi repetido com o ZIP final após remover a expansão do pacote
anterior, conservando a instalação e os dados do perfil sintético.
