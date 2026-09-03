# Painel do gestor · Fase 1 — site gerado a partir do JSON

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `index.html`, `outros/*.html` e `sitemap.xml` serem gerados a partir de `conteudo/site.json`, com o site idêntico ao atual, mais o carrossel do início e os blocos livres das páginas de produto.

**Architecture:** `lib/conteudo.js` valida o JSON contra um esquema declarativo; `lib/html.js` escapa e aplica as marcações (`*em*`, `**negrito**`, `[link](url)`); `templates/*.js` são funções que devolvem o HTML de cada página; `lib/render.js` orquestra e grava os arquivos; `server.js` gera tudo ao subir. Sem dependências além do Node.

**Tech Stack:** Node ≥ 20 (CommonJS em `lib/` e `templates/`, ESM em `tools/`), `node:test`, HTML/CSS/JS puro no site.

Spec: `docs/superpowers/specs/2026-09-03-painel-gestor-design.md` (seções 3, 4, 5 e parte da 12). Diferença em relação à spec: os helpers de escape ficam em `lib/html.js` (e não em `render.js`) para `templates/` e `render.js` não dependerem um do outro em círculo.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `conteudo/site.json` (novo) | conteúdo editável, com os textos atuais do site |
| `lib/conteudo.js` (novo) | esquema, validação, normalização, `carregar()`, `mapearImagens()` |
| `lib/html.js` (novo) | `h()`, `marcar()`, `semMarcas()`, `urlImagem()`, `jsonEmbutido()` |
| `templates/comum.js` (novo) | `<head>`, barras de navegação, rodapé curto, SVG do WhatsApp, aviso de "gerado" |
| `templates/index.js` (novo) | página principal |
| `templates/produto.js` (novo) | landing page de produto |
| `lib/render.js` (novo) | `paginas()`, `sitemap()`, `gerarTudo()`, `escreverAtomico()` |
| `tools/build-site.mjs` (novo) | gera os arquivos a partir do JSON (substitui `tools/build-outros.mjs`, que é apagado) |
| `tools/build-single.mjs` (modificar) | caminhos absolutos dos assets |
| `assets/css/site.css` (modificar) | carrossel, início sem visual, capa e blocos de produto, ícone de produto |
| `assets/js/site.js` (modificar) | carrossel |
| `server.js` (modificar) | gera ao subir; não serve `lib/`, `templates/`, `gestor/`, `test/`, `docs/`, `dados/`, `conteudo/site.json`; cache longo para `conteudo/imagens/` |
| `package.json`, `.gitignore` (modificar) | scripts `build` e `test`; ignora `dados/` |
| `test/html.test.js`, `test/conteudo.test.js`, `test/render.test.js` (novos) | testes |
| `index.html`, `outros/*.html`, `sitemap.xml` | passam a ser gerados |

---

### Task 1: Conteúdo inicial em `conteudo/site.json`

**Files:**
- Create: `conteudo/site.json`

- [ ] **Step 1: Criar o arquivo com os textos atuais do site**

Os textos vêm de `index.html` e de `tools/build-outros.mjs`. `<em>` vira `*trecho*`.

```json
{
  "versao": 1,
  "atualizadoEm": "2026-09-02T00:00:00Z",
  "site": {
    "tituloAba": "Baishift — Gestão, processos e software para provedores de internet",
    "descricao": "Diagnóstico, consultoria de processos e dashboard para provedores de internet. Decisão com número, dentro do IXC, feito por quem opera um provedor.",
    "descricaoSocial": "O provedor decidindo com número, não com sensação. Diagnóstico, consultoria de processos e dashboard feitos por quem opera um provedor.",
    "whatsapp": "",
    "email": "contato@baishift.com.br",
    "cidade": "Rolim de Moura, RO",
    "notaRodape": "Os painéis, o fluxo e os resultados desta página usam dados ilustrativos de um provedor de porte médio, para demonstrar o formato das entregas."
  },
  "inicio": {
    "rotulo": "Diagnóstico · Processos · Dashboard",
    "titulo": "O provedor decidindo *com número*, não com sensação.",
    "subtitulo": "Três frentes, uma regra: primeiro os números aparecem, depois eles melhoram. Diagnóstico da operação, processos redesenhados dentro do IXC e o dashboard que a diretoria abre todo dia — feito por quem opera um provedor.",
    "botaoPrincipal": { "texto": "Começar pelo diagnóstico", "link": "#diagnostico" },
    "botaoSecundario": { "texto": "Ver o dashboard ao vivo", "link": "#dashboard" },
    "tags": ["Gestão em ISP", "IXC Soft", "Controladoria", "Dashboards", "Software sob medida"],
    "painelAtivo": true,
    "carrossel": { "intervalo": 6, "imagens": [] },
    "frentesResumo": [
      { "titulo": "Diagnóstico", "texto": "Onde a empresa está, para onde pode ir e quanto custa o caminho." },
      { "titulo": "Consultoria de processos", "texto": "O que existe, o que falta e o que perde dinheiro entre uma área e outra." },
      { "titulo": "Dashboard", "texto": "A visão geral do provedor, viva, no painel e no celular da diretoria." }
    ]
  },
  "diagnostico": {
    "rotulo": "Diagnóstico",
    "titulo": "Primeiro, a empresa como ela é. Depois, para onde ela vai.",
    "lead": "Toda operação tem dois resultados: o que a diretoria sente e o que o número mostra. O diagnóstico mede a distância entre os dois — e entrega o mapa para fechá-la.",
    "afirmacoes": [
      { "titulo": "Sensação não fecha caixa. *Número fecha.*", "texto": "O diagnóstico troca a impressão pela leitura real de carteira, caixa, campo e fiscal — direto do IXC, sem planilha paralela." },
      { "titulo": "O que não é medido *é adivinhado.*", "texto": "Cada indicador ausente é uma decisão tomada no escuro. Sai a lista dos que existem, dos que faltam e de quem responde por cada um." },
      { "titulo": "Saber onde está, *antes* de decidir para onde ir.", "texto": "O resultado é um plano priorizado por retorno, com cronograma e responsável. A direção deixa de ser opinião." }
    ],
    "oferta": {
      "titulo": "Diagnóstico de gestão",
      "selo": "sem compromisso",
      "medidas": [
        { "valor": "45 min", "texto": "de conversa" },
        { "valor": "2 semanas", "texto": "lendo os números do IXC" },
        { "valor": "8 entregas", "texto": "em um plano priorizado" }
      ],
      "tituloEntregas": "O que você recebe",
      "entregas": [
        "Mapa dos processos atuais no IXC",
        "Gargalos do pedido ao caixa, com valor",
        "Situação real do caixa e da carteira",
        "Indicadores disponíveis hoje e os que faltam",
        "Inconsistências fiscais e de faturamento",
        "Controles ausentes por setor",
        "Priorização das ações por retorno",
        "Plano com cronograma e responsável"
      ],
      "botao": "Agendar pelo WhatsApp",
      "alternativa": "ou envie uma mensagem"
    }
  },
  "processos": {
    "rotulo": "Consultoria de processos",
    "titulo": "O processo que o provedor jura que funciona, desenhado como ele acontece.",
    "lead": "Três perguntas por setor: como é hoje, o que ainda não existe e onde o volume para. O resultado é o processo escrito, parametrizado no IXC e treinado com a equipe.",
    "cartoes": [
      { "rotulo": "Processos atuais", "titulo": "Como acontece hoje", "texto": "Quem faz, em qual tela do IXC, em quanto tempo e o que fica fora do sistema. O mapa do que existe, sem julgamento.", "itens": ["Mapa por setor, do pedido ao caixa", "Tempo de ciclo medido em cada etapa", "O que ainda vive na planilha"] },
      { "rotulo": "Processos a desenvolver", "titulo": "O que ainda não existe", "texto": "Rotinas que a operação faz de cabeça e que precisam virar regra escrita, parametrizada e cobrada.", "itens": ["Régua de cobrança", "Alçadas e aprovações", "Calendário de fechamento"] },
      { "rotulo": "Processos a melhorar", "titulo": "Onde o volume para", "texto": "Etapas que existem, mas perdem tempo, contrato ou dinheiro entre uma área e outra.", "itens": ["Fila de instalação", "Cancelamento e retenção", "Faturamento dentro do ciclo"] }
    ],
    "entrega": "processo escrito, parametrizado no IXC e treinado com a equipe"
  },
  "dashboard": {
    "rotulo": "Dashboard",
    "titulo": "A visão geral do provedor, viva.",
    "lead": "Base, caixa, churn e campo direto do banco — no painel da diretoria e no celular. Passe o mouse em qualquer ponto para ver o número e troque o período para ver a mesma operação em outra escala.",
    "legendaCelular": "A pergunta da diretoria, no celular"
  },
  "modelos": {
    "rotulo": "Modelos de contratação",
    "titulo": "Escolha o formato que o provedor comporta.",
    "apoio": "Quatro formatos, um ponto de partida: o diagnóstico define escopo, prazo e valor de cada um.",
    "cartoes": [
      { "tag": "Escopo fechado", "titulo": "Projeto pontual", "texto": "Um gargalo específico, resolvido com começo, meio e fim.", "itens": ["Diagnóstico de gestão", "Redesenho de um processo", "Parametrização do IXC", "Construção do dashboard"], "paraQuem": "já sabe onde o processo trava." },
      { "tag": "Recorrente", "titulo": "Acompanhamento mensal", "texto": "O rito de decisão rodando todo mês, com a Baishift na mesa.", "itens": ["Fechamento do mês", "Indicadores por setor", "Reunião de resultado", "Cobrança do plano de ação"], "paraQuem": "quer o número virando decisão sem depender de ninguém de dentro." },
      { "tag": "Recorrente", "titulo": "Controladoria terceirizada", "texto": "O financeiro rodando com a Baishift, sem montar equipe interna.", "itens": ["Conciliação bancária", "Recebimentos e cobrança", "Pagamentos", "Relatórios gerenciais"], "paraQuem": "ainda fecha o mês na planilha paralela." },
      { "tag": "Sob medida", "titulo": "Software e automação", "texto": "A rotina manual que custa caro vira ferramenta integrada ao IXC.", "itens": ["Levantamento na operação", "Ferramenta desenvolvida", "Dados integrados", "Sustentação mensal"], "paraQuem": "já sabe qual rotina está engolindo horas." }
    ],
    "nota": "Escopo, prazo e valor são definidos a partir do diagnóstico · retorno em até dois dias úteis"
  },
  "perfil": {
    "rotulo": "Honestidade poupa reunião",
    "titulo": "Para quem serve — e para quem não serve.",
    "serveTitulo": "Serve bem",
    "serve": [
      "Provedor de 2 mil a 50 mil assinantes que já sente o processo travar",
      "Diretoria que quer decidir com número, não com sensação",
      "Quem usa IXC Soft e sabe que usa uma fração do que ele faz",
      "Quem quer parar de fechar o mês na planilha paralela"
    ],
    "naoServeTitulo": "Não serve",
    "naoServe": [
      "Quem quer trocar de ERP em trinta dias",
      "Quem procura o fornecedor mais barato da praça",
      "Quem quer dashboard bonito sem arrumar o processo antes",
      "Quem não vai liberar acesso aos próprios dados"
    ]
  },
  "faq": {
    "rotulo": "Perguntas frequentes",
    "titulo": "O que todo provedor pergunta antes de começar.",
    "itens": [
      { "pergunta": "Quanto tempo leva o diagnóstico?", "resposta": "Quarenta e cinco minutos de conversa com a diretoria e duas semanas lendo os números reais do IXC. No fim, você recebe a lista do que resolver, em que ordem e com que retorno esperado." },
      { "pergunta": "Preciso contratar alguma coisa depois do diagnóstico?", "resposta": "Não. O diagnóstico é sem compromisso. Cada etapa seguinte tem entrega e preço próprios, e você decide subir a próxima só depois de ver o resultado da anterior." },
      { "pergunta": "Para qual tamanho de provedor faz sentido?", "resposta": "Provedores de 2 mil a 50 mil assinantes que já sentem o processo travar: fila de instalação, cobrança atrasada, fechamento na planilha paralela. Abaixo disso o processo costuma caber na cabeça do dono; acima, a estrutura já é outra." },
      { "pergunta": "Preciso liberar acesso aos meus dados?", "resposta": "Sim. O trabalho é feito com os números reais do IXC — carteira, caixa, campo e fiscal. Sem acesso aos dados não há diagnóstico, só opinião." },
      { "pergunta": "Vou precisar trocar de sistema?", "resposta": "Não. Os processos são redesenhados e parametrizados dentro do IXC, e o dashboard lê o banco do sistema que já está na operação. Quem quer trocar de ERP em trinta dias não é o perfil." },
      { "pergunta": "Como funciona a contratação?", "resposta": "Quatro formatos: projeto pontual com escopo fechado, acompanhamento mensal, controladoria terceirizada ou software sob medida. Depois da primeira conversa, a Baishift retorna com o escopo, o prazo e o formato que faz sentido para o seu provedor." }
    ]
  },
  "contato": {
    "rotulo": "Vamos começar pelo diagnóstico",
    "titulo": "Primeiro os números aparecem. Depois eles *melhoram*.",
    "texto": "Conte como a gestão do provedor funciona hoje. A Baishift retorna com o escopo, o prazo e o formato de contratação.",
    "botaoWhatsapp": "Chamar no WhatsApp",
    "areas": [
      { "titulo": "Diagnóstico", "texto": "Situação real e plano priorizado" },
      { "titulo": "Processos IXC", "texto": "Escritos, parametrizados, treinados" },
      { "titulo": "Dashboard", "texto": "Base, caixa, churn, campo" },
      { "titulo": "Controladoria", "texto": "Fechamento, rateio, custo" },
      { "titulo": "Software para ISP", "texto": "Cobrança, campo, autoatendimento" },
      { "titulo": "Sob medida", "texto": "Outros segmentos" }
    ],
    "formulario": { "titulo": "Agendar o diagnóstico", "subtitulo": "Cinco campos. A Baishift responde em até dois dias úteis." }
  },
  "produtos": [
    {
      "slug": "severino", "nome": "Severino", "ativo": true, "cor": "#F5A300", "letra": "S",
      "icone": { "arquivo": "", "alt": "" },
      "status": "em desenvolvimento",
      "descricaoMenu": "Assistente de IA para o profissional autônomo",
      "descricao": "Assistente de IA que organiza agenda, orçamento, cobrança e recebimento do profissional autônomo.",
      "publico": "Eletricista · Pedreiro · Encanador · Jardineiro",
      "titulo": "Ele fala. *O Severino anota.*",
      "lead": "Assistente de IA que organiza a agenda, o orçamento, a cobrança e o recebimento do profissional autônomo — por voz, no WhatsApp, sem planilha e sem aplicativo complicado.",
      "chips": ["Orçamento enviado · R$ 850", "Serviço amanhã · 8h", "Pagamento recebido"],
      "capa": { "arquivo": "", "alt": "" },
      "comoFunciona": {
        "rotulo": "Como funciona", "titulo": "Três coisas, feitas direito.",
        "itens": [
          { "titulo": "Agenda", "texto": "O profissional fala quando vai fazer o serviço e o Severino marca, avisa o cliente e lembra na véspera." },
          { "titulo": "Orçamento", "texto": "Descreve o serviço por voz; o Severino monta o orçamento e manda para o cliente aprovar." },
          { "titulo": "Cobrança e recebimento", "texto": "Quando o serviço termina, a cobrança sai sozinha — e o Severino confirma quando o dinheiro entrou." }
        ]
      },
      "blocos": [],
      "listaEspera": { "ativa": true, "convite": "Entre na lista e seja avisado quando o Severino *abrir para os primeiros profissionais*.", "campo": "Sua profissão", "placeholder": "Ex.: eletricista" }
    },
    {
      "slug": "aprova-ordem", "nome": "Aprova · Ordem", "ativo": true, "cor": "#C0563A", "letra": "§",
      "icone": { "arquivo": "", "alt": "" },
      "status": "em preparação",
      "descricaoMenu": "Questões e revisão para o Exame de Ordem",
      "descricao": "Banco de questões com explicação clara, mapa de matéria por peso na prova e revisão espaçada para o Exame de Ordem.",
      "publico": "1ª e 2ª fase do Exame de Ordem",
      "titulo": "Questão comentada em *linguagem clara*, para quem estuda trabalhando.",
      "lead": "Banco de questões com explicação direta, mapa de matéria pelo peso real na prova e revisão espaçada — para o candidato que tem uma hora por dia e precisa fazê-la render.",
      "chips": ["Ética · 18% da prova", "Revisão de hoje · 24 questões", "Acerto na semana · 71%"],
      "capa": { "arquivo": "", "alt": "" },
      "comoFunciona": {
        "rotulo": "Como funciona", "titulo": "Três coisas, feitas direito.",
        "itens": [
          { "titulo": "Questões comentadas", "texto": "Cada alternativa explicada em português simples: por que está certa, por que está errada, o que a banca queria." },
          { "titulo": "Mapa por peso", "texto": "As matérias ordenadas pelo peso que têm na prova, para estudar primeiro o que mais pontua." },
          { "titulo": "Revisão espaçada", "texto": "O que você errou volta no momento certo. O que você acertou sai do caminho." }
        ]
      },
      "blocos": [],
      "listaEspera": { "ativa": true, "convite": "Entre na lista e seja avisado quando o Aprova · Ordem *abrir a primeira turma*.", "campo": "Próximo exame", "placeholder": "Ex.: 1ª fase, próxima edição" }
    },
    {
      "slug": "aprova-suficiencia", "nome": "Aprova · Suficiência", "ativo": true, "cor": "#12855A", "letra": "Σ",
      "icone": { "arquivo": "", "alt": "" },
      "status": "em preparação",
      "descricaoMenu": "Simulados do Exame de Suficiência",
      "descricao": "Questões das últimas edições, simulado cronometrado no formato do exame e exemplos de operação real de empresa.",
      "publico": "Exame de Suficiência do contador",
      "titulo": "Simulado no formato do exame, com exemplos de *empresa de verdade*.",
      "lead": "Questões das últimas edições, simulado cronometrado no formato oficial e exemplos tirados da operação real de uma empresa — para chegar no dia da prova já tendo feito a prova.",
      "chips": ["Simulado · 50 questões · 4h", "Custos · 82% de acerto", "Última edição resolvida"],
      "capa": { "arquivo": "", "alt": "" },
      "comoFunciona": {
        "rotulo": "Como funciona", "titulo": "Três coisas, feitas direito.",
        "itens": [
          { "titulo": "Últimas edições", "texto": "As questões que caíram, organizadas por tema, com o gabarito comentado." },
          { "titulo": "Simulado cronometrado", "texto": "O mesmo número de questões, o mesmo tempo, a mesma pressão — antes do dia da prova." },
          { "titulo": "Exemplos reais", "texto": "Lançamentos, fechamento e custos retirados da operação de uma empresa de verdade, não de enunciado inventado." }
        ]
      },
      "blocos": [],
      "listaEspera": { "ativa": true, "convite": "Entre na lista e seja avisado quando o Aprova · Suficiência *abrir a primeira turma*.", "campo": "Próximo exame", "placeholder": "Ex.: próxima edição" }
    }
  ]
}
```

