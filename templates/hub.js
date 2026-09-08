/* Modelo da página inicial: o hub com as três portas do site.
   Regra: todo valor do JSON passa por h() ou marcar() antes de entrar no HTML. */
"use strict";
const { h, marcar, semMarcas } = require("../lib/html");
const { HOST, AVISO, SVG_WA, SVG_GO, PORTAS, head, barra } = require("./comum");

module.exports = function paginaHub(c, o = {}) {
  const st = c.site, hb = c.hub;
  const [localidade, uf] = st.cidade.split(",").map(s => s.trim());
  const assunto = encodeURIComponent("Contato — Baishift");

  const portas = hb.portas.map((pt, i) => `      <a class="door" href="${PORTAS[i].url}" data-ev="porta:${PORTAS[i].chave}">
        ${SVG_GO}
        <p class="who">${h(pt.quem)}</p>
        <h2>${h(pt.titulo)}</h2>
        <p>${marcar(pt.texto)}</p>
        <span class="status"><b>${h(pt.seloDestaque)}</b> · ${h(pt.selo)}</span>
      </a>`).join("\n\n");

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfessionalService", "@id": HOST + "/#organizacao", "name": "Baishift", "url": HOST + "/",
      "email": st.email, "description": semMarcas(hb.subtitulo),
      "image": HOST + "/assets/img/og.png", "logo": HOST + "/assets/marca/01-logo/baishift-principal.svg",
      "address": { "@type": "PostalAddress", "addressLocality": localidade || "", "addressRegion": uf || "", "addressCountry": "BR" },
      "areaServed": { "@type": "Country", "name": "Brasil" },
      "knowsAbout": ["Gestão de provedor de internet", "IXC Soft", "Controladoria", "Business intelligence", "Painéis gerenciais", "Aplicativos"],
      "hasOfferCatalog": { "@type": "OfferCatalog", "name": "Frentes de atuação", "itemListElement": hb.portas.map(pt => (
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": pt.titulo, "description": semMarcas(pt.texto) } })) } },
    { "@type": "WebSite", "@id": HOST + "/#site", "url": HOST + "/", "name": "Baishift", "inLanguage": "pt-BR",
      "publisher": { "@id": HOST + "/#organizacao" } }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: st.tituloAba, descricao: st.descricao, descricaoSocial: st.descricaoSocial, caminho: "/", site: st, manifesto: true, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("", "#contato")}

<main id="topo">

<!-- ===================== TOPO ===================== -->
<section class="hub-hero">
  <div class="wrap">
    <h1>${marcar(hb.titulo)}</h1>
    <p>${marcar(hb.subtitulo)}</p>
  </div>
</section>

<!-- ===================== AS TRÊS PORTAS ===================== -->
<section class="doors" aria-label="Escolha o caminho">
  <div class="wrap">

${portas}

  </div>
</section>

<!-- ===================== QUEM FAZ ===================== -->
<section class="hub-quem" id="quem">
  <div class="wrap">
    <h2 class="rv">${marcar(hb.quemSomos.titulo)}</h2>
    <p class="sub rv">${marcar(hb.quemSomos.apoio)}</p>
    <div class="facts rv">
${hb.quemSomos.fatos.map(f => `      <div class="fact">
        <div class="k">${h(f.chave)}</div>
        <h3>${h(f.titulo)}</h3>
        <p>${marcar(f.texto)}</p>
      </div>`).join("\n")}
    </div>
  </div>
</section>

<!-- ===================== HONESTIDADE ===================== -->
<section class="hub-band" id="honestidade">
  <div class="wrap">
    <div class="rv">
      <h2>${marcar(hb.honestidade.titulo)}</h2>
      <p>${marcar(hb.honestidade.texto)}</p>
    </div>
    <ul class="serve rv">
${hb.honestidade.serve.map(s => `      <li>${marcar(s)}</li>`).join("\n")}
${hb.honestidade.naoServe.map(s => `      <li class="no">${marcar(s)}</li>`).join("\n")}
    </ul>
  </div>
</section>

</main>

<footer class="hub-contato" id="contato">
  <div class="wrap">
    <h2>${marcar(hb.contato.titulo)}</h2>
    <p>${marcar(hb.contato.texto)}</p>
    <div class="actions">
      <a class="btn btn-1" data-whatsapp data-fallback="Escrever para a Baishift" data-fallback-href="mailto:${h(st.email)}?subject=${assunto}" href="mailto:${h(st.email)}?subject=${assunto}" data-ev="whatsapp:hub">
        ${SVG_WA}
        <span>${h(hb.contato.botaoWhatsapp)}</span></a>
      <a class="mail" href="mailto:${h(st.email)}">${h(st.email)}</a>
    </div>
    <div class="hub-foot">
      <img src="/assets/marca/01-logo/baishift-branco.svg" alt="Baishift" width="911" height="175">
      <span>Baishift © <span id="yr">2026</span> · ${h(st.cidade)}</span>
      <span><a href="#topo">Voltar ao topo ↑</a></span>
    </div>
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>

<script type="application/ld+json">
${require("../lib/html").jsonEmbutido(ld)}
</script>
</body>
</html>
`;
};
