# Cartões — editor para escritores

Programa desktop para escritores: editor de texto com organização integrada, inspirado no método de fichas de Vladimir Nabokov. Cartões de livre manipulação num quadro; depois, o texto corrido.

**Princípio central:** reduzir ao máximo a carga cognitiva para escrever as primeiras palavras. O usuário nunca deve sentir limite nem "obrigação" de escrever muito.

## Estado atual

App desktop (Electron, Windows x64) com cartões, grupos por ímã, gaveta, categorias, organizador de ordens (Fase 5), menu ≡ com lixeira, instantâneos e atalhos, pontinho de salvo, exportação em docx/odt/pdf/txt/md (Fase 6), backup/importação `.json` e salvamento robusto (disco atômico + IndexedDB + localStorage, instantâneos, aba única). 49 testes automatizados (`npm test`). Diário da Fase 6: `FASE_6_DIARIO.md`. Última passagem de contexto: `HANDOFF_2026-11-11.md`. Plano em andamento: `PLANO_FASES_5_A_8.md`. Instalador gerado (`npm run dist`), sem ícone próprio nem assinatura. Ainda roda também como `index.html` no navegador. Histórico da revisão e do plano de salvamento: `REVISAO_E_PLANO_SALVAMENTO.md`.

- `src/main.js`: lógica (ProseMirror, quadro, arrasto, persistência, organizador, menu, janela de exportar, demo)
- `src/export.mjs`: exportação pura (modelos e formatos), sem DOM; `src/zip.mjs`: ZIP mínimo para `.docx`/`.odt`
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

1. **Bloco finito, virtualmente ilimitado.** Tamanho fixo (340×214, proporção de ficha). Nunca cresce, nunca bloqueia a digitação.
2. **Estouro = pilha.** Quando há mais texto do que cabe, o texto rola dentro do cartão e surgem folhas atrás dele (`data-depth` 0–3, calculado em `measure()`). Fade nas bordas indica conteúdo acima/abaixo. Foi decisão explícita: **não** encadear em segundo cartão.
3. **Zero poluição visual.** Sem barra de ferramentas, sem título, sem placeholder, sem campos obrigatórios. Controles (grip de arrasto, ×) só no hover.
4. **Cartão novo nasce com foco e cursor piscando.** Primeira visita: um cartão em branco já pronto.
5. **Cartão vazio some sozinho** ao perder o foco; ninguém limpa a mesa.
6. **Estilo papel:** ficha com linha vermelha no topo, pauta azul, textura, leve inclinação por cartão (endireita no foco), fonte serifada. Sem fontes externas.
7. **Arrastar só pela moldura** (faixa superior), nunca pelo texto, para não conflitar com seleção.

## Decisões técnicas

- **ProseMirror** com schema mínimo: `doc > paragraph+`, marcas `strong` e `em`. Formatação só por markdown (`**x**`, `*x*`, `_x_`) e `Mod-B/I`. Não adicionar toolbar.
- **Um `EditorView` por cartão**, JS puro, sem framework. Arrasto com Pointer Events, sem biblioteca.
- **Dados:** `{ id, x, y, z, r, g, cat, stashed, sa, doc }` por cartão (`g` = grupo, `cat` = cena/nota/lugar, `stashed`/`sa` = gaveta, `doc` = JSON do ProseMirror).
- **Organizador (Fase 5)**, evolução do antigo "embaralhar" (botão "organizar" ou `E`). Estado `org = { orders, cur }`; ordem `{ id, name|null, note, notes: {idDoCartão: texto}, items: [{ ids, aside }], createdAt, updatedAt }`.
  - **Uma ordem nunca mexe na mesa.** A exceção é "dispor na mesa": arruma em fileiras na ordem, com o que está de lado ou fora da ordem nas últimas fileiras, e pode ser desfeito pelo aviso.
  - Peça = um cartão ou um grupo. "Separar o grupo nesta ordem" vale só na ordem. "Pôr de lado" (`↑`/`↓`) mantém a peça na fileira, erguida e esmaecida, fora da leitura.
  - Há no máximo uma ordem sem nome ("em teste"). "Salvar" dá nome; numa ordem já nomeada vira "salvar como nova". Embaralhar uma ordem nomeada cria uma ordem em teste e deixa a nomeada intacta.
  - Cartões fora da ordem esperam na bandeja "fora da ordem": clique põe no fim, arrastar põe no lugar. Arrastar da fileira para a bandeja tira o cartão da ordem.
  - Cartão excluído fica nos `items` enquanto estiver na lixeira, então volta ao mesmo lugar se for restaurado. `pruneOrg()` limpa ao abrir o que não existe mais.
  - `Ctrl+Z`/`Ctrl+Shift+Z` desfazem as operações de ordem (pilha própria, só dentro do organizador).
  - Teclas: `←/→` ler, `Alt+←/→` mover, `↑/↓` de lado, `R` embaralhar, `C` notas, `Ctrl+S` salvar ordem, `Esc` volta à mesa.
