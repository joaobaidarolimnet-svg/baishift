/* Modelo de /diagnostico — a landing da isca gratuita, com endereço próprio. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, head, barra, footEnd } = require("./comum");

module.exports = function paginaDiagnostico(c, o = {}) {
  const st = c.site, d = c.diagnostico, of = d.oferta;

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Service", "@id": HOST + "/diagnostico#servico", "name": of.titulo,
      "provider": { "@id": HOST + "/#organizacao" }, "url": HOST + "/diagnostico",
      "description": semMarcas(d.lead), "areaServed": { "@type": "Country", "name": "Brasil" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL",
        "description": "Diagnóstico sem compromisso: o plano é do provedor mesmo sem contratação." } },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": HOST + "/" },
      { "@type": "ListItem", "position": 2, "name": "Diagnóstico", "item": HOST + "/diagnostico" }] }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: d.tituloAba, descricao: d.descricao, descricaoSocial: d.descricao, caminho: "/diagnostico", site: st, manifesto: false, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("provedores", "#lead")}

<main id="topo">

<section class="hub-hero">
  <div class="wrap">
    <a class="volta" href="/provedores">← Provedores</a>
    <span class="mono pn-rotulo">${h(of.selo)}</span>
    <h1>${marcar(d.titulo)}</h1>
    <p>${marcar(d.lead)}</p>
    <div class="dg-medidas">
${of.medidas.map(m => `      <div><b>${h(m.valor)}</b><span>${h(m.texto)}</span></div>`).join("\n")}
    </div>
  </div>
</section>

<section class="dg-como" aria-labelledby="h-como">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(d.rotulo)}</span><h2 id="h-como">${h(of.titulo)}</h2></div></div>
    <div class="dg-grid">
      <div class="rv">
${d.afirmacoes.map(a => `        <h3 class="dg-s">${marcar(a.titulo)}</h3>
        <p>${marcar(a.texto)}</p>`).join("\n")}
        <h3 class="dg-s">Quanto custa</h3>
        <p>Nada. O plano é seu mesmo se você não contratar nenhuma etapa seguinte.</p>
      </div>
      <div class="offer rv">
        <div class="oh"><h3>${h(of.tituloEntregas)}</h3></div>
        <ol>
          ${of.entregas.map(s => `<li>${marcar(s)}</li>`).join("")}
        </ol>
        <div class="acts">
          <a class="btn btn-wa" data-whatsapp="Olá! Quero agendar o diagnóstico de gestão do provedor." data-fallback="${h(of.alternativa || "Ir para o formulário")}" data-fallback-href="#lead" href="#lead" data-ev="whatsapp:diagnostico">
            ${SVG_WA}
            <span>${h(of.botao)}</span></a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="dg-form tint" aria-labelledby="h-form">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(c.contato.formulario.titulo)}</span><h2 id="h-form">${marcar(c.contato.titulo)}</h2></div>
      <p class="hint">${h(c.contato.formulario.subtitulo)}</p></div>
    <form class="form rv" id="lead" novalidate>
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
</section>

</main>

<footer class="hub-contato">
  <div class="wrap">
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
