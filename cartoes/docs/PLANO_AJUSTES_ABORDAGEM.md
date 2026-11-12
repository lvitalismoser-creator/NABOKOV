# Plano — ajustes de abordagem (Fases 6 a 8 e validação)

Decidido com o dono em 2026-11-11, depois da revisão crítica do `CLAUDE.md` e dos documentos em `docs/`. Este plano **não substitui** o `PLANO_FASES_5_A_8.md`: ele ajusta a ordem, o fechamento das fases e a forma de validar. Onde os dois divergirem, vale este.

## Por que existe

A revisão encontrou quatro problemas:

- As Fases 6–8 nasceram de um feedback de ~2 minutos de uso, e nada foi rodado com dados reais.
- Não havia critério para dizer que o protótipo validou a ideia, nem lugar para registrar o uso.
- O "Conceito do cartão" contradiz decisões já tomadas (P/M/G, pontinho de salvo, moldura no foco).
- As pendências estavam repetidas em três arquivos, com trechos desatualizados.

## Decisões do dono (2026-11-11)

| Tema | Decisão |
|---|---|
| Etapa de uso antes da Fase 6 | **Não.** Seguir o plano de fases. |
| Sinais de validação | **Escrever em várias sessões** e **voltar sem lembrete**. |
| Meta de sessões | **5 sessões, em dias diferentes, em 2 semanas.** |
| Quando medir | **Só depois da Fase 8.** |
| Registro do uso | **Os dois:** o dono anota em `docs/USO.md` quando quiser, e o Claude pergunta no início de cada sessão e completa. |
| Exportação | **TXT/MD/PDF primeiro**; DOCX/ODT depois da validação. |
| Conceito do cartão | **Registrar as exceções** decididas, com o motivo. |
| I7 e I8 | **No início da Fase 6**, como primeiro bloco. |
| Fechar uma fase | Testes passando **e** conferência rápida do dono no instalador novo. |
| Fase 7 | **Dividida em 7a e 7b**, ambas antes da 8. |
| Se a validação falhar | **Revisar com o diário** antes de qualquer distribuição. |
| Ajustes de documentação | **De carona na Fase 6**, no primeiro bloco. |

## Regras novas de processo

1. **Abrir uma fase:** continua valendo "Sim, Fase N".
2. **Fechar uma fase:** os três itens abaixo são obrigatórios.
   - `npm test` passa.
   - Instalador novo gerado (`npm run dist`), com a versão aumentada.
   - O dono instala e confere por alguns minutos que nada quebrou. Só então a fase vira ✅ no plano. Até lá ela fica "feita, aguardando conferência".
3. **Bloco:** uma unidade de trabalho que faz sentido sozinha e deixa os testes passando (por exemplo, "pontinho de salvo" ou "I8"). Cada bloco termina com um commit.
4. **Diário de uso:** no início de cada sessão de trabalho, o Claude pergunta se houve uso desde a última vez e registra em `docs/USO.md`. O dono também pode anotar direto no arquivo.
5. **Pendências num lugar só:** o `PLANO_FASES_5_A_8.md` (e este arquivo) guardam as pendências. O `CLAUDE.md` só aponta para eles. O `HANDOFF_*` vira histórico e não é atualizado.

## Fase 6 — Proteção do texto, menu, salvo e exportação simples

> **Estado (2026-11-12):** feita, aguardando conferência do dono no instalador 1.1.0. Detalhes em `PLANO_FASES_5_A_8.md`.

### Bloco 6.1 — Texto e documentação (primeiro)

- **I8:** o Backspace num cartão só com espaços não apaga sem desfazer. O comportamento exato fica para quando a fase abrir; a regra é que nenhum texto suma sem volta.
- **I7:** Backspace logo depois de uma regra markdown desfaz a conversão (`undoInputRule`).
- **Documentação, de carona:**
  - **"Conceito do cartão":** acrescentar "Exceções decididas pelo dono", cada uma com data e motivo:
    - tamanhos P/M/G na proporção de ficha (Fase 7b);
    - pontinho de salvo sempre visível (Fase 6);
    - moldura levemente visível só no cartão com foco (Fase 8).
  - **`CLAUDE.md`:**
    - remover a frase sobre `Ctrl+N` reservado pelo navegador (no app desktop ele já está livre);
    - trocar as listas de pendências por um link para os planos;
    - incluir as regras novas de processo.
  - **`PLANO_FASES_5_A_8.md`:**
    - fechar a pendência 3 (o pontinho vai na Fase 6) e a pendência 1 (moldura aceita como exceção);
    - remover "pode ir já na Fase 5";
    - apontar para este plano.
  - **`HANDOFF_2026-11-03.md`:** na nota do topo, dizer que a ordem de leitura atual começa pelo `CLAUDE.md` e que o arquivo é histórico.
  - **Novo `docs/USO.md`,** com o modelo abaixo.
- Testes: I7 e I8 ganham testes no Playwright.