- [ ] **Step 2: Conferir que é JSON válido**

Run: `node -e 'const c=require("./conteudo/site.json");console.log(c.produtos.length, c.faq.itens.length)'`
Expected: `3 6`

- [ ] **Step 3: Commit**

```bash
git add conteudo/site.json
git commit -m "Conteúdo editável do site em conteudo/site.json"
```

---

### Task 2: Helpers de HTML (`lib/html.js`)

**Files:**
- Create: `lib/html.js`
- Test: `test/html.test.js`

- [ ] **Step 1: Escrever o teste**

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { h, marcar, semMarcas, urlImagem, jsonEmbutido } = require("../lib/html");

test("h escapa os cinco caracteres", () => {
  assert.equal(h(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(h(null), "");
  assert.equal(h(12), "12");
});

test("marcar aplica em, negrito e link válido", () => {
  assert.equal(marcar("a *b* **c** [d](https://x.y)"), 'a <em>b</em> <strong>c</strong> <a href="https://x.y">d</a>');
  assert.equal(marcar("[e](#faq) [f](mailto:a@b.c) [g](/outros/x)"), '<a href="#faq">e</a> <a href="mailto:a@b.c">f</a> <a href="/outros/x">g</a>');
});

test("marcar escapa antes de marcar e recusa link perigoso", () => {
  assert.equal(marcar("<b>x</b> *<i>*"), "&lt;b&gt;x&lt;/b&gt; <em>&lt;i&gt;</em>");
  assert.equal(marcar("[x](javascript:alert(1))"), "[x](javascript:alert(1))");
  assert.equal(marcar("[x](data:text/html,oi)"), "[x](data:text/html,oi)");
});

test("marcar sem parágrafos vira <br>; com parágrafos vira <p>", () => {
  assert.equal(marcar("a\nb"), "a<br>b");
  assert.equal(marcar("a\nb\n\nc", { paragrafos: true }), "<p>a<br>b</p>\n<p>c</p>");
  assert.equal(marcar("  \n\n  ", { paragrafos: true }), "");
});

test("semMarcas devolve texto puro", () => {
  assert.equal(semMarcas("a *b* **c** [d](https://x.y)"), "a b c d");
});

test("urlImagem resolve publicada, pendente e vazia", () => {
  assert.equal(urlImagem("conteudo/imagens/capa-1a2b3c4d.webp"), "/conteudo/imagens/capa-1a2b3c4d.webp");
  assert.equal(urlImagem("pendente:0123456789abcdef01234567"), "/gestor/api/pendentes/0123456789abcdef01234567");
  assert.equal(urlImagem("pendente:abc", { basePendentes: "/p/" }), "/p/abc");
  assert.equal(urlImagem(""), "");
});

test("jsonEmbutido não fecha a tag script", () => {
  assert.equal(jsonEmbutido({ a: "</script><b>" }), '{"a":"\\u003c/script>\\u003cb>"}');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/html.test.js`
Expected: FAIL com `Cannot find module '../lib/html'`

- [ ] **Step 3: Implementar**

```js
/* Helpers de HTML usados pelos modelos das páginas.
   Regra do projeto: todo valor vindo do conteúdo passa por h() ou marcar() antes de entrar no HTML. */
"use strict";

const MAPA = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => MAPA[c]); }

const RE_LINK = /^(https?:\/\/|mailto:|#|\/)/;

/* aplica as marcações num texto JÁ escapado */
function marcarLinha(t) {
  return t
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, txt, url) => RE_LINK.test(url) ? '<a href="' + url + '">' + txt + "</a>" : m)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

/* *em*, **negrito**, [texto](url); com { paragrafos: true } linha em branco separa <p> */
function marcar(s, o) {
  const t = h(s);
  if (!(o && o.paragrafos)) return marcarLinha(t).replace(/\n/g, "<br>");
  return t.split(/\n[ \t]*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => "<p>" + marcarLinha(p).replace(/\n/g, "<br>") + "</p>").join("\n");
}

/* texto puro, sem as marcações (para meta tags e JSON-LD) */
function semMarcas(s) {
  return String(s == null ? "" : s)
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1");
}

/* referência do JSON → URL: "conteudo/imagens/x.webp" ou "pendente:<id>" (ainda não publicada) */
function urlImagem(ref, o) {
  if (!ref) return "";
  if (ref.startsWith("pendente:")) return ((o && o.basePendentes) || "/gestor/api/pendentes/") + ref.slice(9);
  return "/" + ref;
}

/* JSON dentro de <script>: "<" vira \u003c para "</script>" não fechar a tag */
function jsonEmbutido(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

module.exports = { h, marcar, semMarcas, urlImagem, jsonEmbutido };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/html.test.js`
Expected: `# pass 7`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add lib/html.js test/html.test.js
git commit -m "Helpers de HTML: escape, marcações e URL de imagem"
```

---

### Task 3: Esquema e validação (`lib/conteudo.js`)

**Files:**
- Create: `lib/conteudo.js`
- Test: `test/conteudo.test.js`

- [ ] **Step 1: Escrever o teste**

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { carregar, validar, mapearImagens, imagensReferenciadas, ErroConteudo, LIMITES } = require("../lib/conteudo");

const base = () => JSON.parse(JSON.stringify(carregar()));
const erroEm = (obj, campo) => {
  assert.throws(() => validar(obj), e => { assert.ok(e instanceof ErroConteudo, "esperava ErroConteudo, veio " + e); assert.equal(e.campo, campo); return true; });
};

test("carrega o site.json do projeto", () => {
  const c = carregar();
  assert.equal(c.produtos.length, 3);
  assert.equal(c.faq.itens.length, 6);
  assert.equal(c.inicio.painelAtivo, true);
});

test("normaliza: trim, espaços em título, quebras em multilinha, cor maiúscula, booleano", () => {
  const o = base();
  o.inicio.titulo = "  Um   título\ncom quebra  ";
  o.inicio.subtitulo = "linha 1\r\nlinha 2";
  o.produtos[0].cor = "#f5a300";
  o.produtos[0].ativo = "true";
  const c = validar(o);
  assert.equal(c.inicio.titulo, "Um título com quebra");
  assert.equal(c.inicio.subtitulo, "linha 1\nlinha 2");
  assert.equal(c.produtos[0].cor, "#F5A300");
  assert.equal(c.produtos[0].ativo, true);
});

test("campos ausentes viram valor vazio; campos desconhecidos são descartados", () => {
  const o = base();
  delete o.contato.texto; o.contato.extra = 1; o.produtos[0].blocos = undefined;
  const c = validar(o);
  assert.equal(c.contato.texto, "");
  assert.equal("extra" in c.contato, false);
  assert.deepEqual(c.produtos[0].blocos, []);
});

test("limites de tamanho apontam o campo", () => {
  const o = base(); o.inicio.titulo = "x".repeat(LIMITES.titulo + 1);
  erroEm(o, "inicio.titulo");
});

test("listas com contagem fixa", () => {
  const o = base(); o.diagnostico.afirmacoes.pop();
  erroEm(o, "diagnostico.afirmacoes");
  const o2 = base(); o2.inicio.carrossel.imagens = [1, 2, 3, 4].map(() => ({ arquivo: "conteudo/imagens/a-12345678.webp", alt: "a" }));
  erroEm(o2, "inicio.carrossel.imagens");
});

test("obrigatórios", () => {
  const o = base(); o.faq.itens[0].pergunta = "  ";
  erroEm(o, "faq.itens[0].pergunta");
  const o2 = base(); o2.produtos[1].nome = "";
  erroEm(o2, "produtos[1].nome");
});

test("slug inválido, repetido e reservado", () => {
  const o = base(); o.produtos[0].slug = "Sev Er";
  erroEm(o, "produtos[0].slug");
  const o2 = base(); o2.produtos[1].slug = "severino";
  erroEm(o2, "produtos[1].slug");
  const o3 = base(); o3.produtos[2].slug = "gestor";
  erroEm(o3, "produtos[2].slug");
});

test("cor, link e intervalo", () => {
  const o = base(); o.produtos[0].cor = "laranja";
  erroEm(o, "produtos[0].cor");
  const o2 = base(); o2.inicio.botaoPrincipal.link = "javascript:alert(1)";
  erroEm(o2, "inicio.botaoPrincipal.link");
  const o3 = base(); o3.inicio.carrossel.intervalo = 99;
  erroEm(o3, "inicio.carrossel.intervalo");
});

test("referências de imagem", () => {
  const o = base(); o.produtos[0].capa.arquivo = "../x.png";
  erroEm(o, "produtos[0].capa.arquivo");
  const o2 = base(); o2.inicio.carrossel.imagens = [{ arquivo: "", alt: "a" }];
  erroEm(o2, "inicio.carrossel.imagens[0].arquivo");
  const o3 = base(); o3.produtos[0].blocos = [{ tipo: "imagem", arquivo: "", alt: "" }];
  erroEm(o3, "produtos[0].blocos[0].arquivo");
  const ok = base(); ok.produtos[0].capa.arquivo = "pendente:0123456789abcdef01234567";
  assert.equal(validar(ok).produtos[0].capa.arquivo, "pendente:0123456789abcdef01234567");
});

test("blocos: tipo desconhecido e validação por tipo", () => {
  const o = base(); o.produtos[0].blocos = [{ tipo: "video" }];
  erroEm(o, "produtos[0].blocos[0].tipo");
  const o2 = base(); o2.produtos[0].blocos = [{ tipo: "lista", titulo: "t", itens: [] }];
  erroEm(o2, "produtos[0].blocos[0].itens");
  const o3 = base();
  o3.produtos[0].blocos = [
    { tipo: "texto", titulo: "T", texto: "a\n\nb" },
    { tipo: "destaque", titulo: "D", texto: "x", botao: { texto: "Ir", link: "https://a.b" } },
    { tipo: "imagemTexto", arquivo: "conteudo/imagens/a-12345678.webp", alt: "a", titulo: "", texto: "t", imagemDireita: 1 }
  ];
  const c = validar(o3);
  assert.equal(c.produtos[0].blocos.length, 3);
  assert.equal(c.produtos[0].blocos[2].imagemDireita, true);
  assert.equal(c.produtos[0].blocos[1].botao.link, "https://a.b");
});

test("imagensReferenciadas e mapearImagens", () => {
  const o = base();
  o.inicio.carrossel.imagens = [{ arquivo: "pendente:0123456789abcdef01234567", alt: "a", link: "" }];
  o.produtos[0].capa = { arquivo: "conteudo/imagens/capa-aaaaaaaa.webp", alt: "c" };
  o.produtos[0].blocos = [{ tipo: "imagem", arquivo: "conteudo/imagens/capa-aaaaaaaa.webp", alt: "", legenda: "" }];
  const c = validar(o);
  assert.deepEqual(imagensReferenciadas(c).sort(), ["conteudo/imagens/capa-aaaaaaaa.webp", "pendente:0123456789abcdef01234567"]);
  const t = mapearImagens(c, ref => ref.startsWith("pendente:") ? "conteudo/imagens/promo-bbbbbbbb.webp" : ref);
  assert.equal(t.inicio.carrossel.imagens[0].arquivo, "conteudo/imagens/promo-bbbbbbbb.webp");
  assert.equal(c.inicio.carrossel.imagens[0].arquivo, "pendente:0123456789abcdef01234567", "não muda o original");
  assert.equal(t.produtos[0].blocos[0].tipo, "imagem");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/conteudo.test.js`
Expected: FAIL com `Cannot find module '../lib/conteudo'`

- [ ] **Step 3: Implementar**

```js
/* Conteúdo editável do site: esquema, validação e carregamento de conteudo/site.json.
   A mesma validação vale para o arquivo no disco e para o rascunho que chega do painel. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO = path.join(RAIZ, "conteudo", "site.json");

const LIMITES = { titulo: 160, curto: 400, longo: 4000, item: 120, lista: 12, slugMin: 2, slugMax: 40, carrossel: 3, blocos: 20, intervaloMin: 3, intervaloMax: 30 };

class ErroConteudo extends Error {
  constructor(mensagem, campo) { super(mensagem); this.name = "ErroConteudo"; this.campo = campo; }
}
function falha(msg, campo) { throw new ErroConteudo(msg + (campo ? " (" + campo + ")" : ""), campo); }

/* ---------- tipos de campo ---------- */
const texto      = (max, o) => Object.assign({ tipo: "texto", max }, o);
const multilinha = (max, o) => Object.assign({ tipo: "texto", max, multilinha: true }, o);
const booleano   = () => ({ tipo: "booleano" });
const numero     = (min, max) => ({ tipo: "numero", min, max });
const cor        = () => ({ tipo: "cor" });
const link       = () => ({ tipo: "link" });
const slug       = () => ({ tipo: "slug" });
const imagem     = () => ({ tipo: "imagem" });
const lista      = (item, min, max) => ({ tipo: "lista", item, min, max });
const objeto     = (campos) => ({ tipo: "objeto", campos });
const bloco      = () => ({ tipo: "bloco" });

const RE_COR    = /^#[0-9a-fA-F]{6}$/;
const RE_LINK   = /^(https?:\/\/|mailto:|#|\/)/;
const RE_SLUG   = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RE_IMAGEM = /^(conteudo\/imagens\/[a-z0-9-]+\.(webp|jpe?g|png|gif)|pendente:[a-f0-9]{24})$/;
const SLUGS_RESERVADOS = new Set(["gestor", "api", "assets", "outros", "conteudo", "index"]);

const imagemComAlt = () => objeto({ arquivo: imagem(), alt: texto(LIMITES.curto) });
const botao = () => objeto({ texto: texto(LIMITES.item), link: link() });

/* ---------- esquema ---------- */
const BLOCOS = {
  texto:       objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo) }),
  imagem:      objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), legenda: texto(LIMITES.curto) }),
  imagemTexto: objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo), imagemDireita: booleano() }),
  lista:       objeto({ titulo: texto(LIMITES.titulo), itens: lista(texto(LIMITES.item), 1, LIMITES.lista) }),
  destaque:    objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo), botao: botao() })
};

const PRODUTO = objeto({
  slug: slug(), nome: texto(LIMITES.item, { obrigatorio: true }), ativo: booleano(), cor: cor(),
  letra: texto(2), icone: imagemComAlt(), status: texto(LIMITES.item), descricaoMenu: texto(LIMITES.curto),
  descricao: texto(LIMITES.curto), publico: texto(LIMITES.curto), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
  chips: lista(texto(LIMITES.item), 0, 3), capa: imagemComAlt(),
  comoFunciona: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    itens: lista(objeto({ titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto) }), 0, 6) }),
  blocos: lista(bloco(), 0, LIMITES.blocos),
  listaEspera: objeto({ ativa: booleano(), convite: texto(LIMITES.curto), campo: texto(LIMITES.item), placeholder: texto(LIMITES.item) })
});

const ESQUEMA = objeto({
  versao: numero(1, 1),
  atualizadoEm: texto(40),
  site: objeto({ tituloAba: texto(LIMITES.titulo), descricao: texto(LIMITES.curto), descricaoSocial: texto(LIMITES.curto),
    whatsapp: texto(20), email: texto(LIMITES.item), cidade: texto(LIMITES.item), notaRodape: texto(LIMITES.curto) }),
  inicio: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), subtitulo: multilinha(LIMITES.curto),
    botaoPrincipal: botao(), botaoSecundario: botao(), tags: lista(texto(40), 0, 8),
    painelAtivo: booleano(),
    carrossel: objeto({ intervalo: numero(LIMITES.intervaloMin, LIMITES.intervaloMax),
      imagens: lista(objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), link: link() }), 0, LIMITES.carrossel) }),
    frentesResumo: lista(objeto({ titulo: texto(LIMITES.item), texto: texto(LIMITES.curto) }), 3, 3)
  }),
  diagnostico: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
    afirmacoes: lista(objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.curto) }), 3, 3),
    oferta: objeto({ titulo: texto(LIMITES.item), selo: texto(40),
      medidas: lista(objeto({ valor: texto(40), texto: texto(LIMITES.item) }), 3, 3),
      tituloEntregas: texto(LIMITES.item), entregas: lista(texto(LIMITES.item), 2, LIMITES.lista),
      botao: texto(LIMITES.item), alternativa: texto(LIMITES.item) })
  }),
  processos: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
    cartoes: lista(objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto),
      itens: lista(texto(LIMITES.item), 1, 6) }), 3, 3),
    entrega: texto(LIMITES.curto)
  }),
  dashboard: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto), legendaCelular: texto(LIMITES.item) }),
  modelos: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), apoio: multilinha(LIMITES.curto),
    cartoes: lista(objeto({ tag: texto(40), titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto),
      itens: lista(texto(LIMITES.item), 1, 8), paraQuem: texto(LIMITES.curto) }), 2, 4),
    nota: texto(LIMITES.curto)
  }),
  perfil: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    serveTitulo: texto(LIMITES.item), serve: lista(texto(LIMITES.item), 1, 8),
    naoServeTitulo: texto(LIMITES.item), naoServe: lista(texto(LIMITES.item), 1, 8) }),
  faq: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    itens: lista(objeto({ pergunta: texto(LIMITES.titulo, { obrigatorio: true }), resposta: multilinha(LIMITES.longo, { obrigatorio: true }) }), 1, 20) }),
  contato: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.curto), botaoWhatsapp: texto(LIMITES.item),
    areas: lista(objeto({ titulo: texto(LIMITES.item), texto: texto(LIMITES.item) }), 1, 6),
    formulario: objeto({ titulo: texto(LIMITES.item), subtitulo: texto(LIMITES.curto) })
  }),
  produtos: lista(PRODUTO, 0, 20)
});

/* ---------- validação ---------- */
function validarCampo(v, esq, campo) {
  switch (esq.tipo) {
    case "texto": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = esq.multilinha ? v.replace(/\r\n?/g, "\n").trim() : v.replace(/\s+/g, " ").trim();
      if (esq.obrigatorio && !v) falha("é obrigatório", campo);
      if (v.length > esq.max) falha("passa de " + esq.max + " caracteres", campo);
      return v;
    }
    case "booleano": return v === true || v === "true" || v === 1;
    case "numero": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < esq.min || n > esq.max) falha("precisa ser um número inteiro entre " + esq.min + " e " + esq.max, campo);
      return n;
    }
    case "cor": {
      if (typeof v !== "string" || !RE_COR.test(v.trim())) falha("precisa ser uma cor no formato #RRGGBB", campo);
      return v.trim().toUpperCase();
    }
    case "link": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = v.trim();
      if (v && !RE_LINK.test(v)) falha("precisa começar com http://, https://, mailto:, # ou /", campo);
      if (v.length > 500) falha("passa de 500 caracteres", campo);
      return v;
    }
    case "slug": {
      if (typeof v !== "string") falha("é obrigatório", campo);
      v = v.trim().toLowerCase();
      if (v.length < LIMITES.slugMin || v.length > LIMITES.slugMax || !RE_SLUG.test(v)) falha("só letras minúsculas, números e hífens, de 2 a 40 caracteres", campo);
      if (SLUGS_RESERVADOS.has(v)) falha("endereço reservado", campo);
      return v;
    }
    case "imagem": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = v.trim();
      if (v && !RE_IMAGEM.test(v)) falha("referência de imagem inválida", campo);
      return v;
    }
    case "lista": {
      if (v == null) v = [];
      if (!Array.isArray(v)) falha("precisa ser uma lista", campo);
      if (v.length < esq.min) falha("precisa ter pelo menos " + esq.min + (esq.min === 1 ? " item" : " itens"), campo);
      if (v.length > esq.max) falha("pode ter no máximo " + esq.max + " itens", campo);
      return v.map((item, i) => validarCampo(item, esq.item, campo + "[" + i + "]"));
    }
    case "objeto": {
      if (v == null) v = {};
      if (typeof v !== "object" || Array.isArray(v)) falha("precisa ser um objeto", campo);
      const saida = {};
      for (const k in esq.campos) saida[k] = validarCampo(v[k], esq.campos[k], campo ? campo + "." + k : k);
      return saida;
    }
    case "bloco": {
      if (!v || typeof v !== "object" || !BLOCOS[v.tipo]) falha("tipo de bloco desconhecido", campo + ".tipo");
      return Object.assign({ tipo: v.tipo }, validarCampo(v, BLOCOS[v.tipo], campo));
    }
  }
  return falha("tipo de campo desconhecido: " + esq.tipo, campo);
}

/* regras que dependem de mais de um campo */
function validar(obj) {
  const c = validarCampo(obj, ESQUEMA, "");
  const vistos = new Set();
  c.produtos.forEach((p, i) => {
    if (vistos.has(p.slug)) falha("endereço repetido: " + p.slug, "produtos[" + i + "].slug");
    vistos.add(p.slug);
    p.blocos.forEach((b, j) => {
      if ((b.tipo === "imagem" || b.tipo === "imagemTexto") && !b.arquivo) falha("escolha a imagem", "produtos[" + i + "].blocos[" + j + "].arquivo");
    });
  });
  c.inicio.carrossel.imagens.forEach((im, i) => { if (!im.arquivo) falha("escolha a imagem", "inicio.carrossel.imagens[" + i + "].arquivo"); });
  return c;
}

/* percorre um conteúdo válido devolvendo uma cópia com fn aplicada a cada referência de imagem */
function mapear(v, esq, fn) {
  if (esq.tipo === "objeto") { const o = {}; for (const k in esq.campos) o[k] = mapear(v[k], esq.campos[k], fn); return o; }
  if (esq.tipo === "lista") return v.map(x => mapear(x, esq.item, fn));
  if (esq.tipo === "bloco") return Object.assign({ tipo: v.tipo }, mapear(v, BLOCOS[v.tipo], fn));
  return esq.tipo === "imagem" ? fn(v) : v;
}
function mapearImagens(c, fn) { return mapear(c, ESQUEMA, fn); }
function imagensReferenciadas(c) {
  const s = new Set();
  mapear(c, ESQUEMA, ref => { if (ref) s.add(ref); return ref; });
  return [...s];
}

function carregar(arquivo = ARQUIVO) {
  let bruto;
  try { bruto = fs.readFileSync(arquivo, "utf8"); }
  catch { throw new ErroConteudo("não encontrei " + path.relative(RAIZ, arquivo), ""); }
  let obj;
  try { obj = JSON.parse(bruto); }
  catch (e) { throw new ErroConteudo("JSON inválido em " + path.relative(RAIZ, arquivo) + ": " + e.message, ""); }
  return validar(obj);
}

module.exports = { carregar, validar, mapearImagens, imagensReferenciadas, ErroConteudo, LIMITES, ARQUIVO, ESQUEMA };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/conteudo.test.js`
Expected: `# pass 11`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add lib/conteudo.js test/conteudo.test.js
git commit -m "Esquema e validação do conteúdo editável"
```

---

### Task 4: Partes comuns dos modelos (`templates/comum.js`)

**Files:**
- Create: `templates/comum.js`

- [ ] **Step 1: Implementar**

```js
/* Partes compartilhadas pelas páginas: <head>, barras de navegação, rodapé, ícone do WhatsApp. */
"use strict";
const { h, jsonEmbutido, urlImagem } = require("../lib/html");

const HOST = "https://www.baishift.com.br";
const AVISO = "<!-- GERADO a partir de conteudo/site.json pelos modelos em templates/. Não edite este arquivo: edite o JSON e rode `node tools/build-site.mjs`, ou use o painel em /gestor. -->";
const SVG_WA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
const SVG_SETA = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';
const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;
const NAVTOGGLE = '<button class="navtoggle" id="navtoggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="navlinks"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i></button>';

function logo(href) {
  return `<a class="brand" href="${href}" aria-label="Baishift — início"><img class="lg lg-navy" src="/assets/marca/01-logo/baishift-principal.svg" alt="Baishift" width="911" height="175"><img class="lg lg-white" src="/assets/marca/01-logo/baishift-branco.svg" alt="" aria-hidden="true" width="911" height="175"></a>`;
}

/* o: titulo, descricao, descricaoSocial, caminho ("/" ou "/outros/x"), site, manifesto, previa */
function head(o) {
  const url = HOST + o.caminho;
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(o.titulo)}</title>
<meta name="description" content="${h(o.descricao)}">
<meta name="author" content="Baishift">
<meta name="robots" content="${o.previa ? "noindex, nofollow" : "index, follow, max-image-preview:large"}">
<meta name="theme-color" content="#142F7A">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Baishift">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${h(o.titulo)}">
<meta property="og:description" content="${h(o.descricaoSocial)}">
<meta property="og:image" content="${HOST}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Baishift — gestão, processos e software para provedores de internet">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${h(o.titulo)}">
<meta name="twitter:description" content="${h(o.descricaoSocial)}">
<meta name="twitter:image" content="${HOST}/assets/img/og.png">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="alternate icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png" sizes="180x180">
${o.manifesto ? '<link rel="manifest" href="/site.webmanifest">\n' : ""}${FONTES}
<link rel="stylesheet" href="/assets/css/site.css">
<noscript><style>.rv{opacity:1;transform:none}.navlinks{position:static;opacity:1;visibility:visible;pointer-events:auto;transform:none}</style></noscript>
<script>
/* Contato. O WhatsApp só com dígitos, com DDI e DDD (ex.: "5569999999999").
   Enquanto estiver vazio, os botões de WhatsApp levam ao formulário e o formulário abre o e-mail. */
window.BAISHIFT = ${jsonEmbutido({ whatsapp: o.site.whatsapp, email: o.site.email })};
</script>`;
}

/* quadradinho colorido com a letra (ou o ícone) do produto, usado no menu Outros */
function marcaProduto(p, o) {
  return `<span class="mk" aria-hidden="true">${p.icone.arquivo ? `<img src="${h(urlImagem(p.icone.arquivo, o))}" alt="">` : h(p.letra)}</span>`;
}

function barraInicio(c, o) {
  const ativos = c.produtos.filter(p => p.ativo);
  const outros = ativos.length ? `
      <div class="dd" id="dd">
        <button class="ddb" type="button" aria-expanded="false" aria-controls="ddm">Outros ${SVG_SETA}</button>
        <ul class="ddm" id="ddm">
${ativos.map(p => `          <li><a href="/outros/${p.slug}" style="--ac:${h(p.cor)}" data-ev="menu:outros:${p.slug}">${marcaProduto(p, o)}<div><b>${h(p.nome)}</b><span>${h(p.descricaoMenu)}${p.status ? " · " + h(p.status) : ""}</span></div></a></li>`).join("\n")}
        </ul>
      </div>` : "";
  return `<header class="bar on-dark" id="bar">
  <div class="bar-in">
    ${logo("#topo")}
    ${NAVTOGGLE}
    <nav class="navlinks" id="navlinks" aria-label="Navegação principal">
      <a href="#diagnostico">Diagnóstico</a>
      <a href="#processos">Processos</a>
      <a href="#dashboard">Dashboard</a>
      <a href="#modelos">Modelos</a>${outros}
      <a href="#faq">FAQ</a>
      <a class="cta" href="#contato" data-ev="cta:menu">Falar com a Baishift</a>
    </nav>
  </div>
  <div id="prog" aria-hidden="true"></div>
</header>`;
}

function barraProduto(p, c) {
  const outros = c.produtos.filter(x => x.ativo && x.slug !== p.slug);
  const cta = p.listaEspera.ativa ? '<a class="cta" href="#lista">Entrar na lista</a>' : '<a class="cta" href="/#contato">Falar com a Baishift</a>';
  return `<header class="bar" id="bar">
  <div class="bar-in">
    ${logo("/")}
    ${NAVTOGGLE}
    <nav class="navlinks" id="navlinks" aria-label="Navegação">
      <a href="/">Baishift</a>
${outros.map(x => `      <a href="/outros/${x.slug}" data-ev="menu:outros:${x.slug}">${h(x.nome)}</a>`).join("\n")}
      ${cta}
    </nav>
  </div>
</header>`;
}

/* linha final do rodapé; voltar = { href, texto } */
function footEnd(site, voltar) {
  return `<div class="foot-end"><span>Baishift © <span id="yr">2026</span> · ${h(site.cidade)}</span><span><a href="mailto:${h(site.email)}">${h(site.email)}</a></span><span><a href="${voltar.href}">${voltar.texto}</a></span></div>`;
}

module.exports = { HOST, AVISO, SVG_WA, head, logo, barraInicio, barraProduto, footEnd, marcaProduto };
```

- [ ] **Step 2: Conferir que carrega**

Run: `node -e 'const c=require("./templates/comum");console.log(Object.keys(c).join(","))'`
Expected: `HOST,AVISO,SVG_WA,head,logo,barraInicio,barraProduto,footEnd,marcaProduto`

- [ ] **Step 3: Commit**

```bash
git add templates/comum.js
git commit -m "Modelos: partes comuns (head, barras, rodapé)"
```

---

### Task 5: Modelo da página principal (`templates/index.js`)

**Files:**
- Create: `templates/index.js`
- Test: `test/render.test.js` (primeira parte)

- [ ] **Step 1: Escrever os testes da página principal**

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { carregar, validar } = require("../lib/conteudo");
const paginaInicio = require("../templates/index");

const base = () => JSON.parse(JSON.stringify(carregar()));
const conta = (s, re) => (s.match(re) || []).length;
const IMG = n => ({ arquivo: "conteudo/imagens/promo-" + String(n).repeat(8) + ".webp", alt: "Promo " + n, link: "" });

test("início com painel demonstrativo", () => {
  const html = paginaInicio(validar(base()));
  assert.ok(html.includes('id="cRec"'));
  assert.ok(!html.includes('id="carrossel"'));
  assert.ok(html.includes('class="wrap hero-grid"'));
  assert.ok(html.startsWith("<!DOCTYPE html>\n<!-- GERADO"));
});

test("início com carrossel de uma imagem: sem setas, sem pontos, sem painel", () => {
  const o = base(); o.inicio.carrossel.imagens = [IMG(1)];
  const html = paginaInicio(validar(o));
  assert.ok(html.includes('id="carrossel"'));
  assert.ok(!html.includes('id="cRec"'));
  assert.equal(conta(html, /class="cs-slide/g), 1);
  assert.ok(!html.includes("cs-dots"));
  assert.ok(html.includes('src="/conteudo/imagens/promo-11111111.webp"'));
});

test("início com três imagens e link: setas, pontos e link no slide", () => {
  const o = base(); o.inicio.carrossel.imagens = [Object.assign(IMG(1), { link: "https://x.y" }), IMG(2), IMG(3)]; o.inicio.carrossel.intervalo = 9;
  const html = paginaInicio(validar(o));
  assert.equal(conta(html, /class="cs-slide/g), 3);
  assert.equal(conta(html, /class="cs-slide on"/g), 1);
  assert.equal(conta(html, /role="tab"/g), 3);
  assert.ok(html.includes('data-intervalo="9"'));
  assert.ok(html.includes('<a class="cs-slide on" href="https://x.y"'));
  assert.ok(html.includes('data-ev="carrossel:1"'));
});

test("início sem painel e sem imagens: só o texto", () => {
  const o = base(); o.inicio.painelAtivo = false;
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes('id="cRec"'));
  assert.ok(!html.includes('id="carrossel"'));
  assert.ok(html.includes('class="wrap hero-grid solo"'));
});

test("escapa e marca", () => {
  const o = base(); o.inicio.titulo = "<script>x</script> *azul* **forte**";
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes("<script>x</script>"));
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt; <em>azul</em> <strong>forte</strong>"));
});

test("menu Outros só com produtos ativos", () => {
  const o = base(); o.produtos[1].ativo = false;
  let html = paginaInicio(validar(o));
  assert.equal(conta(html, /data-ev="menu:outros:/g), 2);
  assert.ok(!html.includes("aprova-ordem"));
  o.produtos.forEach(p => { p.ativo = false; });
  html = paginaInicio(validar(o));
  assert.ok(!html.includes('id="dd"'));
});

test("FAQ vai para o HTML e para o JSON-LD sem marcações", () => {
  const o = base(); o.faq.itens = [{ pergunta: "Só uma?", resposta: "Sim, *só* uma.\n\nSegundo parágrafo." }];
  const html = paginaInicio(validar(o));
  assert.equal(conta(html, /<details>/g), 1);
  assert.ok(html.includes("<p>Sim, <em>só</em> uma.</p>\n<p>Segundo parágrafo.</p>"));
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  const faq = ld["@graph"].find(x => x["@type"] === "FAQPage");
  assert.equal(faq.mainEntity[0].name, "Só uma?");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "Sim, só uma.\n\nSegundo parágrafo.");
});

test("contato e rodapé usam site.email e site.cidade", () => {
  const o = base(); o.site.email = "oi@baishift.com.br"; o.site.cidade = "Cacoal, RO";
  const html = paginaInicio(validar(o));
  assert.ok(html.includes('href="mailto:oi@baishift.com.br"'));
  assert.ok(html.includes("· Cacoal, RO</span>"));
  assert.ok(html.includes('window.BAISHIFT = {"whatsapp":"","email":"oi@baishift.com.br"}'));
});

test("botão secundário vazio some", () => {
  const o = base(); o.inicio.botaoSecundario.texto = "";
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes("btn-ghost"));
  assert.ok(html.includes('data-ev="cta:principal"'));
});

test("pré-visualização marca o html", () => {
  const html = paginaInicio(validar(base()), { previa: true });
  assert.ok(html.includes('<html lang="pt-BR" data-previa="">'));
  assert.ok(html.includes('content="noindex, nofollow"'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/render.test.js`
Expected: FAIL com `Cannot find module '../templates/index'`

- [ ] **Step 3: Implementar o modelo**

```js
/* Modelo da página principal. Recebe o conteúdo validado e devolve o HTML completo.
   Regra: todo valor do JSON passa por h() ou marcar() antes de entrar no HTML. */
"use strict";
const { h, marcar, semMarcas, urlImagem, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, head, barraInicio, footEnd } = require("./comum");

const PAINEL_DEMO = `<div class="dash rv">
      <div class="dash-top"><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
        <span class="ttl">Painel do provedor · exemplo</span><span class="live"><b aria-hidden="true"></b>ao vivo</span></div>
      <div class="kpis">
        <div class="kpi"><div class="lb">Base ativa</div><div class="vl" id="k1">12.480</div><div class="dt">+128 líquidos</div></div>
        <div class="kpi"><div class="lb">Receita do mês</div><div class="vl" id="k2">R$ 1,24 mi</div><div class="dt">+8,4%</div></div>
        <div class="kpi"><div class="lb">Margem</div><div class="vl" id="k3">35,1%</div><div class="dt">+2,6 p.p.</div></div>
        <div class="kpi"><div class="lb">Churn</div><div class="vl" id="k4">1,62%</div><div class="dt">−0,4 p.p.</div></div>
        <div class="kpi"><div class="lb">Inadimplência</div><div class="vl" id="k5">4,8%</div><div class="dt or">meta 3,5%</div></div>
        <div class="kpi"><div class="lb">ARPU</div><div class="vl" id="k6">R$ 99,40</div><div class="dt">+R$ 3,10</div></div>
      </div>
      <div class="dash-body">
        <div>
          <div class="chart-h"><span>Receita e despesa · 12 meses</span><div class="legend"><i>Receita</i><i class="o">Despesa</i></div></div>
          <div class="chart" id="cRec"></div>
          <div class="chart-h" style="margin-top:14px"><span>Base líquida · entradas e saídas</span><div class="legend"><i class="g">Ativações</i><i class="r">Cancelamentos</i></div></div>
          <div class="chart" id="cBase"></div>
        </div>
        <div>
          <div class="chart-h"><span>Composição da receita</span></div><div class="chart" id="cDonut"></div>
          <div class="chart-h" style="margin-top:12px"><span>Recebimento · dia a dia</span></div><div class="chart" id="cHeat"></div>
          <div class="chart-h" style="margin-top:12px"><span>Eventos · agora</span></div><div class="feed" id="feed"></div>
        </div>
      </div>
    </div>`;

function carrossel(cs, o) {
  const n = cs.imagens.length;
  const slides = cs.imagens.map((im, i) => {
    const img = `<img src="${h(urlImagem(im.arquivo, o))}" alt="${h(im.alt)}" loading="${i ? "lazy" : "eager"}">`;
    const cls = "cs-slide" + (i === 0 ? " on" : ""), hid = i === 0 ? "false" : "true";
    return im.link
      ? `<a class="${cls}" href="${h(im.link)}" aria-hidden="${hid}"${i ? ' tabindex="-1"' : ""} data-ev="carrossel:${i + 1}">${img}</a>`
      : `<div class="${cls}" aria-hidden="${hid}">${img}</div>`;
  }).join("\n        ");
  const nav = n > 1 ? `
      <button class="cs-prev" type="button" aria-label="Imagem anterior">‹</button>
      <button class="cs-next" type="button" aria-label="Próxima imagem">›</button>
      <div class="cs-dots" role="tablist">${cs.imagens.map((_, i) => `<button type="button" role="tab" aria-selected="${i === 0 ? "true" : "false"}" aria-label="Imagem ${i + 1}"></button>`).join("")}</div>` : "";
  return `<div class="dash carrossel rv" id="carrossel" data-intervalo="${cs.intervalo}" aria-roledescription="carrossel" aria-label="Destaques">
      <div class="cs-track">
        ${slides}
      </div>${nav}
    </div>`;
}

const li = s => `<li>${marcar(s)}</li>`;
const eyebrow = (n, r) => `<span class="eyebrow"><b>Frente ${n}</b> ${h(r)}</span>`;
const botao = (b, cls, ev) => b.texto ? `<a class="btn ${cls}" href="${h(b.link || "#")}" data-ev="${ev}">${h(b.texto)}</a>` : "";

module.exports = function paginaInicio(c, o = {}) {
  const st = c.site, ini = c.inicio, d = c.diagnostico, of = d.oferta, pr = c.processos, db = c.dashboard, mo = c.modelos, pf = c.perfil, fq = c.faq, ct = c.contato;
  const visual = ini.carrossel.imagens.length ? carrossel(ini.carrossel, o) : (ini.painelAtivo ? PAINEL_DEMO : "");
  const ANC = ["#diagnostico", "#processos", "#dashboard"], CLS = ["", " b", " c"];
  const [localidade, uf] = st.cidade.split(",").map(s => s.trim());

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfessionalService", "@id": HOST + "/#organizacao", "name": "Baishift", "url": HOST + "/",
      "email": st.email,
      "description": "Diagnóstico de gestão, consultoria de processos no IXC e dashboard para provedores de internet.",
      "image": HOST + "/assets/img/og.png", "logo": HOST + "/assets/marca/01-logo/baishift-principal.svg",
      "address": { "@type": "PostalAddress", "addressLocality": localidade || "", "addressRegion": uf || "", "addressCountry": "BR" },
      "areaServed": { "@type": "Country", "name": "Brasil" },
      "knowsAbout": ["Gestão de provedor de internet", "IXC Soft", "Controladoria", "Business intelligence", "Automação de processos"],
      "hasOfferCatalog": { "@type": "OfferCatalog", "name": "Frentes de atuação", "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Diagnóstico de gestão", "description": "Situação real da empresa com os números do IXC e plano priorizado por retorno." } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Consultoria de processos", "description": "Processos atuais, a desenvolver e a melhorar — escritos, parametrizados no IXC e treinados." } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dashboard", "description": "Painel da diretoria com base, caixa, churn e campo direto do banco, no computador e no celular." } } ] } },
    { "@type": "FAQPage", "@id": HOST + "/#faq", "mainEntity": fq.itens.map(q => ({ "@type": "Question", "name": q.pergunta, "acceptedAnswer": { "@type": "Answer", "text": semMarcas(q.resposta) } })) }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: st.tituloAba, descricao: st.descricao, descricaoSocial: st.descricaoSocial, caminho: "/", site: st, manifesto: true, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barraInicio(c, o)}

<main id="topo">

<!-- ===================== HERO ===================== -->
<div class="hero">
  <div class="wrap hero-grid${visual ? "" : " solo"}">
    <div>
      <span class="pill mono"><b aria-hidden="true"></b> ${h(ini.rotulo)}</span>
      <h1>${marcar(ini.titulo)}</h1>
      <p class="hero-sub">${marcar(ini.subtitulo)}</p>
      <div class="hero-acts">
        ${botao(ini.botaoPrincipal, "btn-1", "cta:principal")}
        ${botao(ini.botaoSecundario, "btn-ghost", "cta:secundario")}
      </div>
      <div class="tags">${ini.tags.map(t => `<span>${h(t)}</span>`).join("")}</div>
    </div>${visual ? "\n    " + visual : ""}
  </div>
  <div class="wrap fronts rv">
${ini.frentesResumo.map((f, i) => `    <a class="front" href="${ANC[i]}"><span class="n">0${i + 1}</span><div><b>${h(f.titulo)}</b><span>${h(f.texto)}</span></div></a>`).join("\n")}
  </div>
</div>

<!-- ===================== 01 · DIAGNÓSTICO ===================== -->
<section id="diagnostico" aria-labelledby="h-diag">
  <div class="wrap">
    <div class="fr-head rv">
      <div>${eyebrow("01", d.rotulo)}
        <h2 id="h-diag">${marcar(d.titulo)}</h2></div>
      <p class="lead">${marcar(d.lead)}</p>
    </div>
    <div class="stage rv">
      <div class="cap"><i aria-hidden="true"></i><b>Caminho dos dados</b> · de onde eles nascem até a decisão</div>
      <div id="datapath"></div>
    </div>
    <div class="claims">
${d.afirmacoes.map(a => `      <div class="claim rv"><h3>${marcar(a.titulo)}</h3>
        <p>${marcar(a.texto)}</p></div>`).join("\n")}
    </div>
    <div class="diag-grid">
      <div class="results rv">
        <div class="res"><div class="n"><span data-count="4680" data-prefix="R$ ">R$ 4.680</span><small>/mês</small></div><div class="l">de receita já vendida que não chegava ao caixa</div></div>
        <div class="res"><div class="n"><span data-count="45">45</span><small>contratos</small></div><div class="l">parados entre a venda e a instalação</div></div>
        <div class="res"><div class="n">dia <span data-count="5">5</span></div><div class="l">fechamento auditável, todo mês</div></div>
        <div class="res"><div class="n"><span data-count="-2.1" data-dec="1">−2,1</span><small>p.p.</small></div><div class="l">de inadimplência em seis meses de rito</div></div>
        <div class="res cap">O que o diagnóstico encontrou no provedor-exemplo desta página · 12 mil assinantes</div>
      </div>
      <div class="offer rv">
        <div class="oh"><h3>${h(of.titulo)}</h3>${of.selo ? `<span class="badge">${h(of.selo)}</span>` : ""}</div>
        <div class="meta">${of.medidas.map(m => `<div><b>${h(m.valor)}</b>${h(m.texto)}</div>`).join("")}</div>
        <h4>${h(of.tituloEntregas)}</h4>
        <ol>
          ${of.entregas.map(li).join("")}
        </ol>
        <div class="acts">
          <a class="btn btn-wa" data-whatsapp data-fallback="Agendar o diagnóstico" data-fallback-href="#contato" href="#contato" data-ev="whatsapp:oferta">
            ${SVG_WA}
            <span>${h(of.botao)}</span></a>
          <a class="alt" href="#contato" data-ev="cta:oferta">${h(of.alternativa)}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== 02 · PROCESSOS ===================== -->
<section class="tint" id="processos" aria-labelledby="h-proc">
  <div class="wrap">
    <div class="fr-head rv">
      <div>${eyebrow("02", pr.rotulo)}
        <h2 id="h-proc">${marcar(pr.titulo)}</h2></div>
      <p class="lead">${marcar(pr.lead)}</p>
    </div>
    <div class="procs">
${pr.cartoes.map((k, i) => `      <div class="proc${CLS[i]} rv"><span class="k">${h(k.rotulo)}</span><h3>${h(k.titulo)}</h3>
        <p>${marcar(k.texto)}</p>
        <ul>${k.itens.map(li).join("")}</ul></div>`).join("\n")}
    </div>
  </div>
  <div class="band" style="margin-top:34px;padding:clamp(34px,4.5vw,56px) 0">
    <div class="wrap">
      <div class="flowstage rv">
        <div class="cap"><i aria-hidden="true"></i><b>Processo ao vivo</b> · da negociação ao faturamento · setembro</div>
        <div id="procflow"></div>
      </div>
      <div class="leak rv">
        <div><b class="t">O que o processo mostra em trinta segundos</b>
          <p>A venda fecha <strong>214 contratos</strong> e a instalação entrega <strong>169</strong>. Os 45 que somem
            já estavam vendidos — a perda não está dentro de nenhuma área, está entre elas. Nenhum relatório de setor aponta isso.</p></div>
        <div class="sum"><div>contratos parados<b>45</b></div><div>mensalidade média<b>R$ 104</b></div><div>receita que não entra<b>R$ 4.680/mês</b></div></div>
      </div>
      <p class="entrega rv">Entrega · <b>${marcar(pr.entrega)}</b></p>
    </div>
  </div>
</section>

<!-- ===================== 03 · DASHBOARD ===================== -->
<section class="hud" id="dashboard" aria-labelledby="h-dash">
  <div class="wrap">
    <div class="hud-head">
      <div class="rv">${eyebrow("03", db.rotulo)}
        <h2 id="h-dash" style="font-size:clamp(1.7rem,3.6vw,2.7rem);margin-top:14px">${marcar(db.titulo)}</h2>
        <p class="lead" style="margin-top:14px">${marcar(db.lead)}</p></div>
      <div class="rv">
        <div class="phone" aria-hidden="true"><div class="screen">
          <div class="sh"><span>Diretoria</span><b>ao vivo</b></div>
          <div class="kp"><div class="lb">Base ativa</div><div class="vl">12.480 <small>+128</small></div></div>
          <div class="kp"><div class="lb">Caixa hoje</div><div class="vl">R$ 41,2 mil <small>+8,4%</small></div></div>
          <div class="kp"><div class="lb">Inadimplência</div><div class="vl">4,8% <small class="o">meta 3,5%</small></div></div>
          <div class="kp ch"><div class="lb">Ativações · 7 dias</div><div class="chart" id="phChart"></div></div>
        </div></div>
        <p class="phone-cap">${h(db.legendaCelular)}</p>
      </div>
    </div>
    <div class="hud-tools rv">
      <div class="seg" role="group" aria-label="Período">
        <button type="button" data-periodo="7d" aria-pressed="false">7 dias</button>
        <button type="button" data-periodo="30d" aria-pressed="false">30 dias</button>
        <button type="button" data-periodo="12m" aria-pressed="true">12 meses</button>
      </div>
      <span class="hud-live"><i aria-hidden="true"></i>dados ilustrativos · atualizando</span>
    </div>
    <div class="monitor rv"><div class="pt">Recebimentos · agora <span id="monNow">R$ 0</span></div><div class="chart" id="monitor"></div></div>
    <div class="panels">
      <div class="panel rv" data-panel="ativ"><span class="pt">Ativações · <span class="per">12 meses</span></span><div class="pv">214</div><div class="pd">+9,7% vs. período anterior</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="churn"><span class="pt">Churn · <span class="per">12 meses</span></span><div class="pv">1,62%</div><div class="pd">−0,4 p.p. no período</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="inad"><span class="pt">Inadimplência · <span class="per">12 meses</span></span><div class="pv">4,8%</div><div class="pd or">meta 3,5%</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="prod"><span class="pt">Produtividade de campo · <span class="per">12 meses</span></span><div class="pv">92%</div><div class="pd">meta 85%</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="cresc"><span class="pt">Receita acumulada · <span class="per">12 meses</span></span><div class="pv">+31,5%</div><div class="pd">no período</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="gauge"><span class="pt">Controles implantados</span><div class="pv">75%</div><div class="pd or">12 em plano de ação</div><div class="chart"></div></div>
    </div>
    <div class="after rv">
      <div><span class="mono">Antes e depois · exemplo</span><h3>Seis meses de rito, os mesmos quatro números.</h3>
        <p>Os indicadores que mais mudam quando o processo passa a ser medido toda semana — no provedor-exemplo, de março a setembro.</p>
        <div class="lg"><i>antes</i><i class="b">depois</i></div></div>
      <div class="chart" id="dAfter"></div>
    </div>
  </div>
</section>

<!-- ===================== MODELOS + FIT ===================== -->
<section class="tint" id="modelos" aria-labelledby="h-modelos">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(mo.rotulo)}</span><h2 id="h-modelos">${marcar(mo.titulo)}</h2></div>
      <p class="hint">${marcar(mo.apoio)}</p></div>
    <div class="cards">
${mo.cartoes.map(k => `      <div class="card rv"><span class="tagm">${h(k.tag)}</span><h3>${h(k.titulo)}</h3><p>${marcar(k.texto)}</p>
        <ul class="inc">${k.itens.map(li).join("")}</ul>
        <div class="for"><b>Para quem</b> ${marcar(k.paraQuem)}</div></div>`).join("\n")}
    </div>
    <p class="models-note">${h(mo.nota)}</p>
    <div class="sec-head rv" style="margin-top:52px"><div><span class="mono">${h(pf.rotulo)}</span><h2>${marcar(pf.titulo)}</h2></div></div>
    <div class="fit">
      <div class="rv"><h4>${h(pf.serveTitulo)}</h4><ul class="yes">${pf.serve.map(li).join("")}</ul></div>
      <div class="rv"><h4>${h(pf.naoServeTitulo)}</h4><ul class="no">${pf.naoServe.map(li).join("")}</ul></div>
    </div>
  </div>
</section>

<!-- ===================== FAQ ===================== -->
<section id="faq" aria-labelledby="h-faq">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(fq.rotulo)}</span><h2 id="h-faq">${marcar(fq.titulo)}</h2></div></div>
    <div class="faq rv">
${fq.itens.map(q => `      <details><summary>${h(q.pergunta)}</summary>${marcar(q.resposta, { paragrafos: true })}</details>`).join("\n")}
    </div>
  </div>
</section>

</main>

<footer id="contato">
  <div class="wrap">
    <div class="foot-grid">
      <div class="rv">
        <img class="foot-logo" src="/assets/marca/01-logo/baishift-branco.svg" alt="Baishift" width="911" height="175">
        <span class="mono" style="color:#8FB4FF;display:block;margin-bottom:14px">${h(ct.rotulo)}</span>
        <h2>${marcar(ct.titulo)}</h2>
        <p style="margin-top:16px;color:rgba(255,255,255,.72);max-width:44ch">${marcar(ct.texto)}</p>
        <div class="contact-acts">
          <a class="btn btn-wa" data-whatsapp data-fallback="Enviar por e-mail" data-fallback-href="mailto:${h(st.email)}?subject=${encodeURIComponent("Diagnóstico de gestão do provedor")}" href="#contato" data-ev="whatsapp:rodape">
            ${SVG_WA}
            <span>${h(ct.botaoWhatsapp)}</span></a>
          <a class="alt" href="mailto:${h(st.email)}">${h(st.email)}</a>
        </div>
        <div class="areas">
${ct.areas.map(a => `          <div><b>${h(a.titulo)}</b><span>${h(a.texto)}</span></div>`).join("\n")}
        </div>
      </div>
      <form class="form rv" id="lead" novalidate>
        <h3>${h(ct.formulario.titulo)}</h3>
        <p class="fh">${h(ct.formulario.subtitulo)}</p>
        <div class="fgrid">
          <label>Seu nome<input name="nome" type="text" autocomplete="name" required placeholder="Como quer ser chamado"></label>
          <label>Provedor<input name="provedor" type="text" autocomplete="organization" required placeholder="Nome do provedor"></label>
          <label>Cidade / UF<input name="cidade" type="text" autocomplete="address-level2" placeholder="Ex.: Rolim de Moura / RO"></label>
          <label>Assinantes<select name="assinantes" required><option value="" disabled selected>Faixa</option><option>até 2 mil</option><option>2 a 5 mil</option><option>5 a 15 mil</option><option>15 a 50 mil</option><option>mais de 50 mil</option></select></label>
          <label class="full">Sistema de gestão<select name="sistema" required><option value="" disabled selected>Qual ERP o provedor usa</option><option>IXC Soft</option><option>IXC Soft + OPA Suite</option><option>Outro sistema</option></select></label>
          <label class="full">Como a gestão funciona hoje<textarea name="msg" placeholder="Onde o processo trava, o que você quer enxergar e ainda não enxerga"></textarea></label>
        </div>
        <div class="send"><button class="btn btn-1" type="submit">Enviar</button><span class="note" id="fnote">Abre o seu e-mail com a mensagem pronta para enviar.</span></div>
        <div class="ok" id="fok" hidden>Mensagem preparada. Se a janela não abriu, escreva para ${h(st.email)}.</div>
      </form>
    </div>
    ${footEnd(st, { href: "#topo", texto: "Voltar ao topo ↑" })}
    <p class="foot-note">${h(st.notaRodape)}</p>
  </div>
</footer>

<a class="wa" data-whatsapp data-fallback="Falar com a Baishift" data-fallback-href="#contato" href="#contato" aria-label="Falar com a Baishift" data-ev="whatsapp:flutuante">
  ${SVG_WA}
  <span>Falar no WhatsApp</span>
</a>

<script src="/assets/js/site.js" defer></script>

<script type="application/ld+json">
${jsonEmbutido(ld)}
</script>
</body>
</html>
`;
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/render.test.js`
Expected: `# pass 10`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add templates/index.js test/render.test.js
git commit -m "Modelo da página principal gerado do JSON"
```

---

### Task 6: Modelo da página de produto (`templates/produto.js`)

**Files:**
- Create: `templates/produto.js`
- Modify: `test/render.test.js` (acrescentar no fim)

- [ ] **Step 1: Acrescentar os testes de produto no fim de `test/render.test.js`**

```js
const paginaProduto = require("../templates/produto");

const produtoCom = mudanca => { const o = base(); Object.assign(o.produtos[0], mudanca); const c = validar(o); return [c.produtos[0], c]; };

test("produto padrão: arte com letra e chips, como funciona, lista de espera", () => {
  const html = paginaProduto(...produtoCom({}));
  assert.ok(html.includes('<span class="glyph">S</span>'));
  assert.equal(conta(html, /class="chip c/g), 3);
  assert.equal(conta(html, /class="feat rv"/g), 3);
  assert.ok(html.includes('<div class="ic">01</div>'));
  assert.ok(html.includes('id="lista"'));
  assert.ok(html.includes('data-ev="lista:severino"'));
  assert.ok(html.includes('<body style="--ac:#F5A300">'));
  assert.ok(html.includes('<a href="/outros/aprova-ordem" data-ev="menu:outros:aprova-ordem">Aprova · Ordem</a>'));
  assert.ok(!html.includes("lp-blocos"));
});

test("produto com capa troca a arte", () => {
  const html = paginaProduto(...produtoCom({ capa: { arquivo: "conteudo/imagens/severino-capa-aaaaaaaa.webp", alt: "Tela do Severino" } }));
  assert.ok(html.includes('class="lp-art lp-capa"'));
  assert.ok(html.includes('alt="Tela do Severino"'));
  assert.ok(!html.includes('class="glyph"'));
});

test("produto com ícone usa a imagem no lugar da letra", () => {
  const [p, c] = produtoCom({ icone: { arquivo: "conteudo/imagens/severino-icone-bbbbbbbb.png", alt: "" } });
  assert.ok(paginaProduto(p, c).includes('<span class="glyph"><img src="/conteudo/imagens/severino-icone-bbbbbbbb.png" alt=""></span>'));
  assert.ok(paginaInicio(c).includes('<span class="mk" aria-hidden="true"><img src="/conteudo/imagens/severino-icone-bbbbbbbb.png" alt=""></span>'));
});

test("produto sem lista de espera: sem faixa, sem botão do topo, CTA vira contato", () => {
  const html = paginaProduto(...produtoCom({ listaEspera: { ativa: false, convite: "", campo: "", placeholder: "" } }));
  assert.ok(!html.includes('id="lista"'));
  assert.ok(!html.includes("Entrar na lista"));
  assert.ok(html.includes('<a class="cta" href="/#contato">Falar com a Baishift</a>'));
});

test("blocos de cada tipo, na ordem", () => {
  const blocos = [
    { tipo: "texto", titulo: "Título *azul*", texto: "p1\n\np2" },
    { tipo: "imagem", arquivo: "conteudo/imagens/severino-foto-cccccccc.webp", alt: "Foto", legenda: "Legenda" },
    { tipo: "imagemTexto", arquivo: "conteudo/imagens/severino-foto-cccccccc.webp", alt: "Foto", titulo: "Lado", texto: "t", imagemDireita: true },
    { tipo: "lista", titulo: "Lista", itens: ["um", "dois"] },
    { tipo: "destaque", titulo: "Chamada", texto: "x", botao: { texto: "Quero", link: "https://a.b" } }
  ];
  const html = paginaProduto(...produtoCom({ blocos }));
  const ordem = ["bl-texto", "bl-imagem rv", "bl-imagem-texto dir", "bl-lista", "bl-destaque"].map(k => html.indexOf(k));
  assert.deepEqual(ordem.map(i => i > 0), [true, true, true, true, true]);
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, "blocos fora de ordem");
  assert.ok(html.includes("<h2>Título <em>azul</em></h2><p>p1</p>\n<p>p2</p>"));
  assert.ok(html.includes("<figcaption>Legenda</figcaption>"));
  assert.ok(html.includes('data-ev="bloco:severino:5"'));
  assert.ok(html.includes('href="https://a.b" style="background:#F5A300"'));
});

test("imagem pendente vira URL do painel", () => {
  const html = paginaProduto(...produtoCom({ capa: { arquivo: "pendente:0123456789abcdef01234567", alt: "x" } }), { previa: true });
  assert.ok(html.includes('src="/gestor/api/pendentes/0123456789abcdef01234567"'));
  assert.ok(html.includes('data-previa=""'));
});

test("produto sem 'como funciona' não gera a seção", () => {
  const html = paginaProduto(...produtoCom({ comoFunciona: { rotulo: "", titulo: "", itens: [] } }));
  assert.ok(!html.includes("lp-feats"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/render.test.js`
Expected: FAIL com `Cannot find module '../templates/produto'`

- [ ] **Step 3: Implementar**

```js
/* Modelo das landing pages dos produtos do menu Outros. */
"use strict";
const { h, marcar, urlImagem } = require("../lib/html");
const { AVISO, head, barraProduto, footEnd } = require("./comum");

function arte(p, o) {
  if (p.capa.arquivo) return `<div class="lp-art lp-capa"><img src="${h(urlImagem(p.capa.arquivo, o))}" alt="${h(p.capa.alt)}" loading="eager"></div>`;
  return `<div class="lp-art" aria-hidden="true">
          <span class="glyph">${p.icone.arquivo ? `<img src="${h(urlImagem(p.icone.arquivo, o))}" alt="">` : h(p.letra)}</span>
          ${p.chips.map((c, i) => `<span class="chip c${i + 1}"><i></i>${h(c)}</span>`).join("\n          ")}
        </div>`;
}

const titulo = t => t ? `<h2>${marcar(t)}</h2>` : "";

function blocoHtml(b, i, p, o) {
  const img = () => `<img src="${h(urlImagem(b.arquivo, o))}" alt="${h(b.alt)}" loading="lazy">`;
  switch (b.tipo) {
    case "texto":
      return `<div class="bl bl-texto rv">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}</div>`;
    case "imagem":
      return `<figure class="bl bl-imagem rv">${img()}${b.legenda ? `<figcaption>${h(b.legenda)}</figcaption>` : ""}</figure>`;
    case "imagemTexto":
      return `<div class="bl bl-imagem-texto${b.imagemDireita ? " dir" : ""} rv">${img()}<div class="txt">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}</div></div>`;
    case "lista":
      return `<div class="bl bl-lista rv">${titulo(b.titulo)}<ul>${b.itens.map(s => `<li>${marcar(s)}</li>`).join("")}</ul></div>`;
    case "destaque":
      return `<div class="bl bl-destaque rv">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}${b.botao.texto ? `<a class="btn btn-1" href="${h(b.botao.link || "#")}" style="background:${h(p.cor)}" data-ev="bloco:${p.slug}:${i + 1}">${h(b.botao.texto)}</a>` : ""}</div>`;
  }
  return "";
}

module.exports = function paginaProduto(p, c, o = {}) {
  const st = c.site, cf = p.comoFunciona, le = p.listaEspera, cor = h(p.cor);
  const comoFunciona = cf.itens.length ? `
  <section aria-labelledby="h-como">
    <div class="wrap">
      <div class="sec-head rv"><div><span class="mono" style="color:${cor}">${h(cf.rotulo)}</span><h2 id="h-como">${marcar(cf.titulo)}</h2></div></div>
      <div class="lp-feats">
        ${cf.itens.map((f, i) => `<div class="feat rv"><div class="ic">${String(i + 1).padStart(2, "0")}</div><h3>${h(f.titulo)}</h3><p>${marcar(f.texto)}</p></div>`).join("\n        ")}
      </div>
    </div>
  </section>` : "";
  const blocos = p.blocos.length ? `
  <section class="lp-blocos" aria-label="Mais sobre ${h(p.nome)}">
    <div class="wrap">
      ${p.blocos.map((b, i) => blocoHtml(b, i, p, o)).join("\n      ")}
    </div>
  </section>` : "";
  const lista = le.ativa ? `
  <div class="lp-band" id="lista">
    <div class="wrap">
      <div class="rv">
        <span class="mono" style="color:${cor};display:block;margin-bottom:14px">Lista de espera</span>
        <h2>${marcar(le.convite)}</h2>
        <p style="margin-top:16px">Sem spam: um aviso quando abrir, e só.</p>
      </div>
      <form class="form rv" data-mail="Lista de espera · ${h(p.nome)}" data-ev="lista:${p.slug}" novalidate>
        <h3>Quero ser avisado</h3>
        <p class="fh">Dois campos. O aviso vai por e-mail.</p>
        <div class="fgrid">
          <label>Seu nome<input name="nome" type="text" autocomplete="name" required placeholder="Como quer ser chamado"></label>
          <label>Seu e-mail<input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>
          ${le.campo ? `<label class="full">${h(le.campo)}<input name="detalhe" type="text" placeholder="${h(le.placeholder)}"></label>` : ""}
        </div>
        <div class="send"><button class="btn btn-1" type="submit" style="background:${cor}">Entrar na lista</button><span class="note">Abre o seu e-mail com a mensagem pronta para enviar.</span></div>
        <div class="ok" hidden>Mensagem preparada. Se a janela não abriu, escreva para ${h(st.email)}.</div>
      </form>
    </div>
  </div>` : "";

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: p.nome + " — Baishift", descricao: p.descricao, descricaoSocial: p.descricao, caminho: "/outros/" + p.slug, site: st, manifesto: false, previa: o.previa })}
</head>
<body style="--ac:${cor}">

${barraProduto(p, c)}

<main id="topo">
  <div class="lp-hero">
    <div class="wrap">
      <div class="rv">
        <span class="who"><i aria-hidden="true"></i>${h(p.publico)}</span>
        <h1>${marcar(p.titulo)}</h1>
        <p class="lead">${marcar(p.lead)}</p>
        ${p.status ? `<span class="status"><b aria-hidden="true"></b>${h(p.status)}</span>` : ""}
        <div class="hero-acts" style="margin-top:26px">${le.ativa ? `<a class="btn btn-1" href="#lista" style="background:${cor}" data-ev="lista:${p.slug}">Entrar na lista de espera</a>` : ""}<a class="btn btn-2" href="/">Voltar para a Baishift</a></div>
      </div>
      <div class="rv">
        ${arte(p, o)}
      </div>
    </div>
  </div>
${comoFunciona}
${blocos}
${lista}
</main>

<footer class="lp-foot">
  <div class="wrap">
    ${footEnd(st, { href: "/", texto: "Voltar para a Baishift ↑" })}
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/render.test.js`
Expected: `# pass 17`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add templates/produto.js test/render.test.js
git commit -m "Modelo da página de produto com capa, ícone e blocos livres"
```

---

### Task 7: Orquestrador (`lib/render.js`) e ferramenta de build

**Files:**
- Create: `lib/render.js`, `tools/build-site.mjs`
- Delete: `tools/build-outros.mjs`
- Modify: `test/render.test.js` (acrescentar no fim), `package.json`, `.gitignore`

- [ ] **Step 1: Acrescentar os testes no fim de `test/render.test.js`**

```js
const { paginas, sitemap, gerarTudo } = require("../lib/render");

test("sitemap só com produtos ativos e data do conteúdo", () => {
  const o = base(); o.produtos[2].ativo = false; o.atualizadoEm = "2026-09-03T10:00:00Z";
  const xml = sitemap(validar(o));
  assert.ok(xml.includes("<loc>https://www.baishift.com.br/</loc><lastmod>2026-09-03</lastmod>"));
  assert.ok(xml.includes("/outros/severino</loc>"));
  assert.ok(!xml.includes("aprova-suficiencia"));
});

test("paginas devolve um arquivo por página ativa", () => {
  const o = base(); o.produtos[1].ativo = false;
  const arq = paginas(validar(o));
  assert.deepEqual(Object.keys(arq).sort(), ["index.html", "outros/aprova-suficiencia.html", "outros/severino.html", "sitemap.xml"]);
});

test("gerarTudo grava, remove páginas de produtos que saíram e devolve o relatório", () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "baishift-"));
  fs.mkdirSync(path.join(raiz, "outros"));
  fs.writeFileSync(path.join(raiz, "outros", "velho.html"), "x");
  const o = base(); o.produtos[2].ativo = false;
  const r = gerarTudo(validar(o), raiz);
  assert.deepEqual(r.escritos.sort(), ["index.html", "outros/aprova-ordem.html", "outros/severino.html", "sitemap.xml"]);
  assert.deepEqual(r.removidos, ["outros/velho.html"]);
  assert.ok(fs.existsSync(path.join(raiz, "index.html")));
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "velho.html")));
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "aprova-suficiencia.html")));
  assert.equal(fs.readdirSync(raiz).filter(f => f.includes(".tmp-")).length, 0, "não sobra arquivo temporário");
  fs.rmSync(raiz, { recursive: true, force: true });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/render.test.js`
Expected: FAIL com `Cannot find module '../lib/render'`

- [ ] **Step 3: Implementar `lib/render.js`**

```js
/* Gera as páginas do site a partir do conteúdo validado.
   paginas() devolve { "caminho/relativo": conteudo } — é o que o publicar commita;
   gerarTudo() grava isso no disco e apaga páginas de produtos que deixaram de existir. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const paginaInicio = require("../templates/index");
const paginaProduto = require("../templates/produto");
const { HOST } = require("../templates/comum");

function sitemap(c) {
  const dia = (c.atualizadoEm || new Date().toISOString()).slice(0, 10);
  const url = (loc, pri) => `  <url><loc>${loc}</loc><lastmod>${dia}</lastmod><changefreq>monthly</changefreq><priority>${pri}</priority></url>`;
  const linhas = [url(HOST + "/", "1.0")].concat(c.produtos.filter(p => p.ativo).map(p => url(HOST + "/outros/" + p.slug, "0.6")));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;
}

function paginas(c, o) {
  const saida = { "index.html": paginaInicio(c, o), "sitemap.xml": sitemap(c) };
  for (const p of c.produtos) if (p.ativo) saida["outros/" + p.slug + ".html"] = paginaProduto(p, c, o);
  return saida;
}

/* escreve num temporário e renomeia: quem lê nunca vê um arquivo pela metade */
function escreverAtomico(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = arquivo + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, conteudo);
  fs.renameSync(tmp, arquivo);
}

