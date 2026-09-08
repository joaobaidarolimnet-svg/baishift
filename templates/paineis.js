/* Modelo de /dashboards — painéis sob medida, com um painel demonstrativo por segmento.
   Os textos vêm do JSON; os números dos painéis são ilustrativos e vivem no código,
   como acontece no painel do provedor. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, head, barra, footEnd } = require("./comum");

/* chave de cada segmento (a ordem casa com paineis.segmentos), KPIs e títulos dos gráficos */
const SEG = [
  { chave: "clinica", titulo: "Painel da clínica · exemplo",
    kpis: [["Pacientes ativos", "3.480", "+112 no mês", ""], ["Faturamento do mês", "R$ 486 mil", "+6,2%", ""],
           ["Ocupação da agenda", "87%", "meta 85%", ""], ["Faltas (no-show)", "9,4%", "meta 6,0%", " or"],
           ["Ticket médio", "R$ 312", "+R$ 18", ""], ["Glosa de convênio", "4,1%", "−1,2 p.p.", ""]],
    principal: "Faturamento · particular e convênio · 12 meses",
    legenda: '<div class="legend"><i>Particular</i><i class="o">Convênio</i></div>',
    secundario: "Ocupação da agenda por profissional",
    rosca: "Composição do faturamento",
    perguntas: ["Qual profissional paga a própria cadeira e qual não paga?",
                "Quanto a falta de paciente custou no mês fechado?",
                "O convênio está crescendo mais rápido que o particular?"] },
  { chave: "transporte", titulo: "Painel da transportadora · exemplo",
    kpis: [["Frota ativa", "64", "+4 veículos", ""], ["Entregas no prazo", "94,2%", "meta 92%", ""],
           ["Custo por km", "R$ 3,18", "−R$ 0,12", ""], ["Ociosidade", "11,0%", "meta 8,0%", " or"],
           ["Receita do mês", "R$ 2,1 mi", "+9,1%", ""], ["Sinistros", "3", "−2 no mês", ""]],
    principal: "Entregas · no prazo e em atraso · 12 meses",
    legenda: '<div class="legend"><i class="g">No prazo</i><i class="r">Em atraso</i></div>',
    secundario: "Custo por quilômetro em cada rota",
    rosca: "Composição da receita",
    perguntas: ["Qual rota entrega no prazo e mesmo assim dá prejuízo?",
                "Quanto a ociosidade da frota custou neste mês?",
                "O atraso está caindo ou só mudou de rota?"] },
  { chave: "distribuicao", titulo: "Painel da distribuidora · exemplo",
    kpis: [["Clientes ativos", "1.940", "+58 no mês", ""], ["Faturamento do mês", "R$ 3,4 mi", "+7,8%", ""],
           ["Margem bruta", "22,6%", "+1,4 p.p.", ""], ["Ruptura de estoque", "6,3%", "meta 4,0%", " or"],
           ["Giro de estoque", "8,1×", "+0,6", ""], ["Inadimplência", "3,2%", "−0,7 p.p.", ""]],
    principal: "Faturamento e meta · 12 meses",
    legenda: '<div class="legend"><i>Faturado</i><i class="o">Meta</i></div>',
    secundario: "Positivação de clientes por vendedor",
    rosca: "Mix de faturamento",
    perguntas: ["O faturamento cresceu com margem ou comprando volume?",
                "Quanto a ruptura de estoque deixou de vender?",
                "Qual vendedor cresce em cliente e qual cresce em desconto?"] }
];

function painel(s, i) {
  const kpis = s.kpis.map(k => `        <div class="kpi"><div class="lb">${h(k[0])}</div><div class="vl">${h(k[1])}</div><div class="dt${k[3]}">${h(k[2])}</div></div>`).join("\n");
  return `      <div class="dash" data-painel="${s.chave}"${i ? " hidden" : ""}>
        <div class="dash-top"><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
          <span class="ttl">${h(s.titulo)}</span><span class="live"><b aria-hidden="true"></b>ilustrativo</span></div>
        <div class="kpis">
${kpis}
        </div>
        <div class="dash-body">
          <div>
            <div class="chart-h"><span>${h(s.principal)}</span>${s.legenda}</div>
            <div class="chart" data-gr="principal"></div>
            <div class="chart-h" style="margin-top:14px"><span>${h(s.secundario)}</span></div>
            <div class="chart" data-gr="secundario"></div>
          </div>
          <div>
            <div class="chart-h"><span>${h(s.rosca)}</span></div>
            <div class="chart" data-gr="rosca"></div>
            <div class="chart-h" style="margin-top:16px"><span>O que este painel responde</span></div>
            <ul class="pn-perg">
${s.perguntas.map(q => `              <li>${h(q)}</li>`).join("\n")}
            </ul>
          </div>
        </div>
      </div>`;
}

