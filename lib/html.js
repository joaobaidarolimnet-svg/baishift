/* Helpers de HTML usados pelos modelos das páginas.
   Regra do projeto: todo valor vindo do conteúdo passa por h() ou marcar() antes de entrar no HTML. */
"use strict";

const MAPA = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => MAPA[c]); }

const RE_LINK = /^(https?:\/\/|mailto:|#|\/)/;

/* aplica as marcações num texto JÁ escapado */
function marcarLinha(t) {
  return t
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, txt, url) => RE_LINK.test(url) ? '<a href="' + url + '">' + txt + "</a>" : m)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

/* *em*, **negrito**, [texto](url); com { paragrafos: true } linha em branco separa <p> */
function marcar(s, o) {
  const t = h(s);
  if (!(o && o.paragrafos)) return marcarLinha(t).replace(/\n/g, "<br>");
  return t.split(/\n[ \t]*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => "<p>" + marcarLinha(p).replace(/\n/g, "<br>") + "</p>").join("\n");
}

/* texto puro, sem as marcações (para meta tags e JSON-LD) */
function semMarcas(s) {
  return String(s == null ? "" : s)
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1");
}

/* referência do JSON → URL: "conteudo/imagens/x.webp" ou "pendente:<id>" (ainda não publicada) */
function urlImagem(ref, o) {
  if (!ref) return "";
  if (ref.startsWith("pendente:")) return ((o && o.basePendentes) || "/gestor/api/pendentes/") + ref.slice(9);
  return "/" + ref;
}

/* JSON dentro de <script>: "<" vira \u003c para "</script>" não fechar a tag */
function jsonEmbutido(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

module.exports = { h, marcar, semMarcas, urlImagem, jsonEmbutido };
