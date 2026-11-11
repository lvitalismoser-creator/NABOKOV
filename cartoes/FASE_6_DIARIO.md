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

## Bloco 3 — janela "Exportar", modelos, TXT e Markdown

**O que foi feito**

- **`src/export.mjs`** (novo, puro: sem DOM nem Electron, testável direto no Node). O caminho é sempre: peças da ordem → `buildDoc()` → documento intermediário (`{ title, blocks }`) → um renderizador por formato. Os próximos formatos (DOCX, ODT, PDF) só acrescentam renderizadores.
- **Janela "Exportar"** (menu ≡ → Exportar…, ou `Ctrl+E`), na mesma `#sheet`, em versão larga:
  - **Ordem:** cada ordem salva (a mais recente primeiro), a ordem em teste (se houver) e "a mesa como está". Vem escolhida a ordem aberta no organizador; sem nenhuma, a mesa.
  - **Modelo:** texto corrido / uma seção por cartão / fichas completas.
  - **Formato:** neste bloco, Texto (.txt) e Markdown (.md).
  - **Pré-visualização** dos primeiros 14 blocos, numa "folha" à direita.
  - Rodapé com a contagem ("2 cartões · 1 de lado fica de fora") e o botão "exportar".
  - O último modelo e formato usados ficam lembrados (`localStorage` `cartoes.ui.exportar`).
- **Salvar:** no app desktop, pelo "Salvar como" do sistema (IPC novo `export:save` em `electron/main.cjs`, ponte `cartoesDisk.exportFile` no `preload.cjs`); o aviso final tem "mostrar na pasta" (`export:reveal`). No navegador, vira download.

**Os três modelos**

| Modelo | O que sai |
|---|---|
| texto corrido | Só os parágrafos, um depois do outro, sem marca de onde termina um cartão. |
| uma seção por cartão | Cada peça (cartão ou grupo) é uma seção; entre elas, `* * *` centralizado. |
| fichas completas | Título (nome da ordem), nota geral da ordem, e por cartão: "N · Categoria", o texto e a nota daquele ponto da ordem. |

**Decisões e motivos**

- **"A mesa como está" aparece sempre**, não só "enquanto não houver ordem salva" (texto do plano). Custa uma linha e evita ter de criar uma ordem só para exportar. Reavaliar se o dono preferir esconder.
- **A ordem em teste também pode ser exportada.** É o que o usuário está vendo no organizador naquele momento.
- **No modelo "por seção", o grupo é uma seção só.** No organizador a peça é a unidade; quem quiser cada cartão separado usa "separar o grupo nesta ordem".
- **Parágrafos vazios e cartões vazios não saem** em nenhum modelo.
- **Cartões guardados na gaveta saem se estiverem na ordem** (igual ao organizador); na opção "mesa" não saem, porque não estão na mesa.
- **`.txt` não tem negrito nem itálico** (texto puro não tem como). O plano dizia "preservados em todos"; na janela o formato avisa "sem negrito nem itálico". Sai em UTF-8 com BOM e quebras CRLF, para o Bloco de Notas do Windows acertar os acentos.
- **`.md` escapa o que pareceria marcação** (`*`, `_`, `#` no início da linha, `<`…), para o texto do autor chegar igual.
- **`Ctrl+E`** para exportar; `Ctrl+S` continua sendo o backup.
- **Exportar nunca altera nada**: não mexe na mesa nem nas ordens.
- **Segurança da ponte:** o processo principal só grava no caminho que o usuário escolheu no diálogo; recusa extensão fora de docx/odt/pdf/txt/md e dados que não sejam bytes. "Mostrar na pasta" só vale para o último arquivo exportado.

**Testes**: **42 de 42**.

- `tests/export.test.cjs` (novo, 7):
  - `export.mjs` no Node: os três modelos; `.txt` (BOM, CRLF, texto na ordem); `.md` (negrito/itálico, escapes, espaços nas pontas); HTML da pré-visualização sempre escapado.
  - Janela no navegador: sem ordem usa a mesa; baixa `.txt` e `.md` e confere o conteúdo byte a byte; ordem salva vem escolhida, o de lado fica de fora, fichas levam as notas; mesa vazia só avisa.
- `tests/electron.test.cjs` (+1): com o diálogo respondido pelo teste, o arquivo aparece no caminho escolhido com o conteúdo certo; cancelar não grava e mantém a janela; a ponte recusa `.exe` e dados que não são bytes.
- Screenshot da janela conferido a olho.

**Problemas**

- Erro meu no teste: `TextDecoder` remove o BOM por padrão, e o teste cortava a primeira letra. Corrigido no teste (o arquivo estava certo).

**Não verificado**

