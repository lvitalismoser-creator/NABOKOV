# Prompt: sequência autônoma de blocos (sem supervisão corrente)

Cole o texto abaixo numa sessão nova em nuvem, no repositório `lvitalismoser-creator/NABOKOV`.

**Por que não há "Fase 9":** o plano não tem fase aberta. As Fases 6 a 8 estão feitas, aguardando a conferência do dono, e o `CLAUDE.md` exige "Sim, Fase N" do dono para abrir uma fase. Por isso este prompt cobre só o que cabe sem ele: destravar a entrega do instalador, preparar a validação e consolidar as decisões de produto. Nenhuma funcionalidade nova entra.

---

## Prompt

Você trabalha no protótipo exploratório "Cartões" (pasta `cartoes/` do repositório NABOKOV). Leia, nesta ordem, antes de qualquer coisa: `cartoes/CLAUDE.md` (inclusive "O que este projeto é" e "Regras para trabalhar aqui"), `cartoes/docs/HANDOFF_2026-11-13.md`, `cartoes/docs/PLANO_AJUSTES_ABORDAGEM.md` e `cartoes/docs/PLANO_FASES_5_A_8.md`.

Vai trabalhar sozinha, sem ninguém para responder perguntas durante a execução. Faça os blocos A, B e C abaixo, **um de cada vez, em ordem**. Cada bloco termina com `npm test` passando (quando mexer em código ou testes) e um commit próprio. Só passe ao seguinte quando o anterior estiver fechado.

### Limites (valem para tudo)

- Desenvolva e envie só no ramo `claude/elegant-goodall-tkeypk`. Não crie PR. Não apague, renomeie nem mescle ramos; `claude/festive-mccarthy-no3e4d` e `prototipo-cartoes` têm commits que só existem neles.
- **Não abra fase nova nem adicione funcionalidade ao app.** Nada de `src/` a menos que um teste que já existe quebre. Sugerir cartões, indexar cartões a documentos, DOCX/ODT, ícone, assinatura, busca e refatorações ficam fora.
- **Não marque nenhuma fase como ✅.** Isso exige o dono instalar e conferir o instalador. Também não altere a versão (1.4.1).
- Sem dependências novas no `package.json`.
- Nunca toque nos dados reais do dono: no Electron, só com `CARTOES_DATA_DIR`. Nos testes, use `ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test` (e `npm i --no-save playwright@<versão instalada>` se o Playwright não casar).
- Não edite `index.html` à mão; rebuilde.
- Não apague nem reescreva os `HANDOFF_*` antigos (são histórico).
- Se algo exigir decisão do dono, **não decida**: registre a pergunta no bloco C (seção "Perguntas") e siga em frente com o resto.

### Bloco A — Instalador do Windows pelo GitHub Actions

Objetivo: o dono baixar o `Cartoes-Setup-<versão>.exe` do GitHub, sem rodar `npm run dist` na máquina dele (o chat não entrega os 121 MB).

1. Crie `.github/workflows/instalador.yml` na **raiz do repositório** (uma pasta acima de `cartoes/`), num runner `windows-latest`, com Node LTS, `working-directory: cartoes`, `npm ci`, `npm run dist`, e envio de `cartoes/dist/Cartoes-Setup-*.exe` como artefato com `retention-days: 30`. Gatilhos: `workflow_dispatch` e push no ramo `claude/**` que altere `cartoes/**`. Permissões mínimas (`contents: read`). Não rode `npm audit fix`.
2. Confirme que `npm ci` funciona com o `package-lock.json` atual e que `npm run dist:dir` ou o build equivalente não depende de `wine` no Windows. Se o npm novo pedir aprovação de scripts de instalação (`esbuild`, `electron-winstaller`), resolva dentro do workflow (por exemplo, `npm rebuild`, ou o comando de aprovação indicado pelo próprio aviso) e documente o que foi preciso.
3. Envie o ramo e acompanhe a execução com `gh api repos/lvitalismoser-creator/NABOKOV/actions/runs` (só `gh api`; sem GraphQL). Se falhar, leia o log, corrija e envie de novo, **no máximo 4 tentativas**. Não reexecute jobs nem faça commits vazios para forçar o CI.
4. Se o workflow não puder rodar daqui (permissão negada ao enviar `.github/workflows`, Actions desligado, etc.), **não insista**: deixe o arquivo pronto, anote exatamente o que falhou e como o dono liga.
5. Em `cartoes/CLAUDE.md` (seção "Empacotar") e no `README.md` da raiz, descreva em poucas linhas como baixar o instalador do GitHub (Actions → execução → Artifacts) e mantenha o caminho local (`npm run dist`) como alternativa.
6. Commit: `Instalador do Windows pelo GitHub Actions`.

