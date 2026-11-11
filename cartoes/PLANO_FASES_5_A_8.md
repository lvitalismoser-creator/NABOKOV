# Plano — Fases 5 a 8 (organizador, exportação, mesa, interface)

Alinhado com o dono em 2026-11-03, depois de usar o app por ~2 minutos. Ordem escolhida por ele: **organizador primeiro**. Cada fase só começa com "Sim, Fase N".

## Diagnóstico de partida

- **Exportar "não existe" na prática.** Só há `Ctrl+S`, sem botão nem menu, e ele gera um `.json` de backup, não um documento legível.
- **Salvamento invisível.** O salvamento é robusto (disco + IndexedDB + localStorage), mas nada na tela diz isso. Só aparece algo quando falha.
- **Mesa fixa.** As posições são da janela: não há zoom nem navegação, e cartões podem sumir fora da tela (pendência I1).
- **Embaralhar é só leitura.** Sorteia e mostra slides, mas não dá para mexer, guardar ou anotar nada.
- **Interface:** não fica claro o que é clicável (controles só no hover), a dica fixa no rodapé atrapalha, e os avisos e a gaveta confundem.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Organizador: onde | Evolui a tela de embaralhar: slide grande em cima, fileira editável embaixo |
| Organizador × mesa | A ordem **nunca** mexe na mesa; botão "dispor na mesa" só quando pedido |
| Pôr de lado | Cartão continua na fileira, erguido e esmaecido; não entra na exportação |
| Comentários | Um geral por ordem + notas por cartão **dentro daquela ordem**; nada aparece na mesa |
| Cartões novos depois de salvar | Bandeja "fora da ordem", esperando encaixe; a ordem salva não muda sozinha |
| Grupos no organizador | Peça única, mas dá para "abrir" o grupo e separar os cartões **só naquela ordem** |
| Exportação: conteúdo | Escolhido na hora: texto corrido / cartão por seção / ficha completa |
| Exportação: ordem | A partir de uma ordem salva (postos de lado não saem) |
| Formatos | `.docx`, `.odt`, `.pdf` (+ `.txt`/`.md`, que custam quase nada). Sem `.doc` antigo |
| Indicador de salvo | Pontinho no canto: cinza = salvo, pisca ao gravar, vermelho se falhar; hover mostra "salvo às 14:32 · em disco" |
| Navegar na mesa | Arrastar o fundo move a mesa; roda rola; Ctrl+roda dá zoom |
| Zoom longe | Modo mapa: abaixo de certo zoom, só as primeiras palavras em letra grande + cor da categoria |
| Redimensionar | 3 tamanhos fixos (P/M/G), sempre na proporção de ficha |
| Seleção múltipla | Sim: Shift+arrastar desenha caixa; Shift/Ctrl+clique; mover/guardar/excluir em lote |
| Funções secundárias | Menu discreto (≡) no canto superior, ao lado do embaralhar e do pontinho |

## Fase 5 — Organizador ✅ feita em 2026-11-03

**Como ficou (diferenças em relação ao rascunho abaixo):**

- **Modelo de salvar.** Toda ordem grava sozinha a cada mudança, então nada se perde.
  - Existe no máximo uma ordem "em teste, sem nome". "Salvar ordem" dá um nome a ela.
  - Numa ordem já nomeada, o botão vira "salvar como nova" (uma cópia com outro nome).
  - Mexer numa ordem nomeada altera essa ordem; `Ctrl+Z` desfaz. "Duplicar" abre uma cópia para testar variações.
  - **Embaralhar uma ordem nomeada nunca a altera:** o sorteio vira uma ordem nova em teste.
- **Notas:** painel à direita (botão "notas" ou `C`), com "neste ponto da ordem" e "sobre esta ordem". Uma bolinha azul na ficha indica que aquele ponto tem nota.
- **"Tirar da ordem"** (botão, ou arrastar a ficha para a bandeja) devolve o cartão à bandeja. Ele não é excluído.
- **"Dispor na mesa"** também leva os cartões de lado e os de fora da ordem para as últimas fileiras, para nada ficar por baixo. Desfaz pelo aviso.
- **Linha de atalhos** discreta no rodapé do organizador. Na Fase 8 decidimos se fica.
- **De carona:**
  - I6 corrigido: com 2 peças, embaralhar sempre troca a ordem.
  - Corrigido um bug antigo: o `#demo` gravava na lixeira real do navegador (`cartoes.trash`). Agora usa chaves próprias.
