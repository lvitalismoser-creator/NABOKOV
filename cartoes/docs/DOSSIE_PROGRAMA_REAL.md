# Dossiê de decisões para o programa real

Escrito em 2026-11-23, com o protótipo na versão 1.4.1 (Fases 5 a 8 feitas; 6 a 8 aguardando conferência do dono; validação ainda não começou).

Para que serve: o programa real será feito do zero, com outra estrutura (decisão do dono, 2026-11-13). O que vai adiante do protótipo são as decisões de produto, os problemas achados e o diário de uso. Este arquivo junta isso num lugar só. **Não traz decisão nova:** tudo aqui foi tirado do `CLAUDE.md`, dos planos e dos `HANDOFF_*`. Onde o motivo de uma decisão não está escrito em nenhum deles, aparece "motivo não registrado".

Fontes, em `docs/` salvo indicação: `../CLAUDE.md`, `PLANO_AJUSTES_ABORDAGEM.md`, `PLANO_FASES_5_A_8.md`, `REVISAO_E_PLANO_SALVAMENTO.md`, `HANDOFF_2026-11-03.md`, `HANDOFF_2026-11-12.md`, `HANDOFF_2026-11-13.md`, `USO.md`.

---

## 1. Princípio e dúvida de produto

**Princípio central** (`CLAUDE.md`): reduzir ao máximo a carga cognitiva para escrever as primeiras palavras. O usuário nunca deve sentir limite nem "obrigação" de escrever muito.

**A ideia:** um editor para escritores inspirado no método de fichas de Nabokov. Primeiro, cartões de livre manipulação numa mesa; depois, o texto corrido. O cartão é pequeno, sempre pronto e sem nenhum campo a preencher, para que começar custe quase nada. A organização (grupos, categorias, ordens) vem depois do texto, nunca antes.

**A dúvida que o protótipo testa:** se essa forma de trabalhar faz o escritor voltar a escrever por conta própria. A validação foi definida com o dono em 2026-11-11 (`PLANO_AJUSTES_ABORDAGEM.md`):

- **Sinais:** escrever em várias sessões e voltar sem lembrete.
- **Meta:** pelo menos 5 sessões de escrita em dias diferentes, em 2 semanas, contadas a partir da instalação do instalador da Fase 8 (o 1.4.1). Na maioria delas o dono abriu o app por vontade própria, não para testar.
- **Fonte:** `USO.md`, coluna "por que abri (vontade / teste)".
- **Se validar:** discutir o próximo passo (DOCX/ODT, outros escritores, ícone, assinatura, distribuição).
- **Se não validar:** ler o diário, listar o que travou ou afastou e decidir cortes ou mudanças com o dono antes de qualquer distribuição.

**Estado da dúvida hoje:** sem resposta. O diário tem uma entrada, de teste (12-11). O dono ainda não instalou o 1.4.1.

**Riscos registrados** (`PLANO_AJUSTES_ABORDAGEM.md`): as Fases 6 a 8 nasceram de cerca de 2 minutos de uso e podem ter construído o que o uso real não pede; "voltar sem lembrete" depende de o dono marcar com honestidade a coluna "por que abri".

---

## 2. Decisões de produto que vão adiante

Cada uma com a decisão, o motivo registrado e onde nasceu.

### 2.1 Cartão finito e estouro em pilha

- **Decisão:** o cartão tem tamanho fixo, na proporção de ficha (340×214). Nunca cresce e nunca bloqueia a digitação. Quando o texto não cabe, ele rola dentro do cartão e surgem folhas atrás (até 3), com um esmaecido nas bordas indicando texto acima ou abaixo. **Não** se encadeia um segundo cartão.
- **Motivo:** "Bloco finito, virtualmente ilimitado": o cartão dá uma unidade pequena para começar, sem impor limite ("nunca bloqueia a digitação"); segue o princípio central. Por que pilha e não encadear: "foi decisão explícita", **motivo não registrado**.
- **Onde nasceu:** "Conceito do cartão", itens 1 e 2 (`CLAUDE.md`), anterior à Fase 5 (data não registrada).
- **Detalhe que importa:** a pilha só aparece quando sobra texto de verdade (um cartão cheio até a última linha mostrava a pilha por 1 px; corrigido na Fase 7b).