- O "Salvar como" **de verdade** (o diálogo nativo do Windows): o teste troca o diálogo por uma resposta pronta, porque não há como clicar nele. O caminho depois do diálogo é o real.
- "Mostrar na pasta" (abre o Explorer): não testado.
- Abrir o `.txt` no Bloco de Notas do Windows.
- Gravar por cima de um arquivo aberto no Word (o código devolve o aviso "está aberto em outro programa?", mas não reproduzi o erro real).

## Bloco 4 — DOCX e ODT, gerados à mão

**O que foi feito**

- **`src/zip.mjs`** (novo, ~60 linhas): ZIP sem compressão ("stored") com CRC-32 próprio. Sem dependência.
- **`toDocx()` e `toOdt()`** em `src/export.mjs`, a partir do mesmo documento intermediário dos outros formatos.
  - **`.docx`** (6 partes): `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`, `docProps/core.xml` (título e data).
  - **`.odt`** (5 partes): `mimetype` (primeiro, sem compressão, sem campo extra), `content.xml`, `styles.xml`, `meta.xml`, `META-INF/manifest.xml`.
- Página A4 com margens de 2,5 cm, fonte Georgia 12, idioma pt-BR.
- Estilos de parágrafo com nome, para o autor poder mudar tudo de uma vez no editor: Normal/Standard, Title, Subtitle (nota geral da ordem), Heading 2 (cabeçalho de ficha; aparece no painel de navegação), Separador (`* * *` centralizado) e Nota.
- Negrito e itálico preservados nos dois (no ODT, estilos de texto T1/T2/T3).
- A janela "Exportar" agora oferece Word (.docx), LibreOffice (.odt), Texto e Markdown; o `.docx` é o primeiro da lista.

**Decisões e motivos**

- **Sem compressão.** É o que o plano previa; o arquivo fica maior (texto puro em XML), mas um romance inteiro não passa de poucos MB e o código fica pequeno e conferível.
- **Georgia só para o alfabeto latino** no `.docx`. Na primeira versão eu fixava a fonte também para outros sistemas de escrita, e o LibreOffice deixou de mostrar caracteres japoneses de um teste; tirei.
- **Espaços no ODT:** o formato engole espaços repetidos e o espaço inicial do parágrafo. Cada um vira `<text:s/>`, e tabulação vira `<text:tab/>`, para o texto chegar igual ao digitado.
- **Caracteres de controle** (que tornam um XML inválido e fariam o Word recusar o arquivo) viram espaço.
- **Nota geral da ordem com várias linhas** vira um parágrafo por linha.
- Datas dos metadados são a hora da exportação.

**Testes**: **47 de 47** (nenhum pulado neste contêiner).

- `tests/export.test.cjs` (+5):
  - `.docx`: pacote íntegro, partes declaradas e ligadas, parágrafos na ordem com estilo certo, negrito/itálico por trecho, todo estilo usado existe.
  - `.odt`: `mimetype` no lugar exato, manifesto completo, parágrafos, estilos, espaços repetidos e tabulação.
  - Caracteres inválidos não passam; documento vazio ainda é um arquivo válido.
  - **LibreOffice de verdade:** se `soffice` existir na máquina, o teste abre o `.docx` e o `.odt` nele, converte para texto e compara com o esperado. Sem LibreOffice, o teste é **pulado** (aparece como "skipped").
  - Janela no navegador: baixa `.docx` e `.odt`, confere o pacote e passa cada XML pelo analisador de XML do navegador.
- O leitor de ZIP dos testes foi escrito à parte do gerador (lê pelo diretório central, confere cabeçalhos e recalcula o CRC por outro algoritmo), para um erro no gerador não se esconder num leitor "irmão".

**Verificação manual nesta sessão** (fora do `npm test`)

| Com quê | Resultado |
|---|---|
| `unzip -t` e `zipfile` do Python | os 6 arquivos (3 modelos × 2 formatos) sem erro |
| `xml.dom.minidom` | todas as partes XML bem formadas |
| LibreOffice 24 (headless) → texto | `.docx` e `.odt` abertos; texto idêntico, espaços e tab preservados |
| LibreOffice → PDF → imagem | vi a página: título, nota geral, cabeçalhos de ficha, negrito/itálico, `* * *` centralizado, nota recuada |
| pandoc | negrito, itálico e cabeçalhos reconhecidos nos dois formatos |
| python-docx | estilos por nome (Title, Subtitle, Heading 2, Normal), trechos em negrito/itálico, título nos metadados, página de 21 cm |

**Não verificado**

- **Microsoft Word** (nenhuma versão) e **Word Online / Google Docs**: não há como abrir daqui. O `.docx` segue a estrutura mínima usual e passou por três leitores independentes, mas o Word é mais exigente que todos eles. **É a principal verificação manual que falta.**
- LibreOffice **no Windows** (aqui foi no Linux).
- A fonte Georgia não existe neste contêiner: vi o layout com uma fonte substituta.
- Documento muito grande (centenas de cartões): não medi tempo nem tamanho.
