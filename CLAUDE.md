# Cartões — editor para escritores

Programa desktop para escritores: editor de texto com organização integrada, inspirado no método de fichas de Vladimir Nabokov. Cartões de livre manipulação num quadro; depois, o texto corrido.

**Princípio central:** reduzir ao máximo a carga cognitiva para escrever as primeiras palavras. O usuário nunca deve sentir limite nem "obrigação" de escrever muito.

## Estado atual

Protótipo web de arquivo único, só a interface de criação de cartões. Ainda não é app desktop.

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
- **Dados:** `{ id, x, y, z, r, doc }` por cartão (`doc` = JSON do ProseMirror), salvo em `localStorage` (`cartoes.v1`) com debounce.
- Atalhos: duplo clique no fundo ou `N` cria cartão; `Ctrl/⌘+Enter` cria o próximo ao lado; `Esc` tira o foco; `Backspace` em cartão vazio o apaga. (`Ctrl+N` é reservado pelo navegador; resolver no app desktop.)
- Interface em português (pt-BR).

## Próximos passos (sugeridos, nesta ordem)

1. **Empacotar como app desktop** (Electron é o caminho mais rápido; Tauri depois, se quiser leve). Trocar `localStorage` por arquivo `.json` do projeto; liberar `Ctrl+N`.
2. **Pan/zoom do quadro** (hoje é uma viewport fixa) e posições relativas ao quadro, não à janela.
3. **Organização:** agrupar/ordenar cartões, cor ou marcador discreto, busca.
4. **Do cartão ao texto:** montar um editor de texto corrido a partir de uma sequência de cartões.
5. **Exportar/importar** projeto.

## Regras para trabalhar aqui

- Fazer um bloco por vez; commit ao fim de cada um.
- Sem dependências novas além das já listadas sem perguntar.
- Antes de mexer no visual do cartão, reler "Conceito do cartão". Se uma mudança adicionar elemento visível por padrão, provavelmente está errada.
- Validar visualmente: Playwright já está disponível (`require('playwright')`); tirar screenshot do quadro com `#demo` e conferir pilha, fade e pauta (a pauta fica serrilhada em gradientes com cantos duros em cartões rotacionados; manter bordas suaves).
- Não editar `index.html` diretamente; sempre rebuildar.
