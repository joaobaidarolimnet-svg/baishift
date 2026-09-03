"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { carregar, validar, mapearImagens, imagensReferenciadas, ErroConteudo, LIMITES } = require("../lib/conteudo");

const base = () => JSON.parse(JSON.stringify(carregar()));
const erroEm = (obj, campo) => {
  assert.throws(() => validar(obj), e => { assert.ok(e instanceof ErroConteudo, "esperava ErroConteudo, veio " + e); assert.equal(e.campo, campo); return true; });
};

test("carrega o site.json do projeto", () => {
  const c = carregar();
  assert.equal(c.produtos.length, 3);
  assert.equal(c.faq.itens.length, 6);
  assert.equal(c.inicio.painelAtivo, true);
});

test("normaliza: trim, espaços em título, quebras em multilinha, cor maiúscula, booleano", () => {
  const o = base();
  o.inicio.titulo = "  Um   título\ncom quebra  ";
  o.inicio.subtitulo = "linha 1\r\nlinha 2";
  o.produtos[0].cor = "#f5a300";
  o.produtos[0].ativo = "true";
  const c = validar(o);
  assert.equal(c.inicio.titulo, "Um título com quebra");
  assert.equal(c.inicio.subtitulo, "linha 1\nlinha 2");
  assert.equal(c.produtos[0].cor, "#F5A300");
  assert.equal(c.produtos[0].ativo, true);
});

test("campos ausentes viram valor vazio; campos desconhecidos são descartados", () => {
  const o = base();
  delete o.contato.texto; o.contato.extra = 1; o.produtos[0].blocos = undefined;
  const c = validar(o);
  assert.equal(c.contato.texto, "");
  assert.equal("extra" in c.contato, false);
  assert.deepEqual(c.produtos[0].blocos, []);
});

test("limites de tamanho apontam o campo", () => {
  const o = base(); o.inicio.titulo = "x".repeat(LIMITES.titulo + 1);
  erroEm(o, "inicio.titulo");
});

test("listas com contagem fixa", () => {
  const o = base(); o.diagnostico.afirmacoes.pop();
  erroEm(o, "diagnostico.afirmacoes");
  const o2 = base(); o2.inicio.carrossel.imagens = [1, 2, 3, 4].map(() => ({ arquivo: "conteudo/imagens/a-12345678.webp", alt: "a" }));
  erroEm(o2, "inicio.carrossel.imagens");
});

test("obrigatórios", () => {
  const o = base(); o.faq.itens[0].pergunta = "  ";
  erroEm(o, "faq.itens[0].pergunta");
  const o2 = base(); o2.produtos[1].nome = "";
  erroEm(o2, "produtos[1].nome");
});

test("slug inválido, repetido e reservado", () => {
  const o = base(); o.produtos[0].slug = "Sev Er";
  erroEm(o, "produtos[0].slug");
  const o2 = base(); o2.produtos[1].slug = "severino";
  erroEm(o2, "produtos[1].slug");
  const o3 = base(); o3.produtos[2].slug = "gestor";
  erroEm(o3, "produtos[2].slug");
});

test("cor, link e intervalo", () => {
  const o = base(); o.produtos[0].cor = "laranja";
  erroEm(o, "produtos[0].cor");
  const o2 = base(); o2.inicio.botaoPrincipal.link = "javascript:alert(1)";
  erroEm(o2, "inicio.botaoPrincipal.link");
  const o3 = base(); o3.inicio.carrossel.intervalo = 99;
  erroEm(o3, "inicio.carrossel.intervalo");
});

test("referências de imagem", () => {
  const o = base(); o.produtos[0].capa.arquivo = "../x.png";
  erroEm(o, "produtos[0].capa.arquivo");
  const o2 = base(); o2.inicio.carrossel.imagens = [{ arquivo: "", alt: "a" }];
  erroEm(o2, "inicio.carrossel.imagens[0].arquivo");
  const o3 = base(); o3.produtos[0].blocos = [{ tipo: "imagem", arquivo: "", alt: "" }];
  erroEm(o3, "produtos[0].blocos[0].arquivo");
  const ok = base(); ok.produtos[0].capa.arquivo = "pendente:0123456789abcdef01234567";
  assert.equal(validar(ok).produtos[0].capa.arquivo, "pendente:0123456789abcdef01234567");
});

test("blocos: tipo desconhecido e validação por tipo", () => {
  const o = base(); o.produtos[0].blocos = [{ tipo: "video" }];
  erroEm(o, "produtos[0].blocos[0].tipo");
  const o2 = base(); o2.produtos[0].blocos = [{ tipo: "lista", titulo: "t", itens: [] }];
  erroEm(o2, "produtos[0].blocos[0].itens");
  const o3 = base();
  o3.produtos[0].blocos = [
    { tipo: "texto", titulo: "T", texto: "a\n\nb" },
    { tipo: "destaque", titulo: "D", texto: "x", botao: { texto: "Ir", link: "https://a.b" } },
    { tipo: "imagemTexto", arquivo: "conteudo/imagens/a-12345678.webp", alt: "a", titulo: "", texto: "t", imagemDireita: 1 }
  ];
  const c = validar(o3);
  assert.equal(c.produtos[0].blocos.length, 3);
  assert.equal(c.produtos[0].blocos[2].imagemDireita, true);
  assert.equal(c.produtos[0].blocos[1].botao.link, "https://a.b");
});

test("imagensReferenciadas e mapearImagens", () => {
  const o = base();
  o.inicio.carrossel.imagens = [{ arquivo: "pendente:0123456789abcdef01234567", alt: "a", link: "" }];
  o.produtos[0].capa = { arquivo: "conteudo/imagens/capa-aaaaaaaa.webp", alt: "c" };
  o.produtos[0].blocos = [{ tipo: "imagem", arquivo: "conteudo/imagens/capa-aaaaaaaa.webp", alt: "", legenda: "" }];
  const c = validar(o);
  assert.deepEqual(imagensReferenciadas(c).sort(), ["conteudo/imagens/capa-aaaaaaaa.webp", "pendente:0123456789abcdef01234567"]);
  const t = mapearImagens(c, ref => ref.startsWith("pendente:") ? "conteudo/imagens/promo-bbbbbbbb.webp" : ref);
  assert.equal(t.inicio.carrossel.imagens[0].arquivo, "conteudo/imagens/promo-bbbbbbbb.webp");
  assert.equal(c.inicio.carrossel.imagens[0].arquivo, "pendente:0123456789abcdef01234567", "não muda o original");
  assert.equal(t.produtos[0].blocos[0].tipo, "imagem");
});
