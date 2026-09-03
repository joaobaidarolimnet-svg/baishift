/* Modelo da página principal. Recebe o conteúdo validado e devolve o HTML completo.
   Regra: todo valor do JSON passa por h() ou marcar() antes de entrar no HTML. */
"use strict";
const { h, marcar, semMarcas, urlImagem, jsonEmbutido } = require("../lib/html");
const { HOST, AVISO, SVG_WA, head, barraInicio, footEnd } = require("./comum");

const PAINEL_DEMO = `<div class="dash rv">
      <div class="dash-top"><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
        <span class="ttl">Painel do provedor · exemplo</span><span class="live"><b aria-hidden="true"></b>ao vivo</span></div>
      <div class="kpis">
        <div class="kpi"><div class="lb">Base ativa</div><div class="vl" id="k1">12.480</div><div class="dt">+128 líquidos</div></div>
        <div class="kpi"><div class="lb">Receita do mês</div><div class="vl" id="k2">R$ 1,24 mi</div><div class="dt">+8,4%</div></div>
        <div class="kpi"><div class="lb">Margem</div><div class="vl" id="k3">35,1%</div><div class="dt">+2,6 p.p.</div></div>
        <div class="kpi"><div class="lb">Churn</div><div class="vl" id="k4">1,62%</div><div class="dt">−0,4 p.p.</div></div>
        <div class="kpi"><div class="lb">Inadimplência</div><div class="vl" id="k5">4,8%</div><div class="dt or">meta 3,5%</div></div>
        <div class="kpi"><div class="lb">ARPU</div><div class="vl" id="k6">R$ 99,40</div><div class="dt">+R$ 3,10</div></div>
      </div>
      <div class="dash-body">
        <div>
          <div class="chart-h"><span>Receita e despesa · 12 meses</span><div class="legend"><i>Receita</i><i class="o">Despesa</i></div></div>
          <div class="chart" id="cRec"></div>
          <div class="chart-h" style="margin-top:14px"><span>Base líquida · entradas e saídas</span><div class="legend"><i class="g">Ativações</i><i class="r">Cancelamentos</i></div></div>
          <div class="chart" id="cBase"></div>
        </div>
        <div>
          <div class="chart-h"><span>Composição da receita</span></div><div class="chart" id="cDonut"></div>
          <div class="chart-h" style="margin-top:12px"><span>Recebimento · dia a dia</span></div><div class="chart" id="cHeat"></div>
          <div class="chart-h" style="margin-top:12px"><span>Eventos · agora</span></div><div class="feed" id="feed"></div>
        </div>
      </div>
    </div>`;

function carrossel(cs, o) {
  const n = cs.imagens.length;
  const slides = cs.imagens.map((im, i) => {
    const img = `<img src="${h(urlImagem(im.arquivo, o))}" alt="${h(im.alt)}" loading="${i ? "lazy" : "eager"}">`;
    const cls = "cs-slide" + (i === 0 ? " on" : ""), hid = i === 0 ? "false" : "true";
    return im.link
      ? `<a class="${cls}" href="${h(im.link)}" aria-hidden="${hid}"${i ? ' tabindex="-1"' : ""} data-ev="carrossel:${i + 1}">${img}</a>`
      : `<div class="${cls}" aria-hidden="${hid}">${img}</div>`;
  }).join("\n        ");
  const nav = n > 1 ? `
      <button class="cs-prev" type="button" aria-label="Imagem anterior">‹</button>
      <button class="cs-next" type="button" aria-label="Próxima imagem">›</button>
      <div class="cs-dots" role="tablist">${cs.imagens.map((_, i) => `<button type="button" role="tab" aria-selected="${i === 0 ? "true" : "false"}" aria-label="Imagem ${i + 1}"></button>`).join("")}</div>` : "";
  return `<div class="dash carrossel rv" id="carrossel" data-intervalo="${cs.intervalo}" aria-roledescription="carrossel" aria-label="Destaques">
      <div class="cs-track">
        ${slides}
      </div>${nav}
    </div>`;
}

const li = s => `<li>${marcar(s)}</li>`;
const eyebrow = (n, r) => `<span class="eyebrow"><b>Frente ${n}</b> ${h(r)}</span>`;
const botao = (b, cls, ev) => b.texto ? `<a class="btn ${cls}" href="${h(b.link || "#")}" data-ev="${ev}">${h(b.texto)}</a>` : "";

