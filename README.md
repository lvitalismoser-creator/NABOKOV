# NABOKOV

Protótipo exploratório de um editor para escritores, inspirado no método de fichas de Vladimir Nabokov: cartões de livre manipulação numa mesa, depois o texto corrido.

O projeto fica em [`cartoes/`](cartoes/). Comece por [`cartoes/CLAUDE.md`](cartoes/CLAUDE.md): ele explica o que o projeto é, o estado atual e aponta para os planos e os registros de sessão em `cartoes/docs/`.

```bash
cd cartoes
npm install
npm start       # abre o app
npm test        # 73 testes
npm run dist    # gera o instalador do Windows em dist/
```

## Instalador do Windows

O jeito mais simples é baixar do GitHub, sem instalar nada: aba **Actions** → fluxo "Instalador do Windows" → execução mais recente (verde) → **Artifacts** → `Cartoes-Setup`. Vem um `.zip` com o `Cartoes-Setup-<versão>.exe` (fica 30 dias). Para gerar uma execução nova à mão: "Run workflow" na mesma página.

Alternativa local, no Windows: `npm run dist` na pasta `cartoes/` (detalhes em `cartoes/CLAUDE.md`, seção "Empacotar").
