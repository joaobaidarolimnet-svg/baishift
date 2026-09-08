/* Gera as páginas do site a partir do conteúdo validado.
   paginas() devolve { "caminho/relativo": conteudo } — é o que o publicar commita;
   gerarTudo() grava isso no disco e apaga páginas que deixaram de existir. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const paginaHub = require("../templates/hub");
const paginaProvedores = require("../templates/provedores");
const paginaPaineis = require("../templates/paineis");
const paginaApps = require("../templates/apps");
const paginaProduto = require("../templates/produto");
const { HOST } = require("../templates/comum");

function sitemap(c) {
  const dia = (c.atualizadoEm || new Date().toISOString()).slice(0, 10);
  const url = (loc, pri) => `  <url><loc>${loc}</loc><lastmod>${dia}</lastmod><changefreq>monthly</changefreq><priority>${pri}</priority></url>`;
  const linhas = [url(HOST + "/", "1.0"), url(HOST + "/provedores", "0.9"), url(HOST + "/dashboards", "0.9"), url(HOST + "/apps", "0.8")]
    .concat(c.produtos.filter(p => p.ativo).map(p => url(HOST + "/apps/" + p.slug, "0.6")));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;
}

function paginas(c, o) {
  const saida = {
    "index.html": paginaHub(c, o),
    "provedores.html": paginaProvedores(c, o),
    "dashboards.html": paginaPaineis(c, o),
    "apps/index.html": paginaApps(c, o),
    "sitemap.xml": sitemap(c)
  };
  for (const p of c.produtos) if (p.ativo) saida["apps/" + p.slug + ".html"] = paginaProduto(p, c, o);
  return saida;
}

/* páginas que ficaram no disco e não saem mais do JSON: produto desativado ou removido,
   mais as landings no endereço antigo (/outros/<slug> virou /apps/<slug>) */
function obsoletas(raiz, arquivos) {
  const fora = [];
  const ler = pasta => { try { return fs.readdirSync(path.join(raiz, pasta)); } catch { return []; } };
  for (const f of ler("apps")) if (f.endsWith(".html") && !arquivos["apps/" + f]) fora.push("apps/" + f);
  for (const f of ler("outros")) if (f.endsWith(".html")) fora.push("outros/" + f);
  return fora;
}

/* depois de apagar as landings antigas, a pasta vazia também sai */
function limparPastaAntiga(raiz) {
  try { fs.rmdirSync(path.join(raiz, "outros")); } catch { /* não existe ou ainda tem coisa dentro */ }
}

/* escreve num temporário e renomeia: quem lê nunca vê um arquivo pela metade */
function escreverAtomico(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = arquivo + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, conteudo);
  fs.renameSync(tmp, arquivo);
}

function gerarTudo(c, raiz) {
  const arquivos = paginas(c), escritos = Object.keys(arquivos);
  for (const rel of escritos) escreverAtomico(path.join(raiz, rel), arquivos[rel]);
  const removidos = obsoletas(raiz, arquivos);
  for (const rel of removidos) { try { fs.unlinkSync(path.join(raiz, rel)); } catch { /* já não existia */ } }
  limparPastaAntiga(raiz);
  return { escritos, removidos };
}

module.exports = { paginaHub, paginaProvedores, paginaPaineis, paginaApps, paginaProduto, sitemap, paginas, obsoletas, limparPastaAntiga, gerarTudo, escreverAtomico };