- **Persistência (nunca perder texto):**
  - IndexedDB `cartoes` (stores `kv` = estado `{savedAt, cards, trash, org}` e `snaps` = instantâneos) é o principal; `localStorage` `cartoes.v1` (+ `.t`, `cartoes.trash`, `cartoes.org`) é o espelho síncrono. Ao abrir vale o mais novo. O `projeto.json` do app desktop guarda o mesmo registro (com `org`). O demo usa `cartoes.demo`, `cartoes.demo.trash` e `cartoes.demo.org`.
  - Salva 400 ms após a última edição, no máximo 3 s de espera; também em `pagehide`/`visibilitychange`/`beforeunload`.
  - Só uma aba grava (Web Locks `cartoes-writer`); as outras abrem somente leitura e assumem quando a dona fecha.
  - Carregar nunca destrói: JSON ilegível → `cartoes.corrompido.<hora>`; cartão inválido → `cartoes.quarentena`; `cartoes.bak` guarda o estado ao abrir. Falha de gravação mostra aviso.
  - `#demo` grava só em `cartoes.demo`.
  - Lixeira: até 50 excluídos, persistente; tecla `T` reabre o último. Instantâneos: 20 recentes + 1 por dia (7 dias), a cada 5 min de atividade.
  - **App desktop (Electron):** `electron/main.cjs` (processo principal, dono do disco) + `electron/preload.cjs` (ponte `window.cartoesDisk`; a página não vê Node). Projeto em `<userData>/cartoes/projeto.json` (`CARTOES_DATA_DIR` sobrescreve, usado nos testes), gravação atômica (tmp + fsync + rename, com retentativa em EPERM/EBUSY), `projeto.json.bak` (renovado a cada ≥30 s) e `snapshots/<ms>.json` (20 + 1 por dia, 7 dias). Arquivo ilegível nunca é sobrescrito: vai para `projeto.corrompido-<hora>.json` e carrega-se `.bak` ou o último instantâneo. Ao abrir vale o registro mais novo entre disco, IndexedDB e localStorage (empate: disco), então quem já tinha dados no navegador é migrado sem apagar a origem. No fechamento a gravação é síncrona (`saveSync`). Instância única. `Ctrl+N` fica livre.
  - Rodar: `npm start` (rebuilda e abre o Electron).
  - **Pontinho de salvo** (`#save-dot`, canto superior direito, Fase 6): `data-state` = `saved` (cinza), `dirty` (mudança ainda não gravada), `saving` (um pulso por gravação), `failed` (vermelho), `ro` (somente leitura). Texto só no hover (`data-tip`): "salvo às 14:32 · em disco" / "· neste navegador" / "· demonstração". Só diz "salvo" depois que o destino principal confirmou. `setDot()` em `src/main.js`.
  - `Ctrl+S` (na mesa) faz o backup `.json` com cartões, lixeira e ordens; `Ctrl+O` importa (só acrescenta; ordens nomeadas entram como "(importada)", com os ids novos). Console: `cartoes.snapshots()`, `cartoes.restore(t)`, `cartoes.trash()`, `cartoes.ordens()`.
- **Menu ≡ (Fase 6)**: `#menu-btn` no canto (pontinho, organizar, ≡). Itens em `MENU` (`src/main.js`), cada um com o atalho ao lado: Exportar…, Importar backup…, Fazer backup (.json), Lixeira, Instantâneos, Atalhos. As janelas usam `#sheet` (`openSheet(título)` devolve o corpo; `closeSheet()`). Com menu ou janela abertos, os atalhos da mesa não valem (o `keydown` global devolve cedo para `menuKey`/`sheetKey`).
  - Lixeira: lista e devolve ao mesmo lugar. Instantâneos: restaurar com confirmação na linha (`restoreSnapshot(t)`); o estado atual vira instantâneo antes, e no app desktop o registro restaurado é gravado também no `projeto.json`.
  - No Electron a janela só pode recarregar a si mesma (`will-navigate`); é o que conclui a restauração.
