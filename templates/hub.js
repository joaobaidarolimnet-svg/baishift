/* Modelo da página inicial. O topo apresenta a Baishift e a frente de provedores;
   logo abaixo vem a frente inteira, sem precisar clicar em nada.
   Regra: todo valor do JSON passa por h() ou marcar() antes de entrar no HTML. */
"use strict";
const { h, marcar } = require("../lib/html");
const { HOST, AVISO, SVG_GO, PORTAS, head, barra } = require("./comum");
const { secoesProvedor, rodapeProvedor, dadosProvedor } = require("./provedor-secoes");

module.exports = function paginaHub(c, o = {}) {
  const st = c.site, hb = c.hub;

  const portas = hb.portas.slice(0, 1).map((pt, i) => `      <a class="door" href="${h(pt.link || PORTAS[i].url)}" data-ev="porta:${PORTAS[i].chave}">
        ${SVG_GO}
        <p class="who">${h(pt.quem)}</p>
        <h2>${h(pt.titulo)}</h2>
        <p>${marcar(pt.texto)}</p>
        <span class="status"><b>${h(pt.seloDestaque)}</b> · ${h(pt.selo)}</span>
      </a>`).join("\n\n");

  const ld = { "@context": "https://schema.org", "@graph": dadosProvedor(c).concat([
    { "@type": "WebSite", "@id": HOST + "/#site", "url": HOST + "/", "name": "Baishift", "inLanguage": "pt-BR",
      "publisher": { "@id": HOST + "/#organizacao" } }
  ]) };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: st.tituloAba, descricao: st.descricao, descricaoSocial: st.descricaoSocial, caminho: "/", site: st, manifesto: true, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("provedores", "#contato", true)}

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

${secoesProvedor(c, o)}

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

</main>

${rodapeProvedor(c)}

<script src="/assets/js/site.js" defer></script>

<script type="application/ld+json">
${require("../lib/html").jsonEmbutido(ld)}
</script>
</body>
</html>
`;
};