### 2.2 Zero poluição visual e as três exceções

- **Decisão:** sem barra de ferramentas, título, placeholder ou campo obrigatório. Os controles do cartão (categorias, tamanho, guardar, ×) só aparecem no hover. Cartão novo nasce com foco e cursor piscando; na primeira visita já há um cartão em branco pronto. Cartão vazio some sozinho ao perder o foco. Estilo de papel (linha vermelha, pauta azul, textura, leve inclinação que endireita no foco, fonte serifada, sem fontes externas). Formatação só por markdown (`**x**`, `*x*`) e `Ctrl+B/I`; nada de toolbar.
- **Motivo:** princípio central (menos carga para escrever). Cartão vazio sumindo: "ninguém limpa a mesa". Estilo de papel e inclinação: **motivo não registrado** além da referência às fichas de Nabokov.
- **Onde nasceu:** "Conceito do cartão", itens 3 a 6 (`CLAUDE.md`).
- **As três únicas exceções** ("Exceções decididas pelo dono", `CLAUDE.md`). Qualquer outro elemento visível por padrão é considerado erro.

  | Exceção | Motivo registrado | Decidida em |
  |---|---|---|
  | Tamanhos P/M/G, sempre na proporção de ficha | O dono pediu redimensionar; três tamanhos fixos dão a escolha sem abrir a porta para ajuste fino, que aumentaria a carga cognitiva. | 2026-11-03, registrada em 2026-11-11 |
  | Pontinho de salvo sempre visível, no canto da mesa, fora do cartão | O salvamento era invisível e só aparecia quando falhava; o dono quer a confirmação à vista. | 2026-11-03, registrada em 2026-11-11 |
  | Moldura levemente visível só no cartão com foco | O dono não sabia o que era clicável nem por onde arrastar. Fora do foco nada muda. | 2026-11-11 |

- **Consequências já tomadas na Fase 8:** a dica fixa do rodapé saiu (o dono reclamou dela em 03-11); no lugar, uma dica de primeira visita que aparece uma vez por 12 s, e "Atalhos" no menu ≡ (F1). A linha de atalhos do organizador também saiu, pelo mesmo motivo (decisão tomada sem o dono, a confirmar).

### 2.3 Arrastar só pela moldura

- **Decisão:** o cartão se arrasta pela faixa de cima, nunca pelo texto. Exceção: no modo mapa, onde não há texto editável à vista, o cartão inteiro arrasta.
- **Motivo:** "para não conflitar com seleção" de texto.
- **Onde nasceu:** "Conceito do cartão", item 7 (`CLAUDE.md`). A exceção do mapa: Fase 7b (`HANDOFF_2026-11-12.md`, decisão 16).

### 2.4 Grupos por ímã

- **Decisão:** encostar um cartão na borda de outro gruda os dois, com folga e alinhamento, formando um grupo que anda junto. `Shift`+arrastar solta um cartão; "desagrupar" solta todos. O ímã respeita tamanhos mistos. Vários cartões arrastados juntos (seleção) não grudam em ninguém.
- **Motivo:** **motivo não registrado** (já existia antes da revisão de 03-11; ver `REVISAO_E_PLANO_SALVAMENTO.md`, B3).
- **Onde nasceu:** protótipo inicial. Regras de seleção: Fase 7b (`HANDOFF_2026-11-12.md`, decisão 14).

### 2.5 Gaveta

- **Decisão:** guardar tira o cartão (ou o grupo) da mesa sem excluir. Rótulo "gaveta (N)"; ao guardar, o cartão voa até ela; ao devolver, a mesa vai até ele e ele pisca. Guardar e devolver têm "desfazer". Um grupo nunca fica metade na mesa e metade na gaveta.
- **Motivo:** da gaveta em si, **motivo não registrado**. Do rótulo e da animação: o dono disse em 03-11 que "avisos e gaveta" eram confusos. Da regra do grupo inteiro: os erros I2/I3 (grupo "fantasma" e devolução longe do grupo).
- **Onde nasceu:** protótipo inicial; o comportamento atual, nas Fases 7a (I2/I3) e 8.

