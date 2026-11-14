# nabokov-p.md — Instruções para adequar e produzir a documentação do Projeto Nabokov (2.º semestre de 2026)

> **Para quem é este arquivo.** Para uma sessão nova do Cowork (ou de qualquer Claude) que vai cuidar **só da documentação acadêmica** do Projeto Nabokov. Ele cumpre, para essa tarefa, o papel que o `CLAUDE.md` cumpre para o código. Leia-o inteiro antes de escrever qualquer coisa.
>
> **Gerado em 2026-11-14**, a partir de: (a) o *Plano de Ação Discente do PI* de 2026 (2.º semestre), (b) o *Relatório do Projeto Nabokov* (1.º semestre) e (c) o repositório `lvitalismoser-creator/NABOKOV` (pasta `cartoes/`, versão 1.4.1, 73 testes).
>
> **Regra-mãe:** a documentação descreve o que **existe e foi verificado**. Onde o plano prometeu algo que o protótipo não entrega, o texto diz isso com clareza e sem culpa. Nada é inventado, arredondado para cima ou deduzido para "ficar bonito".

---

## 0. Em uma página

| Pergunta | Resposta |
|---|---|
| O que existe agora? | Um **protótipo exploratório funcional** (app desktop Electron, Windows x64, também roda no navegador): cartões numa mesa infinita, grupos, gaveta, categorias, organizador de ordens de leitura, exportação TXT/MD/PDF, salvamento robusto. Código: `cartoes/`. |
| O que a documentação precisa mostrar? | Que o 1.º semestre (planejar) virou o 2.º (construir um protótipo que testa as decisões de produto), **com a distância entre o planejado e o feito explicada**. |
| O que fica **fora** deste semestre? | **Entrevistas e testes de uso com escritores**: desconsiderar por completo (ver §2). Também: validação formal da hipótese, DOCX/ODT e as funcionalidades do "programa real". |
| O que produzir? | **D1** PAD atualizado · **D2** Relatório do 2.º semestre · **D3** Slides + roteiro de demonstração · **D4** Documentação técnica enxuta · **D5** Evidências (capturas, testes, linha do tempo). Ver §7. |
| Como o protótipo se encaixa no projeto maior? | Decisão do dono em 2026-11-13: **o código não é a base do programa real**; o programa será refeito do zero no semestre seguinte. O que vai adiante são as **decisões de produto**, os **problemas achados** e o diário de uso. A documentação deve dizer isso. |
| Maior risco | Escrever como se o PAD tivesse sido cumprido ao pé da letra. Não foi: ver §5. |

---

## 1. Identificação (não alterar sem confirmar com o dono)

- **Autor/discente:** Leonardo Vitalis Moser.
- **Instituição:** Colégio Sinodal Progresso — Curso Técnico em Informática — Montenegro (RS) — 2026.
- **Projeto:** "Projeto Nabokov: Desenvolvimento de uma Ferramenta Desktop de Escrita Criativa com Editor Integrado" (título do PAD do 2.º semestre). Título do relatório do 1.º semestre: "Projeto Nabokov — Proposta de uma Ferramenta de Escrita Criativa com Editor Integrado".
- **Categoria:** Tecnologia. **Forma de apresentação:** apresentação de slides com demonstração da aplicação.
- **Docente articulador:** Fernando Perotti.
- **Orientação:** os dois documentos **divergem**. O relatório do 1.º semestre cita a orientadora *Prof.ª Deise Naiara Porn*; o PAD de 2026 diz "Sem orientador(a) designado(a) no momento". **Perguntar ao dono** qual vale antes de preencher capas e folhas de rosto.
- **Nome do produto:** o app se chama **Cartões** (`package.json`: `cartoes`); "Projeto Nabokov" é o nome do projeto acadêmico. Usar "Projeto Nabokov" para o trabalho e "Cartões" (ou "o protótipo Cartões") para o software, e explicar a relação uma vez, na introdução.
- **Idioma e tom:** português do Brasil, formal, terceira pessoa ("o presente trabalho", "o autor"), como no relatório do 1.º semestre. Normas ABNT (NBR 6023 referências, NBR 10520 citações, NBR 14724 estrutura). Sem emojis em texto acadêmico.

---

## 2. Escopo deste semestre

### 2.1 Entra

1. Descrever e justificar a **construção do protótipo** (decisões, arquitetura, o que foi implementado).
2. **Confrontar** o planejado (pseudo-algoritmo, protótipos de baixa fidelidade, PAD) com o realizado (§5).
3. Registrar as **decisões de produto** tomadas, com data e motivo (fontes: `docs/`).
4. Registrar a **qualidade verificável**: testes automatizados, persistência, linha do tempo do desenvolvimento.
5. Planejar o próximo passo à luz da decisão "o programa real será refeito do zero".

### 2.2 Fica de fora — não escrever, não planejar, não "deixar gancho"

