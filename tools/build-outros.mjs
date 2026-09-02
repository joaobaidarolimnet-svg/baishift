/* Gera as landing pages das outras soluções a partir de um único modelo.
   Rode de novo depois de mudar um texto: node tools/build-outros.mjs */
import { writeFileSync, mkdirSync } from "node:fs";

const PRODUTOS = [
  {
    slug: "severino", nome: "Severino", glyph: "S", ac: "#F5A300", status: "em desenvolvimento",
    who: "Eletricista · Pedreiro · Encanador · Jardineiro",
    titulo: "Ele fala. <em>O Severino anota.</em>",
    lead: "Assistente de IA que organiza a agenda, o orçamento, a cobrança e o recebimento do profissional autônomo — por voz, no WhatsApp, sem planilha e sem aplicativo complicado.",
    desc: "Assistente de IA que organiza agenda, orçamento, cobrança e recebimento do profissional autônomo.",
    chips: ["Orçamento enviado · R$ 850", "Serviço amanhã · 8h", "Pagamento recebido"],
    feats: [
      ["01", "Agenda", "O profissional fala quando vai fazer o serviço e o Severino marca, avisa o cliente e lembra na véspera."],
      ["02", "Orçamento", "Descreve o serviço por voz; o Severino monta o orçamento e manda para o cliente aprovar."],
      ["03", "Cobrança e recebimento", "Quando o serviço termina, a cobrança sai sozinha — e o Severino confirma quando o dinheiro entrou."]
    ],
    convite: "Entre na lista e seja avisado quando o Severino <em>abrir para os primeiros profissionais</em>.",
    campo: "Sua profissão", campoPlaceholder: "Ex.: eletricista"
  },
  {
    slug: "aprova-ordem", nome: "Aprova · Ordem", glyph: "§", ac: "#C0563A", status: "em preparação",
    who: "1ª e 2ª fase do Exame de Ordem",
    titulo: "Questão comentada em <em>linguagem clara</em>, para quem estuda trabalhando.",
    lead: "Banco de questões com explicação direta, mapa de matéria pelo peso real na prova e revisão espaçada — para o candidato que tem uma hora por dia e precisa fazê-la render.",
    desc: "Banco de questões com explicação clara, mapa de matéria por peso na prova e revisão espaçada para o Exame de Ordem.",
    chips: ["Ética · 18% da prova", "Revisão de hoje · 24 questões", "Acerto na semana · 71%"],
    feats: [
      ["01", "Questões comentadas", "Cada alternativa explicada em português simples: por que está certa, por que está errada, o que a banca queria."],
      ["02", "Mapa por peso", "As matérias ordenadas pelo peso que têm na prova, para estudar primeiro o que mais pontua."],
      ["03", "Revisão espaçada", "O que você errou volta no momento certo. O que você acertou sai do caminho."]
    ],
    convite: "Entre na lista e seja avisado quando o Aprova · Ordem <em>abrir a primeira turma</em>.",
    campo: "Próximo exame", campoPlaceholder: "Ex.: 1ª fase, próxima edição"
  },
  {
    slug: "aprova-suficiencia", nome: "Aprova · Suficiência", glyph: "Σ", ac: "#12855A", status: "em preparação",
    who: "Exame de Suficiência do contador",
    titulo: "Simulado no formato do exame, com exemplos de <em>empresa de verdade</em>.",
    lead: "Questões das últimas edições, simulado cronometrado no formato oficial e exemplos tirados da operação real de uma empresa — para chegar no dia da prova já tendo feito a prova.",
    desc: "Questões das últimas edições, simulado cronometrado no formato do exame e exemplos de operação real de empresa.",
    chips: ["Simulado · 50 questões · 4h", "Custos · 82% de acerto", "Última edição resolvida"],
    feats: [
      ["01", "Últimas edições", "As questões que caíram, organizadas por tema, com o gabarito comentado."],
      ["02", "Simulado cronometrado", "O mesmo número de questões, o mesmo tempo, a mesma pressão — antes do dia da prova."],
      ["03", "Exemplos reais", "Lançamentos, fechamento e custos retirados da operação de uma empresa de verdade, não de enunciado inventado."]
    ],
    convite: "Entre na lista e seja avisado quando o Aprova · Suficiência <em>abrir a primeira turma</em>.",
    campo: "Próximo exame", campoPlaceholder: "Ex.: próxima edição"
  }
];