Pronto quando: o workflow existe e, se pôde rodar, gerou o artefato; ou a limitação está registrada com o próximo passo do dono.

### Bloco B — Preparar a validação

Objetivo: o dono começar a usar sem atrito e o diário ficar pronto.

1. Em `cartoes/docs/USO.md`, acrescente (sem mexer na linha de 12-11) uma seção curta "Como anotar" com: o significado de "vontade" e "teste"; o pedido de registrar os momentos em que sentiu falta de **reencontrar um cartão** ou **ser lembrado de um** (insumo do programa real), com uma coluna ou marcador para isso se couber sem quebrar a tabela.
2. Crie `cartoes/docs/ROTEIRO_CONFERENCIA.md`: lista curta (no máximo 15 itens, em português simples) do que o dono confere nos primeiros minutos com o 1.4.1 instalado, cobrindo as Fases 6, 7a, 7b e 8 (salvar e pontinho, menu ≡, exportar TXT/MD/PDF, deslocar e zoom, P/M/G, seleção múltipla, modo mapa, organizador e "dispor na mesa", fechar e reabrir sem perder nada). Tire os itens do `HANDOFF_2026-11-12.md` (seção "o que não foi verificado") e dos planos. Cada item diz o que fazer e o que esperar ver.
3. Em `PLANO_AJUSTES_ABORDAGEM.md`, em "Pendências ainda abertas", aponte para o roteiro. Não altere o estado das fases.
4. Commit: `Roteiro de conferência e guia do diário de uso`.

### Bloco C — Dossiê de decisões para o programa real

Objetivo: o entregável mais valioso do protótipo, já que o programa será refeito do zero. Só documentação.

Crie `cartoes/docs/DOSSIE_PROGRAMA_REAL.md` com:

1. **Princípio e dúvida de produto** que o protótipo testa (uma página).
2. **Decisões de produto que vão adiante**, cada uma com decisão, motivo e onde nasceu (cartão finito e estouro em pilha, "zero poluição visual" e as três exceções, arrasto só pela moldura, grupos por ímã, gaveta, categorias, organizador e "uma ordem nunca mexe na mesa", mesa infinita, P/M/G, modo mapa, "nunca perder texto" e a estratégia de salvamento). Extraia do `CLAUDE.md` e dos planos; não invente motivo que não esteja registrado, e marque "motivo não registrado" quando faltar.
3. **O que não vai adiante** (estrutura do código) e **o que os 73 testes documentam** como comportamento esperado, agrupado por arquivo de teste.
4. **Ideias do dono para o programa real**, citando literalmente as do `CLAUDE.md` (identificar texto e padrões, indexar cartões a documentos, sugerir cartões para relembrar), sem projetá-las.
5. **Problemas achados nos testes e no uso**, vindos de `USO.md` e dos handoffs.
6. **Perguntas** ao dono: as nove de `HANDOFF_2026-11-12.md` (seção 4) mais as que surgirem nos blocos A e B, cada uma com o que muda no produto conforme a resposta.

Atualize o "Estado" no topo de `cartoes/CLAUDE.md` com uma linha apontando para o dossiê e para o roteiro. Commit: `Dossiê de decisões para o programa real`.

### Encerramento

Rode `npm test` uma última vez, confirme `git status` limpo e `git push -u origin claude/elegant-goodall-tkeypk` (até 4 tentativas com espera crescente em erro de rede). Escreva em `cartoes/docs/HANDOFF_<data de hoje>.md` um registro curto: o que foi feito em A, B e C, o resultado do workflow, o que não pôde ser feito e por quê, as perguntas em aberto e o primeiro passo do dono (instalar, conferir pelo roteiro, dizer "Sim" ou "ajustes"). Faça o commit e envie. Termine com um resumo de no máximo 10 linhas, dizendo com clareza o que está verificado e o que não está.