- **Entrevistas com escritores, roteiro de entrevistas, perfil de autores, análise qualitativa das entrevistas, testes de uso com terceiros.** O dono decidiu: *desconsiderar completamente neste semestre.* Não redigir seção, quadro, apêndice, slide ou cronograma sobre isso. Não afirmar nem insinuar que foram feitas, estão em andamento ou vão ocorrer em data X.
  - Consequência para o PAD: três linhas do cronograma citam entrevistas (linhas 2, 3, 9 e 10 da tabela; ver §9). **O Cowork não preenche essas linhas.** Marque-as como "a decidir pelo dono/orientação" e siga adiante (§13, pergunta 1).
  - Consequência para o relatório: a hipótese do 1.º semestre continua **parcialmente validada** (só coerência com o referencial + experiência pessoal do autor). **Não** reescrever como validada.
- **O diário de uso (`docs/USO.md`) não é validação com escritores.** É o uso do próprio dono. Hoje tem **uma** entrada, e é de *teste*, não de escrita (2026-11-12). Não citar como evidência de adesão ou de uso real. Se o dono preencher mais entradas antes da entrega, perguntar a ele como quer que sejam apresentadas.
- **DOCX/ODT, ícone, assinatura do instalador, distribuição:** adiados para depois da validação (`docs/PLANO_AJUSTES_ABORDAGEM.md`).
- **Funcionalidades do programa real** (identificar texto e padrões, indexar cartões a documentos, sugerir cartões para relembrar com base no texto): são **ideias**, não pendências do protótipo. Aparecem no relatório só como trabalhos futuros, rotulados como ideias.

---

## 3. Fontes de verdade e ordem de leitura

Se duas fontes divergem, vale a mais específica e mais recente **do repositório**; para o que o *curso* exige, vale o PAD.

| Ordem | Arquivo | Para que serve |
|---|---|---|
| 1 | `cartoes/CLAUDE.md` | O que o projeto é; estado atual; **Conceito do cartão**; decisões técnicas; regras de trabalho. Fonte principal sobre o software. |
| 2 | `cartoes/docs/HANDOFF_2026-11-13.md` | O mais recente: estado, instalador, pendências, ramos do git. |
| 3 | `cartoes/docs/PLANO_AJUSTES_ABORDAGEM.md` | Decisões do dono de 2026-11-11: ordem das fases, como fechar uma fase, **critério de validação**. Vale sobre o plano de fases. |
| 4 | `cartoes/docs/PLANO_FASES_5_A_8.md` | O que cada fase entregou ("Como ficou") e as decisões de produto. |
| 5 | `cartoes/docs/HANDOFF_2026-11-12.md` | Fases 6 a 8; **24 decisões tomadas sem o dono**; o que não foi verificado; 9 perguntas ao dono. |
| 6 | `cartoes/docs/HANDOFF_2026-11-03.md`, `REVISAO_E_PLANO_SALVAMENTO.md` | Histórico (Fases 0–4, salvamento). |
| 7 | `cartoes/docs/USO.md` | Diário de uso. |
| 8 | `cartoes/src/`, `cartoes/electron/`, `cartoes/tests/`, `package.json` | O código. Consultar para **confirmar** um fato antes de afirmá-lo. |
| 9 | Plano de Ação Discente (2026) e Relatório do 1.º semestre | Os dois `.docx` de origem; fornecem estrutura, compromissos e texto a atualizar. |

Contagem útil (conferida em 2026-11-14): 37 commits entre 2026-11-03 e 2026-11-13 (3 em 11-03, 1 em 11-04, 1 em 11-11, 25 em 11-12, 7 em 11-13); `src/main.js` com 2.633 linhas; cerca de 5,6 mil linhas somando `src/`, `electron/` e `tests/`; 73 testes; Electron 45, esbuild, ProseMirror 7 pacotes. **Reconfira com `git log` e `npm test` antes de citar números** — eles mudam.

---

## 4. Estado real do protótipo (fatos para a documentação)

Tudo abaixo vem de `cartoes/CLAUDE.md` e do código. Cite com o nível de certeza indicado.

### 4.1 O que o software é

- **Conceito:** cartões (fichas) de livre manipulação numa **mesa infinita**; depois, o texto corrido (hoje: a *leitura em ordem* e a *exportação*).
- **Princípio central** (mapeia direto para Sweller, 1988; Nielsen & Molich, 1990): reduzir ao máximo a carga cognitiva para escrever as primeiras palavras; o usuário nunca sente obrigação de escrever muito.
- **Conceito do cartão (não quebrar):** bloco finito e virtualmente ilimitado (estouro = pilha, não cresce nem bloqueia a digitação); zero poluição visual (sem barra de ferramentas, título, placeholder ou campo obrigatório); cartão novo nasce com foco; cartão vazio some sozinho; estilo papel; arrastar só pela moldura. **Três exceções decididas pelo dono** (tamanhos P/M/G, pontinho de salvo, moldura no foco), cada uma com data e motivo em `CLAUDE.md`.

### 4.2 Funcionalidades entregues (por fase)