### 2.6 Categorias

- **Decisão:** cada cartão pode ser cena, nota ou lugar, com uma cor. A cor aparece na faixa de cima no modo mapa e o nome sai na exportação "por seção" e "ficha completa".
- **Motivo:** **motivo não registrado**. A escolha das três categorias também não tem motivo escrito.
- **Onde nasceu:** protótipo inicial (já existia em 03-11).

### 2.7 Organizador e "uma ordem nunca mexe na mesa"

- **Decisão:** o antigo "embaralhar" virou o organizador: leitura grande em cima, fileira editável embaixo. Dá para mover, pôr de lado (a peça fica na fileira, erguida e esmaecida, fora da leitura e da exportação), anotar (uma nota por ordem e uma por cartão naquela ordem, nada aparece na mesa) e salvar várias ordens com nome. Grupos entram como uma peça só, que pode ser separada só naquela ordem. Cartões novos esperam na bandeja "fora da ordem". **Uma ordem nunca mexe na mesa**; a única exceção é o botão "dispor na mesa", que leva cada grupo como um bloco e pode ser desfeito.
- **Motivo:** o dono pediu, depois de ~2 minutos de uso, "o organizador embutido no embaralhar: mover, testar ordens, 'ocultar' deslocando para cima com menos opacidade, comentar e salvar ordens". Por que a ordem nunca mexe na mesa: escolha do dono na rodada 3 de perguntas, **motivo não registrado**.
- **Onde nasceu:** respostas do dono de 2026-11-03 (`HANDOFF_2026-11-03.md`, seção 2); Fase 5.
- **Decisões tomadas sem o dono, ainda a confirmar:** toda ordem grava sozinha; no máximo uma ordem "em teste" sem nome; embaralhar uma ordem nomeada cria uma ordem em teste e nunca altera a nomeada; a ordem em teste acompanha os grupos feitos depois dela, ordens com nome não (1.4.1); a leitura tem zoom próprio e por padrão mostra a peça inteira.

### 2.8 Mesa infinita

- **Decisão:** as posições dos cartões são "do mundo"; a janela mostra um pedaço. Arrastar o fundo move a mesa; roda rola; `Ctrl`+roda dá zoom no cursor (20% a 200%); `Ctrl+0` mostra tudo, `Ctrl+1` volta a 100%. `N` cria no centro do que a janela mostra. **Câmera e zoom são preferência de tela e não entram no projeto:** mover a mesa nunca regrava os cartões.
- **Motivo:** o dono sentiu falta de zoom e navegação (03-11). O diagnóstico: a mesa era a própria janela e cartões podiam sumir fora da tela numa janela menor (I1). Câmera fora do projeto: decisão tomada sem o dono, "mover a mesa nunca regrava os cartões".
- **Onde nasceu:** respostas do dono de 03-11 (rodada 2); Fase 7a.

### 2.9 Tamanhos P/M/G

- **Decisão:** três tamanhos fixos, sempre na proporção de ficha: 252×158, 340×214 e 474×298 (4, 6 e 9 linhas de pauta). A letra é a mesma nos três; muda quanto texto aparece. O canto de cima à esquerda não sai do lugar.
- **Motivo:** ver a exceção 2.2. As medidas e a letra igual foram decididas sem o dono (pergunta 6, seção 6).
- **Onde nasceu:** respostas do dono de 03-11; Fase 7b.

### 2.10 Modo mapa

- **Decisão:** abaixo de 45% de zoom, cada cartão mostra só as primeiras 8 palavras em letra grande, com a faixa na cor da categoria. Um clique aproxima até o cartão.
- **Motivo:** escolha do dono para "zoom longe" (03-11). O porquê e o limite de 45%: **motivo não registrado**.
- **Onde nasceu:** respostas do dono de 03-11; Fase 7b.

### 2.11 Seleção múltipla

