/* Modelo de /provedores/software/<slug> — a página de cada produto para provedor.
   O produto marcado com `demo` (o painel) mostra as três áreas ao vivo; os números
   dos painéis são ilustrativos e vivem no código, não no JSON. */
"use strict";
const { h, marcar, semMarcas, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_GO, head, barra, footEnd } = require("./comum");

/* as três áreas do painel: chave, KPIs e títulos dos gráficos (a ordem casa com painel.areas) */
const AREAS = [
  { chave: "comercial", titulo: "Painel do provedor · comercial",
    kpis: [["Base ativa", "12.480", "+128 líquidos", ""], ["Ativações no mês", "236", "+3,6%", ""],
           ["Cancelamentos", "38", "−4 no mês", ""], ["Churn", "1,62%", "−0,4 p.p.", ""],
           ["Contratos parados", "45", "meta 10", " or"], ["ARPU", "R$ 99,40", "+R$ 3,10", ""]],
    principal: "Ativações e cancelamentos · 12 meses",
    legenda: '<div class="legend"><i class="g">Ativações</i><i class="r">Cancelamentos</i></div>',
    secundario: "Contratos parados entre a venda e a ativação",
    rosca: "Composição da base por plano",
    perguntas: ["Quantos contratos já vendidos ainda não viraram receita?",
                "Em qual etapa o pedido para mais tempo?",
                "O churn está caindo ou só a ativação está subindo?"] },
  { chave: "financeiro", titulo: "Painel do provedor · financeiro",
    kpis: [["Receita do mês", "R$ 1,24 mi", "+8,4%", ""], ["Recebido no mês", "R$ 1,09 mi", "87,9% da receita", ""],
           ["Inadimplência", "4,8%", "meta 3,5%", " or"], ["Margem", "35,1%", "+2,6 p.p.", ""],
           ["Ticket médio", "R$ 99,40", "+R$ 3,10", ""], ["Fechamento", "dia 5", "auditável", ""]],
    principal: "Receita e despesa · 12 meses",
    legenda: '<div class="legend"><i>Receita</i><i class="o">Despesa</i></div>',
    secundario: "Inadimplência por faixa de atraso",
    rosca: "Composição da receita",
    perguntas: ["Quanto da receita do mês virou caixa de verdade?",
                "Qual faixa de atraso já não volta mais?",
                "A margem cresceu por receita ou por corte de despesa?"] },
  { chave: "campo", titulo: "Painel do provedor · campo",
    kpis: [["OS no mês", "561", "+2,4%", ""], ["Concluídas no prazo", "92,7%", "meta 90%", ""],
           ["Reaberturas", "17", "−2 no mês", ""], ["Tempo de instalação", "2,1 dias", "meta 3 dias", ""],
           ["Produtividade média", "88%", "meta 85%", ""], ["Equipes ativas", "4", "sem alteração", ""]],
    principal: "OS concluídas e reaberturas · 12 meses",
    legenda: '<div class="legend"><i class="g">Concluídas</i><i class="r">Reaberturas</i></div>',
    secundario: "Produtividade de cada equipe",
    rosca: "Tipos de ordem de serviço",
    perguntas: ["Qual equipe fecha muita OS e volta no mesmo endereço?",
                "O serviço refeito está contando como produtividade?",
                "A fila de instalação cabe na capacidade de campo?"] }
];

function painelHtml(a, i) {
  const kpis = a.kpis.map(k => `        <div class="kpi"><div class="lb">${h(k[0])}</div><div class="vl">${h(k[1])}</div><div class="dt${k[3]}">${h(k[2])}</div></div>`).join("\n");
  return `      <div class="dash" data-painel="${a.chave}"${i ? " hidden" : ""}>
        <div class="dash-top"><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
          <span class="ttl">${h(a.titulo)}</span><span class="live"><b aria-hidden="true"></b>ilustrativo</span></div>
        <div class="kpis">
${kpis}
        </div>
        <div class="dash-body">
          <div>
            <div class="chart-h"><span>${h(a.principal)}</span>${a.legenda}</div>
            <div class="chart" data-gr="principal"></div>
            <div class="chart-h" style="margin-top:14px"><span>${h(a.secundario)}</span></div>
            <div class="chart" data-gr="secundario"></div>
          </div>
          <div>
            <div class="chart-h"><span>${h(a.rosca)}</span></div>
            <div class="chart" data-gr="rosca"></div>
            <div class="chart-h" style="margin-top:16px"><span>O que esta área responde</span></div>
            <ul class="pn-perg">
${a.perguntas.map(q => `              <li>${h(q)}</li>`).join("\n")}
            </ul>
          </div>
        </div>
      </div>`;
}