function gerarTudo(c, raiz) {
  const arquivos = paginas(c), escritos = Object.keys(arquivos), removidos = [];
  for (const rel of escritos) escreverAtomico(path.join(raiz, rel), arquivos[rel]);
  const outros = path.join(raiz, "outros");
  if (fs.existsSync(outros)) {
    for (const f of fs.readdirSync(outros)) {
      if (f.endsWith(".html") && !arquivos["outros/" + f]) { fs.unlinkSync(path.join(outros, f)); removidos.push("outros/" + f); }
    }
  }
  return { escritos, removidos };
}

module.exports = { paginaInicio, paginaProduto, sitemap, paginas, gerarTudo, escreverAtomico };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/render.test.js`
Expected: `# pass 20`, `# fail 0`

- [ ] **Step 5: Criar `tools/build-site.mjs` e apagar `tools/build-outros.mjs`**

```js
/* Gera index.html, outros/*.html e sitemap.xml a partir de conteudo/site.json.
   Rode depois de editar o JSON à mão: node tools/build-site.mjs */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { carregar } = require("../lib/conteudo.js");
const { gerarTudo } = require("../lib/render.js");

const raiz = fileURLToPath(new URL("../", import.meta.url));
try {
  const r = gerarTudo(carregar(), raiz);
  r.escritos.forEach(f => console.log("gerado   " + f));
  r.removidos.forEach(f => console.log("removido " + f));
} catch (e) {
  console.error("conteúdo inválido: " + e.message);
  process.exit(1);
}
```

