/* Modelo de /apps — o índice dos aplicativos. Cada cartão leva para /apps/<slug>. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, SVG_GO, head, barra, footEnd, marcaProduto } = require("./comum");

module.exports = function paginaApps(c, o = {}) {
  const st = c.site, ap = c.apps, ativos = c.produtos.filter(p => p.ativo);
  const assunto = encodeURIComponent("Aplicativos da Baishift");

  const categorias = [...new Set(ativos.map(p => p.categoria).filter(Boolean))];
  const filtro = categorias.length > 1 ? `    <div class="filtros" id="filtros-apps" role="group" aria-label="Categoria">
      <button type="button" data-cat="" aria-pressed="true">Todos</button>
${categorias.map(cat => `      <button type="button" data-cat="${h(cat)}" aria-pressed="false">${h(cat)}</button>`).join("\n")}
    </div>` : "";

  const cartoes = ativos.length ? ativos.map(p => `      <a class="app-card" href="/apps/${h(p.slug)}" style="--ac:${h(p.cor)}" data-cat="${h(p.categoria)}" data-ev="app:${h(p.slug)}">
        ${SVG_GO}
        ${marcaProduto(p, o)}
        <div class="app-txt">
          ${p.categoria ? `<span class="app-quem">${h(p.categoria)}</span>` : ""}
          <h2>${h(p.nome)}</h2>
          <p>${marcar(p.descricao)}</p>
          ${p.publico ? `<span class="app-publico">${h(p.publico)}</span>` : ""}
          ${p.status ? `<span class="app-status"><b aria-hidden="true"></b>${h(p.status)}</span>` : ""}
        </div>
      </a>`).join("\n\n") : `      <p class="app-vazio">${marcar(ap.vazio)}</p>`;

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": HOST + "/apps#pagina", "url": HOST + "/apps", "name": ap.rotulo,
      "description": semMarcas(ap.lead), "isPartOf": { "@id": HOST + "/#site" },
      "mainEntity": { "@type": "ItemList", "itemListElement": ativos.map((p, i) => (
        { "@type": "ListItem", "position": i + 1, "name": p.nome, "url": HOST + "/apps/" + p.slug })) } },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": HOST + "/" },
      { "@type": "ListItem", "position": 2, "name": "Aplicativos", "item": HOST + "/apps" }] }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: ap.tituloAba, descricao: ap.descricao, descricaoSocial: ap.descricao, caminho: "/apps", site: st, manifesto: false, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("apps", "#contato")}

<main id="topo">

<section class="hub-hero">
  <div class="wrap">
    <span class="mono pn-rotulo">${h(ap.rotulo)}</span>
    <h1>${marcar(ap.titulo)}</h1>
    <p>${marcar(ap.lead)}</p>
  </div>
</section>

<section class="apps-lista" id="lista" aria-label="Aplicativos">
  <div class="wrap">
    <p class="apps-manifesto"><b>Por que ficam aqui.</b> ${marcar(ap.manifesto)}</p>
${filtro}
    <div class="apps-grid" id="apps-grid">
${cartoes}
    </div>
    <p class="apps-nota">Cada aplicativo tem nome e página próprios nas lojas. Esta página só organiza a lista — a frente principal da Baishift é <a href="/provedores">provedor de internet</a>.</p>
  </div>
</section>

<section class="hub-band" id="ideia">
  <div class="wrap">
    <div class="rv">
      <h2>${marcar(ap.fecho.titulo)}</h2>
      <p>${marcar(ap.fecho.texto)}</p>
    </div>
    <ul class="serve rv">
${ativos.map(p => `      <li>${h(p.nome)}${p.status ? " · " + h(p.status) : ""}</li>`).join("\n")}
      <li class="no">Ainda não existe um para saúde e outro para finanças</li>
    </ul>
  </div>
</section>

</main>

<footer class="hub-contato" id="contato">
  <div class="wrap">
    <h2>Tem um problema que se repete <em>todo mês</em>?</h2>
    <p>Conte como ele acontece hoje. Retorno em até dois dias úteis.</p>
    <div class="actions">
      <a class="btn btn-1" data-whatsapp="Olá! Quero falar sobre os aplicativos da Baishift." data-fallback="Escrever para a Baishift" data-fallback-href="mailto:${h(st.email)}?subject=${assunto}" href="mailto:${h(st.email)}?subject=${assunto}" data-ev="whatsapp:apps">
        ${SVG_WA}
        <span>Chamar no WhatsApp</span></a>
      <a class="mail" href="mailto:${h(st.email)}">${h(st.email)}</a>
    </div>
    ${footEnd(st, { href: "/", texto: "Voltar para o início ↑" })}
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