- **Decisão:** `Shift`+arrastar no fundo desenha a caixa; `Shift`/`Ctrl`+clique põe ou tira. Mover, mudar tamanho, guardar e excluir em lote, tudo com desfazer (`Ctrl+Z` sem cursor num cartão).
- **Motivo:** o dono respondeu "Sim, quero" (03-11). **Motivo não registrado** além disso.
- **Onde nasceu:** Fase 7b.

### 2.12 "Nunca perder texto" e a estratégia de salvamento

- **Decisão:** o usuário nunca pensa em "salvar": nenhum botão, nenhum diálogo. A meta é "nunca perder uma palavra".
  - **Fonte da verdade é um arquivo simples** (`projeto.json`) no disco, gravado de forma atômica (arquivo temporário + `fsync` + renomear, com nova tentativa nos erros de bloqueio do Windows), com `.bak` e instantâneos (20 recentes + 1 por dia, 7 dias).
  - **Cópias extras** no navegador (IndexedDB e `localStorage`); ao abrir vale a mais nova.
  - Salva 400 ms depois da última edição, no máximo 3 s de espera, e ao fechar (gravação síncrona).
  - **Carregar nunca destrói:** arquivo ilegível nunca é sobrescrito (vira uma cópia "corrompido" e carrega-se o `.bak` ou o último instantâneo); cartão inválido vai para a quarentena.
  - Lixeira persistente (50 itens), sem "esvaziar". Instantâneos restauráveis pelo menu. Só uma instância ou aba grava. Falha de gravação mostra aviso que fica até resolver; o pontinho de salvo mostra o estado.
  - O modo de demonstração nunca toca os dados reais.
- **Motivo:** a revisão de 03-11 achou sete falhas que perdiam dados (C1 a C7: o demo apagava o trabalho, JSON corrompido virava lista vazia e era sobrescrito, um cartão inválido derrubava o carregamento, falhas de gravação eram engolidas, gravação só no `beforeunload`, desfazer de um cartão só, duas abas se sobrescrevendo). A pesquisa da revisão apontou o padrão dos apps de escrita local-first: "arquivos simples como fonte da verdade e índice reconstruível para busca, nunca um banco guardando a única cópia". JSON foi escolhido por ser "legível, portátil, o usuário é dono, backup fácil"; SQLite só como índice reconstruível; Markdown só como exportação (perde posição, grupos e categorias).
- **Onde nasceu:** `REVISAO_E_PLANO_SALVAMENTO.md` (Fases 0 a 4); pontinho na Fase 6.
- **Vale também para o protótipo:** o dono escreve nele de verdade, então "nunca perder texto" continua valendo enquanto durar a validação.

### 2.13 Exportação

- **Decisão:** escolher na hora a ordem (uma ordem salva ou a leitura da mesa), o modelo (texto corrido / um cartão por seção / ficha completa, com notas) e o formato. Peças postas de lado não saem. Negrito e itálico preservados. TXT, MD e PDF primeiro; DOCX e ODT só depois da validação. Sem `.doc` antigo.
- **Motivo:** o dono disse em 03-11 que "não há como exportar" e quer documento. Conteúdo e ordem foram escolhas dele. Por que TXT/MD/PDF antes de DOCX/ODT: decisão de 11-11, **motivo não registrado**.
- **Onde nasceu:** respostas de 03-11 (rodada 1); ajuste de 11-11; Fase 6.

### 2.14 Funções secundárias e avisos

- **Decisão:** tudo o que não é escrever fica num menu discreto ≡ no canto (exportar, importar, backup, lixeira, instantâneos, atalhos). Avisos sempre no mesmo lugar, por 6 s, no formato "o que aconteceu · onde está", com "desfazer" quando dá.
- **Motivo:** o dono escolheu o menu discreto (03-11) e disse que os avisos confundiam.
- **Onde nasceu:** Fases 6 e 8.

---

## 3. O que não vai adiante, e o que os testes documentam

**Não vai adiante:** a estrutura do código (`CLAUDE.md`). Um arquivo `src/main.js` grande, sem framework, um editor ProseMirror por cartão, tudo empacotado num `index.html`; Electron com o processo principal dono do disco. O motivo dado pelo dono: o programa real terá funcionalidades que pedem código grande e bem pensado desde a estrutura (seção 4).

