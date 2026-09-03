"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { h, marcar, semMarcas, urlImagem, jsonEmbutido } = require("../lib/html");

test("h escapa os cinco caracteres", () => {
  assert.equal(h(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(h(null), "");
  assert.equal(h(12), "12");
});

test("marcar aplica em, negrito e link válido", () => {
  assert.equal(marcar("a *b* **c** [d](https://x.y)"), 'a <em>b</em> <strong>c</strong> <a href="https://x.y">d</a>');
  assert.equal(marcar("[e](#faq) [f](mailto:a@b.c) [g](/outros/x)"), '<a href="#faq">e</a> <a href="mailto:a@b.c">f</a> <a href="/outros/x">g</a>');
});

test("marcar escapa antes de marcar e recusa link perigoso", () => {
  assert.equal(marcar("<b>x</b> *<i>*"), "&lt;b&gt;x&lt;/b&gt; <em>&lt;i&gt;</em>");
  assert.equal(marcar("[x](javascript:alert(1))"), "[x](javascript:alert(1))");
  assert.equal(marcar("[x](data:text/html,oi)"), "[x](data:text/html,oi)");
});

test("marcar sem parágrafos vira <br>; com parágrafos vira <p>", () => {
  assert.equal(marcar("a\nb"), "a<br>b");
  assert.equal(marcar("a\nb\n\nc", { paragrafos: true }), "<p>a<br>b</p>\n<p>c</p>");
  assert.equal(marcar("  \n\n  ", { paragrafos: true }), "");
});

test("semMarcas devolve texto puro", () => {
  assert.equal(semMarcas("a *b* **c** [d](https://x.y)"), "a b c d");
});

test("urlImagem resolve publicada, pendente e vazia", () => {
  assert.equal(urlImagem("conteudo/imagens/capa-1a2b3c4d.webp"), "/conteudo/imagens/capa-1a2b3c4d.webp");
  assert.equal(urlImagem("pendente:0123456789abcdef01234567"), "/gestor/api/pendentes/0123456789abcdef01234567");
  assert.equal(urlImagem("pendente:abc", { basePendentes: "/p/" }), "/p/abc");
  assert.equal(urlImagem(""), "");
});

test("jsonEmbutido não fecha a tag script", () => {
  assert.equal(jsonEmbutido({ a: "</script><b>" }), '{"a":"\\u003c/script>\\u003cb>"}');
});