| Fase | Versão | Conteúdo |
|---|---|---|
| 0–4 | — | Salvamento robusto (disco atômico + IndexedDB + localStorage), lixeira, instantâneos, aba única, backup `.json` (ver `REVISAO_E_PLANO_SALVAMENTO.md`). |
| 5 | — | **Organizador de ordens:** ordens de leitura salvas com nome, peças (cartão ou grupo), pôr de lado, notas por ponto e por ordem, bandeja "fora da ordem", embaralhar, "dispor na mesa". |
| 6 | 1.1.0 | Pontinho de salvo, menu ≡ (lixeira, instantâneos, atalhos), **exportação TXT/MD/PDF** (3 modelos: corrido, por seção, ficha). |
| 7a | 1.2.0 | **Mesa infinita**: deslocar, zoom 20–200%, posições "do mundo". |
| 7b | 1.3.0 | Tamanhos P/M/G, seleção múltipla e ações em lote, **modo mapa** (< 45% de zoom). |
| 8 | 1.4.0 / 1.4.1 | Revisão de interface; 1.4.1 sincroniza a ordem em teste com os grupos da mesa. |

### 4.3 Arquitetura e tecnologia (afirmável com segurança)

- **Shell:** Electron (processo principal dono do disco + `preload` com ponte `window.cartoesDisk`; a página não vê Node). **Editor:** ProseMirror com schema mínimo (`doc > paragraph+`, marcas `strong` e `em`), **um `EditorView` por cartão**, JS puro sem framework, **sem Tiptap**. Empacotamento: esbuild gera um `index.html` único (funciona offline); electron-builder gera o instalador NSIS.
- **Local-first** (Kleppmann et al., 2019): projeto em `projeto.json` no disco do usuário (gravação atômica tmp+fsync+rename, `.bak`, instantâneos), espelhado em IndexedDB e localStorage; sem servidor, sem conta, sem rede.
- **Qualidade:** 73 testes (node:test + Playwright; navegador e Electron), rodados com `npm test`.

### 4.4 O que **não** está verificado (declarar como limitação, nunca ocultar)

- **Nada foi verificado em Windows** (`HANDOFF_2026-11-12.md`, seção 3). Os testes rodam em Linux.
- **O instalador:** o dono **ainda não confirmou** ter conseguido gerar (`npm run dist`) nem instalar o 1.4.1. Os instaladores gerados em nuvem não chegaram a ele. Sem ícone próprio e sem assinatura (o SmartScreen avisará).
- **Nenhuma das fases está ✅** pelo critério do próprio projeto ("fechar uma fase" exige conferência do dono no instalador). Todas estão "feitas, aguardando conferência". O texto acadêmico deve dizer "implementadas e cobertas por testes automatizados", **não** "validadas".
- **Validação por uso:** não começou (precisa de 5 sessões de escrita em dias diferentes, em 2 semanas, após instalar o 1.4.1).
- **Nove perguntas ao dono** de `HANDOFF_2026-11-12.md` seguem sem resposta; 24 decisões foram tomadas por sessões de Claude sem o dono. Mencionar no relatório como decisões "a confirmar", em linguagem de autor ("adotou-se… a confirmar").

---

## 5. Núcleo da tarefa: planejado × realizado

Este quadro é a espinha do relatório (§8, cap. 4) e da apresentação. **Não suavize.** Cada linha tem de ser verificável no código.

### 5.1 Pseudo-algoritmo do 1.º semestre (Quadro 2) × protótipo

| Elemento planejado | O que o protótipo tem | Avaliação (use estes termos) |
|---|---|---|
| `Cartao.conteudo` | `doc` (JSON do ProseMirror) com negrito/itálico | Realizado (formatação mínima, por escolha) |
| `Cartao.tipo` = cena\|capitulo\|personagem\|nota\|pesquisa | `cat` = **cena \| nota \| lugar** (3 categorias) | **Parcial / alterado:** 3 categorias, outro conjunto |
| `Cartao.tags[]` livres | **Não existe** | Não realizado |
| `Cartao.status` rascunho\|revisão\|finalizado | **Não existe** | Não realizado |
| `Cartao.posicao_livre (x,y)` | `x`, `y` "do mundo" + câmera (mesa infinita) | Realizado e ampliado |
| `Cartao.links[]` | **Não existe** | Não realizado |
| `Colecao` (cartão em várias coleções, via tags, muitos-para-muitos) | **Grupo** (`g`): um cartão em **um** grupo, formado por ímã na mesa. As **ordens** (peças de uma ordem salva) dão várias vistas do mesmo conteúdo sem duplicação | **Reinterpretado:** o objetivo do algoritmo (várias vistas sem duplicar) foi atingido por **ordens de leitura**, não por tags/coleções muitos-para-muitos |
| CRIAR: tipo mínimo obrigatório; tags/coleções opcionais | Cartão novo nasce **sem nenhum campo obrigatório**, com foco | **Radicalizado** (nem o tipo é exigido) — alinhado ao princípio central |
| VISUALIZAR `linear` | Organizador: leitura em ordem, uma peça por vez, fileira editável | Realizado (outro nome: "organizador/ordem de leitura") |
| VISUALIZAR `quadro` (Nabokov) | **Mesa infinita** | Realizado e ampliado |
| VISUALIZAR `foco` (oculta tudo, só o cartão ativo) | **Não há modo dedicado.** Há cartão com foco e a interface mínima por princípio; o organizador mostra uma peça de cada vez, mas com controles | **Não realizado como modo.** Não afirmar "modo foco". Perguntar ao dono se quer defender o organizador/cartão focado como equivalente (§13) |
| (não previsto) | **Modo mapa** (< 45% de zoom), gaveta, lixeira, instantâneos, seleção múltipla, tamanhos P/M/G | **Acréscimos** vindos do uso exploratório |
| FILTRAR/BUSCAR por tag/tipo | **Não existe** busca nem filtro | Não realizado ("busca de cartões" está em "Depois da validação") |