**Vai adiante como referência:** os 73 testes automatizados, cada um descrevendo um comportamento esperado. Os nomes abaixo são os dos testes, levemente encurtados, agrupados por arquivo (`tests/`).

### `browser.test.cjs` (15): salvar e nunca perder

- Salva ao esconder a página, nas duas cópias do navegador.
- O modo de demonstração grava só no espaço dele e não toca os dados reais.
- JSON ilegível é preservado e o app abre normalmente.
- Cartões inválidos e duplicados vão para a quarentena; os bons abrem.
- Falha em todos os destinos mostra aviso, e o app continua usável.
- Cópia apagada volta pela outra; cópia antiga não vence a mais nova.
- Segunda aba é só leitura e assume quando a primeira fecha.
- Digitação contínua ainda grava dentro do teto de espera.
- Lixeira guarda vários cartões, sobrevive ao recarregar e `T` reabre em ordem.
- Backup gera `.json` válido; importar só acrescenta.
- Instantâneo guarda o estado de abertura e restaurar volta a ele.
- Backspace num cartão só com espaços apaga os espaços, não o cartão (I8).
- Backspace logo depois de uma conversão markdown a desfaz (I7).
- Pontinho de salvo: pisca ao gravar, fica cinza com a hora, vermelho se falhar.
- Pontinho de salvo: aba somente leitura e demonstração dizem o que são.

### `electron.test.cjs` (10): app desktop

- Ordens do organizador vão para o arquivo do projeto e voltam ao reabrir.
- A página só enxerga a ponte do disco, sem acesso ao sistema.
- Fechar a janela logo após digitar grava o texto, sem arquivo temporário sobrando.
- O disco vale mesmo com o cache do navegador limpo; `Ctrl+N` cria cartão.
- Cria `.bak` e instantâneos; arquivo quebrado é preservado e recuperado do `.bak`.
- Pontinho de salvo diz "em disco" depois de gravar o arquivo.
- Instantâneo do disco aparece no menu e restaurar regrava o projeto.
- Exportar TXT, MD e PDF pelo diálogo de salvar; cancelar não grava nada.
- `Ctrl+0` e `Ctrl+1` são da mesa, não do zoom de página.
- A segunda instância não abre.

### `export.test.cjs` (5): exportação

- Texto corrido segue a ordem, pula os de lado e preserva negrito e itálico.
- Markdown por seção: títulos numerados com a categoria; sinais do usuário escapados.
- Ficha completa leva as notas da ordem; o PDF escapa o texto.
- Janela Exportar: escolhe ordem, modelo e formato, mostra a prévia e baixa o arquivo.
- A prévia mostra o documento inteiro, com rolagem.

### `menu.test.cjs` (7): menu ≡ e dicas

- Menu ≡ abre, mostra cada item com o atalho e fecha com `Esc` ou clique fora.
- Lixeira pelo menu: lista, devolve um por um ao lugar, nada some.
- Instantâneos pelo menu: pede confirmação, volta ao antigo e guarda o de agora.
- F1 abre os atalhos mesmo com o cursor num cartão; `Esc` fecha sem perder texto.
- Na demonstração, lixeira e instantâneos não tocam os dados reais.
- Dica de primeira visita aparece uma vez, some sozinha e não volta; não há dica fixa.
- Organizador sem linha de atalhos no rodapé; o botão "atalhos" abre a lista.

### `mesa.test.cjs` (23): mesa, cartões e interface

