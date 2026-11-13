# Cartões — editor para escritores

Programa desktop para escritores: editor de texto com organização integrada, inspirado no método de fichas de Vladimir Nabokov. Cartões de livre manipulação num quadro; depois, o texto corrido.

**Princípio central:** reduzir ao máximo a carga cognitiva para escrever as primeiras palavras. O usuário nunca deve sentir limite nem "obrigação" de escrever muito.

## O que este projeto é: protótipo exploratório

Decidido pelo dono em 2026-11-13. Este código **não é a base do programa real**. O programa será desenvolvido do zero no semestre seguinte, com outra estrutura.

- **Para que serve o protótipo:** descobrir o que o programa deve ser e validar a ideia no uso (ver "Validação" em `docs/PLANO_AJUSTES_ABORDAGEM.md`).
- **O que vai adiante:** as decisões de produto (conceito do cartão, organizador, interface), os problemas achados nos testes e o diário de uso (`docs/USO.md`). Os testes automatizados servem de referência do comportamento esperado, caso a caso.
- **O que não vai adiante:** a estrutura do código. Não é descartável enquanto durar a validação: o dono escreve nele de verdade, então "nunca perder texto" continua valendo.
- **Por que não é a base:** o dono prevê funcionalidades que pedem código grande e bem pensado desde a estrutura, por exemplo identificar texto e padrões, indexar cartões a documentos e sugerir cartões para relembrar com base no que está sendo ou foi escrito no documento atual. São ideias para o programa real, **não** pendências deste protótipo.

Consequências para quem trabalha aqui:

- Não investir no que só importaria num programa definitivo: assinatura do instalador, ícone próprio, distribuição, refatorações de estrutura, desempenho com volumes grandes.
- Investir no que ajuda a aprender: corrigir o que atrapalha o uso, registrar decisões e motivos, manter o diário.
- Antes de propor uma funcionalidade nova, perguntar se ela testa uma dúvida de produto. Se não testa, fica para o programa real.

## Estado atual

App desktop (Electron, Windows x64) com cartões, grupos por ímã, gaveta, categorias, organizador de ordens (Fase 5), pontinho de salvo, menu ≡ (lixeira, instantâneos, atalhos) e exportação TXT/MD/PDF (Fase 6), mesa infinita com deslocamento e zoom (Fase 7a), tamanhos P/M/G, seleção múltipla e modo mapa (Fase 7b), revisão de interface (Fase 8), lixeira, backup `.json` e salvamento robusto (disco atômico + IndexedDB + localStorage, instantâneos, aba única). 73 testes automatizados (`npm test`). Instalador gerado (`npm run dist`), sem ícone próprio nem assinatura. Ainda roda também como `index.html` no navegador.

O estado de cada fase (feita / aguardando conferência do dono) fica em `docs/PLANO_FASES_5_A_8.md`.

Documentos de contexto, em `docs/`:

- `docs/PLANO_AJUSTES_ABORDAGEM.md`: ajustes de 2026-11-11 (ordem das fases, como fechar uma fase, validação). **Vale sobre os outros planos.**
- `docs/PLANO_FASES_5_A_8.md`: plano das fases e decisões de produto.
- `docs/USO.md`: diário de uso (o dono anota quando quiser; o Claude pergunta no início de cada sessão e completa).
- `docs/HANDOFF_*.md`: registros de sessões passadas (histórico; não são atualizados). O mais recente é `HANDOFF_2026-11-12.md` (Fases 6 a 8, decisões tomadas sozinho, o que não foi verificado e perguntas ao dono).
- `docs/REVISAO_E_PLANO_SALVAMENTO.md`: histórico da revisão e do plano de salvamento (Fases 0–4).

- `src/main.js`: lógica (ProseMirror, quadro, arrasto, persistência, organizador, menu, janela de exportar, demo)
- `src/export.js`: funções puras que montam o documento exportado (TXT, MD e o HTML do PDF)
- `src/style.css`: todo o visual
- `src/template.html`: casca HTML com marcadores `/*__CSS__*/` e `/*__JS__*/`
- `build.mjs`: empacota tudo em `index.html` (esbuild, um arquivo, funciona offline)
- `index.html`: **gerado, não editar à mão**

```bash
npm install
node build.mjs     # regenera index.html
```

Abrir `index.html#demo` carrega cartões de exemplo (inclui um com estouro de texto).

## Conceito do cartão (não quebrar)

