/* Modelo de /provedores/software/<slug> — a página de cada produto para provedor.
   O produto marcado com `demo` (o painel) mostra as três áreas ao vivo; os números
   dos painéis são ilustrativos e vivem no código, não no JSON. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_GO, head, barra, footEnd } = require("./comum");
const { painelCompleto } = require("./painel-demo");

/* as três áreas do painel: chave, KPIs e títulos dos gráficos (a ordem casa com painel.areas) */
module.exports = function paginaSoftwareProduto(p, c, o = {}) {
  const st = c.site, cor = h(p.cor), url = "/provedores/software/" + p.slug;

  const beneficios = p.beneficios.length ? `
<section class="blk-benef" aria-labelledby="h-benef">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono" style="color:${cor}">O que ele resolve</span><h2 id="h-benef">Três coisas que mudam na semana seguinte</h2></div></div>
    <div class="lp-feats">
${p.beneficios.map((b, i) => `      <div class="feat rv"><div class="ic">${String(i + 1).padStart(2, "0")}</div><h3>${h(b.titulo)}</h3><p>${marcar(b.texto)}</p></div>`).join("\n")}
    </div>
    ${p.preco ? `<p class="prod-preco rv"><b>Como é cobrado</b> ${marcar(p.preco)}</p>` : ""}
  </div>
</section>` : "";

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Product", "@id": HOST + url + "#produto", "name": p.nome, "url": HOST + url,
      "description": semMarcas(p.resumo), "category": p.categoria,
      "brand": { "@type": "Brand", "name": "Baishift" },
      "audience": { "@type": "Audience", "audienceType": "Provedor de internet" } },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": HOST + "/" },
      { "@type": "ListItem", "position": 2, "name": "Provedores", "item": HOST + "/" },
      { "@type": "ListItem", "position": 3, "name": "Software", "item": HOST + "/provedores/software" },
      { "@type": "ListItem", "position": 4, "name": p.nome, "item": HOST + url }] }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: p.nome + " — Baishift", descricao: p.resumo, descricaoSocial: p.resumo, caminho: url, site: st, manifesto: false, previa: o.previa })}
</head>
<body style="--ac:${cor}">

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("provedores", "/diagnostico")}

<main id="topo">

<section class="hub-hero">
  <div class="wrap">
    <a class="volta" href="/provedores/software">← Software para provedor</a>
    <span class="mono pn-rotulo" style="color:${cor}">${h(p.categoria)}</span>
    <h1>${marcar(p.titulo)}</h1>
    <p>${marcar(p.lead)}</p>
    <p class="prod-status"><span class="prod-st${p.status === "no ar" ? " on" : ""}"><b aria-hidden="true"></b>${h(p.status)}</span></p>
  </div>
</section>
${p.demo ? painelCompleto(c) : ""}
${beneficios}

<section class="hub-band" id="proximo">
  <div class="wrap">
    <div class="rv">
      <h2>Este produto encaixa na sua operação?</h2>
      <p>O diagnóstico responde isso com o seu número, não com o exemplo desta página. Duas semanas lendo o IXC, sem compromisso.</p>
    </div>
    <ul class="serve rv">
      <li>Lê o banco do IXC que você já usa</li>
      <li>Sem trocar de ERP e sem cadastro paralelo</li>
      <li>Escopo, prazo e valor saem do diagnóstico</li>
    </ul>
  </div>
</section>

</main>

<footer class="hub-contato" id="contato">
  <div class="wrap">
    <h2>Fale sobre o <em>${h(p.nome)}</em></h2>
    <p>Conte como essa parte da operação funciona hoje. Retorno em até dois dias úteis.</p>
    <div class="actions">
      <a class="btn btn-1" href="/diagnostico" data-ev="cta:produto:${h(p.slug)}">Agendar o diagnóstico</a>
      <a class="mail" href="mailto:${h(st.email)}?subject=${encodeURIComponent(p.nome + " — Baishift")}">${h(st.email)}</a>
    </div>
    ${footEnd(st, { href: "/provedores/software", texto: "Ver todo o catálogo ↑" })}
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
