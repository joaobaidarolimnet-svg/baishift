/* Gera uma versão do site em arquivo único, com CSS e JS embutidos.
   Serve para enviar por e-mail, abrir sem servidor ou publicar uma prévia. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = p => readFileSync(new URL(p, root), "utf8");

const css = read("assets/css/site.css");
const js  = read("assets/js/site.js");
let html  = read("index.html");

/* troca obrigatória: se o alvo não existir, o build para em vez de gerar arquivo quebrado */
const swap = (texto, alvo, novo) => {
  if (!texto.includes(alvo)) throw new Error("build-single: não encontrei no index.html -> " + alvo);
  return texto.replace(alvo, novo);
};

html = swap(html, '<link rel="stylesheet" href="assets/css/site.css">', "<style>\n" + css + "\n</style>");
html = swap(html, '<script src="assets/js/site.js" defer></script>', "<script>\n" + js + "\n</script>");
html = html
  // o ícone vira data URI para o arquivo continuar autossuficiente
  .replace('<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">',
           '<link rel="icon" href="data:image/svg+xml,' +
           encodeURIComponent(read("assets/img/favicon.svg").replace(/\n\s*/g, "")) + '">')
  .replace(/\n\s*<link rel="alternate icon"[^>]*>/, "")
  .replace(/\n\s*<link rel="apple-touch-icon"[^>]*>/, "")
  .replace(/\n\s*<link rel="manifest"[^>]*>/, "");

for (const [oque, marca] of [["estilos", "--blue:#1652F0"], ["script", "function procFlow"]])
  if (!html.includes(marca)) throw new Error("build-single: " + oque + " não foram embutidos");

mkdirSync(new URL("dist/", root), { recursive: true });
writeFileSync(new URL("dist/baishift-site.html", root), html);
console.log("dist/baishift-site.html · " + (html.length / 1024).toFixed(0) + " KB");