module.exports = function paginaInicio(c, o = {}) {
  const st = c.site, ini = c.inicio, d = c.diagnostico, of = d.oferta, pr = c.processos, db = c.dashboard, mo = c.modelos, pf = c.perfil, fq = c.faq, ct = c.contato;
  const visual = ini.carrossel.imagens.length ? carrossel(ini.carrossel, o) : (ini.painelAtivo ? PAINEL_DEMO : "");
  const ANC = ["#diagnostico", "#processos", "#dashboard"], CLS = ["", " b", " c"];
  const [localidade, uf] = st.cidade.split(",").map(s => s.trim());

  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfessionalService", "@id": HOST + "/#organizacao", "name": "Baishift", "url": HOST + "/",
      "email": st.email,
      "description": "Diagnóstico de gestão, consultoria de processos no IXC e dashboard para provedores de internet.",
      "image": HOST + "/assets/img/og.png", "logo": HOST + "/assets/marca/01-logo/baishift-principal.svg",
      "address": { "@type": "PostalAddress", "addressLocality": localidade || "", "addressRegion": uf || "", "addressCountry": "BR" },
      "areaServed": { "@type": "Country", "name": "Brasil" },
      "knowsAbout": ["Gestão de provedor de internet", "IXC Soft", "Controladoria", "Business intelligence", "Automação de processos"],
      "hasOfferCatalog": { "@type": "OfferCatalog", "name": "Frentes de atuação", "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Diagnóstico de gestão", "description": "Situação real da empresa com os números do IXC e plano priorizado por retorno." } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Consultoria de processos", "description": "Processos atuais, a desenvolver e a melhorar — escritos, parametrizados no IXC e treinados." } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dashboard", "description": "Painel da diretoria com base, caixa, churn e campo direto do banco, no computador e no celular." } } ] } },
    { "@type": "FAQPage", "@id": HOST + "/#faq", "mainEntity": fq.itens.map(q => ({ "@type": "Question", "name": q.pergunta, "acceptedAnswer": { "@type": "Answer", "text": semMarcas(q.resposta) } })) }
  ] };

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: st.tituloAba, descricao: st.descricao, descricaoSocial: st.descricaoSocial, caminho: "/", site: st, manifesto: true, previa: o.previa })}
</head>
<body>

<a class="skip" href="#topo">Pular para o conteúdo</a>

${barraInicio(c, o)}

<main id="topo">

<!-- ===================== HERO ===================== -->
<div class="hero">
  <div class="wrap hero-grid${visual ? "" : " solo"}">
    <div>
      <span class="pill mono"><b aria-hidden="true"></b> ${h(ini.rotulo)}</span>
      <h1>${marcar(ini.titulo)}</h1>
      <p class="hero-sub">${marcar(ini.subtitulo)}</p>
      <div class="hero-acts">
        ${botao(ini.botaoPrincipal, "btn-1", "cta:principal")}
        ${botao(ini.botaoSecundario, "btn-ghost", "cta:secundario")}
      </div>
      <div class="tags">${ini.tags.map(t => `<span>${h(t)}</span>`).join("")}</div>
    </div>${visual ? "\n    " + visual : ""}
  </div>
  <div class="wrap fronts rv">
${ini.frentesResumo.map((f, i) => `    <a class="front" href="${ANC[i]}"><span class="n">0${i + 1}</span><div><b>${h(f.titulo)}</b><span>${h(f.texto)}</span></div></a>`).join("\n")}
  </div>
</div>

<!-- ===================== 01 · DIAGNÓSTICO ===================== -->
<section id="diagnostico" aria-labelledby="h-diag">
  <div class="wrap">
    <div class="fr-head rv">
      <div>${eyebrow("01", d.rotulo)}
        <h2 id="h-diag">${marcar(d.titulo)}</h2></div>
      <p class="lead">${marcar(d.lead)}</p>
    </div>
    <div class="stage rv">
      <div class="cap"><i aria-hidden="true"></i><b>Caminho dos dados</b> · de onde eles nascem até a decisão</div>
      <div id="datapath"></div>
    </div>
    <div class="claims">
