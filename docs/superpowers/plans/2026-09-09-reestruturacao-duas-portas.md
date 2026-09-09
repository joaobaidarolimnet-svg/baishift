# Reestruturação — duas portas

**Data:** 2026-09-09 · **Base:** conceito v3 + protótipo aprovado pelo João

## Decisões

1. **Duas portas** no hub: *Provedores de internet* e *Baishift +1%*.
2. **Painéis sob medida** deixam de ser página de segmentos (clínica, transporte,
   distribuição). Viram o **Painel do provedor** — indicadores do provedor, dentro
   da porta de provedores. Os três painéis passam a ser três **áreas**: comercial,
   financeiro e campo.
3. **Tela inicial mais tecnológica**: navy escuro com o fluxo de dados animado
   (`dataPath()`, que o site já tem) atrás das duas portas.

## Mapa novo

| Endereço | O que fica lá |
|---|---|
| `/` | Hub navy com fluxo animado, duas portas, quem faz, honestidade, contato |
| `/provedores` | Consultoria: diagnóstico, processos, modelos, serve/não serve, FAQ |
| `/provedores/software` | Catálogo de software para provedor |
| `/provedores/software/<slug>` | Página de cada produto (painel, totem, central, SVA) |
| `/diagnostico` | Landing própria da isca gratuita |
| `/apps` | Linha **+1%**, com filtro por categoria |
| `/apps/<slug>` | Página de cada aplicativo |

Redirects 301: `/dashboards` → `/provedores/software/painel` · `/outros/<slug>` → `/apps/<slug>` (já existe).

## Fases

1. **Hub** — duas portas, navy, `dataPath()` animado. Esquema `hub.portas` 3 → 2.
2. **Painel do provedor** — os três painéis viram comercial / financeiro / campo;
   a seção `paineis` do JSON vira `painel` com `areas`.
3. **Catálogo de software** — `/provedores/software` e as páginas de produto;
   novo bloco `software` no JSON, com `ativo` por produto.
4. **`/apps` como linha +1%** — categoria por aplicativo e filtro na página.
5. **`/diagnostico`** — landing própria a partir de `diagnostico.oferta`.
6. **Painel do gestor, testes, docs e deploy.**

## Regras que não mudam

- `conteudo/site.json` é a fonte da verdade; nada de editar HTML à mão.
- Tudo que entra no HTML passa por `h()` ou `marcar()`.
- Sem framework, sem build, sem dependência externa além das fontes.
- `npm test` verde ao fim de cada fase.
