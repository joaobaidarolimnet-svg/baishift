/* Rascunho e publicação: carrega o conteúdo publicado, mantém o rascunho (também no localStorage),
   e cuida da barra Visualizar / Publicar / Descartar no topo. */
(function () {
  "use strict";
  const { el, $, api, toast, confirmar } = G;
  const clonar = o => JSON.parse(JSON.stringify(o));
  const NOMES = { site: "Site", inicio: "Início", diagnostico: "Diagnóstico", processos: "Processos", dashboard: "Dashboard", modelos: "Modelos", perfil: "Serve / não serve", faq: "FAQ", contato: "Contato e rodapé" };

  const C = G.conteudo = {
    publicado: null, rascunho: null, baseadoEm: null, limites: {}, paginaAtual: "inicio", carregando: null,
    chave() { return "gestor:rascunho:" + G.estado.eu.id; },
    alterado() { return !!C.rascunho && JSON.stringify(C.rascunho) !== JSON.stringify(C.publicado); },
    /* seções que diferem entre rascunho e publicado */
    mudancas() {
      const r = C.rascunho, p = C.publicado, out = [];
      for (const k in NOMES) if (JSON.stringify(r[k]) !== JSON.stringify(p[k])) out.push(NOMES[k]);
      const pp = new Map(p.produtos.map(x => [x.slug, x]));
      r.produtos.forEach(x => { const a = pp.get(x.slug); if (!a) out.push("Produto novo: " + x.nome); else if (JSON.stringify(a) !== JSON.stringify(x)) out.push("Produto: " + x.nome); });
      p.produtos.forEach(x => { if (!r.produtos.some(y => y.slug === x.slug)) out.push("Produto removido: " + x.nome); });
      return out;
    },
    async garantir(forcarRecarga) {
      if (C.rascunho && !forcarRecarga) return;
      if (!C.carregando) C.carregando = (async () => {
        const d = await api("GET", "conteudo");
        C.publicado = d.conteudo; C.baseadoEm = d.atualizadoEm; C.limites = d.limites;
        let guardado = null; try { guardado = JSON.parse(localStorage.getItem(C.chave()) || "null"); } catch { /* sem rascunho */ }
        if (!forcarRecarga && guardado && guardado.rascunho && JSON.stringify(guardado.rascunho) !== JSON.stringify(C.publicado)) {
          C.rascunho = guardado.rascunho; C.baseadoEm = guardado.baseadoEm || C.baseadoEm;
          toast("Você tem alterações não publicadas de " + G.data(guardado.quando) + ". Continue editando ou use Descartar.");
        } else { C.rascunho = clonar(C.publicado); try { localStorage.removeItem(C.chave()); } catch { /* sem localStorage */ } }
        C.carregando = null; barra();
      })();
      await C.carregando;
    },
    marcar() {
      try { localStorage.setItem(C.chave(), JSON.stringify({ rascunho: C.rascunho, baseadoEm: C.baseadoEm, quando: new Date().toISOString() })); } catch { /* cheio ou bloqueado */ }
      barra();
    },
    async descartar() {
      if (!await confirmar("Descartar todas as alterações não publicadas?", { botao: "Descartar", perigo: true })) return;
      C.rascunho = clonar(C.publicado); try { localStorage.removeItem(C.chave()); } catch { /* ok */ }
      barra(); G.navegar(); toast("Alterações descartadas.");
    },
    visualizar() {
      const form = el("form", { method: "post", action: "/gestor/api/previa", target: "_blank", hidden: true },
        el("input", { type: "hidden", name: "conteudo", value: JSON.stringify(C.rascunho) }), el("input", { type: "hidden", name: "pagina", value: C.paginaAtual || "inicio" }));
      document.body.append(form); form.submit(); form.remove();
    },
    async publicar(forcar) {
      const lista = C.mudancas();
      if (!lista.length) return toast("Nada para publicar.");
      if (!forcar) {
        const ok = await new Promise(resolve => {
          const dlg = el("dialog", { class: "dlg" }, el("h2", { text: "Publicar no site" }),
            el("p", { text: "O que muda:" }), el("ul", { class: "publicar-resumo" }, lista.map(x => el("li", { text: x }))),
            el("p", { class: "ajuda", text: G.estado.github ? "Vai gerar um commit no GitHub e entrar no ar na hora. O Railway republica em um ou dois minutos com o mesmo conteúdo." : (G.estado.railway ? "O servidor está sem GITHUB_TOKEN: a publicação vai falhar até a variável ser configurada no Railway." : "Modo local: grava nos arquivos do projeto; faça o commit e o push para publicar.") }),
            el("div", { class: "acoes" }, el("button", { class: "btn btn-2", type: "button", onclick: () => { dlg.close(); resolve(false); } }, "Cancelar"), el("button", { class: "btn", type: "button", onclick: () => { dlg.close(); resolve(true); } }, "Publicar")));
          dlg.addEventListener("close", () => { dlg.remove(); resolve(false); }); document.body.append(dlg); dlg.showModal();
        });
        if (!ok) return;
      }
      const botao = $("#btn-publicar"); botao.disabled = true; botao.textContent = "Publicando…";
      try {
        const r = await api("POST", "publicar", { conteudo: C.rascunho, baseadoEm: C.baseadoEm, forcar: !!forcar });
        try { localStorage.removeItem(C.chave()); } catch { /* ok */ }
        await C.garantir(true); G.navegar();
        const dlg = el("dialog", { class: "dlg" }, el("h2", { text: "Publicado" }),
          el("p", { text: (r.modo === "github" ? "Commit feito e site atualizado às " : "Gravado nos arquivos do projeto às ") + new Date(r.publicadoEm).toLocaleTimeString("pt-BR", { timeStyle: "short" }) + "." }),
          r.commit ? el("p", {}, el("a", { href: r.commit.url, target: "_blank", rel: "noopener", text: "Ver o commit no GitHub" }), " · o Railway republica em um ou dois minutos.") : el("p", { class: "ajuda", text: "Faça o commit e o push para o site publicar." }),
          el("div", { class: "acoes" }, el("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Fechar")));
        dlg.addEventListener("close", () => dlg.remove()); document.body.append(dlg); dlg.showModal();
      } catch (e) {
        if (e.status === 409) {
          if (await confirmar("Outra pessoa publicou o site depois que você começou a editar. Publicar mesmo assim sobrescreve o que ela fez.", { botao: "Sobrescrever", perigo: true })) { botao.disabled = false; return C.publicar(true); }
        } else toast(e.message + (e.campo ? " (" + e.campo + ")" : ""), "erro");
      }
      botao.disabled = false; botao.textContent = "Publicar"; barra();
    }
  };

  function barra() {
    let b = $("#barra-publicar");
    if (!b) { b = el("div", { class: "barra-publicar", id: "barra-publicar" }); $("#topo-acoes").prepend(b); }
    b.innerHTML = "";
    if (!C.rascunho) return;
    const alt = C.alterado();
    b.append(el("span", { class: "selo " + (alt ? "laranja" : "verde"), text: alt ? "alterações não publicadas" : "tudo publicado" }),
      el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: C.visualizar }, "Visualizar"),
      alt ? el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: C.descartar }, "Descartar") : null,
      el("button", { class: "btn btn-mini", id: "btn-publicar", type: "button", disabled: alt ? null : true, onclick: () => C.publicar(false) }, "Publicar"));
  }

  G.aoIniciar.push(async () => { if (!G.estado.eu.trocarSenha) await C.garantir(); });
  G.aoNavegar.push(tela => { if (tela !== "produtos") C.paginaAtual = "inicio"; });
})();