```bash
git rm -q tools/build-outros.mjs
```

- [ ] **Step 6: Scripts no `package.json` e `dados/` no `.gitignore`**

`package.json` fica assim:

```json
{
  "name": "baishift-site",
  "version": "1.0.0",
  "private": true,
  "description": "Site institucional da Baishift",
  "scripts": {
    "start": "node server.js",
    "build": "node tools/build-site.mjs",
    "build:single": "node tools/build-single.mjs",
    "test": "node --test test/"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Acrescentar ao fim de `.gitignore`:

```
# disco persistente local do painel (usuários, métricas, imagens pendentes)
dados/
```

- [ ] **Step 7: Rodar tudo**

Run: `npm test`
Expected: `# pass 38`, `# fail 0`

- [ ] **Step 8: Commit**

```bash
git add lib/render.js tools/build-site.mjs test/render.test.js package.json .gitignore
git commit -m "Gerador das páginas e ferramenta build-site (substitui build-outros)"
```

---

### Task 8: Estilos e script do carrossel e dos blocos

**Files:**
- Modify: `assets/css/site.css` (fim da seção HERO, ~linha 165; fim da seção LANDING PAGES, ~linha 178 do trecho lido)
- Modify: `assets/js/site.js` (logo depois do bloco `/* menu "Outros" */`)

