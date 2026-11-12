# Plano — Fases 5 a 8 (organizador, exportação, mesa, interface)

Alinhado com o dono em 2026-11-03, depois de usar o app por ~2 minutos. Ordem escolhida por ele: **organizador primeiro**. Cada fase só começa com "Sim, Fase N".

> **Leia junto:** `PLANO_AJUSTES_ABORDAGEM.md` (2026-11-11) ajusta a ordem das fases (6, 7a, 7b, 8), o que entra em cada uma, como uma fase é fechada e a validação. Onde os dois divergirem, vale aquele.

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

## Fase 6 — Menu, salvo e exportação — feita em 2026-11-12, aguardando conferência do dono

Instalador: `Cartoes-Setup-1.1.0.exe`. Vira ✅ quando o dono instalar e conferir.

**Como ficou** (blocos 6.1 a 6.4 do `PLANO_AJUSTES_ABORDAGEM.md`):

- **I7 e I8.** Backspace logo depois de `**x**`/`*x*` desfaz a conversão. Backspace só apaga o cartão que não tem nenhum caractere; espaços se apagam um a um.
- **Pontinho de salvo** no canto superior direito: cinza = salvo, pisca enquanto há algo por gravar, vermelho se falhar. O hover mostra "salvo às 14:32 · em disco".
- **Menu ≡:** Exportar…, Importar backup…, Fazer backup (.json), Lixeira, Instantâneos, Atalhos (F1).
  - Lixeira: lista os excluídos e devolve um por um. Não há "esvaziar".
  - Instantâneos: lista, pede confirmação e restaura; o estado de agora vira instantâneo antes.
- **Exportar** (`Ctrl+E`): ordem, modelo, formato (PDF, TXT, MD) e prévia. DOCX/ODT ficaram para depois da validação.
- **De carona:** restaurar instantâneo não funcionava no app desktop (o recarregamento era bloqueado e o arquivo em disco, mais novo, vencia). Corrigido.
- **Testes:** 16 novos. Total: 43, todos passando.

As escolhas feitas sem o dono estão em `HANDOFF_2026-11-12.md`, em "Decisões tomadas sozinho".

Plano original:


- **Pontinho de salvo.**
- **Menu ≡** discreto: Exportar…, Importar backup…, Fazer backup (.json), Lixeira, Instantâneos (resolve "restaurar sem console"), Atalhos. Cada item mostra o atalho.
- **Janela "Exportar":** escolher a ordem (salva, ou a leitura da mesa enquanto não houver nenhuma), o modelo (texto corrido / por seção / ficha completa) e o formato. Uma pré-visualização curta. Salvar pelo diálogo do Windows.
- **Formatos:**
  - PDF: `printToPDF` do próprio Electron.
  - DOCX/ODT: são pacotes ZIP de XML, gerados à mão (zip simples, sem compressão), sem dependência nova.
  - TXT/MD: direto.
  - Negrito e itálico preservados em todos.
- **Testes:** abrir cada arquivo gerado e conferir o texto (o `.docx`/`.odt` descompactados; o PDF por tamanho e presença do texto).

## Fase 7 — Mesa (dividida em 7a e 7b pelo `PLANO_AJUSTES_ABORDAGEM.md`)

### Fase 7a — Câmera da mesa — feita em 2026-11-12, aguardando conferência do dono

Instalador: `Cartoes-Setup-1.2.0.exe`. Vira ✅ quando o dono instalar e conferir.

**Como ficou:**

- **Mesa infinita.** As posições são "do mundo"; a janela mostra um pedaço. Os dados antigos abrem iguais (câmera em 0,0 a 100%).
- **Navegar:** arrastar o fundo (ou o botão do meio) move a mesa; a roda rola; `Shift`+roda vai de lado; `Ctrl`+roda dá zoom no cursor (20% a 200%); `Ctrl+0` mostra todos os cartões; `Ctrl+1` volta a 100%; `Ctrl +` e `Ctrl -` aproximam e afastam.
- **Indicador de zoom** no canto superior esquerdo, só quando o zoom não é 100%. Clicar volta a 100%.
- **A câmera não entra no projeto.** É preferência de tela; mover a mesa não grava nada nos cartões.
- `N` cria no centro do que a janela mostra; duplo clique cria sob o cursor; `Ctrl+Enter`, devolver da gaveta e devolver da lixeira trazem a mesa até o cartão.
- **I1 resolvido:** em janela menor nada some; se nenhum cartão aparece ao abrir, a mesa enquadra todos.
- **I2/I3 resolvidos:** um grupo nunca fica metade na mesa e metade na gaveta.
- **"Dispor na mesa"** não sobrepõe mais as fileiras: o que não cabe na janela fica mais abaixo.
- **Testes:** 5 escritos antes de mexer no arrasto e no ímã, mais 7 da câmera. Total: 55, todos passando.

### Fase 7b — Tamanhos, seleção e modo mapa — feita em 2026-11-12, aguardando conferência do dono

Instalador: `Cartoes-Setup-1.3.0.exe`. Vira ✅ quando o dono instalar e conferir.

**Como ficou:**

- **Tamanhos P/M/G** na proporção de ficha: 252×158, 340×214 e 474×298, com 4, 6 e 9 linhas de pauta. A letra é a mesma; muda quanto texto aparece. Botões `P M G` no hover do cartão e `Alt+1/2/3`. Ímã, moldura de grupo e "dispor na mesa" respeitam tamanhos mistos.
- **Seleção múltipla:** `Shift`+arrastar no fundo desenha a caixa; `Shift`/`Ctrl`+clique põe ou tira um cartão. Arrastar um selecionado move todos. A barra da seleção oferece tamanho, guardar e excluir; `Delete` exclui e `Esc` solta.
- **Desfazer:** as ações em lote mostram "desfazer" no aviso, e `Ctrl+Z` sem cursor num cartão desfaz mover, mudar de tamanho, guardar e excluir em lote.
- **Modo mapa** abaixo de 45%: primeiras palavras em letra grande e faixa na cor da categoria; clicar num cartão aproxima até ele, a 100%.
- **De carona:** os botões do cartão não roubam mais o foco do texto; a pilha só aparece quando sobra texto de verdade (antes, um cartão cheio até a última linha já mostrava a pilha).
- **Testes:** 9 novos. Total: 64, todos passando.


Plano original (7a + 7b):


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

1. ~~**Clicável × "zero poluição":** moldura levemente visível no cartão com foco.~~ **Fechada em 2026-11-11:** aceita como exceção registrada no "Conceito do cartão" (`CLAUDE.md`). Entra na Fase 8.
2. **DOCX/ODT sem biblioteca:** gerar à mão (recomendado, sem dependência) ou aceitar uma biblioteca (`docx`/`jszip`)? **Adiada:** DOCX/ODT só depois da validação (ver `PLANO_AJUSTES_ABORDAGEM.md`).
3. ~~**Pontinho de salvo** junto com a Fase 5?~~ **Fechada em 2026-11-11:** vai na Fase 6 (Bloco 6.2).

## Não verificado / riscos

- Exportação `.odt`/`.docx` gerada à mão precisa ser aberta no Word e no LibreOffice reais; os testes automáticos só conferem a estrutura.
- A Fase 7 mexe em arrasto e ímã, a parte mais delicada do app. Por isso vem com testes novos antes de mudar.