1. **Bloco finito, virtualmente ilimitado.** Tamanho fixo (340×214, proporção de ficha; P e G são a exceção registrada abaixo). Nunca cresce, nunca bloqueia a digitação.
2. **Estouro = pilha.** Quando há mais texto do que cabe, o texto rola dentro do cartão e surgem folhas atrás dele (`data-depth` 0–3, calculado em `measure()`). Fade nas bordas indica conteúdo acima/abaixo. Foi decisão explícita: **não** encadear em segundo cartão.
3. **Zero poluição visual.** Sem barra de ferramentas, sem título, sem placeholder, sem campos obrigatórios. Controles (categorias, tamanho, guardar, ×) só no hover; a pega e a faixa de arrasto só no hover ou no cartão com foco (exceção abaixo).
4. **Cartão novo nasce com foco e cursor piscando.** Primeira visita: um cartão em branco já pronto.
5. **Cartão vazio some sozinho** ao perder o foco; ninguém limpa a mesa.
6. **Estilo papel:** ficha com linha vermelha no topo, pauta azul, textura, leve inclinação por cartão (endireita no foco), fonte serifada. Sem fontes externas.
7. **Arrastar só pela moldura** (faixa superior), nunca pelo texto, para não conflitar com seleção.

### Exceções decididas pelo dono

Só estas três são aceitas. Qualquer outro elemento visível por padrão continua errado.

| Exceção | Toca o item | Decidida em | Motivo | Entra na |
|---|---|---|---|---|
| Tamanhos P/M/G, sempre na proporção de ficha | 1 (tamanho fixo) | 2026-11-03, registrada em 2026-11-11 | O dono pediu redimensionar; três tamanhos fixos dão a escolha sem abrir a porta para ajuste fino, que aumentaria a carga cognitiva. Dentro de cada tamanho o cartão continua fixo: não cresce nem bloqueia a digitação. | Fase 7b |
| Pontinho de salvo sempre visível (no canto da mesa, fora do cartão) | 3 (zero poluição visual) | 2026-11-03, registrada em 2026-11-11 | O salvamento era invisível e só aparecia quando falhava; o dono quer a confirmação à vista. | Fase 6 |
| Moldura levemente visível só no cartão com foco | 3 (controles só no hover) | 2026-11-11 | O dono não sabia o que era clicável nem por onde arrastar. Fora do foco nada muda. | Fase 8 |

## Decisões técnicas

- **ProseMirror** com schema mínimo: `doc > paragraph+`, marcas `strong` e `em`. Formatação só por markdown (`**x**`, `*x*`, `_x_`) e `Mod-B/I`. Não adicionar toolbar.
- **Um `EditorView` por cartão**, JS puro, sem framework. Arrasto com Pointer Events, sem biblioteca.
- **Mesa e câmera (Fase 7a):** os cartões e as molduras de grupo ficam em `#world`, dentro de `#board`. `x`/`y` de cada cartão são posições **do mundo** e nunca mudam por causa da câmera.
  - Câmera `cam = { x, y, z }` (`tela = mundo * z + (x, y)`), aplicada como `transform` do `#world`. É preferência de tela: fica em `localStorage` `cartoes.ui.cam` (demo: `cartoes.demo.cam`), **fora** do projeto salvo. Mover ou aproximar a mesa não grava o projeto.
  - `toWorld(sx, sy)`, `viewRect()`, `zoomAt(sx, sy, z)`, `fitAll()` (Ctrl+0), `reveal(lista)` (desloca o mínimo para mostrar os cartões).
  - Arrastar o fundo ou o botão do meio move; roda rola; `Shift`+roda de lado; `Ctrl`+roda dá zoom no cursor (20% a 200%; perto de 100% vira 100%). Sobre um cartão com texto sobrando, a roda rola o texto dele.
  - Ao abrir, se nenhum cartão aparece na janela, enquadra tudo (resolve o I1).
  - Um grupo nunca fica metade na mesa e metade na gaveta: `cleanGroups()` separa a parte guardada (I2/I3).