${d.afirmacoes.map(a => `      <div class="claim rv"><h3>${marcar(a.titulo)}</h3>
        <p>${marcar(a.texto)}</p></div>`).join("\n")}
    </div>
    <div class="diag-grid">
      <div class="results rv">
        <div class="res"><div class="n"><span data-count="4680" data-prefix="R$ ">R$ 4.680</span><small>/mês</small></div><div class="l">de receita já vendida que não chegava ao caixa</div></div>
        <div class="res"><div class="n"><span data-count="45">45</span><small>contratos</small></div><div class="l">parados entre a venda e a instalação</div></div>
        <div class="res"><div class="n">dia <span data-count="5">5</span></div><div class="l">fechamento auditável, todo mês</div></div>
        <div class="res"><div class="n"><span data-count="-2.1" data-dec="1">−2,1</span><small>p.p.</small></div><div class="l">de inadimplência em seis meses de rito</div></div>
        <div class="res cap">O que o diagnóstico encontrou no provedor-exemplo desta página · 12 mil assinantes</div>
      </div>
      <div class="offer rv">
        <div class="oh"><h3>${h(of.titulo)}</h3>${of.selo ? `<span class="badge">${h(of.selo)}</span>` : ""}</div>
        <div class="meta">${of.medidas.map(m => `<div><b>${h(m.valor)}</b>${h(m.texto)}</div>`).join("")}</div>
        <h4>${h(of.tituloEntregas)}</h4>
        <ol>
          ${of.entregas.map(li).join("")}
        </ol>
        <div class="acts">
          <a class="btn btn-wa" data-whatsapp data-fallback="Agendar o diagnóstico" data-fallback-href="#contato" href="#contato" data-ev="whatsapp:oferta">
            ${SVG_WA}
            <span>${h(of.botao)}</span></a>
          <a class="alt" href="#contato" data-ev="cta:oferta">${h(of.alternativa)}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== 02 · PROCESSOS ===================== -->
<section class="tint" id="processos" aria-labelledby="h-proc">
  <div class="wrap">
    <div class="fr-head rv">
      <div>${eyebrow("02", pr.rotulo)}
        <h2 id="h-proc">${marcar(pr.titulo)}</h2></div>
      <p class="lead">${marcar(pr.lead)}</p>
    </div>
    <div class="procs">
${pr.cartoes.map((k, i) => `      <div class="proc${CLS[i]} rv"><span class="k">${h(k.rotulo)}</span><h3>${h(k.titulo)}</h3>
        <p>${marcar(k.texto)}</p>
        <ul>${k.itens.map(li).join("")}</ul></div>`).join("\n")}
    </div>
  </div>
  <div class="band" style="margin-top:34px;padding:clamp(34px,4.5vw,56px) 0">
    <div class="wrap">
      <div class="flowstage rv">
        <div class="cap"><i aria-hidden="true"></i><b>Processo ao vivo</b> · da negociação ao faturamento · setembro</div>
        <div id="procflow"></div>
      </div>
      <div class="leak rv">
        <div><b class="t">O que o processo mostra em trinta segundos</b>
          <p>A venda fecha <strong>214 contratos</strong> e a instalação entrega <strong>169</strong>. Os 45 que somem
            já estavam vendidos — a perda não está dentro de nenhuma área, está entre elas. Nenhum relatório de setor aponta isso.</p></div>
        <div class="sum"><div>contratos parados<b>45</b></div><div>mensalidade média<b>R$ 104</b></div><div>receita que não entra<b>R$ 4.680/mês</b></div></div>
      </div>
      <p class="entrega rv">Entrega · <b>${marcar(pr.entrega)}</b></p>
    </div>
  </div>
</section>

<!-- ===================== 03 · DASHBOARD ===================== -->
<section class="hud" id="dashboard" aria-labelledby="h-dash">
  <div class="wrap">
    <div class="hud-head">
      <div class="rv">${eyebrow("03", db.rotulo)}
        <h2 id="h-dash" style="font-size:clamp(1.7rem,3.6vw,2.7rem);margin-top:14px">${marcar(db.titulo)}</h2>
        <p class="lead" style="margin-top:14px">${marcar(db.lead)}</p></div>
      <div class="rv">
        <div class="phone" aria-hidden="true"><div class="screen">
          <div class="sh"><span>Diretoria</span><b>ao vivo</b></div>
          <div class="kp"><div class="lb">Base ativa</div><div class="vl">12.480 <small>+128</small></div></div>
          <div class="kp"><div class="lb">Caixa hoje</div><div class="vl">R$ 41,2 mil <small>+8,4%</small></div></div>
          <div class="kp"><div class="lb">Inadimplência</div><div class="vl">4,8% <small class="o">meta 3,5%</small></div></div>
          <div class="kp ch"><div class="lb">Ativações · 7 dias</div><div class="chart" id="phChart"></div></div>
        </div></div>
        <p class="phone-cap">${h(db.legendaCelular)}</p>
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