- Arrastar pela faixa de cima move o cartão; pelo texto, não.
- Ímã: encostar na borda gruda com a folga certa, alinha e forma grupo; gruda também embaixo; longe não gruda.
- Grupo anda junto; `Shift`+arrastar solta um cartão; "desagrupar" solta todos.
- Duplo clique no fundo cria um cartão centrado ali, com o cursor; `N` cria outro.
- Câmera: arrastar o fundo e a roda movem a mesa sem alterar nenhum dado.
- Câmera: `Ctrl`+roda dá zoom no cursor; `Ctrl+1` volta a 100%; `Ctrl+0` mostra tudo.
- Com zoom e deslocamento, arrasto, ímã, duplo clique e `N` usam posições do mundo.
- Em janela menor os cartões continuam alcançáveis; se nada aparece, enquadra tudo (I1).
- Roda sobre um cartão com texto sobrando rola o texto, não a mesa.
- Grupo nunca fica metade na gaveta; devolver traz a mesa até o cartão (I2/I3).
- P/M/G pelo botão e por `Alt+1/2/3`, na proporção de ficha, sem tocar no texto.
- O estouro vira pilha conforme o tamanho; valor inválido abre como M.
- Ímã e moldura de grupo respeitam tamanhos diferentes.
- "Dispor na mesa" com tamanhos mistos não sobrepõe cartões.
- Seleção: caixa com `Shift`+arrastar; arrastar um selecionado move todos; `Ctrl+Z` devolve.
- Seleção: `Shift`/`Ctrl`+clique põe e tira; não solta do grupo; o grupo do selecionado anda junto.
- Seleção: excluir, guardar e tamanho em lote, cada um com desfazer.
- Modo mapa: abaixo de 45%, primeiras palavras e cor da categoria; clicar aproxima.
- Modo mapa: arrasta-se por qualquer ponto; seleção funciona; entrar no mapa tira o cursor sem perder texto.
- Moldura invisível fora do foco, levemente visível só no cartão com foco; controles com rótulo.
- Gaveta: rótulo com a contagem, aviso diz onde o cartão está, desfazer; devolver destaca o cartão.
- Avisos: mesmo lugar e mesmo tempo, dizendo o que aconteceu e onde está.

### `organizer.test.cjs` (13): organizador

- Abre na ordem de leitura da mesa; grupo entra como uma peça; nada muda na mesa.
- Mover pelo teclado e arrastando, pôr de lado e notas sobrevivem ao recarregar.
- Salvar com nome; cartão escrito depois espera na bandeja e entra com um clique.
- Separar o grupo vale só naquela ordem; na mesa ele continua junto.
- Embaralhar com duas peças sempre troca a ordem; ordem salva nunca é sorteada.
- "Dispor na mesa" arruma em fileiras na ordem, os de lado depois; desfazer volta tudo.
- `Ctrl+Z` desfaz no organizador; excluir uma ordem tem desfazer.
- Cartão excluído some da ordem e volta ao mesmo lugar se restaurado.
- Backup leva as ordens; importar traz as nomeadas com os cartões novos.
- Demonstração não toca a lixeira nem as ordens reais.
- Grupo grande aparece inteiro; o zoom da leitura amplia e a área rola.
- "Dispor na mesa" leva o grupo como um bloco; o arranjo interno não muda.
- A ordem em teste acompanha os grupos feitos depois dela; "dispor na mesa" não os desmancha.

---

## 4. Ideias do dono para o programa real

Citação literal do `CLAUDE.md` ("O que este projeto é"), decisão de 2026-11-13:

> **Por que não é a base:** o dono prevê funcionalidades que pedem código grande e bem pensado desde a estrutura, por exemplo identificar texto e padrões, indexar cartões a documentos e sugerir cartões para relembrar com base no que está sendo ou foi escrito no documento atual. São ideias para o programa real, **não** pendências deste protótipo.

As três ideias, nos termos dele:

1. "identificar texto e padrões";
2. "indexar cartões a documentos";
3. "sugerir cartões para relembrar com base no que está sendo ou foi escrito no documento atual".

Não foram projetadas aqui. O insumo que o protótipo pode dar a elas é o diário: os marcadores `[reencontrar]` e `[lembrar]` da seção "Como anotar" do `USO.md` registram os momentos em que o dono sentiu falta de achar ou de ser lembrado de um cartão.

Outros candidatos registrados para "depois da validação" (`PLANO_AJUSTES_ABORDAGEM.md`), sem ordem: DOCX/ODT; uso por outros escritores; ícone e assinatura; busca de cartões e editor de texto corrido dentro do app; teste de falha real de renomear arquivo no Windows.

---

## 5. Problemas achados nos testes e no uso

### No uso do dono