- **Tamanhos P/M/G (Fase 7b):** `SIZES` = 252×158, 340×214, 474×298 (4, 6 e 9 linhas de pauta). `wOf(c)`/`hOf(c)` em todo cálculo de geometria (ímã, moldura, enquadrar, dispor na mesa). Botões `P M G` no hover (`.sizes`) e `Alt+1/2/3`. O canto de cima à esquerda não sai do lugar; a letra é a mesma, muda quanto texto aparece.
- **Seleção múltipla (Fase 7b):** `sel` (Set de cartões), classe `.selected`, barra `#selbar`.
  - `Shift`+arrastar no fundo desenha a caixa (`startBox`); `Shift`/`Ctrl`+clique num cartão põe ou tira (no texto: `Ctrl`+clique sempre; `Shift`+clique só se o cursor não estiver naquele cartão). Clique no fundo ou `Esc` solta.
  - Arrastar um selecionado move todos, com os colegas de grupo (`selUnits()`), sem ímã. `Shift`+arrastar só solta do grupo quando o arrasto começa de fato.
  - Em lote: tamanho, guardar, excluir (`Delete`). Tudo com desfazer.
- **Desfazer da mesa:** `Ctrl+Z` sem cursor num cartão (`rememberMesa`/`undoMesa`) desfaz mover, tamanho e as ações em lote. As ações em lote também têm "desfazer" no aviso; `once()` garante que cada uma só é desfeita uma vez. Não há refazer.
- **Modo mapa (Fase 7b):** abaixo de `MAP_Z` = 45% o `body` ganha a classe `map`: some o texto miúdo e aparece `.mapface` (primeiras 8 palavras, letra grande), com a faixa de cima na cor da categoria. No mapa o cartão inteiro arrasta e um clique aproxima até ele (`zoomToCard`).
- **Dados:** `{ id, x, y, z, r, g, cat, s, stashed, sa, doc }` por cartão (`g` = grupo, `cat` = cena/nota/lugar, `s` = tamanho `'p'`/`'g'` ou `null` para M, `stashed`/`sa` = gaveta, `doc` = JSON do ProseMirror).
- **Organizador (Fase 5)**, evolução do antigo "embaralhar" (botão "organizar" ou `E`). Estado `org = { orders, cur }`; ordem `{ id, name|null, note, notes: {idDoCartão: texto}, items: [{ ids, aside, split? }], createdAt, updatedAt }`.
  - **Uma ordem nunca mexe na mesa.** A exceção é "dispor na mesa": arruma em fileiras na ordem a partir do canto do mundo (a janela vai para lá, a 100%), com o que está de lado ou fora da ordem nas últimas fileiras, e pode ser desfeito pelo aviso (a câmera também volta).
  - **A ordem em teste acompanha os grupos da mesa** (`syncGroups`, ao abrir o organizador): cartões agrupados depois de a ordem existir viram uma peça só, e os desagrupados viram peças soltas. Peças separadas de propósito na ordem (`split: true`) ficam como estão. Ordens com nome nunca são alteradas por isso.
  - Peça = um cartão ou um grupo. "Separar o grupo nesta ordem" vale só na ordem. "Pôr de lado" (`↑`/`↓`) mantém a peça na fileira, erguida e esmaecida, fora da leitura.
  - Há no máximo uma ordem sem nome ("em teste"). "Salvar" dá nome; numa ordem já nomeada vira "salvar como nova". Embaralhar uma ordem nomeada cria uma ordem em teste e deixa a nomeada intacta.
  - Cartões fora da ordem esperam na bandeja "fora da ordem": clique põe no fim, arrastar põe no lugar. Arrastar da fileira para a bandeja tira o cartão da ordem.
  - Cartão excluído fica nos `items` enquanto estiver na lixeira, então volta ao mesmo lugar se for restaurado. `pruneOrg()` limpa ao abrir o que não existe mais.
  - `Ctrl+Z`/`Ctrl+Shift+Z` desfazem as operações de ordem (pilha própria, só dentro do organizador).
  - Teclas: `←/→` ler, `Alt+←/→` mover, `↑/↓` de lado, `R` embaralhar, `C` notas, `Ctrl+S` salvar ordem, `Ctrl +`/`Ctrl -`/`Ctrl+0` zoom da leitura, `Esc` volta à mesa.
