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