- [ ] **Step 1: CSS do carrossel e do início sem visual** — inserir logo depois da regra `.dash-body>div{...}` (fim do bloco do painel do hero):

```css
/* carrossel no lugar do painel demonstrativo */
.carrossel{position:relative;aspect-ratio:16/10;background:var(--navy)}
.carrossel .cs-track{position:absolute;inset:0}
.carrossel .cs-slide{position:absolute;inset:0;opacity:0;transition:opacity .6s ease;display:block}
.carrossel .cs-slide.on{opacity:1;z-index:1}
.carrossel .cs-slide img{width:100%;height:100%;object-fit:cover;display:block}
.carrossel .cs-prev,.carrossel .cs-next{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:38px;height:38px;border-radius:50%;border:0;background:rgba(10,27,61,.55);color:#fff;font-size:1.5rem;line-height:1;cursor:pointer;display:grid;place-items:center;opacity:.85;transition:opacity .2s,background .2s;font-family:inherit}
.carrossel .cs-prev:hover,.carrossel .cs-next:hover{opacity:1;background:rgba(10,27,61,.8)}
.carrossel .cs-prev{left:12px}.carrossel .cs-next{right:12px}
.carrossel .cs-dots{position:absolute;left:0;right:0;bottom:12px;z-index:2;display:flex;justify-content:center;gap:7px}
.carrossel .cs-dots button{width:9px;height:9px;border-radius:50%;border:0;background:rgba(255,255,255,.45);padding:0;cursor:pointer;transition:background .2s}
.carrossel .cs-dots button[aria-selected="true"]{background:#fff}
/* início sem painel e sem carrossel: o texto ocupa a largura toda */
.hero-grid.solo{grid-template-columns:1fr}
.hero-grid.solo h1{max-width:20ch}
.hero-grid.solo .hero-sub{max-width:60ch}
```