### Bloco 6.2 — Pontinho de salvo

Como no plano original: cinza = salvo, pisca ao gravar, vermelho se falhar; o hover mostra "salvo às 14:32 · em disco".

### Bloco 6.3 — Menu ≡

Como no plano original: Exportar…, Importar backup…, Fazer backup (.json), Lixeira, Instantâneos, Atalhos.

### Bloco 6.4 — Exportação TXT, MD e PDF

- Janela "Exportar": ordem, modelo (texto corrido / por seção / ficha completa), formato e pré-visualização curta.
- PDF por `printToPDF`; TXT/MD direto; negrito e itálico preservados.
- Diálogo de salvar do Windows (IPC novo em `electron/main.cjs` e `preload.cjs`).

**Fecha a Fase 6:** testes, instalador 1.1.0 e conferência do dono.

## Fase 7a — Câmera da mesa

> **Estado (2026-11-12):** feita, aguardando conferência do dono no instalador 1.2.0. Detalhes em `PLANO_FASES_5_A_8.md`.

- Mesa infinita com deslocamento e zoom; posições "do mundo" (resolve o I1).
- Arrastar o fundo, roda, `Ctrl+roda`, `Ctrl+0`, `Ctrl+1`; `N` cria no centro da área visível.
- De carona: I2/I3 (grupo parcialmente guardado).
- Testes antes de mudar o arrasto e o ímã, como o plano original já pede.

**Fecha a 7a:** testes, instalador e conferência do dono.

## Fase 7b — Tamanhos, seleção e modo mapa

> **Estado (2026-11-12):** feita, aguardando conferência do dono no instalador 1.3.0. Detalhes em `PLANO_FASES_5_A_8.md`.

- Tamanhos P/M/G (exceção registrada no Conceito).
- Seleção múltipla com ações em lote e desfazer.
- Modo mapa abaixo de ~45%.

**Fecha a 7b:** testes, instalador e conferência do dono.

## Fase 8 — Revisão de interface

> **Estado (2026-11-12):** feita, aguardando conferência do dono no instalador 1.4.0. A linha `.org-keys` saiu (virou o botão "atalhos"). Detalhes em `PLANO_FASES_5_A_8.md`.

Como no plano original, incluindo a decisão sobre a linha de atalhos `.org-keys`. A moldura no foco segue como exceção registrada.

**Fecha a Fase 8:** testes, instalador e conferência do dono.

## Validação (depois da Fase 8)

- **Janela:** 2 semanas a partir da instalação do instalador da Fase 8.
- **Validou se os dois sinais aparecerem:**
  1. pelo menos **5 sessões de escrita em dias diferentes**;
  2. na maioria delas, o dono **abriu o app por vontade própria**, e não para testar ou conferir uma fase.
- **Fonte:** `docs/USO.md`. O diário começa já na Fase 6; as anotações anteriores à janela servem de contexto, mas não contam para a meta.
- **Se validar:** discutir com o dono o próximo passo: DOCX/ODT, outros escritores, ícone, assinatura e distribuição.
- **Se não validar:** ler o diário, listar o que travou ou afastou, e decidir cortes ou mudanças com o dono **antes** de qualquer distribuição. Nenhuma fase nova começa antes dessa conversa.

## Depois da validação (candidatos, sem ordem)

- Exportação DOCX/ODT. A pergunta "gerar à mão ou usar biblioteca (`docx`/`jszip`)" continua aberta e só precisa de resposta aqui.
- Uso por outros escritores.
- Ícone próprio e assinatura do instalador.
- Busca de cartões e editor de texto corrido dentro do app (fora do plano hoje).
- Teste de falha real de `rename` no Windows.

## Modelo do `docs/USO.md`

```markdown
# Diário de uso

| Data | Por que abri (vontade / teste) | O que escrevi (em poucas palavras) | O que travou ou incomodou | Anotado por (dono / Claude) |
|---|---|---|---|---|
```

## Pendências ainda abertas

- **Conferência do dono** nos instaladores 1.1.0 (Fase 6), 1.2.0 (7a), 1.3.0 (7b) e 1.4.0 (8). O 1.4.0 contém tudo: conferir só ele basta para as quatro fases.
- **Validação:** começa quando o dono instalar o 1.4.0.
- DOCX/ODT à mão ou com biblioteca: só depois da validação.
- ~~`.org-keys` fica ou sai: Fase 8.~~ Saiu (2026-11-12), a confirmar com o dono.
- Escuta sobre o organizador: entra pelo diário (`USO.md`).
- Perguntas ao dono e decisões tomadas sem ele: `HANDOFF_2026-11-12.md`.

## Riscos assumidos

- Sem etapa de uso antes da Fase 6, as Fases 6–8 podem construir o que o uso real não pede. A conferência rápida ao fim de cada fase reduz o risco de quebra, mas não mede valor.
- "Voltar sem lembrete" depende de o dono marcar com honestidade a coluna "por que abri".
