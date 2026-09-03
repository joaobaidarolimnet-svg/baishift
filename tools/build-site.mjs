/* Gera index.html, outros/*.html e sitemap.xml a partir de conteudo/site.json.
   Rode depois de editar o JSON à mão: node tools/build-site.mjs */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { carregar } = require("../lib/conteudo.js");
const { gerarTudo } = require("../lib/render.js");

const raiz = fileURLToPath(new URL("../", import.meta.url));
try {
  const r = gerarTudo(carregar(), raiz);
  r.escritos.forEach(f => console.log("gerado   " + f));
  r.removidos.forEach(f => console.log("removido " + f));
} catch (e) {
  console.error("conteúdo inválido: " + e.message);
  process.exit(1);
}
