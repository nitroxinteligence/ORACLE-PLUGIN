# Oracle System 0.1.30: retomada da instalação

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