### 5.2 PAD (cronograma Out–Nov/2026) × protótipo

Ver preenchimento proposto linha a linha em §9. Resumo das distâncias **maiores**:

1. **"Editor de texto integrado" no sentido de texto corrido:** o que existe é **um editor por cartão** e, no organizador, **leitura** (não edição contínua) em ordem. Um editor de documento corrido dentro do app está listado como "fora do plano hoje".
2. **"Importação/exportação de arquivos":** exportação **TXT/MD/PDF** existe; **importação de documentos externos não existe** (só importar o backup `.json` do próprio app). DOCX/ODT adiados.
3. **"Tags, coleções, tipo, status":** ver §5.1.
4. **Biblioteca escolhida:** o PAD listava Tiptap/ProseMirror, Lexical e RichTextFX, "escolha pendente". Resolvido: **ProseMirror, sem Tiptap, em shell Electron**. O **motivo da escolha não está registrado** em `docs/`: **não invente justificativa**; pergunte ao dono (§13) ou escreva só o que o código evidencia (schema mínimo, controle total sobre ausência de toolbar, JS puro, MIT).
5. **Entrevistas (4 linhas do PAD):** fora do escopo deste documento (§2.2).

### 5.3 Como narrar a distância (modelo de postura)

O projeto mudou de natureza **durante** o semestre, por decisão registrada: de "construir a versão inicial da ferramenta" para "usar um protótipo exploratório para descobrir o que o programa deve ser". Isso **não é fracasso a esconder nem sucesso a inflar**: é um achado metodológico. Escreva assim: *"Ao longo da implementação, verificou-se que as funcionalidades pretendidas para o produto final (…) exigem uma estrutura de código concebida desde o início para elas. Decidiu-se, em 13/11/2026, tratar o software como protótipo exploratório e reconstruí-lo no semestre seguinte."* Fonte: `CLAUDE.md`, seção "O que este projeto é".

---

## 6. Linha do tempo real (para o relatório e os slides)

Conferir com `git log --format='%ad %s' --date=short` antes de usar.

| Data | Marco |
|---|---|
| 2026-11-03 | Commit inicial; protótipo inicial; o dono usa o app por ~2 min e dá o feedback que origina as Fases 5–8; Fase 5 (organizador) feita. |
| 2026-11-04 | Documentos de contexto organizados em `docs/`. |
| 2026-11-11 | Revisão crítica e `PLANO_AJUSTES_ABORDAGEM.md` (processo: bloco, fechar fase, diário de uso, critérios de validação). |
| 2026-11-12 | Fases 6, 7a, 7b e 8 construídas (de 27 para 72 testes); relato do dono corrige 3 problemas (grupo cortado no organizador, "dispor na mesa" desmanchando grupos, prévia do exportador incompleta). |
| 2026-11-13 | 1.4.1; decisão: **protótipo exploratório**; tentativa de gerar o instalador na máquina do dono; limpeza de ramos pendente. |

Observação metodológica útil: o trabalho seguiu um **processo explícito** (fases, blocos com commit e testes passando, regra "só abre fase com 'Sim, Fase N'", diário de uso). Isso é evidência de rigor de engenharia e pode ser descrito como método de desenvolvimento, desde que se diga que a **conferência do dono ainda está pendente**.

---

## 7. Entregáveis a produzir

Salve tudo em uma pasta nova `cartoes/docs/entrega/` (não misture com os planos históricos). Formato: `.docx` para PAD e relatório (o dono entrega ao colégio nesse formato), `.pptx` para slides, `.md` para documentação técnica. Peça ao dono o **modelo/template do colégio** (capa, margens, fonte) — o `.docx` do 1.º semestre é a referência de estilo: **parta dele**, não de um documento em branco.

| ID | Entregável | Fonte principal | Pronto quando |
|---|---|---|---|
| **D1** | **PAD preenchido** (colunas Realizado, Observação, Situação) | §9 | Cada linha preenchida com fatos verificáveis; linhas de entrevistas **sinalizadas ao dono**, não preenchidas. |
| **D2** | **Relatório do 2.º semestre** (continuação do relatório do 1.º) | §8 | Estrutura completa, ABNT, figuras com fonte, referências verificadas, limitações explícitas. |
| **D3** | **Slides + roteiro de demonstração** | §10 | ≤ 15 slides; demo ensaiada com plano B. |
| **D4** | **Documentação técnica enxuta** (README do repositório, arquitetura em 1–2 páginas com diagrama, tabela de decisões de produto, como rodar/testar) | `CLAUDE.md` | Alguém que nunca viu o projeto roda `npm start` e entende o que olha. |
| **D5** | **Pacote de evidências**: capturas de tela, saída de `npm test`, linha do tempo, tabela de rastreabilidade (§5.1) | Código + git | Cada afirmação do relatório aponta para uma evidência (arquivo, commit, teste ou captura). |