- **Persistência (nunca perder texto):**
  - IndexedDB `cartoes` (stores `kv` = estado `{savedAt, cards, trash, org}` e `snaps` = instantâneos) é o principal; `localStorage` `cartoes.v1` (+ `.t`, `cartoes.trash`, `cartoes.org`) é o espelho síncrono. Ao abrir vale o mais novo. O `projeto.json` do app desktop guarda o mesmo registro (com `org`). O demo usa `cartoes.demo`, `cartoes.demo.trash` e `cartoes.demo.org`.
  - Salva 400 ms após a última edição, no máximo 3 s de espera; também em `pagehide`/`visibilitychange`/`beforeunload`.
  - Só uma aba grava (Web Locks `cartoes-writer`); as outras abrem somente leitura e assumem quando a dona fecha.
  - Carregar nunca destrói: JSON ilegível → `cartoes.corrompido.<hora>`; cartão inválido → `cartoes.quarentena`; `cartoes.bak` guarda o estado ao abrir. Falha de gravação mostra aviso.
  - `#demo` grava só em `cartoes.demo`.
  - Lixeira: até 50 excluídos, persistente; tecla `T` reabre o último. Instantâneos: 20 recentes + 1 por dia (7 dias), a cada 5 min de atividade.
  - **App desktop (Electron):** `electron/main.cjs` (processo principal, dono do disco) + `electron/preload.cjs` (ponte `window.cartoesDisk`; a página não vê Node). Projeto em `<userData>/cartoes/projeto.json` (`CARTOES_DATA_DIR` sobrescreve, usado nos testes), gravação atômica (tmp + fsync + rename, com retentativa em EPERM/EBUSY), `projeto.json.bak` (renovado a cada ≥30 s) e `snapshots/<ms>.json` (20 + 1 por dia, 7 dias). Arquivo ilegível nunca é sobrescrito: vai para `projeto.corrompido-<hora>.json` e carrega-se `.bak` ou o último instantâneo. Ao abrir vale o registro mais novo entre disco, IndexedDB e localStorage (empate: disco), então quem já tinha dados no navegador é migrado sem apagar a origem. No fechamento a gravação é síncrona (`saveSync`). Instância única. `Ctrl+N` fica livre.
  - Rodar: `npm start` (rebuilda e abre o Electron).
  - `Ctrl+S` (na mesa) exporta `.json` com cartões, lixeira e ordens; `Ctrl+O` importa (só acrescenta; ordens nomeadas entram como "(importada)", com os ids novos). Console: `cartoes.snapshots()`, `cartoes.restore(t)`, `cartoes.trash()`, `cartoes.ordens()`, `cartoes.exportText()`.
- **Pontinho de salvo (Fase 6):** `#saved`, no canto superior direito. Classe `saved` (cinza), `saving` (pisca enquanto há edição por gravar), `failed` (vermelho) ou `ro` (vazado, aba somente leitura). O texto do hover fica em `data-tip` ("salvo às 14:32 · em disco" / "neste navegador" / "só nesta demonstração").
- **Menu ≡ (Fase 6):** `#menu-btn` ao lado de "organizar". Itens: Exportar… (`Ctrl+E`), Importar backup… (`Ctrl+O`), Fazer backup (.json) (`Ctrl+S`), Lixeira, Instantâneos, Atalhos (`F1`). As janelas usam a mesma "folha" (`#sheet`, `openSheet`/`closeSheet`); com ela aberta as teclas não chegam à mesa e `Esc` fecha.
  - Instantâneos: `listSnapshots()` junta os do IndexedDB e, no app desktop, os de `snapshots/` (`disk.snapshots`/`disk.snapshotGet`). `restoreSnapshot(t)` guarda o estado de agora como instantâneo, grava o antigo com hora mais nova em todos os destinos (inclusive o disco) e recarrega.
- **Exportar (Fase 6):** janela com ordem (cada ordem ou a leitura da mesa), modelo (`corrido` / `secao` / `ficha`) e formato (`pdf` / `txt` / `md`), mais a prévia. Peças de lado não saem. Negrito e itálico saem como `**x**` e `*x*` em TXT e MD.
  - App desktop: `disk.exportFile` / `disk.exportPdf` abrem o diálogo de salvar do sistema e gravam no processo principal; o PDF é paginado por `printToPDF` numa janela escondida e sem scripts. `disk.exportReveal` mostra na pasta o último arquivo exportado (a página não escolhe caminho).
  - Navegador: download (sem acento no nome) ou a impressão do navegador, no PDF.
  - Console: `cartoes.exportText(idDaOrdem | 'mesa', modelo, formato)` devolve o texto sem gravar nada.
  - DOCX/ODT ficam para depois da validação.