- [ ] **Step 2: CSS da capa, do ícone e dos blocos de produto** — inserir logo depois de `.lp-foot .foot-end{margin-top:0}`:

```css
/* capa no lugar da arte com a letra */
.lp-art.lp-capa{aspect-ratio:auto;background:none;display:block;place-items:unset;border-radius:28px}
.lp-art.lp-capa::before,.lp-art.lp-capa::after{display:none}
.lp-art.lp-capa img{display:block;width:100%;height:auto;border-radius:28px}
/* ícone de imagem no lugar da letra (menu e arte) */
.ddm .mk img,.lp-art .glyph img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
/* blocos livres da página do produto */
.lp-blocos{padding-top:0}
.lp-blocos .wrap{display:grid;gap:clamp(26px,4vw,44px);max-width:1100px}
.bl h2{font-size:clamp(1.3rem,2.6vw,1.9rem);margin-bottom:12px}
.bl p{color:var(--muted);max-width:70ch}
.bl p:last-child{margin-bottom:0}
.bl-imagem{margin:0}
.bl-imagem img,.bl-imagem-texto img{width:100%;height:auto;border-radius:16px;display:block}
.bl-imagem figcaption{font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:10px}
.bl-imagem-texto{display:grid;gap:22px;align-items:center}
@media(min-width:820px){.bl-imagem-texto{grid-template-columns:1fr 1fr;gap:36px}.bl-imagem-texto.dir img{order:2}}
.bl-lista ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.bl-lista li{padding-left:18px;position:relative;color:var(--ink)}
.bl-lista li::before{content:"";position:absolute;left:0;top:.55em;width:7px;height:7px;border-radius:2px;background:var(--ac)}
.bl-destaque{background:var(--ink);color:#fff;border-radius:16px;padding:clamp(22px,3vw,34px)}
.bl-destaque h2{color:#fff}
.bl-destaque p{color:rgba(255,255,255,.72)}
.bl-destaque .btn{margin-top:16px;color:#fff}
```