module.exports = function paginaPaineis(c, o = {}) {
  const st = c.site, pa = c.paineis, cf = pa.comoFunciona;
  const assunto = encodeURIComponent("Painel sob medida");

  const abas = pa.segmentos.map((sg, i) =>
    `        <button type="button" data-seg="${SEG[i].chave}" aria-pressed="${i ? "false" : "true"}">${h(sg.nome)}</button>`).join("\n");
  const notas = pa.segmentos.map((sg, i) => `      <div class="pn-nota" data-nota="${SEG[i].chave}"${i ? " hidden" : ""}>
        <span class="mono">${h(sg.rotulo)}</span>
        <h2>${marcar(sg.titulo)}</h2>
        <p>${marcar(sg.texto)}</p>
      </div>`).join("\n");

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
    { "@type": "Service", "@id": HOST + "/dashboards#servico", "name": "Painéis sob medida",
      "provider": { "@id": HOST + "/#organizacao" }, "url": HOST + "/dashboards",
      "description": semMarcas(pa.lead), "areaServed": { "@type": "Country", "name": "Brasil" },
      "hasOfferCatalog": { "@type": "OfferCatalog", "name": "Segmentos atendidos", "itemListElement": pa.segmentos.map(sg => (
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": sg.rotulo, "description": semMarcas(sg.texto) } })) } },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": HOST + "/" },
      { "@type": "ListItem", "position": 2, "name": "Painéis sob medida", "item": HOST + "/dashboards" }] }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: pa.tituloAba, descricao: pa.descricao, descricaoSocial: pa.descricao, caminho: "/dashboards", site: st, manifesto: false, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barra("dashboards", "#contato")}

<main id="topo">

<!-- ===================== TOPO ===================== -->
<section class="hub-hero">
  <div class="wrap">
    <span class="mono pn-rotulo">${h(pa.rotulo)}</span>
    <h1>${marcar(pa.titulo)}</h1>
    <p>${marcar(pa.lead)}</p>
  </div>
</section>

<!-- ===================== OS PAINÉIS ===================== -->
<section class="pn-demo" id="paineis" aria-label="Painéis por segmento">
  <div class="wrap" id="paineis-demo">
    <div class="hud-tools">
      <div class="seg" role="group" aria-label="Segmento">
${abas}
      </div>
      <span class="hud-live"><i aria-hidden="true"></i>dados ilustrativos</span>
    </div>

${notas}

${SEG.map(painel).join("\n\n")}

    <p class="pn-rodape">Os números destes painéis são ilustrativos. No seu, eles vêm do banco do sistema que a empresa já usa.</p>
  </div>
</section>
${comoFunciona}

<!-- ===================== FECHO ===================== -->
<section class="hub-band" id="criterio">
  <div class="wrap">
    <div class="rv">
      <h2>${marcar(pa.fecho.titulo)}</h2>
      <p>${marcar(pa.fecho.texto)}</p>
    </div>
    <ul class="serve rv">
${pa.segmentos.map(sg => `      <li>${h(sg.rotulo)}</li>`).join("\n")}
      <li>Qualquer operação que hoje fecha o mês na planilha</li>
    </ul>
  </div>
</section>

</main>

<footer class="hub-contato" id="contato">
  <div class="wrap">
    <h2>Conte como você fecha o mês. A gente responde com <em>escopo e prazo</em>.</h2>
    <p>Retorno em até dois dias úteis. Se não for caso para a Baishift, a resposta também diz isso.</p>
    <div class="actions">
      <a class="btn btn-1" data-whatsapp="Olá! Quero um painel sob medida para a minha operação." data-fallback="Escrever para a Baishift" data-fallback-href="mailto:${h(st.email)}?subject=${assunto}" href="mailto:${h(st.email)}?subject=${assunto}" data-ev="whatsapp:paineis">
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