const brand = `<a class="brand" href="/" aria-label="Baishift — início"><img class="lg lg-navy" src="/assets/marca/01-logo/baishift-principal.svg" alt="Baishift" width="911" height="175"><img class="lg lg-white" src="/assets/marca/01-logo/baishift-branco.svg" alt="" aria-hidden="true" width="911" height="175"></a>`;

const page = p => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.nome} — Baishift</title>
<meta name="description" content="${p.desc}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#142F7A">
<link rel="canonical" href="https://baishift.com.br/outros/${p.slug}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Baishift">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="https://baishift.com.br/outros/${p.slug}">
<meta property="og:title" content="${p.nome} — Baishift">
<meta property="og:description" content="${p.desc}">
<meta property="og:image" content="https://baishift.com.br/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="alternate icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<noscript><style>.rv{opacity:1;transform:none}.navlinks{position:static;opacity:1;visibility:visible;pointer-events:auto;transform:none}</style></noscript>
</head>
<body style="--ac:${p.ac}">

<header class="bar" id="bar">
  <div class="bar-in">
    ${brand}
    <button class="navtoggle" id="navtoggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="navlinks"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i></button>
    <nav class="navlinks" id="navlinks" aria-label="Navegação">
      <a href="/">Baishift</a>
      ${PRODUTOS.filter(x => x.slug !== p.slug).map(x => `<a href="/outros/${x.slug}">${x.nome}</a>`).join("\n      ")}
      <a class="cta" href="#lista">Entrar na lista</a>
    </nav>
  </div>
</header>

<main id="topo">
  <div class="lp-hero">
    <div class="wrap">
      <div class="rv">
        <span class="who"><i aria-hidden="true"></i>${p.who}</span>
        <h1>${p.titulo}</h1>
        <p class="lead">${p.lead}</p>
        <span class="status"><b aria-hidden="true"></b>${p.status}</span>
        <div class="hero-acts" style="margin-top:26px"><a class="btn btn-1" href="#lista" style="background:${p.ac}">Entrar na lista de espera</a><a class="btn btn-2" href="/">Voltar para a Baishift</a></div>
      </div>
      <div class="rv">
        <div class="lp-art" aria-hidden="true">
          <span class="glyph">${p.glyph}</span>
          ${p.chips.map((c, i) => `<span class="chip c${i + 1}"><i></i>${c}</span>`).join("\n          ")}
        </div>
      </div>
    </div>
  </div>

  <section aria-labelledby="h-como">
    <div class="wrap">
      <div class="sec-head rv"><div><span class="mono" style="color:${p.ac}">Como funciona</span><h2 id="h-como">Três coisas, feitas direito.</h2></div></div>
      <div class="lp-feats">
        ${p.feats.map(f => `<div class="feat rv"><div class="ic">${f[0]}</div><h3>${f[1]}</h3><p>${f[2]}</p></div>`).join("\n        ")}
      </div>
    </div>
  </section>

  <div class="lp-band" id="lista">
    <div class="wrap">
      <div class="rv">
        <span class="mono" style="color:${p.ac};display:block;margin-bottom:14px">Lista de espera</span>
        <h2>${p.convite}</h2>
        <p style="margin-top:16px">Sem spam: um aviso quando abrir, e só.</p>
      </div>
      <form class="form rv" data-mail="Lista de espera · ${p.nome}" novalidate>
        <h3>Quero ser avisado</h3>
        <p class="fh">Dois campos. O aviso vai por e-mail.</p>
        <div class="fgrid">
          <label>Seu nome<input name="nome" type="text" autocomplete="name" required placeholder="Como quer ser chamado"></label>
          <label>Seu e-mail<input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>
          <label class="full">${p.campo}<input name="detalhe" type="text" placeholder="${p.campoPlaceholder}"></label>
        </div>
        <div class="send"><button class="btn btn-1" type="submit" style="background:${p.ac}">Entrar na lista</button><span class="note">Abre o seu e-mail com a mensagem pronta para enviar.</span></div>
        <div class="ok" hidden>Mensagem preparada. Se a janela não abriu, escreva para contato@baishift.com.br.</div>
      </form>
    </div>
  </div>
</main>

<footer class="lp-foot">
  <div class="wrap">
    <div class="foot-end"><span>Baishift © <span id="yr">2026</span> · Rolim de Moura, RO</span><span><a href="mailto:contato@baishift.com.br">contato@baishift.com.br</a></span><span><a href="/">Voltar para a Baishift ↑</a></span></div>
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;

mkdirSync("outros", { recursive: true });
for (const p of PRODUTOS) { writeFileSync(`outros/${p.slug}.html`, page(p)); console.log("outros/" + p.slug + ".html"); }
