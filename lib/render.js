/* Gera as páginas do site a partir do conteúdo validado.
   paginas() devolve { "caminho/relativo": conteudo } — é o que o publicar commita;
   gerarTudo() grava isso no disco e apaga páginas de produtos que deixaram de existir. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const paginaInicio = require("../templates/index");
const paginaProduto = require("../templates/produto");
const { HOST } = require("../templates/comum");

function sitemap(c) {
  const dia = (c.atualizadoEm || new Date().toISOString()).slice(0, 10);
  const url = (loc, pri) => `  <url><loc>${loc}</loc><lastmod>${dia}</lastmod><changefreq>monthly</changefreq><priority>${pri}</priority></url>`;
  const linhas = [url(HOST + "/", "1.0")].concat(c.produtos.filter(p => p.ativo).map(p => url(HOST + "/outros/" + p.slug, "0.6")));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;
}

function paginas(c, o) {
  const saida = { "index.html": paginaInicio(c, o), "sitemap.xml": sitemap(c) };
  for (const p of c.produtos) if (p.ativo) saida["outros/" + p.slug + ".html"] = paginaProduto(p, c, o);
  return saida;
}

/* escreve num temporário e renomeia: quem lê nunca vê um arquivo pela metade */
function escreverAtomico(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = arquivo + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, conteudo);
  fs.renameSync(tmp, arquivo);
}

function gerarTudo(c, raiz) {
  const arquivos = paginas(c), escritos = Object.keys(arquivos), removidos = [];
  for (const rel of escritos) escreverAtomico(path.join(raiz, rel), arquivos[rel]);
  const outros = path.join(raiz, "outros");
  if (fs.existsSync(outros)) {
    for (const f of fs.readdirSync(outros)) {
      if (f.endsWith(".html") && !arquivos["outros/" + f]) { fs.unlinkSync(path.join(outros, f)); removidos.push("outros/" + f); }
    }
  }
  return { escritos, removidos };
}

module.exports = { paginaInicio, paginaProduto, sitemap, paginas, gerarTudo, escreverAtomico };