- **Interface (Fase 8):**
  - Moldura no foco: `.paper::after` (faixa de cima) e `.grip` aparecem só com `:focus-within`. Todo controle do cartão tem `title` dizendo o que faz.
  - Não há dica fixa. `firstTip()` mostra `#tip` uma única vez (`cartoes.ui.dica`), fora do cartão, por 12 s.
  - Avisos: `say`/`sayAct`/`sayUndo`, todos com `TOAST_MS` = 6 s e no mesmo lugar, no formato "o que aconteceu · onde está" + "desfazer" quando dá. Os de falha de gravação e de aba somente leitura ficam até resolver.
  - Gaveta: rótulo `gaveta (N)`; `stashUnit` faz o cartão voar até ela; `restoreUnit` leva a mesa até o cartão (`reveal`) e o destaca (`arrived`). Guardar e devolver têm "desfazer" e entram no `Ctrl+Z` da mesa.
  - Organizador: sem linha de atalhos no rodapé; botão "atalhos" (F1). **Zoom da leitura:** `orgZoom` (`null` = "ajustado": a peça inteira cabe, encolhendo até 55%; número = zoom fixo, de 30% a 250%). `Ctrl`+roda, `Ctrl +`/`Ctrl -`, botões − e +; `Ctrl+0` ou o botão do meio voltam ao ajustado. A área de leitura rola e nunca corta. Num grupo, cada cartão mostra o texto todo.
  - "Dispor na mesa" leva cada grupo da mesa como um bloco (o arranjo interno não muda); só peças que não são grupo na mesa são postas lado a lado.
  - Exportar: a prévia mostra o documento inteiro, com rolagem.
- Atalhos: `E` abre o organizador; duplo clique no fundo ou `N` cria cartão (o `N`, no centro do que a janela mostra); `Ctrl+0` mostra todos os cartões, `Ctrl+1` volta a 100%, `Ctrl +`/`Ctrl -` zoom; `Ctrl/⌘+Enter` cria o próximo ao lado; `Esc` tira o foco; `Backspace` em cartão sem nenhum caractere o apaga (um cartão só com espaços perde os espaços um a um, e `Ctrl+Z` os devolve); `Backspace` logo depois de uma conversão markdown a desfaz.
- Interface em português (pt-BR).

## Próximos passos

O que falta fazer e as pendências ficam **só nos planos** (não repetir aqui):

- `docs/PLANO_AJUSTES_ABORDAGEM.md`: ordem das fases (6, 7a, 7b, 8), validação depois da Fase 8, "Pendências ainda abertas" e "Depois da validação".
- `docs/PLANO_FASES_5_A_8.md`: o que cada fase contém e o estado de cada uma.

## Empacotar (Windows)

```bash
npm run dist       # instalador: dist/Cartoes-Setup-<versão>.exe (NSIS, por usuário, sem admin)
npm run dist:dir   # só o app descompactado: dist/win-unpacked/Cartões.exe
```

- electron-builder, configuração no campo `build` do `package.json`. O pacote leva só `index.html`, `electron/` e `package.json`; ProseMirror e esbuild são devDependencies porque já vão embutidos no `index.html`.
- Gerar o instalador no Linux exige `wine` e `wine32` (o NSIS roda o desinstalador por ele). Foi assim que os instaladores 1.1.0 em diante foram gerados.
- `"publish": null` no `build`: sem isso o electron-builder tenta adivinhar um destino de publicação pelo repositório git e falha no fim.
- Sem ícone próprio (usa o do Electron) e sem assinatura de código: o Windows SmartScreen vai avisar na primeira execução. `signAndEditExecutable: false` evita a exigência de privilégio de symlink no build; para assinar/colocar ícone, remova essa opção e configure `win.icon` e um certificado.
- Desinstalar não apaga os dados (`deleteAppDataOnUninstall: false`); o projeto fica em `<userData>\cartoes\projeto.json` (pasta do app em `%APPDATA%`; não conferi o nome exato dela no app instalado).
- `dist/` é gerado; não editar nem versionar.

## Testes

```bash
npm test              # rebuilda e roda tudo (node:test + Playwright, 73 testes, ~2 min)
npm run test:browser  # persistência no navegador (contextos limpos)
npm run test:electron # app desktop; isolado por CARTOES_DATA_DIR (arquivo e perfil do Chromium)
```

