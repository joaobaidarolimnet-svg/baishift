/* Modelo de /provedores/software — o catálogo de software para provedor. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, SVG_GO, head, barra, footEnd } = require("./comum");

module.exports = function paginaSoftware(c, o = {}) {
  const st = c.site, sw = c.software, cf = sw.comoFunciona, ativos = sw.produtos.filter(p => p.ativo);
  const assunto = encodeURIComponent("Software para provedor");

  const cartoes = ativos.map(p => `      <a class="prod-card" href="/provedores/software/${h(p.slug)}" style="--ac:${h(p.cor)}" data-ev="software:${h(p.slug)}">
        ${SVG_GO}
        <span class="prod-cat">${h(p.categoria)}</span>
        <h2>${h(p.nome)}</h2>
        <p>${marcar(p.resumo)}</p>
        <span class="prod-st${p.status === "no ar" ? " on" : ""}"><b aria-hidden="true"></b>${h(p.status)}</span>
      </a>`).join("\n\n");

  const comoFunciona = cf.itens.length ? `
<section class="pn-como" aria-labelledby="h-como">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(cf.rotulo)}</span><h2 id="h-como">${marcar(cf.titulo)}</h2></div></div>
    <div class="lp-feats">
${cf.itens.map((f, i) => `      <div class="feat rv"><div class="ic">${String(i + 1).padStart(2, "0")}</div><h3>${h(f.titulo)}</h3><p>${marcar(f.texto)}</p></div>`).join("\n")}
    </div>
  </div>
</section>` : "";

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": HOST + "/provedores/software#pagina", "url": HOST + "/provedores/software",
      "name": "Software para provedor de internet", "description": semMarcas(sw.lead),
      "isPartOf": { "@id": HOST + "/#site" },
      "mainEntity": { "@type": "ItemList", "itemListElement": ativos.map((p, i) => (
        { "@type": "ListItem", "position": i + 1, "name": p.nome, "url": HOST + "/provedores/software/" + p.slug })) } },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": HOST + "/" },
      { "@type": "ListItem", "position": 2, "name": "Provedores", "item": HOST + "/provedores" },
      { "@type": "ListItem", "position": 3, "name": "Software", "item": HOST + "/provedores/software" }] }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: sw.tituloAba, descricao: sw.descricao, descricaoSocial: sw.descricao, caminho: "/provedores/software", site: st, manifesto: false, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("provedores", "/diagnostico")}

<main id="topo">

<section class="hub-hero">
  <div class="wrap">
    <a class="volta" href="/provedores">← Provedores</a>
    <span class="mono pn-rotulo">${h(sw.rotulo)}</span>
    <h1>${marcar(sw.titulo)}</h1>
    <p>${marcar(sw.lead)}</p>
  </div>
</section>

<section class="prod-lista" id="catalogo" aria-label="Produtos">
  <div class="wrap">
${cartoes}
    <p class="prod-nota">${marcar(sw.nota)}</p>
  </div>
</section>
${comoFunciona}

<section class="hub-band" id="comecar">
  <div class="wrap">
    <div class="rv">
      <h2>Não sabe por qual começar?</h2>
      <p>O diagnóstico aponta qual gargalo custa mais caro hoje — e qual produto paga a si mesmo primeiro.</p>
    </div>
    <ul class="serve rv">
${ativos.map(p => `      <li>${h(p.nome)} · ${h(p.status)}</li>`).join("\n")}
    </ul>
  </div>
</section>

</main>

<footer class="hub-contato" id="contato">
  <div class="wrap">
    <h2>Conte qual etapa trava hoje. A gente responde com <em>escopo e prazo</em>.</h2>
    <p>Retorno em até dois dias úteis. Se não for caso para a Baishift, a resposta também diz isso.</p>
    <div class="actions">
      <a class="btn btn-1" href="/diagnostico" data-ev="cta:software">Agendar o diagnóstico</a>
      <a class="mail" href="mailto:${h(st.email)}?subject=${assunto}">${h(st.email)}</a>
    </div>
    ${footEnd(st, { href: "/provedores", texto: "Voltar para Provedores ↑" })}
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>

<script type="application/ld+json">
${jsonEmbutido(ld)}
</script>
</body>
</html>
`;
};
