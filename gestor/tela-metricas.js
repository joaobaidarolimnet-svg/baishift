/* Tela "Visão geral": cartões, gráfico de visitas por dia (SVG) e tabelas do período. */
(function () {
  "use strict";
  const { el, api } = G;
  const fmt = n => Number(n || 0).toLocaleString("pt-BR");
  const dataBR = d => d.split("-").reverse().join("/");
  const NOME_SECAO = { diagnostico: "Diagnóstico", processos: "Processos", dashboard: "Dashboard", modelos: "Modelos", faq: "FAQ", contato: "Contato" };
  const NOME_ORIGEM = { google: "Google", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", linkedin: "LinkedIn", youtube: "YouTube", direto: "Direto / link" };
  function nomeAlvo(a) {
    const i = a.indexOf(":"), k = i < 0 ? a : a.slice(0, i), resto = i < 0 ? "" : a.slice(i + 1);
    return ({ whatsapp: "WhatsApp · " + resto, cta: "Botão · " + resto, menu: "Menu · " + resto.replace("outros:", ""), carrossel: "Anúncio " + resto, lista: "Lista de espera · " + resto, bloco: "Bloco · " + resto })[k] || a;
  }
  function delta(v, a) {
    if (!a) return el("span", { class: "delta", text: v ? "sem base anterior" : "—" });
    const p = Math.round((v - a) / a * 100);
    return el("span", { class: "delta " + (p >= 0 ? "sobe" : "desce"), text: (p >= 0 ? "+" : "") + p + "% vs. período anterior" });
  }
  const cartao = (rotulo, t) => el("div", { class: "kpi" }, el("span", { class: "mono", text: rotulo }), el("b", { text: fmt(t.valor) }), delta(t.valor, t.anterior));
  function grafico(porDia) {
    const W = 720, H = 170, P = 26, n = porDia.length, max = Math.max(1, ...porDia.map(d => d.visitas)), bw = (W - P * 2) / n;
    const ns = (t, a) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const svg = ns("svg", { viewBox: "0 0 " + W + " " + H, class: "grafico", role: "img", "aria-label": "visitas por dia" });
    porDia.forEach((d, i) => {
      const h = (H - P * 2) * d.visitas / max, x = P + i * bw;
      const r = ns("rect", { x: x + bw * 0.15, y: H - P - h, width: bw * 0.7, height: h, rx: 3, class: "barra" });
      const t = ns("title", {}); t.textContent = dataBR(d.dia) + ": " + d.visitas + " visitas, " + d.visitantes + " visitantes"; r.append(t); svg.append(r);
    });
    [0, Math.floor(n / 2), n - 1].forEach(i => { const t = ns("text", { x: P + i * bw + bw / 2, y: H - 7, "text-anchor": "middle", class: "rotulo" }); t.textContent = porDia[i].dia.slice(5).split("-").reverse().join("/"); svg.append(t); });
    return svg;
  }
  function tabela(colunas, linhas, vazio) {
    if (!linhas.length) return el("p", { class: "vazio", text: vazio || "Sem dados no período." });
    return el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" },
      el("thead", {}, el("tr", {}, colunas.map(c => el("th", { text: c.t, class: c.num ? "num" : null })))),
      el("tbody", {}, linhas.map(l => el("tr", {}, colunas.map(c => el("td", { class: c.num ? "num" : null }, c.v(l))))))));
  }
  const card = (titulo, ...kids) => el("div", { class: "card" }, el("h2", { text: titulo }), kids);
  const n = (t, v) => ({ t, v, num: true });

  async function render(host, periodo) {
    periodo = [7, 30, 90].includes(Number(periodo)) ? Number(periodo) : 30;
    host.innerHTML = "";
    const seg = el("div", { class: "seg" }, [7, 30, 90].map(p => el("button", { type: "button", class: p === periodo ? "ativo" : "", onclick: () => render(host, p) }, p + " dias")));
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Visão geral" }), el("p", { text: "Como as pessoas chegam ao site e o que fazem nele." })), seg));
    let r;
    try { r = await api("GET", "metricas?periodo=" + periodo); } catch (e) { host.append(el("p", { class: "vazio", text: e.message })); return; }
    host.append(el("div", { class: "kpis" }, cartao("Visitas", r.totais.visitas), cartao("Visitantes · únicos por dia", r.totais.visitantes), cartao("Formulários enviados", r.totais.formularios), cartao("Cliques em anúncios", r.totais.cliquesAnuncio)));
    host.append(card("Visitas por dia · " + dataBR(r.de) + " a " + dataBR(r.ate), grafico(r.porDia)));
    host.append(el("div", { class: "duas" },
      card("Páginas mais vistas", tabela([{ t: "Página", v: l => l.pagina }, n("Visitas", l => fmt(l.visitas))], r.paginas)),
      card("De onde vieram", tabela([{ t: "Origem", v: l => NOME_ORIGEM[l.origem] || l.origem }, n("Visitas", l => fmt(l.visitas))], r.origens)),
      card("Cidades", tabela([{ t: "Cidade", v: l => l.cidade + (l.uf ? " · " + l.uf : "") }, n("Visitas", l => fmt(l.visitas))], r.cidades, "Sem localização no período" + (r.semLocalizacao ? " (" + r.semLocalizacao + " visitas sem cidade)." : "."))),
      card("Estados", tabela([{ t: "UF", v: l => l.uf }, n("Visitas", l => fmt(l.visitas))], r.estados)),
      card("Dispositivos", tabela([{ t: "Tipo", v: l => l.k }, n("Visitas", l => fmt(l.v))], [{ k: "Celular", v: r.dispositivos.celular }, { k: "Computador", v: r.dispositivos.computador }])),
      card("Até onde rolaram na página principal", tabela([{ t: "Seção", v: l => NOME_SECAO[l.secao] || l.secao }, n("Visitas", l => fmt(l.visitas)), n("% de quem abriu", l => l.base ? Math.round(l.visitas / l.base * 100) + "%" : "—")], r.secoes)),
      card("Cliques", tabela([{ t: "Alvo", v: l => nomeAlvo(l.alvo) }, n("Cliques", l => fmt(l.cliques))], r.cliques)),
      card("Anúncios do carrossel", tabela([{ t: "Imagem", v: l => "Imagem " + l.imagem }, n("Exibições", l => fmt(l.exibicoes)), n("Cliques", l => fmt(l.cliques))], r.carrossel, "O carrossel não foi exibido no período.")),
      card("Produtos", tabela([{ t: "Produto", v: l => l.nome }, n("Visitas", l => fmt(l.visitas)), n("Menu", l => fmt(l.cliquesMenu)), n("Blocos", l => fmt(l.cliquesBlocos)), n("Inscrições", l => fmt(l.inscricoes))], r.produtos)),
      card("Formulários", tabela([{ t: "Formulário", v: l => l.k }, n("Envios", l => fmt(l.v))], [{ k: "Diagnóstico", v: r.formularios.diagnostico }].concat(Object.keys(r.formularios.listas).map(s => ({ k: "Lista de espera · " + s, v: r.formularios.listas[s] })))))));
    host.append(el("p", { class: "ajuda-bloco", text: "Métricas próprias, sem cookies. Localização por IP feita no servidor; o IP não é armazenado. Visitantes com \"não rastrear\" ligado não entram na conta." }));
  }
  G.TELAS["visao-geral"] = { titulo: "Visão geral", render: host => render(host, 30) };
})();