Ordem sugerida: D5 (reunir evidências) → §5 (quadro, já pronto aqui) → D2 → D1 → D4 → D3.

---

## 8. D2 — Estrutura detalhada do Relatório do 2.º semestre

Mantenha a estrutura do relatório do 1.º semestre (capa, folha de rosto, resumo, listas, sumário, capítulos numerados, referências). Título sugerido: **"Projeto Nabokov — Construção de um protótipo exploratório de ferramenta de escrita criativa"** (confirmar com o dono). Extensão-alvo: comparável ao relatório anterior (cerca de 20 a 25 páginas).

**Resumo** (150–250 palavras, parágrafo único) + **Palavras-chave** (3 a 5): o que se construiu, método, achado principal (o protótipo converteu o planejamento em decisões de produto verificáveis e revelou que o produto final exige reconstrução), limitação principal (sem validação com escritores). **Abstract** só se o colégio exigir.

**1 INTRODUÇÃO**
- 1.1 Contexto e continuidade com o 1.º semestre (lacuna: edição × organização; hipótese parcialmente validada).
- 1.2 Justificativa: por que construir um protótipo antes do produto (o 1.º semestre só tinha artefatos de papel).
- 1.3 Problema (nova formulação): *é possível materializar o pseudo-algoritmo e os protótipos de baixa fidelidade em um protótipo funcional que permita examinar as decisões de produto?* (Ajustar com o dono.)
- 1.4 Objetivo geral e específicos (reescrever; **não** manter "sem abranger o desenvolvimento efetivo", do 1.º semestre).
- 1.5 Delimitação do escopo: **declarar** que a validação empírica com escritores permanece fora do escopo deste semestre (uma frase, sem prometer data).

**2 REFERENCIAL TEÓRICO (atualização, não repetição)**
- Remeter ao 1.º relatório para o que já foi dito; acrescentar só o que o semestre exige: editores baseados em modelo de documento (ProseMirror), arquitetura de aplicação desktop em shell web (Electron), local-first (Kleppmann et al., 2019) aplicado ao armazenamento em disco.
- **Toda referência nova passa por verificação** (§12). Fontes de documentação oficial (ProseMirror, Electron) citadas como site, com data de acesso.

**3 METODOLOGIA**
- Natureza aplicada, abordagem qualitativa, exploratória (como antes). Dois movimentos: (a) **desenvolvimento iterativo por fases e blocos**, com regra de fechamento (testes + instalador + conferência do dono); (b) **verificação por testes automatizados**.
- Descrever o processo de §6 e as regras de `PLANO_AJUSTES_ABORDAGEM.md`.
- **Deixar explícito** que a verificação é técnica (testes) e que a conferência do dono é parcial; sem testes com terceiros.
- Ferramentas: Electron, ProseMirror, esbuild, electron-builder, Playwright, node:test, git/GitHub. (Se o dono usou assistentes de IA no desenvolvimento, **ele decide** como declarar; o histórico do repositório registra sessões de Claude. Não omitir nem inflar: perguntar — §13.)

**4 RESULTADOS E DISCUSSÕES**
- 4.1 **O protótipo** (visão geral; Figura = captura da mesa com `#demo`; Figura = organizador; Figura = modo mapa).
- 4.2 **Arquitetura** (diagrama: processo principal ↔ preload ↔ página; camadas de persistência).
- 4.3 **Decisões de produto** (Conceito do cartão; três exceções com data e motivo; estouro = pilha; zero poluição; ordem nunca mexe na mesa).
- 4.4 **Planejado × realizado** — a tabela de §5.1, com comentário. **Esta é a seção mais importante.**
- 4.5 **Verificação técnica:** 73 testes, por arquivo (`browser`, `electron`, `mesa`, `organizer`, `menu`, `export`); o que cada grupo cobre; problemas achados e corrigidos (I1–I8, o relato do dono de 12-11).
- 4.6 **Limitações** (§4.4 deste arquivo, sem eufemismo).

**5 CONCLUSÃO**
- Retomar o problema; responder o que foi demonstrado (viabilidade técnica do núcleo; decisões que sobreviveram; o que não foi atingido).
- **Hipótese:** manter como "parcialmente validada"; dizer o que seria preciso para validar (uso continuado — o critério já definido: 5 sessões em 2 semanas — e, **num momento futuro a critério do autor**, escritores). Sem datas.
- **Trabalhos futuros** (rotulados como ideias): programa real refeito do zero; busca/filtro; tags/status se o uso pedir; DOCX/ODT; identificar texto e padrões; indexar cartões a documentos; sugerir cartões para relembrar.

**REFERÊNCIAS / APÊNDICES / ANEXOS:** Apêndice A — tabela de rastreabilidade (§5.1); Apêndice B — lista de atalhos e funcionalidades (de `CLAUDE.md`); Apêndice C — saída resumida dos testes; Anexo — o PAD preenchido.