- **Testes:** 10 novos em `tests/organizer.test.cjs` e 1 no Electron (ordens no `projeto.json`). Total: 27, todos passando.

Rascunho original:

A tela de embaralhar vira o organizador.

```
┌ ← mesa ── Ordem: «versão flashback» ▾ ── ⤮ embaralhar ── salvar ─┐
│                                                                  │
│                 ┌──────────────────────┐                         │
│          ‹      │  cartão em leitura   │      ›     nota ▸       │
│                 └──────────────────────┘                         │
│   ˄ posto de lado                                                │
│ [1][2][3][˄4][5][6]   │  fora da ordem: [a][b]                   │
└──────────────────────────────────────────────────────────────────┘
```

- **Entrar:** `E` ou o botão abre a última ordem aberta. Se não houver nenhuma, abre a leitura da mesa (de cima para baixo, da esquerda para a direita). "Embaralhar" continua lá dentro como uma ação.
- **Mexer:** arrastar as fichinhas na fileira; teclado com `Alt+←/→` move o cartão atual. `↑` põe de lado (erguido e esmaecido), `↓` devolve.
- **Grupos:** entram como uma peça só. "Abrir grupo" separa os cartões só nesta ordem; a mesa não muda.
- **Comentários:** uma nota da ordem (no seletor de ordem) e uma nota por cartão-na-ordem (painel recolhível ao lado do slide). Indicador mínimo na fichinha quando há nota.
- **Ordens salvas:** "salvar" pede um nome, já sugerido ("Ordem de 3 nov, 14h"). A lista ▾ abre, renomeia, duplica e exclui (com desfazer). O que você está testando agora persiste sozinho como rascunho, então nada se perde se fechar sem salvar.
- **Fora da ordem:** cartões criados depois ficam na bandeja; um cartão excluído some da ordem e volta ao lugar se for restaurado da lixeira.
- **"Dispor na mesa":** coloca os cartões em fileira na mesa, nessa ordem. É a única ação que mexe na mesa, e pode ser desfeita.
- **Dados:** novo campo `orders` no registro salvo (disco, IndexedDB e espelho), com validação e quarentena como os cartões. Backup `.json` inclui as ordens.
- **De carona:** corrigir o I6 (embaralhar repetindo a ordem com 2 peças).
- **Testes:** reordenar, pôr de lado, salvar, reabrir após fechar, cartão novo indo para a bandeja, grupo aberto, persistência no Electron.

## Fase 6 — Menu, salvo e exportação ✅ feita em 2026-11-11

**Como ficou** (detalhes, testes e o que não foi verificado em `FASE_6_DIARIO.md`):

- **Pontinho de salvo** no canto: cinza = salvo, um pulso a cada gravação (não pisca sem parar), vermelho se falhar, anel vazio em aba somente leitura. No hover: "salvo às 14:32 · em disco".
- **Menu ≡** à direita do "organizar": Exportar… (`Ctrl+E`), Importar backup… (`Ctrl+O`), Fazer backup (.json) (`Ctrl+S`), Lixeira, Instantâneos, Atalhos (`?`).
  - Lixeira lista os excluídos e devolve o escolhido ao mesmo lugar.
  - Instantâneos restaura com confirmação, sem console. De carona, dois bugs antigos do app desktop corrigidos: a restauração não concluía (o recarregamento era barrado) e podia se perder num empate de horário com o disco.
- **Janela "Exportar":** ordem (salvas, a em teste, ou "a mesa como está"), modelo (texto corrido / uma seção por cartão / fichas completas), formato, pré-visualização. No app, grava pelo "Salvar como" do Windows.
- **Formatos:** `.docx` e `.odt` gerados à mão (ZIP sem compressão + XML, sem dependência), PDF pela impressão do Electron, `.txt` e `.md`. Negrito e itálico preservados em todos, **menos no `.txt`** (texto puro não tem como).
- **Diferenças em relação ao rascunho abaixo:**
  - "A mesa como está" aparece sempre na lista de ordens, não só enquanto não houver ordem salva.
  - No modelo por seção, um grupo é uma seção só.
  - No navegador (fora do app), o PDF sai pela janela de impressão ("Salvar como PDF").
