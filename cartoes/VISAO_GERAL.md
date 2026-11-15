# Cartões — visão geral

Editor para escritores, inspirado no método de fichas de Vladimir Nabokov: primeiro **cartões de livre manipulação numa mesa**, depois o **texto corrido**.

> **Situação:** protótipo exploratório (versão 1.4.1). Serve para descobrir o que o programa deve ser e validar a ideia no uso. O programa definitivo será desenvolvido do zero depois, com outra estrutura. As decisões de produto e o que se aprender aqui seguem adiante; o código, não.

## A ideia

Reduzir ao máximo o esforço para escrever as primeiras palavras. Quem usa nunca deve sentir limite nem obrigação de escrever muito. Por isso:

- cada ideia cabe num **cartão** (como uma ficha de papel);
- os cartões ficam soltos numa **mesa**, onde se arrastam, agrupam e reordenam;
- só depois, com os cartões numa ordem, se **exporta o texto corrido**.

## Como funciona, por cima

### O cartão
- Tamanho fixo, na proporção de uma ficha. Há três tamanhos (**P, M, G**), mas dentro de cada um ele nunca cresce.
- Se o texto passa do que cabe, ele rola dentro do cartão e aparecem "folhas" atrás, como uma pilha.
- Visual de papel: linha vermelha no topo, pauta azul, serifa. Sem barra de ferramentas, sem título, sem campos obrigatórios.
- Cartão novo já nasce com o cursor piscando. Cartão vazio some sozinho.
- Formatação só por markdown (`**negrito**`, `*itálico*`) ou `Ctrl+B` / `Ctrl+I`.
- **Categorias** (cena, nota, lugar) dão cor à faixa do cartão. Os controles aparecem só ao passar o mouse.

### A mesa
- Mesa infinita: arraste o fundo para mover, `Ctrl`+roda para dar zoom (20% a 200%).
- **Grupos por ímã:** cartões aproximados se agrupam.
- **Gaveta:** guarda cartões fora da mesa, sem apagá-los.
- **Seleção múltipla:** `Shift`+arrastar no fundo desenha uma caixa; mover, mudar tamanho, guardar ou excluir em lote.
- **Modo mapa:** com zoom abaixo de 45% aparece só o começo de cada cartão, em letra grande, com a cor da categoria.
- **Lixeira:** guarda os últimos 50 excluídos; a tecla `T` reabre o último.

### O organizador (botão "organizar" ou tecla `E`)
Testa **ordens de leitura** sem mexer na mesa:
- leitura por setas, mover peças, pôr de lado, embaralhar para ver outras sequências;
- notas por cartão;
- várias ordens com nome, para comparar versões;
- "dispor na mesa" arruma os cartões em fileiras na ordem escolhida (com desfazer).

### Exportar (`Ctrl+E`)
Escolhe a ordem, o modelo (corrido, por seção ou ficha) e o formato (**PDF, TXT ou MD**), com prévia do documento inteiro.

### Salvamento (a regra é "nunca perder texto")
- Salva sozinho, alguns instantes após cada edição. Um **pontinho** no canto superior direito mostra o estado (cinza = salvo, piscando = salvando, vermelho = falhou).
- No app desktop grava em disco (`projeto.json`, com cópia `.bak` e instantâneos). No navegador usa IndexedDB e localStorage.
- **Instantâneos** automáticos, restauráveis pelo menu ≡.
- **Backup `.json`** (`Ctrl+S`) e importação (`Ctrl+O`).
- Arquivo corrompido nunca é sobrescrito: é separado e o app recupera a cópia anterior.

## Como usar

### Opção 1 — Instalador do Windows (app desktop)
Quem tem o projeto gera o instalador, na pasta `cartoes/`:

```bash
npm install
npm run dist
```

Resultado: `dist/Cartoes-Setup-1.4.1.exe`. Instala com um clique, por usuário, sem precisar de administrador.

- Só Windows 64 bits.
- O instalador não é assinado: o Windows SmartScreen avisa na primeira vez ("Mais informações → Executar assim mesmo").
- Os dados ficam no computador de quem usa. Desinstalar não apaga o projeto.
- Para enviar a outra pessoa, use um link de nuvem (o arquivo tem cerca de 121 MB; anexos `.exe` costumam ser bloqueados por e-mail).

### Opção 2 — Navegador (qualquer sistema)
Abra o arquivo `index.html` (já gerado, um único arquivo, funciona offline). Serve em Windows, Mac e Linux. Os dados ficam no navegador usado.

- `index.html#demo` carrega cartões de exemplo, em armazenamento separado dos dados reais.

### Opção 3 — Rodar a partir do código

```bash
cd cartoes
npm install
npm start      # abre o app desktop
npm test       # 73 testes automatizados
```

## Atalhos principais

| Ação | Atalho |
|---|---|
| Novo cartão | duplo clique no fundo, ou `N` |
| Próximo cartão ao lado | `Ctrl+Enter` |
| Organizador | `E` |
| Ver todos os cartões / voltar a 100% | `Ctrl+0` / `Ctrl+1` |
| Zoom | `Ctrl`+roda, `Ctrl +`, `Ctrl -` |
| Tamanho P / M / G | `Alt+1` / `Alt+2` / `Alt+3` |
| Exportar | `Ctrl+E` |
| Backup / importar | `Ctrl+S` / `Ctrl+O` |
| Reabrir último excluído | `T` |
| Desfazer na mesa | `Ctrl+Z` (sem cursor num cartão) |
| Lista completa de atalhos | `F1` |

## Como foi feito (resumo técnico)

- App desktop em **Electron**; editor de texto com **ProseMirror**; JavaScript puro, sem framework.
- `src/` tem a lógica (`main.js`), a exportação (`export.js`) e o visual (`style.css`). `build.mjs` empacota tudo em um único `index.html`.
- Interface em português (pt-BR).

## Estado e o que falta

- Fases 1 a 5 concluídas (cartões, salvamento, organizador).
- Fases 6 a 8 (menu e exportação, mesa infinita com zoom/seleção/mapa, revisão de interface) **feitas, aguardando conferência do dono** no instalador 1.4.1.
- **Validação:** 5 sessões de escrita em dias diferentes, ao longo de 2 semanas, registradas no diário de uso (`docs/USO.md`).
- **Fora do escopo deste protótipo** (ficam para o programa real): identificar texto e padrões, indexar cartões a documentos, sugerir cartões para relembrar com base no que se escreve, exportar DOCX/ODT, assinatura e ícone do instalador.

## Documentação detalhada

- `CLAUDE.md`: decisões, conceito do cartão e regras de trabalho
- `docs/PLANO_AJUSTES_ABORDAGEM.md` e `docs/PLANO_FASES_5_A_8.md`: planos
- `docs/USO.md`: diário de uso
- `docs/HANDOFF_*.md`: registros de sessões anteriores