**Figuras:** todas com legenda e "Fonte: Elaborado pelo autor." Capturas via Playwright (§11). Capturas de tela de **dados de demonstração**, nunca dos textos reais do dono.

---

## 9. D1 — Preenchimento do PAD, linha a linha

Colunas do PAD: **REALIZADO (Sim/Não)**, **OBSERVAÇÃO**, **SITUAÇÃO** ((A) Avançando, (D) Dificuldades, (S) Sem avanço). O texto abaixo é **proposta**: o dono confirma. Observações curtas (1–3 linhas), no estilo das já existentes.

| # | Meta (resumida) | Realizado | Observação proposta | Sit. |
|---|---|---|---|---|
| 1 | Definição do escopo: desktop, editor junto à camada organizacional | Sim | Escopo fixado em app desktop (Electron). Em 13/11 o software passou a ser tratado como protótipo exploratório; o produto final será refeito no semestre seguinte. | A |
| 2 | Cronograma com desenvolvimento e entrevistas concomitantes | **A decidir pelo dono** | Parte do desenvolvimento: seguiu-se um processo por fases e blocos (§6). Parte das entrevistas: **fora do escopo deste documento**. | — |
| 3 | Roteiro de entrevistas e perfil dos autores | **A decidir pelo dono** | Fora do escopo deste documento. **Não preencher.** | — |
| 4 | Pesquisa e escolha da biblioteca de edição | Sim | Escolhido o ProseMirror (sem Tiptap) em shell Electron. *Motivo: perguntar ao dono (§13).* | A |
| 5 | Arquitetura e tecnologias de apoio | Sim | Local-first: `projeto.json` em disco com gravação atômica, `.bak`, instantâneos; espelho em IndexedDB e localStorage; processo principal/preload isolados. | A |
| 6 | Camada organizacional: cartões, coleções, tags, tipo, status | Parcial (marcar **Não** se a coluna for binária e acrescentar a explicação) | Implementados: cartões, 3 categorias, grupos por ímã, gaveta, ordens de leitura salvas. **Não** implementados: tags, status, links, busca. As ordens substituem as coleções muitos-para-muitos. | D |
| 7 | Integração do editor, formatação, importação/exportação | Parcial | Editor ProseMirror por cartão (negrito/itálico); exportação TXT/MD/PDF por ordem. **Sem** importação de documentos e **sem** DOCX/ODT (adiados). | D |
| 8 | Interface e modos linear, quadro e foco | Parcial | Mesa infinita (quadro), organizador (linear) e modo mapa (acréscimo) feitos; **modo foco dedicado não feito**. | D |
| 9 | Realização das entrevistas com autores | **A decidir pelo dono** | Fora do escopo deste documento. **Não preencher.** | — |
| 10 | Análise qualitativa das entrevistas; preparação da apresentação final | **A decidir pelo dono** | A *preparação da apresentação final* faz parte de D3; a *análise das entrevistas* é fora do escopo. Sugerir ao dono separar a linha. | — |

Se a tabela só aceita "Sim/Não", **não marque "Sim" onde só parte foi feita**. Escreva "Não" e explique na observação (ou peça ao dono que acrescente "Parcial").

Também atualizar, no cabeçalho do PAD, o **"Resultado esperado"**: a versão "inicial funcional" existe como **protótipo exploratório**; o item "registro das entrevistas" é a parte que o dono decide (§13). O campo **"Justificativa"** do PAD mencionava a decisão de conduzir entrevistas "de forma concomitante"; deixe a reescrita desse parágrafo para o dono.

---

## 10. D3 — Slides e demonstração

Formato: apresentação de slides com demonstração da aplicação (exigência do PAD). Tempo: **perguntar ao dono** (duração e data).

**Estrutura sugerida (≈ 12–15 slides):**

1. Título e identificação. 2. O problema (editores sem organização × organizadores sem editor; Quadro 1 do 1.º semestre). 3. A inspiração (Nabokov e as fichas). 4. Princípio de design (carga cognitiva: Sweller; Nielsen & Molich). 5. Do papel ao protótipo (pseudo-algoritmo + baixa fidelidade → app). 6. **Demonstração** (ver roteiro). 7. Arquitetura (diagrama simples; local-first). 8. Decisões de produto (3 exceções). 9. **Planejado × realizado** (versão enxuta de §5.1). 10. Verificação (73 testes; processo). 11. Limitações honestas. 12. Decisão: protótipo exploratório → refazer. 13. O que vem depois. 14. Referências. 15. Agradecimentos/perguntas.

**Roteiro da demonstração (5–7 min), com dados de demonstração:**

1. Abrir o app com a mesa pronta (cartão novo já com cursor) e escrever uma frase — mostrar que **nada é obrigatório**.
2. Criar três cartões (duplo clique / `N`), arrastar pela moldura, agrupar por ímã.
3. Mostrar **pilha** (estouro de texto) num cartão do `#demo`.
4. Afastar com `Ctrl`+roda até o **modo mapa**; clicar e aproximar.
5. Abrir o **organizador** (`E`): ler em ordem, mover, pôr de lado, nota, "salvar" com nome; embaralhar.
6. **Exportar** (`Ctrl+E`) em PDF/TXT; abrir o arquivo.
7. Mostrar o **pontinho de salvo** e o menu ≡ → Instantâneos/Lixeira (segurança do texto).
8. (Opcional) Fechar e reabrir: o estado volta.

