# Cartões — editor para escritores

Programa desktop para escritores: editor de texto com organização integrada, inspirado no método de fichas de Vladimir Nabokov. Cartões de livre manipulação num quadro; depois, o texto corrido.

**Princípio central:** reduzir ao máximo a carga cognitiva para escrever as primeiras palavras. O usuário nunca deve sentir limite nem "obrigação" de escrever muito.

## Estado atual

App desktop (Electron, Windows x64) com cartões, grupos por ímã, gaveta, categorias, organizador de ordens (Fase 5), lixeira, exportar/importar e salvamento robusto (disco atômico + IndexedDB + localStorage, instantâneos, aba única). 27 testes automatizados (`npm test`). Instalador gerado (`npm run dist`), sem ícone próprio nem assinatura. Ainda roda também como `index.html` no navegador.

Documentos de contexto, em `docs/`:

- `docs/PLANO_FASES_5_A_8.md`: plano vigente e pendências para confirmar.
- `docs/HANDOFF_2026-11-03.md`: registro da última sessão (Fase 5 e instalador), decisões tomadas sozinho e armadilhas.
- `docs/REVISAO_E_PLANO_SALVAMENTO.md`: histórico da revisão e do plano de salvamento (Fases 0–4).

- `src/main.js`: lógica (ProseMirror, quadro, arrasto, persistência, demo)
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
  - `Ctrl+S` (na mesa) exporta `.json` com cartões, lixeira e ordens; `Ctrl+O` importa (só acrescenta; ordens nomeadas entram como "(importada)", com os ids novos). Console: `cartoes.snapshots()`, `cartoes.restore(t)`, `cartoes.trash()`, `cartoes.ordens()`.
- Atalhos: `E` abre o organizador; duplo clique no fundo ou `N` cria cartão; `Ctrl/⌘+Enter` cria o próximo ao lado; `Esc` tira o foco; `Backspace` em cartão vazio o apaga. (`Ctrl+N` é reservado pelo navegador; resolver no app desktop.)
- Interface em português (pt-BR).

## Próximos passos

O plano vigente é `docs/PLANO_FASES_5_A_8.md` (decidido com o dono em 2026-11-03): 5 organizador, 6 menu + indicador de salvo + exportação docx/odt/pdf, 7 mesa (pan/zoom/modo mapa, tamanhos P/M/G, seleção múltipla), 8 revisão de interface. Cada fase só começa com "Sim, Fase N".

### Onde estamos

- **Fase 5 feita** (organizador; 27 testes passando). Instalador `dist/Cartoes-Setup-1.0.0.exe` gerado, mas ainda não instalado nem aberto.
- **Próxima: Fase 6.** Só começa quando o dono disser **"Sim, Fase 6"**.

### Antes da Fase 6, perguntar ao dono

1. **Moldura visível no foco:** a Fase 8 deixa a moldura levemente visível no cartão com foco. Isso toca o item 3 do "Conceito do cartão". Pode?
2. **DOCX/ODT sem biblioteca:** gerar à mão (ZIP sem compressão + XML, recomendado, sem dependência) ou aceitar uma biblioteca (`docx`/`jszip`)?
3. **Pontinho de salvo:** não entrou na Fase 5. Confirmar que vai na Fase 6.
4. **Escuta sobre o organizador:** depois de instalar e usar alguns dias, o que funcionou e o que incomodou (inclui a linha de atalhos no rodapé, `.org-keys`).

### Pendências antigas ainda abertas

- **I1** cartões fora da tela se a janela diminuir (posições são da janela). Fica resolvido na Fase 7 (posições "do mundo").
- **I2/I3** grupo parcialmente guardado: `cleanGroups` conta guardados e `renderGroups` só os da mesa; restaurar um cartão de grupo o devolve longe do grupo. Previsto de carona na Fase 7.
- **I7** sem `undoInputRule` no Backspace.
- **I8** Backspace apaga cartão só com espaços, sem desfazer.
- Teste de falha real de `rename` no Windows (antivírus segurando o arquivo).
- Ícone próprio e assinatura do instalador.
- Passar a versão para 1.1.0 no próximo instalador (hoje 1.0.0).
- **Busca** de cartões: estava na lista antiga ("Organização") e não entrou no plano.
- **Editor de texto corrido** a partir de uma sequência de cartões: a exportação "texto corrido" da Fase 6 cobre o documento final; um editor dentro do app não está no plano.

### Saíram da lista antiga (já feitos ou cobertos pelo plano)

- App desktop, arquivo em disco, `Ctrl+N` livre, salvamento robusto, testes, instalador: feitos.
- I6 (embaralhar repetindo com 2 peças): feito na Fase 5.
- Agrupar/ordenar cartões e marcador de cor: feitos (grupos por ímã, categorias, organizador da Fase 5).
- Restaurar instantâneo sem console: Fase 6 (item "Instantâneos" do menu ≡).
- Exportar/importar projeto: backup `.json` já existe; documentos legíveis vão na Fase 6.
- Pan/zoom do quadro e posições relativas ao quadro: Fase 7.
- Usar o app instalado alguns dias: virou a escuta sobre o organizador, acima.
- Testar o instalador instalado de fato: depende do dono instalar o `Cartoes-Setup-1.0.0.exe` (ver "Não verificado" no handoff).

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
npm test              # rebuilda e roda tudo (node:test + Playwright, 27 testes, ~1 min)
npm run test:browser  # persistência no navegador (contextos limpos)
npm run test:electron # app desktop; isolado por CARTOES_DATA_DIR (arquivo e perfil do Chromium)
```

- `tests/browser.test.cjs`: salvar, demo isolado, JSON ilegível, quarentena, aviso de falha, IndexedDB x espelho, aba única, teto de espera, lixeira, exportar/importar, instantâneos.
- `tests/electron.test.cjs`: ponte sem Node, gravação ao fechar, disco como fonte, `.bak`/instantâneos/recuperação, instância única, ordens no `projeto.json`.
- `tests/organizer.test.cjs`: ordem de leitura da mesa, mover (teclado e arrasto), pôr de lado, notas, salvar com nome, bandeja, separar grupo, embaralhar (I6), dispor na mesa + desfazer, Ctrl+Z, lixeira devolve ao lugar, exportar/importar ordens, demo isolado.
- Depois de `goto`, espere `.ProseMirror-focused` antes de digitar: a inicialização é assíncrona e teclas antes disso caem nos atalhos globais.
- Nunca rode testes sem `CARTOES_DATA_DIR` no Electron: sem isso eles gravam no perfil real do usuário.

## Regras para trabalhar aqui

- Fazer um bloco por vez; commit ao fim de cada um.
- Git: até 2026-11-03 o projeto não era repositório git (o handoff registra isso). Desde o commit "Commit inicial do projeto Cartoes" ele é versionado em `lvitalismoser-creator/NABOKOV`, com a raiz do repositório uma pasta acima desta. A regra do commit vale. Se a cópia local em `D:\` não tiver a pasta `.git`, ela não vale ali até alguém rodar `git init` (ou clonar o repositório).
- Sem dependências novas além das já listadas sem perguntar.
- Antes de mexer no visual do cartão, reler "Conceito do cartão". Se uma mudança adicionar elemento visível por padrão, provavelmente está errada.
- Validar visualmente: Playwright já está disponível (`require('playwright')`); tirar screenshot do quadro com `#demo` e conferir pilha, fade e pauta (a pauta fica serrilhada em gradientes com cantos duros em cartões rotacionados; manter bordas suaves).
- Não editar `index.html` diretamente; sempre rebuildar.
