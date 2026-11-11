# Fase 6 — diário (menu ≡, indicador de salvo, exportação)

Sessão de 2026-11-11. Um bloco por commit, na ordem do plano (`PLANO_FASES_5_A_8.md`, seção Fase 6). Cada bloco registra: o que foi feito, decisões e motivos, testes com o resultado real, problemas e o que **não** foi verificado.

Padrões assumidos nesta fase, **pendentes de confirmação do dono**:

- DOCX/ODT gerados à mão (ZIP sem compressão + XML), sem dependência nova.
- O pontinho de salvo entra nesta fase.

## Bloco 0 — linha de base e ambiente

- A sessão roda num contêiner Linux na nuvem, não na máquina Windows do dono. Agora o projeto **é** um repositório git (`lvitalismoser-creator/NABOKOV`, pasta `cartoes/`), então a regra "um commit por bloco" vale. Branch de trabalho: `claude/festive-mccarthy-no3e4d`.
- `npm test` puro **não passa neste contêiner**, por três motivos do ambiente (nenhum do projeto):
  1. O Playwright do `package-lock` (1.64.1) pede o Chromium 1248 e o contêiner só tem o 1243 pré-instalado. Contornei com um atalho (symlink) fora do repositório.
  2. O Electron precisa de uma tela: usei `xvfb-run -a` (tela virtual).
  3. Rodando como root, o Electron só abre com o sandbox desligado. O teste "a segunda instância não abre" lança o Electron direto, então precisou de `ELECTRON_DISABLE_SANDBOX=1`.
- Comando usado em todos os blocos: `ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test`.
- **Resultado da linha de base: 27 de 27 passando**, sem mudar nada no código.
- Não verificado: `npm test` no Windows do dono (lá o comando puro deve bastar, como na Fase 5).

## Bloco 1 — pontinho de salvo

**O que foi feito**

- `#save-dot` no canto superior direito, à esquerda do botão "organizar". Os dois agora ficam dentro de `#corner` (o `#organize` deixou de ser `position: fixed` sozinho).
- Estados (`data-state`): `saved` (cinza), `dirty` (cinza; há mudança ainda não gravada), `saving` (cinza, com um pulso), `failed` (vermelho), `ro` (anel vazio: aba somente leitura).
- Texto só no hover (`data-tip`, também em `aria-label`): "salvo às 14:32 · em disco" no app desktop, "· neste navegador" no navegador, "· demonstração" no `#demo`. Antes da primeira gravação da sessão: "tudo salvo · …".
- `setDot()` e `pulseDot()` em `src/main.js`; `save()` marca `dirty`, `flush()` marca `saving` e, ao terminar, `saved` ou `failed`.

**Decisões e motivos**

- **Um pulso por gravação, não piscar contínuo.** O dono pediu "pisca ao gravar". Piscar durante toda a digitação chamaria a atenção o tempo todo, contra o princípio de carga cognitiva mínima. Ficou um pulso curto (0,9 s) a cada gravação; com `prefers-reduced-motion` não há animação.
- **Não dizer "salvo" antes da hora.** Entre a tecla e a gravação (até 3 s) o hover mostra "gravando as últimas mudanças…", sem mudar a cor. Só volta a "salvo às HH:MM" quando o destino que importa confirmou (o arquivo, no app desktop).
- **O aviso de falha existente continua.** O pontinho vermelho soma ao aviso "Não consegui salvar…", não o substitui.
- Uma gravação antiga que termina depois de outra mais nova não altera o estado (contador `flushN`).
- O pontinho é elemento visível por padrão, mas fica fora do cartão e foi pedido pelo dono; o "Conceito do cartão" não foi tocado.

**Testes** (`ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm test`): **30 de 30**.

- Novo arquivo `tests/menu.test.cjs`:
  - salvo com hora e lugar depois de gravar; "dirty" logo após digitar; texto só no hover; vermelho quando todos os destinos falham e volta a cinza quando a gravação volta;
  - aba somente leitura e `#demo` dizem o que são.
- `tests/electron.test.cjs`: o pontinho diz "em disco" e, nesse momento, o `projeto.json` já contém o texto.
- Screenshot do canto com hover conferido a olho (1280×800, `#demo`).

**Não verificado**

