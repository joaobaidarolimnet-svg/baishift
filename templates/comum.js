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
