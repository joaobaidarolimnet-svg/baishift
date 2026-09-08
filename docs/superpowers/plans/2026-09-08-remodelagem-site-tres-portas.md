# Remodelagem do site — três portas

**Data:** 2026-09-08 · **Base:** `nova versao site` (arquivo enviado pelo João)

## O que muda

Hoje o site é **uma página só** com tudo dentro (Diagnóstico, Processos, Dashboard,
Modelos, Serve/não serve, FAQ, Contato) mais as landings em `/outros/*`.

Passa a ser um **hub com três portas**:

| Endereço | O que fica lá |
|---|---|
| `/` | Hub novo: hero, as três portas, "quem somos", "honestidade poupa reunião", contato |
| `/provedores` | **Todo o conteúdo de hoje** — diagnóstico, processos, dashboard do provedor, modelos, serve/não serve, FAQ, formulário |
| `/dashboards` | Painéis sob medida: 3 painéis demonstrativos por segmento (clínica, transporte, distribuição) |
| `/apps` | Índice dos aplicativos; cada um em `/apps/<slug>` (`/outros/<slug>` redireciona 301) |

## Visual

Passa a valer em **todo o site** a linguagem do arquivo novo, que é a paleta oficial da marca:

- navy `#142F7A` · navy fundo `#0C1B4A` · linha `#2A4189` · laranja `#EF562E` · papel `#F4F5F9`
- tipografia **Archivo** (o `assets/marca/tokens.css` é atualizado junto, para kit e site não se contradizerem)
- largura de leitura menor, cartões `.door`, seções em navy alternando com papel

Os gráficos SVG e as animações que já existem **continuam** — são reestilizados para a paleta nova
e passam a morar dentro de `/provedores` e `/dashboards`.

## Fases

1. **Base visual + hub** — tokens/CSS novos, `templates/comum.js` (barra, rodapé, head), `templates/hub.js`, seção `hub` no JSON e no esquema. Resultado: `/` com a cara nova.
2. **`/provedores`** — o `templates/index.js` de hoje vira `templates/provedores.js`, adaptado ao visual novo, com todos os gráficos preservados.
3. **`/dashboards`** — template novo + 3 painéis demonstrativos por segmento no motor de gráficos.
4. **`/apps`** — índice dos aplicativos, produtos migram para `/apps/<slug>`, redirect de `/outros/*` no `server.js`.
5. **Painel do gestor, testes e docs** — telas novas em `/gestor`, pré-visualização por página, testes, sitemap, 404 e README.

## Regras que não mudam

- `conteudo/site.json` continua sendo a fonte da verdade; nada de editar HTML à mão.
- Tudo que entra no HTML passa por `h()` ou `marcar()`.
- Sem framework, sem build, sem dependência externa além das fontes do Google.
- `npm test` verde ao fim de cada fase.
