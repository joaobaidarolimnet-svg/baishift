/* Painel do gestor — núcleo da aplicação de página única (sem framework, sem inline por causa do CSP).
   Cada tela fica num arquivo próprio e se registra em G.TELAS[nome] = { titulo, admin?, render(host, resto) }.
   O menu lateral vem de G.MENU; item sem tela registrada aparece como "em breve". */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const k = arguments[i];
      if (k == null || k === false) continue;
      if (Array.isArray(k)) k.forEach(x => x != null && e.append(x.nodeType ? x : document.createTextNode(String(x))));
      else e.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
    return e;
  }
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- API ---------- */
  async function api(metodo, rota, corpo) {
    const cab = { "X-Gestor": "1" };
    if (corpo !== undefined) cab["Content-Type"] = "application/json";
    let r;
    try { r = await fetch("/gestor/api/" + rota, { method: metodo, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo) }); }
    catch { throw new Error("sem conexão com o servidor"); }
    let d = {}; try { d = await r.json(); } catch { /* sem corpo */ }
    if (r.status === 401) { location.href = "/gestor"; throw new Error("sessão encerrada"); }
    if (!r.ok) {
      const e = new Error(d.erro || ("erro " + r.status)); e.campo = d.campo; e.status = r.status;
      if (d.trocarSenha) { G.estado.eu.trocarSenha = true; location.hash = "#/conta"; }
      throw e;
    }
    return d;
  }

  /* ---------- avisos ---------- */
  function toast(msg, tipo) {
    const t = el("div", { class: "toast" + (tipo ? " " + tipo : ""), text: msg });
    $("#toasts").append(t); setTimeout(() => t.remove(), 4500);
  }
  function confirmar(msg, o) {
    o = o || {};
    return new Promise(resolve => {
      let feito = false; const fim = v => { if (!feito) { feito = true; resolve(v); } };
      const dlg = el("dialog", { class: "dlg" }, o.titulo ? el("h2", { text: o.titulo }) : null, el("p", { text: msg }),
        el("div", { class: "acoes" },
          el("button", { class: "btn btn-2", type: "button", onclick: () => { fim(false); dlg.close(); } }, "Cancelar"),
          el("button", { class: "btn" + (o.perigo ? " btn-perigo" : ""), type: "button", onclick: () => { fim(true); dlg.close(); } }, o.botao || "Confirmar")));
      dlg.addEventListener("close", () => { fim(false); dlg.remove(); });
      document.body.append(dlg); dlg.showModal();
    });
  }
  /* diálogo com formulário: montar(form) preenche; aoSalvar(dados) pode lançar erro (fica na tela) */
  function dialogoForm(titulo, montar, aoSalvar, textoBotao) {
    return new Promise(resolve => {
      const msg = el("p", { class: "msg", role: "alert" });
      const form = el("form", { class: "dlg-form", novalidate: true });
      montar(form);
      const salvar = el("button", { class: "btn", type: "submit" }, textoBotao || "Salvar");
      const dlg = el("dialog", { class: "dlg" }, el("h2", { text: titulo }), form, msg,
        el("div", { class: "acoes" }, el("button", { class: "btn btn-2", type: "button", onclick: () => dlg.close() }, "Cancelar"), salvar));
      form.addEventListener("submit", async e => {
        e.preventDefault(); msg.textContent = ""; salvar.disabled = true;
        try { const r = await aoSalvar(Object.fromEntries(new FormData(form)), form); dlg.close(); resolve(r === undefined ? true : r); }
        catch (err) { msg.textContent = err.message; marcarErro(form, err.campo); }
        salvar.disabled = false;
      });
      dlg.addEventListener("close", () => { dlg.remove(); resolve(null); });
      document.body.append(dlg); dlg.showModal();
      const primeiro = form.querySelector("input,select,textarea"); if (primeiro) primeiro.focus();
    });
  }
  function marcarErro(form, campo) {
    form.querySelectorAll(".campo.erro").forEach(c => c.classList.remove("erro"));
    if (!campo) return;
    const i = form.querySelector('[name="' + campo + '"]'); if (i) { i.closest(".campo").classList.add("erro"); i.focus(); }
  }

  /* ---------- campos ---------- */
  function campo(rotulo, input, ajuda) {
    const c = el("label", { class: "campo" }, el("span", { text: rotulo }), input);
    if (ajuda) c.append(el("small", { class: "ajuda", text: ajuda }));
    return c;
  }
  function chave(rotulo, attrs, ajuda) {
    return el("label", { class: "chave" }, el("input", Object.assign({ type: "checkbox" }, attrs)), el("span", {}, rotulo, ajuda ? el("small", {}, " · " + ajuda) : null));
  }
  const data = iso => iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

  /* ---------- estado, menu, navegação ---------- */
  const G = window.G = {
    el, $, api, toast, confirmar, dialogoForm, marcarErro, campo, chave, data,
    estado: { eu: null, github: false, railway: false },
    TELAS: {},
    MENU: [
      { grupo: "Painel" }, { tela: "visao-geral", nome: "Visão geral" },
      { grupo: "Conteúdo" }, { tela: "inicio", nome: "Início" }, { tela: "diagnostico", nome: "Diagnóstico" }, { tela: "processos", nome: "Processos" },
      { tela: "dashboard", nome: "Dashboard" }, { tela: "modelos", nome: "Modelos" }, { tela: "perfil", nome: "Serve / não serve" }, { tela: "faq", nome: "FAQ" },
      { tela: "contato", nome: "Contato e rodapé" }, { tela: "produtos", nome: "Produtos" }, { tela: "site", nome: "Site" },
      { grupo: "Acesso" }, { tela: "usuarios", nome: "Usuários", admin: true }, { tela: "conta", nome: "Minha conta" }
    ],
    aoNavegar: []           /* funções chamadas a cada troca de tela (a barra de publicar usa) */
  };

  function padrao() { return ["visao-geral", "inicio", "conta"].find(t => G.TELAS[t]); }
  function montarMenu() {
    const nav = $("#nav"); nav.innerHTML = "";
    G.MENU.forEach(item => {
      if (item.grupo) return nav.append(el("div", { class: "grupo", text: item.grupo }));
      if (item.admin && !G.estado.eu.admin) return;
      const pronta = !!G.TELAS[item.tela];
      nav.append(el("a", { href: "#/" + item.tela, class: pronta ? "" : "breve", "data-tela": item.tela, "aria-disabled": pronta ? null : "true" }, item.nome));
    });
    const eu = G.estado.eu;
    $("#eu").innerHTML = ""; $("#eu").append(el("b", { text: eu.nome }), el("span", { text: eu.email }), el("br"), el("span", { class: "mono", text: eu.admin ? "administrador" : "editor" }));
  }
  function navegar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    let tela = partes[0] || padrao();
    if (G.estado.eu.trocarSenha) tela = "conta";
    const T = G.TELAS[tela];
    if (!T || (T.admin && !G.estado.eu.admin)) { location.hash = "#/" + padrao(); return; }
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("ativo", a.dataset.tela === tela));
    $("#lateral").classList.remove("aberta"); $("#menu-btn").setAttribute("aria-expanded", "false");
    document.title = T.titulo + " · Painel Baishift";
    const host = $("#tela"); host.innerHTML = "";
    G.aoNavegar.forEach(fn => fn(tela));
    Promise.resolve().then(() => T.render(host, partes.slice(1))).catch(e => { host.append(el("p", { class: "vazio", text: e.message })); });
    window.scrollTo(0, 0);
  }
  G.navegar = navegar;

  async function iniciar() {
    const d = await api("GET", "eu");
    G.estado.eu = d.usuario; G.estado.github = d.github; G.estado.railway = d.railway;
    montarMenu();
    $("#menu-btn").addEventListener("click", () => { const ab = $("#lateral").classList.toggle("aberta"); $("#menu-btn").setAttribute("aria-expanded", ab ? "true" : "false"); });
    $("#topo-acoes").append(el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: async () => { await api("POST", "sair", {}); location.href = "/gestor"; } }, "Sair"));
    if (G.estado.eu.trocarSenha && location.hash !== "#/conta") location.hash = "#/conta";
    window.addEventListener("hashchange", navegar);
    navegar();
  }
  document.addEventListener("DOMContentLoaded", () => { iniciar().catch(e => { $("#tela").append(el("p", { class: "vazio", text: e.message })); }); });
})();