| Quando | Problema | Situação |
|---|---|---|
| 03-11 (~2 min de uso) | Não há como exportar; falta zoom e navegação; falta redimensionar; o embaralhar é só leitura; falta indicador de salvo; não se sabe o que é clicável; a dica fixa do rodapé atrapalha; avisos e gaveta confusos. | Tratados nas Fases 5 a 8; aguardam a conferência do dono. |
| 12-11 (teste de versão intermediária, `USO.md`) | No organizador, grupo grande aparecia cortado e não dava para redimensionar. | Corrigido no 1.4.0 ("ajustado" + zoom da leitura). |
| 12-11 | "Dispor na mesa" desmanchava o arranjo interno dos grupos. | Corrigido no 1.4.0 (grupo vai como bloco). |
| 12-11 | A prévia do exportador não mostrava o documento inteiro. | Corrigido no 1.4.0. |
| 12-11 a 13-11 | Uma ordem criada antes de os cartões serem agrupados mostrava cada cartão solto, e "dispor na mesa" soltava os grupos. | Corrigido no 1.4.1. |
| 03-11 a 13-11 | Instaladores enviados pelo chat (121 MB) nunca chegaram ao dono. | Fluxo do GitHub Actions criado em 23-11 (`CLAUDE.md`, "Empacotar"); o download pelo dono não foi confirmado. |
| 13-11 | Na máquina do dono: PowerShell bloqueando o `npm`; npm novo sem rodar scripts de instalação; clone dentro do Dropbox (risco de bloqueio de arquivos no build). | Contornos registrados em "Empacotar"; o aviso do npm não impediu o build no Windows do GitHub. |

### Na revisão de código e nos testes

- **Perda de dados (C1 a C7, 03-11):** todos tratados nas Fases 0 a 4 (seção 2.12). Lição para o programa real: o demo nunca grava nos dados reais; ler nunca destrói; falha de gravação nunca é silenciosa; gravar em mais de um evento de fechamento; lixeira em vez de desfazer único; uma só instância grava.
- **I1 a I8:** I1 (cartões fora da janela), I2/I3 (grupo dividido entre mesa e gaveta), I6 (embaralhar repetindo com 2 peças), I7 (Backspace não desfazia a conversão markdown), I8 (Backspace apagava sem desfazer um cartão só com espaços), resolvidos. I5 (ids aleatórios fracos) foi resolvido com `crypto.randomUUID`. I4 (sem versão de esquema) foi resolvido em parte: os campos são validados ao carregar e o inválido vai para a quarentena, mas o registro salvo (`{ savedAt, cards, trash, org }`) não tem campo de versão; só o backup `.json` traz `version: 2`. Para o programa real: versionar o formato desde o começo.
- **O demo gravava na lixeira real** do navegador (achado na Fase 5). Corrigido.
- **Restaurar instantâneo não funcionava no app desktop** (o recarregamento era bloqueado e o arquivo em disco, mais novo, vencia). Corrigido na Fase 6.
- **Pilha aparecia por 1 px** num cartão cheio até a última linha; **botões do cartão roubavam o foco do texto**. Corrigidos na Fase 7b.
- **"Dispor na mesa" sobrepunha fileiras** quando a mesa não rolava. Corrigido na Fase 7a.
- **Armadilhas técnicas** que valem como aviso: `window.prompt()` não existe no Electron; o atalho de zoom de página do Electron tomava `Ctrl+0`/`Ctrl+1`; download com acento no nome vira "download" no Chromium; nos testes, um script de preparação lendo `localStorage` num recarregamento rápido parecia perda de dados e era o teste.

### O que nunca foi verificado (`HANDOFF_2026-11-12.md`, seção 3)

Nada rodou no Windows do dono; diálogo de salvar real; paginação do PDF com a fonte do Windows; "Fazer backup" pelo diálogo do Electron; touchpad (roda e pinça) e `Alt+1/2/3` em teclado ABNT; os dados reais do dono; as capturas de tela do relato de 12-11; lentidão com centenas de cartões. O `ROTEIRO_CONFERENCIA.md` cobre parte disso.

---

## 6. Perguntas ao dono

Cada uma com o que muda no produto conforme a resposta.