**Plano B obrigatório** (o instalador do dono pode não estar pronto, §4.4): rodar `index.html#demo` no navegador, ou `npm start` na pasta `cartoes/`; levar capturas e um vídeo curto gravado antes. **Nunca** abrir o app real com os textos pessoais do dono diante da banca sem ele decidir.

---

## 11. Como reunir evidências (D5) sem estragar nada

Trabalhe **só em leitura** sobre o código. Esta sessão é de documentação.

```bash
cd cartoes
npm install
npm test                                  # no Windows/macOS do dono
ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test   # em contêiner Linux como root
```

- **Capturas de tela:** use Playwright (já instalado em sessões em nuvem; `require('playwright')`) abrindo `index.html#demo` (grava só em `cartoes.demo`, não toca dados reais). `deviceScaleFactor: 2` para figuras de relatório. Gere `index.html` com `node build.mjs` se faltar.
- **Electron:** **sempre** com `CARTOES_DATA_DIR` apontando para uma pasta temporária; sem isso, grava no perfil real do usuário.
- **Não editar `index.html`** (é gerado). **Não editar código** para "melhorar o que vai na demo": se a documentação revelar um defeito, registre-o (§13) e avise o dono.
- **Números de testes e linhas** vêm da execução, não de memória.

---

## 12. Adequações e correções ao relatório do 1.º semestre

Verifique e corrija **no texto reaproveitado** (apresentar ao dono como lista antes de alterar):

1. **Shibata e Hori:** no corpo do texto a citação é **(2005)** e na lista de referências é **2008** (v. 26, n. 2, p. 97–124). Verifique o ano correto e unifique.
2. **Wallas:** a tradução do trecho de Zhao (2025) grafa "Walla". O autor do modelo é **Wallas**. Corrigir na tradução (e conferir o restante do trecho).
3. **Quadro 1:** há células vazias (Writer/Word × Organização; Obsidian × Formatação). Preencher ou justificar a ausência (ex.: "não se aplica"). A análise do texto depende dessas células.
4. **Numeração:** as seções de abordagem (Justificativa, Problema…) aparecem sem número no corpo, enquanto o sumário as numera (1.1 a 1.4.2). Padronizar.
5. **Objetivo específico:** o título está no singular, mas há quatro itens. Pluralizar.
6. **Delimitação do 1.º semestre** ("sem abranger o desenvolvimento efetivo do software"): **não reproduzir** no relatório novo.
7. **Orientadora:** divergência entre os dois documentos (§1).
8. **Candidatas de biblioteca no PAD:** a observação afirma que importação/exportação de DOCX do Tiptap "são recursos pagos" e traz as licenças (MIT, BSD 2-Clause, GPLv2 com Classpath Exception). **Verifique em fonte oficial e registre a data de acesso** antes de repetir; se não for possível verificar, retire a afirmação.
9. **Claims históricos:** a descrição do método de Nabokov se apoia em *Strong Opinions* (1973). Confirme que o trecho se sustenta nessa obra (página/entrevista) e **inclua a página** na citação, ou reformule.
10. **Referências:** ABNT NBR 6023 consistente (maiúsculas no sobrenome, local/editora, DOI quando houver). Itens da web com URL e **data de acesso**.

**Política de referências novas:** só entra o que foi **verificado** (existência, autores, ano, DOI/URL). Se a sessão tiver a ferramenta `reference-lookup` (OpenAlex/arXiv), use `verify_reference`; senão, confirme em fonte primária. **Nunca** cite de memória. Referência que não se consegue verificar é marcada `[VERIFICAR]` e entregue ao dono, não inserida como certa.

---

## 13. Perguntas para o dono antes de fechar a documentação

Faça no início da sessão, em bloco, e registre as respostas aqui (acrescente uma seção "Respostas" no fim deste arquivo).

1. **PAD e entrevistas:** o que fazer com as linhas 2, 3, 9 e 10 (e com o "Resultado esperado" que cita as entrevistas)? Marcar "Não realizado", reescrever o PAD, ou conversar com o docente articulador? *(Decisão dele; o Cowork não preenche.)*
2. **Orientação:** Prof.ª Deise Naiara Porn ou "sem orientador designado"?
3. **Prazos e formato:** data da apresentação, duração, template do colégio (`.docx`), limite de páginas.
4. **Motivo da escolha** do ProseMirror (sem Tiptap) e do Electron (sem Tauri/Lexical/RichTextFX). Não há registro em `docs/`.
5. **Modo foco:** assumir como não realizado, ou defender organizador/cartão focado como equivalente?
6. **Tags, status, links, busca:** são "não realizados por escolha" (o princípio central pede nenhuma obrigação) ou "adiados"? O texto muda de tom.
7. **Uso de assistentes de IA no desenvolvimento:** como declarar na metodologia? (O histórico do git registra sessões de Claude.)
8. **Instalador:** o `npm run dist` funcionou? O 1.4.1 foi instalado? Disso depende o que a demonstração pode prometer.
9. **Diário de uso:** haverá entradas de escrita antes da entrega? Se sim, como apresentar.
10. **Hipótese:** manter "parcialmente validada" (recomendado)?
11. **As 9 perguntas de `HANDOFF_2026-11-12.md`** (seção 4): alguma já tem resposta?
12. **Relatório do 1.º semestre:** reaproveitar texto (com as correções de §12) ou reescrever o referencial?

