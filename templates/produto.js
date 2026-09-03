/* Modelo das landing pages dos produtos do menu Outros. */
"use strict";
const { h, marcar, urlImagem } = require("../lib/html");
const { AVISO, head, barraProduto, footEnd } = require("./comum");

function arte(p, o) {
  if (p.capa.arquivo) return `<div class="lp-art lp-capa"><img src="${h(urlImagem(p.capa.arquivo, o))}" alt="${h(p.capa.alt)}" loading="eager"></div>`;
  return `<div class="lp-art" aria-hidden="true">
          <span class="glyph">${p.icone.arquivo ? `<img src="${h(urlImagem(p.icone.arquivo, o))}" alt="">` : h(p.letra)}</span>
          ${p.chips.map((c, i) => `<span class="chip c${i + 1}"><i></i>${h(c)}</span>`).join("\n          ")}
        </div>`;
}

const titulo = t => t ? `<h2>${marcar(t)}</h2>` : "";

function blocoHtml(b, i, p, o) {
  const img = () => `<img src="${h(urlImagem(b.arquivo, o))}" alt="${h(b.alt)}" loading="lazy">`;
  switch (b.tipo) {
    case "texto":
      return `<div class="bl bl-texto rv">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}</div>`;
    case "imagem":
      return `<figure class="bl bl-imagem rv">${img()}${b.legenda ? `<figcaption>${h(b.legenda)}</figcaption>` : ""}</figure>`;
    case "imagemTexto":
      return `<div class="bl bl-imagem-texto${b.imagemDireita ? " dir" : ""} rv">${img()}<div class="txt">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}</div></div>`;
    case "lista":
      return `<div class="bl bl-lista rv">${titulo(b.titulo)}<ul>${b.itens.map(s => `<li>${marcar(s)}</li>`).join("")}</ul></div>`;
    case "destaque":
      return `<div class="bl bl-destaque rv">${titulo(b.titulo)}${marcar(b.texto, { paragrafos: true })}${b.botao.texto ? `<a class="btn btn-1" href="${h(b.botao.link || "#")}" style="background:${h(p.cor)}" data-ev="bloco:${p.slug}:${i + 1}">${h(b.botao.texto)}</a>` : ""}</div>`;
  }
  return "";
}

module.exports = function paginaProduto(p, c, o = {}) {
  const st = c.site, cf = p.comoFunciona, le = p.listaEspera, cor = h(p.cor);
  const comoFunciona = cf.itens.length ? `
  <section aria-labelledby="h-como">
    <div class="wrap">
      <div class="sec-head rv"><div><span class="mono" style="color:${cor}">${h(cf.rotulo)}</span><h2 id="h-como">${marcar(cf.titulo)}</h2></div></div>
      <div class="lp-feats">
        ${cf.itens.map((f, i) => `<div class="feat rv"><div class="ic">${String(i + 1).padStart(2, "0")}</div><h3>${h(f.titulo)}</h3><p>${marcar(f.texto)}</p></div>`).join("\n        ")}
      </div>
    </div>
  </section>` : "";
  const blocos = p.blocos.length ? `
  <section class="lp-blocos" aria-label="Mais sobre ${h(p.nome)}">
    <div class="wrap">
      ${p.blocos.map((b, i) => blocoHtml(b, i, p, o)).join("\n      ")}
    </div>
  </section>` : "";
  const lista = le.ativa ? `
  <div class="lp-band" id="lista">
    <div class="wrap">
      <div class="rv">
        <span class="mono" style="color:${cor};display:block;margin-bottom:14px">Lista de espera</span>
        <h2>${marcar(le.convite)}</h2>
        <p style="margin-top:16px">Sem spam: um aviso quando abrir, e só.</p>
      </div>
      <form class="form rv" data-mail="Lista de espera · ${h(p.nome)}" data-ev="lista:${p.slug}" novalidate>
        <h3>Quero ser avisado</h3>
        <p class="fh">Dois campos. O aviso vai por e-mail.</p>
        <div class="fgrid">
          <label>Seu nome<input name="nome" type="text" autocomplete="name" required placeholder="Como quer ser chamado"></label>
          <label>Seu e-mail<input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>
          ${le.campo ? `<label class="full">${h(le.campo)}<input name="detalhe" type="text" placeholder="${h(le.placeholder)}"></label>` : ""}
        </div>
        <div class="send"><button class="btn btn-1" type="submit" style="background:${cor}">Entrar na lista</button><span class="note">Abre o seu e-mail com a mensagem pronta para enviar.</span></div>
        <div class="ok" hidden>Mensagem preparada. Se a janela não abriu, escreva para ${h(st.email)}.</div>
      </form>
    </div>
  </div>` : "";

  return `<!DOCTYPE html>
${AVISO}
<html lang="pt-BR"${o.previa ? ' data-previa=""' : ""}>
<head>
${head({ titulo: p.nome + " — Baishift", descricao: p.descricao, descricaoSocial: p.descricao, caminho: "/outros/" + p.slug, site: st, manifesto: false, previa: o.previa })}
</head>
<body style="--ac:${cor}">

${barraProduto(p, c)}

<main id="topo">
  <div class="lp-hero">
    <div class="wrap">
      <div class="rv">
        <span class="who"><i aria-hidden="true"></i>${h(p.publico)}</span>
        <h1>${marcar(p.titulo)}</h1>
        <p class="lead">${marcar(p.lead)}</p>
        ${p.status ? `<span class="status"><b aria-hidden="true"></b>${h(p.status)}</span>` : ""}
        <div class="hero-acts" style="margin-top:26px">${le.ativa ? `<a class="btn btn-1" href="#lista" style="background:${cor}" data-ev="lista:${p.slug}">Entrar na lista de espera</a>` : ""}<a class="btn btn-2" href="/">Voltar para a Baishift</a></div>
      </div>
      <div class="rv">
        ${arte(p, o)}
      </div>
    </div>
  </div>
${comoFunciona}
${blocos}
${lista}
</main>

<footer class="lp-foot">
  <div class="wrap">
    ${footEnd(st, { href: "/", texto: "Voltar para a Baishift ↑" })}
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;
};