function demoDoPainel(c) {
  const pn = c.painel;
  const abas = pn.areas.map((ar, i) =>
    `        <button type="button" data-seg="${AREAS[i].chave}" aria-pressed="${i ? "false" : "true"}">${h(ar.nome)}</button>`).join("\n");
  const notas = pn.areas.map((ar, i) => `      <div class="pn-nota" data-nota="${AREAS[i].chave}"${i ? " hidden" : ""}>
        <span class="mono">${h(ar.rotulo)}</span>
        <h2>${marcar(ar.titulo)}</h2>
        <p>${marcar(ar.texto)}</p>
      </div>`).join("\n");
  return `
<section class="pn-demo" id="areas" aria-label="Áreas do painel">
  <div class="wrap" id="painel-demo">
    <div class="hud-tools">
      <div class="seg" role="group" aria-label="Área do painel">
${abas}
      </div>
      <span class="hud-live"><i aria-hidden="true"></i>dados ilustrativos</span>
    </div>

${notas}

${AREAS.map(painelHtml).join("\n\n")}

    <p class="pn-rodape">${marcar(pn.nota)}</p>
  </div>
</section>`;
}

/* o painel completo: monitor ao vivo, seis painéis com troca de período e o antes/depois */
const HUD = `<!-- ===================== 03 · DASHBOARD ===================== -->
<section class="hud" id="completo" aria-labelledby="h-dash">
  <div class="wrap">
    <div class="hud-head">
      <div class="rv"><h2 id="h-dash" style="font-size:clamp(1.5rem,3vw,2.2rem)">O painel completo, com o período que a diretoria escolhe</h2>
        <p class="lead" style="margin-top:14px">Sete dias, trinta dias ou doze meses: os mesmos indicadores, na janela que a pergunta pede. Passe o mouse nos gráficos.</p></div>
      <div class="rv">
        <div class="phone" aria-hidden="true"><div class="screen">
          <div class="sh"><span>Diretoria</span><b>ao vivo</b></div>
          <div class="kp"><div class="lb">Base ativa</div><div class="vl">12.480 <small>+128</small></div></div>
          <div class="kp"><div class="lb">Caixa hoje</div><div class="vl">R$ 41,2 mil <small>+8,4%</small></div></div>
          <div class="kp"><div class="lb">Inadimplência</div><div class="vl">4,8% <small class="o">meta 3,5%</small></div></div>
          <div class="kp ch"><div class="lb">Ativações · 7 dias</div><div class="chart" id="phChart"></div></div>
        </div></div>
        <p class="phone-cap">A pergunta da diretoria, no celular</p>
      </div>
    </div>
    <div class="hud-tools rv">
      <div class="seg" role="group" aria-label="Período">
        <button type="button" data-periodo="7d" aria-pressed="false">7 dias</button>
        <button type="button" data-periodo="30d" aria-pressed="false">30 dias</button>
        <button type="button" data-periodo="12m" aria-pressed="true">12 meses</button>
      </div>
      <span class="hud-live"><i aria-hidden="true"></i>dados ilustrativos · atualizando</span>
    </div>
    <div class="monitor rv"><div class="pt">Recebimentos · agora <span id="monNow">R$ 0</span></div><div class="chart" id="monitor"></div></div>
    <div class="panels">
      <div class="panel rv" data-panel="ativ"><span class="pt">Ativações · <span class="per">12 meses</span></span><div class="pv">214</div><div class="pd">+9,7% vs. período anterior</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="churn"><span class="pt">Churn · <span class="per">12 meses</span></span><div class="pv">1,62%</div><div class="pd">−0,4 p.p. no período</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="inad"><span class="pt">Inadimplência · <span class="per">12 meses</span></span><div class="pv">4,8%</div><div class="pd or">meta 3,5%</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="prod"><span class="pt">Produtividade de campo · <span class="per">12 meses</span></span><div class="pv">92%</div><div class="pd">meta 85%</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="cresc"><span class="pt">Receita acumulada · <span class="per">12 meses</span></span><div class="pv">+31,5%</div><div class="pd">no período</div><div class="chart"></div></div>
      <div class="panel rv" data-panel="gauge"><span class="pt">Controles implantados</span><div class="pv">75%</div><div class="pd or">12 em plano de ação</div><div class="chart"></div></div>
    </div>
    <div class="after rv">
      <div><span class="mono">Antes e depois · exemplo</span><h3>Seis meses de rito, os mesmos quatro números.</h3>
        <p>Os indicadores que mais mudam quando o processo passa a ser medido toda semana — no provedor-exemplo, de março a setembro.</p>
        <div class="lg"><i>antes</i><i class="b">depois</i></div></div>
      <div class="chart" id="dAfter"></div>
    </div>
  </div>
</section>
`;

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
${p.demo ? demoDoPainel(c) + "\n" + HUD : ""}
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