- `tests/browser.test.cjs`: salvar, demo isolado, JSON ilegível, quarentena, aviso de falha, IndexedDB x espelho, aba única, teto de espera, lixeira, backup/importar, instantâneos, I7, I8, pontinho de salvo.
- `tests/electron.test.cjs`: ponte sem Node, gravação ao fechar, disco como fonte, `.bak`/instantâneos/recuperação, instância única, ordens no `projeto.json`, pontinho "em disco", restaurar instantâneo do disco, Ctrl+0/Ctrl+1 da mesa, exportar TXT/MD/PDF pelo diálogo (o diálogo é trocado por uma resposta fixa com `app.evaluate`).
- `tests/organizer.test.cjs`: ordem de leitura da mesa, mover (teclado e arrasto), pôr de lado, notas, salvar com nome, bandeja, separar grupo, embaralhar (I6), dispor na mesa + desfazer (inclusive com o grupo como bloco), Ctrl+Z, lixeira devolve ao lugar, exportar/importar ordens, demo isolado, grupo grande ajustado e zoom da leitura.
- `tests/menu.test.cjs`: menu ≡, lixeira, instantâneos, atalhos (F1), demo isolado, dica de primeira visita, botão "atalhos" do organizador.
- `tests/mesa.test.cjs`: arrasto, ímã, grupos, criação de cartões; câmera (deslocar, zoom no cursor, Ctrl+0/Ctrl+1, posições do mundo com zoom), janela menor (I1), roda sobre cartão com texto, grupo e gaveta (I2/I3); tamanhos P/M/G (ímã e moldura mistos); seleção múltipla e ações em lote; modo mapa; moldura no foco; avisos e gaveta.
- `tests/export.test.cjs`: conteúdo de cada modelo e formato, escapes, janela Exportar e download, prévia completa.
- Depois de `goto`, espere `.ProseMirror-focused` antes de digitar: a inicialização é assíncrona e teclas antes disso caem nos atalhos globais.
- `seed()` (em `tests/helpers.cjs`) grava os dados iniciais abrindo antes `tests/blank.html` (mesma origem `file://`). Não use `addInitScript` para ler ou gravar `localStorage`: num recarregamento rápido ele enxerga o armazenamento vazio e a página perde o que acabou de gravar (só no Playwright; sem script de preparação o app não perde nada, conferido em 40 recargas imediatas).
- Nunca rode testes sem `CARTOES_DATA_DIR` no Electron: sem isso eles gravam no perfil real do usuário.
- Num contêiner Linux como root: `ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test` (sem isso o teste da segunda instância falha, porque o Electron não abre como root). Se o Playwright do `package.json` não casar com o Chromium já instalado, `npm i --no-save playwright@<versão instalada>` resolve sem mexer no `package.json`.

## Regras para trabalhar aqui

- **Abrir uma fase:** só com "Sim, Fase N" do dono.
- **Bloco:** uma unidade de trabalho que faz sentido sozinha e deixa os testes passando. Fazer um bloco por vez; `npm test` passando e um commit ao fim de cada um.
- **Fechar uma fase:** os três são obrigatórios.
  1. `npm test` passa.
  2. Instalador novo gerado (`npm run dist`), com a versão aumentada.
  3. O dono instala e confere por alguns minutos que nada quebrou. Só então a fase vira ✅ no plano; até lá fica "feita, aguardando conferência".
- **Diário de uso:** no início de cada sessão, perguntar ao dono se houve uso desde a última vez e registrar em `docs/USO.md`.
- **Pendências num lugar só:** nos planos. Este arquivo só aponta para eles; os `HANDOFF_*` são histórico.
- Git: o projeto é versionado em `lvitalismoser-creator/NABOKOV`, com a raiz do repositório uma pasta acima desta. Se a cópia local em `D:\` não tiver a pasta `.git`, a regra do commit não vale ali até alguém clonar o repositório (ou rodar `git init`).
- Sem dependências novas além das já listadas sem perguntar.
- Antes de mexer no visual do cartão, reler "Conceito do cartão". Se uma mudança adicionar elemento visível por padrão e não for uma das três exceções registradas, está errada.
- Validar visualmente: Playwright já está disponível (`require('playwright')`); tirar screenshot do quadro com `#demo` e conferir pilha, fade e pauta (a pauta fica serrilhada em gradientes com cantos duros em cartões rotacionados; manter bordas suaves).
- Não editar `index.html` diretamente; sempre rebuildar.
- Não tocar nos dados reais do dono: Electron só com `CARTOES_DATA_DIR`.