- **Testes:** 22 novos (total 49). Os arquivos foram abertos de verdade no LibreOffice (Linux), pandoc e python-docx; o PDF, lido por poppler.
- **Falta o dono verificar:** abrir `.docx` no **Microsoft Word** e `.odt` no LibreOffice do Windows; o "Salvar como" real; e confirmar os dois padrões assumidos (pendências 2 e 3 abaixo).

Rascunho original:

- **Pontinho de salvo** (pode ir já na Fase 5, ver pendências).
- **Menu ≡** discreto: Exportar…, Importar backup…, Fazer backup (.json), Lixeira, Instantâneos (resolve "restaurar sem console"), Atalhos. Cada item mostra o atalho.
- **Janela "Exportar":** escolher a ordem (salva, ou a leitura da mesa enquanto não houver nenhuma), o modelo (texto corrido / por seção / ficha completa) e o formato. Uma pré-visualização curta. Salvar pelo diálogo do Windows.
- **Formatos:**
  - PDF: `printToPDF` do próprio Electron.
  - DOCX/ODT: são pacotes ZIP de XML, gerados à mão (zip simples, sem compressão), sem dependência nova.
  - TXT/MD: direto.
  - Negrito e itálico preservados em todos.
- **Testes:** abrir cada arquivo gerado e conferir o texto (o `.docx`/`.odt` descompactados; o PDF por tamanho e presença do texto).

## Fase 7 — Mesa

- **Mesa infinita** com câmera (deslocamento + zoom). As posições passam a ser "do mundo", não da janela, o que resolve o I1 de vez. Os dados atuais migram sem mudança visível.
- Arrastar o fundo move a mesa; roda rola; `Ctrl+roda` dá zoom no cursor; `Ctrl+0` = ver tudo; `Ctrl+1` = 100%. Duplo clique no fundo continua criando cartão.
- **Modo mapa** abaixo de ~45%: primeiras palavras grandes + cor da categoria; clicar aproxima.
- **Tamanhos P/M/G** na proporção de ficha (botão no hover + atalho). Ímã e moldura de grupo passam a respeitar tamanhos diferentes.
- **Seleção múltipla:** Shift+arrastar desenha a caixa; Shift/Ctrl+clique; mover, guardar e excluir em lote (com desfazer).
- Cartão novo (`N`) nasce no centro da área visível.
- De carona: I2/I3 (grupo parcialmente guardado).
- **Testes:** pan/zoom não altera os dados; ímã com tamanhos mistos; seleção em lote; abrir em janela menor.

## Fase 8 — Revisão de interface

- **"O que é clicável":** cursor de mão na moldura, borda de arrasto levemente visível no cartão com foco, controles maiores e com rótulo no hover.
- **Dica fixa do rodapé sai.** Entram uma dica de primeira visita (some sozinha) e "Atalhos" no menu ≡.
- **Avisos:** sempre "o que aconteceu + onde está + desfazer", na mesma posição e com o mesmo tempo.
- **Gaveta:** rótulo "gaveta (3)", cartão "voa" até ela ao guardar, devolver mostra para onde voltou.
- Passe de crítica com screenshots (contraste, tamanhos de alvo, consistência).

## Pendências para confirmar

1. **Clicável × "zero poluição":** a Fase 8 deixa a moldura levemente visível no cartão **com foco**. Isso toca o item 3 do "Conceito do cartão". Pode?
2. **DOCX/ODT sem biblioteca:** gerar à mão (recomendado, sem dependência) ou aceitar uma biblioteca (`docx`/`jszip`)? → **Assumido na Fase 6: à mão.** Ainda aguarda o "ok" do dono; se o Word recusar o arquivo, reabrir esta decisão.
3. **Pontinho de salvo** junto com a Fase 5 (é pequeno e dá confiança desde já)? → **Entrou na Fase 6** (assumido; aguarda o "ok" do dono).

## Não verificado / riscos

- Exportação `.odt`/`.docx` gerada à mão precisa ser aberta no Word e no LibreOffice reais; os testes automáticos só conferem a estrutura. (Fase 6: aberta no LibreOffice do Linux, com teste automático onde ele existe. **Word ainda não.**)
- A Fase 7 mexe em arrasto e ímã, a parte mais delicada do app. Por isso vem com testes novos antes de mudar.