### As nove de `HANDOFF_2026-11-12.md` (seção 4), ainda sem resposta

1. **Cartão que foi escrito e depois esvaziado:** hoje some ao perder o foco, e o desfazer daquele texto vai junto. Deve ir para a lixeira com o último texto que teve?
   - *Sim:* "cartão vazio some sozinho" passa a ter uma exceção (o que já teve texto vai para a lixeira); a regra "nunca perder texto" fica mais forte.
   - *Não:* fica como está; apagar tudo e sair é tratado como descartar.
2. **Negrito e itálico no TXT:** ficam como `**assim**` ou o TXT sai limpo?
   - *Com sinais:* o TXT continua igual ao que se digita.
   - *Limpo:* o TXT perde a formatação, e o MD passa a ser o formato "com formatação" em texto.
3. **Linha de atalhos do organizador:** fazia falta?
   - *Não:* confirma que nenhuma dica fica fixa na tela.
   - *Sim:* abre uma quarta exceção à "zero poluição visual", ou outra forma de mostrar os atalhos.
4. **Zoom do organizador:** o "ajustado" e o zoom resolvem? Deve ser lembrado entre sessões?
   - *Resolve:* o modelo "peça inteira por padrão + zoom manual" vai adiante.
   - *Lembrar:* o zoom vira preferência guardada, como a câmera da mesa.
5. **"Dispor na mesa" com um grupo separado numa ordem:** volta à mesa separado (hoje) ou junto?
   - *Separado:* a ordem pode desfazer grupos na mesa quando se pede para dispor.
   - *Junto:* "dispor na mesa" nunca desfaz um grupo; separar vale só para a leitura.
6. **Tamanhos P/M/G:** as medidas (4, 6 e 9 linhas) servem? E a letra igual nos três?
   - *Sim:* as medidas vão adiante.
   - *Não:* mudam as medidas, ou a letra passa a acompanhar o tamanho (o cartão vira "zoom" em vez de "mais espaço").
7. **Modo mapa a 45%:** o limite está bom?
   - Muda só o ponto em que o mapa entra; se o mapa não for usado, ele é candidato a sair do programa real.
8. **Diário:** houve uso por vontade própria desde a Fase 5 que deva ser anotado?
   - *Sim:* entra no `USO.md` como contexto (não conta para a meta, que começa com o 1.4.1).
   - *Não:* o diário segue com uma entrada só.
9. **As capturas da pasta "Testes Nabokov"** mostravam algo além dos três pontos escritos?
   - *Sim:* problemas novos a tratar antes da validação ou registrar aqui.
   - *Não:* o relato de 12-11 está completo.

### Surgidas nos blocos de 2026-11-23

10. **O download do instalador pelo GitHub funcionou?** (aba Actions → execução → Artifacts → `Cartoes-Setup`; precisa estar logado; vem um `.zip`.)
    - *Sim:* esse passa a ser o caminho para receber versões novas, e a conferência das fases pode começar.
    - *Não:* volta-se ao `npm run dist` na máquina dele, ou se procura outro jeito de entregar.
11. **O aviso do Windows na primeira execução** (instalador sem assinatura) atrapalhou?
    - *Não:* assinatura continua fora do protótipo.
    - *Sim, a ponto de não instalar:* a assinatura sobe na lista do programa real (ou para outros escritores, antes da distribuição).
12. **Os marcadores `[reencontrar]` e `[lembrar]` no diário servem, ou prefere uma coluna própria?**
    - *Marcadores:* o diário fica como está.
    - *Coluna:* a tabela do `USO.md` ganha uma coluna (as entradas antigas ficam com ela vazia). Em qualquer caso, essas anotações são o insumo principal para "indexar" e "sugerir cartões" no programa real.
13. **Uma sessão aberta para conferir, em que você acabou escrevendo de verdade, conta como "vontade" ou "teste"?**
    - *Vontade:* a meta da validação fica mais fácil de atingir e mede "escrever", não "abrir".
    - *Teste* (o que o guia do diário sugere hoje, na dúvida): a meta mede só o voltar sem motivo externo, que é o sinal combinado em 11-11.