---

## 14. Regras de redação (o que nunca fazer)

- ❌ Afirmar que o protótipo foi **validado**, testado "com usuários", aprovado por escritores ou "comprovadamente eficaz". Verdade: verificado por **testes automatizados** e usado pontualmente pelo autor.
- ❌ Chamar o app de "ferramenta final", "produto", "versão estável" ou "pronto para distribuição". É protótipo exploratório.
- ❌ Escrever sobre entrevistas, perfil de autores, resultados de campo ou "próxima etapa: entrevistas em tal data".
- ❌ Listar como feito o que está em §5.1 como "não realizado" (tags, status, links, busca, modo foco, importação de documentos, DOCX/ODT, editor de texto corrido).
- ❌ Inventar números, datas, citações, resultados de desempenho, páginas ou justificativas de decisão que não estão nas fontes.
- ❌ Copiar texto de `CLAUDE.md` e dos `HANDOFF` sem adaptar: eles são notas internas ("o dono", "o Claude"). Reescreva em registro acadêmico, com "o autor".
- ❌ Esconder limitações: a seção de limitações é obrigatória e vale ponto de credibilidade.
- ✅ Todo fato técnico remete a uma evidência (arquivo, commit, teste, captura).
- ✅ Termos coerentes: **cartão**, **mesa**, **grupo**, **gaveta**, **ordem** (de leitura), **organizador**, **modo mapa**, **protótipo exploratório**. Não alternar sinônimos ("ficha", "quadro") sem definir.
- ✅ Datas no formato `13/11/2026` no texto; `2026-11-13` só em nomes de arquivo e tabelas técnicas.
- ✅ Contraste honesto: relatar o que **não funcionou** ou foi **abandonado** (ex.: a versão alternativa da Fase 6 com DOCX/ODT feitos à mão, mantida no ramo `claude/festive-mccarthy-no3e4d`; os instaladores que não chegaram ao dono) como aprendizado de processo.
- ✅ Privacidade: não incluir e-mail, caminhos pessoais (`C:\Users\…`), nem trechos dos textos reais do dono em figuras ou apêndices.

---

## 15. Regras operacionais desta sessão

1. **Só documentação.** Não alterar `src/`, `electron/`, `tests/`, `package.json`. Se achar defeito ou inconsistência no código, anote em "Achados" (final deste arquivo) e avise.
2. **Não rodar o Electron sem `CARTOES_DATA_DIR`.** Não tocar nos dados reais do dono.
3. **Não apagar** os ramos `claude/festive-mccarthy-no3e4d` e `prototipo-cartoes` (têm commits que só existem neles).
4. **Git:** o repositório é versionado com a raiz uma pasta acima de `cartoes/`. Documentos novos vão para `cartoes/docs/entrega/`. Commit só com pedido ou conforme a regra do ambiente; mensagens em português, descrevendo o conteúdo.
5. **Sem dependências novas** no `package.json`. Para gerar `.docx`/`.pptx`, use as ferramentas do próprio Cowork (skills `docx`/`pptx`), fora do projeto.
6. **No início da sessão** (regra do projeto): perguntar ao dono se houve uso do app desde a última vez e registrar em `docs/USO.md`. É o diário dele; não preencher de memória.
7. **Registre decisões**: cada resposta do dono da §13 vira uma linha na seção "Respostas" abaixo, com a data.

---

## 16. Checklist final de entrega

- [ ] §13 respondida (ou pendências listadas e assumidas pelo dono).
- [ ] D5: `npm test` rodado hoje; números do relatório conferem com a execução.
- [ ] §5.1 revisada por linha contra o código.
- [ ] Nenhuma menção a entrevistas/testes com escritores fora da frase única de delimitação (§8, 1.5) e das linhas sinalizadas do PAD.
- [ ] Hipótese descrita como **parcialmente validada**.
- [ ] Limitações (§4.4) presentes no relatório e nos slides.
- [ ] Correções de §12 aplicadas ou apresentadas ao dono.
- [ ] Referências verificadas; pendentes marcadas `[VERIFICAR]`.
- [ ] Figuras com legenda/fonte; nenhuma com dado pessoal.
- [ ] Orientador(a) e identificação conferidos.
- [ ] Demonstração ensaiada com plano B.
- [ ] Leitura final em voz alta do resumo e da conclusão: nada ali supera o que os testes e o código sustentam.

---

## Respostas do dono (preencher)

| Data | Pergunta (nº) | Resposta |
|---|---|---|
| | | |

## Achados durante a documentação (preencher)

| Data | O que foi achado | Onde | Encaminhamento |
|---|---|---|---|
| | | | |
