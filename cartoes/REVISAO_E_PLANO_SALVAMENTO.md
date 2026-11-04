# Revisão do código e plano de salvamento automático

Escopo revisado: `src/main.js`, `src/template.html`, `src/style.css` (só pontos relevantes), `build.mjs`, `package.json`, `CLAUDE.md`.
Verificado: `index.html` está em dia com o build (idêntico a um rebuild limpo).

## 1. Falhas encontradas

### Críticas (perda de dados)

| # | Onde | Problema |
|---|------|----------|
| C1 | `demo()` (main.js ~691–712) | `#demo` termina com `flush()`, que **sobrescreve o `localStorage` real** com os cartões de exemplo. Abrir `index.html#demo` apaga o trabalho do usuário. |
| C2 | `load()` / início (~82, ~722) | Se o JSON estiver corrompido, `load()` devolve `[]`; o primeiro `save()` seguinte grava por cima e destrói o original. Não há cópia de segurança. |
| C3 | início (~724) | `saved.forEach(createCard)` não tem `try/catch` por cartão. Um único `doc` inválido (`schema.nodeFromJSON` lança erro) interrompe o carregamento. O próximo `flush` grava só os cartões que chegaram a carregar, e os outros se perdem. Também não se verifica se `saved` é um array. |
| C4 | `flush()` (~77) | `catch {}` engole falhas (cota cheia, modo privado, armazenamento bloqueado). O usuário continua digitando sem saber que nada está sendo salvo. |
| C5 | `flush` só em `beforeunload` | `beforeunload` não é confiável (crash, fechamento forçado, mobile, Electron). Faltam `visibilitychange` e `pagehide`. Há ainda uma janela de 250 ms de debounce sem proteção. |
| C6 | `removeCard` / `showUndo` | O desfazer guarda **um único** cartão. Excluir um segundo cartão, ou aparecer o toast `say()` (ex.: "Escreva algo antes de guardar"), torna a exclusão anterior irrecuperável. Não existe lixeira. |
| C7 | várias abas | Duas abas abertas sobrescrevem uma à outra (o último a gravar vence). Não há evento `storage` nem lock. |

### Inconsistências de escopo e execução

- **I1. Coordenadas da janela.** x e y são salvos relativos à janela (já anotado no CLAUDE.md). Abrir em uma janela menor deixa cartões fora da tela, sem pan para alcançá-los. O clamp só vale durante o arrasto. Falta um "trazer para a vista" ao carregar e ao redimensionar.
- **I2. Grupo parcialmente guardado.** Guardar um cartão de um grupo mantém o `g` dele. A gaveta o mostra como unidade do grupo, e restaurar o devolve para uma posição distante do grupo, que continua na mesa.
- **I3. `cleanGroups` conta cartões guardados** junto com os da mesa, enquanto `renderGroups` conta só os da mesa. A contagem diverge (grupo "fantasma" com 1 cartão na mesa).
- **I4. Sem versão de esquema.** A chave `cartoes.v1` não tem campo `version` nem migração. Os campos `g`, `cat`, `stashed` e `sa` não são validados ao carregar (NaN, tipos errados, `cat` desconhecida).
- **I5. `uid()` com `Math.random`.** Em uma colisão, `cards.set` sobrescreve em silêncio. Usar `crypto.randomUUID()`.
- **I6. `shuffled`.** Com 2 unidades, 12 tentativas podem repetir a mesma ordem (raro). A assinatura só compara `u[0].id`.
- **I7. Falta `undoInputRule`.** O Backspace logo após uma regra markdown (`**x**`) não desfaz a conversão.
- **I8. Zona de foco.** O `Backspace` apaga o cartão sem desfazer quando ele só tem espaços em branco (`isEmpty` usa `trim`).

### Build e documentação

- **B1.** `package.json` sem script `build`; `main: "index.js"` não existe; `test` é um placeholder.
- **B2.** `build.mjs` usa caminhos relativos ao diretório atual (falha se rodado de outra pasta) e não confere se os marcadores `/*__CSS__*/` e `/*__JS__*/` existem. Só o `</script` do JS é escapado; o CSS não escapa `</style`.
- **B3.** `CLAUDE.md` está desatualizado. O modelo de dados lista `{id,x,y,z,r,doc}` e omite `g, cat, stashed, sa`. Categorias, grupos, gaveta e embaralhar não aparecem em lugar nenhum.
- **B4.** Não há testes nem validação automatizada.

## 2. Plano de salvamento automático

Meta: **nunca perder uma palavra**, sem o usuário pensar em "salvar". Coerente com o princípio do projeto: nenhum botão, nenhum diálogo.

### Pesquisa: onde guardar

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| `localStorage` (atual) | Trivial | ~5 MiB, síncrono, pode ser apagado pelo navegador, ligado a uma origem | Só como espelho temporário |
| IndexedDB | Sem limite fixo, assíncrono, transacional | Pode ser despejado sem `persist()`, preso ao navegador | Bom no protótipo web |
| File System Access API / OPFS | Arquivo real (só Chromium); OPFS é privado, mas dentro da cota | Exige permissão; suporte desigual | Alternativa web |
| **JSON em arquivo no disco (Electron/Tauri)** | Legível, portátil, o usuário é dono, backup fácil | Escrita precisa ser atômica | **Recomendado** |
| SQLite | Busca e consultas rápidas | Binário opaco; exportar pode perder informação | Só como índice reconstruível |
| Pasta de arquivos Markdown (estilo Obsidian) | Aberto, durável | Perde posição, grupos e categorias, a menos que haja metadados | Formato de exportação |