- [ ] **Step 3: JS do carrossel** — inserir em `assets/js/site.js` logo depois do bloco que termina com `/* menu "Outros" */ (function () { ... })();`:

```js
/* carrossel do início: troca sozinho no intervalo, pausa com o mouse, o foco, a aba escondida
   e com prefers-reduced-motion; setas e pontos trocam na mão */
(function () {
  var cs = el("carrossel"); if (!cs) return;
  var slides = cs.querySelectorAll(".cs-slide"), dots = cs.querySelectorAll(".cs-dots button"), n = slides.length;
  if (n < 2) return;
  var i = 0, paused = false, ms = Math.max(3, Math.min(30, +cs.getAttribute("data-intervalo") || 6)) * 1000;
  function go(k) {
    i = (k + n) % n;
    for (var j = 0; j < n; j++) {
      var on = j === i;
      slides[j].classList.toggle("on", on);
      slides[j].setAttribute("aria-hidden", on ? "false" : "true");
      if (slides[j].tagName === "A") { if (on) slides[j].removeAttribute("tabindex"); else slides[j].setAttribute("tabindex", "-1"); }
      if (dots[j]) dots[j].setAttribute("aria-selected", on ? "true" : "false");
    }
    cs.dispatchEvent(new CustomEvent("slide", { detail: i }));
  }
  cs.querySelector(".cs-prev").addEventListener("click", function () { go(i - 1); });
  cs.querySelector(".cs-next").addEventListener("click", function () { go(i + 1); });
  Array.prototype.forEach.call(dots, function (d, k) { d.addEventListener("click", function () { go(k); }); });
  cs.addEventListener("pointerenter", function () { paused = true; });
  cs.addEventListener("pointerleave", function () { paused = false; });
  cs.addEventListener("focusin", function () { paused = true; });
  cs.addEventListener("focusout", function () { paused = false; });
  everyMs(ms, function () { if (!paused) go(i + 1); });
})();
```