<!-- ===================== MODELOS + FIT ===================== -->
<section class="tint" id="modelos" aria-labelledby="h-modelos">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(mo.rotulo)}</span><h2 id="h-modelos">${marcar(mo.titulo)}</h2></div>
      <p class="hint">${marcar(mo.apoio)}</p></div>
    <div class="cards">
${mo.cartoes.map(k => `      <div class="card rv"><span class="tagm">${h(k.tag)}</span><h3>${h(k.titulo)}</h3><p>${marcar(k.texto)}</p>
        <ul class="inc">${k.itens.map(li).join("")}</ul>
        <div class="for"><b>Para quem</b> ${marcar(k.paraQuem)}</div></div>`).join("\n")}
    </div>
    <p class="models-note">${h(mo.nota)}</p>
    <div class="sec-head rv" style="margin-top:52px"><div><span class="mono">${h(pf.rotulo)}</span><h2>${marcar(pf.titulo)}</h2></div></div>
    <div class="fit">
      <div class="rv"><h4>${h(pf.serveTitulo)}</h4><ul class="yes">${pf.serve.map(li).join("")}</ul></div>
      <div class="rv"><h4>${h(pf.naoServeTitulo)}</h4><ul class="no">${pf.naoServe.map(li).join("")}</ul></div>
    </div>
  </div>
</section>

<!-- ===================== FAQ ===================== -->
<section id="faq" aria-labelledby="h-faq">
  <div class="wrap">
    <div class="sec-head rv"><div><span class="mono">${h(fq.rotulo)}</span><h2 id="h-faq">${marcar(fq.titulo)}</h2></div></div>
    <div class="faq rv">
${fq.itens.map(q => `      <details><summary>${h(q.pergunta)}</summary>${marcar(q.resposta, { paragrafos: true })}</details>`).join("\n")}
    </div>
  </div>
</section>

</main>

<footer id="contato">
  <div class="wrap">
    <div class="foot-grid">
      <div class="rv">
        <img class="foot-logo" src="/assets/marca/01-logo/baishift-branco.svg" alt="Baishift" width="911" height="175">
        <span class="mono" style="color:#8FB4FF;display:block;margin-bottom:14px">${h(ct.rotulo)}</span>
        <h2>${marcar(ct.titulo)}</h2>
        <p style="margin-top:16px;color:rgba(255,255,255,.72);max-width:44ch">${marcar(ct.texto)}</p>
        <div class="contact-acts">
          <a class="btn btn-wa" data-whatsapp data-fallback="Enviar por e-mail" data-fallback-href="mailto:${h(st.email)}?subject=${encodeURIComponent("Diagnóstico de gestão do provedor")}" href="#contato" data-ev="whatsapp:rodape">
            ${SVG_WA}
            <span>${h(ct.botaoWhatsapp)}</span></a>
          <a class="alt" href="mailto:${h(st.email)}">${h(st.email)}</a>
        </div>
        <div class="areas">
${ct.areas.map(a => `          <div><b>${h(a.titulo)}</b><span>${h(a.texto)}</span></div>`).join("\n")}
        </div>
      </div>
      <form class="form rv" id="lead" novalidate>
        <h3>${h(ct.formulario.titulo)}</h3>
        <p class="fh">${h(ct.formulario.subtitulo)}</p>
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
    ${footEnd(st, { href: "#topo", texto: "Voltar ao topo ↑" })}
    <p class="foot-note">${h(st.notaRodape)}</p>
  </div>
</footer>

<a class="wa" data-whatsapp data-fallback="Falar com a Baishift" data-fallback-href="#contato" href="#contato" aria-label="Falar com a Baishift" data-ev="whatsapp:flutuante">
  ${SVG_WA}
  <span>Falar no WhatsApp</span>
</a>

<script src="/assets/js/site.js" defer></script>

<script type="application/ld+json">
${jsonEmbutido(ld)}
</script>
</body>
</html>
`;
};