- Aparência no Windows real (fonte serifada e antialias diferentes do Linux).
- O pulso em uso prolongado: se incomoda ou não, só o dono pode dizer.

## Bloco 2 — menu ≡, lixeira, instantâneos e atalhos

**O que foi feito**

- Botão `≡` (`#menu-btn`) no canto, à direita do "organizar". Abre `#menu` com cada item e seu atalho:
  - Importar backup… (`Ctrl+O`)
  - Fazer backup (.json) (`Ctrl+S`)
  - Lixeira (mostra a contagem; `T` devolve o último)
  - Instantâneos
  - Atalhos (`?`)
  - "Exportar…" entra no bloco 3, junto com a janela dele.
- Janela genérica `#sheet` (`openSheet`/`closeSheet`), usada por:
  - **Lixeira:** excluídos do mais recente ao mais antigo, com categoria, primeiras palavras e data. "Devolver à mesa" põe o cartão de volta onde estava e mantém a janela aberta.
  - **Instantâneos:** data, número de cartões, ordens salvas e as primeiras palavras. "Restaurar" pede confirmação na própria linha ("sim, voltar a este ponto" / "cancelar"). Resolve a pendência "restaurar sem console".
  - **Atalhos:** mesa, cartão e organizador.
- Teclado: com menu ou janela abertos, os atalhos da mesa (`N`, `T`, `E`…) não valem. No menu, setas andam e `Esc` fecha; na janela, `Esc` ou clique fora fecham.

**Decisões e motivos**

- **Ordem no canto: pontinho, organizar, ≡.** O plano diz "ao lado do embaralhar e do pontinho"; o ≡ ficou na ponta por ser o menos usado.
- **`Ctrl+S` continua sendo o backup `.json`**, agora com rótulo no menu. Trocar o significado de um atalho que já existe confundiria.
- **Restaurar instantâneo pede confirmação, mas não apaga nada**: o estado atual vira instantâneo antes (já era assim no console).
- **Sem "esvaziar lixeira".** Não foi pedido e seria a única ação destrutiva do menu.
- **Atalho `?`** para a lista de atalhos: não conflita com nada e só vale fora do texto.
- A janela de atalhos **não** substitui ainda a dica fixa do rodapé: tirar a dica é da Fase 8.

**Problemas encontrados**

1. **Restaurar instantâneo não funcionava no app desktop** (bug anterior à Fase 6, nunca testado no Electron). O `will-navigate` do `electron/main.cjs` barrava toda navegação, inclusive o `location.reload()` que conclui a restauração. Corrigido: a janela pode recarregar a si mesma; qualquer outro destino continua barrado (há teste para os dois lados).
2. **Restaurar tinha uma corrida no app desktop**: o registro restaurado recebia `savedAt = agora + 1`, e a gravação em disco disparada um instante antes podia ter o mesmo carimbo; no empate o disco vence e a restauração se perderia. Agora `restoreSnapshot()` carimba depois de todas as gravações pendentes e grava o registro restaurado também no `projeto.json` antes de recarregar. O estado anterior também vai para `snapshots/` no disco.
3. Erro meu, pego pelo teste: plural "3 cartãoões" na lista de instantâneos.
4. O primeiro instantâneo de uma instalação nova é o do cartão em branco de boas-vindas (o instantâneo é feito na primeira gravação). Não é erro, mas a lista mostra uma linha "0 cartões". Deixei como está.

**Testes**: **34 de 34**.

- `tests/menu.test.cjs` (+3): itens e atalhos do menu, teclado, backup e importar pelo menu; lixeira (lista, devolver ao mesmo lugar, atalhos bloqueados com a janela aberta) e `?`; instantâneos (confirmar, cancelar, restaurar, estado anterior guardado).
- `tests/electron.test.cjs` (+1 e 1 ampliado): restaurar pelo menu muda a tela **e** o `projeto.json`; a janela não navega para fora do app.
- Screenshots do menu, da lixeira e dos atalhos conferidos a olho.

**Não verificado**

- Instantâneos com muitos itens (20+): a lista rola, mas só vi com 1 ou 2.
- Os instantâneos da pasta `snapshots/` do disco **não** aparecem na lista; ela mostra os do IndexedDB (que são feitos junto). Se o perfil do Chromium for apagado, os do disco só se recuperam à mão. Fora do escopo; ver "Fora do escopo" no fim.