- [ ] **Step 4: Conferir sintaxe**

Run: `node --check assets/js/site.js && echo ok`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add assets/css/site.css assets/js/site.js
git commit -m "Carrossel do início e estilos dos blocos de produto"
```

---

### Task 9: Gerar o site e conferir que ficou igual

**Files:**
- Regenerated: `index.html`, `outros/*.html`, `sitemap.xml`
- Modify: `tools/build-single.mjs`

- [ ] **Step 1: Gerar**

Run: `npm run build`
Expected:
```
gerado   index.html
gerado   sitemap.xml
gerado   outros/severino.html
gerado   outros/aprova-ordem.html
gerado   outros/aprova-suficiencia.html
```

- [ ] **Step 2: Comparar com a versão commitada ignorando espaços**

Run: `git diff -w --stat && git diff -w index.html | grep '^[-+]' | grep -v '^[-+][-+]' | head -120`

As únicas diferenças aceitas em `index.html`:
1. a linha `<!-- GERADO ... -->` depois do `<!DOCTYPE html>`;
2. caminhos de assets com `/` na frente (`/assets/...`, `/site.webmanifest`, `/favicon.ico`) e links dos produtos `/outros/...`;
3. `twitter:description` igual ao `og:description`;
4. atributos `data-ev="..."` nos botões, links do menu Outros e formulário;
5. o JSON-LD numa linha só, com as respostas do FAQ completas (iguais ao HTML) e `addressLocality`/`addressRegion` vindos de `site.cidade`;
6. o comentário do `window.BAISHIFT` com o texto novo.

Em `outros/*.html`, além das mesmas: o `<head>` completo (og:image dims, twitter:title, apple-touch-icon com sizes, `author`), o `data-ev` no formulário e nos links de menu, e a `<span class="status">` só se houver status.

Qualquer outra diferença (texto trocado, tag faltando, atributo perdido) é bug no modelo: corrigir `templates/*.js` e repetir os passos 1 e 2 até sobrar só a lista acima. Rodar `npm test` depois de cada correção.

- [ ] **Step 3: Ajustar `tools/build-single.mjs` para os caminhos absolutos**

Trocar as duas linhas de `swap` e o laço das logos:

```js
html = swap(html, '<link rel="stylesheet" href="/assets/css/site.css">', "<style>\n" + css + "\n</style>");
html = swap(html, '<script src="/assets/js/site.js" defer></script>', "<script>\n" + js + "\n</script>");
html = html
  // o ícone vira data URI para o arquivo continuar autossuficiente
  .replace('<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">',
           '<link rel="icon" href="data:image/svg+xml,' +
           encodeURIComponent(read("assets/img/favicon.svg").replace(/\n\s*/g, "")) + '">')
  .replace(/\n\s*<link rel="alternate icon"[^>]*>/, "")
  .replace(/\n\s*<link rel="apple-touch-icon"[^>]*>/, "")
  .replace(/\n\s*<link rel="manifest"[^>]*>/, "");

/* svgs da marca embutidos como data URI: o arquivo único não depende de caminhos */
for (const f of ["assets/marca/01-logo/baishift-principal.svg", "assets/marca/01-logo/baishift-branco.svg"]) {
  const uri = "data:image/svg+xml," + encodeURIComponent(read(f).replace(/\n\s*/g, ""));
  html = html.split("/" + f).join(uri);
}
```

Run: `npm run build:single`
Expected: `dist/baishift-site.html · NNN KB` (sem erro)

- [ ] **Step 4: Subir o servidor atual e abrir as páginas**

Run: `PORT=8900 node server.js & PID=$!; sleep 1; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8900/; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8900/outros/severino; curl -s http://localhost:8900/ | grep -c 'site.css?v='; kill $PID`
Expected: `200`, `200`, `1`

- [ ] **Step 5: Commit**

```bash
git add -A index.html outros sitemap.xml tools/build-single.mjs
git commit -m "Site gerado a partir de conteudo/site.json"
```

---

### Task 10: Servidor gera ao subir e esconde os arquivos novos

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Gerar o site no boot** — logo depois de `const PORTA = process.env.PORT || 3000;`:

```js
/* o site é gerado do conteudo/site.json antes de atender: o HTML no disco é sempre o do JSON */
const { carregar } = require("./lib/conteudo");
const { gerarTudo } = require("./lib/render");
try {
  const r = gerarTudo(carregar(), RAIZ);
  console.log("conteúdo gerado: " + r.escritos.length + " arquivos" + (r.removidos.length ? ", " + r.removidos.length + " removidos" : ""));
} catch (e) {
  console.error("conteúdo inválido, o servidor não vai subir: " + e.message);
  process.exit(1);
}
```

- [ ] **Step 2: Não servir o que é do projeto e do painel** — trocar as duas linhas de `FORA`/`PASTAS_FORA` por:

```js
/* arquivos do projeto que não fazem parte do site e não devem ser servidos */
const FORA = new Set(["server.js", "package.json", "package-lock.json", "readme.md"]);
const PASTAS_FORA = new Set(["tools", "dist", "node_modules", "lib", "templates", "gestor", "test", "docs", "dados"]);
const CAMINHOS_FORA = new Set(["conteudo/site.json"]);
```

e, em `resolver()`, logo depois de `if (trechos.length === 1 && FORA.has(trechos[0].toLowerCase())) return null;`:

```js
  if (CAMINHOS_FORA.has(trechos.join("/"))) return null;
```

- [ ] **Step 3: Cache longo para as imagens do conteúdo** (nome por conteúdo) — em `enviar()`, trocar `const versionado = rel in VERSAO;` por:

```js
  const versionado = rel in VERSAO || rel.startsWith("conteudo/imagens/");
```

- [ ] **Step 4: Conferir**

Run: `PORT=8900 node server.js & PID=$!; sleep 1; for p in / /outros/severino /conteudo/site.json /lib/conteudo.js /templates/index.js /gestor/ /test/html.test.js; do printf "%s " $p; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8900$p; done; kill $PID`
Expected:
```
conteúdo gerado: 5 arquivos
/ 200
/outros/severino 200
/conteudo/site.json 404
/lib/conteudo.js 404
/templates/index.js 404
/gestor/ 404
/test/html.test.js 404
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Servidor gera o site do JSON ao subir e não serve lib, templates, gestor e dados"
```

---

### Task 11: README da fase 1

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Atualizar a seção "Estrutura"** — trocar o bloco de árvore por:

```
conteudo/site.json      FONTE DA VERDADE dos textos, produtos e carrossel — edite aqui (ou pelo painel)
conteudo/imagens/       imagens enviadas pelo painel
templates/*.js          modelos das páginas (index, produto, partes comuns)
lib/                    validação do conteúdo, helpers de HTML, gerador das páginas
index.html              GERADO a partir do JSON: página principal
outros/*.html           GERADOS: landing pages dos produtos do menu Outros
sitemap.xml             GERADO
404.html                página de erro
assets/css/site.css     estilos (paleta, componentes, responsivo, landing pages, carrossel)
assets/js/site.js       motor de gráficos SVG, animações contínuas, menu, carrossel, formulários
assets/marca/           kit oficial da marca V2 (logos, ícones, favicons, social, papelaria; guia em identidade-baishift.html)
assets/img/             favicon e ícones do app (copiados do kit) e imagem de compartilhamento
server.js               servidor (Railway): gera o site do JSON ao subir, URLs limpas, cache versionado, 404
test/                   testes (npm test)
robots.txt · site.webmanifest · favicon.ico
dist/                   versão em arquivo único (gerada)
tools/                  geradores (site, arquivo único, imagens) e verificação
```

e logo abaixo acrescentar o parágrafo:

**Não edite `index.html` nem `outros/*.html` à mão**: eles são regerados a partir de `conteudo/site.json` toda vez que o servidor sobe. Para mudar um texto, edite o JSON e rode `npm run build` (ou use o painel em `/gestor`, quando estiver no ar). Títulos aceitam `*trecho*` para o destaque em cor, `**trecho**` para negrito e `[texto](url)` para link; em textos longos, linha em branco separa parágrafos.

- [ ] **Step 2: Atualizar "Manutenção" e "Scripts auxiliares"**

Em Manutenção, trocar a linha **Landing pages.** por:
`**Landing pages e textos.** Tudo em \`conteudo/site.json\`; rode \`npm run build\` para regerar.`

Trocar a linha **FAQ.** por:
`**FAQ.** Só em \`conteudo/site.json\` — o HTML e o JSON-LD \`FAQPage\` saem dos mesmos itens.`

Em Scripts auxiliares, trocar `node tools/build-outros.mjs ...` por:
`npm run build                  # regera index.html, outros/*.html e sitemap.xml a partir de conteudo/site.json`
e acrescentar:
`npm test                       # testes do gerador e da validação do conteúdo`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "README: site gerado a partir de conteudo/site.json"
```

---

## Verificação final da fase

- [ ] `npm test` → `# fail 0`
- [ ] `npm run build` não muda nada (`git status` limpo)
- [ ] `PORT=8900 npm start` sobe com "conteúdo gerado: 5 arquivos"; `/`, `/outros/severino` respondem 200; `/conteudo/site.json` e `/gestor/` respondem 404
- [ ] Com o servidor no ar, abrir `http://localhost:8900/` no navegador: hero com painel, menu Outros com três itens, FAQ abrindo, WhatsApp caindo no formulário
- [ ] Trocar em `conteudo/site.json` `"painelAtivo": false`, rodar `npm run build`, recarregar: hero só com texto. Voltar para `true` e rodar `npm run build` de novo.
