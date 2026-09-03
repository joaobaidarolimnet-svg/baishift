/* Tela "Produtos": lista (ordem, ativo, novo, remover) e edição de cada produto do menu Outros. */
(function () {
  "use strict";
  const { el, F, toast, confirmar, dialogoForm } = G;
  const L = () => G.conteudo.limites;
  const card = (titulo, ...kids) => el("div", { class: "card" }, titulo ? el("h2", { text: titulo }) : null, kids);
  const P = () => G.conteudo.rascunho.produtos;

  function slugDe(nome) {
    return String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "produto";
  }
  function slugLivre(base) { let s = base, n = 2; while (P().some(p => p.slug === s)) s = base.slice(0, 37) + "-" + n++; return s; }
  function marca(p) {
    const m = el("span", { class: "produto-marca" }); m.style.background = p.cor;
    if (p.icone && p.icone.arquivo) m.append(el("img", { src: F.urlImagem(p.icone.arquivo), alt: "" })); else m.textContent = p.letra || p.nome.charAt(0);
    return m;
  }

  async function novo() {
    const r = await dialogoForm("Novo produto", form => form.append(G.campo("Nome", el("input", { name: "nome", type: "text", required: true, maxlength: L().item }), "Você preenche o resto na página do produto.")), async d => {
      const nome = String(d.nome || "").trim(); if (!nome) throw Object.assign(new Error("informe o nome"), { campo: "nome" });
      const slug = slugLivre(slugDe(nome));
      P().push({ slug, nome, ativo: false, cor: "#1652F0", letra: nome.charAt(0).toUpperCase(), icone: { arquivo: "", alt: "" }, status: "em breve", descricaoMenu: "", descricao: "",
        publico: "", titulo: nome, lead: "", chips: [], capa: { arquivo: "", alt: "" },
        comoFunciona: { rotulo: "Como funciona", titulo: "Três coisas, feitas direito.", itens: [] }, blocos: [],
        listaEspera: { ativa: true, convite: "Entre na lista e seja avisado quando o " + nome + " *abrir*.", campo: "", placeholder: "" } });
      G.conteudo.marcar(); return slug;
    }, "Criar");
    if (r) { toast("Produto criado. Ele só aparece no menu quando estiver ativo.", "ok"); location.hash = "#/produtos/" + r; }
  }

  function lista(host) {
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Produtos" }), el("p", { text: "Os itens do menu Outros, cada um com sua página. A ordem aqui é a ordem do menu." })),
      el("button", { class: "btn", type: "button", onclick: novo }, "Novo produto")));
    const box = el("div", { class: "card" });
    function render() {
      box.innerHTML = "";
      const ps = P();
      if (!ps.length) return box.append(el("p", { class: "vazio", text: "Nenhum produto. Crie o primeiro." }));
      const linhas = ps.map((p, i) => {
        const chave = G.chave("", { checked: p.ativo }, null); chave.classList.add("sem-margem");
        chave.querySelector("input").addEventListener("change", e => { p.ativo = e.target.checked; G.conteudo.marcar(); render(); });
        const mover = (d, rot) => el("button", { class: "btn btn-2 btn-mini", type: "button", title: rot, "aria-label": rot, disabled: (d < 0 ? i === 0 : i === ps.length - 1) || null, onclick: () => { [ps[i], ps[i + d]] = [ps[i + d], ps[i]]; G.conteudo.marcar(); render(); } }, d < 0 ? "↑" : "↓");
        return el("tr", {},
          el("td", {}, el("div", { class: "produto-nome" }, marca(p), el("div", {}, el("b", { text: p.nome }), el("br"), el("span", { class: "mono", text: "/outros/" + p.slug })))),
          el("td", {}, el("span", { class: "selo cinza", text: p.status || "—" })),
          el("td", {}, chave, el("span", { class: "selo " + (p.ativo ? "verde" : "cinza"), text: p.ativo ? "no menu" : "escondido" })),
          el("td", {}, el("div", { class: "item-acoes" }, mover(-1, "Mover para cima"), mover(1, "Mover para baixo"),
            el("a", { class: "btn btn-2 btn-mini", href: "#/produtos/" + p.slug }, "Editar"),
            el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: async () => { if (await confirmar("Remover \"" + p.nome + "\"? A página /outros/" + p.slug + " deixa de existir quando você publicar.", { botao: "Remover", perigo: true })) { ps.splice(i, 1); G.conteudo.marcar(); render(); } } }, "Remover"))));
      });
      box.append(el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" }, el("thead", {}, el("tr", {}, el("th", { text: "Produto" }), el("th", { text: "Status" }), el("th", { text: "Menu" }), el("th", {}))), el("tbody", {}, linhas))));
    }
    render(); host.append(box);
  }

  function editar(host, slug) {
    const i = P().findIndex(p => p.slug === slug);
    if (i < 0) { location.hash = "#/produtos"; return; }
    const b = "produtos." + i, p = P()[i];
    G.conteudo.paginaAtual = "produto:" + p.slug;
    const publicado = G.conteudo.publicado.produtos.some(x => x.slug === slug);
    host.append(el("a", { class: "voltar", href: "#/produtos" }, "← Produtos"));
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: p.nome }), el("p", { text: "Página /outros/" + p.slug + " e item do menu Outros. Use Visualizar para ver a página com as mudanças." }))));

    const slugCampo = F.texto(b + ".slug", "Endereço (slug)", { max: L().slugMax, ajuda: "Só letras minúsculas, números e hífens." + (publicado ? " Mudar troca a URL da página já publicada." : "") });
    slugCampo.querySelector("input").addEventListener("input", e => { const v = e.target.value.trim().toLowerCase(); if (/^[a-z0-9-]{2,40}$/.test(v)) { G.conteudo.paginaAtual = "produto:" + v; history.replaceState(null, "", "#/produtos/" + v); } });
    const nomeCampo = F.texto(b + ".nome", "Nome", { max: L().item });
    nomeCampo.querySelector("input").addEventListener("input", e => { host.querySelector(".tela-cab h1").textContent = e.target.value || "Produto"; });

    host.append(card("Identidade",
      el("div", { class: "linha" }, nomeCampo, slugCampo),
      F.chave(b + ".ativo", "Ativo", "aparece no menu Outros e a página responde"),
      el("div", { class: "linha tres" }, F.cor(b + ".cor", "Cor"), F.texto(b + ".letra", "Letra ou símbolo", { max: 2, ajuda: "Usada no menu e na arte quando não há ícone." }), F.texto(b + ".status", "Status", { max: L().item, placeholder: "em desenvolvimento" })),
      F.imagem(b + ".icone.arquivo", "Ícone (opcional, quadrado)", { contexto: p.slug + "-icone", alt: "alt", ajuda: "Substitui a letra no menu e na arte. PNG com transparência funciona." }),
      F.texto(b + ".descricaoMenu", "Descrição curta no menu", { max: L().curto }),
      F.multilinha(b + ".descricao", "Descrição para o Google e redes", { max: L().curto })));
    host.append(card("Topo da página",
      F.texto(b + ".publico", "Para quem é (linha pequena acima do título)", { max: L().curto }),
      F.texto(b + ".titulo", "Título", { ajuda: "*asteriscos* no trecho na cor do produto." }),
      F.multilinha(b + ".lead", "Texto de apoio", { max: L().curto }),
      F.listaTextos(b + ".chips", "Chips flutuantes da arte (até 3)", { max: 3 }),
      F.imagem(b + ".capa.arquivo", "Capa (opcional)", { contexto: p.slug + "-capa", alt: "alt", ajuda: "Se houver capa, ela substitui a arte com a letra e os chips. Recomendado 1200 × 1200." })));
    host.append(card("Como funciona",
      el("div", { class: "linha" }, F.texto(b + ".comoFunciona.rotulo", "Rótulo", { max: L().item }), F.texto(b + ".comoFunciona.titulo", "Título")),
      F.listaObjetos(b + ".comoFunciona.itens", "Itens (numerados 01, 02…)", { max: 6, duplicar: true, novo: () => ({ titulo: "", texto: "" }), titulo: (f, k) => String(k + 1).padStart(2, "0") + " " + (f.titulo || ""), textoAdicionar: "+ Adicionar item",
        campos: bb => [F.texto(bb + ".titulo", "Título", { max: L().item }), F.multilinha(bb + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Blocos livres", F.blocos(b + ".blocos", p.slug)));
    host.append(card("Lista de espera",
      F.chave(b + ".listaEspera.ativa", "Lista de espera ligada", "desligada, o botão do topo e o formulário somem"),
      F.texto(b + ".listaEspera.convite", "Convite", { max: L().curto, ajuda: "*asteriscos* no trecho na cor do produto." }),
      el("div", { class: "linha" }, F.texto(b + ".listaEspera.campo", "Campo extra do formulário (opcional)", { max: L().item }), F.texto(b + ".listaEspera.placeholder", "Exemplo dentro do campo", { max: L().item }))));
  }

  G.TELAS.produtos = { titulo: "Produtos", async render(host, resto) {
    await G.conteudo.garantir();
    if (resto[0]) editar(host, resto[0]); else lista(host);
  } };
})();