- **Exportação (Fase 6)**: `src/export.mjs` é puro (sem DOM), testado direto no Node. Caminho único: peças → `buildDoc({ title, model, pieces, orderNote })` → `{ title, blocks }` (blocos `title`/`lead`/`h`/`p`/`sep`/`note`; `p` tem `runs: [{ text, b, i }]`) → `render(doc, formato)` devolve os bytes. Formato novo = entrada em `FORMATS` + um ramo em `render`.
  - Janela "Exportar" (`openExport()` em `main.js`, menu ≡ ou `Ctrl+E`): ordem (salvas, em teste, "a mesa como está"), modelo (`corrido` / `secoes` / `fichas`), formato, pré-visualização. Postos de lado não saem; exportar nunca altera mesa nem ordens.
  - Formatos: `.docx` e `.odt` (gerados à mão: `src/zip.mjs` faz o ZIP sem compressão; `toDocx()`/`toOdt()` escrevem o XML, com estilos de parágrafo nomeados), `.txt` (sem negrito/itálico; BOM + CRLF), `.md`. No ODT, espaço repetido vira `<text:s/>`; caracteres de controle viram espaço (XML inválido faria o Word recusar o arquivo).
  - PDF: não é montado à mão. O documento vai para `#print-root` (invisível na tela); o CSS `@media print` esconde todo o resto e o `@page` define A4 com 2,5 cm. No desktop, `exportFile({ name, print: true })` → `webContents.printToPDF`; no navegador, `window.print()` com o aviso "Salvar como PDF". Qualquer elemento novo direto no `<body>` já fica fora da impressão (`body > * { display: none }`).
  - Salvar: no desktop, `cartoesDisk.exportFile({ name, data, label })` → IPC `export:save` → "Salvar como" do sistema (só extensões de `EXPORT_EXT`; grava só no caminho escolhido no diálogo). No navegador, download.
- Atalhos: `?` lista os atalhos; `Ctrl+E` exporta; `E` abre o organizador; duplo clique no fundo ou `N` cria cartão; `Ctrl/⌘+Enter` cria o próximo ao lado; `Esc` tira o foco; `Backspace` em cartão vazio o apaga. (`Ctrl+N` é reservado pelo navegador; resolver no app desktop.)
- Interface em português (pt-BR).

## Próximos passos

**O plano vigente é `PLANO_FASES_5_A_8.md`** (decidido com o dono em 2026-11-03): Fase 5 organizador (feita), 6 menu + indicador de salvo + exportação docx/odt/pdf (feita em 2026-11-11; falta o dono abrir os arquivos no Word e confirmar os padrões assumidos), 7 mesa (pan/zoom/modo mapa, tamanhos P/M/G, seleção múltipla), 8 revisão de interface. A lista abaixo é a antiga; o que nela não estiver no plano continua valendo como pendência.

Feitos: restaurar instantâneo sem console (menu ≡, Fase 6), app desktop em Electron, arquivo `.json` em disco, `Ctrl+N` livre, salvamento robusto, testes, instalador, organizador (resolve também o I6).

0. **Pendências da revisão (pequenas, fazer primeiro):**
   - **I1** cartões ficam fora da tela se a janela diminuir (posições são da janela): trazer à vista ao abrir/redimensionar.
   - **I2/I3** grupo parcialmente guardado: `cleanGroups` conta guardados e `renderGroups` só os da mesa; restaurar um cartão de grupo o devolve longe do grupo.
   - I6 (`shuffled` pode repetir ordem com 2 unidades), I7 (sem `undoInputRule` no Backspace), I8 (Backspace apaga cartão só com espaços sem desfazer).
   - Teste de falha real de `rename` no Windows (antivírus segurando o arquivo); testar o instalador instalado de fato.
