/* Campos de formulário ligados ao rascunho (G.conteudo.rascunho) por caminho ("inicio.titulo", "produtos.0.blocos.2.texto").
   Toda mudança grava no rascunho e chama G.conteudo.marcar(). Listas re-renderizam o próprio bloco ao mudar de forma. */
(function () {
  "use strict";
  const { el, campo: rotular, toast } = G;

  const partes = c => String(c).split(".").filter(Boolean);
  function get(obj, c) { return partes(c).reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function set(obj, c, v) {
    const p = partes(c); let o = obj;
    for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
  }
  const R = () => G.conteudo.rascunho;
  const L = () => G.conteudo.limites || {};
  const mudou = () => G.conteudo.marcar();

  /* ---------- campos simples ---------- */
  function texto(caminho, rotulo, o = {}) {
    const i = el("input", { type: o.tipo || "text", value: get(R(), caminho) || "", maxlength: o.max || L().titulo, placeholder: o.placeholder || null });
    i.addEventListener("input", () => { set(R(), caminho, i.value); mudou(); });
    return rotular(rotulo, i, o.ajuda);
  }
  function multilinha(caminho, rotulo, o = {}) {
    const t = el("textarea", { maxlength: o.max || L().curto, rows: o.linhas || 3 });
    t.value = get(R(), caminho) || "";
    t.addEventListener("input", () => { set(R(), caminho, t.value); mudou(); });
    return rotular(rotulo, t, o.ajuda || (o.max >= 1000 ? "Linha em branco separa parágrafos. *destaque*, **negrito**, [texto](url)." : undefined));
  }
  function link(caminho, rotulo, o = {}) { return texto(caminho, rotulo, Object.assign({ max: 500, placeholder: "#secao, /outros/produto, https://… ou mailto:…" }, o)); }
  function numero(caminho, rotulo, o = {}) {
    const i = el("input", { type: "number", min: o.min, max: o.max, step: 1, value: get(R(), caminho) });
    i.addEventListener("input", () => { const n = Number(i.value); if (Number.isInteger(n)) { set(R(), caminho, n); mudou(); } });
    return rotular(rotulo, i, o.ajuda);
  }
  function chave(caminho, rotulo, ajuda) {
    const c = G.chave(rotulo, { checked: !!get(R(), caminho) }, ajuda);
    c.querySelector("input").addEventListener("change", e => { set(R(), caminho, e.target.checked); mudou(); });
    return c;
  }
  function cor(caminho, rotulo) {
    const atual = get(R(), caminho) || "#1652F0";
    const c = el("input", { type: "color", value: atual }), t = el("input", { type: "text", value: atual, maxlength: 7, pattern: "#[0-9A-Fa-f]{6}" });
    c.addEventListener("input", () => { t.value = c.value.toUpperCase(); set(R(), caminho, t.value); mudou(); });
    t.addEventListener("input", () => { if (/^#[0-9A-Fa-f]{6}$/.test(t.value)) { c.value = t.value; set(R(), caminho, t.value.toUpperCase()); mudou(); } });
    return rotular(rotulo, el("div", { class: "cor-campo" }, c, t));
  }

  /* ---------- botões de lista ---------- */
  function acoesItem(lista, i, o, rerender) {
    const b = (txt, rot, fn, off) => el("button", { class: "btn btn-2 btn-mini", type: "button", "aria-label": rot, title: rot, disabled: off || null, onclick: () => { fn(); mudou(); rerender(); } }, txt);
    const acoes = [b("↑", "Mover para cima", () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }, i === 0),
      b("↓", "Mover para baixo", () => { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; }, i === lista.length - 1)];
    if (!o.fixo) {
      if (o.duplicar) acoes.push(b("⧉", "Duplicar", () => { lista.splice(i + 1, 0, JSON.parse(JSON.stringify(lista[i]))); }, o.max && lista.length >= o.max));
      acoes.push(b("×", "Remover", () => { lista.splice(i, 1); }, o.min && lista.length <= o.min));
    }
    return el("div", { class: "item-acoes" }, acoes);
  }
  function botaoAdicionar(lista, o, rerender, texto) {
    return el("button", { class: "btn btn-2 btn-mini", type: "button", disabled: o.max && lista.length >= o.max ? true : null, onclick: () => { lista.push(typeof o.novo === "function" ? o.novo() : ""); mudou(); rerender(); } }, texto || "+ Adicionar");
  }

  /* lista de textos curtos: um input por item */
  function listaTextos(caminho, rotulo, o = {}) {
    const box = el("div", { class: "lista" });
    function render() {
      box.innerHTML = "";
      if (rotulo) box.append(el("span", { class: "lista-rotulo", text: rotulo }));
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((v, i) => {
        const i2 = el("input", { type: "text", value: v, maxlength: o.itemMax || L().item });
        i2.addEventListener("input", () => { lista[i] = i2.value; mudou(); });
        box.append(el("div", { class: "item item-linha" }, i2, acoesItem(lista, i, o, render)));
      });
      box.append(el("div", { class: "lista-pe" }, botaoAdicionar(lista, o, render), o.ajuda ? el("small", { class: "ajuda", text: o.ajuda }) : null));
    }
    render(); return box;
  }

  /* lista de objetos: um cartão por item; campos(caminhoDoItem, item, i) devolve os elementos */
  function listaObjetos(caminho, rotulo, o) {
    const box = el("div", { class: "lista" });
    function render() {
      box.innerHTML = "";
      if (rotulo) box.append(el("span", { class: "lista-rotulo", text: rotulo }));
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((item, i) => {
        const base = caminho + "." + i;
        box.append(el("div", { class: "item" },
          el("div", { class: "item-cab" }, el("b", { text: o.titulo ? o.titulo(item, i) : "Item " + (i + 1) }), acoesItem(lista, i, o, render)),
          el("div", { class: "item-corpo" }, o.campos(base, item, i))));
      });
      if (!o.fixo) box.append(el("div", { class: "lista-pe" }, botaoAdicionar(lista, o, render, o.textoAdicionar), o.ajuda ? el("small", { class: "ajuda", text: o.ajuda }) : null));
    }
    render(); return box;
  }

  /* ---------- imagem: escolhe, redimensiona no navegador, envia e guarda "pendente:<id>" ---------- */
  function urlImagem(ref) { return !ref ? "" : ref.startsWith("pendente:") ? "/gestor/api/pendentes/" + ref.slice(9) : "/" + ref; }
  async function preparar(file) {
    if (file.type === "image/gif") return file;
    const bmp = await createImageBitmap(file);
    const MAX = 1920, k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"); ctx.drawImage(bmp, 0, 0, w, h);
    let alfa = false;
    if (file.type === "image/png") { const d = ctx.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4 * 61) if (d[i] < 250) { alfa = true; break; } }
    const toBlob = (tipo, q) => new Promise(r => cv.toBlob(r, tipo, q));
    let blob = alfa ? await toBlob("image/png") : await toBlob("image/webp", 0.85);
    if (!alfa && (!blob || blob.type !== "image/webp")) blob = await toBlob("image/jpeg", 0.86);
    return blob;
  }
  async function enviar(file, contexto) {
    const blob = await preparar(file);
    const r = await fetch("/gestor/api/imagens", { method: "POST", headers: { "X-Gestor": "1", "X-Contexto": contexto, "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = "/gestor"; throw new Error("sessão encerrada"); }
    if (!r.ok) throw new Error(d.erro || "não consegui enviar a imagem");
    return d.ref;
  }
  function imagem(caminho, rotulo, o = {}) {
    const box = el("div", { class: "img-campo" });
    function render() {
      box.innerHTML = "";
      const ref = get(R(), caminho);
      const entrada = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
      entrada.addEventListener("change", async () => {
        const f = entrada.files[0]; if (!f) return;
        box.classList.add("enviando");
        try { set(R(), caminho, await enviar(f, o.contexto || "imagem")); mudou(); toast("Imagem enviada. Ela entra no site quando você publicar.", "ok"); }
        catch (e) { toast(e.message, "erro"); }
        render();
      });
      const acoes = el("div", { class: "acoes" },
        el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => entrada.click() }, ref ? "Trocar imagem" : "Escolher imagem"),
        ref ? el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => { set(R(), caminho, ""); if (o.alt) set(R(), caminho.replace(/[^.]+$/, "") + o.alt, ""); mudou(); render(); } }, "Remover") : null, entrada);
      box.append(el("span", { class: "lista-rotulo", text: rotulo }),
        el("div", { class: "img-linha" }, ref ? el("img", { src: urlImagem(ref), alt: "" }) : el("div", { class: "img-vazia", text: o.dica || "sem imagem" }), el("div", {}, acoes, el("small", { class: "ajuda", text: o.ajuda || "JPG, PNG, WebP ou GIF. Redimensionada para até 1920 px antes de subir." }))));
      if (ref && o.alt) box.append(texto(caminho.replace(/[^.]+$/, "") + o.alt, "Texto alternativo (acessibilidade)", { max: L().curto, ajuda: "Descreva a imagem em uma frase." }));
    }
    render(); return box;
  }

  /* ---------- blocos livres da página de produto ---------- */
  const TIPOS_BLOCO = {
    texto: { nome: "Texto", novo: () => ({ tipo: "texto", titulo: "", texto: "" }), campos: b => [texto(b + ".titulo", "Título (opcional)"), multilinha(b + ".texto", "Texto", { max: L().longo, linhas: 5 })] },
    imagem: { nome: "Imagem", novo: () => ({ tipo: "imagem", arquivo: "", alt: "", legenda: "" }), campos: (b, p) => [imagem(b + ".arquivo", "Imagem", { contexto: p + "-bloco", alt: "alt" }), texto(b + ".legenda", "Legenda (opcional)", { max: L().curto })] },
    imagemTexto: { nome: "Imagem com texto ao lado", novo: () => ({ tipo: "imagemTexto", arquivo: "", alt: "", titulo: "", texto: "", imagemDireita: false }), campos: (b, p) => [imagem(b + ".arquivo", "Imagem", { contexto: p + "-bloco", alt: "alt" }), texto(b + ".titulo", "Título (opcional)"), multilinha(b + ".texto", "Texto", { max: L().longo, linhas: 4 }), chave(b + ".imagemDireita", "Imagem à direita")] },
    lista: { nome: "Lista", novo: () => ({ tipo: "lista", titulo: "", itens: [""] }), campos: b => [texto(b + ".titulo", "Título (opcional)"), listaTextos(b + ".itens", "Itens", { min: 1, max: L().lista })] },
    destaque: { nome: "Destaque com botão", novo: () => ({ tipo: "destaque", titulo: "", texto: "", botao: { texto: "", link: "" } }), campos: b => [texto(b + ".titulo", "Título"), multilinha(b + ".texto", "Texto", { max: L().longo }), el("div", { class: "linha" }, texto(b + ".botao.texto", "Botão · texto", { max: L().item, ajuda: "Em branco, sem botão." }), link(b + ".botao.link", "Botão · link"))] }
  };
  function blocos(caminho, slug) {
    const box = el("div", { class: "lista blocos" });
    function render() {
      box.innerHTML = "";
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((b, i) => {
        const T = TIPOS_BLOCO[b.tipo]; if (!T) return;
        box.append(el("div", { class: "item bloco" },
          el("div", { class: "item-cab" }, el("span", { class: "selo", text: T.nome }), acoesItem(lista, i, { duplicar: true, max: L().blocos }, render)),
          el("div", { class: "item-corpo" }, T.campos(caminho + "." + i, slug))));
      });
      const sel = el("select", {}, Object.keys(TIPOS_BLOCO).map(k => el("option", { value: k, text: TIPOS_BLOCO[k].nome })));
      box.append(el("div", { class: "lista-pe" }, sel, el("button", { class: "btn btn-2 btn-mini", type: "button", disabled: lista.length >= L().blocos ? true : null, onclick: () => { lista.push(TIPOS_BLOCO[sel.value].novo()); mudou(); render(); } }, "+ Adicionar bloco"),
        el("small", { class: "ajuda", text: "Os blocos aparecem na página do produto, nesta ordem, entre \"Como funciona\" e a lista de espera." })));
    }
    render(); return box;
  }

  G.F = { get, set, texto, multilinha, link, numero, chave, cor, listaTextos, listaObjetos, imagem, blocos, urlImagem };
})();