Padrão que a pesquisa aponta para apps de escrita local-first: **arquivos simples como fonte da verdade e índice reconstruível para busca**, nunca um banco guardando a única cópia.

Boas práticas confirmadas:
- Escrever num arquivo temporário e renomear (gravação atômica). No Windows, o `rename` pode falhar com EPERM/EBUSY (antivírus, bloqueios), então precisa de retentativa.
- Distinguir "arquivo ausente" (primeira execução) de "arquivo ilegível" (erro que se mostra e **nunca** se sobrescreve com `[]`).
- No navegador, chamar `navigator.storage.persist()` e monitorar `navigator.storage.estimate()`.

### Decisão proposta

1. **Agora (protótipo web):** IndexedDB como armazenamento principal, `localStorage` como espelho, `persist()` ativo. Mais exportar e importar `.json`.
2. **Com o app desktop (passo 1 do CLAUDE.md):** um arquivo `projeto.cartoes` (JSON) na pasta do usuário, com gravação atômica, `.bak` rotativo e histórico de instantâneos.

### Formato do arquivo

```json
{
  "version": 2,
  "savedAt": "2026-11-03T12:00:00Z",
  "cards": [{ "id": "uuid", "x": 0, "y": 0, "z": 1, "r": 0.2,
              "g": null, "cat": "cena", "stashed": false, "sa": 0, "doc": {} }],
  "trash": []
}
```

Inclui `version` para migração e `trash` para a lixeira (resolve C6).

### Fases

**Fase 0 — Estancar a perda (pequena, fazer primeiro)**
1. `demo()` não chama mais `flush()` e não grava; ou usa uma chave separada (`cartoes.demo`). (C1)
2. `load()` valida: array, campos e tipos. Cada cartão carrega dentro de `try/catch`; os inválidos vão para `cartoes.quarentena` em vez de sumir. (C2, C3, I4)
3. Se a leitura falhar, **bloquear o salvamento** e avisar. Antes de qualquer escrita, copiar o valor lido para `cartoes.bak`. (C2)
4. `flush()` retorna sucesso ou falha. Em caso de falha, mostrar um aviso discreto e permanente ("não consegui salvar") e oferecer exportar. (C4)
5. Disparar o flush em `visibilitychange` (hidden), `pagehide` e `beforeunload`. (C5)
6. `crypto.randomUUID()` no lugar de `uid()`. (I5)

**Fase 1 — Salvamento robusto no navegador**
1. Camada `storage.js` com interface `load()`, `save(snapshot)` e `onExternalChange`. O resto do código não conhece o destino.
2. IndexedDB como destino principal, `localStorage` como espelho, `navigator.storage.persist()`.
3. Salvamento incremental: marcar só os cartões modificados (`dirty`), com debounce de ~400 ms e um teto máximo de 3 s para uma sequência contínua de digitação.
4. Sincronia entre abas com `BroadcastChannel` e lock (`navigator.locks`): só uma aba grava. (C7)
5. Indicador mínimo de estado, só quando algo está errado (respeita "zero poluição visual").

**Fase 2 — Histórico e lixeira**
1. `trash` persistente, com N exclusões recuperáveis, em vez do desfazer único. (C6)
2. Instantâneos periódicos (por exemplo, a cada 5 min de atividade e na abertura), mantendo os últimos ~20 e um por dia dos últimos 7.
3. Exportar e importar `.json`, usando `Blob` e `<a download>`.

**Fase 3 — Desktop (Electron)**
1. O processo principal é dono do disco. O renderer manda o snapshot por IPC. Pasta `userData/cartoes/`.
2. Escrita atômica: `projeto.json.tmp`, `fsync`, `rename`, com retentativa para EPERM/EBUSY no Windows. Antes de sobrescrever, `projeto.json` vira `projeto.json.bak`.
3. Pasta de instantâneos com rotação. Trava de arquivo para evitar duas instâncias.
4. Leitura: ausente = primeira execução; ilegível = tentar `.bak`, depois o último instantâneo, e só então avisar. Nunca iniciar vazio por cima.
5. Migração do `localStorage`/IndexedDB para o arquivo na primeira abertura, guardando a origem até o usuário confirmar.
6. Exportação adicional em Markdown (uma pasta por grupo) para portabilidade.

**Fase 4 — Teste**
1. Testes automatizados de `load` (JSON corrompido, `doc` inválido, versão antiga), do round-trip salvar/carregar e da gravação atômica (matar o processo no meio).
2. Playwright (já disponível) para: digitar, recarregar, comparar; abrir `#demo` e conferir que os dados reais ficam intactos.

### Ordem de execução sugerida
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 (os testes da Fase 4 podem entrar já com a Fase 0).

### Fora do salvamento, mas aproveitar a passagem
Corrigir I1 (trazer cartões para a vista), I2/I3 (grupos e gaveta), B1–B3, e atualizar o `CLAUDE.md` com o modelo de dados real.

## Fontes
- [Escrita atômica em arquivos](https://flaviocopes.com/courses/build-macos-apps-swiftui/save-codable-data-atomically/)
- [Issue sobre EPERM/EBUSY no rename (electron-json-storage)](https://github.com/electron-userland/electron-json-storage/issues/125)
- [WHATWG Storage Standard](https://storage.spec.whatwg.org/)
- [File System Access API e cotas](https://fast.io/resources/file-system-access-api.md)
- [Obsidian vs Logseq](https://itsfoss.com/comparison/obsidian-vs-logseq/)