1. **Usar o app instalado alguns dias** (o dono) antes de decidir o resto.
2. **Pan/zoom do quadro** (hoje é uma viewport fixa) e posições relativas ao quadro, não à janela. Resolve o I1 de vez; mexe em arrasto e ímã, então com testes novos.
3. **Organização:** agrupar/ordenar cartões, cor ou marcador discreto, busca.
4. **Do cartão ao texto:** montar um editor de texto corrido a partir de uma sequência de cartões.
5. **Exportar/importar** projeto. (Backup `.json` desde antes; documento docx/odt/pdf/txt/md na Fase 6.)

## Empacotar (Windows)

```bash
npm run dist       # instalador: dist/Cartoes-Setup-<versão>.exe (NSIS, por usuário, sem admin)
npm run dist:dir   # só o app descompactado: dist/win-unpacked/Cartões.exe
```

- electron-builder, configuração no campo `build` do `package.json`. O pacote leva só `index.html`, `electron/` e `package.json`; ProseMirror e esbuild são devDependencies porque já vão embutidos no `index.html`.
- Sem ícone próprio (usa o do Electron) e sem assinatura de código: o Windows SmartScreen vai avisar na primeira execução. `signAndEditExecutable: false` evita a exigência de privilégio de symlink no build; para assinar/colocar ícone, remova essa opção e configure `win.icon` e um certificado.
- Desinstalar não apaga os dados (`deleteAppDataOnUninstall: false`); o projeto fica em `<userData>\cartoes\projeto.json` (pasta do app em `%APPDATA%`; não conferi o nome exato dela no app instalado).
- `dist/` é gerado; não editar nem versionar.

## Testes

```bash
npm test              # rebuilda e roda tudo (node:test + Playwright, 49 testes, ~2 min)
npm run test:browser  # persistência no navegador (contextos limpos)
npm run test:electron # app desktop; isolado por CARTOES_DATA_DIR (arquivo e perfil do Chromium)
```

- `tests/browser.test.cjs`: salvar, demo isolado, JSON ilegível, quarentena, aviso de falha, IndexedDB x espelho, aba única, teto de espera, lixeira, exportar/importar, instantâneos.
- `tests/electron.test.cjs`: ponte sem Node e sem navegar para fora, pontinho "em disco", restaurar instantâneo no arquivo, exportar pelo "Salvar como" (diálogo respondido pelo teste via `app.evaluate`), PDF e `.docx` reais gravados pelo app, gravação ao fechar, disco como fonte, `.bak`/instantâneos/recuperação, instância única, ordens no `projeto.json`.
- `tests/menu.test.cjs` (Fase 6): pontinho de salvo (estados, hover, falha, somente leitura, demo), menu ≡ (itens, teclado, backup, importar), lixeira, instantâneos, atalhos.
- `tests/export.test.cjs` (Fase 6): `export.mjs` no Node (modelos e cada formato) e a janela "Exportar" no navegador (arquivo baixado conferido). O leitor de ZIP do teste é independente do gerador. Se houver `soffice` (LibreOffice) no PATH, um teste abre o `.docx` e o `.odt` nele; sem isso, é pulado.
- `tests/organizer.test.cjs`: ordem de leitura da mesa, mover (teclado e arrasto), pôr de lado, notas, salvar com nome, bandeja, separar grupo, embaralhar (I6), dispor na mesa + desfazer, Ctrl+Z, lixeira devolve ao lugar, exportar/importar ordens, demo isolado.
- `tests/helpers.cjs` tem `pdfText(buffer)`: páginas, fontes e texto de um PDF do Chromium, sem ferramenta externa (compare o texto sem espaços).
- Em Linux sem tela e como root (contêiner/CI): `ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test`. No Windows basta `npm test`.
- Depois de `goto`, espere `.ProseMirror-focused` antes de digitar: a inicialização é assíncrona e teclas antes disso caem nos atalhos globais.
- Nunca rode testes sem `CARTOES_DATA_DIR` no Electron: sem isso eles gravam no perfil real do usuário.

## Regras para trabalhar aqui

- Fazer um bloco por vez; commit ao fim de cada um.
- Sem dependências novas além das já listadas sem perguntar.
- Antes de mexer no visual do cartão, reler "Conceito do cartão". Se uma mudança adicionar elemento visível por padrão, provavelmente está errada.
- Validar visualmente: Playwright já está disponível (`require('playwright')`); tirar screenshot do quadro com `#demo` e conferir pilha, fade e pauta (a pauta fica serrilhada em gradientes com cantos duros em cartões rotacionados; manter bordas suaves).
- Não editar `index.html` diretamente; sempre rebuildar.
