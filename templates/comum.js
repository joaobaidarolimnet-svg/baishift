/* Partes compartilhadas pelas páginas: <head>, barra de navegação, rodapé, ícone do WhatsApp. */
"use strict";
const { h, jsonEmbutido, urlImagem } = require("../lib/html");

const HOST = "https://www.baishift.com.br";
const AVISO = "<!-- GERADO a partir de conteudo/site.json pelos modelos em templates/. Não edite este arquivo: edite o JSON e rode `node tools/build-site.mjs`, ou use o painel em /gestor. -->";
const SVG_WA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
const SVG_GO = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;
const NAVTOGGLE = '<button class="navtoggle" id="navtoggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="navlinks"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i></button>';

/* As duas portas do site. A ordem vale para o menu, para o hub e para o sitemap. */
const PORTAS = [
  { chave: "provedores", url: "/",           menu: "Provedores" },
  { chave: "apps",       url: "/apps",       menu: "Outros Apps" }
];

function logo(href) {
  return `<a class="brand" href="${href}" aria-label="Baishift — início"><img class="lg lg-white" src="/assets/marca/01-logo/baishift-branco.svg" alt="Baishift" width="911" height="175"></a>`;
}

/* o: titulo, descricao, descricaoSocial, caminho ("/" ou "/apps/x"), site, manifesto, previa */
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
<meta property="og:image:alt" content="Baishift — gestão de provedores, painéis sob medida e aplicativos">
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

/* quadradinho colorido com a letra (ou o ícone) do produto */
function marcaProduto(p, o) {
  return `<span class="mk" aria-hidden="true">${p.icone.arquivo ? `<img src="${h(urlImagem(p.icone.arquivo, o))}" alt="">` : h(p.letra)}</span>`;
}

/* Barra única do site. `atual` é a chave da porta em que a pessoa está ("provedores"
   ou "apps"); `contato` é para onde vai o botão de conversa; `naHome` faz a logo
   rolar para o topo em vez de recarregar a página. */
function barra(atual, contato, naHome) {
  const links = PORTAS.map(pt =>
    `      <a href="${pt.url}"${atual === pt.chave ? ' aria-current="true"' : ""} data-ev="menu:${pt.chave}">${pt.menu}</a>`).join("\n");
  return `<header class="bar" id="bar">
  <div class="bar-in">
    ${logo(naHome ? "#topo" : "/")}
    ${NAVTOGGLE}
    <nav class="navlinks" id="navlinks" aria-label="Navegação principal">
${links}
      <a class="cta" href="${h(contato || "/#contato")}" data-ev="cta:menu">Falar com a Baishift</a>
    </nav>
  </div>
  <div id="prog" aria-hidden="true"></div>
</header>`;
}

/* linha final do rodapé; voltar = { href, texto } */
function footEnd(site, voltar) {
  return `<div class="foot-end"><span>Baishift © <span id="yr">2026</span> · ${h(site.cidade)}</span><span><a href="mailto:${h(site.email)}">${h(site.email)}</a></span><span><a href="${voltar.href}">${voltar.texto}</a></span></div>`;
}

module.exports = { HOST, AVISO, SVG_WA, SVG_GO, PORTAS, head, logo, barra, footEnd, marcaProduto };
